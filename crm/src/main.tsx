import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { ConPermiso, Layout, Protegido } from '@/components/layout'
import { Toaster } from '@/components/ui/sonner'
import { ProveedorSesion } from '@/components/proveedor-sesion'
import { Login, NuevaContrasena, Recuperar } from '@/paginas/acceso'
import { Categorias } from '@/paginas/categorias'
import { Clientes } from '@/paginas/clientes'
import { Combustible } from '@/paginas/combustible'
import { ControlObra } from '@/paginas/control-obra'
import { ControlObraFicha } from '@/paginas/control-obra-ficha'
import { Galeria } from '@/paginas/galeria'
import { GaleriaFicha } from '@/paginas/galeria-ficha'
import { Inicio } from '@/paginas/inicio'
import { Obras } from '@/paginas/obras'
import { PartidasTipo } from '@/paginas/partidas-tipo'
import { Precios } from '@/paginas/precios'
import { Presupuesto } from '@/paginas/presupuesto'
import { PresupuestoImprimir } from '@/paginas/presupuesto-imprimir'
import { Presupuestos } from '@/paginas/presupuestos'
import { Trabajadores } from '@/paginas/trabajadores'
import { Usuarios } from '@/paginas/usuarios'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/recuperar', element: <Recuperar /> },
  { path: '/nueva-contrasena', element: <NuevaContrasena /> },
  {
    element: <Protegido />,
    children: [
      // Sin menú: es la hoja que se imprime
      { path: 'presupuestos/:id/imprimir', element: <ConPermiso modulo="presupuestos"><PresupuestoImprimir /></ConPermiso> },
      {
        element: <Layout />,
        children: [
          { index: true, element: <Inicio /> },
          { path: 'clientes', element: <ConPermiso modulo="clientes"><Clientes /></ConPermiso> },
          { path: 'obras', element: <ConPermiso modulo="obras"><Obras /></ConPermiso> },
          { path: 'control-obra', element: <ConPermiso modulo="control_obra"><ControlObra /></ConPermiso> },
          { path: 'control-obra/:id', element: <ConPermiso modulo="control_obra"><ControlObraFicha /></ConPermiso> },
          { path: 'presupuestos', element: <ConPermiso modulo="presupuestos"><Presupuestos /></ConPermiso> },
          { path: 'presupuestos/:id', element: <ConPermiso modulo="presupuestos"><Presupuesto /></ConPermiso> },
          { path: 'partidas-tipo', element: <ConPermiso modulo="base_precios"><PartidasTipo /></ConPermiso> },
          { path: 'precios', element: <ConPermiso modulo="base_precios"><Precios /></ConPermiso> },
          { path: 'galeria', element: <ConPermiso modulo="galeria"><Galeria /></ConPermiso> },
          { path: 'galeria/:id', element: <ConPermiso modulo="galeria"><GaleriaFicha /></ConPermiso> },
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
        <RouterProvider router={router} />
        <Toaster />
      </ProveedorSesion>
    </QueryClientProvider>
  </StrictMode>,
)
