import { FunctionsHttpError } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import type { Linea } from '../../../supabase/functions/_shared/partes.ts'
import { idAleatorio } from './id'
import { comprimir } from './imagenes'
import { supabase, type Fila } from './supabase'
import { todasLasFilas } from './todas-las-filas'

// Partes de trabajo en papel (tabla partes_trabajo). Llegan por WhatsApp o se suben aquí, los lee la IA
// (Edge Functions whatsapp y leer-parte) y, revisados, se apuntan en el control de obra con apuntar_parte.
// Lo que comparten el CRM y las Edge Functions está en supabase/functions/_shared/partes.ts.

export { normalizarTelefono, telefonoATexto, type Linea } from '../../../supabase/functions/_shared/partes.ts'

export const ESTADOS = {
  revisar: 'Por revisar',
  leyendo: 'Leyéndose',
  por_confirmar: 'Esperando confirmación',
  apuntado: 'Apuntado',
  descartado: 'Descartado',
} as const
export type EstadoParte = keyof typeof ESTADOS

/** Las pestañas de la bandeja y los estados que entran en cada una. */
export const BANDEJAS = {
  pendientes: ['revisar', 'leyendo', 'por_confirmar'],
  apuntados: ['apuntado'],
  descartados: ['descartado'],
} as const satisfies Record<string, EstadoParte[]>
export type Bandeja = keyof typeof BANDEJAS

export type Parte = Omit<Fila<'partes_trabajo'>, 'lineas'> & {
  lineas: Linea[]
  obras: { codigo: string; nombre: string } | null
  /** Quien lo mandó por WhatsApp */
  enviado: { nombre: string } | null
}

const SELECCION = '*, obras(codigo, nombre), enviado:trabajadores!enviado_por(nombre)'
const almacen = () => supabase.storage.from('partes')

/**
 * Partes de una bandeja, del más reciente al más antiguo. Se refresca solo cada minuto: lo que llega
 * por WhatsApp aparece sin recargar.
 */
export function usePartes(bandeja: Bandeja) {
  return useQuery({
    queryKey: ['partes_trabajo', bandeja],
    refetchInterval: 60_000,
    // ponytail: trae todos los de la bandeja; con años de partes apuntados, paginar o filtrar por mes
    queryFn: async () =>
      (await todasLasFilas((desde, hasta) =>
        supabase
          .from('partes_trabajo')
          .select(SELECCION, { count: 'exact' })
          .in('estado', BANDEJAS[bandeja])
          .order('created_at', { ascending: false })
          .order('id')
          .range(desde, hasta),
      )) as unknown as Parte[],
  })
}

/** Un parte con el enlace firmado a su foto (una hora). null si no existe o no se puede ver. */
export function useParte(id: string | undefined) {
  return useQuery({
    queryKey: ['partes_trabajo', 'uno', id],
    enabled: !!id,
    refetchInterval: (consulta) => (consulta.state.data?.parte.estado === 'leyendo' ? 5_000 : 30 * 60 * 1000),
    queryFn: async () => {
      const { data, error } = await supabase.from('partes_trabajo').select(SELECCION).eq('id', id!).maybeSingle()
      if (error) throw error
      if (!data) return null
      const firmado = await almacen().createSignedUrl(data.foto, 3600)
      return { parte: data as unknown as Parte, foto: firmado.data?.signedUrl ?? null }
    },
  })
}

/** Pide a la IA que lea (o vuelva a leer) la foto de un parte. Devuelve lo que hay que mirar. */
export async function leerParte(id: string): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('leer-parte', { body: { parte_id: id } })
  if (error instanceof FunctionsHttpError) throw new Error((await error.context.json().catch(() => ({}))).error ?? error.message)
  if (error) throw error
  return data?.es_parte === false ? ['La IA dice que la foto no parece un parte de trabajo.', ...data.avisos] : (data?.avisos ?? [])
}

/**
 * Sube la foto de un parte en papel (comprimida a JPEG, regla 9) y crea el parte para revisarlo.
 * Devuelve su id. La lectura con la IA va aparte (leerParte): si falla, el parte se rellena a mano.
 */
export async function subirParte(archivo: File): Promise<string> {
  const { foto } = await comprimir(archivo)
  const id = idAleatorio()
  const ruta = `${id}.jpg`
  // ponytail: si el alta falla después de subir la foto, la foto se queda suelta en el bucket (no se pueden
  // borrar: son justificantes). Es raro; si molesta, un borrado periódico de fotos sin parte.
  const subida = await almacen().upload(ruta, foto.blob, { contentType: 'image/jpeg' })
  if (subida.error) throw subida.error
  const { error } = await supabase.from('partes_trabajo').insert({ id, foto: ruta })
  if (error) throw error
  return id
}

/** De la hoja al control de obra: horas de cada trabajador y combustible, todo o nada (en SQL). */
export async function apuntarParte(id: string) {
  const { error } = await supabase.rpc('apuntar_parte', { p_parte: id })
  if (error) throw error
}
