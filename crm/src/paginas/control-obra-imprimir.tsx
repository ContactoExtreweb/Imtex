import { ArrowLeft, Globe, Lock, Mail, Phone, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import logoImtex from '@/assets/logo-imtex.png'
import { Button } from '@/components/ui/button'
import { etiquetaMes } from '@/lib/calculos/control-obra'
import { FILAS_ACUMULADOS, FILAS_MATRIZ, indicadoresObra, type Calculo, type FilaMatriz } from '@/lib/calculos/informe-obra'
import { useControlObra, useMesesCerrados } from '@/lib/control-obra'
import { EMPRESA } from '@/lib/empresa'
import { mensajeError } from '@/lib/supabase'

const POR_TABLA = 10 // meses por tabla: lo que cabe en un A4 apaisado sin apretar los importes
const importe = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' })
const SIN_CIERRES: ReadonlySet<string> = new Set()

/**
 * Informe de control de una obra para imprimir o guardar como PDF: indicadores y matriz mensual
 * con acumulados a origen. Misma cabecera de marca que el presupuesto impreso.
 */
export function ControlObraImprimir() {
  const { id } = useParams()
  const control = useControlObra(id)
  const cerrados = useMesesCerrados(id).cerrados ?? SIN_CIERRES
  const [hoy] = useState(() => new Date().toLocaleDateString('es-ES'))

  if (control.isError) return <p className="p-4 text-sm text-destructive">{mensajeError(control.error)}</p>
  if (!control.data) return <p className="p-4 text-sm text-muted-foreground">Cargando…</p>

  const datos: Calculo = control.data
  const { obra } = control.data
  const grupos: Calculo['meses'][] = []
  for (let i = 0; i < datos.meses.length; i += POR_TABLA) grupos.push(datos.meses.slice(i, i + POR_TABLA))

  const fila = (f: FilaMatriz, meses: Calculo['meses'], conTotal: boolean) => (
    <tr key={f.campo} className={`border-b border-[#e3e8ee] ${f.fuerte ? 'font-bold' : ''}`}>
      <th scope="row" className="py-1 pr-2 text-left font-[inherit]">
        {f.etiqueta}
        {f.tipo === 'margen' && ' (%)'}
      </th>
      {meses.map((m) => (
        <td key={m.mes} className={`px-1.5 py-1 text-right tabular-nums ${m[f.campo] < 0 ? 'text-[#d42515]' : ''}`}>
          {importe.format(m[f.campo])}
        </td>
      ))}
      {conTotal && (
        <td className="bg-[#eef4fa] px-1.5 py-1 text-right font-bold tabular-nums">
          {f.total ? importe.format(f.total(datos)) : ''}
        </td>
      )}
    </tr>
  )

  return (
    <div className="min-h-dvh bg-neutral-200 print:bg-white">
      {/* Esta hoja va apaisada; el resto de impresiones (el presupuesto) siguen en vertical */}
      <style>{'@media print { @page { size: A4 landscape; margin: 10mm 12mm; } }'}</style>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background p-3 print:hidden">
        <Button variant="outline" asChild>
          <Link to={`/control-obra/${obra.id}`}>
            <ArrowLeft /> Volver
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer /> Imprimir / Guardar como PDF
        </Button>
      </div>

      <div className="mx-auto max-w-[1180px] p-4 text-[11px] leading-snug text-[#1c2632] print:max-w-none print:p-0">
        <section className="hoja mb-8 overflow-x-auto rounded-lg bg-white px-4 py-5 shadow-lg sm:px-8 sm:py-7 print:overflow-visible">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b-2 border-[#131116] pb-3">
            <div>
              <img src={logoImtex} alt={EMPRESA.nombre} className="h-[56px] w-auto" />
              <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[10px] font-medium text-[#131116]">
                <span className="flex items-center gap-1">
                  <Phone className="size-3 text-[#ff311e]" /> {EMPRESA.telefono}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="size-3 text-[#ff311e]" /> {EMPRESA.email}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="size-3 text-[#ff311e]" /> {EMPRESA.web}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold tracking-[2px] text-[#ff311e]">CONTROL DE OBRA</p>
              <p className="text-[13px] font-bold text-[#131116]">{obra.codigo}</p>
              <p className="text-[#5b6d80]">Informe del {hoy}</p>
            </div>
          </div>

          <p className="mb-2 bg-[#f6f4f3] px-3 py-2 text-sm font-bold text-[#131116]">{obra.nombre}</p>
          <p className="mb-3 text-[#40566d]">
            <b>Cliente:</b> {obra.clientes?.nombre ?? '—'} · <b>Localidad:</b> {obra.localidad ?? '—'} · <b>Estado:</b>{' '}
            {obra.estado === 'terminada' ? 'Terminada' : 'En ejecución'}
          </p>

          <dl className="mb-4 grid gap-x-6 gap-y-1 sm:grid-cols-3">
            {indicadoresObra(datos, obra.gastos_generales_pct, obra.importe_pedido).map((i) => (
              <div key={i.etiqueta} className="flex items-baseline justify-between gap-3 border-b border-[#e3e8ee] py-1">
                <dt className="text-[#40566d]">{i.etiqueta}</dt>
                <dd className={`font-bold tabular-nums ${(i.numero ?? 0) < 0 ? 'text-[#d42515]' : 'text-[#131116]'}`}>
                  {i.valor}
                </dd>
              </div>
            ))}
          </dl>

          {grupos.length === 0 && <p>Esta obra todavía no tiene certificaciones ni costes.</p>}
          {grupos.map((meses, n) => {
            const conTotal = n === grupos.length - 1 // el total de la obra, al final de la última tabla
            return (
              <table key={meses[0].mes} className="mb-4 w-full break-inside-avoid border-collapse">
                <caption className="sr-only">Certificación, costes y resultado de cada mes, y acumulados a origen</caption>
                <thead>
                  <tr className="bg-[#131116] text-white">
                    <th scope="col" className="px-2 py-1.5 text-left font-bold">
                      Importes en euros
                    </th>
                    {meses.map((m) => (
                      <th key={m.mes} scope="col" className="px-1.5 py-1.5 text-right font-bold whitespace-nowrap">
                        {cerrados.has(m.mes) && <Lock className="mr-0.5 inline size-2.5 align-[-1px]" aria-label="Mes cerrado" />}
                        {etiquetaMes(m.mes)}
                      </th>
                    ))}
                    {conTotal && (
                      <th scope="col" className="px-1.5 py-1.5 text-right font-bold">
                        Total
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {FILAS_MATRIZ.map((f) => fila(f, meses, conTotal))}
                  <tr className="bg-[#f6f4f3]">
                    <th
                      scope="colgroup"
                      colSpan={meses.length + 1 + Number(conTotal)}
                      className="px-2 py-1 text-left text-[10px] font-bold tracking-wide uppercase"
                    >
                      Acumulados a origen
                    </th>
                  </tr>
                  {FILAS_ACUMULADOS.map((f) => fila(f, meses, conTotal))}
                </tbody>
              </table>
            )
          })}

          {cerrados.size > 0 && (
            <p className="flex items-center gap-1 text-[10px] text-[#5b6d80]">
              <Lock className="size-2.5" aria-hidden /> Mes cerrado: sus apuntes ya no se pueden cambiar.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
