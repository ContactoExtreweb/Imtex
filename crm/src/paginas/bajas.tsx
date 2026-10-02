import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileUp, Paperclip, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Campo, Selector } from '@/components/campo'
import { ConfirmarBorrado } from '@/components/listado'
import { Pestanas } from '@/components/pestanas'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  ACEPTA,
  borrarDocumento,
  subirDocumento,
  TIPOS_PARTE,
  useBajas,
  useMiFicha,
  type Baja,
  type TipoParte,
} from '@/lib/bajas'
import { coincide, fechaHora } from '@/lib/formato'
import { useSesion } from '@/lib/sesion'
import { mensajeError } from '@/lib/supabase'
import { useTabla } from '@/lib/tabla'
import { cn } from '@/lib/utils'

type Pestana = 'mias' | 'todas'

/**
 * Papeles de baja. Cada trabajador sube los suyos y ve cuándo quedaron subidos;
 * quien tiene el módulo `bajas` ve el historial de todos y puede subir en nombre de otro.
 */
export function Bajas() {
  const { perfil, puede } = useSesion()
  const veTodas = puede('bajas', 'ver')
  const ficha = useMiFicha(perfil?.id)
  const [elegida, setElegida] = useState<Pestana | null>(null)

  // Si un archivo se suelta fuera de la zona, que el navegador no lo abra y se pierda la pantalla
  useEffect(() => {
    const evitar = (ev: DragEvent) => ev.preventDefault()
    window.addEventListener('dragover', evitar)
    window.addEventListener('drop', evitar)
    return () => {
      window.removeEventListener('dragover', evitar)
      window.removeEventListener('drop', evitar)
    }
  }, [])

  const pestanas: { id: Pestana; texto: string }[] = [
    ...(ficha.data ? [{ id: 'mias' as const, texto: 'Mis papeles' }] : []),
    ...(veTodas ? [{ id: 'todas' as const, texto: 'De todos los trabajadores' }] : []),
  ]
  const pestana = pestanas.some((p) => p.id === elegida) ? elegida : pestanas[0]?.id

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 p-4">
      <h1 className="text-xl font-semibold">Bajas</h1>
      {ficha.isError && <p className="text-sm text-destructive">{mensajeError(ficha.error)}</p>}
      {ficha.isPending ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : pestanas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tu usuario no está enlazado a una ficha de trabajador, así que todavía no puedes subir papeles. Pídeselo a
          administración.
        </p>
      ) : (
        <>
          {pestanas.length > 1 && <Pestanas pestanas={pestanas} activa={pestana!} onCambio={setElegida} />}
          {pestana === 'mias' && ficha.data && <MisPapeles trabajadorId={ficha.data.id} />}
          {pestana === 'todas' && <DeTodos />}
        </>
      )}
    </div>
  )
}

function MisPapeles({ trabajadorId }: { trabajadorId: string }) {
  const { perfil } = useSesion()
  const bajas = useBajas(trabajadorId)
  return (
    <>
      <Subir trabajadorId={trabajadorId} />
      <section className="grid gap-2">
        <h2 className="font-semibold">Lo que has subido</h2>
        <Historial
          consulta={bajas}
          vacio="Todavía no has subido ningún papel."
          // Lo que administración subió en su nombre lo ve, pero no lo borra
          puedeBorrar={(b) => b.subido_por === perfil?.id}
        />
      </section>
    </>
  )
}

