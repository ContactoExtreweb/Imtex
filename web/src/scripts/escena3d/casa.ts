// «Una casa que deja de filtrar»: una vivienda en corte (sin la fachada de delante), con su terraza,
// un garaje abajo y una piscina al lado. Sola y en bucle:
// 1. Terraza: llueve, el agua cala, sale una mancha en la pared del salón y gotea junto a la fachada. Se aplica la membrana
//    con el rodillo y deja de gotear; la mancha se seca.
// 2. Piscina: el vaso se forra con la lámina y se llena de agua.
// 3. Garaje: el suelo se cubre de resina y queda con brillo.
// Al final todo vuelve atrás y empieza otra vez. La leyenda (particulares.astro) marca la parte de cada momento.

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  type Material,
} from 'three'
import { crearEscena } from './base'
import { azar, lienzo2d, pintarGrano, pintarHormigon, pintarPunto, suave, tramo } from './texturas'

// --- Medidas. La solera de la parcela tiene la cara de arriba en y = 0 ---
const SOLERA = { x0: -1.9, x1: 3.15, z0: -1.25, z1: 1.25, canto: 0.55 }
const CASA = { x0: -1.65, x1: 1.0, z0: -1.0, z1: 1.0 }
const PLANTA = 1.0 // alto de cada planta
const FORJADO = 0.1
const MURO = 0.12
const TECHO = 2 * PLANTA // cara de arriba de la terraza
const PETO = 0.22
const VASO = { x0: 1.5, x1: 2.85, z0: -0.75, z1: 0.75, fondo: 0.5 }
const GOTERA = new Vector3(-1.05, PLANTA + PLANTA - FORJADO / 2, 0.45)

// --- Tiempos ---
const TRAMOS = [
  [0, 8.6],
  [8.6, 12.2],
  [12.2, 15.4],
] as const
const VUELVE = [17.2, 18.1] as const
const VUELTA = 18.6

const ENCUADRES = [
  [new Vector3(1.7, 3.2, 5.7), new Vector3(-0.3, 1.45, 0)], // terraza y salón
  [new Vector3(3.4, 4.95, 6.2), new Vector3(0.75, 0.6, 0)], // piscina, con la casa entera al lado
  [new Vector3(0.95, 2.0, 6.1), new Vector3(-0.3, 0.7, 0.1)], // garaje, sin cortar la planta de arriba
  [new Vector3(3.1, 3.7, 6.3), new Vector3(0.55, 0.9, 0)], // la casa entera
] as const

