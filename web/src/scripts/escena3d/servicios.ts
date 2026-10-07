// «Cuatro oficios, una pieza»: un tablero de hormigón partido por una junta, sobre una viga y dos pilares.
// Solo y en bucle, la cámara pasa por cuatro zonas y en cada una se ve trabajar un servicio de IMTEX:
// 1. Impermeabilización: un rollo de lámina se desenrolla sobre la mitad izquierda del tablero.
// 2. Reparación y refuerzo: el cajeado de la viga se pasiva y se rellena de mortero con la llana,
//    y una banda de fibra de carbono se pega a lo largo de la viga.
// 3. Resinas: un pavimento continuo se extiende desde el punto de vertido sobre la mitad derecha.
// 4. Otros trabajos: la junta se sella con un cordón elastomérico y una corona de widia saca un testigo.
// Al final las capas se retiran y vuelve a empezar. La leyenda (servicios/index.astro) marca el servicio de
// cada momento; al pasar el ratón o el foco por uno, la pieza salta a él y espera.

import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Plane,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type BufferAttribute,
} from 'three'
import { crearEscena } from './base'
import { azar, lienzo2d, pintarCorte, pintarGrano, pintarHormigon, suave, tramo } from './texturas'

// --- Medidas. El suelo está en y = 0 ---
const T = 1.6 // cara de arriba del tablero
const CANTO = 0.32
const JUNTA = 0.045 // media junta
const TAB = { x0: -2.5, x1: 2.5, z0: -1.3, z1: 1.3 }
const VIGA = { x0: -2.3, x1: 2.3, y0: 0.72, y1: T - CANTO, z0: 0.55, z1: 1.1, piel: 0.09 }
const HUECO = { x0: -1.45, x1: -0.15, y0: 0.88, y1: 1.18 }
const VERTIDO = new Vector3(1.25, T, 0.1)
const CORONA = new Vector3(1.75, T, -0.55)

// --- Tiempos (segundos) ---
const TRAMOS = [
  [0, 5],
  [5, 10.2],
  [10.2, 15.2],
  [15.2, 20.6],
] as const
const RETIRA = [22.2, 23.1] as const
const VUELTA = 23.6

/** Encuadres: [posición de la cámara, punto al que mira] */
// Acercan la vista a cada zona sin perder la pieza: el panel es pequeño
const ENCUADRES = [
  [new Vector3(-2.4, 4.6, 5.6), new Vector3(-0.9, 1.3, 0.2)], // lámina
  [new Vector3(-0.1, 2.1, 7.2), new Vector3(-0.45, 1.05, 0.6)], // viga
  [new Vector3(3.0, 4.5, 5.4), new Vector3(1.0, 1.3, 0.1)], // resina
  [new Vector3(2.4, 4.6, 5.2), new Vector3(0.7, 1.4, -0.2)], // junta y corona
  [new Vector3(4.4, 4.8, 6.6), new Vector3(0, 1.15, 0.2)], // la pieza entera
] as const

