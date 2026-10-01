import type { PostgrestError } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { calcularObra, rellenarMeses, type SumasMes } from './calculos/control-obra'
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

/**
 * Certificado y costes a origen de cada obra, para el listado y la portada.
 * Las sumas por mes vienen de SQL y la estructura se calcula con calcularObra, la misma función
 * de la ficha: así el listado y la ficha no pueden diferir ni en un céntimo.
 * Con `soloEstas` se piden solo los meses de esas obras (para pocas obras: van en la URL).
 */
export async function totalesAOrigen(
  obras: { id: string; gastos_generales_pct: number; importe_pedido: number }[],
  soloEstas = false,
) {
  if (obras.length === 0) return new Map<string, { certificado: number; costes: number }>()
  const sumas = await todasLasFilas((desde, hasta) => {
    let consulta = supabase.from('control_obra_mensual').select('*', { count: 'exact' })
    if (soloEstas) consulta = consulta.in('obra_id', obras.map((o) => o.id))
    return consulta.order('obra_id').order('mes').range(desde, hasta)
  })
  return new Map(
    obras.map((o) => {
      const meses = sumas.filter((s) => s.obra_id === o.id).map(aSumas)
      const { totales } = calcularObra(meses, o.gastos_generales_pct, o.importe_pedido)
      return [o.id, { certificado: totales.sumCert, costes: totales.sumTotMasEst }]
    }),
  )
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
