import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { ConPermiso, Inicio, Layout } from '@/components/layout'
import { Toaster } from '@/components/ui/sonner'
import { ProveedorSesion } from '@/components/proveedor-sesion'
import { Login, NuevaContrasena, Recuperar } from '@/paginas/acceso'
import { Categorias } from '@/paginas/categorias'
import { Clientes } from '@/paginas/clientes'
import { Combustible } from '@/paginas/combustible'
import { Obras } from '@/paginas/obras'
import { Trabajadores } from '@/paginas/trabajadores'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/recuperar', element: <Recuperar /> },
  { path: '/nueva-contrasena', element: <NuevaContrasena /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <Inicio /> },
      { path: 'clientes', element: <ConPermiso modulo="clientes"><Clientes /></ConPermiso> },
      { path: 'obras', element: <ConPermiso modulo="obras"><Obras /></ConPermiso> },
      { path: 'ajustes/categorias', element: <ConPermiso modulo="ajustes"><Categorias /></ConPermiso> },
      { path: 'ajustes/combustible', element: <ConPermiso modulo="ajustes"><Combustible /></ConPermiso> },
      { path: 'ajustes/trabajadores', element: <ConPermiso modulo="ajustes"><Trabajadores /></ConPermiso> },
      { path: '*', element: <Navigate to="/" replace /> },
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
