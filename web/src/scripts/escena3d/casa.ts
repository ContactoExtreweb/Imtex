// «Una casa que deja de filtrar»: una vivienda en corte (sin la fachada de delante), con su terraza,
// un garaje abajo y una piscina al lado. Sola y en bucle:
// 1. Terraza: llueve, el agua cala, sale una mancha en la pared del salón y gotea junto a la fachada. Se aplica la membrana
//    con el rodillo y deja de gotear; la mancha se seca.
// 2. Piscina: el vaso se forra con la lámina y se llena de agua.
// 3. Garaje: el suelo se cubre de resina y queda con brillo.
// Al final todo vuelve atrás y empieza otra vez. La leyenda (particulares.astro) marca la parte de cada momento.
// Materiales escaneados, luz de un cielo real y la ventana y la puerta del garaje son modelos reales (escena3d/real.ts).
// El coche vuelve cuando haya un modelo realista (docs/ESTADO.md).

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  type Material,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { crearEscena } from './base'
import { materialReal, modelo, ponerCielo, uvMundo } from './real'
import { azar, lienzo2d, pintarGrano, pintarOndas, suave, tramo } from './texturas'

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
  const e = crearEscena(lienzo, { suelo: -SOLERA.canto, alcanceSombra: 4, apertura: 32, anchoMinimo: 1.2, giroMaximo: 0.6, oclusion: 0.6 })
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
  ponerCielo(e.renderizador, escena)
  // Tamaños de las texturas en unidades de la escena (una planta = 1 = 3 m)
  const matHormigon = materialReal('concrete_floor_02', 0.7)
  // Enfoscado pintado de blanco: una pared así es casi lisa; el realismo lo da la luz, no la textura
  const matEnlucido = new MeshStandardMaterial({ color: '#ecebe6', roughness: 0.92, bumpMap: grano, bumpScale: 0.4 })
  const matBarro = materialReal('terracotta_floor_tiles', 0.9)
  const matPiedra = materialReal('concrete_floor_02', 0.7, { color: '#f3eee4' })
  const matOscuro = new MeshStandardMaterial({ color: '#2b2d34', roughness: 0.6 })

  const caja = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, material: Material | Material[], recibe = true) => {
    const geo = new BoxGeometry(x1 - x0, y1 - y0, z1 - z0)
    const m = sombra(new Mesh(geo, material), recibe)
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    uvMundo(geo, m.position)
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
  caja(x0, x0 + MURO, 0, TECHO, z0, z1, matEnlucido)
  caja(x1 - MURO, x1, 0, TECHO, z0, z1, matEnlucido)
  caja(x0 + MURO, x1 - MURO, 0, TECHO, z0, z0 + MURO, matEnlucido)
  // Suelos y forjados entre los muros, sin llegar a la fachada: si sus caras coinciden con las del muro,
  // la tarjeta gráfica pinta a ratos una y a ratos otra y parece que el suelo atraviesa la pared
  const [i0, i1, f0] = [x0 + MURO, x1 - MURO, z0 + MURO]
  caja(i0, i1, 0, FORJADO * 0.6, f0, z1, matHormigon) // suelo del garaje
  // Forjados: hormigón en el corte, barro cocido encima (el suelo del salón y el de la terraza)
  const forjado = [matHormigon, matHormigon, matBarro, matHormigon, matHormigon, matHormigon]
  caja(i0, i1, PLANTA - FORJADO, PLANTA, f0, z1, forjado)
  caja(i0, i1, TECHO - FORJADO, TECHO, f0, z1, forjado)
  // Peto de la terraza, con su albardilla de piedra que vuela un poco a cada lado
  const peto = (a0: number, a1: number, b0: number, b1: number, alto: number) => {
    caja(a0, a1, TECHO, TECHO + alto, b0, b1, matEnlucido)
    caja(a0 - 0.02, a1 + 0.02, TECHO + alto, TECHO + alto + 0.03, b0 - 0.02, b1 + 0.02, matPiedra)
  }
  peto(x0, x1, z0, z0 + MURO * 0.8, PETO)
  peto(x0, x0 + MURO * 0.8, z0 + MURO * 0.8 + 0.02, z1, PETO)
  peto(x1 - MURO * 0.8, x1, z0 + MURO * 0.8 + 0.02, z1, PETO)
  peto(x0 + MURO * 0.8 + 0.02, x1 - MURO * 0.8 - 0.02, z1 - MURO * 0.8, z1, PETO * 0.45)

  // Ventanas con persiana y puerta del garaje: modelos escaneados, a escala. La persiana va a haces del muro
  // y el cajón y las guías sobresalen; a media profundidad, que en el modelo salen 30 cm.
  const sobreMuro = (m: Group, x: number, y: number, z: number, ancho: number, alto: number, giro: number) => {
    m.scale.set(ancho, alto, 1 / 6)
    m.rotation.y = giro
    m.position.set(x, y, z)
    escena.add(m)
  }
  modelo('rollershutter_window_01', (m) => {
    sobreMuro(m, x1 + 0.002, PLANTA + 0.14, -0.15, 1 / 3, 1 / 3, Math.PI / 2)
    // Otra en el muro del fondo del salón, encima del sofá, vista desde dentro
    sobreMuro(m.clone(), -0.88, PLANTA + 0.38, z0 + MURO + 0.002, 0.3, 0.26, 0)
  })
  // La puerta del modelo mide 1,08 × 2,4 m: se ensancha a una de garaje de 2,4 × 2,2 m
  modelo('rollershutter_door', (m) => sobreMuro(m, x1 + 0.002, FORJADO * 0.6, 0.05, 0.74, 0.3, Math.PI / 2))

  // Detalles de obra: rodapié en el salón, puerta de paso al fondo del garaje y bajante de la terraza
  {
    const matBlanco = new MeshStandardMaterial({ color: '#f2f1ee', roughness: 0.5 })
    caja(x0 + MURO, x1 - MURO, PLANTA, PLANTA + 0.028, z0 + MURO, z0 + MURO + 0.008, matBlanco)
    caja(x0 + MURO, x0 + MURO + 0.008, PLANTA, PLANTA + 0.028, z0 + MURO, z1, matBlanco)
    // Puerta de madera de 0,9 × 2 m con su marco
    const suelo = FORJADO * 0.6
    const [p0, p1] = [-0.35, -0.05]
    const matMadera = new MeshStandardMaterial({ color: '#7a5a3c', roughness: 0.55, bumpMap: grano, bumpScale: 0.3 })
    caja(p0, p1, suelo, suelo + 0.67, z0 + MURO, z0 + MURO + 0.012, matMadera)
    caja(p0 - 0.02, p0, suelo, suelo + 0.69, z0 + MURO, z0 + MURO + 0.02, matBlanco)
    caja(p1, p1 + 0.02, suelo, suelo + 0.69, z0 + MURO, z0 + MURO + 0.02, matBlanco)
    caja(p0 - 0.02, p1 + 0.02, suelo + 0.67, suelo + 0.69, z0 + MURO, z0 + MURO + 0.02, matBlanco)
    const matMetal = new MeshStandardMaterial({ color: '#c8ccd2', metalness: 1, roughness: 0.3 })
    const manilla = sombra(new Mesh(new CylinderGeometry(0.006, 0.006, 0.05, 8), matMetal), false)
    manilla.rotation.z = Math.PI / 2
    manilla.position.set(p1 - 0.04, suelo + 0.33, z0 + MURO + 0.025)
    escena.add(manilla)
    // Bajante de PVC en la esquina de la fachada, desde la terraza hasta el suelo
    const matPvc = new MeshStandardMaterial({ color: '#8f949c', roughness: 0.45 })
    const bajante = sombra(new Mesh(new CylinderGeometry(0.022, 0.022, TECHO + 0.06, 14), matPvc))
    bajante.position.set(x1 + 0.03, (TECHO + 0.06) / 2, z1 - 0.09)
    escena.add(bajante)
  }

  // Salón: un sofá tapizado
  {
    const matTela = new MeshStandardMaterial({ color: '#59606e', roughness: 1, bumpMap: grano, bumpScale: 0.6 })
    const cojin = (ancho: number, alto: number, fondo: number, x: number, y: number, z: number) => {
      const m = sombra(new Mesh(new RoundedBoxGeometry(ancho, alto, fondo, 3, 0.025), matTela))
      m.position.set(x, PLANTA + y, z)
      escena.add(m)
    }
    cojin(0.9, 0.1, 0.32, -0.88, 0.09, -0.66) // asiento
    cojin(0.9, 0.24, 0.1, -0.88, 0.2, -0.84) // respaldo
    cojin(0.08, 0.17, 0.4, -1.37, 0.085, -0.68) // brazos
    cojin(0.08, 0.17, 0.4, -0.39, 0.085, -0.68)
  }

  // ---------------------------------------------------------------------------------------------
  // 1. Terraza: lluvia, mancha y goteo; membrana con el rodillo
  // ---------------------------------------------------------------------------------------------
  // Lluvia: trazos finos e inclinados por el viento, como se ve la lluvia de verdad
  const N_LLUVIA = movil ? 160 : 280
  const geoLluvia = new BufferGeometry()
  geoLluvia.setAttribute('position', new BufferAttribute(new Float32Array(N_LLUVIA * 6), 3))
  const semillas = Float32Array.from({ length: N_LLUVIA * 3 }, () => rnd())
  const lluvia = new LineSegments(geoLluvia, new LineBasicMaterial({ color: '#cfdbea', transparent: true, opacity: 0.6, depthWrite: false }))
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
  const matMembrana = new MeshStandardMaterial({ color: '#e5341f', roughness: 0.45, bumpMap: grano, bumpScale: 0.8 })
  const ANCHO_TERRAZA = x1 - x0 - MURO * 1.6
  const FONDO_TERRAZA = z1 - z0 - MURO * 1.6
  const geoMembrana = new PlaneGeometry(ANCHO_TERRAZA, 1)
  geoMembrana.rotateX(-Math.PI / 2)
  geoMembrana.translate(0, 0, 0.5)
  const membrana = new Mesh(geoMembrana, matMembrana)
  membrana.position.set((x0 + x1) / 2, TECHO + 0.006, z0 + MURO * 0.8)
  membrana.receiveShadow = true
  escena.add(membrana)
  // Rodillo: funda de pelo empapada, armadura de alambre y alargador
  const rodillo = new Group()
  {
    const funda = sombra(new Mesh(new CylinderGeometry(0.05, 0.05, 0.42, 20), new MeshStandardMaterial({ color: '#d63a26', roughness: 1, bumpMap: grano, bumpScale: 3 })), false)
    funda.rotation.z = Math.PI / 2
    funda.position.y = 0.05
    const alambre = new CatmullRomCurve3([new Vector3(0.21, 0.05, 0), new Vector3(0.26, 0.05, 0), new Vector3(0.26, 0.11, 0.05), new Vector3(0, 0.17, 0.13)])
    const armadura = sombra(new Mesh(new TubeGeometry(alambre, 24, 0.007, 6), new MeshStandardMaterial({ color: '#c3c8cf', metalness: 1, roughness: 0.35 })), false)
    // El alargador sube desde la armadura hacia el lado sin pintar
    const palo = sombra(new Mesh(new CylinderGeometry(0.013, 0.013, 0.7, 10), matOscuro), false)
    palo.rotation.x = 0.93
    palo.position.set(0, 0.17 + 0.35 * 0.6, 0.13 + 0.35 * 0.8)
    rodillo.add(funda, armadura, palo)
    escena.add(rodillo)
  }

  // ---------------------------------------------------------------------------------------------
  // 2. Piscina: lámina de PVC en el vaso y agua
  // ---------------------------------------------------------------------------------------------
  // Lámina armada con estampado de gresite: teselas de 5 cm en azules que varían un poco
  const [lLiner, cLiner] = lienzo2d(256, 256)
  cLiner.fillStyle = '#d9e6ea'
  cLiner.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 256; y += 16)
    for (let x = 0; x < 256; x += 16) {
      const l = 40 + rnd() * 14
      cLiner.fillStyle = `hsl(${196 + rnd() * 10} 62% ${l}%)`
      cLiner.fillRect(x + 1, y + 1, 14, 14)
    }
  const anchoVaso = VASO.x1 - VASO.x0
  const fondoVaso = VASO.z1 - VASO.z0
  const cx = (VASO.x0 + VASO.x1) / 2
  const cz = (VASO.z0 + VASO.z1) / 2
  // 16 teselas por textura, de 5 cm (0,0167 unidades): las paredes miden lo que el fondo del vaso
  const gresite = (ancho: number, alto: number) => {
    const t = textura(lLiner)
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(ancho / 0.27, alto / 0.27)
    return new MeshStandardMaterial({ map: t, roughness: 0.3 })
  }
  const matLiner = gresite(anchoVaso, fondoVaso)
  const matPared = gresite(anchoVaso, VASO.fondo)
  // Coronación del vaso: piedra que vuela un poco sobre el agua
  const borde = 0.09
  caja(VASO.x0 - borde, VASO.x1 + borde, 0, 0.025, VASO.z0 - borde, VASO.z0 + 0.02, matPiedra)
  caja(VASO.x0 - borde, VASO.x1 + borde, 0, 0.025, VASO.z1 - 0.02, VASO.z1 + borde, matPiedra)
  caja(VASO.x0 - borde, VASO.x0 + 0.02, 0, 0.025, VASO.z0 + 0.02, VASO.z1 - 0.02, matPiedra)
  caja(VASO.x1 - 0.02, VASO.x1 + borde, 0, 0.025, VASO.z0 + 0.02, VASO.z1 - 0.02, matPiedra)
  // Las paredes del forro crecen de abajo arriba
  const pared = (ancho: number, x: number, z: number, giro: number) => {
    const g = new PlaneGeometry(ancho, 1)
    g.translate(0, 0.5, 0)
    const m = new Mesh(g, matPared)
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
  // Agua de verdad: transparente, con refracción, algo de turquesa en lo hondo y ondas que se mueven despacio
  const ondas = new CanvasTexture(pintarOndas(256))
  ondas.wrapS = ondas.wrapT = RepeatWrapping
  ondas.repeat.set(1.5, 1.5)
  const agua = new Mesh(
    new BoxGeometry(anchoVaso - 0.01, 1, fondoVaso - 0.01),
    new MeshPhysicalMaterial({
      color: '#e6f7fa',
      roughness: 0.02,
      transmission: 1,
      thickness: 0.4,
      ior: 1.33,
      attenuationColor: '#2b9cc0',
      attenuationDistance: 1.1,
      normalMap: ondas,
      normalScale: new Vector2(0.3, 0.3),
    }),
  )
  escena.add(agua)

  // ---------------------------------------------------------------------------------------------
  // 3. Garaje: resina con brillo, de dentro hacia fuera
  // ---------------------------------------------------------------------------------------------
  // Dentro del garaje no se ve el cielo: el brillo se queda en la mitad para que no refleje azul
  const matResina = new MeshPhysicalMaterial({ color: '#6f7174', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.08, envMapIntensity: 0.45 })
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
    ;(lluvia.material as LineBasicMaterial).opacity = 0.6 * llueve
    for (let i = 0; i < N_LLUVIA; i++) {
      const x = SOLERA.x0 + semillas[i * 3] * (SOLERA.x1 - SOLERA.x0)
      const z = SOLERA.z0 + semillas[i * 3 + 1] * (SOLERA.z1 - SOLERA.z0)
      const suelo = x > x0 && x < x1 && z > z0 && z < z1 ? TECHO : 0
      const alto = 3.6 - suelo
      const y = suelo + alto * (1 - ((t * 1.6 + semillas[i * 3 + 2]) % 1))
      posLluvia.setXYZ(i * 2, x, y, z)
      posLluvia.setXYZ(i * 2 + 1, x - 0.025, y + 0.16, z - 0.01)
    }
    posLluvia.needsUpdate = true
    ondas.offset.set(t * 0.012, t * 0.007)

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
