import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import type { calcularObra } from '@/lib/calculos/control-obra'
import { euros, pct } from '@/lib/formato'
import { mensajeError, supabase } from '@/lib/supabase'

type Calculo = ReturnType<typeof calcularObra>

/**
 * Lo presupuestado frente a lo real a origen. Cada familia de la base de precios se compara
 * con la hoja de costes que le corresponde; lo que no tiene pareja se muestra aparte.
 * Los importes del presupuesto salen de las vistas SQL presupuestos_totales y presupuesto_costes_familia.
 */
export function ComparativaObra({ presupuestoId, datos }: { presupuestoId: string; datos: Calculo }) {
  const presupuesto = useQuery({
    queryKey: ['comparativa', presupuestoId],
    queryFn: async () => {
      const [cabecera, totales, familias] = await Promise.all([
        supabase.from('presupuestos').select('id, codigo').eq('id', presupuestoId).single(),
        supabase.from('presupuestos_totales').select().eq('presupuesto_id', presupuestoId).single(),
        supabase.from('presupuesto_costes_familia').select().eq('presupuesto_id', presupuestoId),
      ])
      if (cabecera.error) throw cabecera.error
      if (totales.error) throw totales.error
      if (familias.error) throw familias.error
      const coste = (familia: string) => familias.data.find((f) => f.familia === familia)?.coste ?? 0
      return {
        ...cabecera.data,
        base: totales.data.base ?? 0,
        costeDirecto: totales.data.coste_directo ?? 0,
        coste,
      }
    },
  })

  if (presupuesto.isError) return <p className="text-sm text-destructive">{mensajeError(presupuesto.error)}</p>
  if (!presupuesto.data) return <p className="text-sm text-muted-foreground">Cargando…</p>

  const p = presupuesto.data
  const t = datos.totales
  const costesReales = t.sumDirectos + t.sumDie + t.sumHot // sin estructura, como el coste directo del presupuesto
  // presupuestado = null: el presupuesto no tiene esa partida de coste
  const costes: { concepto: string; presupuestado: number | null; real: number }[] = [
    { concepto: 'Mano de obra · Personal', presupuestado: p.coste('mano_obra'), real: t.sumPers },
    { concepto: 'Subcontratas', presupuestado: p.coste('subcontrata'), real: t.sumSub },
    { concepto: 'Materiales', presupuestado: p.coste('materiales'), real: t.sumMat },
    { concepto: 'Maquinaria · Alquileres', presupuestado: p.coste('maquinaria'), real: t.sumAlq },
    { concepto: 'Vehículos · Combustible', presupuestado: p.coste('vehiculos'), real: t.sumComb },
    { concepto: 'Precios libres (sin familia)', presupuestado: p.coste('sin_clasificar'), real: 0 },
    { concepto: 'Dietas y hoteles', presupuestado: null, real: t.sumDie + t.sumHot },
  ]
  const margenPrevisto = p.base - p.costeDirecto
  const margenReal = t.sumCert - costesReales

  const fila = (concepto: string, presupuestado: number | null, real: number, fuerte = false) => (
    <tr key={concepto} className={fuerte ? 'font-semibold' : undefined}>
      <th scope="row" className="px-3 py-2 text-left font-[inherit]">
        {concepto}
      </th>
      <td className="px-3 py-2 text-right tabular-nums">{presupuestado === null ? '–' : euros(presupuestado)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{euros(real)}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        {presupuestado ? pct((real / presupuestado) * 100) : '–'}
      </td>
    </tr>
  )

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Presupuesto{' '}
        <Link to={`/presupuestos/${p.id}`} className="font-medium text-primary underline">
          {p.codigo}
        </Link>{' '}
        frente a lo real a origen. La última columna es cuánto de lo presupuestado se lleva ya.
      </p>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted">
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Concepto
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                Presupuestado
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                Real a origen
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {fila('Venta: presupuesto · certificado', p.base, t.sumCert, true)}
            {costes.map((c) => fila(c.concepto, c.presupuestado, c.real))}
            {fila('Total de costes (sin estructura)', p.costeDirecto, costesReales, true)}
            {fila('Margen antes de estructura', margenPrevisto, margenReal, true)}
            <tr className="font-semibold">
              <th scope="row" className="px-3 py-2 text-left font-[inherit]">
                Margen sobre la venta
              </th>
              <td className="px-3 py-2 text-right tabular-nums">{p.base > 0 ? pct((margenPrevisto / p.base) * 100) : '–'}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {t.sumCert > 0 ? pct((margenReal / t.sumCert) * 100) : '–'}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        El presupuesto no separa dietas ni hoteles, y sus precios libres no tienen familia. El margen del
        presupuesto incluye sus gastos generales y su beneficio; el real es antes de restar la estructura.
      </p>
    </div>
  )
}
