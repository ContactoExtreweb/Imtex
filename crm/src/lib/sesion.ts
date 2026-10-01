import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { Fila } from './supabase'

// Módulos de permisos_rol (docs/PLAN.md B5). La seguridad real está en el RLS;
// esto solo decide qué se enseña en la interfaz.
export type Modulo =
  | 'usuarios'
  | 'ajustes'
  | 'clientes'
  | 'base_precios'
  | 'presupuestos'
  | 'obras'
  | 'control_obra'
  | 'partes_horas'
  | 'certificaciones'
  | 'cierre_meses'
  | 'galeria'
export type Accion = 'ver' | 'editar'

export interface Sesion {
  cargando: boolean
  session: Session | null
  perfil: Fila<'perfiles'> | null
  puede: (modulo: Modulo, accion: Accion) => boolean
  salir: () => Promise<void>
}

/** Lo rellena components/proveedor-sesion.tsx */
export const ContextoSesion = createContext<Sesion | null>(null)

export function useSesion() {
  const sesion = useContext(ContextoSesion)
  if (!sesion) throw new Error('useSesion fuera de ProveedorSesion')
  return sesion
}
