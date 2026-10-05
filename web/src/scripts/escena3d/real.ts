// Lo que da realismo a las escenas: la luz y los reflejos de un cielo de verdad, texturas escaneadas y modelos.
// Todo es de Poly Haven (CC0) y está en public/3d, preparado por scripts/preparar-3d.mjs.
// Se carga después de montar la escena: hasta que llega, se ve con la luz de estudio y el color de cada material.

import {
  type BufferGeometry,
  type Group,
  type Mesh,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  PMREMGenerator,
  RepeatWrapping,
  type Scene,
  SRGBColorSpace,
  TextureLoader,
  type Vector3,
  type WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'

const avisar = (error: unknown) => import.meta.env.DEV && console.error(error)

/** Cambia la luz de estudio por la del cielo en cuanto llega */
export function ponerCielo(renderizador: WebGLRenderer, escena: Scene) {
  new HDRLoader().load(
    '/3d/cielo.hdr',
    (textura) => {
      const pmrem = new PMREMGenerator(renderizador)
      escena.environment?.dispose()
      escena.environment = pmrem.fromEquirectangular(textura).texture
      textura.dispose()
      pmrem.dispose()
    },
    undefined,
    avisar,
  )
}

const texturas = new TextureLoader()
/**
 * Material con una textura escaneada de public/3d/<id>: color, relieve, rugosidad y oclusión.
 * `tamano` es lo que mide un cuadro de la textura en unidades de la escena (cada planta mide 1).
 * Las cajas necesitan coordenadas de textura en el mundo (`uvMundo`) para que no se estire.
 */
export function materialReal(id: string, tamano: number, ajustes: MeshStandardMaterialParameters = {}) {
  const mapa = (nombre: string) => {
    const t = texturas.load(`/3d/${id}/${nombre}.webp`, undefined, undefined, avisar)
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.setScalar(1 / tamano)
    t.anisotropy = 8
    if (nombre === 'color') t.colorSpace = SRGBColorSpace
    return t
  }
  const arm = mapa('arm')
  return new MeshStandardMaterial({ map: mapa('color'), normalMap: mapa('normal'), aoMap: arm, roughnessMap: arm, ...ajustes })
}

/** Coordenadas de textura según la posición en el mundo: dos cajas que se tocan siguen la misma textura sin costuras */
export function uvMundo(geo: BufferGeometry, centro: Vector3) {
  const p = geo.attributes.position
  const n = geo.attributes.normal
  const uv = geo.attributes.uv
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i) + centro.x, p.getY(i) + centro.y, p.getZ(i) + centro.z]
    if (Math.abs(n.getX(i)) > 0.5) uv.setXY(i, z, y)
    else if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, x, z)
    else uv.setXY(i, x, y)
  }
  uv.needsUpdate = true
}

const modelos = new GLTFLoader()
/** Un modelo de public/3d/<id>, con sombras. Si no llega, la escena sigue sin él. */
export function modelo(id: string, alCargar: (m: Group) => void) {
  modelos.load(
    `/3d/${id}/${id}.gltf`,
    ({ scene }) => {
      scene.traverse((o) => {
        if ((o as Mesh).isMesh) o.castShadow = o.receiveShadow = true
      })
      alCargar(scene)
    },
    undefined,
    avisar,
  )
}
