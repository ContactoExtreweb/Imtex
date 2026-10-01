import { euros, pct } from '../formato'
import { etiquetaMes, type calcularObra } from './control-obra'

// La matriz mensual de una obra, tal como se enseña en la ficha, en el informe impreso y en el CSV.

export type Calculo = ReturnType<typeof calcularObra>
type Mes = Calculo['meses'][number]
/** Campos numéricos de un mes calculado */
type CampoMes = { [K in keyof Mes]: Mes[K] extends number ? K : never }[keyof Mes]

export interface FilaMatriz {
  campo: CampoMes
  etiqueta: string
  tipo?: 'resultado' | 'margen'
  fuerte?: boolean
  /** Valor de la columna «Total» (los acumulados a origen no la tienen) */
  total?: (c: Calculo) => number
}

/** Mismas filas y en el mismo orden que la matriz de la herramienta de IMTEX. */
export const FILAS_MATRIZ: FilaMatriz[] = [
  { campo: 'certificacion', etiqueta: 'Certificación', fuerte: true, total: (c) => c.totales.sumCert },
  { campo: 'costeEstructura', etiqueta: 'Coste de estructura', total: (c) => c.totales.sumEst },
  { campo: 'personal', etiqueta: 'Personal (horas)', total: (c) => c.totales.sumPers },
  { campo: 'subcontrata', etiqueta: 'Subcontrata', total: (c) => c.totales.sumSub },
  { campo: 'combustible', etiqueta: 'Combustible', total: (c) => c.totales.sumComb },
  { campo: 'dietas', etiqueta: 'Dietas', total: (c) => c.totales.sumDie },
  { campo: 'hoteles', etiqueta: 'Hoteles', total: (c) => c.totales.sumHot },
  { campo: 'alquileres', etiqueta: 'Alquileres', total: (c) => c.totales.sumAlq },
  { campo: 'materiales', etiqueta: 'Materiales', total: (c) => c.totales.sumMat },
  {
    campo: 'costesTotales',
    etiqueta: 'Costes totales',
    fuerte: true,
    total: (c) => c.totales.sumDirectos + c.totales.sumDie + c.totales.sumHot,
  },
  { campo: 'sumatorioCostes', etiqueta: 'Costes + estructura', fuerte: true, total: (c) => c.totales.sumTotMasEst },
  { campo: 'resultadoMes', etiqueta: 'Resultado del mes', tipo: 'resultado', fuerte: true, total: (c) => c.totales.sumRes },
  { campo: 'margenPct', etiqueta: 'Margen del mes', tipo: 'margen', fuerte: true, total: (c) => c.margenGlobal },
]

export const FILAS_ACUMULADOS: FilaMatriz[] = [
  { campo: 'certOrigen', etiqueta: 'Certificación a origen', fuerte: true },
  { campo: 'costesOrigen', etiqueta: 'Costes a origen' },
  { campo: 'resultadoOrigen', etiqueta: 'Resultado a origen', tipo: 'resultado', fuerte: true },
  { campo: 'margenOrigenPct', etiqueta: 'Margen a origen', tipo: 'margen', fuerte: true },
]

/** Indicadores del resumen de una obra, ya con formato. `numero` sirve para darles color. */
export function indicadoresObra(c: Calculo, gastosGeneralesPct: number, importePedido: number) {
  const t = c.totales
  const lista: { etiqueta: string; valor: string; tipo?: 'resultado' | 'margen'; numero?: number }[] = [
    { etiqueta: 'Importe del pedido', valor: euros(importePedido) },
    { etiqueta: `Certificado a origen (${pct(c.pctAvance)} del pedido)`, valor: euros(t.sumCert) },
    { etiqueta: 'Pendiente de certificar', valor: euros(c.pendientePedido) },
    { etiqueta: 'Costes a origen, con estructura', valor: euros(t.sumTotMasEst) },
    { etiqueta: 'Costes directos', valor: euros(t.sumDirectos) },
    { etiqueta: `Estructura (${gastosGeneralesPct} % de lo certificado)`, valor: euros(t.sumEst) },
    { etiqueta: 'Dietas y hoteles', valor: euros(t.sumDie + t.sumHot) },
    { etiqueta: 'Resultado a origen', valor: euros(t.sumRes), tipo: 'resultado', numero: t.sumRes },
    // Sin nada certificado no hay margen que colorear
    { etiqueta: 'Margen a origen', valor: pct(c.margenGlobal), tipo: t.sumCert > 0 ? 'margen' : undefined, numero: c.margenGlobal },
  ]
  return lista
}

// CSV ------------------------------------------------------------------------------

export interface ObraInforme {
  codigo: string
  nombre: string
  cliente: string | null
  localidad: string | null
  /** Ya en texto: «En ejecución» o «Terminada» */
  estado: string
  importe_pedido: number
  gastos_generales_pct: number
}

/**
 * Con coma decimal y sin símbolo ni puntos de miles, para que Excel en español lo lea como número.
 * Redondea con toFixed(2), como el CSV de la herramienta.
 */
function numero(n: number): string {
  const t = n.toFixed(2)
  return (t === '-0.00' ? '0.00' : t).replace('.', ',')
}

function texto(valor: string | null): string {
  let t = valor ?? ''
  // Excel ejecutaría como fórmula un texto que empiece así: se le antepone un apóstrofo
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`
  return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

/**
 * Informe de la obra en CSV: datos generales, matriz mensual con totales, meses cerrados y
 * acumulados a origen. Mismo contenido que exportFullWorkbookCSV de la herramienta de IMTEX,
 * con separador «;». Quien lo descarga le antepone el BOM para que Excel lea bien las tildes.
 */
export function csvObra(obra: ObraInforme, c: Calculo, cerrados: ReadonlySet<string>): string {
  const meses = c.meses.map((m) => etiquetaMes(m.mes))
  const fila = (f: FilaMatriz) => [
    f.etiqueta + (f.tipo === 'margen' ? ' (%)' : ''),
    ...c.meses.map((m) => numero(m[f.campo])),
    ...(f.total ? [numero(f.total(c))] : []),
  ]
  const lineas: string[][] = [
    ['DATOS GENERALES DE LA OBRA'],
    ['Código', texto(obra.codigo)],
    ['Obra', texto(obra.nombre)],
    ['Cliente', texto(obra.cliente)],
    ['Localidad', texto(obra.localidad)],
    ['Estado', obra.estado],
    ['Importe del pedido', numero(obra.importe_pedido)],
    ['Gastos generales (%)', numero(obra.gastos_generales_pct)],
    [],
    ['RESUMEN MENSUAL'],
    ['', ...meses, 'Total'],
    ...FILAS_MATRIZ.map(fila),
    ['Mes cerrado', ...c.meses.map((m) => (cerrados.has(m.mes) ? 'Sí' : 'No'))],
    [],
    ['ACUMULADOS A ORIGEN'],
    ['', ...meses],
    ...FILAS_ACUMULADOS.map(fila),
  ]
  return lineas.map((l) => l.join(';')).join('\r\n') + '\r\n'
}
