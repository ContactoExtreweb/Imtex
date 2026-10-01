import type { PostgrestError } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import lema from '@/assets/lema-imtex.png'
import logo from '@/assets/logo-imtex.png'
import { euros, fecha } from '@/lib/formato'
import type { Estado } from '@/lib/presupuestos'
import { useSesion } from '@/lib/sesion'
import { supabase } from '@/lib/supabase'
import { useRoles } from '@/lib/tabla'
import { InsigniaEstado } from './presupuestos'

const hoy = new Intl.DateTimeFormat('es-ES', { dateStyle: 'full' })

/** Cuenta filas en SQL (petición sin datos), no trayéndolas: regla 7. */
async function contar(consulta: PromiseLike<{ count: number | null; error: PostgrestError | null }>) {
  const { count, error } = await consulta
  if (error) throw error
  return count ?? 0
}
const SOLO_CONTAR = { count: 'exact', head: true } as const

/**
 * Portada: un resumen de lo que cada usuario puede ver. No hay un resumen por rol escrito a mano:
 * sale de sus permisos, así que si cambia la matriz de permisos, cambia la portada.
 */
export function Inicio() {
  const { perfil, puede } = useSesion()
  const roles = useRoles().data
  const [fechaDeHoy] = useState(() => hoy.format(new Date()))
  const ve = {
    obras: puede('obras', 'ver'),
    presupuestos: puede('presupuestos', 'ver'),
    clientes: puede('clientes', 'ver'),
    // La lista de trabajadores la leen también quienes llevan el control de obra
    trabajadores: puede('ajustes', 'ver') || puede('control_obra', 'ver'),
    precios: puede('base_precios', 'ver'),
    usuarios: puede('usuarios', 'ver'),
  }

  const resumen = useQuery({
    queryKey: ['inicio', perfil?.rol],
    queryFn: async () => {
      const si = <T,>(condicion: boolean, consulta: () => Promise<T>) => (condicion ? consulta() : null)
      const [obrasEnCurso, enviados, borradores, clientes, trabajadores, precios, usuarios, obras, presupuestos] =
        await Promise.all([
          si(ve.obras, () => contar(supabase.from('obras').select('*', SOLO_CONTAR).eq('estado', 'en_ejecucion'))),
          si(ve.presupuestos, () =>
            contar(supabase.from('presupuestos').select('*', SOLO_CONTAR).eq('estado', 'enviado')),
          ),
          si(ve.presupuestos, () =>
            contar(supabase.from('presupuestos').select('*', SOLO_CONTAR).eq('estado', 'borrador')),
          ),
          si(ve.clientes, () => contar(supabase.from('clientes').select('*', SOLO_CONTAR))),
          si(ve.trabajadores, () => contar(supabase.from('trabajadores').select('*', SOLO_CONTAR).eq('activo', true))),
          si(ve.precios, () => contar(supabase.from('precios').select('*', SOLO_CONTAR).eq('activo', true))),
          si(ve.usuarios, () => contar(supabase.from('perfiles').select('*', SOLO_CONTAR).eq('activo', true))),
          si(ve.obras, async () => {
            const { data, error } = await supabase
              .from('obras')
              .select('id, codigo, nombre, importe_pedido')
              .eq('estado', 'en_ejecucion')
              .order('created_at', { ascending: false })
              .limit(5)
            if (error) throw error
            return data
          }),
          si(ve.presupuestos, async () => {
            const { data, error } = await supabase
              .from('presupuestos')
              .select('id, codigo, titulo, estado, fecha')
              .order('created_at', { ascending: false })
              .limit(5)
            if (error) throw error
            const totales = await supabase
              .from('presupuestos_totales')
              .select('presupuesto_id, base')
              .in('presupuesto_id', data.map((p) => p.id))
            if (totales.error) throw totales.error
            return data.map((p) => ({ ...p, base: totales.data.find((t) => t.presupuesto_id === p.id)?.base ?? 0 }))
          }),
        ])
      return { obrasEnCurso, enviados, borradores, clientes, trabajadores, precios, usuarios, obras, presupuestos }
    },
  })

  const r = resumen.data
  // Cada cifra enlaza a su apartado; sin permiso sobre el apartado, la cifra se ve pero no enlaza
  const cifras = [
    { visible: ve.obras, valor: r?.obrasEnCurso, etiqueta: 'Obras en ejecución', a: '/obras' },
    { visible: ve.presupuestos, valor: r?.enviados, etiqueta: 'Presupuestos pendientes de respuesta', a: '/presupuestos' },
    { visible: ve.presupuestos, valor: r?.borradores, etiqueta: 'Presupuestos en borrador', a: '/presupuestos' },
    { visible: ve.clientes, valor: r?.clientes, etiqueta: 'Clientes', a: '/clientes' },
    {
      visible: ve.trabajadores,
      valor: r?.trabajadores,
      etiqueta: 'Trabajadores activos',
      a: puede('ajustes', 'ver') ? '/ajustes/trabajadores' : null,
    },
    { visible: ve.precios, valor: r?.precios, etiqueta: 'Precios en la base', a: '/precios' },
    { visible: ve.usuarios, valor: r?.usuarios, etiqueta: 'Usuarios activos', a: '/ajustes/usuarios' },
  ].filter((c) => c.visible)

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 p-4">
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Hola, {perfil?.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {[roles?.find((x) => x.codigo === perfil?.rol)?.nombre, fechaDeHoy].filter(Boolean).join(' · ')}
          </p>
        </div>
        {/* En el móvil el logo ya va en la barra de arriba */}
        <div className="hidden w-56 shrink-0 gap-2 sm:grid">
          <img src={logo} alt="IMTEX" className="w-40 justify-self-center" />
          <img src={lema} alt="Soluciones técnicas para industria y construcción" />
        </div>
      </header>

      {resumen.isError && (
        <p role="alert" className="text-sm text-destructive">
          No se ha podido cargar el resumen. Recarga la página.
        </p>
      )}

      {cifras.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay apartados disponibles para tu perfil.</p>
      ) : (
        <ul className="grid grid-cols-2 border-t border-l sm:grid-cols-3 lg:grid-cols-4">
          {cifras.map((c) => {
            const contenido = (
              <>
                <span className="text-2xl font-semibold tabular-nums">{c.valor ?? '–'}</span>
                <span className="text-sm text-muted-foreground">{c.etiqueta}</span>
              </>
            )
            const clases = 'flex h-full flex-col gap-0.5 p-4'
            return (
              <li key={c.etiqueta} className="border-r border-b">
                {c.a ? (
                  <Link to={c.a} className={`${clases} hover:bg-muted`}>
                    {contenido}
                  </Link>
                ) : (
                  <div className={clases}>{contenido}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {ve.obras && (
          <Lista titulo="Obras en ejecución" a="/obras">
            {r?.obras?.length === 0 && (
              <Vacio>No hay obras en ejecución. Se crean en Obras o desde un presupuesto aceptado.</Vacio>
            )}
            {r?.obras?.map((o) => (
              <Fila key={o.id} a="/obras" titulo={`${o.codigo} · ${o.nombre}`} dato={euros(o.importe_pedido)} />
            ))}
          </Lista>
        )}
        {ve.presupuestos && (
          <Lista titulo="Últimos presupuestos" a="/presupuestos">
            {r?.presupuestos?.length === 0 && (
              <Vacio>
                Todavía no hay presupuestos.
                {puede('presupuestos', 'editar') && (
                  <>
                    {' '}
                    <Link to="/presupuestos/nuevo" className="font-medium text-primary underline">
                      Crear el primero
                    </Link>
                  </>
                )}
              </Vacio>
            )}
            {r?.presupuestos?.map((p) => (
              <Fila
                key={p.id}
                a={`/presupuestos/${p.id}`}
                titulo={`${p.codigo} · ${p.titulo || '(sin título)'}`}
                detalle={fecha(p.fecha)}
                dato={euros(p.base)}
                extra={<InsigniaEstado estado={p.estado as Estado} />}
              />
            ))}
          </Lista>
        )}
      </div>
    </div>
  )
}

function Lista({ titulo, a, children }: { titulo: string; a: string; children: ReactNode }) {
  return (
    <section className="grid content-start gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{titulo}</h2>
        <Link to={a} className="text-sm text-muted-foreground underline">
          Ver todo
        </Link>
      </div>
      <ul className="divide-y rounded-lg border">{children}</ul>
    </section>
  )
}

function Vacio({ children }: { children: ReactNode }) {
  return <li className="p-3 text-sm text-muted-foreground">{children}</li>
}

function Fila({
  a,
  titulo,
  detalle,
  dato,
  extra,
}: {
  a: string
  titulo: string
  detalle?: string
  dato: string
  extra?: ReactNode
}) {
  return (
    <li>
      <Link to={a} className="flex items-center gap-3 px-3 py-2 hover:bg-muted">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{titulo}</span>
          {detalle && <span className="block text-xs text-muted-foreground">{detalle}</span>}
        </span>
        {extra}
        <span className="text-sm font-medium tabular-nums">{dato}</span>
      </Link>
    </li>
  )
}
