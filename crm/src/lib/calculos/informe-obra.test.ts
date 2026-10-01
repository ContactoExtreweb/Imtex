import { expect, test } from 'vitest'
import { calcularObra, type SumasMes } from './control-obra'
import { csvObra, FILAS_ACUMULADOS, FILAS_MATRIZ, type ObraInforme } from './informe-obra'

const mes = (m: string, certificacion: number, materiales: number): SumasMes => ({
  mes: m,
  certificacion,
  materiales,
  personal: 0,
  subcontrata: 0,
  alquileres: 0,
  combustible: 0,
  dietas: 0,
  hoteles: 0,
})
// Enero: 1.000 certificados y 400 de material. Febrero: 2.000 y 2.500,50 (mes en pérdidas).
const calculo = calcularObra([mes('2026-01-01', 1000, 400), mes('2026-02-01', 2000, 2500.5)], 13, 5000)
const obra: ObraInforme = {
  codigo: 'OB-2026-01',
  nombre: 'Cubierta; nave "A"',
  cliente: '=Cliente S.L.',
  localidad: null,
  estado: 'En ejecución',
  importe_pedido: 5000,
  gastos_generales_pct: 13,
}
const lineas = csvObra(obra, calculo, new Set(['2026-01-01'])).split('\r\n')
const fila = (etiqueta: string) => lineas.find((l) => l.startsWith(etiqueta + ';'))

test('datos de la obra: textos con ; o comillas entrecomillados, y sin fórmulas para Excel', () => {
  expect(fila('Código')).toBe('Código;OB-2026-01')
  expect(fila('Obra')).toBe('Obra;"Cubierta; nave ""A"""')
  expect(fila('Cliente')).toBe("Cliente;'=Cliente S.L.") // el apóstrofo evita que Excel lo ejecute
  expect(fila('Localidad')).toBe('Localidad;')
  expect(fila('Importe del pedido')).toBe('Importe del pedido;5000,00')
})

test('matriz mensual: una columna por mes y la de total, con coma decimal y sin símbolo', () => {
  expect(lineas).toContain(';enero-26;febrero-26;Total')
  expect(fila('Certificación')).toBe('Certificación;1000,00;2000,00;3000,00')
  expect(fila('Coste de estructura')).toBe('Coste de estructura;130,00;260,00;390,00')
  expect(fila('Materiales')).toBe('Materiales;400,00;2500,50;2900,50')
  expect(fila('Costes + estructura')).toBe('Costes + estructura;530,00;2760,50;3290,50')
  expect(fila('Resultado del mes')).toBe('Resultado del mes;470,00;-760,50;-290,50')
  expect(fila('Margen del mes (%)')).toBe('Margen del mes (%);47,00;-38,02;-9,68') // -38,025: toFixed, como la herramienta
})

test('meses cerrados y acumulados a origen', () => {
  expect(fila('Mes cerrado')).toBe('Mes cerrado;Sí;No')
  expect(fila('Certificación a origen')).toBe('Certificación a origen;1000,00;3000,00')
  expect(fila('Resultado a origen')).toBe('Resultado a origen;470,00;-290,50')
  expect(fila('Margen a origen (%)')).toBe('Margen a origen (%);47,00;-9,68')
})

test('todas las filas de la matriz salen, y cada línea tiene las columnas de su bloque', () => {
  for (const f of FILAS_MATRIZ) expect(lineas.filter((l) => l.startsWith(f.etiqueta)).length).toBeGreaterThan(0)
  for (const f of FILAS_ACUMULADOS) expect(lineas.filter((l) => l.startsWith(f.etiqueta)).length).toBeGreaterThan(0)
  expect(fila('Personal (horas)')!.split(';')).toHaveLength(4) // etiqueta + 2 meses + total
  expect(fila('Costes a origen')!.split(';')).toHaveLength(3) // etiqueta + 2 meses
})

test('una obra sin meses también se exporta', () => {
  const vacio = csvObra(obra, calcularObra([], 13, 5000), new Set())
  expect(vacio).toContain('Certificación;0,00')
  expect(vacio).toContain('Margen del mes (%);0,00')
})
