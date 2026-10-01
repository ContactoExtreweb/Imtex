import { describe, expect, test } from 'vitest'
import herramienta from '../../../../referencia/IMTEX_control_obra.html?raw'
import {
  calcularObra,
  consolidarMes,
  etiquetaMes,
  mesDeFecha,
  nivelMargen,
  origenAnterior,
  rellenarMeses,
  type SumasMes,
} from './control-obra'

// Se ejecutan las funciones ORIGINALES de la herramienta de IMTEX con sus datos de ejemplo
// (DEFAULT_STORE, la obra de Valencia) y se comparan con las nuestras.

function trozo(patron: RegExp, nombre: string): string {
  const resultado = patron.exec(herramienta)
  if (!resultado) throw new Error(`No se encuentra ${nombre} en la herramienta`)
  return resultado[1] ?? resultado[0]
}
const DATOS = trozo(/const DEFAULT_STORE = (\{[\s\S]*?\n {4}\});/, 'DEFAULT_STORE')
const ORIGINALES = [
  trozo(/function getMonthConsolidated\(mesEtiqueta\) \{[\s\S]*?\n {4}\}/, 'getMonthConsolidated'),
  trozo(/function computeMonthlyData\(\) \{[\s\S]*?\n {4}\}/, 'computeMonthlyData'),
].join('\n')

interface Apunte {
  mes: string
  importe?: number
  tipo?: string
  [campo: string]: unknown
}
interface Almacen {
  obra: { gastosGeneralesPct: number; importePedido: number }
  meses: { etiqueta: string }[]
  certificaciones: { mes: string; origen: number; anterior: number }[]
  personal: { mes: string; horasOrd: number; precioOrd: number; horasExt: number; precioExt: number; dietas: number; alojamiento: number }[]
  materiales: Apunte[]
  subcontratas: Apunte[]
  alquileres: Apunte[]
  combustible: Apunte[]
  dietasHoteles: Apunte[]
}
type Resultado = ReturnType<typeof calcularObra>

/** Ejecuta la herramienta original sobre un almacén de datos (opcionalmente modificado). */
function original(modificar: (almacen: Almacen) => void = () => {}) {
  const crear = new Function(
    'modificar',
    `const appData = ${DATOS};\nmodificar(appData);\n${ORIGINALES}\nreturn { appData, ...computeMonthlyData() }`,
  )
  return crear(modificar) as {
    appData: Almacen
    monthlyData: (Resultado['meses'][number] & { mes: string })[]
    sums: Resultado['totales']
  }
}

/** Lo que hace la vista SQL control_obra_mensual: sumar los apuntes de cada mes. */
function sumasMensuales(a: Almacen): SumasMes[] {
  const suma = (filas: Apunte[], mes: string, tipo?: string) =>
    filas.filter((f) => f.mes === mes && (!tipo || f.tipo === tipo)).reduce((t, f) => t + (Number(f.importe) || 0), 0)
  return a.meses.map(({ etiqueta }) => {
    const partes = a.personal.filter((p) => p.mes === etiqueta)
    return {
      mes: etiqueta,
      certificacion: a.certificaciones.filter((c) => c.mes === etiqueta).reduce((t, c) => t + (c.origen - c.anterior), 0),
      personal: partes.reduce((t, p) => t + p.horasOrd * p.precioOrd + p.horasExt * p.precioExt, 0),
      subcontrata: suma(a.subcontratas, etiqueta),
      materiales: suma(a.materiales, etiqueta),
      alquileres: suma(a.alquileres, etiqueta),
      combustible: suma(a.combustible, etiqueta),
      dietas: partes.reduce((t, p) => t + (Number(p.dietas) || 0), 0) + suma(a.dietasHoteles, etiqueta, 'DIETAS'),
      hoteles: partes.reduce((t, p) => t + (Number(p.alojamiento) || 0), 0) + suma(a.dietasHoteles, etiqueta, 'HOTELES'),
    }
  })
}

const centimos = (n: number) => n.toFixed(2)
const CAMPOS_MES = [
  'certificacion',
  'costeEstructura',
  'personal',
  'subcontrata',
  'combustible',
  'dietas',
  'hoteles',
  'alquileres',
  'materiales',
  'costesDirectos',
  'costesIndirectos',
  'costesTotales',
  'sumatorioCostes',
  'resultadoMes',
  'margenPct',
  'certOrigen',
  'costesOrigen',
  'resultadoOrigen',
  'margenOrigenPct',
] as const

function comparar(modificar?: (almacen: Almacen) => void) {
  const ref = original(modificar)
  const obra = ref.appData.obra
  const nuestro = calcularObra(sumasMensuales(ref.appData), obra.gastosGeneralesPct, obra.importePedido)
  expect(nuestro.meses).toHaveLength(ref.monthlyData.length)
  ref.monthlyData.forEach((mesRef, i) => {
    for (const campo of CAMPOS_MES) {
      expect(`${mesRef.mes} ${campo} ${centimos(nuestro.meses[i][campo])}`).toBe(
        `${mesRef.mes} ${campo} ${centimos(mesRef[campo])}`,
      )
    }
  })
  for (const [campo, valor] of Object.entries(ref.sums)) {
    expect(`${campo} ${centimos(nuestro.totales[campo as keyof Resultado['totales']])}`).toBe(`${campo} ${centimos(valor)}`)
  }
  return { ref, nuestro }
}

