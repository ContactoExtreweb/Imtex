import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Campo } from '@/components/campo'
import { ConfirmarBorrado, DialogoFormulario, FilaListado, PaginaListado } from '@/components/listado'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { coincide } from '@/lib/formato'
import { useSesion } from '@/lib/sesion'
import type { Fila } from '@/lib/supabase'
import { useTabla } from '@/lib/tabla'
import { emailOpcional, obligatorio, opcional } from '@/lib/validacion'

type Cliente = Fila<'clientes'>

const esquema = z.object({
  nombre: obligatorio,
  cif: opcional,
  contacto: opcional,
  email: emailOpcional,
  telefono: opcional,
  direccion: opcional,
  localidad: opcional,
  provincia: opcional,
  notas: opcional,
})

export function Clientes() {
  const { puede } = useSesion()
  const editable = puede('clientes', 'editar')
  const { lista, guardar, borrar } = useTabla('clientes', 'nombre')
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<Cliente | 'nuevo' | null>(null)
  const [borrando, setBorrando] = useState<Cliente | null>(null)

  const filas = (lista.data ?? []).filter((c) =>
    coincide(busqueda, c.nombre, c.cif, c.contacto, c.localidad, c.provincia),
  )

  return (
    <>
      <PaginaListado
        titulo="Clientes"
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
            detalle={[c.localidad, c.telefono].filter(Boolean).join(' · ')}
            onAbrir={() => setAbierto(c)}
            onBorrar={editable ? () => setBorrando(c) : undefined}
          />
        ))}
      </PaginaListado>

      {abierto && (
        <FormularioCliente
          cliente={abierto === 'nuevo' ? null : abierto}
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

function FormularioCliente({
  cliente,
  soloLectura,
  guardando,
  onGuardar,
  onCerrar,
}: {
  cliente: Cliente | null
  soloLectura: boolean
  guardando: boolean
  onGuardar: (fila: z.output<typeof esquema>) => void
  onCerrar: () => void
}) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: cliente?.nombre ?? '',
      cif: cliente?.cif ?? '',
      contacto: cliente?.contacto ?? '',
      email: cliente?.email ?? '',
      telefono: cliente?.telefono ?? '',
      direccion: cliente?.direccion ?? '',
      localidad: cliente?.localidad ?? '',
      provincia: cliente?.provincia ?? '',
      notas: cliente?.notas ?? '',
    },
  })
  const e = formState.errors

  return (
    <DialogoFormulario
      titulo={cliente ? cliente.nombre : 'Nuevo cliente'}
      soloLectura={soloLectura}
      guardando={guardando}
      onSubmit={handleSubmit(onGuardar)}
      onCerrar={onCerrar}
    >
      <Campo etiqueta="Nombre o razón social" error={e.nombre?.message}>
        <Input {...register('nombre')} />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="CIF / NIF" error={e.cif?.message}>
          <Input {...register('cif')} />
        </Campo>
        <Campo etiqueta="Persona de contacto" error={e.contacto?.message}>
          <Input {...register('contacto')} />
        </Campo>
        <Campo etiqueta="Email" error={e.email?.message}>
          <Input type="email" {...register('email')} />
        </Campo>
        <Campo etiqueta="Teléfono" error={e.telefono?.message}>
          <Input type="tel" {...register('telefono')} />
        </Campo>
      </div>
      <Campo etiqueta="Dirección" error={e.direccion?.message}>
        <Input {...register('direccion')} />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Localidad" error={e.localidad?.message}>
          <Input {...register('localidad')} />
        </Campo>
        <Campo etiqueta="Provincia" error={e.provincia?.message}>
          <Input {...register('provincia')} />
        </Campo>
      </div>
      <Campo etiqueta="Notas" error={e.notas?.message}>
        <Textarea rows={3} {...register('notas')} />
      </Campo>
    </DialogoFormulario>
  )
}
