// Lee con la IA un parte subido desde el CRM (o vuelve a leer uno) y rellena sus datos para revisarlos.
// Solo para quien tenga perfil activo y permiso partes_horas:editar. No cambia el estado del parte.
// Despliegue: npx supabase functions deploy leer-parte --use-api   (secret: ANTHROPIC_API_KEY)
import { createClient } from 'npm:@supabase/supabase-js@2'
import { leer } from '../_shared/lector.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const responder = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return responder(405, { error: 'Método no permitido' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  // 1. Quién llama y si puede editar partes (como invitar-usuario)
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!token) return responder(401, { error: 'Falta la sesión' })
  const { data: sesion, error: errorSesion } = await admin.auth.getUser(token)
  if (errorSesion || !sesion.user) return responder(401, { error: 'Sesión no válida' })
  const { data: perfil } = await admin.from('perfiles').select('rol, activo').eq('id', sesion.user.id).maybeSingle()
  const { data: permiso } = perfil?.activo
    ? await admin
        .from('permisos_rol')
        .select('puede_editar')
        .eq('rol', perfil.rol)
        .eq('modulo', 'partes_horas')
        .maybeSingle()
    : { data: null }
  if (!permiso?.puede_editar) return responder(403, { error: 'No tienes permiso para editar partes' })

  // 2. El parte
  let parteId: unknown
  try {
    parteId = (await req.json())?.parte_id
  } catch {
    return responder(400, { error: 'Datos no válidos' })
  }
  if (typeof parteId !== 'string') return responder(400, { error: 'Falta el parte' })
  const { data: parte } = await admin.from('partes_trabajo').select('id, foto, estado').eq('id', parteId).maybeSingle()
  if (!parte) return responder(404, { error: 'No se encuentra el parte' })
  if (parte.estado === 'apuntado' || parte.estado === 'descartado') {
    return responder(409, { error: 'Este parte ya está cerrado: no se vuelve a leer' })
  }

  // 3. Lectura y guardado
  try {
    const { columnas } = await leer(admin, parte)
    const { error } = await admin.from('partes_trabajo').update(columnas).eq('id', parte.id).neq('estado', 'apuntado')
    if (error) throw error
    return responder(200, { avisos: columnas.avisos, es_parte: columnas.lectura.es_parte })
  } catch (error) {
    console.error('leer-parte', parte.id, error)
    return responder(502, { error: (error as Error).message })
  }
})
