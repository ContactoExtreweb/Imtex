// «Lo que aplicamos»: un palé en el que se van apilando solos los materiales del oficio.
// Caen y encajan en su sitio, uno tras otro: sacos de mortero, rollos de lámina, cubos de resina y una bobina
// de fibra de carbono. Lleno, el palé da una vuelta; luego se vacía y vuelve a empezar.
// Sin marcas: no hay permiso para usar los logotipos de los fabricantes.
// La leyenda (empresa.astro) marca el material que está llegando.

import { BoxGeometry, CanvasTexture, CircleGeometry, CylinderGeometry, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type Object3D } from 'three'
import { crearEscena } from './base'
import { azar, lienzo2d, pintarGrano, suave, tramo } from './texturas'

const ALTO_PALE = 0.15
const CAIDA = 0.75 // segundos que tarda cada cosa en caer
const GIRO = [6.4, 10.4] as const
const VACIA = 11 // empieza a vaciarse
const VUELTA = 12.9

export function montar(lienzo: HTMLCanvasElement, { raiz }: { raiz: HTMLElement }) {
  const rnd = azar(9001)
  const e = crearEscena(lienzo, { alcanceSombra: 2.5, apertura: 30, anchoMinimo: 1.1, giroMaximo: 0.8 })
  const { escena, sombra } = e
  e.encuadre.pos.set(1.85, 1.55, 2.3)
  e.encuadre.mira.set(0, 0.4, 0)

  const textura = (l: HTMLCanvasElement, repetir = false) => {
    const t = new CanvasTexture(l)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    if (repetir) t.wrapS = t.wrapT = RepeatWrapping
    return t
  }
  const grano = new CanvasTexture(pintarGrano(256, rnd, 0.8))
  grano.wrapS = grano.wrapT = RepeatWrapping

  // Todo lo que gira con el palé
  const carga = new Group()
  escena.add(carga)

  // --- Palé de madera ---
  const [lMadera, cMadera] = lienzo2d(256, 64)
  cMadera.fillStyle = '#b48a5a'
  cMadera.fillRect(0, 0, 256, 64)
  for (let i = 0; i < 40; i++) {
    cMadera.strokeStyle = `rgba(${rnd() < 0.5 ? '90,60,30' : '220,190,140'},${0.15 + rnd() * 0.25})`
    cMadera.lineWidth = 0.5 + rnd() * 1.5
    cMadera.beginPath()
    const y = rnd() * 64
    cMadera.moveTo(0, y)
    cMadera.bezierCurveTo(80, y + (rnd() - 0.5) * 10, 170, y + (rnd() - 0.5) * 10, 256, y + (rnd() - 0.5) * 6)
    cMadera.stroke()
  }
  const matMadera = new MeshStandardMaterial({ map: textura(lMadera), roughness: 0.85, bumpMap: grano, bumpScale: 1 })
  const tabla = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = sombra(new Mesh(new BoxGeometry(w, h, d), matMadera))
    m.position.set(x, y, z)
    carga.add(m)
  }
  for (let i = 0; i < 7; i++) tabla(1.2, 0.022, 0.1, 0, ALTO_PALE - 0.011, -0.45 + i * 0.15)
  for (const z of [-0.45, 0, 0.45]) {
    for (const x of [-0.53, 0, 0.53]) tabla(0.14, 0.085, 0.12, x, 0.065, z)
    tabla(1.2, 0.022, 0.12, 0, 0.011, z)
  }
  for (const x of [-0.53, 0, 0.53]) tabla(0.14, 0.022, 1.0, x, 0.033, 0)

  // --- Materiales del oficio ---
  const matRojo = new MeshStandardMaterial({ color: '#ff311e', roughness: 0.5 })
  // Saco de mortero: papel kraft claro con una franja roja
  const [lSaco, cSaco] = lienzo2d(256, 128)
  cSaco.fillStyle = '#ddd3bf'
  cSaco.fillRect(0, 0, 256, 128)
  cSaco.fillStyle = '#ff311e'
  cSaco.fillRect(0, 44, 256, 26)
  cSaco.fillStyle = 'rgba(120,100,70,0.25)'
  for (let i = 0; i < 12; i++) cSaco.fillRect(rnd() * 256, rnd() * 128, 30 + rnd() * 60, 1)
  const matSaco = new MeshStandardMaterial({ map: textura(lSaco), roughness: 0.95, bumpMap: grano, bumpScale: 0.6 })
  const saco = () => {
    const g = new BoxGeometry(0.52, 0.13, 0.36, 4, 1, 4)
    // Abombado: un saco no es una caja
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / 0.26
      const z = p.getZ(i) / 0.18
      p.setY(i, p.getY(i) * (1 - 0.35 * (x * x * 0.5 + z * z * 0.5)))
    }
    g.computeVertexNormals()
    return sombra(new Mesh(g, matSaco))
  }

  // Rollo de lámina, de pie: antracita, con la espiral en la tapa
  const [lEspiral, cEspiral] = lienzo2d(128, 128)
  cEspiral.fillStyle = '#2b2d33'
  cEspiral.fillRect(0, 0, 128, 128)
  cEspiral.strokeStyle = 'rgba(160,165,175,0.35)'
  for (let r = 10; r < 64; r += 4.5) {
    cEspiral.beginPath()
    cEspiral.arc(64, 64, r, 0, 6.3)
    cEspiral.stroke()
  }
  cEspiral.fillStyle = '#c9c2b4'
  cEspiral.beginPath()
  cEspiral.arc(64, 64, 9, 0, 6.3)
  cEspiral.fill()
  const matLamina = new MeshStandardMaterial({ color: '#33353c', roughness: 0.55, bumpMap: grano, bumpScale: 0.4 })
  const matEspiral = new MeshStandardMaterial({ map: textura(lEspiral), roughness: 0.7 })
  const rollo = () => {
    const g = new Group()
    g.add(sombra(new Mesh(new CylinderGeometry(0.11, 0.11, 0.86, 30), [matLamina, matEspiral, matEspiral])))
    const banda = new Mesh(new CylinderGeometry(0.112, 0.112, 0.07, 30, 1, true), matRojo)
    banda.position.y = 0.3
    g.add(banda)
    return g
  }

  // Cubo de resina: claro, con la tapa oscura y la etiqueta roja
  const matCubo = new MeshStandardMaterial({ color: '#d9dce2', roughness: 0.5 })
  const matTapa = new MeshStandardMaterial({ color: '#3b3e47', roughness: 0.4 })
  const cubo = () => {
    const g = new Group()
    g.add(sombra(new Mesh(new CylinderGeometry(0.15, 0.13, 0.3, 30), matCubo)))
    const etiqueta = new Mesh(new CylinderGeometry(0.146, 0.136, 0.12, 30, 1, true), matRojo)
    const tapa = sombra(new Mesh(new CylinderGeometry(0.155, 0.155, 0.03, 30), matTapa), false)
    tapa.position.y = 0.165
    g.add(etiqueta, tapa)
    return g
  }

  // Bobina de fibra de carbono, tumbada
  const [lFibra, cFibra] = lienzo2d(64, 64)
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const g = cFibra.createLinearGradient(i * 16, j * 16, i * 16 + ((i + j) % 2 ? 16 : 0), j * 16 + ((i + j) % 2 ? 0 : 16))
      g.addColorStop(0, '#1b1c21')
      g.addColorStop(0.5, '#3d3f48')
      g.addColorStop(1, '#16171b')
      cFibra.fillStyle = g
      cFibra.fillRect(i * 16, j * 16, 16, 16)
    }
  const texFibra = textura(lFibra, true)
  texFibra.repeat.set(10, 5)
  const matFibra = new MeshPhysicalMaterial({ map: texFibra, roughness: 0.3, clearcoat: 0.7 })
  const matCarton = new MeshStandardMaterial({ color: '#c9b48e', roughness: 0.9 })
  const bobina = () => {
    const g = new Group()
    const rollo = sombra(new Mesh(new CylinderGeometry(0.1, 0.1, 0.42, 30), [matFibra, matCarton, matCarton]))
    rollo.rotation.z = Math.PI / 2
    const nucleo = new Mesh(new CircleGeometry(0.035, 20), matTapa)
    nucleo.position.x = 0.211
    nucleo.rotation.y = Math.PI / 2
    const nucleo2 = nucleo.clone()
    nucleo2.position.x = -0.211
    nucleo2.rotation.y = -Math.PI / 2
    g.add(rollo, nucleo, nucleo2)
    return g
  }

  // Dónde acaba cada cosa y cuándo cae. `grupo` es el material de la leyenda.
  const SACO = 0.13
  const cosas: { pieza: Object3D; x: number; y: number; z: number; giro: number; cae: number; grupo: number }[] = [
    { pieza: saco(), x: -0.29, y: ALTO_PALE + SACO / 2, z: -0.25, giro: 0, cae: 0.3, grupo: 0 },
    { pieza: saco(), x: -0.29, y: ALTO_PALE + SACO / 2, z: 0.2, giro: 0, cae: 0.85, grupo: 0 },
    { pieza: saco(), x: -0.29, y: ALTO_PALE + SACO * 1.5, z: -0.02, giro: Math.PI / 2, cae: 1.4, grupo: 0 },
    { pieza: rollo(), x: 0.3, y: ALTO_PALE + 0.43, z: -0.3, giro: 0, cae: 2.1, grupo: 1 },
    { pieza: rollo(), x: 0.42, y: ALTO_PALE + 0.43, z: 0.02, giro: 1, cae: 2.6, grupo: 1 },
    { pieza: cubo(), x: -0.36, y: ALTO_PALE + SACO * 2 + 0.15, z: -0.15, giro: 0, cae: 3.4, grupo: 2 },
    { pieza: cubo(), x: -0.12, y: ALTO_PALE + SACO * 2 + 0.15, z: 0.16, giro: 2, cae: 3.95, grupo: 2 },
    { pieza: bobina(), x: 0.2, y: ALTO_PALE + 0.1, z: 0.36, giro: 0.15, cae: 4.8, grupo: 3 },
  ]
  for (const c of cosas) carga.add(c.pieza)

  // --- Leyenda ---
  const pasos = [...raiz.querySelectorAll<HTMLElement>('[data-paso]')]
  const llegadas = [0, 1, 2, 3].map((g) => {
    const delGrupo = cosas.filter((c) => c.grupo === g)
    return [delGrupo[0].cae, delGrupo.at(-1)!.cae + CAIDA + 0.5] as const
  })
  let marcado = -2

  e.alPintar((t) => {
    const c = t % VUELTA
    cosas.forEach((cosa, i) => {
      // Cae con salida exponencial (encaja sin rebotar) y, al vaciar, se va hacia arriba en orden inverso
      const f = tramo(c, cosa.cae, cosa.cae + CAIDA)
      const cae = 1 - (1 - f) ** 3
      const sale = suave(tramo(c, VACIA + (cosas.length - 1 - i) * 0.1, VACIA + (cosas.length - 1 - i) * 0.1 + 0.7))
      cosa.pieza.visible = f > 0 && sale < 1
      cosa.pieza.position.set(cosa.x, cosa.y + 1.5 * (1 - cae) + 1.2 * sale, cosa.z)
      cosa.pieza.rotation.y = cosa.giro + (1 - cae) * 0.6
      cosa.pieza.scale.setScalar(Math.max(0.001, 1 - sale))
    })
    // Lleno, el palé da una vuelta entera
    carga.rotation.y = suave(tramo(c, ...GIRO)) * Math.PI * 2

    const activo = llegadas.findIndex(([a, b]) => c >= a && c < b)
    if (activo !== marcado) {
      marcado = activo
      pasos.forEach((p, i) => (i === activo ? p.setAttribute('aria-current', 'step') : p.removeAttribute('aria-current')))
    }
  })

  return e
}

