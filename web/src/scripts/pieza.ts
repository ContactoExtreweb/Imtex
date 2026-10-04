// La pieza de la portada: una esquina de cubierta de hormigón, con su peto, su sumidero y un tubo,
// que pasa por las seis fases de una obra de IMTEX. En cada fase se ve el trabajo haciéndose:
// la lanza de hidrolimpieza, la llana, el rodillo de imprimación, la pistola de proyección…
// y la cámara cambia de encuadre. Todo es geometría y texturas hechas aquí, sin modelos externos
// (salvo el logo, que se pinta sobre la cubierta terminada).
// Se carga aparte y después del resto de la página; components/Fases.astro decide si el equipo puede con ella.
//
// progreso(p): p va de 0 (hormigón dañado) a 5 (cubierta terminada). El trabajo de cada fase ocurre
// mientras p se acerca a su entero.

import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  PMREMGenerator,
  Points,
  PointsMaterial,
  RepeatWrapping,
  Scene,
  ShadowMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { azar, lienzo2d, mezcla, pintarCorte, pintarGrano, pintarHormigon, pintarPunto, suave, tramo } from './escena3d/texturas'

// --- Medidas (en «metros» de maqueta). La cara de arriba de la losa está en y = 0 ---
const LOSA = { ancho: 5.2, fondo: 3.6, canto: 0.55 }
const PETO = { grueso: 0.28, alto: 0.75 }
// Zona de trabajo: la losa menos lo que ocupan los petos (al fondo y a la izquierda)
const X0 = -LOSA.ancho / 2 + PETO.grueso
const X1 = LOSA.ancho / 2
const Z0 = -LOSA.fondo / 2 + PETO.grueso
const Z1 = LOSA.fondo / 2
const SW = X1 - X0
const SD = Z1 - Z0
const CX = (X0 + X1) / 2
const CZ = (Z0 + Z1) / 2
const MAPA = { w: 1024, h: Math.round((1024 * SD) / SW) }
/** Catetos de la media caña (el chaflán de mortero entre suelo y peto) */
const CANA = 0.085
/** Calles de cada pasada: las del rodillo son estrechas, las de la lanza anchas */
const CALLES = { lanza: 4, imprimacion: 7, membrana: 5, acabado: 6 }

/** De metros de la zona de trabajo a píxeles del mapa */
const px = (x: number) => ((x - X0) / SW) * MAPA.w
const pz = (z: number) => ((z - Z0) / SD) * MAPA.h

// ---------------------------------------------------------------------------------------------
// Texturas pintadas en un canvas
// ---------------------------------------------------------------------------------------------

