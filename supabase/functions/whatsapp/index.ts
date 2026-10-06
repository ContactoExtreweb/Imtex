// Webhook de WhatsApp (API oficial de WhatsApp Business, de Meta) para los partes de trabajo en papel.
// Quien tiene su teléfono en su ficha de trabajador manda la foto del parte; la IA la lee, se le contesta
// con un resumen y tres botones (está bien, corregir, anular) y, al confirmarlo, se apunta en el control
// de obra con apuntar_parte. Las correcciones se piden con texto libre y las interpreta la IA.
//
// Despliegue: npx supabase functions deploy whatsapp --use-api   (sin JWT: vale la firma de Meta)
// Secrets (npx supabase secrets set …): WHATSAPP_TOKEN, WHATSAPP_NUMERO_ID, WHATSAPP_SECRETO_APP,
// WHATSAPP_TOKEN_VERIFICACION y ANTHROPIC_API_KEY. Los pasos, en docs/ESTADO.md.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { leer, type Leido } from '../_shared/lector.ts'
import {
  botones,
  faltaParaApuntar,
  fechaATexto,
  firmaValida,
  mensajesDelAviso,
  resumen,
  TEXTOS,
  type Mensaje,
} from '../_shared/partes.ts'

declare const EdgeRuntime: { waitUntil(promesa: Promise<unknown>): void }

// Versión de la API de Meta. Cada versión dura unos dos años: al caducar, subirla aquí.
const GRAPH = 'https://graph.facebook.com/v23.0'
const TIPOS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

const env = (nombre: string) => Deno.env.get(nombre)

// La clave secreta solo existe aquí, en el servidor (la inyecta Supabase)
const admin = createClient(env('SUPABASE_URL')!, env('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Alta del webhook en Meta: devuelve el reto si el token es el nuestro
  if (req.method === 'GET') {
    const token = env('WHATSAPP_TOKEN_VERIFICACION')
    const valido = token && url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === token
    return valido ? new Response(url.searchParams.get('hub.challenge') ?? '') : new Response('Prohibido', { status: 403 })
  }
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 })

  const cuerpo = await req.text()
  if (!(await firmaValida(cuerpo, req.headers.get('x-hub-signature-256'), env('WHATSAPP_SECRETO_APP')))) {
    return new Response('Firma no válida', { status: 401 })
  }
  let mensajes: Mensaje[]
  try {
    mensajes = mensajesDelAviso(JSON.parse(cuerpo))
  } catch {
    return new Response('ok')
  }
  // Se contesta ya (si tarda, Meta reintenta) y se trabaja después
  EdgeRuntime.waitUntil(
    Promise.all(mensajes.map((m) => atender(m).catch((error) => console.error('whatsapp', m.id, error)))),
  )
  return new Response('ok')
})

async function atender(m: Mensaje) {
  const { data: trabajador, error } = await admin
    .from('trabajadores')
    .select('id')
    .eq('telefono', m.de)
    .eq('activo', true)
    .maybeSingle()
  if (error) throw error
  if (!trabajador) return enviarTexto(m.de, TEXTOS.noDadoDeAlta)
  switch (m.tipo) {
    case 'imagen':
      return recibirFoto(m, trabajador.id)
    case 'boton':
      return pulsarBoton(m)
    case 'texto':
      return recibirTexto(m)
    default:
      return enviarTexto(m.de, TEXTOS.ayuda)
  }
}

/** Foto nueva: se guarda, se crea el parte, se lee y se manda el resumen para confirmar. */
async function recibirFoto(m: Extract<Mensaje, { tipo: 'imagen' }>, trabajadorId: string) {
  // Un reintento de Meta trae el mismo mensaje: ya está
  const { data: ya } = await admin.from('partes_trabajo').select('id').eq('whatsapp_mensaje_id', m.id).maybeSingle()
  if (ya) return
  const ext = TIPOS[m.mime]
  if (!ext) return enviarTexto(m.de, TEXTOS.ayuda)

  // 1. La foto, de Meta a nuestro bucket
  const media = await graph(`/${m.imagenId}`)
  const descarga = await fetch(media.url, { headers: { Authorization: `Bearer ${env('WHATSAPP_TOKEN')}` } })
  if (!descarga.ok) throw new Error(`No se ha podido descargar la foto de WhatsApp (${descarga.status})`)
  const id = crypto.randomUUID()
  const foto = `${id}.${ext}`
  const subida = await admin.storage.from('partes').upload(foto, await descarga.arrayBuffer(), { contentType: m.mime })
  if (subida.error) throw subida.error

  // 2. El parte. Si dos avisos llegan a la vez, el índice único deja pasar uno solo.
  const alta = await admin.from('partes_trabajo').insert({
    id,
    foto,
    origen: 'whatsapp',
    estado: 'leyendo',
    enviado_por: trabajadorId,
    telefono: m.de,
    whatsapp_mensaje_id: m.id,
  })
  if (alta.error) {
    await admin.storage.from('partes').remove([foto])
    if (alta.error.code === '23505') return
    throw alta.error
  }

  // 3. La lectura. Si falla, el parte queda para la oficina con la foto.
  let leido: Leido
  try {
    leido = await leer(admin, { foto })
  } catch (error) {
    console.error('lectura', id, error)
    await admin
      .from('partes_trabajo')
      .update({ estado: 'revisar', avisos: [`No se ha podido leer automáticamente: ${(error as Error).message}`] })
      .eq('id', id)
    return enviarTexto(m.de, TEXTOS.noLeido)
  }
  if (!leido.columnas.lectura.es_parte) {
    await admin.from('partes_trabajo').update({ ...leido.columnas, estado: 'descartado' }).eq('id', id)
    return enviarTexto(m.de, TEXTOS.noEsParte)
  }
  await mandarResumen(m.de, id, leido)
}

