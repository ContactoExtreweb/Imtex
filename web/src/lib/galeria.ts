// Galería de obras: se gestiona en el CRM y aquí solo se lee lo publicado.
// Se consulta la API de Supabase con fetch y la clave publicable (anon): el RLS deja ver
// únicamente las obras con `publicada = true` y sus fotos.

const API = import.meta.env.PUBLIC_SUPABASE_URL
const CLAVE = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY

/** Categorías de la galería (web_obras.servicio) y la ficha de servicio a la que corresponden. */
export const SERVICIOS = {
  impermeabilizacion: { nombre: 'Impermeabilización', slug: 'impermeabilizacion' },
  reparacion_refuerzo: { nombre: 'Reparación y refuerzo', slug: 'reparacion-y-refuerzo' },
  resinas: { nombre: 'Resinas epoxi y poliuretano', slug: 'resinas-epoxi-y-poliuretano' },
  otros: { nombre: 'Otros trabajos', slug: 'otros-trabajos' },
} as const
export type Servicio = keyof typeof SERVICIOS

export interface Foto {
  storage_path: string
  alt: string
  ancho: number
  alto: number
  orden: number
}

export interface Obra {
  slug: string
  titulo: string
  ubicacion: string | null
  anio: string | null
  servicio: Servicio | null
  resumen: string | null
  descripcion: string | null
  destacada: boolean
  /** En orden: la primera es la portada */
  fotos: Foto[]
}

const CAMPOS = 'slug,titulo,ubicacion,anio,servicio,resumen,descripcion,destacada,fotos:web_fotos(storage_path,alt,ancho,alto,orden)'

async function consultar(filtro: string): Promise<Obra[]> {
  const res = await fetch(`${API}/rest/v1/web_obras?select=${CAMPOS}&publicada=eq.true${filtro}`, {
    headers: { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` },
  })
  if (!res.ok) throw new Error(`Galería: ${res.status} ${await res.text()}`)
  const obras: Obra[] = await res.json()
  for (const o of obras) o.fotos.sort((a, b) => a.orden - b.orden)
  return obras
}

/** «2017-2024» → 2024; «2010-actualidad» → este año. Para ordenar: lo más reciente, primero. */
const ultimoAnio = (anio: string | null) =>
  /actual/i.test(anio ?? '') ? new Date().getFullYear() : Math.max(0, ...(anio?.match(/\d{4}/g) ?? []).map(Number))

/** Todas las obras publicadas, de la más reciente a la más antigua. */
export async function obrasPublicadas(): Promise<Obra[]> {
  const obras = await consultar('')
  return obras.sort((a, b) => ultimoAnio(b.anio) - ultimoAnio(a.anio) || a.titulo.localeCompare(b.titulo, 'es'))
}

/** Una obra publicada por su dirección, o null si no existe o está en borrador. */
export async function obraPorSlug(slug: string): Promise<Obra | null> {
  return (await consultar(`&slug=eq.${encodeURIComponent(slug)}`))[0] ?? null
}

/** URL pública de una foto del bucket. La miniatura (480 px) es la misma ruta acabada en `_m.jpg`. */
export const urlFoto = (ruta: string) => `${API}/storage/v1/object/public/galeria/${ruta}`
export const urlMiniatura = (ruta: string) => urlFoto(ruta.replace(/\.jpg$/, '_m.jpg'))

/**
 * La descripción se escribe en el CRM como texto: un párrafo y, debajo, los trabajos realizados,
 * uno por línea empezando por «- ». Aquí se separa para poder numerar los pasos.
 */
export function partirDescripcion(descripcion: string | null) {
  const lineas = (descripcion ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
  return {
    parrafos: lineas.filter((l) => !l.startsWith('- ')),
    pasos: lineas.filter((l) => l.startsWith('- ')).map((l) => l.slice(2)),
  }
}

/** Caché del CDN de Netlify para las páginas que leen la galería: 5 minutos, y se sirve la anterior mientras se renueva. */
export const CACHE_GALERIA = 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