/** Suciedad de años: manchas de humedad, verdín junto al peto y regueros. Sobre transparente. */
function pintarSuciedad(rnd: () => number) {
  const [l, ctx] = lienzo2d(MAPA.w, MAPA.h)
  const mancha = (x: number, y: number, r: number, rgb: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(${rgb},${a})`)
    g.addColorStop(0.6, `rgba(${rgb},${a * 0.6})`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // Velo general pardo
  ctx.fillStyle = 'rgba(92,80,62,0.22)'
  ctx.fillRect(0, 0, MAPA.w, MAPA.h)
  for (let i = 0; i < 90; i++) mancha(rnd() * MAPA.w, rnd() * MAPA.h, 40 + rnd() * 150, '60,52,40', 0.1 + rnd() * 0.22)
  // Verdín en el encuentro con los petos (arriba y a la izquierda del mapa)
  for (let i = 0; i < 70; i++) mancha(rnd() * MAPA.w, rnd() * 70, 20 + rnd() * 60, '58,74,44', 0.2 + rnd() * 0.3)
  for (let i = 0; i < 50; i++) mancha(rnd() * 70, rnd() * MAPA.h, 20 + rnd() * 60, '58,74,44', 0.2 + rnd() * 0.3)
  // Regueros hacia el sumidero
  ctx.lineCap = 'round'
  for (let i = 0; i < 26; i++) {
    ctx.strokeStyle = `rgba(40,36,30,${0.06 + rnd() * 0.1})`
    ctx.lineWidth = 3 + rnd() * 12
    ctx.beginPath()
    let x = rnd() * MAPA.w
    let y = rnd() * MAPA.h * 0.5
    ctx.moveTo(x, y)
    for (let k = 0; k < 8; k++) {
      x += (px(1.75) - x) * 0.18 + (rnd() - 0.5) * 40
      y += (pz(1.0) - y) * 0.18 + (rnd() - 0.5) * 30
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  return l
}

/** Fisuras: líneas quebradas con ramas, sobre transparente */
function pintarFisuras(rnd: () => number) {
  const [l, ctx] = lienzo2d(MAPA.w, MAPA.h)
  ctx.strokeStyle = 'rgba(28,26,32,0.92)'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const fisura = (x: number, y: number, rumbo: number, largo: number, grosor: number) => {
    ctx.lineWidth = grosor
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let i = 0; i < largo; i++) {
      rumbo += (rnd() - 0.5) * 0.9
      x += Math.cos(rumbo) * 13
      y += Math.sin(rumbo) * 13
      ctx.lineTo(x, y)
      if (grosor > 1.3 && rnd() < 0.13) {
        ctx.stroke()
        fisura(x, y, rumbo + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.6), largo * 0.4, grosor * 0.55)
        ctx.lineWidth = grosor
        ctx.beginPath()
        ctx.moveTo(x, y)
      }
    }
    ctx.stroke()
  }
  for (let i = 0; i < 9; i++) fisura(rnd() * MAPA.w, rnd() * MAPA.h, rnd() * 6.28, 16 + rnd() * 30, 1.6 + rnd() * 2.2)
  return l
}

// ---------------------------------------------------------------------------------------------
// Pasadas: una herramienta recorre la zona de trabajo en calles, de ida y vuelta
// ---------------------------------------------------------------------------------------------

/** Dónde está la herramienta en el avance t (0..1) de una pasada de `calles` calles */
function pasada(t: number, calles: number) {
  const s = Math.min(calles - 1e-4, Math.max(0, t) * calles)
  const calle = Math.floor(s)
  const f = s - calle
  const ida = calle % 2 === 0
  return { calle, ida, f, x: X0 + (ida ? f : 1 - f) * SW, z: Z0 + ((calle + 0.5) * SD) / calles }
}

/** Traza en el canvas lo que la pasada ya ha cubierto (rectángulos por calle) */
function trazarCubierto(ctx: CanvasRenderingContext2D, t: number, calles: number, w: number, h: number) {
  ctx.beginPath()
  if (t <= 0) return
  if (t >= 1) return ctx.rect(0, 0, w, h)
  const { calle, ida, f } = pasada(t, calles)
  const alto = h / calles
  ctx.rect(0, 0, w, alto * calle)
  ctx.rect(ida ? 0 : w * (1 - f), alto * calle, w * f, alto)
}

// ---------------------------------------------------------------------------------------------

export function montarPieza(lienzo: HTMLCanvasElement, opciones: { logo: string }) {
  const rnd = azar(2026)
  const movil = matchMedia('(max-width: 63.99rem)').matches

  const renderizador = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderizador.setPixelRatio(Math.min(devicePixelRatio, movil ? 1.6 : 2))
  renderizador.outputColorSpace = SRGBColorSpace
  renderizador.toneMapping = ACESFilmicToneMapping
  renderizador.toneMappingExposure = 0.98
  renderizador.shadowMap.enabled = true
  renderizador.shadowMap.type = PCFShadowMap
  renderizador.localClippingEnabled = true

  const escena = new Scene()
  const camara = new PerspectiveCamera(32, 1, 0.1, 80)

  // Entorno para los reflejos (imprimación, acabado, agua): una sala de estudio generada, sin descargar nada
  const pmrem = new PMREMGenerator(renderizador)
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  escena.environmentIntensity = 0.5
  pmrem.dispose()

  escena.add(new HemisphereLight('#ffffff', '#6f7686', 0.55))
  const sol = new DirectionalLight('#fff4e6', 2.5)
  sol.position.set(4.5, 7, 3.5)
  sol.castShadow = true
  sol.shadow.mapSize.set(movil ? 1024 : 2048, movil ? 1024 : 2048)
  sol.shadow.camera.left = -5
  sol.shadow.camera.right = 5
  sol.shadow.camera.top = 5
  sol.shadow.camera.bottom = -5
  sol.shadow.camera.far = 30
  sol.shadow.bias = -0.0006
  sol.shadow.normalBias = 0.02
  escena.add(sol)
  const contra = new DirectionalLight('#cfd8ff', 0.7)
  contra.position.set(-5, 3, -4)
  escena.add(contra)

  // Sombra en el «suelo»: lo que ancla la pieza a la página
  const suelo = new Mesh(new PlaneGeometry(26, 26), new ShadowMaterial({ opacity: 0.26 }))
  suelo.rotation.x = -Math.PI / 2
  suelo.position.y = -LOSA.canto - 0.001
  suelo.receiveShadow = true
  escena.add(suelo)

  const sombra = <T extends Mesh>(m: T, recibe = true) => {
    m.castShadow = true
    m.receiveShadow = recibe
    return m
  }

  // --- Materiales de hormigón ---
  const grano = new CanvasTexture(pintarGrano(256, rnd))
  grano.wrapS = grano.wrapT = RepeatWrapping
  grano.repeat.set(5, 3.5)
  const granoFino = new CanvasTexture(pintarGrano(256, rnd, 0.7))
  granoFino.wrapS = granoFino.wrapT = RepeatWrapping
  granoFino.repeat.set(14, 10)
  const texCorte = new CanvasTexture(pintarCorte(1024, 128, rnd))
  texCorte.colorSpace = SRGBColorSpace
  const texPeto = new CanvasTexture(pintarHormigon(1024, 256, rnd, 160))
  texPeto.colorSpace = SRGBColorSpace
  const matCorte = new MeshStandardMaterial({ map: texCorte, roughness: 0.95, bumpMap: grano, bumpScale: 2.2 })
  const matPeto = new MeshStandardMaterial({ map: texPeto, roughness: 0.92, bumpMap: grano, bumpScale: 1.6 })
  const oculta = new MeshStandardMaterial({ visible: false })

  // --- Losa: cantos y fondo (la cara de arriba es la superficie de trabajo, más abajo) ---
  const losa = sombra(new Mesh(new BoxGeometry(LOSA.ancho, LOSA.canto, LOSA.fondo), [matCorte, matCorte, oculta, matCorte, matCorte, matCorte]))
  losa.position.y = -LOSA.canto / 2
  escena.add(losa)

  // --- Petos con su albardilla ---
  const petoFondo = sombra(new Mesh(new BoxGeometry(LOSA.ancho, PETO.alto, PETO.grueso), matPeto))
  petoFondo.position.set(0, PETO.alto / 2, -LOSA.fondo / 2 + PETO.grueso / 2)
  const petoIzq = sombra(new Mesh(new BoxGeometry(PETO.grueso, PETO.alto, SD), matPeto))
  petoIzq.position.set(-LOSA.ancho / 2 + PETO.grueso / 2, PETO.alto / 2, CZ)
  const matAlbardilla = new MeshStandardMaterial({ color: '#d5d8dd', roughness: 0.7, bumpMap: grano, bumpScale: 0.8 })
  const albFondo = sombra(new Mesh(new BoxGeometry(LOSA.ancho + 0.08, 0.06, PETO.grueso + 0.1), matAlbardilla))
  albFondo.position.set(0, PETO.alto + 0.03, petoFondo.position.z)
  const albIzq = sombra(new Mesh(new BoxGeometry(PETO.grueso + 0.1, 0.06, SD + 0.04), matAlbardilla))
  albIzq.position.set(petoIzq.position.x, PETO.alto + 0.03, CZ + 0.02)
  escena.add(petoFondo, petoIzq, albFondo, albIzq)

  // --- Armaduras: se ven en los cajeados y asoman en los cantos ---
  const OXIDO = new Color('#7a3319')
  const PASIVADO = new Color('#7e97b3')
  const matAcero = new MeshStandardMaterial({ color: OXIDO, roughness: 0.8, metalness: 0.4, bumpMap: grano, bumpScale: 3 })
  const barraX = new CylinderGeometry(0.024, 0.024, LOSA.ancho + 0.03, 10)
  barraX.rotateZ(Math.PI / 2)
  const barraZ = new CylinderGeometry(0.02, 0.02, LOSA.fondo + 0.03, 10)
  barraZ.rotateX(Math.PI / 2)
  for (let i = 0; i < 8; i++) {
    const b = new Mesh(barraX, matAcero)
    b.position.set(0, -0.095, Z0 + 0.2 + i * ((SD - 0.4) / 7))
    escena.add(b)
  }
  for (let i = 0; i < 11; i++) {
    const b = new Mesh(barraZ, matAcero)
    b.position.set(X0 + 0.2 + i * ((SW - 0.4) / 10), -0.14, 0)
    escena.add(b)
  }

  // --- Sumidero y tubo pasante: los detalles donde una cubierta suele fallar ---
  const SUMIDERO = new Vector3(1.75, 0, 1.0)
  const matMetal = new MeshStandardMaterial({ color: '#30333a', roughness: 0.45, metalness: 0.85 })
  const aro = new Mesh(new TorusGeometry(0.19, 0.022, 10, 36), matMetal)
  aro.rotation.x = Math.PI / 2
  aro.position.copy(SUMIDERO).setY(0.03)
  const pozo = new Mesh(new CircleGeometry(0.18, 32), new MeshBasicMaterial({ color: '#0d0d10' }))
  pozo.rotation.x = -Math.PI / 2
  pozo.position.copy(SUMIDERO).setY(0.026)
  escena.add(aro, pozo)
  for (let i = -2; i <= 2; i++) {
    const largo = 2 * Math.sqrt(0.19 * 0.19 - (i * 0.07) ** 2)
    const reja = new Mesh(new BoxGeometry(largo, 0.012, 0.016), matMetal)
    reja.position.copy(SUMIDERO).add(new Vector3(0, 0.034, i * 0.07))
    escena.add(reja)
  }
  const TUBO = new Vector3(-1.45, 0, 0.95)
  const tubo = sombra(new Mesh(new CylinderGeometry(0.11, 0.11, 0.62, 28), new MeshStandardMaterial({ color: '#8d939c', roughness: 0.55, metalness: 0.2 })))
  tubo.position.copy(TUBO).setY(0.31)
  escena.add(tubo)

  // --- Zonas dañadas: desconchones que al repicar se cajean (se cortan en rectángulo) y luego se rellenan ---
  const ZONAS = [
    { x: 0.55, z: 0.25, r: 0.46, hondo: 0.1, bw: 0.52, bd: 0.4 },
    { x: -0.75, z: -0.55, r: 0.36, hondo: 0.08, bw: 0.42, bd: 0.34 },
    { x: 1.65, z: -0.65, r: 0.34, hondo: 0.09, bw: 0.4, bd: 0.32 },
    { x: -0.35, z: 1.15, r: 0.3, hondo: 0.07, bw: 0.36, bd: 0.28 },
    { x: 1.2, z: 1.3, r: 0.22, hondo: 0.06, bw: 0.28, bd: 0.22 },
  ].map((z, i) => ({ ...z, fase: i * 1.7 }))
  const HONDO_CAJA = 0.175

  const NX = movil ? 132 : 172
  const NZ = movil ? 90 : 116
  const geoSup = new PlaneGeometry(SW, SD, NX, NZ)
  geoSup.rotateX(-Math.PI / 2)
  const pos = geoSup.attributes.position as BufferAttribute
  const n = pos.count
  // Por vértice: la zona a la que pertenece (-1 si a ninguna), lo que se hunde como desconchón y como cajeado, y un grano
  const zona = new Int8Array(n).fill(-1)
  const hRoto = new Float32Array(n)
  const hCaja = new Float32Array(n)
  const rugoso = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i) + CX
    const z = pos.getZ(i) + CZ
    rugoso[i] = rnd()
    ZONAS.forEach((d, k) => {
      const dx = x - d.x
      const dz = z - d.z
      const ang = Math.atan2(dz, dx)
      const radio = d.r * (1 + 0.2 * Math.sin(ang * 3 + d.fase) + 0.1 * Math.sin(ang * 7 + d.fase))
      const t = 1 - Math.hypot(dx, dz) / radio
      const roto = t > 0 ? d.hondo * suave(Math.min(1, t * 1.7)) * (0.75 + 0.25 * rugoso[i]) : 0
      // Caja de paredes casi verticales
      const caja = Math.min(1, Math.max(0, (d.bw - Math.abs(dx)) / 0.035)) * Math.min(1, Math.max(0, (d.bd - Math.abs(dz)) / 0.035))
      if (roto > 0 || caja > 0) {
        zona[i] = k
        hRoto[i] = roto
        hCaja[i] = caja * HONDO_CAJA * (0.93 + 0.07 * rugoso[i])
      }
    })
  }

  const baseSup = pintarHormigon(MAPA.w, MAPA.h, rnd, 156)
  const suciedad = pintarSuciedad(rnd)
  const fisuras = pintarFisuras(rnd)
  const aridoVisto = pintarCorte(256, 256, rnd)
  const [lienzoSup, ctxSup] = lienzo2d(MAPA.w, MAPA.h)
  const [lienzoSucio, ctxSucio] = lienzo2d(MAPA.w, MAPA.h)
  const mapaSup = new CanvasTexture(lienzoSup)
  mapaSup.colorSpace = SRGBColorSpace
  mapaSup.anisotropy = 8
  const superficie = sombra(new Mesh(geoSup, new MeshStandardMaterial({ map: mapaSup, roughness: 0.94, bumpMap: grano, bumpScale: 1.8 })))
  superficie.position.set(CX, 0, CZ)
  escena.add(superficie)

  // Charco: donde el agua se queda, hay un problema
  const geoCharco = new CircleGeometry(0.62, 40)
  {
    const q = geoCharco.attributes.position as BufferAttribute
    for (let i = 1; i < q.count; i++) {
      const a = Math.atan2(q.getY(i), q.getX(i))
      const k = 1 + 0.22 * Math.sin(a * 2 + 1) + 0.12 * Math.sin(a * 5)
      q.setXY(i, q.getX(i) * k * 1.25, q.getY(i) * k * 0.8)
    }
  }
  const matAgua = new MeshPhysicalMaterial({ color: '#1a2026', roughness: 0.04, transparent: true, opacity: 0.72, clearcoat: 1, depthWrite: false })
  const charco = new Mesh(geoCharco, matAgua)
  charco.rotation.x = -Math.PI / 2
  charco.position.set(-1.2, 0.004, 0.1)
  escena.add(charco)

  // Cascotes del repicado
  const N_CASCOTES = 44
  const cascotes = sombra(new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ map: texCorte, roughness: 1 }), N_CASCOTES))
  cascotes.frustumCulled = false
  const cascote = Array.from({ length: N_CASCOTES }, (_, i) => {
    const d = ZONAS[i % ZONAS.length]
    const a = rnd() * 6.28
    const lejos = 1.3 + rnd() * 0.6
    return {
      zona: i % ZONAS.length,
      x: d.x + Math.cos(a) * d.bw * lejos,
      z: d.z + Math.sin(a) * d.bd * lejos,
      t: 0.03 + rnd() * 0.07,
      giro: [rnd() * 3, rnd() * 3, rnd() * 3] as const,
      forma: [0.6 + rnd() * 0.8, 0.4 + rnd() * 0.5, 0.6 + rnd() * 0.8] as const,
    }
  })
  escena.add(cascotes)
  const mudo = new Object3D()

  // --- Medias cañas, y las capas que suben por el peto ---
  /** Chaflán y franja vertical a lo largo de los dos petos. Cada peto se destapa con su propio plano de corte. */
  function remate(material: MeshStandardMaterial, altura: number, separa: number, orden: number) {
    const avanceX = new Plane(new Vector3(-1, 0, 0), -99) // deja ver x <= constante
    const avanceZ = new Plane(new Vector3(0, 0, -1), -99) // deja ver z <= constante
    const mx = material.clone()
    mx.clippingPlanes = [avanceX]
    const mz = material.clone()
    mz.clippingPlanes = [avanceZ]
    const hipo = CANA * Math.SQRT2
    const chaflanF = new PlaneGeometry(SW, hipo)
    chaflanF.rotateX(-Math.PI / 4)
    const chaflanI = new PlaneGeometry(SD, hipo)
    chaflanI.rotateY(Math.PI / 2)
    chaflanI.rotateZ(Math.PI / 4)
    const grupo = new Group()
    const a = new Mesh(chaflanF, mx)
    a.position.set(CX, CANA / 2 + separa, Z0 + CANA / 2 + separa)
    const b = new Mesh(chaflanI, mz)
    b.position.set(X0 + CANA / 2 + separa, CANA / 2 + separa, CZ)
    grupo.add(a, b)
    if (altura > 0) {
      const c = new Mesh(new PlaneGeometry(SW, altura), mx)
      c.position.set(CX, CANA + altura / 2, Z0 + separa)
      const franjaI = new PlaneGeometry(SD, altura)
      franjaI.rotateY(Math.PI / 2)
      const d = new Mesh(franjaI, mz)
      d.position.set(X0 + separa, CANA + altura / 2, CZ)
      grupo.add(c, d)
    }
    grupo.children.forEach((m) => {
      m.receiveShadow = true
      m.renderOrder = orden
    })
    grupo.visible = false
    escena.add(grupo)
    return { avanceX, avanceZ, grupo }
  }

  const canas = remate(new MeshStandardMaterial({ color: '#9aa0a8', roughness: 0.9, bumpMap: grano, bumpScale: 1.2, side: DoubleSide }), 0, 0, 0)

  /** Una capa aplicada sobre la zona de trabajo: se destapa con una máscara que pinta la pasada */
  function capa(material: MeshStandardMaterial, y: number, alturaPeto: number, separa: number, orden: number) {
    const [l, ctx] = lienzo2d(256, Math.round((256 * SD) / SW))
    const mascara = new CanvasTexture(l)
    // En los petos y el tubo no hay máscara: se destapan con planos de corte
    const sinMascara = material.clone()
    sinMascara.side = DoubleSide
    sinMascara.transparent = material.opacity < 1
    material.alphaMap = mascara
    material.transparent = true
    material.depthWrite = false
    const malla = new Mesh(new PlaneGeometry(SW, SD), material)
    malla.rotation.x = -Math.PI / 2
    malla.position.set(CX, y, CZ)
    malla.receiveShadow = true
    malla.renderOrder = orden
    malla.visible = false
    escena.add(malla)
    const sube = remate(sinMascara, alturaPeto, separa, orden)
    const collar = new Mesh(new CylinderGeometry(0.118 + separa, 0.15 + separa, 0.16, 28, 1, true), sinMascara)
    collar.position.copy(TUBO).setY(0.08)
    collar.renderOrder = orden
    collar.visible = false
    escena.add(collar)
    const calleTubo = (calles: number) => Math.floor(((TUBO.z - Z0) / SD) * calles)
    let pintado = -1
    return {
      /** t de 0 a 1 en una pasada de `calles` calles */
      avanzar(t: number, calles: number) {
        malla.visible = sube.grupo.visible = t > 0
        if (Math.abs(t - pintado) > 0.002) {
          pintado = t
          ctx.shadowBlur = 0
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, l.width, l.height)
          // Borde difuso: como queda el frente de una proyección o de un rodillo
          ctx.fillStyle = '#fff'
          ctx.shadowColor = '#fff'
          ctx.shadowBlur = 5
          trazarCubierto(ctx, t, calles, l.width, l.height)
          ctx.fill()
          mascara.needsUpdate = true
        }
        const h = pasada(t, calles)
        // El peto del fondo se cubre durante la primera calle; el de la izquierda, calle a calle
        sube.avanceX.constant = t <= 0 ? -99 : h.calle > 0 || t >= 1 ? 99 : h.x
        const hechas = t >= 1 ? calles : h.calle + (h.ida || h.f > 0.97 ? 1 : 0)
        sube.avanceZ.constant = t <= 0 ? -99 : Z0 + (hechas * SD) / calles
        // El collarín aparece cuando la pasada llega al tubo
        const ct = calleTubo(calles)
        collar.visible = t > 0 && (t >= 1 || h.calle > ct || (h.calle === ct && (h.ida ? h.x > TUBO.x : h.x < TUBO.x)))
      },
    }
  }

  // Imprimación epoxi: oscurece y deja el hormigón con brillo de mojado
  const imprimacion = capa(new MeshPhysicalMaterial({ color: '#3d2f22', roughness: 0.32, opacity: 0.62, clearcoat: 0.55, clearcoatRoughness: 0.3 }), 0.004, 0.2, 0.004, 1)
  // Membrana de poliurea: roja, mate, con la piel de naranja de la proyección
  const membrana = capa(new MeshStandardMaterial({ color: '#f0321d', roughness: 0.82, bumpMap: granoFino, bumpScale: 2.6 }), 0.012, 0.26, 0.009, 2)
  // Acabado alifático: gris pizarra, satinado, refleja el entorno
  const acabado = capa(
    new MeshPhysicalMaterial({ color: '#454857', roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.1, bumpMap: granoFino, bumpScale: 0.9 }),
    0.02,
    0.26,
    0.014,
    3,
  )

  // Logo de IMTEX pintado sobre la cubierta terminada
  const LOGO = { ancho: 2.9, x: 0.3, z: 0.3 }
  const planoLogo = new Plane(new Vector3(-1, 0, 0), -99)
  const matLogo = new MeshStandardMaterial({ transparent: true, roughness: 0.4, depthWrite: false, clippingPlanes: [planoLogo], opacity: 0 })
  const logo = new Mesh(new PlaneGeometry(1, 1), matLogo)
  logo.rotation.x = -Math.PI / 2
  logo.position.set(LOGO.x, 0.027, LOGO.z)
  logo.scale.set(LOGO.ancho, LOGO.ancho * 0.42, 1)
  logo.renderOrder = 4
  logo.visible = false
  escena.add(logo)
  new TextureLoader().load(opciones.logo, (tex) => {
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 8
    matLogo.map = tex
    matLogo.opacity = 1
    matLogo.needsUpdate = true
    logo.scale.y = (LOGO.ancho * tex.image.height) / tex.image.width
  })

  // --- Herramientas ---
  const matNegro = new MeshStandardMaterial({ color: '#17171b', roughness: 0.5, metalness: 0.3 })
  const matRojo = new MeshStandardMaterial({ color: '#ff311e', roughness: 0.45 })
  const matCromo = new MeshStandardMaterial({ color: '#c9ced6', roughness: 0.22, metalness: 0.95 })
  const punto = pintarPunto()

  /** Nube de partículas; se recoloca en cada cuadro a partir de unas semillas fijas */
  function particulas(cuantas: number, color: string, tam: number, opacidad: number) {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(cuantas * 3), 3))
    const semillas = Float32Array.from({ length: cuantas * 3 }, () => rnd())
    const nube = new Points(geo, new PointsMaterial({ color, size: tam, map: punto, transparent: true, opacity: opacidad, depthWrite: false, sizeAttenuation: true }))
    nube.frustumCulled = false
    nube.renderOrder = 6
    nube.visible = false
    escena.add(nube)
    return { nube, pos: geo.attributes.position as BufferAttribute, semillas, cuantas }
  }

  // Lanza de hidrolimpieza
  const lanza = new Group()
  {
    const vara = sombra(new Mesh(new CylinderGeometry(0.022, 0.022, 1.5, 12), matCromo), false)
    vara.position.y = 0.75
    const empu = sombra(new Mesh(new CylinderGeometry(0.045, 0.04, 0.42, 14), matNegro), false)
    empu.position.y = 1.35
    const boquilla = sombra(new Mesh(new CylinderGeometry(0.03, 0.045, 0.1, 14), matRojo), false)
    boquilla.position.y = 0.02
    const chorro = new Mesh(new ConeGeometry(0.2, 0.42, 20, 1, true), new MeshBasicMaterial({ color: '#dff0ff', transparent: true, opacity: 0.3, side: DoubleSide, depthWrite: false }))
    chorro.position.y = -0.2
    chorro.renderOrder = 5
    lanza.add(vara, empu, boquilla, chorro)
    lanza.visible = false
    escena.add(lanza)
  }
  const bruma = particulas(movil ? 90 : 150, '#f2f8ff', 0.11, 0.55)

  // Llana
  const llana = new Group()
  {
    const hoja = sombra(new Mesh(new BoxGeometry(0.44, 0.012, 0.16), matCromo), false)
    const mango = sombra(new Mesh(new CylinderGeometry(0.03, 0.03, 0.26, 12), matRojo), false)
    mango.rotation.z = Math.PI / 2
    mango.position.y = 0.09
    const pie1 = new Mesh(new BoxGeometry(0.02, 0.09, 0.02), matNegro)
    pie1.position.set(-0.1, 0.045, 0)
    const pie2 = pie1.clone()
    pie2.position.x = 0.1
    llana.add(hoja, mango, pie1, pie2)
    llana.visible = false
    escena.add(llana)
  }

  // Rodillo (imprimación y acabado): el manguito cambia de color con el producto
  const rodillo = new Group()
  const matManguito = new MeshStandardMaterial({ color: '#6b4a2c', roughness: 0.95, bumpMap: granoFino, bumpScale: 3 })
  {
    const manguito = sombra(new Mesh(new CylinderGeometry(0.075, 0.075, 0.56, 22), matManguito), false)
    manguito.rotation.x = Math.PI / 2
    manguito.position.y = 0.075
    const eje = new Mesh(new CylinderGeometry(0.012, 0.012, 0.7, 8), matCromo)
    eje.rotation.x = Math.PI / 2
    eje.position.y = 0.075
    const brazo = new Mesh(new CylinderGeometry(0.012, 0.012, 0.3, 8), matCromo)
    brazo.position.set(0.1, 0.19, 0.34)
    brazo.rotation.z = -0.7
    const palo = sombra(new Mesh(new CylinderGeometry(0.02, 0.02, 1.7, 10), matNegro), false)
    palo.position.set(0.72, 0.9, 0.34)
    palo.rotation.z = -0.72
    rodillo.add(manguito, eje, brazo, palo)
    rodillo.visible = false
    escena.add(rodillo)
  }

  // Pistola de proyección con su manguera
  const pistola = new Group()
  {
    const cuerpo = sombra(new Mesh(new BoxGeometry(0.11, 0.16, 0.34), matNegro), false)
    cuerpo.position.y = 0.62
    const culata = sombra(new Mesh(new BoxGeometry(0.08, 0.26, 0.1), matNegro), false)
    culata.position.set(0, 0.76, 0.12)
    culata.rotation.x = 0.35
    const mezcladora = sombra(new Mesh(new CylinderGeometry(0.05, 0.05, 0.14, 14), matRojo), false)
    mezcladora.rotation.x = Math.PI / 2
    mezcladora.position.set(0, 0.62, -0.2)
    const boca = new Mesh(new CylinderGeometry(0.018, 0.03, 0.08, 12), matCromo)
    boca.rotation.x = Math.PI / 2
    boca.position.set(0, 0.6, -0.3)
    const abanico = new Mesh(new ConeGeometry(0.3, 0.62, 22, 1, true), new MeshBasicMaterial({ color: '#ff5a44', transparent: true, opacity: 0.2, side: DoubleSide, depthWrite: false }))
    abanico.position.set(0, 0.31, -0.42)
    abanico.rotation.x = 0.35
    abanico.renderOrder = 5
    const manguera = sombra(
      new Mesh(
        new TubeGeometry(
          new CatmullRomCurve3([new Vector3(0, 0.84, 0.2), new Vector3(0.1, 0.7, 0.9), new Vector3(0.5, 0.25, 1.9), new Vector3(1.4, 0.3, 3.2), new Vector3(2.6, 1.2, 4.6)]),
          40,
          0.03,
          8,
        ),
        matNegro,
      ),
      false,
    )
    pistola.add(cuerpo, culata, mezcladora, boca, abanico, manguera)
    pistola.visible = false
    escena.add(pistola)
  }
  const niebla = particulas(movil ? 110 : 190, '#ff4a33', 0.085, 0.7)

  // Lluvia y gotas sobre la cubierta terminada
  const lluvia = particulas(movil ? 70 : 130, '#e9f3ff', 0.05, 0.75)
  const N_GOTAS = movil ? 46 : 80
  const gotas = new InstancedMesh(
    new SphereGeometry(1, 14, 10),
    new MeshPhysicalMaterial({ color: '#e6eef7', roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.6, depthWrite: false }),
    N_GOTAS,
  )
  gotas.frustumCulled = false
  gotas.renderOrder = 5
  gotas.visible = false
  const gota = Array.from({ length: N_GOTAS }, () => ({ x: X0 + 0.2 + rnd() * (SW - 0.4), z: Z0 + 0.2 + rnd() * (SD - 0.4), r: 0.018 + rnd() * 0.034, desfase: rnd() }))
  escena.add(gotas)

  // ---------------------------------------------------------------------------------------------
  // Estado: de p a lo que se ve
  // ---------------------------------------------------------------------------------------------

  const pintado = { relieve: '', mapa: '' }

  function relieveA(caja: number[], relleno: number[]) {
    for (let i = 0; i < n; i++) {
      const k = zona[i]
      const h = k < 0 ? 0 : mezcla(hRoto[i], hCaja[i], caja[k]) * (1 - relleno[k])
      pos.setY(i, -h - rugoso[i] * 0.003)
    }
    pos.needsUpdate = true
    geoSup.computeVertexNormals()
  }

  /** Marcas de pintura roja alrededor de cada daño: se dibujan hasta `avance` (0..1) */
  function marcas(ctx: CanvasRenderingContext2D, avance: number) {
    ctx.strokeStyle = 'rgba(255,49,30,0.92)'
    ctx.lineCap = 'round'
    ctx.lineWidth = 7
    ctx.shadowColor = 'rgba(255,49,30,0.6)'
    ctx.shadowBlur = 6
    ZONAS.forEach((d, i) => {
      const t = tramo(avance, i * 0.17, i * 0.17 + 0.3)
      if (t <= 0) return
      ctx.beginPath()
      ctx.ellipse(px(d.x), pz(d.z), ((d.bw + 0.12) / SW) * MAPA.w, ((d.bd + 0.12) / SD) * MAPA.h, 0.1 * i, 0, 6.283 * t)
      ctx.stroke()
      if (t >= 1) {
        // Un aspa junto a la zona: «aquí hay que actuar»
        const x = px(d.x + d.bw + 0.26)
        const y = pz(d.z - d.bd)
        ctx.beginPath()
        ctx.moveTo(x - 14, y - 14)
        ctx.lineTo(x + 14, y + 14)
        ctx.moveTo(x + 14, y - 14)
        ctx.lineTo(x - 14, y + 14)
        ctx.stroke()
      }
    })
    ctx.shadowBlur = 0
  }

  function mapaA(e: { marcas: number; limpio: number; caja: number[]; relleno: number[]; curado: number[]; fisuras: number }) {
    ctxSup.globalAlpha = 1
    ctxSup.drawImage(baseSup, 0, 0)
    // Suciedad y marcas, solo donde la lanza aún no ha pasado
    ctxSucio.globalCompositeOperation = 'source-over'
    ctxSucio.clearRect(0, 0, MAPA.w, MAPA.h)
    ctxSucio.drawImage(suciedad, 0, 0)
    marcas(ctxSucio, e.marcas)
    if (e.limpio > 0) {
      ctxSucio.globalCompositeOperation = 'destination-out'
      ctxSucio.fillStyle = '#000'
      ctxSucio.shadowColor = '#000'
      ctxSucio.shadowBlur = 18
      trazarCubierto(ctxSucio, e.limpio, CALLES.lanza, MAPA.w, MAPA.h)
      ctxSucio.fill()
      ctxSucio.shadowBlur = 0
    }
    ctxSup.drawImage(lienzoSucio, 0, 0)
    ctxSup.globalAlpha = e.fisuras
    ctxSup.drawImage(fisuras, 0, 0)
    // Dentro de cada cajeado: árido visto al repicar, mortero fresco (oscuro) al rellenar, y claro al curar
    ZONAS.forEach((d, i) => {
      const x = px(d.x - d.bw)
      const y = pz(d.z - d.bd)
      const w = ((d.bw * 2) / SW) * MAPA.w
      const h = ((d.bd * 2) / SD) * MAPA.h
      if (e.caja[i] > 0 && e.relleno[i] < 1) {
        ctxSup.globalAlpha = e.caja[i]
        ctxSup.drawImage(aridoVisto, 0, 0, 256, 256, x, y, w, h)
      }
      if (e.relleno[i] > 0) {
        ctxSup.globalAlpha = e.relleno[i]
        const g = Math.round(mezcla(96, 158, e.curado[i]))
        ctxSup.fillStyle = `rgb(${g},${g + 3},${g + 9})`
        ctxSup.fillRect(x - 2, y - 2, w + 4, h + 4)
        // Pasadas de llana
        ctxSup.globalAlpha = e.relleno[i] * 0.16
        ctxSup.strokeStyle = '#fff'
        ctxSup.lineWidth = 2
        for (let k = 1; k < 6; k++) {
          ctxSup.beginPath()
          ctxSup.moveTo(x, y + (h * k) / 6)
          ctxSup.lineTo(x + w, y + (h * k) / 6 - 4)
          ctxSup.stroke()
        }
      }
    })
    ctxSup.globalAlpha = 1
    mapaSup.needsUpdate = true
  }

  function aplicar(p: number, t: number) {
    // Las marcas de inspección se dibujan solas al cargar
    const marca = Math.min(1, t / 2600)
    const limpio = tramo(p, 0.3, 0.95)
    const caja = ZONAS.map((_, i) => suave(tramo(p, 0.45 + i * 0.09, 0.63 + i * 0.09)))
    const relleno = ZONAS.map((_, i) => suave(tramo(p, 1.45 + i * 0.09, 1.63 + i * 0.09)))
    const curado = ZONAS.map((_, i) => tramo(p, 1.63 + i * 0.09, 2.2 + i * 0.05))
    const pasivado = suave(tramo(p, 1.15, 1.42))
    const fisura = 1 - suave(tramo(p, 1.45, 2))

    const firma = caja.concat(relleno).map((v) => v.toFixed(2)).join()
    if (firma !== pintado.relieve) {
      pintado.relieve = firma
      relieveA(caja, relleno)
    }
    const firmaMapa = [marca, limpio, fisura].map((v) => v.toFixed(3)).join() + firma + curado.map((v) => v.toFixed(2)).join()
    if (firmaMapa !== pintado.mapa) {
      pintado.mapa = firmaMapa
      mapaA({ marcas: marca, limpio, caja, relleno, curado, fisuras: fisura })
    }
    // Pasivado: las armaduras pasan del óxido a la imprimación anticorrosión
    matAcero.color.copy(OXIDO).lerp(PASIVADO, pasivado)
    matAcero.roughness = mezcla(0.8, 0.45, pasivado)

    // Charco: se va con la limpieza
    charco.visible = limpio < 0.5
    matAgua.opacity = 0.72 * (1 - tramo(limpio, 0.15, 0.5))

    // Cascotes: saltan al cajear y se retiran antes de reparar
    const retirados = tramo(p, 1.05, 1.3)
    cascotes.visible = caja[0] > 0 && retirados < 1
    if (cascotes.visible) {
      cascote.forEach((c, i) => {
        const e = caja[c.zona] * (1 - retirados)
        mudo.position.set(c.x, c.t * c.forma[1] * 0.5 * e, c.z)
        mudo.rotation.set(...c.giro)
        mudo.scale.set(c.t * c.forma[0] * e, c.t * c.forma[1] * e, c.t * c.forma[2] * e)
        mudo.updateMatrix()
        cascotes.setMatrixAt(i, mudo.matrix)
      })
      cascotes.instanceMatrix.needsUpdate = true
    }

    // Medias cañas de mortero en el encuentro con los petos
    const cana = tramo(p, 1.6, 2)
    canas.grupo.visible = cana > 0
    canas.avanceX.constant = X0 + cana * SW
    canas.avanceZ.constant = Z0 + cana * SD

    // Lanza de hidrolimpieza
    lanza.visible = bruma.nube.visible = p > 0.22 && p < 1
    if (lanza.visible) {
      const h = pasada(limpio, CALLES.lanza)
      const bamboleo = Math.sin(t / 90) * 0.12
      lanza.position.set(h.x, 0.42, h.z + bamboleo)
      lanza.rotation.z = h.ida ? 0.55 : -0.55
      for (let i = 0; i < bruma.cuantas; i++) {
        const s = bruma.semillas
        const vida = (t / 520 + s[i * 3]) % 1
        const ang = s[i * 3 + 1] * 6.28
        const lejos = vida * (0.25 + s[i * 3 + 2] * 0.75)
        bruma.pos.setXYZ(i, h.x + Math.cos(ang) * lejos, 0.02 + Math.sin(vida * 3.14) * (0.12 + s[i * 3 + 2] * 0.38), h.z + bamboleo + Math.sin(ang) * lejos)
      }
      bruma.pos.needsUpdate = true
    }

    // Llana: va de cajeado en cajeado mientras se rellenan
    const k = relleno.findIndex((r) => r < 1)
    llana.visible = p > 1.4 && p < 2 && k >= 0
    if (llana.visible) {
      const d = ZONAS[k]
      llana.position.set(d.x + Math.sin(t / 170) * d.bw * 0.7, 0.03 + (1 - relleno[k]) * 0.02, d.z + Math.sin(t / 520) * d.bd * 0.5)
      llana.rotation.set(0, 0.25 + Math.sin(t / 340) * 0.2, Math.sin(t / 170) * 0.08)
    }

    // Capas
    const tImp = tramo(p, 2.3, 2.97)
    const tMem = tramo(p, 3.3, 3.97)
    const tAca = tramo(p, 4.25, 4.8)
    imprimacion.avanzar(tImp, CALLES.imprimacion)
    membrana.avanzar(tMem, CALLES.membrana)
    acabado.avanzar(tAca, CALLES.acabado)

    // Rodillo: imprimación y, más adelante, acabado
    const conAcabado = p > 4
    rodillo.visible = (p > 2.24 && p < 3) || (p > 4.2 && p < 4.82)
    if (rodillo.visible) {
      const h = conAcabado ? pasada(tAca, CALLES.acabado) : pasada(tImp, CALLES.imprimacion)
      matManguito.color.set(conAcabado ? '#454857' : '#6b4a2c')
      rodillo.position.set(h.x, conAcabado ? 0.02 : 0.004, h.z)
      // El palo va por detrás del sentido de avance
      rodillo.rotation.y = h.ida ? Math.PI : 0
    }

    // Pistola de proyección
    pistola.visible = niebla.nube.visible = p > 3.24 && p < 4
    if (pistola.visible) {
      const h = pasada(tMem, CALLES.membrana)
      const vaiven = Math.sin(t / 150) * 0.16
      pistola.position.set(h.x, 0, h.z + 0.45 + vaiven)
      pistola.rotation.y = h.ida ? -0.25 : 0.25
      for (let i = 0; i < niebla.cuantas; i++) {
        const s = niebla.semillas
        const vida = (t / 300 + s[i * 3]) % 1
        const abre = vida * 0.3 * (0.4 + s[i * 3 + 2])
        const ang = s[i * 3 + 1] * 6.28
        niebla.pos.setXYZ(i, h.x + Math.cos(ang) * abre, mezcla(0.6, 0.02, vida), h.z + 0.15 + vaiven - vida * 0.42 + Math.sin(ang) * abre)
      }
      niebla.pos.needsUpdate = true
    }

    // Logo: se destapa de izquierda a derecha cuando el acabado está puesto
    const tLogo = suave(tramo(p, 4.78, 4.95))
    logo.visible = tLogo > 0
    planoLogo.constant = LOGO.x - LOGO.ancho / 2 + tLogo * LOGO.ancho

    // Prueba de agua: llueve, y el agua se queda en gotas sobre el acabado y corre al sumidero
    const mojado = tramo(p, 4.9, 5)
    lluvia.nube.visible = gotas.visible = mojado > 0
    if (mojado > 0) {
      for (let i = 0; i < lluvia.cuantas; i++) {
        const s = lluvia.semillas
        const vida = (t / 900 + s[i * 3]) % 1
        lluvia.pos.setXYZ(i, X0 + s[i * 3 + 1] * SW, 2.6 * (1 - vida) + 0.03, Z0 + s[i * 3 + 2] * SD)
      }
      lluvia.pos.needsUpdate = true
      gota.forEach((g, i) => {
        const vida = (t / 5200 + g.desfase) % 1
        const e = Math.min(1, vida * 6) * (1 - tramo(vida, 0.75, 1)) * mojado
        const corre = suave(tramo(vida, 0.55, 1)) * 0.5
        mudo.position.set(mezcla(g.x, SUMIDERO.x, corre), 0.022 + g.r * 0.3 * e, mezcla(g.z, SUMIDERO.z, corre))
        mudo.rotation.set(0, 0, 0)
        mudo.scale.set(g.r * e, g.r * 0.42 * e, g.r * e)
        mudo.updateMatrix()
        gotas.setMatrixAt(i, mudo.matrix)
      })
      gotas.instanceMatrix.needsUpdate = true
    }
  }

  // --- Cámara: un encuadre por fase, y lo que arrastre el visitante ---
  const CAMARAS = [
    // [posición, punto al que mira]
    [new Vector3(5.6, 3.7, 6.6), new Vector3(0.1, 0.05, 0.2)], // 1 · vista general
    [new Vector3(3.9, 2.3, 5.4), new Vector3(0.3, 0, 0.3)], // 2 · más cerca y más baja: la lanza
    [new Vector3(2.9, 1.9, 3.5), new Vector3(0.45, 0, 0.3)], // 3 · primer plano del cajeado
    [new Vector3(2.4, 6.0, 4.4), new Vector3(0.1, 0, 0.1)], // 4 · casi cenital: las calles del rodillo
    [new Vector3(5.4, 1.85, 4.3), new Vector3(-0.5, 0.2, -0.3)], // 5 · rasante hacia el peto: la membrana sube
    [new Vector3(4.9, 4.3, 5.8), new Vector3(0.25, 0, 0.3)], // 6 · la cubierta terminada, con el logo
  ] as const

  let arrastre = 0
  let inercia = 0
  let agarrado: number | null = null
  const alPulsar = (ev: PointerEvent) => {
    agarrado = ev.clientX
    lienzo.setPointerCapture(ev.pointerId)
  }
  const alMover = (ev: PointerEvent) => {
    if (agarrado === null) return
    inercia = (ev.clientX - agarrado) * 0.006
    arrastre -= inercia
    agarrado = ev.clientX
  }
  const alSoltar = () => (agarrado = null)
  lienzo.addEventListener('pointerdown', alPulsar)
  lienzo.addEventListener('pointermove', alMover)
  lienzo.addEventListener('pointerup', alSoltar)
  lienzo.addEventListener('pointercancel', alSoltar)

  const posCam = new Vector3()
  const miraCam = new Vector3()
  function encuadrar(p: number, t: number) {
    const i = Math.min(CAMARAS.length - 2, Math.floor(p))
    const f = suave(Math.min(1, p - i))
    posCam.lerpVectors(CAMARAS[i][0], CAMARAS[i + 1][0], f)
    miraCam.lerpVectors(CAMARAS[i][1], CAMARAS[i + 1][1], f)
    // En paneles estrechos (móvil en vertical) la cámara se aleja para que la pieza quepa a lo ancho
    const lejos = Math.max(1, 1.18 / camara.aspect)
    // Balanceo lento y giro a mano, alrededor del punto al que mira
    const giro = Math.sin(t / 5200) * 0.07 + arrastre
    const dx = posCam.x - miraCam.x
    const dz = posCam.z - miraCam.z
    camara.position.set(
      miraCam.x + (dx * Math.cos(giro) - dz * Math.sin(giro)) * lejos,
      miraCam.y + (posCam.y - miraCam.y) * lejos,
      miraCam.z + (dx * Math.sin(giro) + dz * Math.cos(giro)) * lejos,
    )
    camara.lookAt(miraCam)
  }

  function ajustar() {
    const ancho = lienzo.clientWidth
    const alto = lienzo.clientHeight
    if (!ancho || !alto) return
    renderizador.setSize(ancho, alto, false)
    camara.aspect = ancho / alto
    camara.updateProjectionMatrix()
  }
  const observadorTamano = new ResizeObserver(ajustar)
  observadorTamano.observe(lienzo)
  ajustar()

  // --- Bucle: solo mientras la pieza está a la vista ---
  let objetivo = 0
  let actual = -1
  let cuadro = 0
  let visible = true
  const inicio = performance.now()
  let anterior = inicio
  function pintar(ahora: number) {
    cuadro = visible ? requestAnimationFrame(pintar) : 0
    // Suavizado por tiempo, no por cuadro: va igual a 60 Hz, a 120 Hz o si el navegador pinta a trompicones
    const dt = Math.min(1000, ahora - anterior)
    anterior = ahora
    actual = actual < 0 ? objetivo : actual + (objetivo - actual) * (1 - Math.exp(-dt / 170))
    if (agarrado === null) {
      arrastre -= inercia
      inercia *= Math.exp(-dt / 200)
    }
    arrastre = Math.max(-1.1, Math.min(1.1, arrastre))
    aplicar(actual, ahora - inicio)
    encuadrar(actual, ahora - inicio)
    renderizador.render(escena, camara)
  }
  const observadorVista = new IntersectionObserver(([entrada]) => {
    visible = entrada.isIntersecting
    if (visible && !cuadro) {
      anterior = performance.now()
      cuadro = requestAnimationFrame(pintar)
    }
  })
  observadorVista.observe(lienzo)
  cuadro = requestAnimationFrame(pintar)

  return {
    /** p de 0 a 5: la fase en la que está la pieza (con decimales mientras se trabaja en la siguiente) */
    progreso(p: number) {
      objetivo = Math.max(0, Math.min(5, p))
    },
    /** Va a p de golpe, sin transición (al cargar la página a media lectura) */
    saltar(p: number) {
      objetivo = actual = Math.max(0, Math.min(5, p))
    },
    destruir() {
      cancelAnimationFrame(cuadro)
      observadorTamano.disconnect()
      observadorVista.disconnect()
      renderizador.dispose()
    },
  }
}
