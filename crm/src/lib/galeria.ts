import { useQuery } from '@tanstack/react-query'
import { aSlug, slugLibre } from './formato'
import { idAleatorio } from './id'
import { comprimir, rutaMiniatura } from './imagenes'
import { supabase, type Fila, type NuevaFila } from './supabase'
import { todasLasFilas } from './todas-las-filas'

// Galería de obras de la web (imtexsl.com). Se gestiona desde aquí; la web solo lee lo publicado.

/** Categorías de la galería: las cuatro páginas de servicio de la web. */
export const SERVICIOS = {
  impermeabilizacion: 'Impermeabilización',
  reparacion_refuerzo: 'Reparación y refuerzo',
  resinas: 'Resinas epoxi y poliuretano',
  otros: 'Otros trabajos',
} as const
export type Servicio = keyof typeof SERVICIOS

export const nombreServicio = (servicio: string | null) =>
  servicio ? SERVICIOS[servicio as Servicio] : 'Sin categoría'

export type WebObra = Fila<'web_obras'>
export type WebFoto = Fila<'web_fotos'>

const almacen = () => supabase.storage.from('galeria')

/** URL pública de una foto del bucket (o de su miniatura). */
export const urlFoto = (ruta: string) => almacen().getPublicUrl(ruta).data.publicUrl

/** Obras de la galería con sus fotos (la portada es la primera por orden). */
export function useGaleria(activa = true) {
  return useQuery({
    queryKey: ['web_obras'],
    enabled: activa,
    queryFn: () =>
      todasLasFilas((de, hasta) =>
        supabase
          .from('web_obras')
          .select('*, web_fotos(storage_path, orden)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .order('id')
          .range(de, hasta),
      ),
  })
}

/** Una obra de la galería con sus fotos en orden. */
export function useWebObra(id: string | undefined) {
  return useQuery({
    queryKey: ['web_obra', id],
    enabled: !!id,
    queryFn: async () => {
      const [obra, fotos] = await Promise.all([
        supabase.from('web_obras').select().eq('id', id!).maybeSingle(),
        supabase.from('web_fotos').select().eq('obra_id', id!).order('orden').order('id'),
      ])
      if (obra.error) throw obra.error
      if (fotos.error) throw fotos.error
      return obra.data && { obra: obra.data, fotos: fotos.data }
    },
  })
}

/** Crea un borrador en la galería. La dirección (slug) sale del título y no se repite. */
export async function crearWebObra(datos: Omit<NuevaFila<'web_obras'>, 'slug'>): Promise<WebObra> {
  const base = aSlug(datos.titulo) || 'obra'
  const usados = await supabase.from('web_obras').select('slug').like('slug', `${base}%`)
  if (usados.error) throw usados.error
  const { data, error } = await supabase
    .from('web_obras')
    .insert({ ...datos, slug: slugLibre(base, usados.data.map((u) => u.slug)) })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Comprime la foto (regla 9), la sube con su miniatura y la añade a la obra. */
export async function subirFoto(webObraId: string, archivo: File, orden: number) {
  const { foto, miniatura } = await comprimir(archivo)
  const ruta = `obras/${webObraId}/${idAleatorio()}.jpg`
  // Las rutas no se reutilizan: el navegador puede guardar las fotos un año
  const opciones = { contentType: 'image/jpeg', cacheControl: '31536000' }
  const subidas = await Promise.all([
    almacen().upload(ruta, foto.blob, opciones),
    almacen().upload(rutaMiniatura(ruta), miniatura.blob, opciones),
  ])
  const error =
    subidas.find((s) => s.error)?.error ??
    (
      await supabase
        .from('web_fotos')
        .insert({ obra_id: webObraId, storage_path: ruta, ancho: foto.ancho, alto: foto.alto, orden })
    ).error
  if (error) {
    await borrarArchivos([ruta]) // no dejar archivos sin su fila
    throw error
  }
}

/** Borra del bucket las fotos y sus miniaturas. */
const borrarArchivos = (rutas: string[]) => almacen().remove(rutas.flatMap((r) => [r, rutaMiniatura(r)]))

// Primero la fila y luego el archivo: así la web nunca enlaza una foto que ya no existe.
// Si falla el borrado del archivo, queda un archivo suelto que nadie enlaza.

export async function borrarFoto(foto: Pick<WebFoto, 'id' | 'storage_path'>) {
  const { error } = await supabase.from('web_fotos').delete().eq('id', foto.id)
  if (error) throw error
  await borrarArchivos([foto.storage_path])
}

export async function borrarWebObra(id: string, fotos: Pick<WebFoto, 'storage_path'>[]) {
  const { error } = await supabase.from('web_obras').delete().eq('id', id) // sus fotos, en cascada
  if (error) throw error
  if (fotos.length) await borrarArchivos(fotos.map((f) => f.storage_path))
}

export async function actualizarFoto(id: string, cambios: Partial<Pick<WebFoto, 'alt' | 'orden'>>) {
  const { error } = await supabase.from('web_fotos').update(cambios).eq('id', id)
  if (error) throw error
}

/** Cambia el orden de dos fotos entre sí (la primera por orden es la portada). */
export async function intercambiarOrden(a: Pick<WebFoto, 'id' | 'orden'>, b: Pick<WebFoto, 'id' | 'orden'>) {
  const cambios = await Promise.all([
    supabase.from('web_fotos').update({ orden: b.orden }).eq('id', a.id),
    supabase.from('web_fotos').update({ orden: a.orden }).eq('id', b.id),
  ])
  const error = cambios.find((c) => c.error)?.error
  if (error) throw error
}