/** Guarda lo leído, deja el parte esperando confirmación y manda el resumen con los botones. */
async function mandarResumen(telefono: string, parteId: string, leido: Leido) {
  const guardado = await admin
    .from('partes_trabajo')
    .update({ ...leido.columnas, estado: 'por_confirmar', correccion_pedida_el: null })
    .eq('id', parteId)
  if (guardado.error) throw guardado.error
  const enviado = await enviar(telefono, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: resumen(leido.columnas, leido.obras, leido.trabajadores) },
      action: { buttons: botones(parteId) },
    },
  })
  await admin
    .from('partes_trabajo')
    .update({ whatsapp_resumen_id: enviado.messages?.[0]?.id ?? null })
    .eq('id', parteId)
}

async function pulsarBoton(m: Extract<Mensaje, { tipo: 'boton' }>) {
  // Solo vale sobre un parte suyo que siga esperando confirmación
  const { data: p, error } = await admin
    .from('partes_trabajo')
    .select('id, estado, obra_id, fecha, lineas, avisos')
    .eq('id', m.parteId)
    .eq('telefono', m.de)
    .maybeSingle()
  if (error) throw error
  if (!p || p.estado !== 'por_confirmar') return enviarTexto(m.de, TEXTOS.yaCerrado)

  if (m.accion === 'anular') {
    await admin.from('partes_trabajo').update({ estado: 'descartado' }).eq('id', p.id).eq('estado', 'por_confirmar')
    return enviarTexto(m.de, TEXTOS.anulado)
  }
  if (m.accion === 'corregir') {
    await admin.from('partes_trabajo').update({ correccion_pedida_el: new Date().toISOString() }).eq('id', p.id)
    return enviarTexto(m.de, TEXTOS.pideCorreccion)
  }

  const falta = faltaParaApuntar(p)
  if (falta.length > 0) return enviarTexto(m.de, TEXTOS.falta(falta))
  // Se marca antes de apuntar: si pulsa dos veces, la segunda no encuentra nada que confirmar
  const { data: marcado } = await admin
    .from('partes_trabajo')
    .update({ confirmado_el: new Date().toISOString() })
    .eq('id', p.id)
    .eq('estado', 'por_confirmar')
    .is('confirmado_el', null)
    .select('id')
  if (!marcado?.length) return
  const apunte = await admin.rpc('apuntar_parte', { p_parte: p.id })
  if (apunte.error) {
    // Categorías, mes cerrado…: lo resuelve la oficina con la foto delante
    await admin
      .from('partes_trabajo')
      .update({ estado: 'revisar', avisos: [...(p.avisos ?? []), apunte.error.message] })
      .eq('id', p.id)
      .eq('estado', 'por_confirmar')
    return enviarTexto(m.de, TEXTOS.aLaOficina(apunte.error.message))
  }
  return enviarTexto(m.de, TEXTOS.apuntado(fechaATexto(p.fecha)))
}

/**
 * Texto: es una corrección. Se aplica al parte cuyo resumen contesta, si contesta a uno; si no, al último
 * en el que pulsó «Corregir» o, si solo tiene uno pendiente, a ese.
 */
async function recibirTexto(m: Extract<Mensaje, { tipo: 'texto' }>) {
  const { data: pendientes, error } = await admin
    .from('partes_trabajo')
    .select('id, foto, lectura, whatsapp_resumen_id, correccion_pedida_el')
    .eq('telefono', m.de)
    .eq('estado', 'por_confirmar')
    .order('correccion_pedida_el', { ascending: false, nullsFirst: false })
  if (error) throw error
  if (!pendientes?.length) return enviarTexto(m.de, TEXTOS.ayuda)
  const p =
    pendientes.find((x) => m.respondeA && x.whatsapp_resumen_id === m.respondeA) ??
    (pendientes[0].correccion_pedida_el || pendientes.length === 1 ? pendientes[0] : null)
  if (!p) return enviarTexto(m.de, TEXTOS.variosPorConfirmar)

  let leido: Leido
  try {
    leido = await leer(admin, p, m.texto)
  } catch (error) {
    console.error('corrección', p.id, error)
    return enviarTexto(m.de, TEXTOS.noCorregido)
  }
  await mandarResumen(m.de, p.id, leido)
}

// API de Meta -----------------------------------------------------------------------------------

async function graph(ruta: string, cuerpo?: unknown) {
  const respuesta = await fetch(GRAPH + ruta, {
    method: cuerpo ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${env('WHATSAPP_TOKEN')}`, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const json = await respuesta.json().catch(() => null)
  if (!respuesta.ok) throw new Error(`WhatsApp ha contestado ${respuesta.status}: ${json?.error?.message ?? 'sin detalle'}`)
  return json
}

const enviar = (a: string, mensaje: Record<string, unknown>): Promise<{ messages?: { id: string }[] }> =>
  graph(`/${env('WHATSAPP_NUMERO_ID')}/messages`, { messaging_product: 'whatsapp', to: a, ...mensaje })

const enviarTexto = (a: string, texto: string) => enviar(a, { type: 'text', text: { body: texto } })
