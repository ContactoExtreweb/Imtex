import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Campo } from '@/components/campo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { costeKm } from '@/lib/calculos/combustible'
import { leerNumero, numeroATexto } from '@/lib/formato'
import { useSesion } from '@/lib/sesion'
import { mensajeError, supabase, type Fila } from '@/lib/supabase'
import { numero } from '@/lib/validacion'

const esquema = z.object({
  precio_litro_ref: numero,
  consumo_furgon_l100: numero,
  consumo_camion_l100: numero,
})

const tresDecimales = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

/** Tarifas de combustible: una sola fila (id = true). */
export function Combustible() {
  const tarifas = useQuery({
    queryKey: ['tarifas_combustible'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tarifas_combustible').select().single()
      if (error) throw error
      return data
    },
  })

  return (
    <div className="mx-auto grid w-full max-w-md gap-4 p-4">
      <h1 className="text-xl font-semibold">Tarifas de combustible</h1>
      {tarifas.data ? (
        <FormularioTarifas tarifas={tarifas.data} />
      ) : (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      )}
    </div>
  )
}

function FormularioTarifas({ tarifas }: { tarifas: Fila<'tarifas_combustible'> }) {
  const { puede } = useSesion()
  const editable = puede('ajustes', 'editar')
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState, control } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      precio_litro_ref: numeroATexto(tarifas.precio_litro_ref),
      consumo_furgon_l100: numeroATexto(tarifas.consumo_furgon_l100),
      consumo_camion_l100: numeroATexto(tarifas.consumo_camion_l100),
    },
  })
  const guardar = useMutation({
    mutationFn: async (fila: z.output<typeof esquema>) => {
      const { error } = await supabase.from('tarifas_combustible').update(fila).eq('id', true)
      if (error) throw error
    },
    onSuccess: () => toast.success('Guardado'),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tarifas_combustible'] }),
  })

  const e = formState.errors
  const valores = useWatch({ control })
  const precio = leerNumero(valores.precio_litro_ref ?? '') ?? 0
  const coste = (consumo: string) => `${tresDecimales.format(costeKm(precio, leerNumero(consumo) ?? 0))} €/km`

  return (
    <form onSubmit={handleSubmit((fila) => guardar.mutate(fila))} className="grid gap-4">
      <fieldset disabled={!editable || guardar.isPending} className="grid gap-3">
        <Campo etiqueta="Precio del litro de referencia (€)" error={e.precio_litro_ref?.message}>
          <Input inputMode="decimal" {...register('precio_litro_ref')} />
        </Campo>
        <Campo etiqueta="Consumo furgoneta (L/100 km)" error={e.consumo_furgon_l100?.message}>
          <Input inputMode="decimal" {...register('consumo_furgon_l100')} />
        </Campo>
        <Campo etiqueta="Consumo camión (L/100 km)" error={e.consumo_camion_l100?.message}>
          <Input inputMode="decimal" {...register('consumo_camion_l100')} />
        </Campo>
      </fieldset>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-lg bg-muted p-3 text-sm">
        <dt>Coste por km furgoneta</dt>
        <dd className="text-right font-medium tabular-nums">{coste(valores.consumo_furgon_l100 ?? '')}</dd>
        <dt>Coste por km camión</dt>
        <dd className="text-right font-medium tabular-nums">{coste(valores.consumo_camion_l100 ?? '')}</dd>
      </dl>
      {editable && (
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      )}
    </form>
  )
}
