import { House, LogOut, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import logoClaro from '@/assets/logo-imtex-claro.png'
import logo from '@/assets/logo-imtex.png'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { useSecciones } from '@/lib/menu'
import { useSesion, type Modulo } from '@/lib/sesion'
import { useRoles } from '@/lib/tabla'

function Centrado({ children }: { children: ReactNode }) {
  return <main className="grid min-h-dvh place-items-center p-4 text-center">{children}</main>
}

/** Rutas privadas: exige sesión y perfil activo. */
export function Protegido() {
  const { cargando, session, perfil, salir } = useSesion()
  const location = useLocation()

  if (cargando) return <Centrado>Cargando…</Centrado>
  if (!session) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  if (!perfil?.activo) {
    return (
      <Centrado>
        <div className="grid gap-3">
          <p>Tu usuario no tiene acceso al programa. Habla con gerencia.</p>
          <Button variant="outline" onClick={salir}>
            Salir
          </Button>
        </div>
      </Centrado>
    )
  }

  return <Outlet />
}

/** Marco con el menú lateral. */
export function Layout() {
  return (
    <SidebarProvider>
      <Menu />
      <SidebarInset className="isolate">
        {/* Escritorio: el logo en grande y muy tenue, fijo detrás del contenido. Decorativo. */}
        <div aria-hidden="true" className="pointer-events-none sticky top-0 -z-10 hidden h-0 lg:block">
          <img
            src={logo}
            alt=""
            className="absolute top-[50dvh] left-1/2 w-[72%] max-w-5xl -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
          />
        </div>
        <header className="flex h-12 items-center gap-2 border-b px-3">
          <SidebarTrigger />
          {/* En el móvil el menú está plegado: la marca va aquí */}
          <Link to="/" className="md:hidden">
            <img src={logo} alt="IMTEX" className="h-6 w-auto" />
          </Link>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

function Menu() {
  const { perfil, salir } = useSesion()
  const { data: roles } = useRoles()
  const { setOpenMobile } = useSidebar()
  const { pathname } = useLocation()
  const secciones = useSecciones()
  const enlace = (a: string, texto: string, Icono: LucideIcon) => (
    <SidebarMenuItem key={a}>
      <SidebarMenuButton
        asChild
        isActive={a === '/' ? pathname === a : pathname.startsWith(a)}
        className="data-[active=true]:[&>svg]:text-marca"
      >
        <Link to={a} onClick={() => setOpenMobile(false)}>
          <Icono /> {texto}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )

  return (
    <Sidebar>
      <SidebarHeader className="px-4 pt-4 pb-2">
        <Link to="/" onClick={() => setOpenMobile(false)}>
          <img src={logoClaro} alt="IMTEX" className="h-11 w-auto" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{enlace('/', 'Inicio', House)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {secciones.map((s) => (
          <SidebarGroup key={s.titulo ?? 'principal'}>
            {s.titulo && <SidebarGroupLabel>{s.titulo}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{s.enlaces.map((e) => enlace(e.a, e.texto, e.icono))}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-2 p-4">
        <div className="text-sm">
          <p className="truncate font-medium">{perfil?.nombre}</p>
          <p className="text-sidebar-foreground/70">{roles?.find((r) => r.codigo === perfil?.rol)?.nombre}</p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={salir}>
              <LogOut /> Salir
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

/** Si el usuario no puede ver el módulo, vuelve al inicio (el RLS tampoco le daría datos). */
export function ConPermiso({ modulo, children }: { modulo: Modulo; children: ReactNode }) {
  const { puede } = useSesion()
  return puede(modulo, 'ver') ? children : <Navigate to="/" replace />
}
