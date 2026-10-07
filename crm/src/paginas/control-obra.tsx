import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Selector } from '@/components/campo'
import { FilaListado, PaginaListado } from '@/components/listado'
import { nivelMargen } from '@/lib/calculos/control-obra'
import { COLOR_MARGEN, totalesAOrigen } from '@/lib/control-obra'
import { coincide, euros, pct } from '@/lib/formato'
import { supabase } from '@/lib/supabase'

/** Obras con lo certificado, los costes y el margen a origen. */
export function ControlObra() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('en_ejecucion')

  // Los totales se calculan con la misma función que la ficha (totalesAOrigen)
  const lista = useQuery({
    queryKey: ['control_obra', 'lista'],
    queryFn: async () => {
      const { data: obras, error } = await supabase
        .from('obras')
        .select('id, codigo, nombre, localidad, estado, importe_pedido, gastos_generales_pct')
        .order('codigo')
      if (error) throw error
      const totales = await totalesAOrigen(obras)
      return obras.map((o) => {
        const { certificado, costes } = totales.get(o.id)!
        return { ...o, certificado, costes, margen: certificado > 0 ? ((certificado - costes) / certificado) * 100 : 0 }
      })
    },
  })

  const filas = (lista.data ?? []).filter(
    (o) => (!estado || o.estado === estado) && coincide(busqueda, o.codigo, o.nombre, o.localidad),
  )

  return (
    <PaginaListado
      titulo="Control de obra"
      busqueda={busqueda}
      onBuscar={setBusqueda}
      filtros={
        <Selector aria-label="Estado" className="w-auto" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="en_ejecucion">En ejecución</option>
          <option value="terminada">Terminadas</option>
          <option value="">Todas</option>
        </Selector>
      }
      cargando={lista.isPending}
      vacio={filas.length === 0}
    >
      {filas.map((o) => (
        <FilaListado
          key={o.id}
          titulo={`${o.codigo} · ${o.nombre}`}
          detalle={`Certificado ${euros(o.certificado)} de ${euros(o.importe_pedido)} · Costes ${euros(o.costes)}`}
          extra={
            o.certificado > 0 && (
              <span className={`text-sm font-semibold tabular-nums ${COLOR_MARGEN[nivelMargen(o.margen)]}`}>
                {pct(o.margen)}
              </span>
            )
          }
          onAbrir={() => navigate(`/control-obra/${o.id}`)}
        />
      ))}
    </PaginaListado>
  )
}
