import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Campo, Casilla } from '@/components/campo'
import { ConfirmarBorrado, DialogoFormulario, FilaListado, PaginaListado } from '@/components/listado'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { coincide, euros, numeroATexto } from '@/lib/formato'
import { useSesion } from '@/lib/sesion'
import type { Fila } from '@/lib/supabase'
import { useTabla } from '@/lib/tabla'
import { numero, obligatorio } from '@/lib/validacion'

type Categoria = Fila<'categorias_profesionales'>

const esquema = z.object({
  nombre: obligatorio,
  precio_ord: numero,
  precio_ext: numero,
  activa: z.boolean(),
})

export function Categorias() {
  const { puede } = useSesion()
  const editable = puede('ajustes', 'editar')
  const { lista, guardar, borrar } = useTabla('categorias_profesionales', 'nombre')
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<Categoria | 'nuevo' | null>(null)
  const [borrando, setBorrando] = useState<Categoria | null>(null)

  const filas = (lista.data ?? []).filter((c) => coincide(busqueda, c.nombre))

  return (
    <>
      <PaginaListado
        titulo="Categorías profesionales"
        busqueda={busqueda}
        onBuscar={setBusqueda}
        onNuevo={editable ? () => setAbierto('nuevo') : undefined}
        cargando={lista.isPending}
        vacio={filas.length === 0}
      >
        {filas.map((c) => (
          <FilaListado
            key={c.id}
            titulo={c.nombre}
            detalle={`${euros(c.precio_ord)}/h · extra ${euros(c.precio_ext)}/h`}
            extra={!c.activa && <Badge variant="secondary">Inactiva</Badge>}
            onAbrir={() => setAbierto(c)}
            onBorrar={editable ? () => setBorrando(c) : undefined}
          />
        ))}
      </PaginaListado>

      {abierto && (
        <FormularioCategoria
          categoria={abierto === 'nuevo' ? null : abierto}
          soloLectura={!editable}
          guardando={guardar.isPending}
          onGuardar={(fila) =>
            guardar.mutate(
              { id: abierto === 'nuevo' ? undefined : abierto.id, fila },
              { onSuccess: () => setAbierto(null) },
            )
          }
          onCerrar={() => setAbierto(null)}
        />
      )}
      <ConfirmarBorrado
        nombre={borrando?.nombre ?? null}
        onConfirmar={() => borrando && borrar.mutate(borrando.id)}
        onCerrar={() => setBorrando(null)}
      />
    </>
  )
}

function FormularioCategoria({
  categoria,
  soloLectura,
  guardando,
  onGuardar,
  onCerrar,
}: {
  categoria: Categoria | null
  soloLectura: boolean
  guardando: boolean
  onGuardar: (fila: z.output<typeof esquema>) => void
  onCerrar: () => void
}) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: categoria?.nombre ?? '',
      precio_ord: numeroATexto(categoria?.precio_ord),
      precio_ext: numeroATexto(categoria?.precio_ext),
      activa: categoria?.activa ?? true,
    },
  })
  const e = formState.errors

  return (
    <DialogoFormulario
      titulo={categoria ? categoria.nombre : 'Nueva categoría'}
      soloLectura={soloLectura}
      guardando={guardando}
      onSubmit={handleSubmit(onGuardar)}
      onCerrar={onCerrar}
    >
      <Campo etiqueta="Nombre" error={e.nombre?.message}>
        <Input placeholder="Oficial 1ª" {...register('nombre')} />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Precio hora ordinaria (€)" error={e.precio_ord?.message}>
          <Input inputMode="decimal" {...register('precio_ord')} />
        </Campo>
        <Campo etiqueta="Precio hora extra (€)" error={e.precio_ext?.message}>
          <Input inputMode="decimal" {...register('precio_ext')} />
        </Campo>
      </div>
      <Casilla etiqueta="Activa (se puede elegir en los partes)" {...register('activa')} />
    </DialogoFormulario>
  )
}
