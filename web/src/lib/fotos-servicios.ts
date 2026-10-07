// Fotos de cada servicio, bajadas de la web antigua a src/assets/servicios:
// `<prefijo>caratula.jpg` y `<prefijo>1.jpg`, `<prefijo>2.jpg`…
import type { ImageMetadata } from 'astro'

const fotos = import.meta.glob<{ default: ImageMetadata }>('../assets/servicios/*.jpg', { eager: true })
const PREFIJO: Record<string, string> = {
  impermeabilizacion: 'imp',
  'reparacion-y-refuerzo': 'ref',
  'resinas-epoxi-y-poliuretano': 'res',
  'otros-trabajos': 'ot',
}

export const caratulaServicio = (slug: string) => fotos[`../assets/servicios/${PREFIJO[slug]}caratula.jpg`].default

export function fotosServicio(slug: string) {
  const patron = new RegExp(`/${PREFIJO[slug]}(\\d+)\\.jpg$`)
  return Object.entries(fotos)
    .map(([ruta, m]) => ({ n: Number(patron.exec(ruta)?.[1]), foto: m.default }))
    .filter((f) => f.n > 0)
    .sort((a, b) => a.n - b.n)
    .map((f) => f.foto)
}
