import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, MessageCircle, Plus, RotateCw, Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Campo, Selector } from '@/components/campo'
import { Confirmar } from '@/components/listado'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { costeKm } from '@/lib/calculos/combustible'
import { euros, fecha, fechaHora, leerNumero, numeroATexto } from '@/lib/formato'
import { apuntarParte, leerParte, telefonoATexto, useParte, type Linea, type Parte } from '@/lib/partes'
import { useSesion } from '@/lib/sesion'
import { mensajeError, supabase } from '@/lib/supabase'
import { useTabla } from '@/lib/tabla'
import { cn } from '@/lib/utils'
import { InsigniaParte } from './partes'

/** Un parte en papel: la foto a un lado y lo leído al otro, para revisarlo y apuntarlo. */
export function ParteFicha() {
  const { id } = useParams()
  const consulta = useParte(id)

  if (consulta.isError) return <p className="p-4 text-sm text-destructive">{mensajeError(consulta.error)}</p>
  if (consulta.isPending) return <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
  if (!consulta.data) {
    return (
      <p className="p-4 text-sm">
        Este parte no existe o no tienes permiso para verlo.{' '}
        <Link to="/partes" className="underline">
          Volver a los partes
        </Link>
      </p>
    )
  }
  // key: al volver a leerlo con la IA (o al cambiar de estado), el formulario empieza con lo nuevo
  const { parte, foto } = consulta.data
  return <Ficha key={`${parte.id}-${parte.updated_at}`} parte={parte} foto={foto} />
}

// El formulario trabaja con texto (como los campos) y se pasa a columnas al guardar
type FilaForm = { nombre: string; trabajador_id: string; horas_ord: string; horas_ext: string }
const TEXTOS = [
  'vehiculo',
  'trabajos',
  'material_retirado',
  'material_utilizado',
  'material_devuelto',
  'instrucciones_calidad',
  'medio_ambiente',
  'mediciones',
] as const
const HORAS = ['salida_nave', 'llegada_obra', 'salida_obra', 'llegada_nave'] as const
type Valores = Record<(typeof TEXTOS)[number] | (typeof HORAS)[number], string> & {
  obra_id: string
  fecha: string
  tipo_vehiculo: string
  km_salida: string
  km_llegada: string
  lineas: FilaForm[]
}

const texto = (n: number | null | undefined) => (n == null ? '' : numeroATexto(n))

function aValores(p: Parte): Valores {
  return {
    obra_id: p.obra_id ?? '',
    fecha: p.fecha ?? '',
    tipo_vehiculo: p.tipo_vehiculo ?? 'furgon',
    km_salida: p.km_salida == null ? '' : String(p.km_salida),
    km_llegada: p.km_llegada == null ? '' : String(p.km_llegada),
    ...(Object.fromEntries(TEXTOS.map((c) => [c, p[c] ?? ''])) as Record<(typeof TEXTOS)[number], string>),
    ...(Object.fromEntries(HORAS.map((c) => [c, p[c]?.slice(0, 5) ?? ''])) as Record<(typeof HORAS)[number], string>),
    lineas: p.lineas.map((l) => ({
      nombre: l.nombre,
      trabajador_id: l.trabajador_id ?? '',
      horas_ord: texto(l.horas_ord),
      horas_ext: l.horas_ext ? texto(l.horas_ext) : '',
    })),
  }
}

/** Valores del formulario → columnas de partes_trabajo, o un mensaje si un número no se entiende. */
function aColumnas(v: Valores) {
  const numero = (s: string, que: string) => {
    if (!s.trim()) return null
    const n = leerNumero(s)
    if (n === null || n < 0) throw new Error(`${que}: «${s}» no es un número.`)
    return n
  }
  const lineas: Linea[] = v.lineas.map((l) => ({
    nombre: l.nombre,
    trabajador_id: l.trabajador_id || null,
    horas_ord: numero(l.horas_ord, 'Horas') ?? 0,
    horas_ext: numero(l.horas_ext, 'Horas extra') ?? 0,
  }))
  return {
    obra_id: v.obra_id || null,
    fecha: v.fecha || null,
    lineas,
    tipo_vehiculo: v.tipo_vehiculo === 'camion' ? 'camion' : 'furgon',
    km_salida: numero(v.km_salida, 'Km de salida'),
    km_llegada: numero(v.km_llegada, 'Km de llegada'),
    ...Object.fromEntries(TEXTOS.map((c) => [c, v[c].trim() || null])),
    ...Object.fromEntries(HORAS.map((c) => [c, v[c] || null])),
  }
}

