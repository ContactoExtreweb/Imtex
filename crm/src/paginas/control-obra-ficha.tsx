import { ArrowLeft } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ComparativaObra } from '@/components/comparativa-obra'
import { GraficosObra } from '@/components/graficos-obra'
import { HojaApuntes } from '@/components/hoja-apuntes'
import { Pestanas } from '@/components/pestanas'
import { Badge } from '@/components/ui/badge'
import { etiquetaMes, nivelMargen, type calcularObra } from '@/lib/calculos/control-obra'
import { COLOR_MARGEN, useControlObra } from '@/lib/control-obra'
import { euros, pct } from '@/lib/formato'
import { useSesion } from '@/lib/sesion'
import { mensajeError } from '@/lib/supabase'
import { useHojas, type IdHoja } from './control-obra-hojas'

type Pestana = 'resumen' | 'graficos' | 'comparativa' | IdHoja
type Calculo = ReturnType<typeof calcularObra>

/** Control de una obra: resumen con la matriz mensual y las hojas de certificaciones y costes. */
export function ControlObraFicha() {
  const { id } = useParams()
  const { puede } = useSesion()
  const [parametros, setParametros] = useSearchParams()
  const control = useControlObra(id)
  const hojas = useHojas()

  // Cada hoja se enseña solo a quien puede ver su módulo
  const pestanas: { id: Pestana; texto: string; visible: boolean }[] = [
    { id: 'resumen', texto: 'Resumen', visible: true },
    { id: 'graficos', texto: 'Gráficos', visible: true },
    { id: 'certificaciones', texto: 'Certificaciones', visible: puede('certificaciones', 'ver') },
    { id: 'personal', texto: 'Personal', visible: puede('partes_horas', 'ver') },
    { id: 'materiales', texto: 'Materiales', visible: true },
    { id: 'subcontratas', texto: 'Subcontratas', visible: true },
    { id: 'alquileres', texto: 'Alquileres', visible: true },
    { id: 'combustible', texto: 'Combustible', visible: true },
    { id: 'viajes', texto: 'Dietas y hoteles', visible: true },
    // Solo si la obra viene de un presupuesto y se pueden ver los presupuestos
    {
      id: 'comparativa',
      texto: 'Comparativa',
      visible: !!control.data?.obra.presupuesto_id && puede('presupuestos', 'ver'),
    },
  ]
  const visibles = pestanas.filter((p) => p.visible)
  const pedida = parametros.get('hoja')
  const activa = visibles.find((p) => p.id === pedida)?.id ?? 'resumen'

  if (control.isError) return <p className="p-4 text-sm text-destructive">{mensajeError(control.error)}</p>
  if (!control.data || !id) return <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
  const { obra } = control.data

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 p-4">
      <div>
        <Link to="/control-obra" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" /> Control de obra
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto min-w-0 text-xl font-semibold text-balance">
            {obra.codigo} · {obra.nombre}
          </h1>
          <Badge variant={obra.estado === 'terminada' ? 'outline' : 'secondary'}>
            {obra.estado === 'terminada' ? 'Terminada' : 'En ejecución'}
          </Badge>
        </div>
      </div>

      <Pestanas
        pestanas={visibles}
        activa={activa}
        // La hoja va en la URL: se puede recargar o volver atrás sin perder el sitio
        onCambio={(hoja) => setParametros(hoja === 'resumen' ? {} : { hoja }, { replace: true })}
      />

      {activa === 'resumen' ? (
        <Resumen datos={control.data} gastosGeneralesPct={obra.gastos_generales_pct} importePedido={obra.importe_pedido} />
      ) : activa === 'graficos' ? (
        <GraficosObra datos={control.data} />
      ) : activa === 'comparativa' ? (
        obra.presupuesto_id && <ComparativaObra presupuestoId={obra.presupuesto_id} datos={control.data} />
      ) : (
        // key: cada hoja empieza con su propio filtro de mes y sin diálogos abiertos
        <HojaApuntes key={activa} config={hojas[activa]} obraId={id} />
      )}
    </div>
  )
}

