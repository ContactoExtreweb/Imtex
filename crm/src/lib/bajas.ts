import { useQuery } from '@tanstack/react-query'
import { idAleatorio } from './id'
import { comprimir } from './imagenes'
import { supabase, type Fila } from './supabase'
import { todasLasFilas } from './todas-las-filas'

// Papeles de baja de los trabajadores. Son datos de salud: el bucket es privado y los archivos
// solo se abren con un enlace firmado que caduca. Quién ve qué lo decide el RLS (migración `bajas`).

export const TIPOS_PARTE = {
  baja: 'Parte de baja',
  confirmacion: 'Parte de confirmación',
  alta: 'Parte de alta',
  otro: 'Otro documento',
} as const
export type TipoParte = keyof typeof TIPOS_PARTE

export const MAX_BYTES = 10 * 1024 * 1024 // el mismo tope que el bucket

// Documentos que se suben tal cual (los mismos tipos que admite el bucket). Las fotos van aparte:
// se convierten a JPEG. Manda la extensión: el móvil no siempre dice de qué tipo es el archivo.
const DOCUMENTOS: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  txt: 'text/plain',
}

/** Para el atributo `accept` del selector de archivos */
export const ACEPTA = ['image/*', '.heic', '.heif', ...Object.keys(DOCUMENTOS).map((e) => `.${e}`)].join(',')

// Lo que el navegador enseña en una pestaña; el resto se descarga con su nombre original
const SE_VE_EN_EL_NAVEGADOR = ['image/jpeg', 'application/pdf', 'text/plain']

/**
 * Qué se hace con un archivo: una foto (se comprime y pasa a JPEG), un documento admitido
 * (se sube tal cual con esa extensión y ese tipo) o null si el formato no se admite.
 */
export function clasificar(nombre: string, tipo: string): { foto: true } | { foto: false; ext: string; mime: string } | null {
  const ext = /\.([a-z0-9]+)$/i.exec(nombre)?.[1].toLowerCase() ?? ''
  if (Object.hasOwn(DOCUMENTOS, ext)) return { foto: false, ext, mime: DOCUMENTOS[ext] }
  if (tipo.startsWith('image/') || ext === 'heic' || ext === 'heif') return { foto: true }
  // Sin extensión conocida, vale lo que diga el navegador
  const porTipo = Object.entries(DOCUMENTOS).find(([, mime]) => mime === tipo)
  return porTipo ? { foto: false, ext: porTipo[0], mime: tipo } : null
}

export type Baja = Fila<'bajas_documentos'> & {
  trabajadores: { nombre: string } | null
  /** Enlace firmado al archivo (una hora). null si no se ha podido firmar. */
  url: string | null
}

const almacen = () => supabase.storage.from('bajas')

/** Ficha de trabajador enlazada al usuario (Ajustes → Trabajadores). null si no tiene. */
export function useMiFicha(perfilId: string | undefined) {
  return useQuery({
    queryKey: ['trabajadores', 'mi_ficha', perfilId],
    enabled: !!perfilId,
    queryFn: async () => {
      const { data, error } = await supabase.from('trabajadores').select('id, nombre').eq('perfil_id', perfilId!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/**
 * Papeles subidos, del más reciente al más antiguo, cada uno con el enlace a su archivo.
 * Con `trabajadorId`, solo los de esa ficha; sin él, los de todos (lo que el RLS deje ver).
 */
export function useBajas(trabajadorId?: string, activa = true) {
  return useQuery({
    queryKey: ['bajas_documentos', trabajadorId ?? 'todos'],
    enabled: activa,
    // Los enlaces caducan a la hora: se renuevan antes aunque la pantalla se quede abierta
    refetchInterval: 30 * 60 * 1000,
    queryFn: async (): Promise<Baja[]> => {
      const filas = await todasLasFilas((desde, hasta) => {
        const consulta = supabase.from('bajas_documentos').select('*, trabajadores(nombre)', { count: 'exact' })
        return (trabajadorId ? consulta.eq('trabajador_id', trabajadorId) : consulta)
          .order('subido_el', { ascending: false })
          .order('id')
          .range(desde, hasta)
      })
      if (filas.length === 0) return []
      // ponytail: firma de una vez los enlaces de todo el listado; si el historial pasa de unos miles
      // de papeles, firmar al abrir cada uno o paginar
      const firmados = await almacen().createSignedUrls(
        filas.map((f) => f.ruta),
        3600,
      )
      if (firmados.error) throw firmados.error
      const enlaces = new Map(firmados.data.map((f) => [f.path, f.signedUrl]))
      return filas.map((f) => {
        const url = enlaces.get(f.ruta)
        const descarga = SE_VE_EN_EL_NAVEGADOR.includes(f.tipo_mime) ? '' : `&download=${encodeURIComponent(f.nombre_archivo)}`
        return { ...f, url: url ? url + descarga : null }
      })
    },
  })
}

/** Sube un papel a la ficha de un trabajador. Las fotos se comprimen antes (regla 9). */
export async function subirDocumento(trabajadorId: string, tipo: TipoParte, comentario: string, archivo: File) {
  const clase = clasificar(archivo.name, archivo.type)
  if (!clase) throw new Error('formato no admitido. Vale una foto, un PDF o un documento de Word, OpenDocument o de texto.')
  const { blob, ext, mime, nombre } = clase.foto
    ? {
        blob: (await comprimir(archivo)).foto.blob,
        ext: 'jpg',
        mime: 'image/jpeg',
        nombre: archivo.name.replace(/\.[^.]+$/, '') + '.jpg',
      }
    : { blob: archivo as Blob, ...clase, nombre: archivo.name }
  if (blob.size === 0) throw new Error('el archivo está vacío.')
  if (blob.size > MAX_BYTES) throw new Error('pesa más de 10 MB.')

  const ruta = `${trabajadorId}/${idAleatorio()}.${ext}`
  const subida = await almacen().upload(ruta, blob, { contentType: mime })
  if (subida.error) throw subida.error
  const { error } = await supabase.from('bajas_documentos').insert({
    trabajador_id: trabajadorId,
    tipo,
    comentario: comentario.trim() || null,
    ruta,
    nombre_archivo: nombre,
    tipo_mime: mime,
    tamano: blob.size,
  })
  if (error) {
    await almacen().remove([ruta]) // no dejar archivos sin su fila
    throw error
  }
}

/** Primero la fila y luego el archivo: el historial nunca enlaza un archivo que ya no existe. */
export async function borrarDocumento(baja: Pick<Baja, 'id' | 'ruta'>) {
  const { data, error } = await supabase.from('bajas_documentos').delete().eq('id', baja.id).select('id')
  if (error) throw error
  // Sin permiso el RLS no da error: simplemente no borra nada
  if (data.length === 0) throw new Error('No tienes permiso para borrar este papel.')
  await almacen().remove([baja.ruta])
}
