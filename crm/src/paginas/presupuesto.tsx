import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Copy, Plus, Printer, RefreshCw, Save, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Campo, Selector } from '@/components/campo'
import { EditorPartida } from '@/components/editor-partida'
import { EntradaNumero } from '@/components/entrada-numero'
import { ConfirmarBorrado } from '@/components/listado'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { partidaCostes, sumaResumen } from '@/lib/calculos/presupuesto'
import { euros } from '@/lib/formato'
import {
  cargarPresupuesto,
  codigoPartida,
  errorPartida,
  ESTADOS,
  guardarPresupuesto,
  lineaDePrecio,
  nuevaClave,
  partidaNueva,
  presupuestoNuevo,
  siguienteCodigo,
  usePartidasTipo,
  type Estado,
  type PartidaEdicion,
  type PresupuestoEdicion,
} from '@/lib/presupuestos'
import { useSesion } from '@/lib/sesion'
import { mensajeError, supabase } from '@/lib/supabase'
import { useTabla } from '@/lib/tabla'
import { InsigniaEstado } from './presupuestos'

/** Carga el presupuesto (o prepara uno nuevo, en blanco o copia de otro) y monta el editor. */
export function Presupuesto() {
  const { id } = useParams()
  const [parametros] = useSearchParams()
  const desde = parametros.get('desde')
  const esNuevo = id === 'nuevo'

  const inicial = useQuery({
    queryKey: ['presupuesto', id, desde],
    // El editor trabaja sobre una copia local: no se recarga solo al volver a la pestaña
    staleTime: Infinity,
    gcTime: esNuevo ? 0 : undefined,
    queryFn: async (): Promise<PresupuestoEdicion> => {
      if (!esNuevo) return cargarPresupuesto(id!)
      const { data, error } = await supabase.from('presupuestos').select('codigo')
      if (error) throw error
      const nuevo = presupuestoNuevo(siguienteCodigo(data.map((p) => p.codigo)))
      if (!desde) return nuevo
      const origen = await cargarPresupuesto(desde)
      return {
        ...origen,
        id: null,
        codigo: nuevo.codigo,
        fecha: nuevo.fecha,
        estado: 'borrador',
        partidas: origen.partidas.map((p) => ({ ...p, clave: nuevaClave() })),
      }
    },
  })

  if (inicial.isError) return <p className="p-4 text-sm text-destructive">{mensajeError(inicial.error)}</p>
  if (!inicial.data) return <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
  // La clave hace que el editor se reinicie con los datos recién guardados
  return <EditorPresupuesto key={`${id}-${desde}-${inicial.dataUpdatedAt}`} inicial={inicial.data} />
}

type Pestana = 'datos' | 'partidas' | 'resumen'

