// Cálculos del control de obra. Mismas operaciones y en el mismo orden que getMonthConsolidated,
// computeMonthlyData y renderResumen de referencia/IMTEX_control_obra.html.
// Parten de las sumas por obra y mes de la vista SQL control_obra_mensual. El test compara con
// las funciones y los datos de ejemplo originales.

/** Sumas de un mes: lo certificado y cada tipo de coste. */
export interface SumasMes {
  mes: string
  certificacion: number
  personal: number
  subcontrata: number
  materiales: number
  alquileres: number
  combustible: number
  dietas: number
  hoteles: number
}

/** Resultado de un mes. La estructura es el % de gastos generales sobre lo certificado, a 2 decimales. */
export function consolidarMes(s: SumasMes, gastosGeneralesPct: number) {
  const gastosPct = Number(gastosGeneralesPct) || 0
  const costeEstructura = parseFloat(((s.certificacion * gastosPct) / 100).toFixed(2))
  const costesDirectos = s.personal + s.subcontrata + s.materiales + s.alquileres + s.combustible
  const costesIndirectos = s.dietas + s.hoteles
  const costesTotales = costesDirectos + costesIndirectos
  const sumatorioCostes = costesTotales + costeEstructura
  const resultadoMes = s.certificacion - sumatorioCostes
  const margenPct = s.certificacion > 0 ? (resultadoMes / s.certificacion) * 100 : 0
  return {
    ...s,
    costeEstructura,
    costesDirectos,
    costesIndirectos,
    costesTotales,
    sumatorioCostes,
    resultadoMes,
    margenPct,
  }
}

/** Toda la obra: cada mes con sus acumulados a origen, los totales y los indicadores del resumen. */
export function calcularObra(sumas: SumasMes[], gastosGeneralesPct: number, importePedido: number) {
  let sumCert = 0
  let sumPers = 0
  let sumSub = 0
  let sumMat = 0
  let sumAlq = 0
  let sumComb = 0
  let sumDie = 0
  let sumHot = 0
  let sumEst = 0
  let sumTotMasEst = 0
  let sumRes = 0

  const meses = sumas.map((s) => {
    const c = consolidarMes(s, gastosGeneralesPct)
    sumCert += c.certificacion
    sumPers += c.personal
    sumSub += c.subcontrata
    sumMat += c.materiales
    sumAlq += c.alquileres
    sumComb += c.combustible
    sumDie += c.dietas
    sumHot += c.hoteles
    sumEst += c.costeEstructura
    sumTotMasEst += c.sumatorioCostes
    sumRes += c.resultadoMes
    return {
      ...c,
      certOrigen: sumCert,
      costesOrigen: sumTotMasEst,
      resultadoOrigen: sumRes,
      margenOrigenPct: sumCert > 0 ? (sumRes / sumCert) * 100 : 0,
    }
  })

  return {
    meses,
    totales: {
      sumCert,
      sumPers,
      sumSub,
      sumMat,
      sumAlq,
      sumComb,
      sumDie,
      sumHot,
      sumEst,
      sumDirectos: sumPers + sumSub + sumMat + sumAlq + sumComb,
      sumTotMasEst,
      sumRes,
    },
    pendientePedido: Math.max(0, importePedido - sumCert),
    pctAvance: importePedido > 0 ? (sumCert / importePedido) * 100 : 0,
    margenGlobal: sumCert > 0 ? (sumRes / sumCert) * 100 : 0,
  }
}

// Meses ----------------------------------------------------------------------------

const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** «2026-09-17» → «2026-09-01»: el mes de imputación que se propone para una fecha. */
export const mesDeFecha = (fecha: string) => `${fecha.slice(0, 7)}-01`

/** «2026-09-01» → «septiembre-26», como la herramienta. */
export function etiquetaMes(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number)
  return `${MESES_ES[numero - 1]}-${String(anio % 100).padStart(2, '0')}`
}

const SIN_APUNTES = {
  certificacion: 0,
  personal: 0,
  subcontrata: 0,
  materiales: 0,
  alquileres: 0,
  combustible: 0,
  dietas: 0,
  hoteles: 0,
}

/** Del primer al último mes con apuntes, sin huecos: los meses sin movimiento salen a cero. */
export function rellenarMeses(sumas: SumasMes[]): SumasMes[] {
  if (sumas.length === 0) return []
  const porMes = new Map(sumas.map((s) => [s.mes, s]))
  const ordenados = [...porMes.keys()].sort()
  const [ultimoAnio, ultimoMes] = ordenados[ordenados.length - 1].split('-').map(Number)
  let [anio, mes] = ordenados[0].split('-').map(Number)
  const resultado: SumasMes[] = []
  while (anio < ultimoAnio || (anio === ultimoAnio && mes <= ultimoMes)) {
    const clave = `${anio}-${String(mes).padStart(2, '0')}-01`
    resultado.push(porMes.get(clave) ?? { mes: clave, ...SIN_APUNTES })
    if (++mes > 12) {
      mes = 1
      anio++
    }
  }
  return resultado
}

/** Semáforo del margen, como la herramienta: más del 15 % bien, entre 5 y 15 % justo, menos mal. */
export function nivelMargen(pct: number): 'bien' | 'justo' | 'mal' {
  if (pct > 15) return 'bien'
  return pct >= 5 ? 'justo' : 'mal'
}

// Certificaciones -------------------------------------------------------------------

interface CertificacionOrigen {
  id: string
  numero: number
  importe_origen: number
}

/**
 * Importe a origen de la certificación anterior a la número `numero` (0 si es la primera).
 * Lo certificado en un mes es su importe a origen menos este. Como recomputeCertChain de la herramienta.
 */
export function origenAnterior(numero: number, certificaciones: CertificacionOrigen[], idPropia?: string): number {
  let anterior: CertificacionOrigen | undefined
  for (const c of certificaciones) {
    if (c.id === idPropia || c.numero >= numero) continue
    if (!anterior || c.numero > anterior.numero) anterior = c
  }
  return anterior?.importe_origen ?? 0
}
