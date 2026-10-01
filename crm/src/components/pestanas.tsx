import type { ReactNode } from 'react'

/** Barra de pestañas. Si no caben (móvil), se desliza en horizontal. */
export function Pestanas<T extends string>({
  pestanas,
  activa,
  onCambio,
  extra,
}: {
  pestanas: { id: T; texto: string }[]
  activa: T
  onCambio: (id: T) => void
  /** Algo a la derecha de las pestañas (un total, por ejemplo) */
  extra?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-b">
      <div role="tablist" className="-mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {pestanas.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={activa === p.id}
            className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground aria-selected:border-marca aria-selected:text-foreground"
            onClick={() => onCambio(p.id)}
          >
            {p.texto}
          </button>
        ))}
      </div>
      {extra}
    </div>
  )
}
