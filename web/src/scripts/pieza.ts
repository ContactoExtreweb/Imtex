// La pieza de la portada: un trozo de losa de hormigón que pasa por las fases de una obra de IMTEX.
// Todo es geometría hecha aquí (sin modelos ni texturas externas). Se carga aparte y después del
// resto de la página; components/Fases.astro decide si el equipo puede con ella.
//
// progreso(p): p va de 0 (hormigón dañado) a 5 (acabado). Cada fase termina de aplicarse al llegar a su entero.

import {
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'

const ANCHO = 4
const FONDO = 2.6
const ALTO = 0.7
const TECHO = ALTO / 2

// Colores: hormigón y mortero en grises; el rojo de marca es la membrana
const HORMIGON = new Color('#8f939a')
const MORTERO = new Color('#6f7682')
const OXIDO = new Color('#8f3d24')
const PASIVADO = new Color('#566070')

/** Generador con semilla: la pieza sale igual en todas las visitas */
function azar(semilla: number) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const tramo = (p: number, desde: number, hasta: number) => Math.min(1, Math.max(0, (p - desde) / (hasta - desde)))
const suave = (t: number) => t * t * (3 - 2 * t)

/** Textura de árido: motas claras y oscuras sobre gris, para que el hormigón no sea un color plano */
function lienzoArido(ancho: number, alto: number, rnd: () => number) {
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, ancho, alto)
  for (let i = 0; i < (ancho * alto) / 90; i++) {
    const tono = rnd() < 0.55 ? 0 : 255
    ctx.fillStyle = `rgba(${tono},${tono},${tono},${0.04 + rnd() * 0.1})`
    const r = 0.6 + rnd() * 2.2
    ctx.beginPath()
    ctx.ellipse(rnd() * ancho, rnd() * alto, r, r * (0.6 + rnd() * 0.6), rnd() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  return lienzo
}

/** Fisuras: líneas quebradas con ramas, sobre transparente */
function lienzoFisuras(ancho: number, alto: number, rnd: () => number) {
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')!
  ctx.strokeStyle = 'rgba(38,36,42,0.9)'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const fisura = (x: number, y: number, rumbo: number, largo: number, grosor: number) => {
    ctx.lineWidth = grosor
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let i = 0; i < largo; i++) {
      rumbo += (rnd() - 0.5) * 0.9
      x += Math.cos(rumbo) * 14
      y += Math.sin(rumbo) * 14
      ctx.lineTo(x, y)
      if (grosor > 1.2 && rnd() < 0.12) {
        ctx.stroke()
        fisura(x, y, rumbo + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.6), largo * 0.35, grosor * 0.55)
        ctx.lineWidth = grosor
        ctx.beginPath()
        ctx.moveTo(x, y)
      }
    }
    ctx.stroke()
  }
  for (let i = 0; i < 7; i++) fisura(rnd() * ancho, rnd() * alto, rnd() * Math.PI * 2, 18 + rnd() * 26, 1.4 + rnd() * 1.8)
  return lienzo
}

