import { Lock, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Campo, Selector } from '@/components/campo'
import { ConfirmarBorrado, DialogoFormulario, FilaListado } from '@/components/listado'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { etiquetaMes, mesDeFecha } from '@/lib/calculos/control-obra'
import { useApuntes, type Apunte, type TablaApuntes } from '@/lib/control-obra'
import { euros, numeroATexto } from '@/lib/formato'
import { useSesion, type Modulo } from '@/lib/sesion'

type Valores = Record<string, string>

export interface CampoHoja {
  campo: string
  etiqueta: string
  tipo: 'texto' | 'numero' | 'select'
  opciones?: { valor: string; texto: string }[]
  /** El campo solo sale si se cumple (por ejemplo, según el tipo elegido) */
  visible?: (valores: Valores) => boolean
}

/** Lo que distingue a cada hoja del control de obra. El listado, el filtro por mes y el diálogo son comunes. */
export interface ConfigHoja {
  tabla: TablaApuntes
  /** Módulo cuyo permiso «editar» deja dar de alta y cambiar apuntes */
  modulo: Modulo
  /** «material», «parte de horas»… para los títulos */
  nombre: string
  /** Columna de fecha de la tabla (las certificaciones usan fecha_corte) */
  campoFecha: string
  campos: CampoHoja[]
  /** Valores del formulario de un apunte nuevo */
  nuevos: (filas: Apunte[]) => Valores
  /** Valores del formulario al abrir un apunte (por defecto, sus columnas tal cual) */
  aFormulario?: (fila: Apunte, filas: Apunte[]) => Valores
  /** Al cambiar un campo, otros que se rellenan solos */
  alCambiar?: (campo: string, valores: Valores) => Valores
  /** Columnas a guardar, o un mensaje si falta algo */
  preparar: (valores: Valores, filas: Apunte[], editando: Apunte | null) => Record<string, unknown> | string
  titulo: (fila: Apunte) => string
  detalle: (fila: Apunte, filas: Apunte[]) => string
  importe: (fila: Apunte, filas: Apunte[]) => number
  /** Cálculo que se enseña en el diálogo mientras se escribe */
  previa?: (valores: Valores, filas: Apunte[], editando: Apunte | null) => ReactNode
}

const hoy = () => new Date().toISOString().slice(0, 10)

export function HojaApuntes({
  config,
  obraId,
  cerrados,
}: {
  config: ConfigHoja
  obraId: string
  /** Meses cerrados de la obra (día 1): sus apuntes no se pueden cambiar */
  cerrados: ReadonlySet<string>
}) {
  const { puede } = useSesion()
  const editable = puede(config.modulo, 'editar')
  const { lista, guardar, borrar } = useApuntes(config.tabla, obraId)
  const [mes, setMes] = useState('')
  const [abierto, setAbierto] = useState<Apunte | 'nuevo' | null>(null)
  const [borrando, setBorrando] = useState<Apunte | null>(null)

  const todas = lista.data ?? []
  const meses = [...new Set(todas.map((f) => f.mes))].sort()
  const filas = todas
    .filter((f) => !mes || f.mes === mes)
    .sort((a, b) => a.mes.localeCompare(b.mes) || String(a[config.campoFecha] ?? '').localeCompare(String(b[config.campoFecha] ?? '')))
  const total = filas.reduce((suma, f) => suma + config.importe(f, todas), 0)

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Selector aria-label="Mes" className="w-auto" value={mes} onChange={(e) => setMes(e.target.value)}>
          <option value="">Todos los meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {etiquetaMes(m)}
            </option>
          ))}
        </Selector>
        <span className="mr-auto text-sm font-medium tabular-nums">Total: {euros(total)}</span>
        {editable && (
          <Button onClick={() => setAbierto('nuevo')}>
            <Plus /> Añadir
          </Button>
        )}
      </div>

      {lista.isPending ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {todas.length === 0 ? `Todavía no hay ningún ${config.nombre} en esta obra.` : 'No hay apuntes en ese mes.'}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-background">
          {filas.map((f) => (
            <FilaListado
              key={f.id}
              titulo={config.titulo(f)}
              detalle={[etiquetaMes(f.mes), config.detalle(f, todas)].filter(Boolean).join(' · ')}
              extra={
                <span className="flex items-center gap-1.5 text-sm font-medium tabular-nums">
                  {cerrados.has(f.mes) && <Lock className="size-3.5 text-muted-foreground" aria-label="Mes cerrado" />}
                  {euros(config.importe(f, todas))}
                </span>
              }
              onAbrir={() => setAbierto(f)}
              onBorrar={editable && !cerrados.has(f.mes) ? () => setBorrando(f) : undefined}
            />
          ))}
        </ul>
      )}

      {abierto && (
        <FormularioApunte
          config={config}
          filas={todas}
          apunte={abierto === 'nuevo' ? null : abierto}
          cerrados={cerrados}
          soloLectura={!editable || (abierto !== 'nuevo' && cerrados.has(abierto.mes))}
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
        nombre={borrando ? config.titulo(borrando) : null}
        onConfirmar={() => borrando && borrar.mutate(borrando.id)}
        onCerrar={() => setBorrando(null)}
      />
    </div>
  )
}

