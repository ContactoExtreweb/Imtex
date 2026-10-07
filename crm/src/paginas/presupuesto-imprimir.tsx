import { ArrowLeft, Globe, Mail, Phone, Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import firma from '@/assets/firma-imtex.png'
import logoImtex from '@/assets/logo-imtex.png'
import { Button } from '@/components/ui/button'
import { partidaCostes, sumaResumen } from '@/lib/calculos/presupuesto'
import { EMPRESA } from '@/lib/empresa'
import { euros, fecha } from '@/lib/formato'
import { usePresupuesto, type PartidaEdicion } from '@/lib/presupuestos'
import { mensajeError } from '@/lib/supabase'
import { useTabla } from '@/lib/tabla'

const POR_HOJA = 12 // partidas por hoja, como la herramienta
const medicion = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4, useGrouping: 'always' })

/**
 * Presupuesto para imprimir o guardar como PDF: carta, relación de partidas y condiciones.
 * Mismo formato que generarInforme() de referencia/IMTEX_plantilla_presupuestos.html.
 * Las reglas de página (A4, saltos) están en index.css (.hoja).
 */
export function PresupuestoImprimir() {
  const { id } = useParams()
  const consulta = usePresupuesto(id)
  const clientes = useTabla('clientes', 'nombre').lista.data ?? []

  if (consulta.isError) return <p className="p-4 text-sm text-destructive">{mensajeError(consulta.error)}</p>
  if (!consulta.data) return <p className="p-4 text-sm text-muted-foreground">Cargando…</p>

  const p = consulta.data
  const cliente = clientes.find((c) => c.id === p.cliente_id)?.nombre ?? ''
  const totales = sumaResumen(p.partidas, p.iva_pct)
  const grupos: PartidaEdicion[][] = []
  for (let i = 0; i < p.partidas.length; i += POR_HOJA) grupos.push(p.partidas.slice(i, i + POR_HOJA))

  const cabecera = (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b-2 border-[#131116] pb-3">
        <div>
          {/* Solo el logo de IMTEX (sin lema ni sellos de certificación) y el contacto */}
          <img src={logoImtex} alt={EMPRESA.nombre} className="h-[70px] w-auto" />
          <p className="mt-2 text-[10.5px] text-[#64758a]">
            {EMPRESA.direccion} · {EMPRESA.poblacion}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 text-[10.5px] font-medium text-[#131116]">
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
          <p className="text-xl font-bold tracking-[2px] text-[#ff311e]">PRESUPUESTO</p>
          <p className="text-[13px] font-bold text-[#131116]">Nº {p.codigo || '—'}</p>
          <p className="text-[11px] text-[#5b6d80]">Fecha: {fecha(p.fecha)}</p>
        </div>
      </div>
      {p.titulo && (
        <p className="mb-3 border-l-4 border-[#ff311e] bg-[#f6f4f3] px-4 py-3 text-sm font-bold text-[#131116]">
          Obra: {p.titulo}
        </p>
      )}
      <div className="mb-4 grid gap-1.5 text-xs text-[#40566d]">
        <p>
          <b>Cliente:</b> {cliente || '···'}
          {p.contacto && ` — ${p.contacto}`}
        </p>
        <p>
          <b>Localidad de la obra:</b> {p.localidad || '···'}
        </p>
        <p>
          <b>Validez de la oferta:</b> {p.validez || '···'}
          {p.plazo && (
            <>
              {' · '}
              <b>Plazo ejecución:</b> {p.plazo}
            </>
          )}
          {p.forma_pago && (
            <>
              {' · '}
              <b>Forma de pago:</b> {p.forma_pago}
            </>
          )}
        </p>
      </div>
    </>
  )

  return (
    <div className="min-h-dvh bg-neutral-200 print:bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background p-3 print:hidden">
        <Button variant="outline" asChild>
          <Link to={`/presupuestos/${p.id}`}>
            <ArrowLeft /> Volver
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer /> Imprimir / Guardar como PDF
        </Button>
      </div>

      <div className="mx-auto max-w-[880px] p-4 text-[13px] leading-relaxed text-[#1c2632] print:max-w-none print:p-0">
        <Hoja>
          {cabecera}
          <Seccion>Carta de presentación</Seccion>
          <p className="my-2 whitespace-pre-wrap text-justify">{p.carta}</p>
          <div className="mt-8 flex flex-col items-end">
            <img src={firma} alt={`Firma de ${EMPRESA.nombre}`} className="mb-1 h-[74px] max-w-[250px] object-contain" />
            <p className="min-w-[150px] border-t border-[#8896a6] pt-1.5 text-center text-[11px] text-[#33465b]">
              Fdo.: {EMPRESA.nombre}
            </p>
          </div>
        </Hoja>

        {grupos.map((grupo, i) => (
          <Hoja key={i}>
            {cabecera}
            <Seccion>Relación de partidas</Seccion>
            <table className="tabla-presupuesto w-full min-w-[34rem] border-collapse text-xs">
              <thead>
                <tr>
                  <th className="text-center">Código</th>
                  <th>Título de la partida</th>
                  <th className="text-center">Medición</th>
                  <th className="text-right">PVP (€/Ud.)</th>
                  <th className="text-right">Importe (€)</th>
                </tr>
              </thead>
              <tbody>
                {grupo.map((partida) => {
                  const pvp = partidaCostes(partida).total
                  const cantidad = partida.cantidad || 1
                  return (
                    <tr key={partida.clave}>
                      <td className="text-center align-top font-bold">{partida.codigo || '—'}</td>
                      <td>
                        <span className="font-bold text-[#131116]">{partida.titulo || '(sin título)'}</span>
                        <span className="block text-[11px] italic text-[#5b6d80]">{partida.medicion}</span>
                      </td>
                      <td className="text-center">{medicion.format(cantidad)}</td>
                      <td className="text-right">{euros(pvp)}</td>
                      <td className="text-right font-bold">{euros(pvp * cantidad)}</td>
                    </tr>
                  )
                })}
                {i === grupos.length - 1 && (
                  <>
                    <tr className="total">
                      <td colSpan={4}>TOTAL (Base Imponible)</td>
                      <td>{euros(totales.base)}</td>
                    </tr>
                    <tr className="iva">
                      <td colSpan={4}>IVA ({p.iva_pct} %)</td>
                      <td>{euros(totales.iva)}</td>
                    </tr>
                    <tr className="iva final">
                      <td colSpan={4}>TOTAL PRESUPUESTO (IVA incluido)</td>
                      <td>{euros(totales.total)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </Hoja>
        ))}

        <Hoja>
          {cabecera}
          <Seccion>Condiciones particulares</Seccion>
          <p className="whitespace-pre-wrap text-justify leading-[1.85]">{p.condiciones}</p>
          <div className="mt-10 flex justify-between gap-4 text-center text-[11.5px] text-[#33465b] sm:gap-12">
            <div className="flex w-[42%] flex-col items-center">
              <img src={firma} alt={`Firma de ${EMPRESA.nombre}`} className="mb-1 h-20 max-w-full object-contain" />
              <p className="w-full border-t border-[#8896a6] pt-2">Fdo.: {EMPRESA.nombre}</p>
            </div>
            <div className="flex w-[42%] flex-col items-center">
              <div className="mb-1 h-20" />
              <p className="w-full border-t border-[#8896a6] pt-2">Aceptado por: {cliente}</p>
            </div>
          </div>
        </Hoja>
      </div>
    </div>
  )
}

function Hoja({ children }: { children: ReactNode }) {
  // En el móvil la hoja tiene menos margen y la tabla de partidas se desplaza en horizontal
  return (
    <section className="hoja mb-8 overflow-x-auto rounded-lg bg-white px-4 py-5 shadow-lg sm:px-10 sm:py-9 print:overflow-visible">
      {children}
    </section>
  )
}

function Seccion({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 border-b border-[#e4e8ef] pb-1.5 text-sm font-bold uppercase tracking-wide text-[#131116]">
      {children}
    </h2>
  )
}
