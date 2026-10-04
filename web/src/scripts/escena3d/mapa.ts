// El mapa de obras: la península, Baleares y Canarias (en su recuadro) en relieve oscuro con el canto rojo.
// Dos modos:
// - obras: las obras se encienden una a una, de la más antigua a la más reciente, con su baliza; la leyenda
//   (HTML, en obras/index.astro) dice cuál es y enlaza a su ficha. Al final, todas encendidas, y vuelta a empezar.
// - contacto: desde la sede salen arcos hacia los sitios donde hay obras.
// El contorno sale de lib/mapa-iberia.json (scripts/generar-mapa.mjs) y los puntos llegan ya proyectados (lib/lugares.ts).

import {
  BufferAttribute,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineLoop,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  QuadraticBezierCurve3,
  RepeatWrapping,
  RingGeometry,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import mapa from '../../lib/mapa-iberia.json'
import { crearEscena } from './base'
import { azar, pintarGrano, suave, tramo } from './texturas'

interface Obra {
  slug: string
  titulo: string
  lugar: string
  anio: string
  x: number
  y: number
}
interface Destino {
  nombre: string
  x: number
  y: number
}
type Datos = { sede: [number, number]; obras?: Obra[]; destinos?: Destino[] }

/** Alto del relieve */
const ALTO = 0.22
/** Segundos que se queda encendida cada obra */
const PASO = 2.4
const ROJO = '#ff311e'

export function montar(lienzo: HTMLCanvasElement, { raiz, datos, modo }: { raiz: HTMLElement; datos: unknown; modo: string }) {
  const { sede, obras = [], destinos = [] } = datos as Datos
  const rnd = azar(724)
  const e = crearEscena(lienzo, { alcanceSombra: 8, apertura: 30, anchoMinimo: 1.05, giroMaximo: 0.6 })
  const { escena, sombra } = e

  // Del plano del mapa a la escena: el norte se aleja de la cámara
  const punto = (x: number, y: number, alto = ALTO) => new Vector3(x, alto, -y)

  // --- Relieve ---
  const grano = new CanvasTexture(pintarGrano(256, rnd, 0.8))
  grano.wrapS = grano.wrapT = RepeatWrapping
  grano.repeat.set(0.7, 0.7)
  const matTapa = new MeshStandardMaterial({ color: '#2d2f37', roughness: 0.82, bumpMap: grano, bumpScale: 1.4 })
  const matCanto = new MeshStandardMaterial({ color: ROJO, roughness: 0.55 })
  const tierra = new Group()
  for (const anillo of [...mapa.peninsula, ...mapa.islasCanarias]) {
    const forma = new Shape(anillo.map(([x, y]) => new Vector2(x, y)))
    const geo = new ExtrudeGeometry(forma, { depth: ALTO, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 })
    geo.rotateX(-Math.PI / 2)
    tierra.add(sombra(new Mesh(geo, [matTapa, matCanto])))
  }
  escena.add(tierra)

  // Recuadro de Canarias
  const [x0, y0, x1, y1] = mapa.marco
  const marco = new LineLoop(
    new BufferGeometry().setFromPoints([punto(x0, y0, 0.01), punto(x1, y0, 0.01), punto(x1, y1, 0.01), punto(x0, y1, 0.01)]),
    new LineBasicMaterial({ color: '#7c8190' }),
  )
  escena.add(marco)

  // --- Balizas ---
  const matGris = new MeshStandardMaterial({ color: '#b9bec9', roughness: 0.5 })
  const matRojo = new MeshStandardMaterial({ color: ROJO, roughness: 0.4, emissive: ROJO, emissiveIntensity: 0.5 })
  const matTinta = new MeshStandardMaterial({ color: '#f0f1f3', roughness: 0.4 })
  const geoVara = new CylinderGeometry(0.024, 0.024, 1, 10)
  geoVara.translate(0, 0.5, 0)
  const geoCabeza = new SphereGeometry(0.075, 18, 14)
  const geoOnda = new RingGeometry(0.09, 0.13, 48)
  geoOnda.rotateX(-Math.PI / 2)

  function baliza(x: number, y: number) {
    const grupo = new Group()
    grupo.position.copy(punto(x, y))
    const vara = sombra(new Mesh(geoVara, matGris), false)
    const cabeza = sombra(new Mesh(geoCabeza, matGris), false)
    const onda = new Mesh(geoOnda, new MeshBasicMaterial({ color: ROJO, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false }))
    onda.position.y = 0.004
    grupo.add(vara, cabeza, onda)
    escena.add(grupo)
    return {
      /** encendida: 0 apagada, 1 la de ahora. hecha: ya se encendió en esta vuelta. */
      poner(encendida: number, hecha: boolean, t: number) {
        const alto = 0.1 + 1.1 * suave(encendida) + (hecha ? 0.1 : 0)
        vara.scale.y = alto
        cabeza.position.y = alto
        cabeza.scale.setScalar(1 + 0.6 * encendida)
        const roja = encendida > 0.05 || hecha
        vara.material = cabeza.material = roja ? matRojo : matGris
        // La onda se abre y se apaga mientras está encendida
        const ciclo = (t * 0.9) % 1
        onda.scale.setScalar(1 + ciclo * 5)
        ;(onda.material as MeshBasicMaterial).opacity = encendida * (1 - ciclo) * 0.8
      },
    }
  }

  // La sede: un bloque claro
  const bloqueSede = sombra(new Mesh(new CylinderGeometry(0.1, 0.1, 0.16, 4), matTinta), false)
  bloqueSede.rotation.y = Math.PI / 4
  bloqueSede.position.copy(punto(...sede, ALTO + 0.08))
  escena.add(bloqueSede)

  // Encuadre: todo el mapa, algo inclinado
  // El centro del conjunto (península y recuadro de Canarias), no solo de la península
  const centro = punto(0.2, -1.35, 0)
  const vista = new Vector3(0.9, 16.4, 12.4)
  e.encuadre.mira.copy(centro)
  e.encuadre.pos.copy(centro).add(vista)
  const mira = centro.clone()
  const hacia = new Vector3()

  if (modo === 'contacto') montarArcos()
  else montarObras()

  function montarObras() {
    // De la más antigua a la más reciente; las que comparten sitio se separan un poco en corro
    const orden = [...obras].sort((a, b) => parseInt(a.anio) - parseInt(b.anio))
    const porSitio = new Map<string, number>()
    orden.forEach((o) => porSitio.set(`${o.x},${o.y}`, (porSitio.get(`${o.x},${o.y}`) ?? 0) + 1))
    const vistos = new Map<string, number>()
    const balizas = orden.map((o) => {
      const clave = `${o.x},${o.y}`
      const n = porSitio.get(clave)!
      const k = vistos.get(clave) ?? 0
      vistos.set(clave, k + 1)
      const a = (k / n) * Math.PI * 2 + 0.6
      const r = n > 1 ? 0.14 : 0
      return baliza(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r)
    })
    const encendida = new Float32Array(orden.length)

    // Leyenda
    const enlace = raiz.querySelector<HTMLAnchorElement>('[data-obra]')
    const cuenta = raiz.querySelector('[data-cuenta]')
    const titulo = raiz.querySelector('[data-titulo]')
    const lugar = raiz.querySelector('[data-lugar]')
    let rotulada = -2
    const dos = (n: number) => String(n).padStart(2, '0')

    const vuelta = orden.length * PASO + 3
    e.alPintar((t, dt) => {
      const ciclo = t % vuelta
      const activa = ciclo < orden.length * PASO ? Math.floor(ciclo / PASO) : -1
      const suavizado = dt > 0 ? 1 - Math.exp(-dt / 0.25) : 1
      balizas.forEach((b, i) => {
        encendida[i] += ((i === activa ? 1 : 0) - encendida[i]) * suavizado
        b.poner(encendida[i], activa === -1 || i < activa, t)
      })
      // La cámara se va un poco hacia la obra de ahora
      const destino = activa >= 0 ? punto(orden[activa].x, orden[activa].y, 0) : centro
      mira.lerp(hacia.lerpVectors(centro, destino, 0.15), suavizado * 0.5)
      e.encuadre.mira.copy(mira)
      e.encuadre.pos.copy(mira).add(vista)

      if (activa !== rotulada && enlace && cuenta && titulo && lugar) {
        rotulada = activa
        if (activa >= 0) {
          const o = orden[activa]
          enlace.href = `/obras/${o.slug}`
          cuenta.textContent = `${dos(activa + 1)}/${dos(orden.length)}`
          titulo.textContent = o.titulo
          lugar.textContent = [o.lugar, o.anio].filter(Boolean).join(' · ')
        } else {
          enlace.href = '/obras'
          cuenta.textContent = `${orden.length} obras`
          titulo.textContent = 'De Bilbao a La Palma, y en Lisboa'
          lugar.textContent = 'Desde 2010'
        }
      }
    })
  }

  function montarArcos() {
    const origen = punto(...sede, ALTO + 0.1)
    const matArco = new MeshBasicMaterial({ color: ROJO, transparent: true })
    const arcos = destinos.map((d) => {
      const fin = punto(d.x, d.y, ALTO)
      const largo = origen.distanceTo(fin)
      const alto = new Vector3().addVectors(origen, fin).multiplyScalar(0.5).setY(ALTO + 0.4 + largo * 0.32)
      const geo = new TubeGeometry(new QuadraticBezierCurve3(origen, alto, fin), 48, 0.014, 6)
      const malla = new Mesh(geo, matArco)
      escena.add(malla)
      return { malla, total: (geo.index as BufferAttribute).count, llegada: baliza(d.x, d.y), nombre: d.nombre, largo }
    })
    // Primero los cercanos
    arcos.sort((a, b) => a.largo - b.largo)
    const destinoRotulo = raiz.querySelector('[data-destino]')
    let rotulado = -2

    const SALIDA = 0.45
    const VUELO = 1.3
    const vuelta = arcos.length * SALIDA + VUELO + 2.5
    e.alPintar((t) => {
      const ciclo = t % vuelta
      const apaga = 1 - tramo(ciclo, vuelta - 0.8, vuelta)
      matArco.opacity = 0.9 * apaga
      let ultimo = -1
      arcos.forEach((a, i) => {
        const avance = suave(tramo(ciclo, i * SALIDA, i * SALIDA + VUELO))
        a.malla.geometry.setDrawRange(0, Math.floor((a.total * avance) / 6) * 6)
        a.malla.visible = avance > 0
        const llego = tramo(ciclo, i * SALIDA + VUELO * 0.9, i * SALIDA + VUELO * 1.3)
        a.llegada.poner(llego * (1 - tramo(ciclo, i * SALIDA + VUELO * 1.3, i * SALIDA + VUELO * 2.2)) * apaga, llego > 0 && apaga > 0.5, t)
        if (avance > 0) ultimo = i
      })
      if (destinoRotulo && ultimo !== rotulado) {
        rotulado = ultimo
        destinoRotulo.textContent = ultimo >= 0 ? arcos[ultimo].nombre : 'toda la península'
      }
    })
  }

  return e
}