function EditorPresupuesto({ inicial }: { inicial: PresupuestoEdicion }) {
  const { puede } = useSesion()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [p, setP] = useState(inicial)
  const [pestana, setPestana] = useState<Pestana>(inicial.id ? 'partidas' : 'datos')
  const [borrando, setBorrando] = useState(false)
  const clientes = useTabla('clientes', 'nombre').lista.data ?? []
  const precios = useTabla('precios', 'codigo').lista.data ?? []
  const tipos = usePartidasTipo(precios).data ?? []

  const puedeEditar = puede('presupuestos', 'editar')
  const editable = puedeEditar && p.estado === 'borrador'
  const sucio = JSON.stringify(p) !== JSON.stringify(inicial)
  const resumen = sumaResumen(p.partidas, p.iva_pct)
  const cambiar = (cambios: Partial<PresupuestoEdicion>) => setP((actual) => ({ ...actual, ...cambios }))

  // Aviso al salir con cambios sin guardar (dentro de la app y al cerrar la pestaña)
  const saltarAviso = useRef(false)
  const bloqueo = useBlocker(
    ({ currentLocation, nextLocation }) =>
      sucio && !saltarAviso.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (!sucio) return
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [sucio])

  const refrescar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['presupuesto'] }),
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] }),
    ])
  const alFallar = (error: Error) => toast.error(mensajeError(error))

  const guardar = useMutation({
    mutationFn: guardarPresupuesto,
    onSuccess: async (id) => {
      toast.success('Guardado')
      saltarAviso.current = true
      await refrescar()
      if (!p.id) navigate(`/presupuestos/${id}`, { replace: true })
    },
    onError: alFallar,
  })

  const cambiarEstado = useMutation({
    mutationFn: async (estado: Estado) => {
      const { error } = await supabase.from('presupuestos').update({ estado }).eq('id', p.id!)
      if (error) throw error
    },
    onSuccess: refrescar,
    onError: alFallar,
  })

  const borrar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('presupuestos').delete().eq('id', p.id!)
      if (error) throw error
    },
    onSuccess: async () => {
      toast.success('Borrado')
      saltarAviso.current = true
      await queryClient.invalidateQueries({ queryKey: ['presupuestos'] })
      navigate('/presupuestos', { replace: true })
    },
    onError: alFallar,
  })

  // Obra creada desde este presupuesto (si la hay y se pueden ver las obras)
  const obra = useQuery({
    queryKey: ['obras', 'presupuesto', p.id],
    enabled: !!p.id && puede('obras', 'ver'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obras')
        .select('id, codigo')
        .eq('presupuesto_id', p.id!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
  const crearObra = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('obras').insert({
        codigo: p.codigo,
        nombre: p.titulo || p.codigo,
        cliente_id: p.cliente_id,
        localidad: p.localidad || null,
        importe_pedido: Number(resumen.base.toFixed(2)),
        presupuesto_id: p.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Obra creada')
      return queryClient.invalidateQueries({ queryKey: ['obras'] })
    },
    onError: alFallar,
  })

  function alGuardar() {
    if (!p.codigo.trim()) return toast.error('El presupuesto necesita un código.')
    const error = p.partidas.map(errorPartida).find(Boolean)
    if (error) return toast.error(error)
    guardar.mutate(p)
  }

  const cambiarPartida = (clave: string, partida: PartidaEdicion) =>
    cambiar({ partidas: p.partidas.map((x) => (x.clave === clave ? partida : x)) })
  const anadirPartida = (partida: PartidaEdicion) => cambiar({ partidas: [...p.partidas, partida] })
  function moverPartida(indice: number, salto: -1 | 1) {
    const partidas = [...p.partidas]
    const destino = indice + salto
    if (destino < 0 || destino >= partidas.length) return
    ;[partidas[indice], partidas[destino]] = [partidas[destino], partidas[indice]]
    cambiar({ partidas })
  }

  function actualizarPrecios() {
    let cambiadas = 0
    const partidas = p.partidas.map((partida) => ({
      ...partida,
      lineas: partida.lineas.map((l) => {
        const precio = precios.find((x) => x.id === l.precio_id)
        if (!precio) return l
        const nueva = lineaDePrecio(precio, l.rendimiento)
        if (JSON.stringify(nueva) !== JSON.stringify(l)) cambiadas++
        return nueva
      }),
    }))
    cambiar({ partidas })
    toast.success(
      cambiadas ? `${cambiadas} líneas actualizadas. Revisa y guarda.` : 'Todas las líneas ya tenían el precio vigente.',
    )
  }

  const texto = (campo: 'codigo' | 'titulo' | 'contacto' | 'localidad' | 'validez' | 'forma_pago' | 'plazo') => ({
    value: p[campo],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => cambiar({ [campo]: e.target.value }),
  })

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto min-w-0 truncate text-xl font-semibold">
          {p.codigo} {p.titulo && `· ${p.titulo}`}
        </h1>
        <InsigniaEstado estado={p.estado} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {editable && (
          <Button onClick={alGuardar} disabled={!sucio || guardar.isPending}>
            <Save /> {guardar.isPending ? 'Guardando…' : sucio ? 'Guardar' : 'Guardado'}
          </Button>
        )}
        {p.id && (
          <>
            <Button variant="outline" asChild>
              <Link to={`/presupuestos/${p.id}/imprimir`}>
                <Printer /> Imprimir
              </Link>
            </Button>
            {puedeEditar && (
              <>
                <Button variant="outline" asChild>
                  <Link to={`/presupuestos/nuevo?desde=${p.id}`}>
                    <Copy /> Duplicar
                  </Link>
                </Button>
                <Selector
                  aria-label="Estado"
                  className="w-auto"
                  value={p.estado}
                  disabled={sucio || cambiarEstado.isPending}
                  title={sucio ? 'Guarda los cambios antes de cambiar el estado' : undefined}
                  onChange={(e) => cambiarEstado.mutate(e.target.value as Estado)}
                >
                  {Object.entries(ESTADOS).map(([valor, nombre]) => (
                    <option key={valor} value={valor}>
                      {nombre}
                    </option>
                  ))}
                </Selector>
              </>
            )}
            {editable && (
              <Button variant="ghost" size="icon" aria-label="Borrar presupuesto" onClick={() => setBorrando(true)}>
                <Trash2 />
              </Button>
            )}
          </>
        )}
      </div>

      {puedeEditar && !editable && (
        <p className="rounded-lg bg-muted p-3 text-sm">
          Este presupuesto está {ESTADOS[p.estado].toLowerCase()} y no se puede modificar. Para cambiarlo, vuelve a
          ponerlo en borrador o duplícalo.
        </p>
      )}

      {p.estado === 'aceptado' &&
        (obra.data ? (
          <p className="rounded-lg bg-muted p-3 text-sm">
            Obra creada: <Link to="/obras" className="font-medium underline">{obra.data.codigo}</Link>
          </p>
        ) : (
          puede('obras', 'editar') &&
          obra.isSuccess && (
            <Button className="justify-self-start" onClick={() => crearObra.mutate()} disabled={crearObra.isPending}>
              <Plus /> Crear la obra con este presupuesto
            </Button>
          )
        ))}

      <div role="tablist" className="flex gap-1 border-b">
        {(['datos', 'partidas', 'resumen'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={pestana === t}
            className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground aria-selected:border-marca aria-selected:text-foreground"
            onClick={() => setPestana(t)}
          >
            {{ datos: 'Datos', partidas: `Partidas (${p.partidas.length})`, resumen: 'Resumen' }[t]}
          </button>
        ))}
        <span className="ml-auto self-center text-sm font-medium tabular-nums">{euros(resumen.base)} + IVA</span>
      </div>

      {pestana === 'datos' && (
        <fieldset disabled={!editable} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <Campo etiqueta="Nº de presupuesto">
              <Input {...texto('codigo')} />
            </Campo>
            <Campo etiqueta="Obra (título)">
              <Input {...texto('titulo')} />
            </Campo>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Cliente">
              <Selector value={p.cliente_id ?? ''} onChange={(e) => cambiar({ cliente_id: e.target.value || null })}>
                <option value="">Sin cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Persona de contacto">
              <Input {...texto('contacto')} />
            </Campo>
            <Campo etiqueta="Localidad de la obra">
              <Input {...texto('localidad')} />
            </Campo>
            <Campo etiqueta="Fecha">
              <Input type="date" value={p.fecha} onChange={(e) => cambiar({ fecha: e.target.value || p.fecha })} />
            </Campo>
            <Campo etiqueta="Validez de la oferta">
              <Input {...texto('validez')} />
            </Campo>
            <Campo etiqueta="Plazo de ejecución">
              <Input {...texto('plazo')} />
            </Campo>
          </div>
          <Campo etiqueta="Forma de pago">
            <Input {...texto('forma_pago')} />
          </Campo>
          <div className="grid grid-cols-3 gap-3">
            <Campo etiqueta="IVA %">
              <EntradaNumero valor={p.iva_pct} onCambio={(iva_pct) => cambiar({ iva_pct })} />
            </Campo>
            <Campo etiqueta="G. generales % por defecto">
              <EntradaNumero valor={p.gg_pct_def} onCambio={(gg_pct_def) => cambiar({ gg_pct_def })} />
            </Campo>
            <Campo etiqueta="Beneficio % por defecto">
              <EntradaNumero valor={p.ben_pct_def} onCambio={(ben_pct_def) => cambiar({ ben_pct_def })} />
            </Campo>
          </div>
          {editable && p.partidas.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() =>
                cambiar({ partidas: p.partidas.map((x) => ({ ...x, gg_pct: p.gg_pct_def, ben_pct: p.ben_pct_def })) })
              }
            >
              Aplicar estos porcentajes a todas las partidas
            </Button>
          )}
          <Campo etiqueta="Carta de presentación">
            <Textarea rows={10} value={p.carta} onChange={(e) => cambiar({ carta: e.target.value })} />
          </Campo>
          <Campo etiqueta="Condiciones particulares">
            <Textarea rows={8} value={p.condiciones} onChange={(e) => cambiar({ condiciones: e.target.value })} />
          </Campo>
        </fieldset>
      )}

      {pestana === 'partidas' && (
        <div className="grid gap-3">
          {p.partidas.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay partidas.</p>}
          {p.partidas.map((partida, i) => (
            <details key={partida.clave} className="group" open={p.partidas.length === 1 || undefined}>
              <summary className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-2 text-sm hover:bg-muted">
                <span className="font-medium">{partida.codigo}</span>
                <span className="min-w-0 flex-1 truncate">{partida.titulo || '(sin título)'}</span>
                <span className="font-medium tabular-nums">
                  {euros(partidaCostes(partida).total * (partida.cantidad || 1))}
                </span>
              </summary>
              <EditorPartida
                partida={partida}
                onCambio={(nueva) => cambiarPartida(partida.clave, nueva)}
                precios={precios}
                soloLectura={!editable}
                acciones={
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Subir partida"
                      disabled={i === 0}
                      onClick={() => moverPartida(i, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Bajar partida"
                      disabled={i === p.partidas.length - 1}
                      onClick={() => moverPartida(i, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Borrar partida"
                      onClick={() => cambiar({ partidas: p.partidas.filter((x) => x.clave !== partida.clave) })}
                    >
                      <Trash2 />
                    </Button>
                  </>
                }
              />
            </details>
          ))}
          {editable && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  anadirPartida(partidaNueva(codigoPartida(p.partidas.length + 1), p.gg_pct_def, p.ben_pct_def))
                }
              >
                <Plus /> Partida en blanco
              </Button>
              {tipos.length > 0 && (
                <Selector
                  aria-label="Añadir desde una partida tipo"
                  className="w-auto"
                  value=""
                  onChange={(e) => {
                    const tipo = tipos.find((t) => t.id === e.target.value)
                    if (!tipo) return
                    anadirPartida({
                      ...tipo.partida,
                      clave: nuevaClave(),
                      // Como la herramienta: el código T.xxx de la plantilla pasa a P.xxx
                      codigo: tipo.partida.codigo.startsWith('T.')
                        ? codigoPartida(p.partidas.length + 1)
                        : tipo.partida.codigo,
                    })
                  }}
                >
                  <option value="">+ Desde una partida tipo…</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.partida.codigo} · {t.partida.titulo}
                    </option>
                  ))}
                </Selector>
              )}
              {p.partidas.length > 0 && (
                <Button variant="outline" onClick={actualizarPrecios}>
                  <RefreshCw /> Actualizar con la base de precios
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {pestana === 'resumen' && (
        <dl className="grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 tabular-nums">
          <dt className="text-muted-foreground">Coste directo</dt>
          <dd className="text-right">{euros(resumen.cd)}</dd>
          <dt className="text-muted-foreground">Gastos generales</dt>
          <dd className="text-right">{euros(resumen.gg)}</dd>
          <dt className="text-muted-foreground">Beneficio</dt>
          <dd className="text-right">{euros(resumen.be)}</dd>
          <dt className="border-t pt-1.5 font-medium">Base imponible</dt>
          <dd className="border-t pt-1.5 text-right font-medium">{euros(resumen.base)}</dd>
          <dt className="text-muted-foreground">IVA ({p.iva_pct} %)</dt>
          <dd className="text-right">{euros(resumen.iva)}</dd>
          <dt className="border-t pt-1.5 text-lg font-semibold">Total</dt>
          <dd className="border-t pt-1.5 text-right text-lg font-semibold">{euros(resumen.total)}</dd>
        </dl>
      )}

      <ConfirmarBorrado
        nombre={borrando ? p.codigo : null}
        onConfirmar={() => borrar.mutate()}
        onCerrar={() => setBorrando(false)}
      />
      <AlertDialog open={bloqueo.state === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hay cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>Si sales ahora, se pierden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => bloqueo.reset?.()}>Seguir editando</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => bloqueo.proceed?.()}>
              Salir sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
