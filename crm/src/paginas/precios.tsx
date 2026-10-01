import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Campo, Casilla, Selector } from '@/components/campo'
import { ConfirmarBorrado, DialogoFormulario, FilaListado, PaginaListado } from '@/components/listado'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { coincide, euros, numeroATexto } from '@/lib/formato'
import { FAMILIAS, UNIDADES, type Familia } from '@/lib/presupuestos'
import { useSesion } from '@/lib/sesion'
import type { Fila } from '@/lib/supabase'
import { useTabla } from '@/lib/tabla'
import { numero, obligatorio, opcional } from '@/lib/validacion'

type Precio = Fila<'precios'>

const esquema = z.object({
  codigo: obligatorio,
  familia: z.enum(Object.keys(FAMILIAS) as [Familia, ...Familia[]]),
  descripcion: obligatorio,
  fabricante: opcional,
  unidad: obligatorio,
  coste: numero,
  notas: opcional,
  activo: z.boolean(),
})

function OpcionesFamilia() {
  return Object.entries(FAMILIAS).map(([valor, texto]) => (
    <option key={valor} value={valor}>
      {texto}
    </option>
  ))
}

export function Precios() {
  const { puede } = useSesion()
  const editable = puede('base_precios', 'editar')
  const { lista, guardar, borrar } = useTabla('precios', 'codigo')
  const [busqueda, setBusqueda] = useState('')
  const [familia, setFamilia] = useState('')
  const [abierto, setAbierto] = useState<Precio | 'nuevo' | null>(null)
  const [borrando, setBorrando] = useState<Precio | null>(null)

  const filas = (lista.data ?? []).filter(
    (p) => (!familia || p.familia === familia) && coincide(busqueda, p.codigo, p.descripcion, p.fabricante),
  )

  return (
    <>
      <PaginaListado
        titulo="Base de precios"
        busqueda={busqueda}
        onBuscar={setBusqueda}
        filtros={
          <Selector
            aria-label="Familia"
            className="w-auto"
            value={familia}
            onChange={(e) => setFamilia(e.target.value)}
          >
            <option value="">Todas las familias</option>
            <OpcionesFamilia />
          </Selector>
        }
        onNuevo={editable ? () => setAbierto('nuevo') : undefined}
        cargando={lista.isPending}
        vacio={filas.length === 0}
      >
        {filas.map((p) => (
          <FilaListado
            key={p.id}
            titulo={`${p.codigo} · ${p.descripcion}`}
            detalle={[FAMILIAS[p.familia as Familia], p.fabricante, `${euros(p.coste)}/${p.unidad}`]
              .filter(Boolean)
              .join(' · ')}
            extra={!p.activo && <Badge variant="secondary">Inactivo</Badge>}
            onAbrir={() => setAbierto(p)}
            onBorrar={editable ? () => setBorrando(p) : undefined}
          />
        ))}
      </PaginaListado>

      {abierto && (
        <FormularioPrecio
          precio={abierto === 'nuevo' ? null : abierto}
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
        nombre={borrando ? `${borrando.codigo} · ${borrando.descripcion}` : null}
        onConfirmar={() => borrando && borrar.mutate(borrando.id)}
        onCerrar={() => setBorrando(null)}
      />
    </>
  )
}

function FormularioPrecio({
  precio,
  soloLectura,
  guardando,
  onGuardar,
  onCerrar,
}: {
  precio: Precio | null
  soloLectura: boolean
  guardando: boolean
  onGuardar: (fila: z.output<typeof esquema>) => void
  onCerrar: () => void
}) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      codigo: precio?.codigo ?? '',
      familia: (precio?.familia ?? 'materiales') as Familia,
      descripcion: precio?.descripcion ?? '',
      fabricante: precio?.fabricante ?? '',
      unidad: precio?.unidad ?? 'ud',
      coste: numeroATexto(precio?.coste),
      notas: precio?.notas ?? '',
      activo: precio?.activo ?? true,
    },
  })
  const e = formState.errors

  return (
    <DialogoFormulario
      titulo={precio ? precio.codigo : 'Nuevo precio'}
      soloLectura={soloLectura}
      guardando={guardando}
      onSubmit={handleSubmit(onGuardar)}
      onCerrar={onCerrar}
    >
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <Campo etiqueta="Código" error={e.codigo?.message}>
          <Input placeholder="MO01" {...register('codigo')} />
        </Campo>
        <Campo etiqueta="Familia" error={e.familia?.message}>
          <Selector {...register('familia')}>
            <OpcionesFamilia />
          </Selector>
        </Campo>
      </div>
      <Campo etiqueta="Descripción" error={e.descripcion?.message}>
        <Input {...register('descripcion')} />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo etiqueta="Fabricante" error={e.fabricante?.message}>
          <Input {...register('fabricante')} />
        </Campo>
        <Campo etiqueta="Unidad" error={e.unidad?.message}>
          <Input list="unidades" {...register('unidad')} />
        </Campo>
        <Campo etiqueta="Coste (€)" error={e.coste?.message}>
          <Input inputMode="decimal" {...register('coste')} />
        </Campo>
      </div>
      <datalist id="unidades">
        {UNIDADES.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <Campo etiqueta="Notas" error={e.notas?.message}>
        <Input {...register('notas')} />
      </Campo>
      <Casilla etiqueta="Activo (se puede elegir en partidas y presupuestos)" {...register('activo')} />
    </DialogoFormulario>
  )
}
