import { useQueryClient } from '@tanstack/react-query'
import { MessageCircle, TriangleAlert, Upload } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { FilaListado } from '@/components/listado'
import { Pestanas } from '@/components/pestanas'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { coincide, fecha, numeroATexto } from '@/lib/formato'
import { ESTADOS, leerParte, subirParte, usePartes, type Bandeja, type EstadoParte, type Parte } from '@/lib/partes'
import { useSesion } from '@/lib/sesion'
import { mensajeError } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const PESTANAS: { id: Bandeja; texto: string }[] = [
  { id: 'pendientes', texto: 'Pendientes' },
  { id: 'apuntados', texto: 'Apuntados' },
  { id: 'descartados', texto: 'Descartados' },
]

/** Color de cada estado: lo pendiente de la oficina destaca; lo cerrado, apagado. */
export function InsigniaParte({ estado }: { estado: string }) {
  const clase: Record<EstadoParte, string> = {
    revisar: 'border-transparent bg-aviso/12 text-aviso',
    leyendo: '',
    por_confirmar: '',
    apuntado: 'border-transparent bg-exito/12 text-exito',
    descartado: '',
  }
  return (
    <Badge
      variant={estado === 'revisar' || estado === 'apuntado' ? 'outline' : 'secondary'}
      className={cn('shrink-0', clase[estado as EstadoParte])}
    >
      {ESTADOS[estado as EstadoParte] ?? estado}
    </Badge>
  )
}

/** «3 trabajadores · 12 h + 2 h extra» */
function resumenHoras(parte: Pick<Parte, 'lineas'>) {
  const ord = parte.lineas.reduce((s, l) => s + (Number(l.horas_ord) || 0), 0)
  const ext = parte.lineas.reduce((s, l) => s + (Number(l.horas_ext) || 0), 0)
  const n = parte.lineas.length
  if (n === 0) return 'sin trabajadores'
  return `${n} ${n === 1 ? 'trabajador' : 'trabajadores'} · ${numeroATexto(ord)} h${ext ? ` + ${numeroATexto(ext)} h extra` : ''}`
}

/**
 * Bandeja de partes de trabajo en papel: los que llegan por WhatsApp y los que se suben aquí.
 * La IA los lee; la oficina los revisa con la foto delante y los apunta en el control de obra.
 */
export function Partes() {
  const { puede } = useSesion()
  const navigate = useNavigate()
  const [bandeja, setBandeja] = useState<Bandeja>('pendientes')
  const [busqueda, setBusqueda] = useState('')
  const partes = usePartes(bandeja)

  const filas = (partes.data ?? []).filter((p) =>
    coincide(busqueda, p.obras?.codigo, p.obras?.nombre, p.enviado?.nombre, p.trabajos, ...p.lineas.map((l) => l.nombre)),
  )

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Partes de trabajo</h1>
        {puede('partes_horas', 'editar') && <Subir alSubirUno={(id) => navigate(`/partes/${id}`)} />}
      </div>
      <p className="text-sm text-muted-foreground">
        Las hojas de parte que llegan por WhatsApp o se suben aquí. La IA las lee; revisa cada una con la foto delante y
        apúntala en el control de obra.
      </p>
      <Pestanas pestanas={PESTANAS} activa={bandeja} onCambio={setBandeja} />
      <Input
        type="search"
        placeholder="Buscar por obra, trabajador o trabajos…"
        aria-label="Buscar"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      {partes.isError ? (
        <p className="text-sm text-destructive">{mensajeError(partes.error)}</p>
      ) : partes.isPending ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {bandeja === 'pendientes' && !busqueda ? 'No hay partes pendientes.' : 'No hay nada que mostrar.'}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {filas.map((p) => (
            <FilaListado
              key={p.id}
              titulo={`${p.fecha ? fecha(p.fecha) : 'Sin fecha'} · ${p.obras ? `${p.obras.codigo} · ${p.obras.nombre}` : 'obra sin reconocer'}`}
              detalle={[
                resumenHoras(p),
                p.origen === 'whatsapp' ? `por WhatsApp${p.enviado ? ` de ${p.enviado.nombre}` : ''}` : 'subido aquí',
              ].join(' · ')}
              extra={
                <>
                  {p.avisos.length > 0 && p.estado !== 'apuntado' && (
                    <span className="flex items-center gap-1 text-xs text-aviso" title={p.avisos.join('\n')}>
                      <TriangleAlert className="size-4" aria-hidden />
                      <span className="sr-only">Avisos:</span>
                      {p.avisos.length}
                    </span>
                  )}
                  {p.origen === 'whatsapp' && <MessageCircle className="size-4 text-muted-foreground" aria-label="WhatsApp" />}
                  <InsigniaParte estado={p.estado} />
                </>
              }
              onAbrir={() => navigate(`/partes/${p.id}`)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

/** Subir fotos de partes: cada una se comprime, se guarda y la lee la IA. Con una sola, se abre su ficha. */
function Subir({ alSubirUno }: { alSubirUno: (id: string) => void }) {
  const queryClient = useQueryClient()
  const [subida, setSubida] = useState<{ hechas: number; total: number } | null>(null)

  async function subir(archivos: File[]) {
    if (archivos.length === 0 || subida) return
    const subidos: string[] = []
    const fallos: string[] = []
    let sinLeer = 0
    setSubida({ hechas: 0, total: archivos.length })
    for (const [i, archivo] of archivos.entries()) {
      try {
        const id = await subirParte(archivo)
        subidos.push(id)
        try {
          await leerParte(id)
        } catch (error) {
          sinLeer++
          console.error(error)
        }
      } catch (error) {
        fallos.push(`«${archivo.name}»: ${mensajeError(error as Error)}`)
      }
      setSubida({ hechas: i + 1, total: archivos.length })
    }
    setSubida(null)
    await queryClient.invalidateQueries({ queryKey: ['partes_trabajo'] })
    if (subidos.length > 0) {
      toast.success(subidos.length === 1 ? 'Parte subido' : `${subidos.length} partes subidos`)
      if (sinLeer > 0) {
        toast.warning(
          sinLeer === 1
            ? 'No se ha podido leer automáticamente: rellénalo mirando la foto.'
            : `${sinLeer} no se han podido leer automáticamente: rellénalos mirando la foto.`,
          { duration: 10000 },
        )
      }
    }
    if (fallos.length > 0) toast.error(`No se ha podido subir ${fallos.join(' · ')}`, { duration: 10000 })
    if (subidos.length === 1 && archivos.length === 1) alSubirUno(subidos[0])
  }

  return (
    <label
      className={cn(
        'inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground focus-within:ring-3 focus-within:ring-ring/50 escritorio:h-8',
        subida && 'cursor-progress opacity-70',
      )}
    >
      <Upload className="size-4" aria-hidden />
      <span role={subida ? 'status' : undefined}>
        {subida ? `Subiendo y leyendo ${Math.min(subida.hechas + 1, subida.total)} de ${subida.total}…` : 'Subir partes'}
      </span>
      <input
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="sr-only"
        disabled={!!subida}
        onChange={(ev) => {
          subir([...(ev.target.files ?? [])])
          ev.target.value = '' // para poder volver a elegir el mismo
        }}
      />
    </label>
  )
}
