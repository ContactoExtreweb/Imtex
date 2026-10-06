import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Campo, Casilla, Selector } from '@/components/campo'
import { ConfirmarBorrado, DialogoFormulario, FilaListado, PaginaListado } from '@/components/listado'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { coincide } from '@/lib/formato'
import { normalizarTelefono, telefonoATexto } from '@/lib/partes'
import { useSesion } from '@/lib/sesion'
import type { Fila } from '@/lib/supabase'
import { useTabla } from '@/lib/tabla'
import { obligatorio, opcional } from '@/lib/validacion'

type Trabajador = Fila<'trabajadores'>

const esquema = z.object({
  nombre: obligatorio,
  categoria_id: opcional,
  perfil_id: opcional,
  // Con él puede mandar partes de trabajo por WhatsApp; se guarda como lo da WhatsApp (34600112233)
  telefono: z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (!s) return null
      const telefono = normalizarTelefono(s)
      if (!telefono) {
        ctx.addIssue({ code: 'custom', message: 'Escribe un móvil de 9 cifras, o con el prefijo si es de fuera (+351…)' })
        return z.NEVER
      }
      return telefono
    }),
  activo: z.boolean(),
})

export function Trabajadores() {
  const { puede } = useSesion()
  const editable = puede('ajustes', 'editar')
  const { lista, guardar, borrar } = useTabla('trabajadores', 'nombre')
  const categorias = useTabla('categorias_profesionales', 'nombre').lista.data ?? []
  const perfiles = useTabla('perfiles', 'nombre').lista.data ?? []
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<Trabajador | 'nuevo' | null>(null)
  const [borrando, setBorrando] = useState<Trabajador | null>(null)

  const nombreCategoria = (id: string | null) => categorias.find((c) => c.id === id)?.nombre
  const filas = (lista.data ?? []).filter((t) => coincide(busqueda, t.nombre, nombreCategoria(t.categoria_id), t.telefono))

  return (
    <>
      <PaginaListado
        titulo="Trabajadores"
        busqueda={busqueda}
        onBuscar={setBusqueda}
        onNuevo={editable ? () => setAbierto('nuevo') : undefined}
        cargando={lista.isPending}
        vacio={filas.length === 0}
      >
        {filas.map((t) => (
          <FilaListado
            key={t.id}
            titulo={t.nombre}
            detalle={[nombreCategoria(t.categoria_id) ?? 'Sin categoría', t.telefono && telefonoATexto(t.telefono)].filter(Boolean).join(' · ')}
            extra={!t.activo && <Badge variant="secondary">Inactivo</Badge>}
            onAbrir={() => setAbierto(t)}
            onBorrar={editable ? () => setBorrando(t) : undefined}
          />
        ))}
      </PaginaListado>

      {abierto && (
        <FormularioTrabajador
          trabajador={abierto === 'nuevo' ? null : abierto}
          categorias={categorias}
          perfiles={perfiles}
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

function FormularioTrabajador({
  trabajador,
  categorias,
  perfiles,
  soloLectura,
  guardando,
  onGuardar,
  onCerrar,
}: {
  trabajador: Trabajador | null
  categorias: Fila<'categorias_profesionales'>[]
  perfiles: Fila<'perfiles'>[]
  soloLectura: boolean
  guardando: boolean
  onGuardar: (fila: z.output<typeof esquema>) => void
  onCerrar: () => void
}) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: trabajador?.nombre ?? '',
      categoria_id: trabajador?.categoria_id ?? '',
      perfil_id: trabajador?.perfil_id ?? '',
      telefono: trabajador?.telefono ? telefonoATexto(trabajador.telefono) : '',
      activo: trabajador?.activo ?? true,
    },
  })
  const e = formState.errors
  // Las categorías inactivas solo salen si ya estaban asignadas
  const opciones = categorias.filter((c) => c.activa || c.id === trabajador?.categoria_id)

  return (
    <DialogoFormulario
      titulo={trabajador ? trabajador.nombre : 'Nuevo trabajador'}
      soloLectura={soloLectura}
      guardando={guardando}
      onSubmit={handleSubmit(onGuardar)}
      onCerrar={onCerrar}
    >
      <Campo etiqueta="Nombre" error={e.nombre?.message}>
        <Input {...register('nombre')} />
      </Campo>
      <Campo etiqueta="Categoría" error={e.categoria_id?.message}>
        <Selector {...register('categoria_id')}>
          <option value="">Sin categoría</option>
          {opciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Usuario del programa (si tiene acceso)" error={e.perfil_id?.message}>
        <Selector {...register('perfil_id')}>
          <option value="">Sin acceso</option>
          {perfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} · {p.email}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Teléfono de WhatsApp (para mandar partes)" error={e.telefono?.message}>
        <Input type="tel" autoComplete="off" placeholder="600 11 22 33" {...register('telefono')} />
      </Campo>
      <Casilla etiqueta="Activo" {...register('activo')} />
    </DialogoFormulario>
  )
}
