// Materiales y modelos reales para las escenas 3D, de Poly Haven (CC0: uso comercial, sin citar autor).
// Se ejecuta desde web/:  node scripts/preparar-3d.mjs
// Baja los originales a .polyhaven/ (solo los que falten) y deja en public/3d/ lo que usa la web:
//   - cielo.hdr: el cielo que da la luz y los reflejos
//   - <textura>/{color,normal,arm}.webp: texturas a 512 px (arm = oclusión, rugosidad y metal)
//   - <modelo>/<modelo>.gltf + .bin + {color,normal,arm}.webp
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const CIELO = 'hilltop_construction'
const TEXTURAS = ['terracotta_floor_tiles', 'concrete_floor_02']
// Retoques de color: el hormigón escaneado está sucio y tira a marrón; en las obras se ve gris, claro y sin tanto contraste
const RETOQUE = { concrete_floor_02: (imagen) => imagen.modulate({ saturation: 0.25, brightness: 1.5 }).linear(0.45, 92) }
const MODELOS = ['rollershutter_window_01', 'rollershutter_door']
const LADO = 512

const ORIGINALES = '.polyhaven'
const SALIDA = 'public/3d'
const { default: sharp } = await import('sharp')

const existe = (ruta) => access(ruta).then(() => true, () => false)
const ficha = (id) => fetch(`https://api.polyhaven.com/files/${id}`).then((r) => r.json())
async function bajar(url, ruta) {
  if (await existe(ruta)) return
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  await mkdir(path.dirname(ruta), { recursive: true })
  await writeFile(ruta, Buffer.from(await r.arrayBuffer()))
  console.log(`Bajado ${ruta}`)
}
// El nombre del mapa en Poly Haven → el nuestro
const nombreMapa = (archivo) => (archivo.includes('_diff_') ? 'color' : archivo.includes('_nor_gl_') ? 'normal' : 'arm')
async function aWebp(origen, destino, retoque) {
  await mkdir(path.dirname(destino), { recursive: true })
  const imagen = sharp(origen).resize(LADO, LADO)
  await (retoque ? retoque(imagen) : imagen).webp({ quality: 82 }).toFile(destino)
}

// Cielo: a la mitad (512 × 256). Solo da luz y reflejos, no se ve de fondo, y así pesa la tercera parte.
const hdr = path.join(ORIGINALES, `${CIELO}_1k.hdr`)
await bajar((await ficha(CIELO)).hdri['1k'].hdr.url, hdr)
await mkdir(SALIDA, { recursive: true })
{
  const { HDRLoader } = await import('three/examples/jsm/loaders/HDRLoader.js')
  const { FloatType } = await import('three')
  const { width: w, height: h, data } = new HDRLoader().setDataType(FloatType).parse((await readFile(hdr)).buffer)
  const [w2, h2] = [w / 2, h / 2]
  const rgbe = Buffer.alloc(w2 * h2 * 4)
  for (let y = 0; y < h2; y++)
    for (let x = 0; x < w2; x++) {
      // Media de los cuatro píxeles, y de vuelta a RGBE (tres mantisas y un exponente común)
      const c = [0, 1, 2].map((k) => [0, 1, 2, 3].reduce((s, i) => s + data[((2 * y + (i >> 1)) * w + 2 * x + (i & 1)) * 4 + k], 0) / 4)
      const m = Math.max(...c)
      if (m < 1e-32) continue
      const e = Math.floor(Math.log2(m)) + 1
      const o = (y * w2 + x) * 4
      c.forEach((v, k) => (rgbe[o + k] = Math.floor((v * 256) / 2 ** e)))
      rgbe[o + 3] = e + 128
    }
  // Sin compresión por líneas: si el primer píxel empezara por 2,2 el lector lo tomaría por comprimido
  if (rgbe[0] === 2 && rgbe[1] === 2) rgbe[0] = 3
  await writeFile(path.join(SALIDA, 'cielo.hdr'), Buffer.concat([Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${h2} +X ${w2}\n`), rgbe]))
}

// Texturas
for (const id of TEXTURAS) {
  const f = await ficha(id)
  for (const mapa of ['Diffuse', 'nor_gl', 'arm']) {
    const url = f[mapa]['1k'].jpg.url
    const original = path.join(ORIGINALES, id, url.split('/').pop())
    await bajar(url, original)
    const nombre = nombreMapa(original)
    await aWebp(original, path.join(SALIDA, id, `${nombre}.webp`), nombre === 'color' ? RETOQUE[id] : undefined)
  }
}

// Modelos: se queda la primera malla con su material (los de Poly Haven traen al lado una copia con pintadas)
for (const id of MODELOS) {
  const g = (await ficha(id)).gltf['1k'].gltf
  const original = path.join(ORIGINALES, id, `${id}.gltf`)
  await bajar(g.url, original)
  for (const [ruta, { url }] of Object.entries(g.include)) if (!ruta.includes('graffiti')) await bajar(url, path.join(ORIGINALES, id, ruta))

  const gltf = JSON.parse(await readFile(original, 'utf8'))
  const material = gltf.materials[0]
  const pbr = material.pbrMetallicRoughness
  const texturas = []
  const imagenes = []
  for (const ref of [material.normalTexture, pbr.baseColorTexture, pbr.metallicRoughnessTexture]) {
    const textura = gltf.textures[ref.index]
    const archivo = gltf.images[textura.source].uri
    const webp = `${nombreMapa(archivo)}.webp`
    await aWebp(path.join(ORIGINALES, id, archivo), path.join(SALIDA, id, webp))
    ref.index = texturas.length
    texturas.push({ ...textura, source: imagenes.length })
    imagenes.push({ uri: webp })
  }
  gltf.textures = texturas
  gltf.images = imagenes
  gltf.materials = [material]
  gltf.meshes = [gltf.meshes[gltf.nodes[0].mesh]]
  gltf.nodes = [{ ...gltf.nodes[0], mesh: 0 }]
  gltf.scenes = [{ nodes: [0] }]
  await mkdir(path.join(SALIDA, id), { recursive: true })
  await writeFile(path.join(SALIDA, id, `${id}.gltf`), JSON.stringify(gltf))
  await copyFile(path.join(ORIGINALES, id, gltf.buffers[0].uri), path.join(SALIDA, id, gltf.buffers[0].uri))
}
console.log(`Listo en ${SALIDA}`)
