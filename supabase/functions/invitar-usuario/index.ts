// Invita a un usuario al CRM y crea su perfil.
// Solo para quien tenga perfil activo y permiso usuarios:editar (docs/PLAN.md B5).
// Despliegue: npx supabase functions deploy invitar-usuario --use-api
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const responder = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

function mensajeInvitacion(codigo: string | undefined, mensaje: string): string {
  switch (codigo) {
    case 'email_exists':
      return 'Ya hay un usuario con ese email.'
    case 'email_address_not_authorized':
      return 'El correo de pruebas de Supabase solo envía a los miembros del equipo. Hace falta configurar Resend para invitar a cualquier email.'
    case 'over_email_send_rate_limit':
      return 'Se ha alcanzado el límite de correos por hora. Prueba más tarde.'
    default:
      return mensaje
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return responder(405, { error: 'Método no permitido' })

  // La clave secreta solo existe aquí, en el servidor (la inyecta Supabase).
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  // 1. Quién llama y si puede gestionar usuarios
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!token) return responder(401, { error: 'Falta la sesión' })
  const { data: sesion, error: errorSesion } = await admin.auth.getUser(token)
  if (errorSesion || !sesion.user) return responder(401, { error: 'Sesión no válida' })

  const { data: perfil } = await admin
    .from('perfiles')
    .select('rol, activo')
    .eq('id', sesion.user.id)
    .maybeSingle()
  const { data: permiso } = perfil?.activo
    ? await admin
        .from('permisos_rol')
        .select('puede_editar')
        .eq('rol', perfil.rol)
        .eq('modulo', 'usuarios')
        .maybeSingle()
    : { data: null }
  if (!permiso?.puede_editar) return responder(403, { error: 'No tienes permiso para invitar usuarios' })

  // 2. Datos del invitado
  let datos: Record<string, unknown>
  try {
    datos = await req.json()
  } catch {
    return responder(400, { error: 'Datos no válidos' })
  }
  const email = typeof datos.email === 'string' ? datos.email.trim().toLowerCase() : ''
  const nombre = typeof datos.nombre === 'string' ? datos.nombre.trim() : ''
  const rol = typeof datos.rol === 'string' ? datos.rol : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !nombre || !rol) {
    return responder(400, { error: 'Faltan el email, el nombre o el rol' })
  }
  const { data: rolValido } = await admin.from('roles').select('codigo').eq('codigo', rol).maybeSingle()
  if (!rolValido) return responder(400, { error: 'Rol desconocido' })

  // 3. Invitación y perfil. Si el perfil falla, se borra el usuario para no dejarlo a medias.
  const origen = req.headers.get('origin')
  const { data: invitado, error: errorInvitar } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: origen ? `${origen}/nueva-contrasena` : undefined,
    data: { nombre },
  })
  if (errorInvitar) return responder(400, { error: mensajeInvitacion(errorInvitar.code, errorInvitar.message) })

  const { error: errorPerfil } = await admin
    .from('perfiles')
    .insert({ id: invitado.user.id, nombre, email, rol })
  if (errorPerfil) {
    await admin.auth.admin.deleteUser(invitado.user.id)
    return responder(500, { error: 'No se pudo crear el perfil del usuario' })
  }

  return responder(200, { id: invitado.user.id })
})