export function montar(lienzo: HTMLCanvasElement, { raiz }: { raiz: HTMLElement }) {
  const rnd = azar(1504)
  const e = crearEscena(lienzo, { alcanceSombra: 4.5, anchoMinimo: 1.25, giroMaximo: 0.7 })
  const { escena, sombra } = e

  // --- Materiales de hormigón ---
  const grano = new CanvasTexture(pintarGrano(256, rnd))
  grano.wrapS = grano.wrapT = RepeatWrapping
  grano.repeat.set(4, 3)
  const textura = (l: HTMLCanvasElement) => {
    const t = new CanvasTexture(l)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    return t
  }
  const matCara = new MeshStandardMaterial({ map: textura(pintarHormigon(1024, 512, rnd, 138)), roughness: 0.93, bumpMap: grano, bumpScale: 1.6 })
  const matCorte = new MeshStandardMaterial({ map: textura(pintarCorte(1024, 256, rnd)), roughness: 0.95, bumpMap: grano, bumpScale: 2.2 })
  const matViga = new MeshStandardMaterial({ map: textura(pintarHormigon(1024, 256, rnd, 128)), roughness: 0.92, bumpMap: grano, bumpScale: 1.6 })

  const caja = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, material: MeshStandardMaterial | MeshStandardMaterial[]) => {
    const m = sombra(new Mesh(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material))
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    escena.add(m)
    return m
  }

  // Tablero en dos mitades, con la cara de arriba distinta de los cantos
  const tablero = [matCorte, matCorte, matCara, matCorte, matCorte, matCorte]
  caja(TAB.x0, -JUNTA, T - CANTO, T, TAB.z0, TAB.z1, tablero)
  caja(JUNTA, TAB.x1, T - CANTO, T, TAB.z0, TAB.z1, tablero)

  // Viga: un núcleo y una piel con el cajeado hecho (el hueco deja ver el núcleo y la armadura)
  const { x0, x1, y0, y1, z0, z1, piel } = VIGA
  caja(x0, x1, y0, y1, z0, z1 - piel, matViga)
  caja(x0, HUECO.x0, y0, y1, z1 - piel, z1, matViga)
  caja(HUECO.x1, x1, y0, y1, z1 - piel, z1, matViga)
  caja(HUECO.x0, HUECO.x1, y0, HUECO.y0, z1 - piel, z1, matViga)
  caja(HUECO.x0, HUECO.x1, HUECO.y1, y1, z1 - piel, z1, matViga)
  const fondoHueco = new Mesh(new PlaneGeometry(HUECO.x1 - HUECO.x0, HUECO.y1 - HUECO.y0), matCorte)
  fondoHueco.position.set((HUECO.x0 + HUECO.x1) / 2, (HUECO.y0 + HUECO.y1) / 2, z1 - piel + 0.002)
  fondoHueco.receiveShadow = true
  escena.add(fondoHueco)
  // Pilares
  for (const x of [-1.7, 1.7]) caja(x - 0.2, x + 0.2, 0, y0, (z0 + z1) / 2 - 0.2, (z0 + z1) / 2 + 0.2, matViga)

  // Armadura a la vista en el cajeado: oxidada, y pasivada antes de rellenar
  const OXIDO = new Color('#7a3319')
  const PASIVADO = new Color('#7e97b3')
  const matAcero = new MeshStandardMaterial({ color: OXIDO.clone(), roughness: 0.8, metalness: 0.4, bumpMap: grano, bumpScale: 3 })
  for (const y of [0.93, 1.05]) {
    const barra = new Mesh(new CylinderGeometry(0.017, 0.017, HUECO.x1 - HUECO.x0 + 0.02, 10), matAcero)
    barra.rotation.z = Math.PI / 2
    barra.position.set((HUECO.x0 + HUECO.x1) / 2, y, z1 - piel + 0.03)
    escena.add(barra)
  }

  // ---------------------------------------------------------------------------------------------
  // 1. Lámina
  // ---------------------------------------------------------------------------------------------
  const [lLamina, cLamina] = lienzo2d(512, 512)
  cLamina.fillStyle = '#34363e'
  cLamina.fillRect(0, 0, 512, 512)
  // Solapes entre rollos
  cLamina.fillStyle = 'rgba(200,204,212,0.22)'
  for (const y of [168, 340]) cLamina.fillRect(0, y, 512, 5)
  const matLamina = new MeshStandardMaterial({ map: textura(lLamina), roughness: 0.55, bumpMap: grano, bumpScale: 0.5 })
  const ANCHO_LAMINA = -JUNTA - 0.06 - (TAB.x0 + 0.05)
  const geoLamina = new PlaneGeometry(1, TAB.z1 - TAB.z0 - 0.1)
  geoLamina.rotateX(-Math.PI / 2)
  geoLamina.translate(0.5, 0, 0)
  const lamina = new Mesh(geoLamina, matLamina)
  lamina.position.set(TAB.x0 + 0.05, T + 0.004, 0)
  lamina.receiveShadow = true
  escena.add(lamina)
  const RADIO_ROLLO = 0.12
  const rollo = sombra(new Mesh(new CylinderGeometry(1, 1, TAB.z1 - TAB.z0 - 0.1, 28), matLamina), false)
  escena.add(rollo)

  // ---------------------------------------------------------------------------------------------
  // 2. Mortero, llana y fibra de carbono
  // ---------------------------------------------------------------------------------------------
  const matMortero = new MeshStandardMaterial({ color: '#c9c2b4', roughness: 0.9, bumpMap: grano, bumpScale: 1.1 })
  const geoMortero = new BoxGeometry(HUECO.x1 - HUECO.x0, HUECO.y1 - HUECO.y0, 1)
  geoMortero.translate(0, 0, 0.5)
  const mortero = new Mesh(geoMortero, matMortero)
  mortero.position.set((HUECO.x0 + HUECO.x1) / 2, (HUECO.y0 + HUECO.y1) / 2, z1 - piel)
  mortero.receiveShadow = true
  escena.add(mortero)

  const matCromo = new MeshStandardMaterial({ color: '#c9ced6', roughness: 0.22, metalness: 0.95 })
  const matRojo = new MeshStandardMaterial({ color: '#ff311e', roughness: 0.45 })
  const matNegro = new MeshStandardMaterial({ color: '#17171b', roughness: 0.5, metalness: 0.3 })
  const llana = new Group()
  {
    const hoja = sombra(new Mesh(new BoxGeometry(0.4, 0.14, 0.012), matCromo), false)
    const mango = sombra(new Mesh(new CylinderGeometry(0.028, 0.028, 0.24, 12), matRojo), false)
    mango.rotation.z = Math.PI / 2
    mango.position.z = 0.09
    const pie = new Mesh(new BoxGeometry(0.02, 0.02, 0.09), matNegro)
    pie.position.z = 0.045
    llana.add(hoja, mango, pie)
    escena.add(llana)
  }

  // Tejido de fibra de carbono: cuadros cruzados, negro con brillo
  const [lFibra, cFibra] = lienzo2d(128, 128)
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      const g = cFibra.createLinearGradient(i * 16, j * 16, i * 16 + ((i + j) % 2 ? 16 : 0), j * 16 + ((i + j) % 2 ? 0 : 16))
      g.addColorStop(0, '#1b1c21')
      g.addColorStop(0.5, '#3a3c45')
      g.addColorStop(1, '#16171b')
      cFibra.fillStyle = g
      cFibra.fillRect(i * 16, j * 16, 16, 16)
    }
  const texFibra = textura(lFibra)
  texFibra.wrapS = texFibra.wrapT = RepeatWrapping
  texFibra.repeat.set(30, 0.5)
  const matFibra = new MeshPhysicalMaterial({ map: texFibra, roughness: 0.32, clearcoat: 0.6 })
  const LARGO_FIBRA = x1 - x0 - 0.3
  const geoFibra = new PlaneGeometry(1, 0.1)
  geoFibra.translate(0.5, 0, 0)
  const fibra = new Mesh(geoFibra, matFibra)
  fibra.position.set(x0 + 0.15, (y0 + HUECO.y0) / 2, z1 + 0.003)
  escena.add(fibra)

  // ---------------------------------------------------------------------------------------------
  // 3. Resina, con el cubo vertiendo
  // ---------------------------------------------------------------------------------------------
  // Recortada al tablero de la derecha con cuatro planos
  const recorte = [
    new Plane(new Vector3(1, 0, 0), -(JUNTA + 0.02)),
    new Plane(new Vector3(-1, 0, 0), TAB.x1 - 0.02),
    new Plane(new Vector3(0, 0, 1), -(TAB.z0 + 0.02)),
    new Plane(new Vector3(0, 0, -1), TAB.z1 - 0.02),
  ]
  const matResina = new MeshPhysicalMaterial({ color: '#4f5566', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06, clippingPlanes: recorte })
  const geoResina = new CircleGeometry(1, 64)
  {
    // Borde irregular: así avanza un autonivelante
    const q = geoResina.attributes.position as BufferAttribute
    for (let i = 1; i < q.count; i++) {
      const a = Math.atan2(q.getY(i), q.getX(i))
      const k = 1 + 0.07 * Math.sin(a * 3 + 1) + 0.04 * Math.sin(a * 7)
      q.setXY(i, q.getX(i) * k, q.getY(i) * k)
    }
  }
  geoResina.rotateX(-Math.PI / 2)
  const resina = new Mesh(geoResina, matResina)
  resina.position.copy(VERTIDO).setY(T + 0.006)
  resina.receiveShadow = true
  escena.add(resina)

  const cubo = new Group()
  {
    const matCubo = new MeshStandardMaterial({ color: '#d9dce2', roughness: 0.6 })
    const cuerpo = sombra(new Mesh(new CylinderGeometry(0.17, 0.14, 0.36, 26, 1, true), matCubo), false)
    const fondo = new Mesh(new CircleGeometry(0.14, 26), matCubo)
    fondo.rotation.x = Math.PI / 2
    fondo.position.y = -0.18
    const etiqueta = new Mesh(new CylinderGeometry(0.165, 0.152, 0.12, 26, 1, true), matRojo)
    cuerpo.add(fondo, etiqueta)
    cubo.add(cuerpo)
    escena.add(cubo)
  }
  const chorro = new Mesh(new CylinderGeometry(0.025, 0.035, 1, 10), matResina.clone())
  ;(chorro.material as MeshPhysicalMaterial).clippingPlanes = []
  escena.add(chorro)

  // ---------------------------------------------------------------------------------------------
  // 4. Cordón de la junta y corona de widia
  // ---------------------------------------------------------------------------------------------
  const matCordon = new MeshStandardMaterial({ color: '#d6d8de', roughness: 0.4 })
  const geoCordon = new BoxGeometry(JUNTA * 2, 0.05, 1)
  geoCordon.translate(0, -0.025, 0.5)
  const cordon = new Mesh(geoCordon, matCordon)
  cordon.position.set(0, T - 0.004, TAB.z0)
  escena.add(cordon)
  const pistola = new Group()
  {
    const cartucho = sombra(new Mesh(new CylinderGeometry(0.045, 0.045, 0.3, 16), matRojo), false)
    const boquilla = new Mesh(new CylinderGeometry(0.008, 0.025, 0.12, 10), matNegro)
    boquilla.position.y = -0.2
    const asa = sombra(new Mesh(new BoxGeometry(0.03, 0.14, 0.05), matNegro), false)
    asa.position.set(0, 0.06, 0.07)
    pistola.add(cartucho, boquilla, asa)
    pistola.rotation.x = -0.6
    escena.add(pistola)
  }

  const taladro = new Group()
  const matCorona = new MeshStandardMaterial({ color: '#8b9099', roughness: 0.3, metalness: 0.9 })
  const corona = sombra(new Mesh(new CylinderGeometry(0.1, 0.1, 0.55, 28, 1, true), matCorona), false)
  corona.position.y = 0.275
  const motor = sombra(new Mesh(new BoxGeometry(0.22, 0.32, 0.22), matRojo), false)
  motor.position.y = 0.72
  const columna = sombra(new Mesh(new CylinderGeometry(0.025, 0.025, 1.1, 10), matCromo), false)
  columna.position.set(0.24, 0.55, 0)
  taladro.add(corona, motor, columna)
  escena.add(taladro)
  const testigo = sombra(new Mesh(new CylinderGeometry(0.088, 0.088, CANTO, 24), [matCorte, matCara, matCorte]))
  escena.add(testigo)
  const agujero = new Mesh(new CircleGeometry(0.1, 28), new MeshStandardMaterial({ color: '#0b0b0e', roughness: 1 }))
  agujero.rotation.x = -Math.PI / 2
  agujero.position.copy(CORONA).setY(T + 0.009)
  escena.add(agujero)
  const dentro = new Vector3()
  const tumbado = new Vector3(CORONA.x + 0.42, T + 0.088, CORONA.z + 0.12)

  // ---------------------------------------------------------------------------------------------
  // Estado: del momento del ciclo a lo que se ve
  // ---------------------------------------------------------------------------------------------
  function aplicar(c: number, t: number) {
    const retira = 1 - suave(tramo(c, ...RETIRA))

    // 1. Lámina: el rollo avanza, gira y adelgaza
    const avLamina = suave(tramo(c, 0.5, 4.4)) * retira
    lamina.visible = avLamina > 0.001
    lamina.scale.x = Math.max(0.001, ANCHO_LAMINA * avLamina)
    const r = RADIO_ROLLO * (1 - 0.35 * avLamina)
    rollo.visible = c > 0.2 && c < TRAMOS[0][1] + 0.4
    rollo.scale.set(r, 1, r)
    rollo.position.set(TAB.x0 + 0.05 + ANCHO_LAMINA * avLamina, T + r + 0.004, 0)
    // Gira sobre su eje mientras avanza
    rollo.rotation.set(Math.PI / 2, -(ANCHO_LAMINA * avLamina) / RADIO_ROLLO, 0)

    // 2. Pasivado, mortero con la llana y fibra de carbono
    matAcero.color.copy(OXIDO).lerp(PASIVADO, suave(tramo(c, 5.4, 6.2)) * retira)
    const avMortero = suave(tramo(c, 6.3, 8.0)) * retira
    mortero.visible = avMortero > 0.001
    mortero.scale.z = Math.max(0.001, piel * avMortero)
    llana.visible = c > 6.1 && c < 8.3
    llana.position.set((HUECO.x0 + HUECO.x1) / 2 + Math.sin(t * 5.5) * 0.3, (HUECO.y0 + HUECO.y1) / 2 + Math.sin(t * 2.1) * 0.03, z1 + 0.012)
    llana.rotation.z = Math.sin(t * 5.5) * 0.12
    const avFibra = suave(tramo(c, 8.3, 9.9)) * retira
    fibra.visible = avFibra > 0.001
    fibra.scale.x = Math.max(0.001, LARGO_FIBRA * avFibra)

    // 3. Resina: el cubo se inclina, vierte y la mancha se abre
    const inclina = suave(tramo(c, 10.3, 10.9)) * (1 - suave(tramo(c, 14.2, 14.8)))
    cubo.visible = c > 10.1 && c < 15
    cubo.position.set(VERTIDO.x + 0.3, T + 0.7 + 0.1 * (1 - inclina), VERTIDO.z)
    cubo.rotation.z = inclina * 1.9
    const vierte = c > 10.8 && c < 14.4
    chorro.visible = vierte
    const alto = 0.62
    chorro.scale.y = alto
    chorro.position.set(VERTIDO.x + 0.1, T + alto / 2, VERTIDO.z)
    const avResina = suave(tramo(c, 10.9, 14.8)) * retira
    resina.visible = avResina > 0.001
    resina.scale.setScalar(Math.max(0.001, 1.95 * Math.sqrt(avResina)))

    // 4. Cordón con la pistola, y la corona: baja, gira, entra y saca el testigo
    const avCordon = suave(tramo(c, 15.5, 17.4)) * retira
    cordon.visible = avCordon > 0.001
    cordon.scale.z = Math.max(0.001, (TAB.z1 - TAB.z0) * avCordon)
    pistola.visible = c > 15.3 && c < 17.6
    pistola.position.set(0, T + 0.24, TAB.z0 + (TAB.z1 - TAB.z0) * avCordon + 0.12)

    const baja = suave(tramo(c, 17.5, 18.1))
    const entra = tramo(c, 18.1, 19.4)
    const sube = suave(tramo(c, 19.5, 20.2))
    taladro.visible = c > 17.2 && c < 21.2
    const yCorona = T + 0.9 * (1 - baja) - CANTO * 0.92 * entra + (CANTO + 0.9) * sube
    taladro.position.set(CORONA.x, yCorona, CORONA.z)
    corona.rotation.y = entra > 0 && entra < 1 ? t * 30 : 0
    // El testigo sube dentro de la corona y luego queda tumbado al lado del agujero
    const hecho = c > 19.5
    const fuera = suave(tramo(c, 20.3, 20.9))
    testigo.visible = hecho && retira > 0.02
    dentro.set(CORONA.x, yCorona + CANTO / 2, CORONA.z)
    testigo.position.lerpVectors(dentro, tumbado, fuera)
    testigo.rotation.z = (fuera * Math.PI) / 2
    testigo.scale.setScalar(Math.max(0.001, retira))
    agujero.visible = hecho && retira > 0.5
  }

  // --- Cámara: un encuadre por servicio y la pieza entera al final ---
  const tramoActivo = (c: number) => TRAMOS.findIndex(([a, b]) => c >= a && c < b)
  function encuadrar(c: number) {
    // Cada cambio de encuadre dura 1,1 s, al empezar el tramo
    let desde = 4
    let hasta = 0
    let f = 1
    const i = tramoActivo(c)
    if (i >= 0) {
      desde = i === 0 ? 4 : i - 1
      hasta = i
      f = suave(tramo(c, TRAMOS[i][0], TRAMOS[i][0] + 1.1))
    } else if (c >= TRAMOS[3][1]) {
      desde = 3
      hasta = 4
      f = suave(tramo(c, TRAMOS[3][1], TRAMOS[3][1] + 1.3))
    }
    e.encuadre.pos.lerpVectors(ENCUADRES[desde][0], ENCUADRES[hasta][0], f)
    e.encuadre.mira.lerpVectors(ENCUADRES[desde][1], ENCUADRES[hasta][1], f)
  }

  // --- Leyenda: marca el servicio de ahora; al señalar uno, la pieza va a él y espera ---
  const pasos = [...raiz.querySelectorAll<HTMLElement>('[data-paso]')]
  let marcado = -2
  let desfase = 0
  let retenido: number | null = null
  let ultimo = 0
  const ciclo = (t: number) => (((t + desfase) % VUELTA) + VUELTA) % VUELTA
  pasos.forEach((p, i) => {
    const ir = () => {
      retenido = i
      desfase += TRAMOS[i][0] + 0.01 - ciclo(ultimo)
    }
    const soltar = () => (retenido = null)
    p.addEventListener('pointerenter', ir)
    p.addEventListener('focus', ir)
    p.addEventListener('pointerleave', soltar)
    p.addEventListener('blur', soltar)
  })

  e.alPintar((t, dt) => {
    ultimo = t
    // Retenido: el reloj se para al final del tramo señalado
    if (retenido !== null && ciclo(t) >= TRAMOS[retenido][1] - 0.15) desfase -= dt
    const c = ciclo(t)
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
