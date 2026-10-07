// Trae a la galería las 22 obras de la web antigua (Joomla) de imtexsl.com.
// Se ejecuta desde web/:  node scripts/importar-obras.mjs <paso>
//   leer   → lee el texto y la lista de fotos de cada obra        → .importacion/obras.json
//   fotos  → baja las fotos y prepara JPEG + miniatura            → .importacion/galeria/obras/<slug>/
//   sql    → escribe supabase/seed_web_obras.sql (obras y fotos)
// Después, desde web/, las fotos se suben al bucket con la CLI de Supabase y se carga el SQL:
//   npx supabase storage cp -r .importacion/galeria/obras ss:///galeria/ --linked --experimental \
//     --cache-control "max-age=31536000" --content-type image/jpeg -j 6
//   npx supabase db query --linked -f ../supabase/seed_web_obras.sql
// Ojo con el destino: es `ss:///galeria/` (la carpeta `obras` se crea dentro). Con
// `ss:///galeria/obras` las fotos acaban en `obras/obras/…` y las filas no las encuentran.
// Los textos nuevos están en scripts/obras-textos.json; lo leído de la web antigua es solo la fuente.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ORIGEN = 'https://www.imtexsl.com'
const TRABAJO = '.importacion'
// Mismas medidas que el CRM (crm/src/lib/imagenes.ts)
const LADO_FOTO = 2000
const LADO_MINIATURA = 480
const CALIDAD = 80

// docs/PLAN.md B6. `servicio` es la categoría de la galería (web_obras.servicio).
export const OBRAS = [
  ['inyeccion-sifones-orellana', 'inyeccion', 'Inyección de sifones', 'Orellana (Badajoz)', '2025', 'reparacion_refuerzo'],
  ['balsa-pead-badajoz', 'balsapead', 'Balsa PEAD 1,50 mm', 'Badajoz', '2025', 'impermeabilizacion'],
  ['etap-torrelaguna', 'torrelaguna', 'E.T.A.P. Torrelaguna', 'Madrid', '2024', 'reparacion_refuerzo'],
  ['obramat-carnaxide-lisboa', 'carnaxide', 'Obramat Carnaxide', 'Lisboa', '2024', 'reparacion_refuerzo'],
  ['bodegas-williams-humbert', 'williamshumbert', 'Bodegas Williams & Humbert', 'Cádiz', '2017-2024', 'impermeabilizacion'],
  ['canal-de-las-aves', 'aves', 'Canal de las Aves', 'Madrid', '2023', 'reparacion_refuerzo'],
  ['estructuras-don-benito-medellin', 'donbenito', 'Estructuras Don Benito / Medellín', 'Badajoz', '2023', 'reparacion_refuerzo'],
  ['canales-acequias-pead', 'canalesyacequiaspead', 'Canales y acequias', 'Badajoz', '2010-actualidad', 'impermeabilizacion'],
  ['cetarsa-caceres', 'cetarsa', 'CETARSA Talayuela, Navalmoral y Coria', 'Cáceres', '2012-2022', 'impermeabilizacion'],
  ['parking-salamanca', 'salamanca', 'Refuerzo parking Salamanca', 'Salamanca', '2022', 'reparacion_refuerzo'],
  ['deposito-plasencia', 'coria', 'Depósito Plasencia', 'Cáceres', '2021', 'impermeabilizacion'],
  ['cc-plaza-mayor-malaga', 'malaga', 'C. C. Plaza Mayor', 'Málaga', '2021', 'impermeabilizacion'],
  ['universidad-linares', 'linares', 'Universidad de Linares', 'Jaén', '2020', 'impermeabilizacion'],
  ['transvase-tajo-segura', 'tajosegura', 'Transvase Tajo-Segura', 'Cuenca', '2016-2019', 'impermeabilizacion'],
  ['presa-horcajo', 'horcajo', 'Presa Horcajo', 'Hervás (Cáceres)', '2017', 'reparacion_refuerzo'],
  ['balsa-la-caldereta-la-palma', 'lapalma', 'Balsa La Caldereta', 'La Palma', '2017', 'impermeabilizacion'],
  ['mercadona-asura', 'asura', 'Mercadona Asura', 'Madrid', '2016', 'reparacion_refuerzo'],
  ['viaducto-casatejada', 'casatejada', 'Viaducto Casatejada', 'Cáceres', '2016', 'impermeabilizacion'],
  ['jardines-de-la-sierra-cordoba', 'rcordoba', 'Edificio Jardines de la Sierra', 'Córdoba', '2015', 'reparacion_refuerzo'],
  ['central-nuclear-almaraz', 'almaraz', 'Central Nuclear de Almaraz', 'Cáceres', '2011-2012', 'impermeabilizacion'],
  ['aeropuerto-sevilla', 'aenasevilla', 'Aeropuerto de Sevilla', 'Sevilla', '2011', 'impermeabilizacion'],
  ['aeropuerto-bilbao', 'aenabilbao', 'Aeropuerto de Bilbao', 'Bilbao', '2010', 'impermeabilizacion'],
].map(([slug, antiguo, titulo, ubicacion, anio, servicio]) => ({ slug, antiguo, titulo, ubicacion, anio, servicio }))

const entidades = { amp: '&', nbsp: ' ', quot: '"', lt: '<', gt: '>', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', ordm: 'º', sup2: '²' }
const aTexto = (html) =>
  html
    .replace(/<(br|\/p|\/li|\/div)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z0-9]+);/gi, (m, e) => entidades[e.toLowerCase()] ?? m)
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')

