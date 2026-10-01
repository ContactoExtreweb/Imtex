interface Pagina<T> {
  data: T[] | null
  error: { message: string } | null
  /** Total de filas si la consulta se pidió con { count: 'exact' } */
  count?: number | null
}

/**
 * La API de Supabase devuelve como mucho 1.000 filas por petición y corta el resto sin avisar.
 * Pide las páginas que hagan falta y las junta. La consulta tiene que llevar un orden estable
 * (acabado en una columna única, como id) para que las páginas no se pisen.
 *
 *   todasLasFilas((desde, hasta) => supabase.from('x').select('*', { count: 'exact' }).order('id').range(desde, hasta))
 */
export async function todasLasFilas<T>(pagina: (desde: number, hasta: number) => PromiseLike<Pagina<T>>): Promise<T[]> {
  const filas: T[] = []
  for (;;) {
    const { data, error, count } = await pagina(filas.length, filas.length + 999)
    if (error) throw error
    filas.push(...(data ?? []))
    // Sin count, se sigue hasta una página vacía: no se da por hecho el tope del servidor
    if (!data?.length || (count != null && filas.length >= count)) return filas
  }
}
