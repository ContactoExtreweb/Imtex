import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Images } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Campo, Selector } from '@/components/campo'
import { DialogoFormulario, FilaListado, PaginaListado } from '@/components/listado'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { coincide } from '@/lib/formato'
import { crearWebObra, nombreServicio, urlFoto, useGaleria } from '@/lib/galeria'
import { rutaMiniatura } from '@/lib/imagenes'
import { useSesion } from '@/lib/sesion'
import { mensajeError } from '@/lib/supabase'
import { obligatorio } from '@/lib/validacion'

export function InsigniaPublicada({ publicada }: { publicada: boolean }) {
  return publicada ? (
    <Badge variant="outline" className="border-transparent bg-exito/12 text-exito">
      Publicada
    </Badge>
  ) : (
    <Badge variant="secondary">Borrador</Badge>
  )
}

/** Obras de la galería de imtexsl.com. La web solo enseña las publicadas. */
export function Galeria() {
  const { puede } = useSesion()
  const editable = puede('galeria', 'editar')
  const navigate = useNavigate()
  const lista = useGaleria()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [nueva, setNueva] = useState(false)

  const filas = (lista.data ?? []).filter(
    (o) =>
      (!estado || (estado === 'publicada') === o.publicada) &&
      coincide(busqueda, o.titulo, o.ubicacion, o.anio, nombreServicio(o.servicio)),
  )

  return (
    <>
      <PaginaListado
        titulo="Galería web"
        busqueda={busqueda}
        onBuscar={setBusqueda}
        onNuevo={editable ? () => setNueva(true) : undefined}
        filtros={
          <Selector aria-label="Estado" className="w-auto" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todas</option>
            <option value="publicada">Publicadas</option>
            <option value="borrador">Borradores</option>
          </Selector>
        }
        cargando={lista.isPending}
        vacio={filas.length === 0}
      >
        {filas.map((o) => {
          const portada = o.web_fotos.toSorted((a, b) => a.orden - b.orden)[0]
          return (
            <FilaListado
              key={o.id}
              antes={
                portada ? (
                  <img
                    src={urlFoto(rutaMiniatura(portada.storage_path))}
                    alt=""
                    loading="lazy"
                    className="size-12 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                    <Images className="size-5" />
                  </span>
                )
              }
              titulo={o.titulo}
              detalle={[
                nombreServicio(o.servicio),
                o.web_fotos.length === 1 ? '1 foto' : `${o.web_fotos.length} fotos`,
                o.anio,
              ]
                .filter(Boolean)
                .join(' · ')}
              extra={<InsigniaPublicada publicada={o.publicada} />}
              onAbrir={() => navigate(`/galeria/${o.id}`)}
            />
          )
        })}
      </PaginaListado>

      {nueva && <NuevaObra onCerrar={() => setNueva(false)} />}
    </>
  )
}

const esquema = z.object({ titulo: obligatorio })

/** Obra de galería sin obra del CRM (por ejemplo, las obras antiguas de la web). */
function NuevaObra({ onCerrar }: { onCerrar: () => void }) {
  const navigate = useNavigate()
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { titulo: '' },
  })
  const crear = useMutation({
    mutationFn: crearWebObra,
    onSuccess: (obra) => navigate(`/galeria/${obra.id}`),
    onError: (error) => toast.error(mensajeError(error)),
  })

  return (
    <DialogoFormulario
      titulo="Nueva obra en la galería"
      soloLectura={false}
      guardando={crear.isPending}
      onSubmit={handleSubmit((datos) => crear.mutate(datos))}
      onCerrar={onCerrar}
    >
      <p className="text-sm text-muted-foreground">
        Se crea como borrador. Después añades las fotos y la categoría, y la publicas.
      </p>
      <Campo etiqueta="Título de la obra" error={formState.errors.titulo?.message}>
        <Input placeholder="Presa Horcajo" {...register('titulo')} />
      </Campo>
    </DialogoFormulario>
  )
}
