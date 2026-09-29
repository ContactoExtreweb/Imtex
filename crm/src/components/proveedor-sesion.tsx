import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { ContextoSesion, type Sesion } from '@/lib/sesion'
import { supabase } from '@/lib/supabase'

/** Sesión de Supabase + perfil propio + permisos de su rol. */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // undefined = todavía no sabemos si hay sesión
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    // Emite INITIAL_SESSION al suscribirse, así que no hace falta getSession()
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  const acceso = useQuery({
    queryKey: ['acceso', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: perfil, error } = await supabase
        .from('perfiles')
        .select()
        .eq('id', userId!)
        .maybeSingle()
      if (error) throw error
      if (!perfil) return { perfil: null, permisos: [] }
      const { data: permisos, error: errorPermisos } = await supabase
        .from('permisos_rol')
        .select()
        .eq('rol', perfil.rol)
      if (errorPermisos) throw errorPermisos
      return { perfil, permisos }
    },
  })

  const perfil = acceso.data?.perfil ?? null
  const permisos = acceso.data?.permisos ?? []

  const valor: Sesion = {
    cargando: session === undefined || (!!userId && acceso.isPending),
    session: session ?? null,
    perfil,
    // Mismo criterio que private.tiene_permiso
    puede: (modulo, accion) =>
      !!perfil?.activo &&
      permisos.some(
        (p) => p.modulo === modulo && (p.puede_editar || (accion === 'ver' && p.puede_ver)),
      ),
    salir: async () => {
      await supabase.auth.signOut()
      queryClient.clear()
    },
  }

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
