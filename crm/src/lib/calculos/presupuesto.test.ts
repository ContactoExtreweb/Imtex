import { describe, expect, test } from 'vitest'
import herramienta from '../../../../referencia/IMTEX_plantilla_presupuestos.html?raw'
import { partidaCostes, sumaResumen, type PartidaCalculo } from './presupuesto'

// Se ejecutan las funciones ORIGINALES de la herramienta de IMTEX, sacadas de su HTML,
// y se comparan con las nuestras. Si alguien cambia una fórmula, esto falla.
function funcionOriginal(nombre: string): string {
  const fuente = new RegExp(`function ${nombre}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`).exec(herramienta)
  if (!fuente) throw new Error(`No se encuentra ${nombre} en la herramienta`)
  return fuente[0]
}

interface EstadoOriginal {
  basePrecios: { id: string; coste: number }[]
  partidas: unknown[]
  obra: { iva: number }
}
type Costes = ReturnType<typeof partidaCostes>
type Resumen = ReturnType<typeof sumaResumen>

function original(state: EstadoOriginal) {
  const crear = new Function(
    'state',
    `${funcionOriginal('costeUnitLinea')}\n${funcionOriginal('partidaCostes')}\n${funcionOriginal('sumaResumen')}\nreturn { partidaCostes, sumaResumen }`,
  )
  return crear(state) as { partidaCostes: (p: unknown) => Costes; sumaResumen: () => Resumen }
}

/** Compara un presupuesto nuestro con el mismo en el formato de la herramienta (líneas de precio libre). */
function comparar(partidas: PartidaCalculo[], iva: number) {
  const state: EstadoOriginal = {
    basePrecios: [],
    obra: { iva },
    partidas: partidas.map((p) => ({
      cantidad: p.cantidad,
      ggPct: p.gg_pct,
      benPct: p.ben_pct,
      lineas: p.lineas.map((l) => ({ refId: null, libre: { coste: l.coste_unitario }, rendimiento: l.rendimiento })),
    })),
  }
  const ref = original(state)
  partidas.forEach((p, i) => expect(partidaCostes(p)).toEqual(ref.partidaCostes(state.partidas[i])))
  const { cd, gg, be, base, iva: cuotaIva, total } = ref.sumaResumen()
  expect(sumaResumen(partidas, iva)).toEqual({ cd, gg, be, base, iva: cuotaIva, total })
}

describe('presupuesto: mismos resultados que la herramienta de IMTEX', () => {
  test('ejemplo que trae la herramienta (cargarEjemplo), con precios de la base', () => {
    // Base de precios y partidas copiadas de cargarEjemplo()
    const base = [25, 19, 18.5, 78, 1.05, 6.2, 6, 52, 38].map((coste, i) => ({ id: `p${i}`, coste }))
    const lineas = (...pares: [number, number][]) =>
      pares.map(([precio, rendimiento]) => ({ refId: `p${precio}`, rendimiento }))
    const state: EstadoOriginal = {
      basePrecios: base,
      obra: { iva: 21 },
      partidas: [
        { ggPct: 13, benPct: 6, lineas: lineas([2, 12.5], [0, 4], [8, 4]) },
        { ggPct: 13, benPct: 6, lineas: lineas([7, 18], [1, 6]) },
        { ggPct: 13, benPct: 6, lineas: lineas([3, 3.2], [4, 90], [6, 8], [0, 10], [1, 8]) },
      ],
    }
    // Lo mismo en nuestro formato: el coste va copiado en cada línea y la cantidad es 1
    const nuestras: PartidaCalculo[] = (state.partidas as { lineas: { refId: string; rendimiento: number }[] }[]).map(
      (p) => ({
        cantidad: 1,
        gg_pct: 13,
        ben_pct: 6,
        lineas: p.lineas.map((l) => ({
          rendimiento: l.rendimiento,
          coste_unitario: base.find((b) => b.id === l.refId)!.coste,
        })),
      }),
    )
    const ref = original(state)
    nuestras.forEach((p, i) => expect(partidaCostes(p)).toEqual(ref.partidaCostes(state.partidas[i])))
    const r = ref.sumaResumen()
    const n = sumaResumen(nuestras, 21)
    expect(n).toEqual({ cd: r.cd, gg: r.gg, be: r.be, base: r.base, iva: r.iva, total: r.total })
    // Y las cifras calculadas a mano, para que el test no dependa solo de la comparación
    expect(n.cd.toFixed(2)).toBe('2327.35') // 483,25 + 1.050,00 + 794,10
    expect(n.base.toFixed(2)).toBe('2787.70') // × 1,13 × 1,06
    expect(n.total.toFixed(2)).toBe('3373.12') // + 21 % de IVA
  })

  test('cantidades, porcentajes de la plantilla de IMTEX y decimales incómodos', () => {
    comparar(
      [
        { cantidad: 250, gg_pct: 16, ben_pct: 35, lineas: [{ rendimiento: 0.15, coste_unitario: 78 }, { rendimiento: 1.05, coste_unitario: 3.8 }] },
        { cantidad: 12.5, gg_pct: 16, ben_pct: 35, lineas: [{ rendimiento: 0.333333, coste_unitario: 17.5 }] },
        { cantidad: 0, gg_pct: 0, ben_pct: 0, lineas: [{ rendimiento: 1, coste_unitario: 0.1 }, { rendimiento: 3, coste_unitario: 0.2 }] },
        { cantidad: 1, gg_pct: 13, ben_pct: 6, lineas: [] },
      ],
      21,
    )
  })

  test('300 presupuestos generados (siempre los mismos)', () => {
    // Generador determinista: mismos casos en cada ejecución
    let semilla = 20260928
    const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648
    const entre = (min: number, max: number, decimales: number) =>
      Number((min + azar() * (max - min)).toFixed(decimales))
    for (let caso = 0; caso < 300; caso++) {
      const partidas: PartidaCalculo[] = Array.from({ length: 1 + Math.floor(azar() * 12) }, () => ({
        cantidad: entre(0.5, 2000, 2),
        gg_pct: entre(0, 25, 2),
        ben_pct: entre(0, 40, 2),
        lineas: Array.from({ length: Math.floor(azar() * 8) }, () => ({
          rendimiento: entre(0.001, 50, 4),
          coste_unitario: entre(0.01, 900, 2),
        })),
      }))
      comparar(partidas, [21, 10, 0][caso % 3])
    }
  })
})
