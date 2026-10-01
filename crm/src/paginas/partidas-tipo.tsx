import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { EditorPartida } from '@/components/editor-partida'
import { ConfirmarBorrado, FilaListado, PaginaListado } from '@/components/listado'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { partidaCostes } from '@/lib/calculos/presupuesto'
import { PRESUPUESTO_POR_DEFECTO } from '@/lib/empresa'
import { coincide, euros } from '@/lib/formato'
import {
  codigoPartida,
  errorPartida,
  guardarPartidaTipo,
  nuevaClave,
  partidaNueva,
  usePartidasTipo,
  type PartidaEdicion,
} from '@/lib/presupuestos'
import { useSesion } from '@/lib/sesion'
import { mensajeError, supabase } from '@/lib/supabase'
import { useTabla } from '@/lib/tabla'

interface Abierta {
  /** null = nueva */
  id: string | null
  partida: PartidaEdicion
}

/** Plantillas de partida para reutilizar en los presupuestos. */
export function PartidasTipo() {
  const { puede } = useSesion()
  const editable = puede('base_precios', 'editar')
  const queryClient = useQueryClient()
  const precios = useTabla('precios', 'codigo').lista.data ?? []
  const tipos = usePartidasTipo(precios)
  const [busqueda, setBusqueda] = useState('')
  const [abierta, setAbierta] = useState<Abierta | null>(null)
  const [borrando, setBorrando] = useState<Abierta | null>(null)

  const alTerminar = {
    onError: (error: Error) => toast.error(mensajeError(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['partidas_tipo'] }),
  }
  const guardar = useMutation({
    mutationFn: ({ id, partida }: Abierta) => guardarPartidaTipo(id, partida),
    onSuccess: () => {
      toast.success('Guardado')
      setAbierta(null)
    },
    ...alTerminar,
  })
  const borrar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('partidas_tipo').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => toast.success('Borrado'),
    ...alTerminar,
  })

  const filas = (tipos.data ?? []).filter((t) => coincide(busqueda, t.partida.codigo, t.partida.titulo))
  const titulo = (p: PartidaEdicion) => `${p.codigo} · ${p.titulo || '(sin título)'}`

  function alGuardar() {
    if (!abierta) return
    const error = errorPartida(abierta.partida)
    if (error) toast.error(error)
    else guardar.mutate(abierta)
  }

  return (
    <>
      <PaginaListado
        titulo="Partidas tipo"
        busqueda={busqueda}
        onBuscar={setBusqueda}
        onNuevo={
          editable
            ? () =>
                setAbierta({
                  id: null,
                  partida: partidaNueva(
                    codigoPartida((tipos.data?.length ?? 0) + 1, 'T'),
                    PRESUPUESTO_POR_DEFECTO.gg_pct_def,
                    PRESUPUESTO_POR_DEFECTO.ben_pct_def,
                  ),
                })
            : undefined
        }
        cargando={tipos.isPending}
        vacio={filas.length === 0}
      >
        {filas.map((t) => (
          <FilaListado
            key={t.id}
            titulo={titulo(t.partida)}
            detalle={`PVP ${euros(partidaCostes(t.partida).total)} · ${t.partida.lineas.length} líneas`}
            onAbrir={() => setAbierta(t)}
            onBorrar={editable ? () => setBorrando(t) : undefined}
          />
        ))}
      </PaginaListado>

      {abierta && (
        <Dialog open onOpenChange={(abierto) => !abierto && setAbierta(null)}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{abierta.id ? titulo(abierta.partida) : 'Nueva partida tipo'}</DialogTitle>
            </DialogHeader>
            <EditorPartida
              partida={abierta.partida}
              onCambio={(partida) => setAbierta({ ...abierta, partida })}
              precios={precios}
              soloLectura={!editable}
            />
            {editable && (
              <DialogFooter>
                {abierta.id && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setAbierta({
                        id: null,
                        partida: { ...abierta.partida, clave: nuevaClave(), codigo: `${abierta.partida.codigo} copia` },
                      })
                    }
                  >
                    Duplicar
                  </Button>
                )}
                <Button onClick={alGuardar} disabled={guardar.isPending}>
                  {guardar.isPending ? 'Guardando…' : 'Guardar'}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
      <ConfirmarBorrado
        nombre={borrando ? titulo(borrando.partida) : null}
        onConfirmar={() => borrando?.id && borrar.mutate(borrando.id)}
        onCerrar={() => setBorrando(null)}
      />
    </>
  )
}
