import type { ReactElement } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { etiquetaMes, type calcularObra } from '@/lib/calculos/control-obra'
import { euros, pct } from '@/lib/formato'

type Calculo = ReturnType<typeof calcularObra>

// Colores de serie (index.css): la certificación es siempre --chart-1 y los costes --chart-2,
// en todos los gráficos. Pareja validada para daltonismo y contraste (docs/decisiones.md).
const CERTIFICACION = 'var(--chart-1)'
const COSTES = 'var(--chart-2)'
/** Margen a partir del cual la herramienta de IMTEX da la obra por buena */
const MARGEN_OBJETIVO = 15

const compacto = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 })
const mesCorto = (mes: string) => {
  const [nombre, anio] = etiquetaMes(mes).split('-')
  return `${nombre.slice(0, 3)} ${anio}`
}

const EJE = { fontSize: 12, fill: 'var(--muted-foreground)' }
const MARGEN = { top: 8, right: 8, bottom: 0, left: 0 }

/** Gráficos de una obra. Los mismos datos están en la matriz del Resumen, que hace de tabla. */
export function GraficosObra({ datos }: { datos: Calculo }) {
  const { meses, totales } = datos
  if (meses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Los gráficos aparecerán cuando la obra tenga certificaciones o costes.
      </p>
    )
  }

  const porMes = meses.map((m) => ({
    mes: m.mes,
    certificacion: m.certificacion,
    costes: m.sumatorioCostes,
    certOrigen: m.certOrigen,
    costesOrigen: m.costesOrigen,
    margenOrigen: m.margenOrigenPct,
  }))
  const ultimo = porMes.length - 1
  // De mayor a menor: se compara el tamaño, no hay un orden natural entre tipos de coste
  const reparto = [
    { tipo: 'Estructura', valor: totales.sumEst },
    { tipo: 'Personal', valor: totales.sumPers },
    { tipo: 'Subcontratas', valor: totales.sumSub },
    { tipo: 'Materiales', valor: totales.sumMat },
    { tipo: 'Alquileres', valor: totales.sumAlq },
    { tipo: 'Combustible', valor: totales.sumComb },
    { tipo: 'Dietas', valor: totales.sumDie },
    { tipo: 'Hoteles', valor: totales.sumHot },
  ].sort((a, b) => b.valor - a.valor)

  /** Valor al final de la línea: solo en el último punto, no en todos */
  const alFinal =
    (formato: (valor: number) => string) =>
    ({ x, y, index, value }: { x?: number | string; y?: number | string; index?: number; value?: unknown }) =>
      index === ultimo ? (
        <text x={Number(x) + 10} y={Number(y)} dy={4} fontSize={12} fontWeight={600} fill="var(--foreground)">
          {formato(Number(value))}
        </text>
      ) : null

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Grafico
        titulo="Certificación y costes de cada mes"
        nota="Los costes incluyen la estructura."
        leyenda={[
          { nombre: 'Certificación', color: CERTIFICACION, forma: 'barra' },
          { nombre: 'Costes', color: COSTES, forma: 'barra' },
        ]}
      >
        <BarChart data={porMes} margin={MARGEN} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="mes" tickFormatter={mesCorto} tick={EJE} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
          <YAxis tickFormatter={(v) => compacto.format(v)} tick={EJE} tickLine={false} axisLine={false} width={52} />
          <Tooltip content={<Detalle formato={euros} />} cursor={{ fill: 'var(--muted)' }} />
          <Bar dataKey="certificacion" name="Certificación" fill={CERTIFICACION} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          <Bar dataKey="costes" name="Costes" fill={COSTES} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </Grafico>

      <Grafico
        titulo="Acumulado a origen"
        nota="La distancia entre las dos líneas es el resultado de la obra."
        leyenda={[
          { nombre: 'Certificado', color: CERTIFICACION, forma: 'linea' },
          { nombre: 'Costes', color: COSTES, forma: 'linea' },
        ]}
      >
        <LineChart data={porMes} margin={{ ...MARGEN, right: 96 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="mes" tickFormatter={mesCorto} tick={EJE} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
          <YAxis tickFormatter={(v) => compacto.format(v)} tick={EJE} tickLine={false} axisLine={false} width={52} />
          <Tooltip content={<Detalle formato={euros} />} cursor={{ stroke: 'var(--muted-foreground)' }} />
          <Line
            dataKey="certOrigen"
            name="Certificado"
            stroke={CERTIFICACION}
            strokeWidth={2}
            dot={{ r: 4, fill: CERTIFICACION, stroke: 'var(--background)', strokeWidth: 2 }}
            label={alFinal((v) => compacto.format(v) + ' €')}
            isAnimationActive={false}
          />
          <Line
            dataKey="costesOrigen"
            name="Costes"
            stroke={COSTES}
            strokeWidth={2}
            dot={{ r: 4, fill: COSTES, stroke: 'var(--background)', strokeWidth: 2 }}
            label={alFinal((v) => compacto.format(v) + ' €')}
            isAnimationActive={false}
          />
        </LineChart>
      </Grafico>

      <Grafico titulo="Costes a origen por tipo" nota="De mayor a menor.">
        <BarChart data={reparto} layout="vertical" margin={{ ...MARGEN, right: 96 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="tipo" tick={{ ...EJE, fill: 'var(--foreground)' }} tickLine={false} axisLine={false} width={96} />
          <Tooltip content={<Detalle formato={euros} />} cursor={{ fill: 'var(--muted)' }} />
          <Bar dataKey="valor" name="Coste" fill={COSTES} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
            <LabelList
              dataKey="valor"
              position="right"
              formatter={(v) => euros(Number(v))}
              style={{ fontSize: 12, fill: 'var(--foreground)' }}
            />
          </Bar>
        </BarChart>
      </Grafico>

      <Grafico titulo="Margen a origen" nota={`La línea gris marca el objetivo del ${MARGEN_OBJETIVO} %.`}>
        <LineChart data={porMes} margin={{ ...MARGEN, right: 64 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="mes" tickFormatter={mesCorto} tick={EJE} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
          <YAxis tickFormatter={(v) => `${v} %`} tick={EJE} tickLine={false} axisLine={false} width={52} />
          <Tooltip content={<Detalle formato={pct} />} cursor={{ stroke: 'var(--muted-foreground)' }} />
          <ReferenceLine
            y={MARGEN_OBJETIVO}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{ value: 'Objetivo', position: 'right', fontSize: 12, fill: 'var(--muted-foreground)' }}
          />
          <Line
            dataKey="margenOrigen"
            name="Margen a origen"
            stroke="var(--pizarra)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--pizarra)', stroke: 'var(--background)', strokeWidth: 2 }}
            label={alFinal(pct)}
            isAnimationActive={false}
          />
        </LineChart>
      </Grafico>
    </div>
  )
}

interface Clave {
  nombre: string
  color: string
  forma: 'barra' | 'linea'
}

function Marca({ color, forma }: Pick<Clave, 'color' | 'forma'>) {
  return (
    <span
      aria-hidden="true"
      className={forma === 'barra' ? 'inline-block size-2.5 rounded-xs' : 'inline-block h-0.5 w-4'}
      style={{ background: color }}
    />
  )
}

function Grafico({
  titulo,
  nota,
  leyenda,
  children,
}: {
  titulo: string
  nota: string
  /** Con dos o más series; con una sola, el título ya dice qué se pinta */
  leyenda?: Clave[]
  children: ReactElement
}) {
  return (
    <figure className="grid gap-2">
      <figcaption>
        <h2 className="font-semibold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{nota}</p>
      </figcaption>
      {leyenda && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {leyenda.map((l) => (
            <li key={l.nombre} className="flex items-center gap-1.5">
              <Marca color={l.color} forma={l.forma} /> {l.nombre}
            </li>
          ))}
        </ul>
      )}
      <div className="h-64 rounded-lg border bg-background p-2">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

/** Cuadro al pasar por un mes o una barra: todas las series, con el valor destacado. */
function Detalle({
  formato,
  active,
  label,
  payload,
}: {
  formato: (valor: number) => string
  active?: boolean
  label?: string | number
  payload?: readonly { name?: string | number; value?: unknown; color?: string }[]
}) {
  if (!active || !payload?.length) return null
  const titulo = typeof label === 'string' && /^\d{4}-\d{2}-01$/.test(label) ? etiquetaMes(label) : label
  return (
    <div className="grid gap-1 rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      {payload.map((p) => (
        <p key={String(p.name)} className="flex items-center gap-2">
          <Marca color={p.color ?? 'currentColor'} forma="linea" />
          <span className="font-semibold tabular-nums">{formato(Number(p.value))}</span>
          <span className="text-muted-foreground">{p.name}</span>
        </p>
      ))}
    </div>
  )
}
