import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Selector } from '@/components/campo'
import { FilaListado, PaginaListado } from '@/components/listado'
import { Badge } from '@/components/ui/badge'
import { coincide, euros, fecha } from '@/lib/formato'
import { ESTADOS, type Estado } from '@/lib/presupuestos'
import { useSesion } from '@/lib/sesion'
import { supabase } from '@/lib/supabase'
import { todasLasFilas } from '@/lib/todas-las-filas'
import { useTabla } from '@/lib/tabla'

// El rojo de la marca es para acciones y selección; el estado lleva su propio código de color
const COLOR_ESTADO = { borrador: 'outline', enviado: 'secondary', aceptado: 'outline', rechazado: 'destructive' } as const

export function InsigniaEstado({ estado }: { estado: Estado }) {
  return (
    <Badge
      variant={COLOR_ESTADO[estado]}
      className={estado === 'aceptado' ? 'border-transparent bg-exito/12 text-exito' : undefined}
    >
      {ESTADOS[estado]}
    </Badge>
  )
}

export function Presupuestos() {
  const { puede } = useSesion()
  const navigate = useNavigate()
  const clientes = useTabla('clientes', 'nombre').lista.data ?? []
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')

  // Los totales salen de la vista SQL presupuestos_totales (regla 7: sumas en SQL)
  const lista = useQuery({
    queryKey: ['presupuestos'],
    queryFn: async () => {
      // Por páginas: en unos años habrá más de 1.000 presupuestos, que es el tope de la API por petición
      const [presupuestos, totales] = await Promise.all([
        todasLasFilas((de, hasta) =>
          supabase
            .from('presupuestos')
            .select('id, codigo, titulo, estado, fecha, cliente_id', { count: 'exact' })
            .order('codigo', { ascending: false })
            .range(de, hasta),
        ),
        todasLasFilas((de, hasta) =>
          supabase
            .from('presupuestos_totales')
            .select('presupuesto_id, base', { count: 'exact' })
            .order('presupuesto_id')
            .range(de, hasta),
        ),
      ])
      const base = new Map(totales.map((t) => [t.presupuesto_id, t.base ?? 0]))
      return presupuestos.map((p) => ({ ...p, base: base.get(p.id) ?? 0 }))
    },
  })

  const nombreCliente = (id: string | null) => clientes.find((c) => c.id === id)?.nombre
  const filas = (lista.data ?? []).filter(
    (p) => (!estado || p.estado === estado) && coincide(busqueda, p.codigo, p.titulo, nombreCliente(p.cliente_id)),
  )

  return (
    <PaginaListado
      titulo="Presupuestos"
      busqueda={busqueda}
      onBuscar={setBusqueda}
      filtros={
        <Selector aria-label="Estado" className="w-auto" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </Selector>
      }
      onNuevo={puede('presupuestos', 'editar') ? () => navigate('/presupuestos/nuevo') : undefined}
      cargando={lista.isPending}
      vacio={filas.length === 0}
    >
      {filas.map((p) => (
        <FilaListado
          key={p.id}
          titulo={`${p.codigo} · ${p.titulo || '(sin título)'}`}
          detalle={[nombreCliente(p.cliente_id), fecha(p.fecha), `${euros(p.base)} + IVA`].filter(Boolean).join(' · ')}
          extra={<InsigniaEstado estado={p.estado as Estado} />}
          onAbrir={() => navigate(`/presupuestos/${p.id}`)}
        />
      ))}
    </PaginaListado>
  )
}
