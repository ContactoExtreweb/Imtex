import { zodResolver } from '@hookform/resolvers/zod'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Campo, Casilla, Selector } from '@/components/campo'
import { DialogoFormulario, FilaListado, PaginaListado } from '@/components/listado'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { coincide } from '@/lib/formato'
import { useSesion } from '@/lib/sesion'
import { supabase, type Fila } from '@/lib/supabase'
import { useRoles, useTabla } from '@/lib/tabla'
import { email, obligatorio } from '@/lib/validacion'

type Perfil = Fila<'perfiles'>
type Rol = Fila<'roles'>

const esquemaPerfil = z.object({ nombre: obligatorio, rol: obligatorio, activo: z.boolean() })
const esquemaInvitacion = z.object({ email, nombre: obligatorio, rol: obligatorio })

// Los usuarios no se borran (se desactivan): así se conserva quién hizo cada cosa.
export function Usuarios() {
  const { puede, perfil: yo } = useSesion()
  const editable = puede('usuarios', 'editar')
  const { lista, guardar } = useTabla('perfiles', 'nombre')
  const roles = useRoles().data ?? []
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<Perfil | 'invitar' | null>(null)

  const invitar = useMutation({
    mutationFn: async (datos: z.output<typeof esquemaInvitacion>) => {
      const { error } = await supabase.functions.invoke('invitar-usuario', { body: datos })
      if (error instanceof FunctionsHttpError) throw new Error((await error.context.json()).error)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Invitación enviada')
      setAbierto(null)
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['perfiles'] }),
  })

  const nombreRol = (codigo: string) => roles.find((r) => r.codigo === codigo)?.nombre ?? codigo
  const filas = (lista.data ?? []).filter((p) => coincide(busqueda, p.nombre, p.email, nombreRol(p.rol)))

  return (
    <>
      <PaginaListado
        titulo="Usuarios"
        busqueda={busqueda}
        onBuscar={setBusqueda}
        onNuevo={editable ? () => setAbierto('invitar') : undefined}
        cargando={lista.isPending}
        vacio={filas.length === 0}
      >
        {filas.map((p) => (
          <FilaListado
            key={p.id}
            titulo={p.nombre}
            detalle={`${p.email} · ${nombreRol(p.rol)}`}
            extra={!p.activo && <Badge variant="secondary">Desactivado</Badge>}
            onAbrir={() => setAbierto(p)}
          />
        ))}
      </PaginaListado>

      {abierto === 'invitar' && (
        <FormularioInvitacion
          roles={roles}
          guardando={invitar.isPending}
          onGuardar={(datos) => invitar.mutate(datos)}
          onCerrar={() => setAbierto(null)}
        />
      )}
      {abierto && abierto !== 'invitar' && (
        <FormularioPerfil
          perfil={abierto}
          roles={roles}
          esPropio={abierto.id === yo?.id}
          soloLectura={!editable}
          guardando={guardar.isPending}
          onGuardar={(fila) =>
            guardar.mutate({ id: abierto.id, fila }, { onSuccess: () => setAbierto(null) })
          }
          onCerrar={() => setAbierto(null)}
        />
      )}
    </>
  )
}

function OpcionesRol({ roles }: { roles: Rol[] }) {
  return roles.map((r) => (
    <option key={r.codigo} value={r.codigo}>
      {r.nombre}
    </option>
  ))
}

function FormularioInvitacion({
  roles,
  guardando,
  onGuardar,
  onCerrar,
}: {
  roles: Rol[]
  guardando: boolean
  onGuardar: (datos: z.output<typeof esquemaInvitacion>) => void
  onCerrar: () => void
}) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquemaInvitacion),
    defaultValues: { email: '', nombre: '', rol: 'operario' },
  })
  const e = formState.errors

  return (
    <DialogoFormulario
      titulo="Invitar usuario"
      soloLectura={false}
      guardando={guardando}
      onSubmit={handleSubmit(onGuardar)}
      onCerrar={onCerrar}
    >
      <p className="text-sm text-muted-foreground">
        Le llegará un email con un enlace para elegir su contraseña.
      </p>
      <Campo etiqueta="Email" error={e.email?.message}>
        <Input type="email" autoComplete="off" {...register('email')} />
      </Campo>
      <Campo etiqueta="Nombre" error={e.nombre?.message}>
        <Input {...register('nombre')} />
      </Campo>
      <Campo etiqueta="Rol" error={e.rol?.message}>
        <Selector {...register('rol')}>
          <OpcionesRol roles={roles} />
        </Selector>
      </Campo>
    </DialogoFormulario>
  )
}

function FormularioPerfil({
  perfil,
  roles,
  esPropio,
  soloLectura,
  guardando,
  onGuardar,
  onCerrar,
}: {
  perfil: Perfil
  roles: Rol[]
  /** Nadie se cambia su propio rol ni se desactiva: evita quedarse sin acceso */
  esPropio: boolean
  soloLectura: boolean
  guardando: boolean
  onGuardar: (fila: z.output<typeof esquemaPerfil>) => void
  onCerrar: () => void
}) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquemaPerfil),
    defaultValues: { nombre: perfil.nombre, rol: perfil.rol, activo: perfil.activo },
  })
  const e = formState.errors

  return (
    <DialogoFormulario
      titulo={perfil.nombre}
      soloLectura={soloLectura}
      guardando={guardando}
      onSubmit={handleSubmit(onGuardar)}
      onCerrar={onCerrar}
    >
      <p className="text-sm text-muted-foreground">{perfil.email}</p>
      <Campo etiqueta="Nombre" error={e.nombre?.message}>
        <Input {...register('nombre')} />
      </Campo>
      {esPropio ? (
        // Sin campos: se guardan tal cual (vienen en defaultValues). Un campo disabled no se enviaría.
        <p className="text-sm">
          Rol: {roles.find((r) => r.codigo === perfil.rol)?.nombre}
          <span className="block text-xs text-muted-foreground">
            Tu propio rol y tu acceso los tiene que cambiar otra persona de gerencia.
          </span>
        </p>
      ) : (
        <>
          <Campo etiqueta="Rol" error={e.rol?.message}>
            <Selector {...register('rol')}>
              <OpcionesRol roles={roles} />
            </Selector>
          </Campo>
          <Casilla etiqueta="Activo (puede entrar en el programa)" {...register('activo')} />
        </>
      )}
    </DialogoFormulario>
  )
}
