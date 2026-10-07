import {
  BookOpen,
  BriefcaseMedical,
  ClipboardList,
  FileText,
  Fuel,
  HardHat,
  IdCard,
  Images,
  Layers,
  Tags,
  TrendingUp,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useSesion, type Modulo } from './sesion'

// Apartados del programa: los usan el menú lateral y los accesos de la portada.

interface Enlace {
  a: string
  texto: string
  icono: LucideIcon
  /** Sin módulo, el apartado es de todos: cada uno ve en él solo lo suyo */
  modulo?: Modulo
}

const SECCIONES: { titulo?: string; enlaces: Enlace[] }[] = [
  {
    enlaces: [
      { a: '/clientes', texto: 'Clientes', icono: Users, modulo: 'clientes' },
      { a: '/obras', texto: 'Obras', icono: HardHat, modulo: 'obras' },
      { a: '/control-obra', texto: 'Control de obra', icono: TrendingUp, modulo: 'control_obra' },
      { a: '/partes', texto: 'Partes de trabajo', icono: ClipboardList, modulo: 'partes_horas' },
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
    titulo: 'Web',
    enlaces: [{ a: '/galeria', texto: 'Galería web', icono: Images, modulo: 'galeria' }],
  },
  {
    titulo: 'Personal',
    enlaces: [{ a: '/bajas', texto: 'Bajas', icono: BriefcaseMedical }],
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
  return SECCIONES.map((s) => ({ ...s, enlaces: s.enlaces.filter((e) => !e.modulo || puede(e.modulo, 'ver')) })).filter(
    (s) => s.enlaces.length > 0,
  )
}
