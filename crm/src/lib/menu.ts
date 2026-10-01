import { BookOpen, FileText, Fuel, HardHat, IdCard, Layers, Tags, UserCog, Users, type LucideIcon } from 'lucide-react'
import { useSesion, type Modulo } from './sesion'

// Apartados del programa: los usan el menú lateral y los accesos de la portada.

interface Enlace {
  a: string
  texto: string
  icono: LucideIcon
  modulo: Modulo
}

const SECCIONES: { titulo?: string; enlaces: Enlace[] }[] = [
  {
    enlaces: [
      { a: '/clientes', texto: 'Clientes', icono: Users, modulo: 'clientes' },
      { a: '/obras', texto: 'Obras', icono: HardHat, modulo: 'obras' },
    ],
  },
  {
    titulo: 'Presupuestos',
    enlaces: [
      { a: '/presupuestos', texto: 'Presupuestos', icono: FileText, modulo: 'presupuestos' },
      { a: '/partidas-tipo', texto: 'Partidas tipo', icono: Layers, modulo: 'base_precios' },
      { a: '/precios', texto: 'Base de precios', icono: BookOpen, modulo: 'base_precios' },
    ],
  },
  {
    titulo: 'Ajustes',
    enlaces: [
      { a: '/ajustes/categorias', texto: 'Categorías', icono: Tags, modulo: 'ajustes' },
      { a: '/ajustes/combustible', texto: 'Tarifas de combustible', icono: Fuel, modulo: 'ajustes' },
      { a: '/ajustes/trabajadores', texto: 'Trabajadores', icono: IdCard, modulo: 'ajustes' },
      { a: '/ajustes/usuarios', texto: 'Usuarios', icono: UserCog, modulo: 'usuarios' },
    ],
  },
]

/** Secciones del menú con solo los enlaces que el usuario puede ver. */
export function useSecciones() {
  const { puede } = useSesion()
  return SECCIONES.map((s) => ({ ...s, enlaces: s.enlaces.filter((e) => puede(e.modulo, 'ver')) })).filter(
    (s) => s.enlaces.length > 0,
  )
}
