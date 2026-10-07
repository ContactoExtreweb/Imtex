// Mapa del sitio: las páginas fijas y las obras publicadas en la galería.
import type { APIRoute } from 'astro'
import { EMPRESA, SERVICIOS } from '../lib/empresa'
import { CACHE_GALERIA, obrasPublicadas } from '../lib/galeria'

export const prerender = false

export const GET: APIRoute = async () => {
  const rutas = [
    '/',
    '/empresa',
    '/servicios',
    ...SERVICIOS.map((s) => `/servicios/${s.slug}`),
    '/obras',
    '/particulares',
    '/contacto',
    '/aviso-legal',
    '/privacidad',
    '/cookies',
  ]
  try {
    rutas.push(...(await obrasPublicadas()).map((o) => `/obras/${o.slug}`))
  } catch (error) {
    console.error(error) // sin galería, el mapa sale con las páginas fijas
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rutas.map((r) => `  <url><loc>${new URL(r, EMPRESA.dominio).href}</loc></url>`).join('\n')}
</urlset>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Netlify-CDN-Cache-Control': CACHE_GALERIA } })
}
