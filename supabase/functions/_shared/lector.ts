// Lee con la IA la foto de un parte guardada en el bucket `partes` y devuelve sus columnas.
// Lo usan las funciones `whatsapp` y `leer-parte`; quién guarda qué y en qué estado lo decide cada una.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  aBase64,
  aColumnas,
  extraerLectura,
  fechaATexto,
  peticionLectura,
  type ColumnasParte,
  type Lectura,
  type ObraContexto,
  type TrabajadorContexto,
} from './partes.ts'

// ponytail: modelo fijo. Si con alguna letra se equivoca mucho, probar uno mayor; si lo que importa es
// el coste, claude-haiku-4-5 (lee peor la letra a mano). Cada lectura cuesta unos céntimos.
const MODELO = 'claude-sonnet-5-5'

/** Hoy en España, AAAA-MM-DD (la Edge Function corre en UTC). */
export const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())

const TIPOS: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

export interface Leido {
  columnas: ColumnasParte
  obras: ObraContexto[]
  trabajadores: TrabajadorContexto[]
}

/** Obras en ejecución y trabajadores activos: con ellos casa la IA lo escrito. */
async function contexto(admin: SupabaseClient) {
  const [obras, trabajadores] = await Promise.all([
    admin.from('obras').select('id, codigo, nombre, localidad, clientes(nombre)').eq('estado', 'en_ejecucion'),
    admin.from('trabajadores').select('id, nombre, jornada_horas').eq('activo', true).order('nombre'),
  ])
  if (obras.error) throw obras.error
  if (trabajadores.error) throw trabajadores.error
  return {
    obras: obras.data.map((o) => ({
      id: o.id,
      codigo: o.codigo,
      nombre: o.nombre,
      localidad: o.localidad,
      cliente: (o.clientes as { nombre?: string } | null)?.nombre ?? null,
    })) as ObraContexto[],
    trabajadores: trabajadores.data as TrabajadorContexto[],
  }
}

/**
 * Lee el parte. Con `correccion`, corrige su lectura anterior según lo que dice quien lo mandó.
 * Añade a los avisos las horas que ya estuvieran apuntadas ese día en esa obra (una foto mandada dos veces).
 */
export async function leer(
  admin: SupabaseClient,
  parte: { foto: string; lectura?: Lectura | null },
  correccion?: string,
): Promise<Leido> {
  const clave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!clave) throw new Error('Falta la clave de la IA (ANTHROPIC_API_KEY en los secrets de Supabase).')

  const [{ obras, trabajadores }, descarga] = await Promise.all([
    contexto(admin),
    admin.storage.from('partes').download(parte.foto),
  ])
  if (descarga.error) throw descarga.error
  const tipo = TIPOS[parte.foto.split('.').pop()!.toLowerCase()] ?? 'image/jpeg'
  const imagen = { base64: aBase64(new Uint8Array(await descarga.data.arrayBuffer())), tipo }

  const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': clave, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(
      peticionLectura({
        modelo: MODELO,
        imagen,
        obras,
        trabajadores,
        hoy: hoy(),
        anterior: correccion ? (parte.lectura ?? undefined) : undefined,
        correccion,
      }),
    ),
    signal: AbortSignal.timeout(120_000),
  })
  const json = await respuesta.json().catch(() => null)
  if (!respuesta.ok) throw new Error(`La IA ha contestado ${respuesta.status}: ${json?.error?.message ?? 'sin detalle'}`)

  const columnas = aColumnas(extraerLectura(json), obras, trabajadores, hoy())

  const ids = columnas.lineas.flatMap((l) => l.trabajador_id ?? [])
  if (columnas.obra_id && columnas.fecha && ids.length > 0) {
    const { data: ya } = await admin
      .from('partes_horas')
      .select('trabajador_id')
      .eq('obra_id', columnas.obra_id)
      .eq('fecha', columnas.fecha)
      .in('trabajador_id', ids)
    for (const id of new Set((ya ?? []).map((h) => h.trabajador_id))) {
      const nombre = trabajadores.find((t) => t.id === id)?.nombre
      columnas.avisos.push(`Ya hay horas de ${nombre} el ${fechaATexto(columnas.fecha)} en esta obra.`)
    }
  }
  return { columnas, obras, trabajadores }
}