export function montar(lienzo: HTMLCanvasElement, { raiz }: { raiz: HTMLElement }) {
  const rnd = azar(1999)
  const e = crearEscena(lienzo, { suelo: -SOLERA.canto, alcanceSombra: 4, apertura: 32, anchoMinimo: 1.2, giroMaximo: 0.6 })
  const { escena, sombra, movil } = e

  const grano = new CanvasTexture(pintarGrano(256, rnd))
  grano.wrapS = grano.wrapT = RepeatWrapping
  grano.repeat.set(3, 3)
  const textura = (l: HTMLCanvasElement) => {
    const t = new CanvasTexture(l)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    return t
  }
  const matHormigon = new MeshStandardMaterial({ map: textura(pintarHormigon(512, 512, rnd, 140)), roughness: 0.93, bumpMap: grano, bumpScale: 1.4 })
  const matEnlucido = new MeshStandardMaterial({ color: '#e4e1d9', roughness: 0.9, bumpMap: grano, bumpScale: 0.5 })
  const matSuelo = new MeshStandardMaterial({ color: '#b9b2a6', roughness: 0.8 })
  const matOscuro = new MeshStandardMaterial({ color: '#2b2d34', roughness: 0.6 })
  const matRojo = new MeshStandardMaterial({ color: '#ff311e', roughness: 0.5 })

  const caja = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, material: Material | Material[], recibe = true) => {
    const m = sombra(new Mesh(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material), recibe)
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    escena.add(m)
    return m
  }

  // --- Solera de la parcela, con el hueco del vaso de la piscina ---
  const y0 = -SOLERA.canto
  caja(SOLERA.x0, VASO.x0, y0, 0, SOLERA.z0, SOLERA.z1, matHormigon)
  caja(VASO.x1, SOLERA.x1, y0, 0, SOLERA.z0, SOLERA.z1, matHormigon)
  caja(VASO.x0, VASO.x1, y0, 0, SOLERA.z0, VASO.z0, matHormigon)
  caja(VASO.x0, VASO.x1, y0, 0, VASO.z1, SOLERA.z1, matHormigon)
  caja(VASO.x0, VASO.x1, y0, -VASO.fondo, VASO.z0, VASO.z1, matHormigon)

  // --- Casa en corte: muros de fondo y laterales, dos forjados y la terraza con su peto ---
  const { x0, x1, z0, z1 } = CASA
  caja(x0, x1, 0, FORJADO * 0.6, z0, z1, matSuelo) // suelo del garaje
  caja(x0, x0 + MURO, 0, TECHO, z0, z1, matEnlucido)
  caja(x1 - MURO, x1, 0, TECHO, z0, z1, matEnlucido)
  caja(x0, x1, 0, TECHO, z0, z0 + MURO, matEnlucido)
  caja(x0, x1, PLANTA - FORJADO, PLANTA, z0, z1, [matHormigon, matHormigon, matSuelo, matHormigon, matHormigon, matHormigon])
  caja(x0, x1, TECHO - FORJADO, TECHO, z0, z1, matHormigon)
  // Peto de la terraza
  caja(x0, x1, TECHO, TECHO + PETO, z0, z0 + MURO * 0.8, matEnlucido)
  caja(x0, x0 + MURO * 0.8, TECHO, TECHO + PETO, z0, z1, matEnlucido)
  caja(x1 - MURO * 0.8, x1, TECHO, TECHO + PETO, z0, z1, matEnlucido)
  caja(x0, x1, TECHO, TECHO + PETO * 0.45, z1 - MURO * 0.8, z1, matEnlucido)
  // Ventana del salón y puerta del garaje, en el lateral derecho
  caja(x1 - 0.005, x1 + 0.01, PLANTA + 0.3, PLANTA + 0.75, -0.45, 0.25, matOscuro, false)
  caja(x1 - 0.005, x1 + 0.01, FORJADO, PLANTA - FORJADO - 0.05, -0.7, 0.55, matOscuro, false)

  // Salón: un sofá. Garaje: un coche.
  {
    const matSofa = new MeshStandardMaterial({ color: '#5b6273', roughness: 0.9 })
    caja(-1.4, -0.35, PLANTA, PLANTA + 0.22, -0.85, -0.45, matSofa)
    caja(-1.4, -0.35, PLANTA, PLANTA + 0.45, -0.88, -0.74, matSofa)
    const coche = new Group()
    const matCoche = new MeshPhysicalMaterial({ color: '#8f97a6', roughness: 0.3, metalness: 0.4, clearcoat: 1 })
    const chasis = sombra(new Mesh(new BoxGeometry(1.25, 0.24, 0.62), matCoche))
    chasis.position.y = 0.22
    const cabina = sombra(new Mesh(new BoxGeometry(0.66, 0.22, 0.56), matCoche))
    cabina.position.set(-0.05, 0.45, 0)
    const lunas = new Mesh(new BoxGeometry(0.68, 0.16, 0.57), new MeshPhysicalMaterial({ color: '#1d2129', roughness: 0.05, metalness: 0.2 }))
    lunas.position.set(-0.05, 0.46, 0)
    coche.add(chasis, cabina, lunas)
    for (const [x, z] of [
      [-0.4, 0.31],
      [0.4, 0.31],
      [-0.4, -0.31],
      [0.4, -0.31],
    ]) {
      const rueda = sombra(new Mesh(new CylinderGeometry(0.12, 0.12, 0.08, 20), matOscuro), false)
      rueda.rotation.x = Math.PI / 2
      rueda.position.set(x, 0.12, z)
      coche.add(rueda)
    }
    coche.position.set(-0.3, 0.06, 0.15)
    escena.add(coche)
  }

  // ---------------------------------------------------------------------------------------------
  // 1. Terraza: lluvia, mancha y goteo; membrana con el rodillo
  // ---------------------------------------------------------------------------------------------
  const punto = pintarPunto()
  const N_LLUVIA = movil ? 110 : 190
  const geoLluvia = new BufferGeometry()
  geoLluvia.setAttribute('position', new BufferAttribute(new Float32Array(N_LLUVIA * 3), 3))
  const semillas = Float32Array.from({ length: N_LLUVIA * 3 }, () => rnd())
  const lluvia = new Points(geoLluvia, new PointsMaterial({ color: '#dbe8f7', size: 0.075, map: punto, transparent: true, opacity: 0.8, depthWrite: false }))
  lluvia.frustumCulled = false
  escena.add(lluvia)
  const posLluvia = geoLluvia.attributes.position as BufferAttribute

  // Mancha de humedad que baja por la pared lateral del salón (la que se ve desde la cámara), y charco en el suelo
  const [lMancha, cMancha] = lienzo2d(128, 128)
  const gMancha = cMancha.createRadialGradient(64, 64, 4, 64, 64, 62)
  gMancha.addColorStop(0, 'rgba(70,58,40,0.85)')
  gMancha.addColorStop(0.7, 'rgba(90,76,52,0.55)')
  gMancha.addColorStop(1, 'rgba(90,76,52,0)')
  cMancha.fillStyle = gMancha
  cMancha.fillRect(0, 0, 128, 128)
  const geoMancha = new PlaneGeometry(0.75, 0.8)
  geoMancha.translate(0, -0.4, 0)
  const mancha = new Mesh(geoMancha, new MeshStandardMaterial({ map: new CanvasTexture(lMancha), transparent: true, depthWrite: false, roughness: 1 }))
  mancha.rotation.y = Math.PI / 2
  mancha.position.set(x0 + MURO + 0.004, TECHO - FORJADO, GOTERA.z)
  escena.add(mancha)
  const matAgua = new MeshPhysicalMaterial({ color: '#9fb6cc', roughness: 0.05, transparent: true, opacity: 0.6, clearcoat: 1, depthWrite: false })
  const charco = new Mesh(new CircleGeometry(0.42, 32), matAgua)
  charco.rotation.x = -Math.PI / 2
  charco.position.set(GOTERA.x, PLANTA + 0.004, GOTERA.z)
  escena.add(charco)
  const gotas = [0, 1, 2].map(() => {
    const g = new Mesh(new SphereGeometry(0.042, 12, 10), matAgua)
    g.scale.y = 1.4
    escena.add(g)
    return g
  })

  // Membrana roja sobre la terraza, de atrás hacia delante
  const matMembrana = new MeshStandardMaterial({ color: '#f0321d', roughness: 0.75, bumpMap: grano, bumpScale: 0.8 })
  const ANCHO_TERRAZA = x1 - x0 - MURO * 1.6
  const FONDO_TERRAZA = z1 - z0 - MURO * 1.6
  const geoMembrana = new PlaneGeometry(ANCHO_TERRAZA, 1)
  geoMembrana.rotateX(-Math.PI / 2)
  geoMembrana.translate(0, 0, 0.5)
  const membrana = new Mesh(geoMembrana, matMembrana)
  membrana.position.set((x0 + x1) / 2, TECHO + 0.006, z0 + MURO * 0.8)
  membrana.receiveShadow = true
  escena.add(membrana)
  const rodillo = new Group()
  {
    const manguito = sombra(new Mesh(new CylinderGeometry(0.06, 0.06, 0.5, 18), matRojo), false)
    manguito.rotation.z = Math.PI / 2
    manguito.position.y = 0.06
    const palo = sombra(new Mesh(new CylinderGeometry(0.015, 0.015, 1.2, 8), matOscuro), false)
    palo.rotation.x = -0.75
    palo.position.set(0, 0.5, 0.42)
    rodillo.add(manguito, palo)
    escena.add(rodillo)
  }

  // ---------------------------------------------------------------------------------------------
  // 2. Piscina: lámina de PVC en el vaso y agua
  // ---------------------------------------------------------------------------------------------
  const [lLiner, cLiner] = lienzo2d(256, 256)
  cLiner.fillStyle = '#2f86b3'
  cLiner.fillRect(0, 0, 256, 256)
  cLiner.strokeStyle = 'rgba(255,255,255,0.12)'
  for (let i = 0; i <= 256; i += 32) {
    cLiner.beginPath()
    cLiner.moveTo(i, 0)
    cLiner.lineTo(i, 256)
    cLiner.moveTo(0, i)
    cLiner.lineTo(256, i)
    cLiner.stroke()
  }
  const matLiner = new MeshStandardMaterial({ map: textura(lLiner), roughness: 0.45 })
  const anchoVaso = VASO.x1 - VASO.x0
  const fondoVaso = VASO.z1 - VASO.z0
  const cx = (VASO.x0 + VASO.x1) / 2
  const cz = (VASO.z0 + VASO.z1) / 2
  // Las paredes del forro crecen de abajo arriba
  const pared = (ancho: number, x: number, z: number, giro: number) => {
    const g = new PlaneGeometry(ancho, 1)
    g.translate(0, 0.5, 0)
    const m = new Mesh(g, matLiner)
    m.position.set(x, -VASO.fondo, z)
    m.rotation.y = giro
    m.receiveShadow = true
    escena.add(m)
    return m
  }
  const paredes = [
    pared(anchoVaso, cx, VASO.z0 + 0.003, 0),
    pared(anchoVaso, cx, VASO.z1 - 0.003, Math.PI),
    pared(fondoVaso, VASO.x0 + 0.003, cz, Math.PI / 2),
    pared(fondoVaso, VASO.x1 - 0.003, cz, -Math.PI / 2),
  ]
  const suelaLiner = new Mesh(new PlaneGeometry(anchoVaso, fondoVaso), matLiner)
  suelaLiner.rotation.x = -Math.PI / 2
  suelaLiner.position.set(cx, -VASO.fondo + 0.003, cz)
  escena.add(suelaLiner)
  const agua = new Mesh(
    new BoxGeometry(anchoVaso - 0.01, 1, fondoVaso - 0.01),
    new MeshPhysicalMaterial({ color: '#4fb3d9', roughness: 0.04, transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false }),
  )
  escena.add(agua)

  // ---------------------------------------------------------------------------------------------
  // 3. Garaje: resina con brillo, de dentro hacia fuera
  // ---------------------------------------------------------------------------------------------
  const matResina = new MeshPhysicalMaterial({ color: '#69707f', roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 })
  const geoResina = new PlaneGeometry(x1 - x0 - MURO * 2, 1)
  geoResina.rotateX(-Math.PI / 2)
  geoResina.translate(0, 0, 0.5)
  const resina = new Mesh(geoResina, matResina)
  resina.position.set((x0 + x1) / 2, FORJADO * 0.6 + 0.004, z0 + MURO)
  resina.receiveShadow = true
  escena.add(resina)

  // ---------------------------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------------------------
  function aplicar(c: number, t: number) {
    const vuelve = 1 - suave(tramo(c, ...VUELVE))

    // Lluvia: hasta que se termina la terraza
    const llueve = 1 - tramo(c, 8.0, 8.6)
    lluvia.visible = llueve > 0
    ;(lluvia.material as PointsMaterial).opacity = 0.8 * llueve
    for (let i = 0; i < N_LLUVIA; i++) {
      const x = SOLERA.x0 + semillas[i * 3] * (SOLERA.x1 - SOLERA.x0)
      const z = SOLERA.z0 + semillas[i * 3 + 1] * (SOLERA.z1 - SOLERA.z0)
      const suelo = x > x0 && x < x1 && z > z0 && z < z1 ? TECHO : 0
      const alto = 3.6 - suelo
      const y = suelo + alto * (1 - ((t * 1.1 + semillas[i * 3 + 2]) % 1))
      posLluvia.setXYZ(i, x, y, z)
    }
    posLluvia.needsUpdate = true

    // Membrana con el rodillo, de 4,6 a 7,6 s
    const avMembrana = suave(tramo(c, 4.6, 7.6)) * vuelve
    membrana.visible = avMembrana > 0.001
    membrana.scale.z = Math.max(0.001, FONDO_TERRAZA * avMembrana)
    rodillo.visible = c > 4.4 && c < 7.9
    rodillo.position.set((x0 + x1) / 2 + Math.sin(t * 3.2) * (ANCHO_TERRAZA / 2 - 0.3), TECHO, z0 + MURO * 0.8 + FONDO_TERRAZA * avMembrana)

    // La humedad: crece hasta que la membrana cubre y luego se seca
    const cala = suave(tramo(c, 0.8, 4.2)) * (1 - suave(tramo(c, 7.0, 8.6))) * vuelve
    mancha.visible = cala > 0.01
    // La mancha baja por la pared y se ensancha
    mancha.scale.set(Math.max(0.001, 0.4 + 0.6 * cala), Math.max(0.001, cala), 1)
    charco.visible = cala > 0.01
    charco.scale.setScalar(Math.max(0.001, cala))
    const gotea = c > 1.6 && c < 7.2
    gotas.forEach((g, i) => {
      const f = (t * 1.3 + i / 3) % 1
      g.visible = gotea
      g.position.set(GOTERA.x + (i - 1) * 0.04, GOTERA.y - FORJADO / 2 - f * (PLANTA - FORJADO), GOTERA.z + (i - 1) * 0.03)
    })

    // Piscina: el forro sube por las paredes y luego entra el agua
    const forro = suave(tramo(c, 8.9, 10.0)) * vuelve
    suelaLiner.visible = forro > 0.001
    paredes.forEach((p) => {
      p.visible = forro > 0.001
      p.scale.y = Math.max(0.001, VASO.fondo * forro)
    })
    const llena = suave(tramo(c, 10.0, 11.9)) * vuelve
    agua.visible = llena > 0.001
    const nivel = (VASO.fondo - 0.07) * llena
    agua.scale.y = Math.max(0.001, nivel)
    agua.position.set(cx, -VASO.fondo + nivel / 2, cz)

    // Garaje: la resina avanza desde el fondo
    const avResina = suave(tramo(c, 12.5, 14.6)) * vuelve
    resina.visible = avResina > 0.001
    resina.scale.z = Math.max(0.001, (z1 - z0 - MURO) * avResina)
  }

  // --- Cámara y leyenda ---
  const tramoActivo = (c: number) => TRAMOS.findIndex(([a, b]) => c >= a && c < b)
  function encuadrar(c: number) {
    const i = tramoActivo(c)
    let desde = 3
    let hasta = 0
    let f = 1
    if (i >= 0) {
      desde = i === 0 ? 3 : i - 1
      hasta = i
      f = suave(tramo(c, TRAMOS[i][0], TRAMOS[i][0] + 1.2))
    } else {
      desde = 2
      hasta = 3
      f = suave(tramo(c, TRAMOS[2][1], TRAMOS[2][1] + 1.3))
    }
    e.encuadre.pos.lerpVectors(ENCUADRES[desde][0], ENCUADRES[hasta][0], f)
    e.encuadre.mira.lerpVectors(ENCUADRES[desde][1], ENCUADRES[hasta][1], f)
  }
  const pasos = [...raiz.querySelectorAll<HTMLElement>('[data-paso]')]
  let marcado = -2

  e.alPintar((t) => {
    const c = t % VUELTA
    aplicar(c, t)
    encuadrar(c)
    const activo = tramoActivo(c)
    if (activo !== marcado) {
      marcado = activo
      pasos.forEach((p, i) => (i === activo ? p.setAttribute('aria-current', 'step') : p.removeAttribute('aria-current')))
    }
  })

  return e
}
