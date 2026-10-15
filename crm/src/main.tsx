import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, StrictMode, Suspense, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { ConPermiso, Layout, Protegido } from '@/components/layout'
import { Toaster } from '@/components/ui/sonner'
import { ProveedorSesion } from '@/components/proveedor-sesion'
import { Login, NuevaContrasena, Recuperar } from '@/paginas/acceso'
import { Inicio } from '@/paginas/inicio'
import './index.css'

// Cada página se descarga al abrirla: la entrada (acceso e inicio) carga mucho menos
function pagina<T extends Record<string, unknown>>(cargar: () => Promise<T>, nombre: keyof T) {
  return lazy(() => cargar().then((m) => ({ default: m[nombre] as ComponentType })))
}
const Bajas = pagina(() => import('@/paginas/bajas'), 'Bajas')
const Categorias = pagina(() => import('@/paginas/categorias'), 'Categorias')
const Clientes = pagina(() => import('@/paginas/clientes'), 'Clientes')
const Combustible = pagina(() => import('@/paginas/combustible'), 'Combustible')
const ControlObra = pagina(() => import('@/paginas/control-obra'), 'ControlObra')
const ControlObraFicha = pagina(() => import('@/paginas/control-obra-ficha'), 'ControlObraFicha')
const ControlObraImprimir = pagina(() => import('@/paginas/control-obra-imprimir'), 'ControlObraImprimir')
const Galeria = pagina(() => import('@/paginas/galeria'), 'Galeria')
const GaleriaFicha = pagina(() => import('@/paginas/galeria-ficha'), 'GaleriaFicha')
const Obras = pagina(() => import('@/paginas/obras'), 'Obras')
const ParteFicha = pagina(() => import('@/paginas/parte-ficha'), 'ParteFicha')
const Partes = pagina(() => import('@/paginas/partes'), 'Partes')
const PartidasTipo = pagina(() => import('@/paginas/partidas-tipo'), 'PartidasTipo')
const Precios = pagina(() => import('@/paginas/precios'), 'Precios')
const Presupuesto = pagina(() => import('@/paginas/presupuesto'), 'Presupuesto')
const PresupuestoImprimir = pagina(() => import('@/paginas/presupuesto-imprimir'), 'PresupuestoImprimir')
const Presupuestos = pagina(() => import('@/paginas/presupuestos'), 'Presupuestos')
const Trabajadores = pagina(() => import('@/paginas/trabajadores'), 'Trabajadores')
const Usuarios = pagina(() => import('@/paginas/usuarios'), 'Usuarios')

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/recuperar', element: <Recuperar /> },
  { path: '/nueva-contrasena', element: <NuevaContrasena /> },
  {
    element: <Protegido />,
    children: [
      // Sin menú: son las hojas que se imprimen
      { path: 'control-obra/:id/imprimir', element: <ConPermiso modulo="control_obra"><ControlObraImprimir /></ConPermiso> },
      { path: 'presupuestos/:id/imprimir', element: <ConPermiso modulo="presupuestos"><PresupuestoImprimir /></ConPermiso> },
      {
        element: <Layout />,
        children: [
          { index: true, element: <Inicio /> },
          { path: 'clientes', element: <ConPermiso modulo="clientes"><Clientes /></ConPermiso> },
          { path: 'obras', element: <ConPermiso modulo="obras"><Obras /></ConPermiso> },
          { path: 'control-obra', element: <ConPermiso modulo="control_obra"><ControlObra /></ConPermiso> },
          { path: 'control-obra/:id', element: <ConPermiso modulo="control_obra"><ControlObraFicha /></ConPermiso> },
          { path: 'partes', element: <ConPermiso modulo="partes_horas"><Partes /></ConPermiso> },
          { path: 'partes/:id', element: <ConPermiso modulo="partes_horas"><ParteFicha /></ConPermiso> },
          { path: 'presupuestos', element: <ConPermiso modulo="presupuestos"><Presupuestos /></ConPermiso> },
          { path: 'presupuestos/:id', element: <ConPermiso modulo="presupuestos"><Presupuesto /></ConPermiso> },
          { path: 'partidas-tipo', element: <ConPermiso modulo="base_precios"><PartidasTipo /></ConPermiso> },
          { path: 'precios', element: <ConPermiso modulo="base_precios"><Precios /></ConPermiso> },
          { path: 'galeria', element: <ConPermiso modulo="galeria"><Galeria /></ConPermiso> },
          { path: 'galeria/:id', element: <ConPermiso modulo="galeria"><GaleriaFicha /></ConPermiso> },
          { path: 'bajas', element: <Bajas /> },
          { path: 'ajustes/categorias', element: <ConPermiso modulo="ajustes"><Categorias /></ConPermiso> },
          { path: 'ajustes/combustible', element: <ConPermiso modulo="ajustes"><Combustible /></ConPermiso> },
          { path: 'ajustes/trabajadores', element: <ConPermiso modulo="ajustes"><Trabajadores /></ConPermiso> },
          { path: 'ajustes/usuarios', element: <ConPermiso modulo="usuarios"><Usuarios /></ConPermiso> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ProveedorSesion>
        <Suspense>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster />
      </ProveedorSesion>
    </QueryClientProvider>
  </StrictMode>,
)
