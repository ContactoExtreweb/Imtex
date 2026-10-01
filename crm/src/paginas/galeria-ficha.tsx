import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Campo, Casilla, Selector } from '@/components/campo'
import { ConfirmarBorrado } from '@/components/listado'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  actualizarFoto,
  borrarFoto,
  borrarWebObra,
  intercambiarOrden,
  SERVICIOS,
  subirFoto,
  urlFoto,
  useWebObra,
  type WebFoto,
  type WebObra,
} from '@/lib/galeria'
import { rutaMiniatura } from '@/lib/imagenes'
import { useSesion } from '@/lib/sesion'
import { mensajeError, supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { obligatorio, opcional } from '@/lib/validacion'
import { InsigniaPublicada } from './galeria'

const esquema = z.object({
  titulo: obligatorio,
  // Vacío mientras es un borrador; para publicar hace falta
  servicio: z
    .enum(['', 'impermeabilizacion', 'reparacion_refuerzo', 'resinas', 'otros'])
    .transform((s) => s || null),
  ubicacion: opcional,
  anio: opcional,
  resumen: opcional,
  descripcion: opcional,
  destacada: z.boolean(),
})

/** Una obra de la galería de la web: fotos, categoría, textos y publicación. */
export function GaleriaFicha() {
  const { id } = useParams()
  const { puede } = useSesion()
  const consulta = useWebObra(id)

  if (consulta.isError) return <p className="p-4 text-sm text-destructive">{mensajeError(consulta.error)}</p>
  if (consulta.isPending) return <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
  if (!consulta.data) {
    return (
      <p className="p-4 text-sm">
        Esta obra ya no está en la galería.{' '}
        <Link to="/galeria" className="underline">
          Volver a la galería
        </Link>
      </p>
    )
  }
  // key: al cambiar de obra, el formulario empieza con sus datos
  return <Ficha key={consulta.data.obra.id} {...consulta.data} editable={puede('galeria', 'editar')} />
}

function Ficha({ obra, fotos, editable }: { obra: WebObra; fotos: WebFoto[]; editable: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [subida, setSubida] = useState<{ hechas: number; total: number } | null>(null)
  const [fotoABorrar, setFotoABorrar] = useState<WebFoto | null>(null)
  const [quitando, setQuitando] = useState(false)

  const refrescar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['web_obra', obra.id] }),
      queryClient.invalidateQueries({ queryKey: ['web_obras'] }),
    ])

  const { register, handleSubmit, formState, reset } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      titulo: obra.titulo,
      servicio: (obra.servicio ?? '') as z.input<typeof esquema>['servicio'],
      ubicacion: obra.ubicacion ?? '',
      anio: obra.anio ?? '',
      resumen: obra.resumen ?? '',
      descripcion: obra.descripcion ?? '',
      destacada: obra.destacada,
    },
  })
  const e = formState.errors

  const guardar = useMutation({
    mutationFn: async (cambios: z.output<typeof esquema> & { publicada: boolean }) => {
      const { error } = await supabase.from('web_obras').update(cambios).eq('id', obra.id)
      if (error) throw error
    },
    onSuccess: (_, cambios) => {
      toast.success(
        cambios.publicada === obra.publicada ? 'Guardado' : cambios.publicada ? 'Publicada en la web' : 'Despublicada',
      )
      reset(undefined, { keepValues: true }) // lo escrito pasa a ser lo guardado
    },
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: refrescar,
  })

  /** Guarda el formulario dejando la obra publicada o en borrador. */
  const guardarComo = (publicada: boolean) =>
    handleSubmit((datos) => {
      if (publicada && (!datos.servicio || fotos.length === 0)) {
        return toast.error('Para publicar hacen falta la categoría y al menos una foto.')
      }
      guardar.mutate({ ...datos, publicada })
    })

  // Cambios sobre las fotos (ordenar, texto, borrar): una operación cada vez
  const operar = useMutation({
    mutationFn: (accion: () => Promise<unknown>) => accion(),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: refrescar,
  })

  async function subir(archivos: File[]) {
    if (archivos.length === 0 || subida) return
    const fallos: string[] = []
    let orden = Math.max(0, ...fotos.map((f) => f.orden))
    setSubida({ hechas: 0, total: archivos.length })
    for (const [i, archivo] of archivos.entries()) {
      try {
        await subirFoto(obra.id, archivo, ++orden)
      } catch (error) {
        fallos.push(`${archivo.name}: ${mensajeError(error as Error)}`)
      }
      setSubida({ hechas: i + 1, total: archivos.length })
    }
    setSubida(null)
    await refrescar()
    const subidas = archivos.length - fallos.length
    if (subidas > 0) toast.success(subidas === 1 ? '1 foto subida' : `${subidas} fotos subidas`)
    if (fallos.length > 0) toast.error(`No se han podido subir: ${fallos.join(' · ')}`, { duration: 10000 })
  }

  // Si una foto se suelta fuera de la zona, que el navegador no la abra y se pierda la pantalla
  useEffect(() => {
    const evitar = (ev: DragEvent) => ev.preventDefault()
    window.addEventListener('dragover', evitar)
    window.addEventListener('drop', evitar)
    return () => {
      window.removeEventListener('dragover', evitar)
      window.removeEventListener('drop', evitar)
    }
  }, [])

  const ocupado = !!subida || operar.isPending

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 p-4">
      <div>
        <Link to="/galeria" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" /> Galería web
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto min-w-0 text-xl font-semibold text-balance">{obra.titulo}</h1>
          <InsigniaPublicada publicada={obra.publicada} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">imtexsl.com/obras/{obra.slug}</p>
      </div>

      <section className="grid gap-3">
        <h2 className="font-medium">Fotos</h2>
        {editable && <ZonaFotos subida={subida} onArchivos={subir} />}
        {fotos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay fotos.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {fotos.map((f, i) => (
              <li key={f.id} className="grid content-start gap-2 rounded-lg border p-2">
                <div className="relative">
                  <img
                    src={urlFoto(rutaMiniatura(f.storage_path))}
                    alt={f.alt}
                    loading="lazy"
                    className="aspect-4/3 w-full rounded-md bg-muted object-cover"
                  />
                  {i === 0 && <Badge className="absolute top-2 left-2">Portada</Badge>}
                </div>
                {editable && (
                  <>
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Mover antes"
                        disabled={ocupado || i === 0}
                        onClick={() => operar.mutate(() => intercambiarOrden(f, fotos[i - 1]))}
                      >
                        <ChevronLeft />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Mover después"
                        disabled={ocupado || i === fotos.length - 1}
                        onClick={() => operar.mutate(() => intercambiarOrden(f, fotos[i + 1]))}
                      >
                        <ChevronRight />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Poner de portada"
                        title="Poner de portada"
                        disabled={ocupado || i === 0}
                        onClick={() => operar.mutate(() => actualizarFoto(f.id, { orden: fotos[0].orden - 1 }))}
                      >
                        <Star />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto"
                        aria-label="Borrar foto"
                        disabled={ocupado}
                        onClick={() =>
                          obra.publicada && fotos.length === 1
                            ? toast.error('Es la única foto de una obra publicada. Despublícala antes de borrarla.')
                            : setFotoABorrar(f)
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <Input
                      aria-label={`Qué se ve en la foto ${i + 1}`}
                      placeholder="Qué se ve en la foto"
                      defaultValue={f.alt}
                      onBlur={(ev) => {
                        const alt = ev.target.value.trim()
                        if (alt !== f.alt) operar.mutate(() => actualizarFoto(f.id, { alt }))
                      }}
                    />
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={guardarComo(obra.publicada)} className="grid gap-4">
        <h2 className="font-medium">Datos de la obra</h2>
        <fieldset disabled={!editable || guardar.isPending} className="grid gap-3">
          <Campo etiqueta="Categoría" error={e.servicio?.message}>
            <Selector {...register('servicio')}>
              <option value="">Elige una categoría</option>
              {Object.entries(SERVICIOS).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Título" error={e.titulo?.message}>
            <Input {...register('titulo')} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Lugar" error={e.ubicacion?.message}>
              <Input placeholder="Hervás (Cáceres)" {...register('ubicacion')} />
            </Campo>
            <Campo etiqueta="Año" error={e.anio?.message}>
              <Input placeholder="2025 o 2017-2024" {...register('anio')} />
            </Campo>
          </div>
          <Campo etiqueta="Resumen (una frase, sale en el listado de la web)" error={e.resumen?.message}>
            <Textarea rows={2} {...register('resumen')} />
          </Campo>
          <Campo etiqueta="Descripción (sale en la página de la obra)" error={e.descripcion?.message}>
            <Textarea rows={5} {...register('descripcion')} />
          </Campo>
          <Casilla etiqueta="Destacada en la portada de la web" {...register('destacada')} />
        </fieldset>

        {editable && (
          <div className="flex flex-wrap gap-2">
            {obra.publicada ? (
              <>
                <Button type="submit" disabled={guardar.isPending}>
                  Guardar
                </Button>
                <Button type="button" variant="outline" disabled={guardar.isPending} onClick={guardarComo(false)}>
                  Despublicar
                </Button>
              </>
            ) : (
              <>
                <Button type="button" disabled={guardar.isPending} onClick={guardarComo(true)}>
                  Guardar y publicar
                </Button>
                <Button type="submit" variant="outline" disabled={guardar.isPending}>
                  Guardar borrador
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              className="ml-auto text-destructive"
              disabled={guardar.isPending || ocupado}
              onClick={() => setQuitando(true)}
            >
              <Trash2 /> Quitar de la galería
            </Button>
          </div>
        )}
      </form>

      <ConfirmarBorrado
        nombre={fotoABorrar ? `la foto ${fotos.indexOf(fotoABorrar) + 1}` : null}
        onConfirmar={() => fotoABorrar && operar.mutate(() => borrarFoto(fotoABorrar))}
        onCerrar={() => setFotoABorrar(null)}
      />
      <ConfirmarBorrado
        nombre={quitando ? obra.titulo : null}
        detalle={`Se quita de la galería de la web con sus ${fotos.length} fotos. La obra del programa no se toca. No se puede deshacer.`}
        onConfirmar={() =>
          operar.mutate(() => borrarWebObra(obra.id, fotos), { onSuccess: () => navigate('/galeria') })
        }
        onCerrar={() => setQuitando(false)}
      />
    </div>
  )
}

/** Zona para arrastrar fotos o elegirlas. En el móvil abre la galería o la cámara. */
function ZonaFotos({
  subida,
  onArchivos,
}: {
  subida: { hechas: number; total: number } | null
  onArchivos: (archivos: File[]) => void
}) {
  const [encima, setEncima] = useState(false)
  return (
    <label
      onDragOver={(ev) => {
        ev.preventDefault()
        setEncima(true)
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(ev) => {
        ev.preventDefault()
        setEncima(false)
        onArchivos([...ev.dataTransfer.files])
      }}
      className={cn(
        'grid cursor-pointer justify-items-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        encima && 'border-primary bg-primary/5',
        subida && 'pointer-events-none opacity-70',
      )}
    >
      <ImagePlus className="size-6 text-muted-foreground" />
      {subida ? (
        <span className="font-medium" role="status">
          Subiendo {Math.min(subida.hechas + 1, subida.total)} de {subida.total}…
        </span>
      ) : (
        <>
          <span className="font-medium">Arrastra aquí las fotos o toca para elegirlas</span>
          <span className="text-sm text-muted-foreground">
            Puedes elegir varias a la vez. Se reducen solas antes de subir.
          </span>
        </>
      )}
      <input
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="sr-only"
        disabled={!!subida}
        onChange={(ev) => {
          onArchivos([...(ev.target.files ?? [])])
          ev.target.value = '' // para poder volver a elegir las mismas
        }}
      />
    </label>
  )
}
