import type { PostgrestError } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { avisosObra, type Aviso } from './calculos/avisos'
import { calcularObra, mesAnterior, rellenarMeses, type SumasMes } from './calculos/control-obra'
import type { Database } from './database.types'
import { mensajeError, supabase } from './supabase'
import { todasLasFilas } from './todas-las-filas'

export type TablaApuntes =
  | 'certificaciones'
  | 'partes_horas'
  | 'materiales'
  | 'subcontratas'
  | 'alquileres'
  | 'combustible'
  | 'gastos_viaje'

/** Color del margen según el semáforo de la herramienta (más del 15 %, entre 5 y 15 %, menos). */
export const COLOR_MARGEN = { bien: 'text-exito', justo: 'text-aviso', mal: 'text-destructive' } as const

/** Un apunte de cualquiera de las hojas. Cada hoja sabe qué campos tiene el suyo. */
export type Apunte = { id: string; mes: string } & Record<string, string | number | null>

type Resultado = PromiseLike<{ error: PostgrestError | null }>
// Misma técnica que lib/tabla.ts: supabase-js no tipa un nombre de tabla genérico
interface Consulta {
  select(columnas: '*', opciones: { count: 'exact' }): {
    eq(columna: 'obra_id', valor: string): {
      order(columna: string): {
        order(columna: string): {
          range(desde: number, hasta: number): PromiseLike<{
            data: Apunte[] | null
            error: PostgrestError | null
            count: number | null
          }>
        }
      }
    }
  }
  insert(fila: unknown): Resultado
  update(fila: unknown): { eq(columna: 'id', valor: string): Resultado }
  delete(): { eq(columna: 'id', valor: string): Resultado }
}

/** Fila de la vista control_obra_mensual → entrada de los cálculos (la vista tipa todo como opcional). */
const aSumas = (s: Database['public']['Views']['control_obra_mensual']['Row']): SumasMes => ({
  mes: s.mes!,
  certificacion: s.certificacion ?? 0,
  personal: s.personal ?? 0,
  subcontrata: s.subcontrata ?? 0,
  materiales: s.materiales ?? 0,
  alquileres: s.alquileres ?? 0,
  combustible: s.combustible ?? 0,
  dietas: s.dietas ?? 0,
  hoteles: s.hoteles ?? 0,
})

type ObraControl = { id: string; gastos_generales_pct: number; importe_pedido: number }

/**
 * El cálculo completo de cada obra, para el listado y la portada.
 * Las sumas por mes vienen de SQL y lo demás se calcula con calcularObra, la misma función
 * de la ficha: así el listado y la ficha no pueden diferir ni en un céntimo.
 * Con `soloEstas` se piden solo los meses de esas obras (para pocas obras: van en la URL).
 */
async function calculosPorObra(obras: ObraControl[], soloEstas: boolean) {
  if (obras.length === 0) return new Map<string, ReturnType<typeof calcularObra>>()
  const sumas = await todasLasFilas((desde, hasta) => {
    let consulta = supabase.from('control_obra_mensual').select('*', { count: 'exact' })
    if (soloEstas) consulta = consulta.in('obra_id', obras.map((o) => o.id))
    return consulta.order('obra_id').order('mes').range(desde, hasta)
  })
  return new Map(
    obras.map((o) => {
      const meses = sumas.filter((s) => s.obra_id === o.id).map(aSumas)
      return [o.id, calcularObra(meses, o.gastos_generales_pct, o.importe_pedido)]
    }),
  )
}

/** Certificado y costes a origen (con estructura) de cada obra. */
export async function totalesAOrigen(obras: ObraControl[], soloEstas = false) {
  const calculos = await calculosPorObra(obras, soloEstas)
  return new Map(
    [...calculos].map(([id, c]) => [id, { certificado: c.totales.sumCert, costes: c.totales.sumTotMasEst }]),
  )
}

export interface AvisoObra extends Aviso {
  obra: { id: string; codigo: string; nombre: string }
}

/**
 * Resumen de las obras en ejecución para la portada: totales a origen, lo certificado y el
 * resultado de este mes y del anterior, y los avisos de margen y de presupuesto (calculos/avisos.ts).
 * Los avisos de presupuesto solo se calculan si el usuario puede ver presupuestos.
 */