function DeTodos() {
  const { puede } = useSesion()
  const gestiona = puede('bajas', 'editar')
  const bajas = useBajas()
  const [busqueda, setBusqueda] = useState('')
  const [trabajador, setTrabajador] = useState('')
  const [tipo, setTipo] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const todas = bajas.data ?? []
  // Solo los trabajadores que tienen algún papel
  const conPapeles = [...new Map(todas.map((b) => [b.trabajador_id, b.trabajadores?.nombre ?? '(sin nombre)'])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1], 'es'),
  )
  const filas = todas.filter(
    (b) =>
      (!trabajador || b.trabajador_id === trabajador) &&
      (!tipo || b.tipo === tipo) &&
      coincide(busqueda, b.trabajadores?.nombre, b.subido_por_nombre, b.comentario, b.nombre_archivo),
  )

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Input
          type="search"
          placeholder="Buscar…"
          aria-label="Buscar"
          className="min-w-40 flex-1"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Selector aria-label="Trabajador" className="w-auto max-w-full" value={trabajador} onChange={(e) => setTrabajador(e.target.value)}>
          <option value="">Todos los trabajadores</option>
          {conPapeles.map(([id, nombre]) => (
            <option key={id} value={id}>
              {nombre}
            </option>
          ))}
        </Selector>
        <Selector aria-label="Tipo de parte" className="w-auto" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS_PARTE).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </Selector>
        {gestiona && (
          <Button onClick={() => setSubiendo(true)}>
            <Upload /> Subir papel
          </Button>
        )}
      </div>
      <Historial
        consulta={{ ...bajas, data: bajas.data && filas }}
        conTrabajador
        vacio={todas.length === 0 ? 'Todavía no se ha subido ningún papel.' : 'Ningún papel coincide con el filtro.'}
        puedeBorrar={() => gestiona}
      />
      {subiendo && (
        <Dialog open onOpenChange={(abierto) => !abierto && setSubiendo(false)}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Subir un papel en nombre de un trabajador</DialogTitle>
            </DialogHeader>
            <Subir elegirTrabajador trabajadorId={trabajador} alTerminar={() => setSubiendo(false)} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

/** Tipo de parte, comentario y zona para elegir los archivos. Se suben al elegirlos. */
function Subir({
  trabajadorId: inicial,
  elegirTrabajador = false,
  alTerminar,
}: {
  trabajadorId: string
  /** Quien gestiona las bajas elige a quién pertenece el papel */
  elegirTrabajador?: boolean
  alTerminar?: () => void
}) {
  const queryClient = useQueryClient()
  const [trabajadorId, setTrabajadorId] = useState(inicial)
  const [tipo, setTipo] = useState<TipoParte | ''>('')
  const [comentario, setComentario] = useState('')
  const [subida, setSubida] = useState<{ hechas: number; total: number } | null>(null)
  const [encima, setEncima] = useState(false)
  const listo = !!trabajadorId && !!tipo && !subida

  async function subir(archivos: File[]) {
    if (archivos.length === 0 || !listo) return
    const fallos: string[] = []
    setSubida({ hechas: 0, total: archivos.length })
    for (const [i, archivo] of archivos.entries()) {
      try {
        await subirDocumento(trabajadorId, tipo, comentario, archivo)
      } catch (error) {
        fallos.push(`«${archivo.name}»: ${mensajeError(error as Error)}`)
      }
      setSubida({ hechas: i + 1, total: archivos.length })
    }
    setSubida(null)
    await queryClient.invalidateQueries({ queryKey: ['bajas_documentos'] })
    const subidos = archivos.length - fallos.length
    if (subidos > 0) {
      toast.success(subidos === 1 ? 'Papel subido' : `${subidos} papeles subidos`)
      // Para que el siguiente papel no salga con el tipo del anterior por descuido
      setTipo('')
      setComentario('')
    }
    if (fallos.length > 0) toast.error(`No se ha podido subir ${fallos.join(' · ')}`, { duration: 10000 })
    else alTerminar?.()
  }

  return (
    // En el diálogo de administración el marco y el título ya los pone el diálogo
    <section className={cn('grid gap-3', !elegirTrabajador && 'rounded-lg border p-3')}>
      {!elegirTrabajador && <h2 className="font-semibold">Subir un papel</h2>}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(14rem,100%),1fr))] gap-3">
        {elegirTrabajador && <SelectorTrabajador valor={trabajadorId} onCambio={setTrabajadorId} />}
        <Campo etiqueta="Tipo de parte">
          <Selector value={tipo} onChange={(e) => setTipo(e.target.value as TipoParte | '')} disabled={!!subida}>
            <option value="">Elige el tipo…</option>
            {Object.entries(TIPOS_PARTE).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Comentario (opcional)">
          <Input value={comentario} onChange={(e) => setComentario(e.target.value)} disabled={!!subida} />
        </Campo>
      </div>
      <label
        onDragOver={(ev) => {
          ev.preventDefault()
          setEncima(true)
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(ev) => {
          ev.preventDefault()
          setEncima(false)
          subir([...ev.dataTransfer.files])
        }}
        className={cn(
          'grid cursor-pointer justify-items-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
          encima && listo && 'border-primary bg-primary/5',
          !listo && 'cursor-not-allowed opacity-70',
        )}
      >
        <FileUp className="size-6 text-muted-foreground" />
        {subida ? (
          <span className="font-medium" role="status">
            Subiendo {Math.min(subida.hechas + 1, subida.total)} de {subida.total}…
          </span>
        ) : (
          <>
            <span className="font-medium">
              {listo
                ? 'Toca para elegir el archivo o hacer la foto'
                : elegirTrabajador && !trabajadorId
                  ? 'Elige primero el trabajador y el tipo de parte'
                  : 'Elige primero el tipo de parte'}
            </span>
            <span className="text-sm text-muted-foreground">
              Foto, PDF o documento de Word, de 10 MB como mucho. Puedes elegir varios a la vez.
            </span>
          </>
        )}
        <input
          type="file"
          accept={ACEPTA}
          multiple
          className="sr-only"
          disabled={!listo}
          onChange={(ev) => {
            subir([...(ev.target.files ?? [])])
            ev.target.value = '' // para poder volver a elegir el mismo
          }}
        />
      </label>
    </section>
  )
}

function SelectorTrabajador({ valor, onCambio }: { valor: string; onCambio: (id: string) => void }) {
  const trabajadores = useTabla('trabajadores', 'nombre').lista.data ?? []
  return (
    <Campo etiqueta="Trabajador">
      <Selector value={valor} onChange={(e) => onCambio(e.target.value)}>
        <option value="">Elige el trabajador…</option>
        {/* Los inactivos solo salen si ya estaban elegidos */}
        {trabajadores
          .filter((t) => t.activo || t.id === valor)
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
      </Selector>
    </Campo>
  )
}

/** Papeles del más reciente al más antiguo. Cada uno enlaza a su archivo. */
function Historial({
  consulta,
  conTrabajador = false,
  vacio,
  puedeBorrar,
}: {
  consulta: { data: Baja[] | undefined; isPending: boolean; isError: boolean; error: Error | null }
  /** En el historial de todos, cada fila dice de quién es */
  conTrabajador?: boolean
  vacio: string
  puedeBorrar: (baja: Baja) => boolean
}) {
  const queryClient = useQueryClient()
  const [borrando, setBorrando] = useState<Baja | null>(null)
  const borrar = useMutation({
    mutationFn: borrarDocumento,
    onSuccess: () => toast.success('Borrado'),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['bajas_documentos'] }),
  })

  if (consulta.isError) return <p className="text-sm text-destructive">{mensajeError(consulta.error!)}</p>
  if (consulta.isPending || !consulta.data) return <p className="text-sm text-muted-foreground">Cargando…</p>
  if (consulta.data.length === 0) return <p className="text-sm text-muted-foreground">{vacio}</p>

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {consulta.data.map((b) => {
          const titulo = conTrabajador
            ? `${b.trabajadores?.nombre ?? '(sin nombre)'} · ${TIPOS_PARTE[b.tipo as TipoParte]}`
            : TIPOS_PARTE[b.tipo as TipoParte]
          const texto = (
            <>
              <span className="block font-medium">{titulo}</span>
              <span className="block text-sm text-muted-foreground">
                Subido el {fechaHora(b.subido_el)}
                {b.subido_por_nombre && ` por ${b.subido_por_nombre}`}
              </span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Paperclip className="size-3.5 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{b.nombre_archivo}</span>
              </span>
              {b.comentario && <span className="block text-sm">{b.comentario}</span>}
            </>
          )
          return (
            <li key={b.id} className="flex items-center gap-3 px-3 py-2">
              {b.url ? (
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 rounded-md py-1 hover:underline"
                >
                  {texto}
                </a>
              ) : (
                <div className="min-w-0 flex-1 py-1">{texto}</div>
              )}
              {puedeBorrar(b) && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Borrar"
                  disabled={borrar.isPending}
                  onClick={() => setBorrando(b)}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      <ConfirmarBorrado
        nombre={borrando && `${TIPOS_PARTE[borrando.tipo as TipoParte]} del ${fechaHora(borrando.subido_el)}`}
        detalle="Se borra el archivo. No se puede deshacer."
        onConfirmar={() => borrando && borrar.mutate(borrando)}
        onCerrar={() => setBorrando(null)}
      />
    </>
  )
}
