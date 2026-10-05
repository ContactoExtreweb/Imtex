// Recursos de Poly Haven (CC0) para los vídeos que se renderizan con Blender. No van a la web: solo los usa Blender.
// Se ejecuta desde web/:  node render/recursos.mjs
// Los deja en .polyhaven/render/ (fuera de git) y solo baja lo que falte.
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const CIELOS = ['citrus_orchard_puresky'] // a 4k: se ve de fondo
const TEXTURAS = ['terracotta_floor_tiles', 'concrete_floor_02', 'gravel_ground_01', 'patterned_concrete_pavers', 'painted_plaster_wall'] // a 2k
const MODELOS = [
  'sofa_03',
  'modern_coffee_table_01',
  'throw_pillows_01',
  'potted_plant_02',
  'potted_plant_04',
  'planter_box_01',
  'hanging_picture_frame_01',
  'outdoor_table_chair_set_01',
  'rollershutter_window_01',
  'rollershutter_door',
] // glTF a 1k

const DESTINO = '.polyhaven/render'
const existe = (ruta) => access(ruta).then(() => true, () => false)
const ficha = (id) => fetch(`https://api.polyhaven.com/files/${id}`).then((r) => r.json())
let total = 0
async function bajar(url, ruta) {
  if (await existe(ruta)) return
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  const datos = Buffer.from(await r.arrayBuffer())
  await mkdir(path.dirname(ruta), { recursive: true })
  await writeFile(ruta, datos)
  total += datos.length
  console.log(`${(datos.length / 1e6).toFixed(1).padStart(5)} MB  ${ruta}`)
}

for (const id of CIELOS) await bajar((await ficha(id)).hdri['4k'].hdr.url, path.join(DESTINO, 'cielos', `${id}_4k.hdr`))
for (const id of TEXTURAS) {
  const f = await ficha(id)
  for (const mapa of ['Diffuse', 'nor_gl', 'Rough', 'Displacement']) {
    const url = f[mapa]['2k'].jpg.url
    await bajar(url, path.join(DESTINO, 'texturas', id, url.split('/').pop()))
  }
}
for (const id of MODELOS) {
  const g = (await ficha(id)).gltf['1k'].gltf
  await bajar(g.url, path.join(DESTINO, 'modelos', id, `${id}.gltf`))
  for (const [ruta, { url }] of Object.entries(g.include)) {
    if (ruta.includes('graffiti')) continue
    await bajar(url, path.join(DESTINO, 'modelos', id, ruta))
  }
}
console.log(`Bajado: ${(total / 1e6).toFixed(1)} MB`)
