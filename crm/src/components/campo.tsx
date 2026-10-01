import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Etiqueta + control + error. El <label> envolvente asocia la etiqueta sin ids. */
export function Campo({
  etiqueta,
  error,
  className,
  children,
}: {
  etiqueta: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={cn('grid gap-1.5 text-sm', className)}>
      <span className="font-medium">{etiqueta}</span>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  )
}

/** Desplegable nativo: en el móvil abre el selector del sistema. */
export function Selector({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-10 w-full md:h-8 rounded-lg border border-input bg-transparent px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export function Casilla({ etiqueta, ...props }: ComponentProps<'input'> & { etiqueta: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-primary" {...props} />
      {etiqueta}
    </label>
  )
}