export async function resumenEnEjecucion(verPresupuestos: boolean) {
  const { data: obras, error } = await supabase
    .from('obras')
    .select('id, codigo, nombre, gastos_generales_pct, importe_pedido, presupuesto_id')
    .eq('estado', 'en_ejecucion')
  if (error) throw error
  // Pocas obras en ejecución: se piden solo sus meses. Con muchas, no cabrían en la URL
  const calculos = await calculosPorObra(obras, obras.length <= 100)

  const presupuestos = new Map<string, { base: number; costeDirecto: number }>()
  const conPresupuesto = verPresupuestos ? obras.flatMap((o) => o.presupuesto_id ?? []) : []
  if (conPresupuesto.length > 0) {
    const totales = await supabase
      .from('presupuestos_totales')
      .select('presupuesto_id, base, coste_directo')
      .in('presupuesto_id', conPresupuesto)
    if (totales.error) throw totales.error
    for (const t of totales.data) {
      if (t.presupuesto_id) presupuestos.set(t.presupuesto_id, { base: t.base ?? 0, costeDirecto: t.coste_directo ?? 0 })
    }
  }

  // El mes en curso, con la fecha del usuario (no en UTC: a medianoche del día 1 sería el mes anterior)
  const hoy = new Date()
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
  const delMes = (mes: string) => ({ mes, certificado: 0, resultado: 0 })
  const actual = delMes(mesActual)
  const anterior = delMes(mesAnterior(mesActual))

  let certificado = 0
  let costes = 0
  const avisos: AvisoObra[] = []
  for (const { presupuesto_id, ...obra } of obras) {
    const { meses, totales } = calculos.get(obra.id)!
    certificado += totales.sumCert
    costes += totales.sumTotMasEst
    for (const m of meses) {
      const destino = m.mes === actual.mes ? actual : m.mes === anterior.mes ? anterior : null
      if (destino) {
        destino.certificado += m.certificacion
        destino.resultado += m.resultadoMes
      }
    }
    const deLaObra = avisosObra({
      certificado: totales.sumCert,
      costes: totales.sumTotMasEst,
      costesSinEstructura: totales.sumDirectos + totales.sumDie + totales.sumHot,
      presupuesto: presupuesto_id ? presupuestos.get(presupuesto_id) : null,
    })
    avisos.push(...deLaObra.map((a) => ({ ...a, obra })))
  }
  avisos.sort((a, b) => Number(b.nivel === 'grave') - Number(a.nivel === 'grave')) // los graves, primero

  return {
    certificado,
    margen: certificado > 0 ? ((certificado - costes) / certificado) * 100 : null,
    actual,
    anterior,
    avisos,
  }
}

/** Obra con sus meses calculados (resultado, margen y acumulados a origen). */
export function useControlObra(obraId: string | undefined) {
  return useQuery({
    queryKey: ['control_obra', obraId],
    enabled: !!obraId,
    queryFn: async () => {
      const [obra, sumas] = await Promise.all([
        supabase.from('obras').select().eq('id', obraId!).single(),
        supabase.from('control_obra_mensual').select().eq('obra_id', obraId!).order('mes'),
      ])
      if (obra.error) throw obra.error
      if (sumas.error) throw sumas.error
      // Una obra tiene pocos meses: caben de sobra en una petición
      const meses = rellenarMeses(sumas.data.map(aSumas))
      return { obra: obra.data, ...calcularObra(meses, obra.data.gastos_generales_pct, obra.data.importe_pedido) }
    },
  })
}

/** Apuntes de una hoja en una obra: listado, alta/edición y borrado. Al cambiar algo se recalcula la obra. */
export function useApuntes(tabla: TablaApuntes, obraId: string) {
  const queryClient = useQueryClient()
  const desde = () => supabase.from(tabla) as unknown as Consulta
  const alTerminar = {
    onError: (error: Error) => toast.error(mensajeError(error)),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['apuntes', tabla, obraId] }),
        queryClient.invalidateQueries({ queryKey: ['control_obra'] }),
        queryClient.invalidateQueries({ queryKey: ['inicio'] }),
      ]),
  }

  const lista = useQuery({
    queryKey: ['apuntes', tabla, obraId],
    // Una obra larga con partes diarios pasa de las 1.000 filas que da la API por petición
    queryFn: () =>
      todasLasFilas((de, hasta) =>
        desde().select('*', { count: 'exact' }).eq('obra_id', obraId).order('created_at').order('id').range(de, hasta),
      ),
  })

  const guardar = useMutation({
    mutationFn: async ({ id, fila }: { id?: string; fila: Record<string, unknown> }) => {
      const { error } = await (id
        ? desde().update(fila).eq('id', id)
        : desde().insert({ ...fila, obra_id: obraId }))
      if (error) throw error
    },
    onSuccess: () => toast.success('Guardado'),
    ...alTerminar,
  })

  const borrar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await desde().delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => toast.success('Borrado'),
    ...alTerminar,
  })

  return { lista, guardar, borrar }
}
