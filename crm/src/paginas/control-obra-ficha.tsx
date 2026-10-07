import { ArrowLeft, Download, Lock, LockOpen, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Cifras } from '@/components/cifras'
import { ComparativaObra } from '@/components/comparativa-obra'
import { GraficosObra } from '@/components/graficos-obra'
import { HojaApuntes } from '@/components/hoja-apuntes'
import { Confirmar } from '@/components/listado'
import { Pestanas } from '@/components/pestanas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { etiquetaMes, nivelMargen } from '@/lib/calculos/control-obra'
import {
  csvObra,
  FILAS_ACUMULADOS,
  FILAS_MATRIZ,
  indicadoresObra,
  type Calculo,
  type FilaMatriz,
} from '@/lib/calculos/informe-obra'
import { COLOR_MARGEN, useControlObra, useMesesCerrados } from '@/lib/control-obra'
import { euros, pct } from '@/lib/formato'
import { useSesion } from '@/lib/sesion'
import { mensajeError } from '@/lib/supabase'
import { useHojas, type IdHoja } from './control-obra-hojas'

type Pestana = 'resumen' | 'graficos' | 'comparativa' | IdHoja
type Cierre = ReturnType<typeof useMesesCerrados>

const SIN_CIERRES: ReadonlySet<string> = new Set()

