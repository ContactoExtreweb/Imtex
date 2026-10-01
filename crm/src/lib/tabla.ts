import type { PostgrestError } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mensajeError, supabase, type Fila, type NuevaFila } from './supabase'
import { todasLasFilas } from './todas-las-filas'

type TablaEditable =
  | 'clientes'
  | 'obras'
  | 'categorias_profesionales'
  | 'trabajadores'
  | 'perfiles'
  | 'precios'
type Resultado = PromiseLike<{ error: PostgrestError | null }>

// supabase-js no sabe tipar un nombre de tabla genérico; se usa esta forma mínima por dentro
// y hacia fuera todo va tipado con Fila<T> / NuevaFila<T>.
interface Consulta {
  select(columnas: '*', opciones: { count: 'exact' }): {
    order(columna: string): {
      order(columna: string): {
        range(desde: number, hasta: number): PromiseLike<{
          data: unknown[] | null
          error: PostgrestError | null
          count: number | null
        }>
      }
    }
  }
  insert(fila: unknown): Resultado
  update(fila: unknown): { eq(columna: 'id', valor: string): Resultado }
  delete(): { eq(columna: 'id', valor: string): Resultado }
}

/** Roles (fijos, se cambian por migración). */
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select().order('nombre')
      if (error) throw error
      return data
    },
  })
}

/** Listado, alta/edición y borrado de una tabla, con avisos en español. */
export function useTabla<T extends TablaEditable>(tabla: T, orden: keyof Fila<T> & string) {
  const queryClient = useQueryClient()
  const desde = () => supabase.from(tabla) as unknown as Consulta
  const alTerminar = {
    onError: (error: Error) => toast.error(mensajeError(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [tabla] }),
  }

  const lista = useQuery({
    queryKey: [tabla],
    // La API da como mucho 1.000 filas por petición: se piden todas las páginas
    queryFn: async () =>
      (await todasLasFilas((de, hasta) =>
        desde().select('*', { count: 'exact' }).order(orden).order('id').range(de, hasta),
      )) as Fila<T>[],
  })

  const guardar = useMutation({
    mutationFn: async ({ id, fila }: { id?: string; fila: Partial<NuevaFila<T>> }) => {
      const { error } = await (id ? desde().update(fila).eq('id', id) : desde().insert(fila))
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
