import { Plus, Trash2 } from 'lucide-react'
import type { FormEventHandler, ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

// Patrón de las pantallas de listado: una lista (sirve igual en móvil y escritorio),
// buscador, alta y edición en un diálogo, y borrado con confirmación.

export function PaginaListado({
  titulo,
  busqueda,
  onBuscar,
  onNuevo,
  filtros,
  cargando,
  vacio,
  children,
}: {
  titulo: string
  busqueda: string
  onBuscar: (texto: string) => void
  /** Sin permiso de edición no se pasa y no sale el botón */
  onNuevo?: () => void
  /** Controles extra junto al buscador (por ejemplo, un desplegable) */
  filtros?: ReactNode
  cargando: boolean
  vacio: boolean
  children: ReactNode
}) {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 p-4">
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">{titulo}</h1>
        {onNuevo && (
          <Button onClick={onNuevo}>
            <Plus /> Nuevo
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          type="search"
          placeholder="Buscar…"
          aria-label="Buscar"
          className="min-w-40 flex-1"
          value={busqueda}
          onChange={(e) => onBuscar(e.target.value)}
        />
        {filtros}
      </div>
      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : vacio ? (
        <p className="text-sm text-muted-foreground">No hay nada que mostrar.</p>
      ) : (
        <ul className="divide-y rounded-lg border">{children}</ul>
      )}
    </div>
  )
}

export function FilaListado({
  antes,
  titulo,
  detalle,
  extra,
  onAbrir,
  onBorrar,
}: {
  /** Algo delante del texto (por ejemplo, una miniatura) */
  antes?: ReactNode
  titulo: ReactNode
  detalle?: ReactNode
  extra?: ReactNode
  onAbrir: () => void
  onBorrar?: () => void
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      {antes}
      <button type="button" className="min-w-0 flex-1 py-1 text-left" onClick={onAbrir}>
        {/* En el móvil no se corta: el título ocupa hasta dos líneas y el detalle (importes, fechas) las que necesite */}
        <p className="font-medium max-sm:line-clamp-2 sm:truncate">{titulo}</p>
        {detalle && <p className="text-sm text-muted-foreground sm:truncate">{detalle}</p>}
      </button>
      {extra}
      {onBorrar && (
        <Button variant="ghost" size="icon" aria-label="Borrar" onClick={onBorrar}>
          <Trash2 />
        </Button>
      )}
    </li>
  )
}

/** Formulario en diálogo. En solo lectura se ven los datos pero no se pueden cambiar. */
export function DialogoFormulario({
  titulo,
  soloLectura,
  guardando,
  acciones,
  onSubmit,
  onCerrar,
  children,
}: {
  titulo: string
  soloLectura: boolean
  guardando: boolean
  /** Botones o enlaces extra en el pie, fuera del formulario (se ven también en solo lectura) */
  acciones?: ReactNode
  onSubmit: FormEventHandler<HTMLFormElement>
  onCerrar: () => void
  children: ReactNode
}) {
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <fieldset disabled={soloLectura || guardando} className="grid gap-3">
            {children}
          </fieldset>
          {(acciones || !soloLectura) && (
            <DialogFooter className={acciones ? 'sm:justify-between' : undefined}>
              {acciones && <div>{acciones}</div>}
              {!soloLectura && (
                <Button type="submit" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </Button>
              )}
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Pregunta antes de hacer algo que conviene pensar dos veces. */
export function Confirmar({
  titulo,
  detalle,
  accion,
  destructiva = false,
  onConfirmar,
  onCerrar,
}: {
  /** null = cerrado */
  titulo: string | null
  detalle: string
  /** Texto del botón que confirma */
  accion: string
  destructiva?: boolean
  onConfirmar: () => void
  onCerrar: () => void
}) {
  return (
    <AlertDialog open={titulo !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{detalle}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant={destructiva ? 'destructive' : 'default'} onClick={onConfirmar}>
            {accion}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ConfirmarBorrado({
  nombre,
  detalle = 'No se puede deshacer.',
  onConfirmar,
  onCerrar,
}: {
  /** null = cerrado */
  nombre: string | null
  /** Qué más se borra con ello, si hace falta avisarlo */
  detalle?: string
  onConfirmar: () => void
  onCerrar: () => void
}) {
  return (
    <Confirmar
      titulo={nombre === null ? null : `¿Borrar «${nombre}»?`}
      detalle={detalle}
      accion="Borrar"
      destructiva
      onConfirmar={onConfirmar}
      onCerrar={onCerrar}
    />
  )
}