/** Descarga un texto como archivo. El BOM hace que Excel lea bien las tildes. */
function descargar(nombre: string, texto: string) {
  const url = URL.createObjectURL(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(url)
}

/** Control de una obra: resumen con la matriz mensual y las hojas de certificaciones y costes. */
export function ControlObraFicha() {
  const { id } = useParams()
  const { puede } = useSesion()
  const [parametros, setParametros] = useSearchParams()
  const control = useControlObra(id)
  const cierre = useMesesCerrados(id)
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
  const estado = obra.estado === 'terminada' ? 'Terminada' : 'En ejecución'
  const cerrados = cierre.cerrados ?? SIN_CIERRES

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
          <Badge variant={obra.estado === 'terminada' ? 'outline' : 'secondary'}>{estado}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              descargar(
                `Control_Obra_${obra.codigo}.csv`,
                csvObra({ ...obra, cliente: obra.clientes?.nombre ?? null, estado }, control.data, cerrados),
              )
            }
          >
            <Download /> Exportar CSV
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/control-obra/${id}/imprimir`}>
              <Printer /> Imprimir
            </Link>
          </Button>
        </div>
      </div>

      <Pestanas
        pestanas={visibles}
        activa={activa}
        // La hoja va en la URL: se puede recargar o volver atrás sin perder el sitio
        onCambio={(hoja) => setParametros(hoja === 'resumen' ? {} : { hoja }, { replace: true })}
      />

      {activa === 'resumen' ? (
        <Resumen
          datos={control.data}
          gastosGeneralesPct={obra.gastos_generales_pct}
          importePedido={obra.importe_pedido}
          cerrados={cerrados}
          cierre={cierre}
        />
      ) : activa === 'graficos' ? (
        <GraficosObra datos={control.data} />
      ) : activa === 'comparativa' ? (
        obra.presupuesto_id && <ComparativaObra presupuestoId={obra.presupuesto_id} datos={control.data} />
      ) : (
        // key: cada hoja empieza con su propio filtro de mes y sin diálogos abiertos
        <HojaApuntes key={activa} config={hojas[activa]} obraId={id} cerrados={cerrados} />
      )}
    </div>
  )
}

function Resumen({
  datos,
  gastosGeneralesPct,
  importePedido,
  cerrados,
  cierre,
}: {
  datos: Calculo
  gastosGeneralesPct: number
  importePedido: number
  cerrados: ReadonlySet<string>
  cierre: Cierre
}) {
  const { meses } = datos
  const colorResultado = (valor: number) => (valor >= 0 ? 'text-exito' : 'text-destructive')
  const colorMargen = (valor: number) => COLOR_MARGEN[nivelMargen(valor)]

  const indicadores = indicadoresObra(datos, gastosGeneralesPct, importePedido).map((i) => ({
    ...i,
    color: i.tipo === 'resultado' ? colorResultado(i.numero!) : i.tipo === 'margen' ? colorMargen(i.numero!) : '',
  }))

  const fila = (f: FilaMatriz) => (
    <tr key={f.campo} className={f.fuerte ? 'font-semibold' : undefined}>
      <th scope="row" className="sticky left-0 border-r bg-background px-3 py-2 text-left font-[inherit]">
        {f.etiqueta}
      </th>
      {meses.map((m) => {
        const valor = m[f.campo]
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
      <Cifras cifras={indicadores} />

      {meses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay certificaciones ni costes en esta obra. Empieza por la pestaña Certificaciones o por
          cualquiera de las de costes.
        </p>
      ) : (
        <>
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
                      {cerrados.has(m.mes) && (
                        <Lock className="mr-1 inline size-3.5 align-[-2px] text-muted-foreground" aria-label="Mes cerrado" />
                      )}
                      {etiquetaMes(m.mes)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {FILAS_MATRIZ.map(fila)}
                <tr className="bg-muted">
                  <th
                    scope="colgroup"
                    colSpan={meses.length + 1}
                    className="sticky left-0 px-3 py-1.5 text-left text-xs font-semibold tracking-wide uppercase"
                  >
                    Acumulados a origen
                  </th>
                </tr>
                {FILAS_ACUMULADOS.map(fila)}
              </tbody>
            </table>
          </div>

          <CierreMeses meses={meses.map((m) => m.mes)} cerrados={cerrados} cierre={cierre} />
        </>
      )}
    </div>
  )
}

/** Estado de cada mes y, para quien tiene el permiso cierre_meses (gerencia), cerrar y reabrir. */
function CierreMeses({ meses, cerrados, cierre }: { meses: string[]; cerrados: ReadonlySet<string>; cierre: Cierre }) {
  const { puede } = useSesion()
  const puedeCerrar = puede('cierre_meses', 'editar')
  const [pendiente, setPendiente] = useState<{ mes: string; cerrar: boolean } | null>(null)

  return (
    <section className="grid gap-2">
      <h2 className="font-semibold">Cierre de meses</h2>
      <p className="text-sm text-muted-foreground">
        En un mes cerrado nadie puede añadir, cambiar ni borrar apuntes de esta obra.
        {puedeCerrar ? ' Puedes reabrirlo cuando haga falta.' : ' Los cierra y los reabre gerencia.'}
      </p>
      <ul className="divide-y rounded-lg border bg-background">
        {meses.map((mes) => {
          const cerrado = cerrados.has(mes)
          return (
            <li key={mes} className="flex items-center gap-3 px-3 py-2">
              {cerrado ? (
                <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <LockOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{etiquetaMes(mes)}</span>
                <span className="text-muted-foreground"> · {cerrado ? 'Cerrado' : 'Abierto'}</span>
              </span>
              {puedeCerrar && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cierre.cambiar.isPending}
                  onClick={() => setPendiente({ mes, cerrar: !cerrado })}
                >
                  {cerrado ? 'Reabrir' : 'Cerrar'}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      <Confirmar
        titulo={pendiente ? `¿${pendiente.cerrar ? 'Cerrar' : 'Reabrir'} ${etiquetaMes(pendiente.mes)}?` : null}
        detalle={
          pendiente?.cerrar
            ? 'Nadie podrá añadir, cambiar ni borrar apuntes de ese mes en esta obra hasta que se reabra.'
            : 'Se podrán volver a añadir y cambiar apuntes de ese mes, y su resultado puede cambiar.'
        }
        accion={pendiente?.cerrar ? 'Cerrar el mes' : 'Reabrir el mes'}
        onConfirmar={() => pendiente && cierre.cambiar.mutate(pendiente)}
        onCerrar={() => setPendiente(null)}
      />
    </section>
  )
}