function Resumen({
  datos,
  gastosGeneralesPct,
  importePedido,
}: {
  datos: Calculo
  gastosGeneralesPct: number
  importePedido: number
}) {
  const { meses, totales, pendientePedido, pctAvance, margenGlobal } = datos
  const colorResultado = (valor: number) => (valor >= 0 ? 'text-exito' : 'text-destructive')
  const colorMargen = (valor: number) => COLOR_MARGEN[nivelMargen(valor)]

  const indicadores = [
    { etiqueta: 'Importe del pedido', valor: euros(importePedido) },
    { etiqueta: `Certificado a origen (${pct(pctAvance)} del pedido)`, valor: euros(totales.sumCert) },
    { etiqueta: 'Pendiente de certificar', valor: euros(pendientePedido) },
    { etiqueta: 'Costes a origen, con estructura', valor: euros(totales.sumTotMasEst) },
    { etiqueta: 'Costes directos', valor: euros(totales.sumDirectos) },
    { etiqueta: `Estructura (${gastosGeneralesPct} % de lo certificado)`, valor: euros(totales.sumEst) },
    { etiqueta: 'Dietas y hoteles', valor: euros(totales.sumDie + totales.sumHot) },
    { etiqueta: 'Resultado a origen', valor: euros(totales.sumRes), color: colorResultado(totales.sumRes) },
    { etiqueta: 'Margen a origen', valor: pct(margenGlobal), color: totales.sumCert > 0 ? colorMargen(margenGlobal) : '' },
  ]

  // Mismas filas y en el mismo orden que la matriz de la herramienta
  const filas: { campo: keyof Calculo['meses'][number]; etiqueta: string; tipo?: 'resultado' | 'margen'; fuerte?: boolean }[] = [
    { campo: 'certificacion', etiqueta: 'Certificación', fuerte: true },
    { campo: 'costeEstructura', etiqueta: 'Coste de estructura' },
    { campo: 'personal', etiqueta: 'Personal (horas)' },
    { campo: 'subcontrata', etiqueta: 'Subcontrata' },
    { campo: 'combustible', etiqueta: 'Combustible' },
    { campo: 'dietas', etiqueta: 'Dietas' },
    { campo: 'hoteles', etiqueta: 'Hoteles' },
    { campo: 'alquileres', etiqueta: 'Alquileres' },
    { campo: 'materiales', etiqueta: 'Materiales' },
    { campo: 'costesTotales', etiqueta: 'Costes totales', fuerte: true },
    { campo: 'sumatorioCostes', etiqueta: 'Costes + estructura', fuerte: true },
    { campo: 'resultadoMes', etiqueta: 'Resultado del mes', tipo: 'resultado', fuerte: true },
    { campo: 'margenPct', etiqueta: 'Margen del mes', tipo: 'margen', fuerte: true },
  ]
  const acumulados: typeof filas = [
    { campo: 'certOrigen', etiqueta: 'Certificación a origen', fuerte: true },
    { campo: 'costesOrigen', etiqueta: 'Costes a origen' },
    { campo: 'resultadoOrigen', etiqueta: 'Resultado a origen', tipo: 'resultado', fuerte: true },
    { campo: 'margenOrigenPct', etiqueta: 'Margen a origen', tipo: 'margen', fuerte: true },
  ]

  const fila = (f: (typeof filas)[number]) => (
    <tr key={f.campo} className={f.fuerte ? 'font-semibold' : undefined}>
      <th scope="row" className="sticky left-0 border-r bg-background px-3 py-2 text-left font-[inherit]">
        {f.etiqueta}
      </th>
      {meses.map((m) => {
        const valor = m[f.campo] as number
        const color =
          f.tipo === 'resultado' ? colorResultado(valor) : f.tipo === 'margen' && m.certOrigen > 0 ? colorMargen(valor) : ''
        return (
          <td key={m.mes} className={`px-3 py-2 text-right tabular-nums ${color}`}>
            {f.tipo === 'margen' ? pct(valor) : euros(valor)}
          </td>
        )
      })}
    </tr>
  )

  return (
    <div className="grid gap-6">
      <dl className="grid grid-cols-2 border-t border-l sm:grid-cols-3">
        {indicadores.map((i) => (
          <div key={i.etiqueta} className="flex flex-col-reverse justify-end gap-0.5 border-r border-b bg-background p-4">
            <dt className="text-sm text-muted-foreground">{i.etiqueta}</dt>
            <dd className={`text-xl font-semibold tabular-nums ${i.color ?? ''}`}>{i.valor}</dd>
          </div>
        ))}
      </dl>

      {meses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay certificaciones ni costes en esta obra. Empieza por la pestaña Certificaciones o por
          cualquiera de las de costes.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Certificación, costes y resultado de cada mes, y acumulados a origen</caption>
            <thead>
              <tr className="border-b bg-muted">
                <th scope="col" className="sticky left-0 border-r bg-muted px-3 py-2 text-left font-semibold">
                  Concepto
                </th>
                {meses.map((m) => (
                  <th key={m.mes} scope="col" className="min-w-28 px-3 py-2 text-right font-semibold whitespace-nowrap">
                    {etiquetaMes(m.mes)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filas.map(fila)}
              <tr className="bg-muted">
                <th
                  scope="colgroup"
                  colSpan={meses.length + 1}
                  className="sticky left-0 px-3 py-1.5 text-left text-xs font-semibold tracking-wide uppercase"
                >
                  Acumulados a origen
                </th>
              </tr>
              {acumulados.map(fila)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