export function montarPieza(lienzo: HTMLCanvasElement) {
  const rnd = azar(2026)

  const renderizador = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderizador.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderizador.outputColorSpace = SRGBColorSpace
  renderizador.shadowMap.enabled = true
  renderizador.shadowMap.type = PCFSoftShadowMap
  renderizador.localClippingEnabled = true

  const escena = new Scene()
  const camara = new PerspectiveCamera(30, 1, 0.1, 60)

  escena.add(new HemisphereLight('#ffffff', '#7c8494', 1.15))
  const sol = new DirectionalLight('#ffffff', 2.1)
  sol.position.set(3.5, 6, 2.5)
  sol.castShadow = true
  sol.shadow.mapSize.set(1024, 1024)
  sol.shadow.camera.left = -4
  sol.shadow.camera.right = 4
  sol.shadow.camera.top = 4
  sol.shadow.camera.bottom = -4
  sol.shadow.bias = -0.0015
  escena.add(sol)

  const grupo = new Group()
  escena.add(grupo)

  // Sombra en el «suelo»: lo único que ancla la pieza a la página
  const suelo = new Mesh(new PlaneGeometry(14, 14), new ShadowMaterial({ opacity: 0.28 }))
  suelo.rotation.x = -Math.PI / 2
  suelo.position.y = -TECHO - 0.001
  suelo.receiveShadow = true
  escena.add(suelo)

  // --- Cuerpo de la losa: caras laterales y de abajo (la de arriba es la superficie dañada) ---
  const arido = new CanvasTexture(lienzoArido(512, 128, rnd))
  arido.colorSpace = SRGBColorSpace
  const lateral = new MeshStandardMaterial({ color: HORMIGON, map: arido, roughness: 0.95 })
  const oculta = new MeshStandardMaterial({ visible: false })
  const cuerpo = new Mesh(new BoxGeometry(ANCHO, ALTO, FONDO), [lateral, lateral, oculta, lateral, lateral, lateral])
  cuerpo.castShadow = true
  grupo.add(cuerpo)

  // --- Armaduras: se ven en los desconchones y asoman en los cantos ---
  const acero = new MeshStandardMaterial({ color: OXIDO, roughness: 0.75, metalness: 0.35 })
  const barraLarga = new CylinderGeometry(0.028, 0.028, ANCHO + 0.03, 10)
  barraLarga.rotateZ(Math.PI / 2)
  const barraCorta = new CylinderGeometry(0.024, 0.024, FONDO + 0.03, 10)
  barraCorta.rotateX(Math.PI / 2)
  for (let i = 0; i < 6; i++) {
    const barra = new Mesh(barraLarga, acero)
    barra.position.set(0, TECHO - 0.105, -FONDO / 2 + 0.3 + i * ((FONDO - 0.6) / 5))
    grupo.add(barra)
  }
  for (let i = 0; i < 8; i++) {
    const barra = new Mesh(barraCorta, acero)
    barra.position.set(-ANCHO / 2 + 0.3 + i * ((ANCHO - 0.6) / 7), TECHO - 0.158, 0)
    grupo.add(barra)
  }

  // --- Superficie: una malla que se hunde donde hay desconchones ---
  const SX = 128
  const SZ = 84
  const geoSup = new PlaneGeometry(ANCHO, FONDO, SX, SZ)
  geoSup.rotateX(-Math.PI / 2)
  const pos = geoSup.attributes.position as BufferAttribute
  const n = pos.count

  const desconchones = Array.from({ length: 8 }, () => ({
    x: (rnd() - 0.5) * (ANCHO - 1.3),
    z: (rnd() - 0.5) * (FONDO - 1.1),
    r: 0.24 + rnd() * 0.3,
    hondo: 0.11 + rnd() * 0.1,
    fase: rnd() * 6.28,
  }))
  // Por vértice: cuánto se hunde (0..hondo), cuánto parche de mortero le toca (0..1, con el borde difuminado),
  // cuánta suciedad tiene y un grano fino
  const hueco = new Float32Array(n)
  const parche = new Float32Array(n)
  const mancha = new Float32Array(n)
  const grano = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    let h = 0
    let m = 0
    for (const d of desconchones) {
      const dx = x - d.x
      const dz = z - d.z
      // Borde irregular, no un círculo
      const radio = d.r * (1 + 0.22 * Math.sin(Math.atan2(dz, dx) * 3 + d.fase) + 0.1 * Math.sin(Math.atan2(dz, dx) * 7 + d.fase))
      const t = 1 - Math.hypot(dx, dz) / radio
      if (t > 0) h = Math.max(h, d.hondo * suave(Math.min(1, t * 1.6)))
      // El parche se pasa un poco del desconchón y se funde con el hormigón
      // (con el radio liso: los lóbulos del borde, en un parche de color, parecían píxeles)
      const tp = 1 - Math.hypot(dx, dz) / (d.r * 1.5)
      if (tp > 0) m = Math.max(m, suave(Math.min(1, tp * 1.3)))
    }
    hueco[i] = h
    parche[i] = m
    grano[i] = rnd()
    // Suciedad en manchas grandes: suma de ondas, más barata que un ruido de verdad
    mancha[i] = 0.5 + 0.25 * Math.sin(x * 2.1 + 1.3) * Math.cos(z * 2.7 - 0.4) + 0.25 * Math.sin(x * 5.3 + z * 4.1)
  }
  geoSup.setAttribute('color', new BufferAttribute(new Float32Array(n * 3), 3))
  const col = geoSup.attributes.color as BufferAttribute

  // El mapa de la superficie: árido + fisuras con la opacidad que toque
  const baseSup = lienzoArido(1024, 666, rnd)
  const fisuras = lienzoFisuras(1024, 666, rnd)
  const lienzoSup = document.createElement('canvas')
  lienzoSup.width = 1024
  lienzoSup.height = 666
  const ctxSup = lienzoSup.getContext('2d')!
  const mapaSup = new CanvasTexture(lienzoSup)
  mapaSup.colorSpace = SRGBColorSpace
  mapaSup.anisotropy = 4

  const superficie = new Mesh(geoSup, new MeshStandardMaterial({ vertexColors: true, map: mapaSup, roughness: 0.96 }))
  superficie.position.y = TECHO
  superficie.receiveShadow = true
  superficie.castShadow = true
  grupo.add(superficie)

  // --- Capas que se aplican encima: imprimación, membrana y acabado. Cada una barre la losa de lado a lado. ---
  const capa = (grosor: number, base: number, material: MeshStandardMaterial) => {
    const plano = new Plane()
    material.clippingPlanes = [plano]
    material.clipShadows = true
    const malla = new Mesh(new BoxGeometry(ANCHO, grosor, FONDO), material)
    malla.position.y = TECHO + base + grosor / 2
    malla.receiveShadow = true
    grupo.add(malla)
    return { malla, plano, cima: base + grosor }
  }
  const imprimacion = capa(0.014, 0.001, new MeshStandardMaterial({ color: '#3b3d4b', roughness: 0.45 }))
  const membrana = capa(0.05, imprimacion.cima, new MeshStandardMaterial({ color: '#ff311e', roughness: 0.9 }))
  const acabado = capa(0.016, membrana.cima, new MeshStandardMaterial({ color: '#e62c1a', roughness: 0.16, metalness: 0.05 }))
  const capas = [imprimacion, membrana, acabado]

  // El frente de aplicación: una regla negra que avanza con la capa
  const frente = new Mesh(new BoxGeometry(0.035, 0.035, FONDO + 0.16), new MeshStandardMaterial({ color: '#131116', roughness: 0.6 }))
  grupo.add(frente)

  // --- Estado ---
  let objetivo = 0
  let actual = -1 // fuerza el primer cálculo
  let pintado = { hundido: -1, limpio: -1, relleno: -1, fisuras: -1 }

  const c = new Color()
  function superficieA(hundido: number, limpio: number, relleno: number) {
    for (let i = 0; i < n; i++) {
      const h = hueco[i] * hundido
      pos.setY(i, -h - grano[i] * 0.004)
      // Hormigón con su suciedad; donde hubo desconchón, el mortero de reparación se nota al rellenar
      c.copy(HORMIGON).multiplyScalar(1 - 0.38 * mancha[i] * (1 - limpio) - 0.05 * grano[i])
      if (parche[i] > 0) c.lerp(MORTERO, parche[i] * relleno * 0.4)
      // El fondo del desconchón, más oscuro
      c.multiplyScalar(1 - Math.min(0.3, h * 1.6))
      col.setXYZ(i, c.r, c.g, c.b)
    }
    pos.needsUpdate = true
    col.needsUpdate = true
    geoSup.computeVertexNormals()
  }

  function mapaA(opacidad: number) {
    ctxSup.globalAlpha = 1
    ctxSup.drawImage(baseSup, 0, 0)
    ctxSup.globalAlpha = opacidad
    ctxSup.drawImage(fisuras, 0, 0)
    mapaSup.needsUpdate = true
  }

  const local = new Plane()
  function aplicar(p: number) {
    const limpio = suave(tramo(p, 0.35, 1))
    const repicado = suave(tramo(p, 0.5, 1))
    const pasivado = suave(tramo(p, 1.2, 1.6))
    const relleno = suave(tramo(p, 1.55, 2))
    // Al repicar el desconchón se agranda; al reparar se rellena hasta enrasar
    const hundido = (1 + 0.3 * repicado) * (1 - relleno)

    if (Math.abs(hundido - pintado.hundido) > 0.004 || Math.abs(limpio - pintado.limpio) > 0.01 || Math.abs(relleno - pintado.relleno) > 0.01) {
      superficieA(hundido, limpio, relleno)
      pintado = { ...pintado, hundido, limpio, relleno }
    }
    const opacidad = (1 - relleno) * (0.6 + 0.4 * (1 - limpio))
    if (Math.abs(opacidad - pintado.fisuras) > 0.02) {
      mapaA(opacidad)
      pintado.fisuras = opacidad
    }
    acero.color.copy(OXIDO).lerp(PASIVADO, pasivado)

    // Barridos: cada capa avanza de -x a +x. El frente acompaña a la que se está aplicando.
    const avances = [tramo(p, 2.35, 3), tramo(p, 3.35, 4), tramo(p, 4.35, 5)]
    frente.visible = false
    capas.forEach((k, i) => {
      const borde = -ANCHO / 2 - 0.02 + avances[i] * (ANCHO + 0.04)
      k.malla.visible = avances[i] > 0
      // Plano en coordenadas de la pieza; se pasa a las del mundo porque la pieza gira
      local.set(new Vector3(-1, 0, 0), borde)
      k.plano.copy(local).applyMatrix4(grupo.matrixWorld)
      if (avances[i] > 0 && avances[i] < 1) {
        frente.visible = true
        frente.position.set(borde, TECHO + k.cima + 0.03, 0)
      }
    })
  }

  // --- Giro: balanceo lento, más lo que arrastre el visitante ---
  let arrastre = 0
  let inercia = 0
  let agarrado: number | null = null
  const alPulsar = (ev: PointerEvent) => {
    agarrado = ev.clientX
    lienzo.setPointerCapture(ev.pointerId)
  }
  const alMover = (ev: PointerEvent) => {
    if (agarrado === null) return
    inercia = (ev.clientX - agarrado) * 0.008
    arrastre += inercia
    agarrado = ev.clientX
  }
  const alSoltar = () => (agarrado = null)
  lienzo.addEventListener('pointerdown', alPulsar)
  lienzo.addEventListener('pointermove', alMover)
  lienzo.addEventListener('pointerup', alSoltar)
  lienzo.addEventListener('pointercancel', alSoltar)

  // --- Tamaño: la cámara se aleja en formatos estrechos para que la pieza quepa entera ---
  function ajustar() {
    const ancho = lienzo.clientWidth
    const alto = lienzo.clientHeight
    if (!ancho || !alto) return
    renderizador.setSize(ancho, alto, false)
    camara.aspect = ancho / alto
    // Lo justo para que la losa quepa a lo ancho: más lejos cuanto más estrecho es el panel
    const lejos = Math.max(0.85, 1.26 / camara.aspect)
    camara.position.set(4.5 * lejos, 3.3 * lejos, 6.1 * lejos)
    camara.lookAt(0, 0.05, 0)
    camara.updateProjectionMatrix()
  }
  const observadorTamano = new ResizeObserver(ajustar)
  observadorTamano.observe(lienzo)
  ajustar()

  // --- Bucle: solo mientras la pieza está a la vista ---
  let cuadro = 0
  let visible = true
  const inicio = performance.now()
  let anterior = inicio
  function pintar(ahora: number) {
    cuadro = visible ? requestAnimationFrame(pintar) : 0
    // Suavizado por tiempo, no por cuadro: va igual a 60 Hz, a 120 Hz o si el navegador pinta a trompicones
    const dt = Math.min(1000, ahora - anterior)
    anterior = ahora
    actual = actual < 0 ? objetivo : actual + (objetivo - actual) * (1 - Math.exp(-dt / 150))
    if (agarrado === null) {
      arrastre += inercia
      inercia *= Math.exp(-dt / 200)
    }
    arrastre = Math.max(-1.3, Math.min(1.3, arrastre))
    grupo.rotation.y = -0.55 + Math.sin((ahora - inicio) / 4200) * 0.22 + arrastre
    grupo.updateMatrixWorld()
    aplicar(actual)
    renderizador.render(escena, camara)
  }
  const observadorVista = new IntersectionObserver(([entrada]) => {
    visible = entrada.isIntersecting
    if (visible && !cuadro) cuadro = requestAnimationFrame(pintar)
  })
  observadorVista.observe(lienzo)
  cuadro = requestAnimationFrame(pintar)

  return {
    /** p de 0 a 5: la fase en la que está la pieza (con decimales mientras se aplica la siguiente) */
    progreso(p: number) {
      objetivo = Math.max(0, Math.min(5, p))
    },
    destruir() {
      cancelAnimationFrame(cuadro)
      observadorTamano.disconnect()
      observadorVista.disconnect()
      renderizador.dispose()
    },
  }
}
