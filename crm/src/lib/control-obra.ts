import type { PostgrestError } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { calcularObra, rellenarMeses } from './calculos/control-obra'
import { mensajeError, supabase } from './supabase'

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
  select(): {
    eq(columna: 'obra_id', valor: string): {
      order(columna: string): PromiseLike<{ data: Apunte[] | null; error: PostgrestError | null }>
    }
  }
  insert(fila: unknown): Resultado
  update(fila: unknown): { eq(columna: 'id', valor: string): Resultado }
  delete(): { eq(columna: 'id', valor: string): Resultado }
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
      const meses = rellenarMeses(
        sumas.data.map((s) => ({
          mes: s.mes!,
          certificacion: s.certificacion ?? 0,
          personal: s.personal ?? 0,
          subcontrata: s.subcontrata ?? 0,
          materiales: s.materiales ?? 0,
          alquileres: s.alquileres ?? 0,
          combustible: s.combustible ?? 0,
          dietas: s.dietas ?? 0,
          hoteles: s.hoteles ?? 0,
        })),
      )
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
    queryFn: async () => {
      const { data, error } = await desde().select().eq('obra_id', obraId).order('created_at')
      if (error) throw error
      return data ?? []
    },
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
