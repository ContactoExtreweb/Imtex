import type { PostgrestError } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Cifras } from '@/components/cifras'
import { ConfirmarBorrado } from '@/components/listado'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { etiquetaMes } from '@/lib/calculos/control-obra'
import { resumenEnEjecucion, type AvisoObra } from '@/lib/control-obra'
import { euros, fecha, pct } from '@/lib/formato'
import { useSecciones } from '@/lib/menu'
import type { Estado } from '@/lib/presupuestos'
import { useSesion } from '@/lib/sesion'
import { mensajeError, supabase, type Fila as FilaDe } from '@/lib/supabase'
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
 * Portada: resumen de lo que cada usuario puede ver, accesos a sus apartados y sus notas.
 * No hay un resumen por rol escrito a mano: sale de sus permisos, así que si cambia la matriz
 * de permisos, cambia la portada.
 */
export function Inicio() {
  const { perfil, puede } = useSesion()
  const roles = useRoles().data
  const secciones = useSecciones()
  const [fechaDeHoy] = useState(() => hoy.format(new Date()))
  const ve = {
    obras: puede('obras', 'ver'),
    presupuestos: puede('presupuestos', 'ver'),
    clientes: puede('clientes', 'ver'),
    // La lista de trabajadores la leen también quienes llevan el control de obra
    trabajadores: puede('ajustes', 'ver') || puede('control_obra', 'ver'),
    precios: puede('base_precios', 'ver'),
    usuarios: puede('usuarios', 'ver'),
    control: puede('control_obra', 'ver'),
  }

  const resumen = useQuery({
    queryKey: ['inicio', perfil?.rol],
    queryFn: async () => {
      const si = <T,>(condicion: boolean, consulta: () => Promise<T>) => (condicion ? consulta() : null)
      const [obrasEnCurso, enviados, borradores, clientes, trabajadores, precios, usuarios, obras, presupuestos, origen] =
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
          // Obras en ejecución: totales a origen, cifras del mes y avisos, con las mismas cuentas que la ficha
          si(ve.control, () => resumenEnEjecucion(ve.presupuestos)),
        ])
      return { obrasEnCurso, enviados, borradores, clientes, trabajadores, precios, usuarios, obras, presupuestos, origen }
    },
  })

  const r = resumen.data
  const nombreMes = (mes: string) => etiquetaMes(mes).split('-')[0] // «octubre-26» → «octubre»
  // Cada cifra enlaza a su apartado; sin permiso sobre el apartado, la cifra se ve pero no enlaza
  const cifras: { visible: boolean; valor?: ReactNode; etiqueta: string; nota?: string | null; a: string | null }[] = [
    { visible: ve.obras, valor: r?.obrasEnCurso, etiqueta: 'Obras en ejecución', a: '/obras' },
    // Lo del mes en curso, con el mes anterior debajo para comparar
    {
      visible: ve.control,
      valor: r?.origen && euros(r.origen.actual.certificado),
      etiqueta: r?.origen ? `Certificado en ${nombreMes(r.origen.actual.mes)}` : 'Certificado este mes',
      nota: r?.origen && `${nombreMes(r.origen.anterior.mes)}: ${euros(r.origen.anterior.certificado)}`,
      a: '/control-obra',
    },
    {
      visible: ve.control,
      valor: r?.origen && euros(r.origen.actual.resultado),
      etiqueta: r?.origen ? `Resultado de ${nombreMes(r.origen.actual.mes)}` : 'Resultado de este mes',
      nota: r?.origen && `${nombreMes(r.origen.anterior.mes)}: ${euros(r.origen.anterior.resultado)}`,
      a: '/control-obra',
    },
    {
      visible: ve.control,
      valor: r?.origen && euros(r.origen.certificado),
      etiqueta: 'Certificado a origen en obras en ejecución',
      a: '/control-obra',
    },
    {
      visible: ve.control,
      valor: r?.origen ? (r.origen.margen === null ? '–' : pct(r.origen.margen)) : undefined,
      etiqueta: 'Margen a origen en obras en ejecución',
      a: '/control-obra',
    },
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
    <div className="mx-auto grid w-full max-w-6xl gap-8 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <header className="lg:col-span-2">
        <h1 className="text-2xl font-semibold">Hola, {perfil?.nombre}</h1>
        <p className="text-sm text-muted-foreground">
          {[roles?.find((x) => x.codigo === perfil?.rol)?.nombre, fechaDeHoy].filter(Boolean).join(' · ')}
        </p>
      </header>

      <div className="grid content-start gap-8">
        {resumen.isError && (
          <p role="alert" className="text-sm text-destructive">
            No se ha podido cargar el resumen. Recarga la página.
          </p>
        )}

        {r?.origen && <Avisos avisos={r.origen.avisos} conPresupuestos={ve.presupuestos} />}

        {cifras.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay apartados disponibles para tu perfil.</p>
        ) : (
          <Cifras cifras={cifras} />
        )}

        {/* Dos columnas solo si caben de verdad: con el menú abierto (tablet) el hueco es estrecho */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(17rem,100%),1fr))] gap-8">
          {ve.obras && (
            <Lista titulo="Obras en ejecución" a="/obras">
              {r?.obras?.length === 0 && (
                <Vacio>No hay obras en ejecución. Se crean en Obras o desde un presupuesto aceptado.</Vacio>
              )}
              {r?.obras?.map((o) => (
                <Fila key={o.id} a={ve.control ? `/control-obra/${o.id}` : '/obras'} titulo={`${o.codigo} · ${o.nombre}`} dato={euros(o.importe_pedido)} />
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

        {/* Accesos a los apartados, los mismos del menú */}
        {secciones.map((s) => (
          <section key={s.titulo ?? 'principal'} className="grid gap-2">
            <h2 className="font-semibold">{s.titulo ?? 'Accesos'}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {s.enlaces.map(({ a, texto, icono: Icono }) => (
                <Link key={a} to={a} className="flex items-center gap-3 rounded-lg border p-4 font-medium hover:bg-muted">
                  <Icono className="size-5 text-marca" /> {texto}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Notas />
    </div>
  )
}

/** Obras en ejecución que piden atención: margen bajo o desviación del presupuesto (lib/calculos/avisos.ts). */
function Avisos({ avisos, conPresupuestos }: { avisos: AvisoObra[]; conPresupuestos: boolean }) {
  return (
    <section className="grid gap-2">
      <h2 className="font-semibold">Avisos</h2>
      {avisos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {conPresupuestos
            ? 'Ninguna obra en ejecución tiene el margen bajo ni se desvía de su presupuesto.'
            : 'Ninguna obra en ejecución tiene el margen bajo.'}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {avisos.map((a) => (
            <li key={`${a.obra.id}-${a.tipo}`}>
              <Link
                // Los avisos de presupuesto llevan a la comparativa de la obra
                to={`/control-obra/${a.obra.id}${a.tipo === 'coste_superado' || a.tipo === 'desviacion' ? '?hoja=comparativa' : ''}`}
                className="flex items-start gap-3 px-3 py-2 hover:bg-muted"
              >
                <TriangleAlert
                  aria-hidden
                  className={`mt-0.5 size-4 shrink-0 ${a.nivel === 'grave' ? 'text-destructive' : 'text-aviso'}`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium max-sm:line-clamp-2 sm:truncate">
                    {a.obra.codigo} · {a.obra.nombre}
                  </span>
                  <span className="block text-sm text-muted-foreground">{a.texto}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
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
          <span className="block text-sm font-medium max-sm:line-clamp-2 sm:truncate">{titulo}</span>
          {detalle && <span className="block text-xs text-muted-foreground">{detalle}</span>}
        </span>
        {extra}
        <span className="shrink-0 text-sm font-medium whitespace-nowrap tabular-nums">{dato}</span>
      </Link>
    </li>
  )
}

// Notas rápidas ------------------------------------------------------------------

type Nota = FilaDe<'notas'>

/** Notas personales: cada usuario ve solo las suyas (lo garantiza el RLS de la tabla notas). */
function Notas() {
  const queryClient = useQueryClient()
  const [borrando, setBorrando] = useState<Nota | null>(null)
  const notas = useQuery({
    queryKey: ['notas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notas').select().order('created_at')
      if (error) throw error
      return data
    },
  })
  const alTerminar = {
    onError: (error: Error) => toast.error(mensajeError(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notas'] }),
  }
  const crear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notas').insert({ texto: '' })
      if (error) throw error
    },
    ...alTerminar,
  })
  const borrar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notas').delete().eq('id', id)
      if (error) throw error
    },
    ...alTerminar,
  })

  return (
    <section className="grid content-start gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Notas rápidas</h2>
        <Button variant="outline" size="sm" onClick={() => crear.mutate()} disabled={crear.isPending}>
          <Plus /> Añadir
        </Button>
      </div>
      {notas.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Apunta aquí lo que no quieras olvidar. Se guarda solo y solo lo ves tú.
        </p>
      )}
      <ul className="grid gap-3">
        {notas.data?.map((nota) => (
          <NotaEditable
            key={nota.id}
            nota={nota}
            // Una nota vacía se borra sin preguntar
            onBorrar={(texto) => (texto.trim() ? setBorrando({ ...nota, texto }) : borrar.mutate(nota.id))}
          />
        ))}
      </ul>
      <ConfirmarBorrado
        nombre={borrando ? borrando.texto.trim().slice(0, 40) : null}
        onConfirmar={() => borrando && borrar.mutate(borrando.id)}
        onCerrar={() => setBorrando(null)}
      />
    </section>
  )
}

/** Se guarda sola: un momento después de dejar de escribir, al salir del cuadro y al cambiar de página. */
function NotaEditable({ nota, onBorrar }: { nota: Nota; onBorrar: (texto: string) => void }) {
  const [texto, setTexto] = useState(nota.texto)
  const [estado, setEstado] = useState<'guardado' | 'pendiente' | 'error'>('guardado')
  const pendiente = useRef<string | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined)

  const guardar = useCallback(async () => {
    clearTimeout(temporizador.current)
    const valor = pendiente.current
    if (valor === null) return
    pendiente.current = null
    const { error } = await supabase.from('notas').update({ texto: valor }).eq('id', nota.id)
    if (error) pendiente.current ??= valor // se reintenta en el siguiente guardado
    setEstado(error ? 'error' : pendiente.current === null ? 'guardado' : 'pendiente')
  }, [nota.id])

  // Si se sale de la portada con algo sin guardar, se guarda al desmontar
  useEffect(() => () => void guardar(), [guardar])

  return (
    <li className="grid gap-1">
      <Textarea
        aria-label="Nota"
        placeholder="Escribe una nota…"
        className="field-sizing-content min-h-24 bg-background"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setEstado('pendiente')
          pendiente.current = e.target.value
          clearTimeout(temporizador.current)
          temporizador.current = setTimeout(guardar, 800)
        }}
        onBlur={guardar}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span role="status" className={estado === 'error' ? 'text-destructive' : undefined}>
          {{ guardado: 'Guardado', pendiente: 'Guardando…', error: 'No se ha podido guardar. Revisa la conexión.' }[estado]}
        </span>
        <Button variant="ghost" size="icon" aria-label="Borrar nota" onClick={() => onBorrar(texto)}>
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}
