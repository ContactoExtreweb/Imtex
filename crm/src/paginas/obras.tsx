import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Campo, Selector } from '@/components/campo'
import { ConfirmarBorrado, DialogoFormulario, FilaListado, PaginaListado } from '@/components/listado'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { coincide, euros, numeroATexto } from '@/lib/formato'
import { useSesion } from '@/lib/sesion'
import type { Fila } from '@/lib/supabase'
import { useTabla } from '@/lib/tabla'
import { numero, obligatorio, opcional } from '@/lib/validacion'

type Obra = Fila<'obras'>

const ESTADOS = { en_ejecucion: 'En ejecución', terminada: 'Terminada' } as const

const esquema = z.object({
  codigo: obligatorio,
  nombre: obligatorio,
  cliente_id: opcional,
  localidad: opcional,
  estado: z.enum(['en_ejecucion', 'terminada']),
  importe_pedido: numero,
  gastos_generales_pct: numero.refine((n) => n <= 100, 'Máximo 100'),
  fecha_inicio: opcional,
  fecha_fin: opcional,
})

export function Obras() {
  const { puede } = useSesion()
  const editable = puede('obras', 'editar')
  const { lista, guardar, borrar } = useTabla('obras', 'codigo')
  const clientes = useTabla('clientes', 'nombre').lista.data ?? []
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<Obra | 'nuevo' | null>(null)
  const [borrando, setBorrando] = useState<Obra | null>(null)

  const nombreCliente = (id: string | null) => clientes.find((c) => c.id === id)?.nombre
  const filas = (lista.data ?? []).filter((o) =>
    coincide(busqueda, o.codigo, o.nombre, o.localidad, nombreCliente(o.cliente_id)),
  )

  return (
    <>
      <PaginaListado
        titulo="Obras"
        busqueda={busqueda}
        onBuscar={setBusqueda}
        onNuevo={editable ? () => setAbierto('nuevo') : undefined}
        cargando={lista.isPending}
        vacio={filas.length === 0}
      >
        {filas.map((o) => (
          <FilaListado
            key={o.id}
            titulo={`${o.codigo} · ${o.nombre}`}
            detalle={[nombreCliente(o.cliente_id), euros(o.importe_pedido)].filter(Boolean).join(' · ')}
            extra={
              <Badge
                variant={o.estado === 'terminada' ? 'outline' : 'secondary'}
                className={o.estado === 'terminada' ? 'border-transparent bg-exito/12 text-exito' : undefined}
              >
                {ESTADOS[o.estado as keyof typeof ESTADOS]}
              </Badge>
            }
            onAbrir={() => setAbierto(o)}
            onBorrar={editable ? () => setBorrando(o) : undefined}
          />
        ))}
      </PaginaListado>

      {abierto && (
        <FormularioObra
          obra={abierto === 'nuevo' ? null : abierto}
          clientes={clientes}
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
        nombre={borrando ? `${borrando.codigo} · ${borrando.nombre}` : null}
        onConfirmar={() => borrando && borrar.mutate(borrando.id)}
        onCerrar={() => setBorrando(null)}
      />
    </>
  )
}

function FormularioObra({
  obra,
  clientes,
  soloLectura,
  guardando,
  onGuardar,
  onCerrar,
}: {
  obra: Obra | null
  clientes: Fila<'clientes'>[]
  soloLectura: boolean
  guardando: boolean
  onGuardar: (fila: z.output<typeof esquema>) => void
  onCerrar: () => void
}) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      codigo: obra?.codigo ?? '',
      nombre: obra?.nombre ?? '',
      cliente_id: obra?.cliente_id ?? '',
      localidad: obra?.localidad ?? '',
      estado: (obra?.estado ?? 'en_ejecucion') as keyof typeof ESTADOS,
      importe_pedido: numeroATexto(obra?.importe_pedido ?? 0),
      gastos_generales_pct: numeroATexto(obra?.gastos_generales_pct ?? 13),
      fecha_inicio: obra?.fecha_inicio ?? '',
      fecha_fin: obra?.fecha_fin ?? '',
    },
  })
  const e = formState.errors

  return (
    <DialogoFormulario
      titulo={obra ? `${obra.codigo} · ${obra.nombre}` : 'Nueva obra'}
      soloLectura={soloLectura}
      guardando={guardando}
      onSubmit={handleSubmit(onGuardar)}
      onCerrar={onCerrar}
    >
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Campo etiqueta="Código" error={e.codigo?.message}>
          <Input placeholder="OB-2026-01" {...register('codigo')} />
        </Campo>
        <Campo etiqueta="Nombre" error={e.nombre?.message}>
          <Input {...register('nombre')} />
        </Campo>
      </div>
      <Campo etiqueta="Cliente" error={e.cliente_id?.message}>
        <Selector {...register('cliente_id')}>
          <option value="">Sin cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Selector>
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Localidad" error={e.localidad?.message}>
          <Input {...register('localidad')} />
        </Campo>
        <Campo etiqueta="Estado" error={e.estado?.message}>
          <Selector {...register('estado')}>
            {Object.entries(ESTADOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Importe del pedido (€)" error={e.importe_pedido?.message}>
          <Input inputMode="decimal" {...register('importe_pedido')} />
        </Campo>
        <Campo etiqueta="Gastos generales (%)" error={e.gastos_generales_pct?.message}>
          <Input inputMode="decimal" {...register('gastos_generales_pct')} />
        </Campo>
        <Campo etiqueta="Fecha de inicio" error={e.fecha_inicio?.message}>
          <Input type="date" {...register('fecha_inicio')} />
        </Campo>
        <Campo etiqueta="Fecha de fin" error={e.fecha_fin?.message}>
          <Input type="date" {...register('fecha_fin')} />
        </Campo>
      </div>
    </DialogoFormulario>
  )
}
