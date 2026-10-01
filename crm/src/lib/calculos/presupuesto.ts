// Cálculos del presupuesto. Mismas operaciones y en el mismo orden que partidaCostes y
// sumaResumen de referencia/IMTEX_plantilla_presupuestos.html: no se redondea por el camino,
// solo al mostrar. El test compara con las funciones originales.

export interface LineaCalculo {
  rendimiento: number
  coste_unitario: number
}

export interface PartidaCalculo {
  cantidad: number
  gg_pct: number
  ben_pct: number
  lineas: LineaCalculo[]
}

/** Costes de una unidad de la partida: directo, gastos generales, beneficio y total (PVP). */
export function partidaCostes(p: PartidaCalculo) {
  let coste = 0
  for (const l of p.lineas) coste += (Number(l.rendimiento) || 0) * (Number(l.coste_unitario) || 0)
  const gg = coste * ((Number(p.gg_pct) || 0) / 100)
  const ben = (coste + gg) * ((Number(p.ben_pct) || 0) / 100)
  return { coste, gg, ben, total: coste + gg + ben }
}

/** Totales del presupuesto: cada partida por su cantidad, más el IVA. */
export function sumaResumen(partidas: PartidaCalculo[], ivaPct: number) {
  let cd = 0
  let gg = 0
  let be = 0
  let base = 0
  for (const p of partidas) {
    const c = partidaCostes(p)
    const q = Number(p.cantidad) || 1 // como la herramienta: sin cantidad cuenta como 1
    cd += c.coste * q
    gg += c.gg * q
    be += c.ben * q
    base += c.total * q
  }
  const iva = (base * (Number(ivaPct) || 0)) / 100
  return { cd, gg, be, base, iva, total: base + iva }
}