const leerJson = async (fichero) => JSON.parse(await readFile(path.join(TRABAJO, fichero), 'utf8'))

async function leer() {
  const obras = []
  for (const obra of OBRAS) {
    const res = await fetch(`${ORIGEN}/index.php/obras/${obra.antiguo}`)
    if (!res.ok) throw new Error(`${obra.antiguo}: ${res.status}`)
    const html = await res.text()
    // El cuerpo del artículo empieza en articleBody; su texto acaba donde empieza el pie de la plantilla
    const cuerpo = html.split('itemprop="articleBody"')[1] ?? ''
    const fotos = [...cuerpo.matchAll(/<img[^>]+src="(\/images\/obras\/[^"]+)"/g)].map((m) => m[1])
    const titulo = aTexto(html.match(/itemprop="headline"[^>]*>([\s\S]*?)<\/h\d>/)?.[1] ?? '')
    const texto = aTexto(cuerpo.replace(/^[^>]*>/, '')).split('\n9TECHNOLOGY')[0]
    obras.push({ ...obra, tituloAntiguo: titulo, texto, fotos: [...new Set(fotos)] })
    console.log(`${obra.slug}: ${fotos.length} fotos, ${obras.at(-1).texto.length} caracteres`)
  }
  await mkdir(TRABAJO, { recursive: true })
  await writeFile(path.join(TRABAJO, 'obras.json'), JSON.stringify(obras, null, 2))
  console.log(`Total: ${obras.length} obras, ${obras.reduce((n, o) => n + o.fotos.length, 0)} fotos`)
}

async function fotos() {
  const { default: sharp } = await import('sharp')
  const obras = await leerJson('obras.json')
  const hechas = []
  for (const obra of obras) {
    const carpeta = path.join(TRABAJO, 'galeria', 'obras', obra.slug)
    await mkdir(carpeta, { recursive: true })
    for (const [i, origen] of obra.fotos.entries()) {
      const res = await fetch(ORIGEN + encodeURI(origen))
      if (!res.ok) {
        console.warn(`  ${origen}: ${res.status}, se salta`)
        continue
      }
      const nombre = String(i + 1).padStart(2, '0')
      // rotate(): aplica la orientación EXIF. Sin ampliar: las de la web antigua son de 1.000 px.
      const base = sharp(Buffer.from(await res.arrayBuffer())).rotate()
      const foto = await base
        .clone()
        .resize({ width: LADO_FOTO, height: LADO_FOTO, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: CALIDAD, mozjpeg: true })
        .toFile(path.join(carpeta, `${nombre}.jpg`))
      await base
        .clone()
        .resize({ width: LADO_MINIATURA, height: LADO_MINIATURA, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: CALIDAD, mozjpeg: true })
        .toFile(path.join(carpeta, `${nombre}_m.jpg`))
      hechas.push({ slug: obra.slug, ruta: `obras/${obra.slug}/${nombre}.jpg`, ancho: foto.width, alto: foto.height, orden: i + 1 })
    }
    console.log(`${obra.slug}: ${hechas.filter((f) => f.slug === obra.slug).length} fotos`)
  }
  await writeFile(path.join(TRABAJO, 'fotos.json'), JSON.stringify(hechas, null, 2))
  console.log(`Total: ${hechas.length} fotos en ${path.join(TRABAJO, 'galeria')}`)
}

const q = (texto) => (texto == null ? 'null' : `'${String(texto).replace(/'/g, "''")}'`)

async function sql() {
  const textos = JSON.parse(await readFile('scripts/obras-textos.json', 'utf8'))
  const hechas = await leerJson('fotos.json')
  const lineas = [
    '-- Las 22 obras de referencia de la web antigua, con sus fotos. Generado por web/scripts/importar-obras.mjs.',
    '-- Se puede repetir: no pisa una obra que ya exista con el mismo slug, ni una foto con la misma ruta.',
    '-- Antes hay que subir las fotos al bucket `galeria` (docs/ESTADO.md).',
    '',
  ]
  for (const obra of OBRAS) {
    const t = textos[obra.slug]
    if (!t) throw new Error(`Falta el texto de ${obra.slug} en scripts/obras-textos.json`)
    lineas.push(
      'insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)',
      `values (${[obra.slug, obra.titulo, obra.ubicacion, obra.anio, obra.servicio, t.resumen, t.descripcion].map(q).join(', ')}, ${!!t.destacada}, true)`,
      'on conflict (slug) do nothing;',
    )
    const suyas = hechas.filter((f) => f.slug === obra.slug)
    if (suyas.length) {
      lineas.push(
        'insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)',
        `select o.id, f.ruta, ${q(`${obra.titulo}, ${obra.ubicacion}`)}, f.ancho, f.alto, f.orden`,
        `from public.web_obras o, (values`,
        suyas.map((f) => `  (${q(f.ruta)}, ${f.ancho}, ${f.alto}, ${f.orden})`).join(',\n'),
        `) as f(ruta, ancho, alto, orden)`,
        `where o.slug = ${q(obra.slug)}`,
        'on conflict (storage_path) do nothing;',
      )
    }
    lineas.push('')
  }
  await writeFile('../supabase/seed_web_obras.sql', lineas.join('\n'))
  console.log(`supabase/seed_web_obras.sql: ${OBRAS.length} obras, ${hechas.length} fotos`)
}

const pasos = { leer, fotos, sql }
const paso = pasos[process.argv[2]]
if (!paso) {
  console.error('Uso: node scripts/importar-obras.mjs <leer|fotos|sql>')
  process.exit(1)
}
await paso()
