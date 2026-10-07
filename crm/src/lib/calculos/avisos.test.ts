import { describe, expect, test } from 'vitest'
import { avisosObra, type DatosObra } from './avisos'

/** Obra con 1.000 € certificados y el margen que se pida (los costes incluyen la estructura). */
const conMargen = (margenPct: number): DatosObra => ({
  certificado: 1000,
  costes: 1000 - margenPct * 10,
  costesSinEstructura: 0,
})
const tipos = (d: DatosObra) => avisosObra(d).map((a) => `${a.tipo}:${a.nivel}`)
const texto = (d: DatosObra) => avisosObra(d).map((a) => a.texto.replace(/\s/g, ' '))

describe('avisos de margen (semáforo de la herramienta: 5 % y 15 %)', () => {
  test('margen holgado: sin aviso', () => {
    expect(tipos(conMargen(65))).toEqual([])
    expect(tipos(conMargen(15.1))).toEqual([])
  })
  test('entre el 5 % y el 15 %, los dos incluidos: margen justo', () => {
    expect(tipos(conMargen(15))).toEqual(['margen_justo:atencion'])
    expect(tipos(conMargen(5))).toEqual(['margen_justo:atencion'])
    expect(texto(conMargen(7.5))).toEqual(['Margen justo: 7,5 % a origen'])
  })
  test('por debajo del 5 %: margen bajo', () => {
    expect(tipos(conMargen(4.9))).toEqual(['margen_bajo:grave'])
    expect(tipos(conMargen(0))).toEqual(['margen_bajo:grave'])
  })
  test('resultado negativo: en pérdidas, con el importe', () => {
    expect(tipos(conMargen(-12))).toEqual(['perdidas:grave'])
    expect(texto(conMargen(-12))).toEqual(['En pérdidas: resultado a origen de -120,00 € (-12,0 %)'])
  })
  test('sin nada certificado no se valora el margen, aunque haya costes', () => {
    expect(tipos({ certificado: 0, costes: 5000, costesSinEstructura: 5000 })).toEqual([])
  })
})

describe('avisos de presupuesto (coste consumido frente a lo certificado)', () => {
  // Presupuesto de 10.000 € de venta y 6.000 € de coste; margen real holgado para aislar estos avisos
  const obra = (certificado: number, costesSinEstructura: number): DatosObra => ({
    certificado,
    costes: 0,
    costesSinEstructura,
    presupuesto: { base: 10000, costeDirecto: 6000 },
  })

  test('el coste va con lo certificado: sin aviso', () => {
    expect(tipos(obra(5000, 3000))).toEqual([]) // 50 % y 50 %
    expect(tipos(obra(5000, 3600))).toEqual([]) // 60 % frente a 50 %: justo 10 puntos, aún no avisa
  })
  test('más de 10 puntos por delante: se desvía', () => {
    expect(tipos(obra(5000, 3660))).toEqual(['desviacion:atencion']) // 61 % frente a 50 %
    expect(texto(obra(6200, 4800))).toEqual([
      'Se desvía del presupuesto: lleva el 80,0 % del coste previsto con el 62,0 % certificado',
    ])
  })
  test('costes sin nada certificado también es desviarse', () => {
    expect(tipos(obra(0, 1200))).toEqual(['desviacion:atencion']) // 20 % frente a 0 %
  })
  test('más del 100 % del coste presupuestado: coste superado (y no además desviación)', () => {
    expect(tipos(obra(9000, 6000))).toEqual([]) // el 100 % exacto todavía no
    expect(tipos(obra(9000, 6480))).toEqual(['coste_superado:grave'])
    expect(texto(obra(9000, 6480))).toEqual(['Coste superado: lleva gastado el 108,0 % del coste presupuestado'])
  })
  test('sin presupuesto, o con un presupuesto sin coste, no hay con qué comparar', () => {
    expect(tipos({ certificado: 0, costes: 0, costesSinEstructura: 9999 })).toEqual([])
    expect(tipos({ certificado: 0, costes: 0, costesSinEstructura: 9999, presupuesto: null })).toEqual([])
    expect(
      tipos({ certificado: 0, costes: 0, costesSinEstructura: 9999, presupuesto: { base: 0, costeDirecto: 0 } }),
    ).toEqual([])
  })
})

test('una obra puede tener aviso de margen y de presupuesto a la vez', () => {
  expect(
    tipos({ certificado: 5000, costes: 4900, costesSinEstructura: 4500, presupuesto: { base: 10000, costeDirecto: 6000 } }),
  ).toEqual(['margen_bajo:grave', 'desviacion:atencion'])
})