function FormularioApunte({
  config,
  filas,
  apunte,
  cerrados,
  soloLectura,
  guardando,
  onGuardar,
  onCerrar,
}: {
  config: ConfigHoja
  filas: Apunte[]
  apunte: Apunte | null
  cerrados: ReadonlySet<string>
  soloLectura: boolean
  guardando: boolean
  onGuardar: (fila: Record<string, unknown>) => void
  onCerrar: () => void
}) {
  const [fecha, setFecha] = useState(() => String(apunte?.[config.campoFecha] ?? (apunte ? '' : hoy())))
  // Mes de imputación (AAAA-MM): se propone el de la fecha hasta que se cambia a mano, como en la herramienta
  const [mes, setMes] = useState(() => (apunte ? apunte.mes : mesDeFecha(hoy())).slice(0, 7))
  const [mesTocado, setMesTocado] = useState(!!apunte)
  const [valores, setValores] = useState<Valores>(() => {
    if (!apunte) return config.nuevos(filas)
    if (config.aFormulario) return config.aFormulario(apunte, filas)
    return Object.fromEntries(
      config.campos.map((c) => {
        const valor = apunte[c.campo]
        return [c.campo, c.tipo === 'numero' ? numeroATexto(valor == null ? null : Number(valor)) : String(valor ?? '')]
      }),
    )
  })

  function cambiar(campo: string, valor: string) {
    const nuevos = { ...valores, [campo]: valor }
    setValores(config.alCambiar ? config.alCambiar(campo, nuevos) : nuevos)
  }

  // La base de datos también lo impide; aquí se avisa antes de guardar
  const mesCerrado = cerrados.has(`${mes}-01`)

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!mes) return toast.error('Elige el mes al que se imputa.')
    if (mesCerrado) return toast.error('Ese mes está cerrado en esta obra. Elige otro o pide a gerencia que lo reabra.')
    const fila = config.preparar(valores, filas, apunte)
    if (typeof fila === 'string') return toast.error(fila)
    onGuardar({ ...fila, [config.campoFecha]: fecha || null, mes: `${mes}-01` })
  }

  return (
    <DialogoFormulario
      titulo={`${apunte ? 'Editar' : 'Añadir'} ${config.nombre}`}
      soloLectura={soloLectura}
      guardando={guardando}
      onSubmit={enviar}
      onCerrar={onCerrar}
    >
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Fecha">
          <Input
            type="date"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value)
              if (!mesTocado && e.target.value) setMes(e.target.value.slice(0, 7))
            }}
          />
        </Campo>
        <Campo etiqueta="Mes de imputación">
          <Input
            type="month"
            value={mes}
            onChange={(e) => {
              setMes(e.target.value)
              setMesTocado(true)
            }}
          />
        </Campo>
      </div>
      {mesCerrado && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          {soloLectura ? 'Mes cerrado: este apunte no se puede cambiar.' : 'Ese mes está cerrado en esta obra.'}
        </p>
      )}
      {config.campos
        .filter((c) => !c.visible || c.visible(valores))
        .map((c) => (
          <Campo key={c.campo} etiqueta={c.etiqueta}>
            {c.tipo === 'select' ? (
              <Selector value={valores[c.campo] ?? ''} onChange={(e) => cambiar(c.campo, e.target.value)}>
                {c.opciones?.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.texto}
                  </option>
                ))}
              </Selector>
            ) : (
              <Input
                inputMode={c.tipo === 'numero' ? 'decimal' : undefined}
                value={valores[c.campo] ?? ''}
                onChange={(e) => cambiar(c.campo, e.target.value)}
              />
            )}
          </Campo>
        ))}
      {config.previa && (
        <div className="rounded-lg bg-muted p-3 text-sm tabular-nums">{config.previa(valores, filas, apunte)}</div>
      )}
    </DialogoFormulario>
  )
}