describe('control de obra: mismos resultados que la herramienta de IMTEX', () => {
  test('datos de ejemplo de la herramienta (obra de Valencia), mes a mes y a origen', () => {
    const { ref, nuestro } = comparar()
    // Cifras calculadas a mano sobre DEFAULT_STORE, para que el test no dependa solo de la comparación
    expect(ref.monthlyData).toHaveLength(8)
    expect(centimos(nuestro.meses[0].certificacion)).toBe('42000.00') // enero: primera certificación
    expect(centimos(nuestro.meses[0].costeEstructura)).toBe('5460.00') // 13 % de 42.000
    // Personal de enero: 160×24 + 10×30 + 160×18,5 + 15×24 + 160×14,5 + 8×18,5
    expect(centimos(nuestro.meses[0].personal)).toBe('9928.00')
    expect(centimos(nuestro.totales.sumCert)).toBe('1014600.00') // última certificación a origen
    // Indicadores del resumen (renderResumen)
    expect(centimos(nuestro.pendientePedido)).toBe('470400.00') // 1.485.000 − 1.014.600
    expect(centimos(nuestro.pctAvance)).toBe(centimos((1014600 / 1485000) * 100))
    expect(centimos(nuestro.margenGlobal)).toBe(centimos(ref.monthlyData[7].margenOrigenPct))
  })

  test('otro porcentaje de gastos generales y un mes sin certificación', () => {
    comparar((a) => {
      a.obra.gastosGeneralesPct = 9.5
      a.certificaciones = a.certificaciones.filter((c) => c.mes !== 'marzo-26')
    })
  })

  test('apuntes generados en todos los meses (siempre los mismos)', () => {
    let semilla = 20261001
    const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648
    const importe = () => Number((azar() * 20000).toFixed(2))
    comparar((a) => {
      for (const { etiqueta: mes } of a.meses) {
        for (let i = 0; i < 6; i++) {
          a.materiales.push({ mes, importe: importe() })
          a.subcontratas.push({ mes, importe: importe() })
          a.alquileres.push({ mes, importe: importe() })
          a.combustible.push({ mes, importe: importe() })
          a.dietasHoteles.push({ mes, tipo: i % 2 ? 'DIETAS' : 'HOTELES', importe: importe() })
          a.personal.push({
            mes,
            horasOrd: Math.round(azar() * 160),
            precioOrd: 18.5,
            horasExt: Math.round(azar() * 20),
            precioExt: 24,
            dietas: importe() / 100,
            alojamiento: importe() / 100,
          })
        }
      }
    })
  })
})

describe('meses', () => {
  test('etiqueta y mes de imputación como la herramienta', () => {
    expect(etiquetaMes('2026-09-01')).toBe('septiembre-26')
    expect(etiquetaMes('2026-01-01')).toBe('enero-26')
    expect(mesDeFecha('2026-09-17')).toBe('2026-09-01')
  })

  test('rellenarMeses pone a cero los meses sin apuntes, también al cambiar de año', () => {
    const fila = (mes: string, certificacion: number): SumasMes => ({
      mes,
      certificacion,
      personal: 0,
      subcontrata: 0,
      materiales: 0,
      alquileres: 0,
      combustible: 0,
      dietas: 0,
      hoteles: 0,
    })
    const meses = rellenarMeses([fila('2027-02-01', 5), fila('2026-11-01', 3)])
    expect(meses.map((m) => m.mes)).toEqual(['2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01'])
    expect(meses.map((m) => m.certificacion)).toEqual([3, 0, 0, 5])
    expect(rellenarMeses([])).toEqual([])
  })

  test('semáforo del margen', () => {
    expect(nivelMargen(15.01)).toBe('bien')
    expect(nivelMargen(15)).toBe('justo')
    expect(nivelMargen(5)).toBe('justo')
    expect(nivelMargen(4.99)).toBe('mal')
    expect(nivelMargen(-3)).toBe('mal')
  })
})

test('origenAnterior encadena las certificaciones por número, aunque lleguen desordenadas', () => {
  // Las tres primeras de DEFAULT_STORE
  const certs = [
    { id: 'c3', numero: 3, importe_origen: 266900 },
    { id: 'c1', numero: 1, importe_origen: 42000 },
    { id: 'c2', numero: 2, importe_origen: 131500 },
  ]
  expect(origenAnterior(1, certs)).toBe(0)
  expect(origenAnterior(3, certs)).toBe(131500)
  expect(origenAnterior(4, certs)).toBe(266900) // una nueva al final
  // Al editar la nº 2, ella misma no cuenta como anterior
  expect(origenAnterior(2, certs, 'c2')).toBe(42000)
  expect(origenAnterior(1, [])).toBe(0)
})

test('la estructura se redondea como la herramienta, aunque el medio céntimo caiga hacia abajo', () => {
  // 100,50 × 13 % = 13,065 exactos, pero en coma flotante queda una pizca por debajo y toFixed da 13,06.
  // SQL daría 13,07: por eso el listado y la portada usan también calcularObra (totalesAOrigen).
  const mes = { mes: '2026-01-01', certificacion: 100.5, personal: 0, subcontrata: 0, materiales: 0, alquileres: 0, combustible: 0, dietas: 0, hoteles: 0 }
  expect(consolidarMes(mes, 13).costeEstructura).toBe(13.06)
  expect(calcularObra([mes], 13, 1000).totales.sumTotMasEst).toBe(13.06)
})
