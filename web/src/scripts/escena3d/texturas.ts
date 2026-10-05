// Utilidades comunes a las piezas 3D: azar con semilla, curvas de avance y texturas pintadas en un canvas.
// Las usan la maqueta de la portada (scripts/pieza.ts) y los objetos de las páginas interiores.

import { CanvasTexture } from 'three'

/** Generador con semilla: la pieza sale igual en todas las visitas */
export function azar(semilla: number) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Avance de 0 a 1 de `p` entre `desde` y `hasta` */
export const tramo = (p: number, desde: number, hasta: number) => Math.min(1, Math.max(0, (p - desde) / (hasta - desde)))
/** Arranca y para sin brusquedad */
export const suave = (t: number) => t * t * (3 - 2 * t)
export const mezcla = (a: number, b: number, t: number) => a + (b - a) * t

export const lienzo2d = (w: number, h: number) => {
  const l = document.createElement('canvas')
  l.width = w
  l.height = h
  return [l, l.getContext('2d')!] as const
}

/** Hormigón: gris con nubes, árido fino y poros. `tono` es el gris de base (0-255). */
export function pintarHormigon(w: number, h: number, rnd: () => number, tono = 168) {
  const [l, ctx] = lienzo2d(w, h)
  ctx.fillStyle = `rgb(${tono},${tono + 2},${tono + 6})`
  ctx.fillRect(0, 0, w, h)
  // Nubes grandes: el hormigón nunca es de un color plano
  for (let i = 0; i < 60; i++) {
    const x = rnd() * w
    const y = rnd() * h
    const r = 60 + rnd() * 220
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const c = rnd() < 0.5 ? 255 : 0
    g.addColorStop(0, `rgba(${c},${c},${c},${0.03 + rnd() * 0.05})`)
    g.addColorStop(1, `rgba(${c},${c},${c},0)`)
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // Árido fino y poros
  for (let i = 0; i < (w * h) / 55; i++) {
    const c = rnd() < 0.6 ? 20 : 250
    ctx.fillStyle = `rgba(${c},${c},${c},${0.03 + rnd() * 0.09})`
    const r = 0.5 + rnd() * 1.8
    ctx.beginPath()
    ctx.ellipse(rnd() * w, rnd() * h, r, r * (0.6 + rnd() * 0.5), rnd() * 3.14, 0, 6.3)
    ctx.fill()
  }
  for (let i = 0; i < (w * h) / 2600; i++) {
    ctx.fillStyle = `rgba(30,30,34,${0.25 + rnd() * 0.3})`
    ctx.beginPath()
    ctx.arc(rnd() * w, rnd() * h, 0.8 + rnd() * 1.6, 0, 6.3)
    ctx.fill()
  }
  return l
}

/** Corte de hormigón: se ven los áridos gruesos. Para los cantos y el fondo de los cajeados. */
export function pintarCorte(w: number, h: number, rnd: () => number) {
  const l = pintarHormigon(w, h, rnd, 132)
  const ctx = l.getContext('2d')!
  for (let i = 0; i < (w * h) / 700; i++) {
    const g = 95 + rnd() * 110
    ctx.fillStyle = `rgba(${g},${g - 4},${g - 10},${0.5 + rnd() * 0.4})`
    const r = 2 + rnd() * 7
    ctx.beginPath()
    ctx.ellipse(rnd() * w, rnd() * h, r, r * (0.5 + rnd() * 0.5), rnd() * 3.14, 0, 6.3)
    ctx.fill()
  }
  return l
}

/** Relieve de grano (para bumpMap): ruido fino en grises */
export function pintarGrano(tam: number, rnd: () => number, fuerza = 1) {
  const [l, ctx] = lienzo2d(tam, tam)
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, tam, tam)
  for (let i = 0; i < tam * tam * 0.45; i++) {
    const c = rnd() < 0.5 ? 0 : 255
    ctx.fillStyle = `rgba(${c},${c},${c},${(0.08 + rnd() * 0.22) * fuerza})`
    ctx.beginPath()
    ctx.arc(rnd() * tam, rnd() * tam, 0.6 + rnd() * 2.2, 0, 6.3)
    ctx.fill()
  }
  return l
}

/** Mapa de normales de agua en calma: unas pocas ondas cruzadas que repiten sin costura */
export function pintarOndas(tam: number) {
  const [l, ctx] = lienzo2d(tam, tam)
  const img = ctx.createImageData(tam, tam)
  const k = (2 * Math.PI) / tam
  // [ciclos en x, ciclos en y, fase]
  const ondas = [
    [3, 1, 0],
    [1, 4, 1.3],
    [5, -2, 2.1],
    [-2, 3, 0.7],
    [7, 5, 4],
  ]
  for (let y = 0; y < tam; y++)
    for (let x = 0; x < tam; x++) {
      let dx = 0
      let dy = 0
      for (const [fx, fy, fase] of ondas) {
        const c = Math.cos(k * (fx * x + fy * y) + fase) / Math.hypot(fx, fy)
        dx += fx * c
        dy += fy * c
      }
      const n = Math.hypot(dx * 0.25, dy * 0.25, 1)
      const o = (y * tam + x) * 4
      img.data[o] = ((-dx * 0.25) / n) * 127.5 + 127.5
      img.data[o + 1] = ((-dy * 0.25) / n) * 127.5 + 127.5
      img.data[o + 2] = (1 / n) * 127.5 + 127.5
      img.data[o + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  return l
}

/** Punto redondo y difuso para las partículas */
export function pintarPunto() {
  const [l, ctx] = lienzo2d(48, 48)
  const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 24)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 48, 48)
  return new CanvasTexture(l)
}
