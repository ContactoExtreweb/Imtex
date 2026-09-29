import { createClient, type PostgrestError } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  // Invitaciones y recuperación llegan con el token en la URL (#access_token…):
  // los enlaces los genera el servidor, así que no pueden usar PKCE.
  { auth: { flowType: 'implicit' } },
)

type Tablas = Database['public']['Tables']
export type Fila<T extends keyof Tablas> = Tablas[T]['Row']
export type NuevaFila<T extends keyof Tablas> = Tablas[T]['Insert']

/** Mensaje en español para los errores habituales de Postgres. */
export function mensajeError(error: Pick<PostgrestError, 'code' | 'message'>): string {
  switch (error.code) {
    case '23503':
      return 'No se puede borrar: hay otros datos que dependen de este registro.'
    case '23505':
      return 'Ya existe un registro con ese valor (por ejemplo, el mismo código).'
    case '42501':
      return 'No tienes permiso para hacer esto.'
    default:
      return error.message
  }
}
