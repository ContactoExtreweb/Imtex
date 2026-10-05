// Lo común de los objetos 3D de las páginas interiores: renderizador, luces, sombra en el suelo,
// una cámara que mira a un punto, giro arrastrando y un bucle que solo pinta mientras se ve.
// Los ajustes son los de la maqueta de la portada (scripts/pieza.ts), para que todo sea de la misma familia.
// A diferencia de la portada, aquí nada depende del scroll: cada escena avanza sola con el reloj.

import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export interface OpcionesEscena {
  /** Altura del suelo que recibe la sombra */
  suelo?: number
  /** Medio lado de la zona que cubre la sombra del sol */
  alcanceSombra?: number
  /** Apertura de la cámara, en grados */
  apertura?: number
  /** Ancho (en proporción de pantalla) que necesita la pieza: en paneles más estrechos, la cámara se aleja */
  anchoMinimo?: number
  /** Cuánto se deja girar arrastrando, en radianes a cada lado */
  giroMaximo?: number
}

export interface Escena {
  escena: Scene
  camara: PerspectiveCamera
  renderizador: WebGLRenderer
  movil: boolean
  /** Dónde está la cámara y a qué mira. La escena lo cambia; la base le suma el balanceo y el giro a mano. */
  encuadre: { pos: Vector3; mira: Vector3 }
  /** Proyecta y recibe sombra */
  sombra<T extends Mesh>(m: T, recibe?: boolean): T
  /** Se llama en cada cuadro con el tiempo de la escena (segundos, solo corre mientras se ve) y lo que ha pasado desde el anterior */
  alPintar(f: (t: number, dt: number) => void): void
  /** Para revisar un momento concreto: congela el reloj en `t` segundos (null lo suelta) */
  fijar(t: number | null): void
  destruir(): void
}

export function crearEscena(lienzo: HTMLCanvasElement, opciones: OpcionesEscena = {}): Escena {
  const { suelo = 0, alcanceSombra = 5, apertura = 32, anchoMinimo = 1.18, giroMaximo = 0.9 } = opciones
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
  const camara = new PerspectiveCamera(apertura, 1, 0.1, 120)

  // Entorno para los reflejos: una sala de estudio generada, sin descargar nada
  const pmrem = new PMREMGenerator(renderizador)
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  escena.environmentIntensity = 0.5
  pmrem.dispose()

  escena.add(new HemisphereLight('#ffffff', '#6f7686', 0.55))
  const sol = new DirectionalLight('#fff4e6', 2.5)
  sol.position.set(4.5, 7, 3.5)
  sol.castShadow = true
  sol.shadow.mapSize.set(movil ? 1024 : 2048, movil ? 1024 : 2048)
  Object.assign(sol.shadow.camera, { left: -alcanceSombra, right: alcanceSombra, top: alcanceSombra, bottom: -alcanceSombra, far: 30 })
  sol.shadow.bias = -0.0006
  sol.shadow.normalBias = 0.02
  escena.add(sol)
  const contra = new DirectionalLight('#cfd8ff', 0.7)
  contra.position.set(-5, 3, -4)
  escena.add(contra)

  // Sombra en el «suelo»: lo que ancla la pieza a la página
  const base = new Mesh(new PlaneGeometry(40, 40), new ShadowMaterial({ opacity: 0.26 }))
  base.rotation.x = -Math.PI / 2
  base.position.y = suelo - 0.001
  base.receiveShadow = true
  escena.add(base)

  const sombra = <T extends Mesh>(m: T, recibe = true) => {
    m.castShadow = true
    m.receiveShadow = recibe
    return m
  }

  // --- Giro a mano, con inercia ---
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

  const encuadre = { pos: new Vector3(6, 4, 7), mira: new Vector3() }
  function encuadrar(t: number) {
    const { pos, mira } = encuadre
    // En paneles estrechos la cámara se aleja para que la pieza quepa a lo ancho
    const lejos = Math.max(1, anchoMinimo / camara.aspect)
    // Balanceo lento y giro a mano, alrededor del punto al que mira
    const giro = Math.sin(t / 5.2) * 0.07 + arrastre
    const dx = pos.x - mira.x
    const dz = pos.z - mira.z
    camara.position.set(
      mira.x + (dx * Math.cos(giro) - dz * Math.sin(giro)) * lejos,
      mira.y + (pos.y - mira.y) * lejos,
      mira.z + (dx * Math.sin(giro) + dz * Math.cos(giro)) * lejos,
    )
    camara.lookAt(mira)
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

  // --- Bucle: solo mientras la pieza está a la vista. El reloj de la escena no corre mientras tanto. ---
  const tareas: ((t: number, dt: number) => void)[] = []
  let reloj = 0
  let fijo: number | null = null
  let cuadro = 0
  let visible = true
  let anterior = performance.now()
  function pintar(ahora: number) {
    cuadro = visible ? requestAnimationFrame(pintar) : 0
    // Si el navegador se para (pestaña oculta), no se recupera de golpe lo perdido
    const dt = Math.min(0.1, (ahora - anterior) / 1000)
    anterior = ahora
    reloj += dt
    const t = fijo ?? reloj
    if (agarrado === null) {
      arrastre -= inercia
      inercia *= Math.exp(-dt / 0.2)
    }
    arrastre = Math.max(-giroMaximo, Math.min(giroMaximo, arrastre))
    for (const f of tareas) f(t, fijo === null ? dt : 0)
    encuadrar(t)
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
    escena,
    camara,
    renderizador,
    movil,
    encuadre,
    sombra,
    alPintar: (f) => void tareas.push(f),
    fijar: (t) => (fijo = t),
    destruir() {
      cancelAnimationFrame(cuadro)
      observadorTamano.disconnect()
      observadorVista.disconnect()
      renderizador.dispose()
    },
  }
}
