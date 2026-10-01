import { Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Campo, Selector } from '@/components/campo'
import { EntradaNumero } from '@/components/entrada-numero'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { partidaCostes } from '@/lib/calculos/presupuesto'
import { coincide, euros } from '@/lib/formato'
import { FAMILIAS, lineaDePrecio, type Familia, type LineaEdicion, type PartidaEdicion } from '@/lib/presupuestos'
import type { Fila } from '@/lib/supabase'

/**
 * Editor de una partida: datos, líneas (de la base de precios o libres) y sus importes.
 * Lo usan los presupuestos y las partidas tipo.
 */
export function EditorPartida({
  partida,
  onCambio,
  precios,
  soloLectura,
  acciones,
}: {
  partida: PartidaEdicion
  onCambio: (partida: PartidaEdicion) => void
  precios: Fila<'precios'>[]
  soloLectura: boolean
  /** Botones propios de quien lo usa (subir, bajar, borrar…) */
  acciones?: ReactNode
}) {
  const [eligiendo, setEligiendo] = useState(false)
  const cambiar = (cambios: Partial<PartidaEdicion>) => onCambio({ ...partida, ...cambios })
  const cambiarLinea = (indice: number, cambios: Partial<LineaEdicion>) =>
    cambiar({ lineas: partida.lineas.map((l, i) => (i === indice ? { ...l, ...cambios } : l)) })
  const costes = partidaCostes(partida)

  return (
    <fieldset disabled={soloLectura} className="grid gap-3 rounded-lg border p-3">
      <div className="flex items-end gap-2">
        <Campo etiqueta="Código" className="w-24">
          <Input value={partida.codigo} onChange={(e) => cambiar({ codigo: e.target.value })} />
        </Campo>
        <Campo etiqueta="Título" className="min-w-0 flex-1">
          <Input value={partida.titulo} onChange={(e) => cambiar({ titulo: e.target.value })} />
        </Campo>
        {!soloLectura && acciones}
      </div>
      <Campo etiqueta="Descripción y medición">
        <Textarea rows={2} value={partida.medicion} onChange={(e) => cambiar({ medicion: e.target.value })} />
      </Campo>
      <div className="grid grid-cols-3 gap-2">
        <Campo etiqueta="Medición (ud)">
          <EntradaNumero valor={partida.cantidad} onCambio={(cantidad) => cambiar({ cantidad })} />
        </Campo>
        <Campo etiqueta="G. generales %">
          <EntradaNumero valor={partida.gg_pct} onCambio={(gg_pct) => cambiar({ gg_pct })} />
        </Campo>
        <Campo etiqueta="Beneficio %">
          <EntradaNumero valor={partida.ben_pct} onCambio={(ben_pct) => cambiar({ ben_pct })} />
        </Campo>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium">Descompuesto</p>
        {partida.lineas.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin líneas. Añade precios de la base o un precio libre.</p>
        )}
        {partida.lineas.map((l, i) => (
          <div key={i} className="grid gap-2 rounded-md bg-muted/50 p-2">
            {l.precio_id ? (
              <p className="text-sm">
                <span className="font-medium">{l.codigo}</span> · {l.descripcion}
              </p>
            ) : (
              <div className="flex gap-2">
                <Campo etiqueta="Precio libre: descripción" className="min-w-0 flex-1">
                  <Input value={l.descripcion} onChange={(e) => cambiarLinea(i, { descripcion: e.target.value })} />
                </Campo>
                <Campo etiqueta="Unidad" className="w-20">
                  <Input value={l.unidad} onChange={(e) => cambiarLinea(i, { unidad: e.target.value })} />
                </Campo>
              </div>
            )}
            {/* Cada casilla con su nombre: rendimiento × coste unitario = importe */}
            <div className="flex items-end gap-2 text-sm">
              <Campo etiqueta={`Rendimiento (${l.unidad || 'ud'})`} className="max-w-32 min-w-0 flex-1">
                <EntradaNumero valor={l.rendimiento} onCambio={(rendimiento) => cambiarLinea(i, { rendimiento })} />
              </Campo>
              <span className="pb-2.5 text-muted-foreground md:pb-1.5">×</span>
              <Campo etiqueta="Coste unitario (€)" className="max-w-32 min-w-0 flex-1">
                {l.precio_id ? (
                  <span className="flex h-10 items-center tabular-nums md:h-8">{euros(l.coste_unitario)}</span>
                ) : (
                  <EntradaNumero
                    valor={l.coste_unitario}
                    onCambio={(coste_unitario) => cambiarLinea(i, { coste_unitario })}
                  />
                )}
              </Campo>
              <span className="ml-auto pb-2.5 font-medium tabular-nums md:pb-1.5">
                {euros(l.rendimiento * l.coste_unitario)}
              </span>
              {!soloLectura && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar línea"
                  onClick={() => cambiar({ lineas: partida.lineas.filter((_, j) => j !== i) })}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          </div>
        ))}
        {!soloLectura && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEligiendo(true)}>
              <Plus /> De la base de precios
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                cambiar({
                  lineas: [
                    ...partida.lineas,
                    { precio_id: null, codigo: null, descripcion: '', unidad: 'ud', coste_unitario: 0, rendimiento: 1 },
                  ],
                })
              }
            >
              <Plus /> Precio libre
            </Button>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 border-t pt-2 text-sm tabular-nums">
        <dt className="text-muted-foreground">Coste directo</dt>
        <dd className="text-right">{euros(costes.coste)}</dd>
        <dt className="text-muted-foreground">Gastos generales</dt>
        <dd className="text-right">{euros(costes.gg)}</dd>
        <dt className="text-muted-foreground">Beneficio</dt>
        <dd className="text-right">{euros(costes.ben)}</dd>
        <dt className="font-medium">PVP por unidad</dt>
        <dd className="text-right font-medium">{euros(costes.total)}</dd>
        <dt className="font-medium">Importe (× {partida.cantidad || 1})</dt>
        <dd className="text-right font-semibold">{euros(costes.total * (partida.cantidad || 1))}</dd>
      </dl>

      {eligiendo && (
        <SelectorPrecio
          precios={precios}
          onElegir={(precio) => {
            cambiar({ lineas: [...partida.lineas, lineaDePrecio(precio)] })
            toast.success(`Añadido ${precio.codigo}`)
          }}
          onCerrar={() => setEligiendo(false)}
        />
      )}
    </fieldset>
  )
}