function Ficha({ parte, foto }: { parte: Parte; foto: string | null }) {
  const queryClient = useQueryClient()
  const { puede } = useSesion()
  const cerrado = parte.estado === 'apuntado' || parte.estado === 'descartado'
  const editable = puede('partes_horas', 'editar') && !cerrado
  const [v, setV] = useState(() => aValores(parte))
  const [cambiado, setCambiado] = useState(false)
  const [preguntar, setPreguntar] = useState<'leer' | 'descartar' | null>(null)

  const obras = useTabla('obras', 'codigo').lista.data ?? []
  const trabajadores = useTabla('trabajadores', 'nombre').lista.data ?? []
  const categorias = useTabla('categorias_profesionales', 'nombre').lista.data ?? []
  const tarifas = useQuery({
    queryKey: ['tarifas_combustible'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tarifas_combustible').select().single()
      if (error) throw error
      return data
    },
  }).data

  const poner = (cambios: Partial<Valores>) => {
    setV((antes) => ({ ...antes, ...cambios }))
    setCambiado(true)
  }
  const ponerLinea = (i: number, cambios: Partial<FilaForm>) =>
    poner({ lineas: v.lineas.map((l, j) => (j === i ? { ...l, ...cambios } : l)) })

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['partes_trabajo'] })
  const alFallar = { onError: (error: Error) => toast.error(mensajeError(error), { duration: 10000 }) }

  // Guardar: si esperaba la confirmación por WhatsApp, la oficina se lo queda (y un «Está bien» posterior ya no vale)
  const guardarFormulario = async () => {
    const columnas = aColumnas(v)
    const estado = parte.estado === 'por_confirmar' || parte.estado === 'leyendo' ? { estado: 'revisar' } : {}
    const { error } = await supabase.from('partes_trabajo').update({ ...columnas, ...estado }).eq('id', parte.id)
    if (error) throw error
    setCambiado(false)
  }
  const guardar = useMutation({
    mutationFn: guardarFormulario,
    onSuccess: () => toast.success('Guardado'),
    onSettled: refrescar,
    ...alFallar,
  })
  const apuntar = useMutation({
    mutationFn: async () => {
      await guardarFormulario()
      await apuntarParte(parte.id)
    },
    onSuccess: () => toast.success('Apuntado en el control de obra'),
    onSettled: () =>
      Promise.all([
        refrescar(),
        queryClient.invalidateQueries({ queryKey: ['apuntes'] }),
        queryClient.invalidateQueries({ queryKey: ['control_obra'] }),
        queryClient.invalidateQueries({ queryKey: ['inicio'] }),
      ]),
    ...alFallar,
  })
  const leer = useMutation({
    mutationFn: () => leerParte(parte.id),
    onSuccess: (avisos) => toast.success(avisos.length ? `Leído. Hay ${avisos.length} cosas que mirar.` : 'Leído'),
    onSettled: refrescar,
    ...alFallar,
  })
  const cambiarEstado = useMutation({
    mutationFn: async (estado: 'descartado' | 'revisar') => {
      const { error } = await supabase.from('partes_trabajo').update({ estado }).eq('id', parte.id)
      if (error) throw error
    },
    onSuccess: (_, estado) => toast.success(estado === 'descartado' ? 'Descartado' : 'Recuperado'),
    onSettled: refrescar,
    ...alFallar,
  })
  const ocupado = guardar.isPending || apuntar.isPending || leer.isPending || cambiarEstado.isPending

  // Lo que se apuntará, con los precios de hoy de cada categoría y la tarifa de combustible
  const previa = (() => {
    let horas = 0
    let manoDeObra = 0
    for (const l of v.lineas) {
      const ord = leerNumero(l.horas_ord) ?? 0
      const ext = leerNumero(l.horas_ext) ?? 0
      const categoria = categorias.find((c) => c.id === trabajadores.find((t) => t.id === l.trabajador_id)?.categoria_id)
      horas += ord + ext
      manoDeObra += categoria ? ord * categoria.precio_ord + ext * categoria.precio_ext : 0
    }
    const recorridos = (leerNumero(v.km_llegada) ?? 0) - (leerNumero(v.km_salida) ?? 0)
    const km = v.km_salida && v.km_llegada && recorridos > 0 ? recorridos : 0
    const tarifa = tarifas
      ? costeKm(tarifas.precio_litro_ref, v.tipo_vehiculo === 'camion' ? tarifas.consumo_camion_l100 : tarifas.consumo_furgon_l100)
      : 0
    return { horas, manoDeObra, km, combustible: km * tarifa }
  })()

  const lectura = parte.lectura as { codigo_obra?: string; cliente?: string; obra?: string; localidad?: string } | null
  const enLaHoja = [lectura?.codigo_obra, lectura?.cliente, lectura?.obra, lectura?.localidad].filter(Boolean).join(' · ')
  // Obras en marcha y la que ya tuviera elegida; trabajadores activos y los ya elegidos
  const obrasElegibles = obras.filter((o) => o.estado === 'en_ejecucion' || o.id === v.obra_id)
  const trabajadoresElegibles = trabajadores.filter((t) => t.activo || v.lineas.some((l) => l.trabajador_id === t.id))

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/partes" aria-label="Volver a los partes">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="mr-auto text-xl font-semibold">Parte {parte.fecha ? `del ${fecha(parte.fecha)}` : 'sin fecha'}</h1>
        <InsigniaParte estado={parte.estado} />
      </div>

      <Estado parte={parte} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Foto url={foto} />

        <fieldset disabled={!editable || ocupado} className="grid min-w-0 gap-5">
          {parte.avisos.length > 0 && !cerrado && (
            <div role="note" className="grid gap-1 rounded-lg border border-aviso/40 bg-aviso/8 p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-aviso">
                <TriangleAlert className="size-4" aria-hidden /> Lo que hay que mirar
              </p>
              <ul className="list-disc pl-5">
                {parte.avisos.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <Seccion titulo="Obra y fecha">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <Campo etiqueta="Obra">
                <Selector value={v.obra_id} onChange={(e) => poner({ obra_id: e.target.value })}>
                  <option value="">Elige la obra…</option>
                  {obrasElegibles.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.codigo} · {o.nombre}
                      {o.localidad ? ` (${o.localidad})` : ''}
                    </option>
                  ))}
                </Selector>
                {enLaHoja && <span className="text-xs text-muted-foreground">En la hoja: «{enLaHoja}»</span>}
              </Campo>
              <Campo etiqueta="Fecha">
                <Input type="date" value={v.fecha} onChange={(e) => poner({ fecha: e.target.value })} />
              </Campo>
            </div>
          </Seccion>

          <Seccion titulo="Trabajadores y horas">
            {v.lineas.length === 0 && <p className="text-sm text-muted-foreground">Sin trabajadores.</p>}
            <ul className="grid gap-3">
              {v.lineas.map((l, i) => {
                const elegido = trabajadores.find((t) => t.id === l.trabajador_id)
                return (
                  <li key={i} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_auto] items-end gap-2">
                    <Campo etiqueta="Trabajador">
                      <Selector value={l.trabajador_id} onChange={(e) => ponerLinea(i, { trabajador_id: e.target.value })}>
                        <option value="">¿Quién es?</option>
                        {trabajadoresElegibles.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombre}
                            {t.categoria_id ? '' : ' · sin categoría'}
                          </option>
                        ))}
                      </Selector>
                    </Campo>
                    <Campo etiqueta="Horas">
                      <Input inputMode="decimal" value={l.horas_ord} onChange={(e) => ponerLinea(i, { horas_ord: e.target.value })} />
                    </Campo>
                    <Campo etiqueta="Extra">
                      <Input inputMode="decimal" value={l.horas_ext} onChange={(e) => ponerLinea(i, { horas_ext: e.target.value })} />
                    </Campo>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar a ${elegido?.nombre ?? (l.nombre || 'este trabajador')}`}
                      onClick={() => poner({ lineas: v.lineas.filter((_, j) => j !== i) })}
                    >
                      <Trash2 />
                    </Button>
                    {l.nombre && (
                      <span className="col-span-4 -mt-1 text-xs text-muted-foreground">En la hoja: «{l.nombre}»</span>
                    )}
                    {elegido && !elegido.categoria_id && (
                      <span className="col-span-4 -mt-1 text-xs text-destructive">
                        Sin categoría: asígnasela en Ajustes → Trabajadores, que de ella salen los precios.
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
            <Button
              variant="outline"
              className="justify-self-start"
              onClick={() => poner({ lineas: [...v.lineas, { nombre: '', trabajador_id: '', horas_ord: '', horas_ext: '' }] })}
            >
              <Plus /> Añadir trabajador
            </Button>
          </Seccion>

          <Seccion titulo="Vehículo y horarios">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <Campo etiqueta="Vehículo">
                <Input value={v.vehiculo} onChange={(e) => poner({ vehiculo: e.target.value })} />
              </Campo>
              <Campo etiqueta="Tipo">
                <Selector value={v.tipo_vehiculo} onChange={(e) => poner({ tipo_vehiculo: e.target.value })}>
                  <option value="furgon">Furgoneta</option>
                  <option value="camion">Camión</option>
                </Selector>
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Km de salida">
                <Input inputMode="decimal" value={v.km_salida} onChange={(e) => poner({ km_salida: e.target.value })} />
              </Campo>
              <Campo etiqueta="Km de llegada">
                <Input inputMode="decimal" value={v.km_llegada} onChange={(e) => poner({ km_llegada: e.target.value })} />
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Campo etiqueta="Sale de la nave">
                <Input type="time" value={v.salida_nave} onChange={(e) => poner({ salida_nave: e.target.value })} />
              </Campo>
              <Campo etiqueta="Llega a la obra">
                <Input type="time" value={v.llegada_obra} onChange={(e) => poner({ llegada_obra: e.target.value })} />
              </Campo>
              <Campo etiqueta="Sale de la obra">
                <Input type="time" value={v.salida_obra} onChange={(e) => poner({ salida_obra: e.target.value })} />
              </Campo>
              <Campo etiqueta="Llega a la nave">
                <Input type="time" value={v.llegada_nave} onChange={(e) => poner({ llegada_nave: e.target.value })} />
              </Campo>
            </div>
          </Seccion>

          <Seccion titulo="Trabajos y material">
            <AreaTexto etiqueta="Trabajos realizados (fase de la obra)" valor={v.trabajos} onCambio={(s) => poner({ trabajos: s })} />
            <div className="grid gap-3 md:grid-cols-3">
              <AreaTexto etiqueta="Material retirado del almacén" valor={v.material_retirado} onCambio={(s) => poner({ material_retirado: s })} />
              <AreaTexto etiqueta="Material utilizado en obra" valor={v.material_utilizado} onCambio={(s) => poner({ material_utilizado: s })} />
              <AreaTexto etiqueta="Material devuelto al almacén" valor={v.material_devuelto} onCambio={(s) => poner({ material_devuelto: s })} />
            </div>
            <AreaTexto etiqueta="Croquis y mediciones" valor={v.mediciones} onCambio={(s) => poner({ mediciones: s })} />
            <div className="grid gap-3 md:grid-cols-2">
              <AreaTexto
                etiqueta="Instrucciones técnicas y control de calidad (ISO 9001)"
                valor={v.instrucciones_calidad}
                onCambio={(s) => poner({ instrucciones_calidad: s })}
              />
              <AreaTexto etiqueta="Aspectos medioambientales (ISO 14001)" valor={v.medio_ambiente} onCambio={(s) => poner({ medio_ambiente: s })} />
            </div>
          </Seccion>

          {editable && (
            <div className="sticky bottom-0 -mx-4 grid gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
              <p className="text-sm">
                Al apuntar: <b>{numeroATexto(previa.horas)} h</b> de {v.lineas.length}{' '}
                {v.lineas.length === 1 ? 'trabajador' : 'trabajadores'} ({euros(previa.manoDeObra)})
                {previa.km > 0 && (
                  <>
                    {' '}
                    y <b>{numeroATexto(previa.km)} km</b> de {v.tipo_vehiculo === 'camion' ? 'camión' : 'furgoneta'} (
                    {euros(previa.combustible)})
                  </>
                )}
                .
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => apuntar.mutate()}>{apuntar.isPending ? 'Apuntando…' : 'Apuntar en el control de obra'}</Button>
                <Button variant="outline" disabled={!cambiado} onClick={() => guardar.mutate()}>
                  {guardar.isPending ? 'Guardando…' : 'Guardar sin apuntar'}
                </Button>
                <Button variant="ghost" onClick={() => setPreguntar('leer')}>
                  <Sparkles /> {leer.isPending ? 'Leyendo…' : 'Volver a leer'}
                </Button>
                <Button variant="ghost" className="text-destructive sm:ml-auto" onClick={() => setPreguntar('descartar')}>
                  <Trash2 /> Descartar
                </Button>
              </div>
            </div>
          )}
        </fieldset>
      </div>

      <Confirmar
        titulo={preguntar === 'leer' ? '¿Volver a leer la foto con la IA?' : preguntar === 'descartar' ? '¿Descartar este parte?' : null}
        detalle={
          preguntar === 'leer'
            ? 'Se sustituye lo que hay escrito ahora por lo que lea la IA.'
            : 'No se apunta nada. Se queda en «Descartados», con su foto, por si hay que recuperarlo.'
        }
        accion={preguntar === 'leer' ? 'Volver a leer' : 'Descartar'}
        destructiva={preguntar === 'descartar'}
        onConfirmar={() => (preguntar === 'leer' ? leer.mutate() : cambiarEstado.mutate('descartado'))}
        onCerrar={() => setPreguntar(null)}
      />
    </div>
  )
}

/** De dónde viene el parte y en qué está, con lo que se puede hacer. */
function Estado({ parte }: { parte: Parte }) {
  const queryClient = useQueryClient()
  const { puede } = useSesion()
  const recuperar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('partes_trabajo').update({ estado: 'revisar' }).eq('id', parte.id)
      if (error) throw error
    },
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['partes_trabajo'] }),
  })
  const origen =
    parte.origen === 'whatsapp' ? (
      <span className="inline-flex items-center gap-1">
        <MessageCircle className="size-4" aria-hidden />
        Por WhatsApp{parte.enviado ? ` de ${parte.enviado.nombre}` : ''}
        {parte.telefono ? ` (${telefonoATexto(parte.telefono)})` : ''}
      </span>
    ) : (
      'Subido desde el programa'
    )
  const mensajes: Record<string, ReactNode> = {
    leyendo: 'La IA lo está leyendo. En unos segundos aparece aquí.',
    por_confirmar: `Esperando a que ${parte.enviado?.nombre ?? 'quien lo mandó'} lo confirme por WhatsApp. Si lo cambias o lo apuntas desde aquí, ya no hará falta.`,
    revisar: parte.confirmado_el
      ? 'Se confirmó por WhatsApp, pero no se pudo apuntar solo (mira los avisos).'
      : 'Revísalo con la foto delante y apúntalo.',
    apuntado: (
      <>
        Apuntado el {parte.apuntado_el ? fechaHora(parte.apuntado_el) : '—'}
        {parte.confirmado_el && !parte.apuntado_por ? ', confirmado por WhatsApp' : ''}. Lo que vale ahora son sus apuntes del{' '}
        {parte.obra_id ? (
          <Link to={`/control-obra/${parte.obra_id}`} className="font-medium underline">
            control de obra
          </Link>
        ) : (
          'control de obra'
        )}
        .
      </>
    ),
    descartado: (
      <>
        Descartado: no se ha apuntado nada.{' '}
        {puede('partes_horas', 'editar') && (
          <Button variant="link" className="h-auto p-0" disabled={recuperar.isPending} onClick={() => recuperar.mutate()}>
            Recuperarlo
          </Button>
        )}
      </>
    ),
  }
  return (
    <p className="grid gap-0.5 text-sm text-muted-foreground">
      <span>
        {origen} · {fechaHora(parte.created_at)}
      </span>
      <span className="text-foreground">{mensajes[parte.estado]}</span>
    </p>
  )
}

/** La foto de la hoja. Se gira (los móviles la hacen de lado) y se abre entera para ampliarla. */
function Foto({ url }: { url: string | null }) {
  const [giro, setGiro] = useState(0)
  const [medidas, setMedidas] = useState<{ ancho: number; alto: number } | null>(null)
  if (!url) return <p className="text-sm text-destructive">No se ha podido cargar la foto.</p>
  const tumbada = giro % 180 !== 0
  return (
    <figure className="grid gap-2 lg:sticky lg:top-4">
      <div
        className="relative overflow-hidden rounded-lg border bg-muted"
        // Girada 90°, el marco toma la forma de la foto tumbada
        style={medidas && tumbada ? { aspectRatio: `${medidas.alto} / ${medidas.ancho}` } : undefined}
      >
        <img
          src={url}
          alt="Foto del parte en papel"
          onLoad={(e) => setMedidas({ ancho: e.currentTarget.naturalWidth, alto: e.currentTarget.naturalHeight })}
          className={cn('block w-full', tumbada && 'absolute top-1/2 left-1/2 max-w-none')}
          style={
            tumbada && medidas
              ? { width: `${(medidas.ancho / medidas.alto) * 100}%`, transform: `translate(-50%, -50%) rotate(${giro}deg)` }
              : { transform: giro ? `rotate(${giro}deg)` : undefined }
          }
        />
      </div>
      <figcaption className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setGiro((g) => (g + 90) % 360)}>
          <RotateCw /> Girar
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink /> Abrir entera
          </a>
        </Button>
      </figcaption>
    </figure>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="font-semibold">{titulo}</h2>
      {children}
    </section>
  )
}

function AreaTexto({ etiqueta, valor, onCambio }: { etiqueta: string; valor: string; onCambio: (s: string) => void }) {
  return (
    <Campo etiqueta={etiqueta}>
      <Textarea rows={3} value={valor} onChange={(e) => onCambio(e.target.value)} />
    </Campo>
  )
}