/** Buscador de la base de precios. Se queda abierto para añadir varios seguidos. */
function SelectorPrecio({
  precios,
  onElegir,
  onCerrar,
}: {
  precios: Fila<'precios'>[]
  onElegir: (precio: Fila<'precios'>) => void
  onCerrar: () => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const [familia, setFamilia] = useState('')
  const filas = precios.filter(
    (p) =>
      p.activo &&
      (!familia || p.familia === familia) &&
      coincide(busqueda, p.codigo, p.descripcion, p.fabricante),
  )

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="flex max-h-[90dvh] flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Base de precios</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Input
            type="search"
            placeholder="Buscar…"
            aria-label="Buscar"
            className="min-w-40 flex-1"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Selector aria-label="Familia" className="w-auto" value={familia} onChange={(e) => setFamilia(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(FAMILIAS).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </Selector>
        </div>
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto rounded-lg border">
          {filas.map((p) => (
            <li key={p.id}>
              <button type="button" className="w-full px-3 py-2 text-left hover:bg-muted" onClick={() => onElegir(p)}>
                <p className="truncate text-sm font-medium">
                  {p.codigo} · {p.descripcion}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[FAMILIAS[p.familia as Familia], p.fabricante, `${euros(p.coste)}/${p.unidad}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </button>
            </li>
          ))}
          {filas.length === 0 && <li className="p-3 text-sm text-muted-foreground">No hay precios que coincidan.</li>}
        </ul>
        <Button type="button" onClick={onCerrar}>
          Hecho
        </Button>
      </DialogContent>
    </Dialog>
  )
}
