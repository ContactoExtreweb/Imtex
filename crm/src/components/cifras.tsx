import type { ReactNode } from 'react'
import { Link } from 'react-router'

export interface Cifra {
  etiqueta: string
  /** Sin valor (cargando) se muestra un guion */
  valor?: ReactNode
  /** Línea pequeña bajo la cifra (por ejemplo, el dato del mes anterior) */
  nota?: string | null
  /** Clase de color del valor (resultado, margen…) */
  color?: string
  /** Si se indica, la cifra enlaza a ese apartado */
  a?: string | null
}

/**
 * Cifras con su etiqueta (portada, resumen de la obra). Un importe largo no puede salirse de su caja:
 * - En el móvil cada cifra es una fila: etiqueta a la izquierda (se parte en líneas si hace falta)
 *   y valor a la derecha.
 * - Desde `sm` son celdas de al menos 11rem, y el valor ajusta su tamaño al ancho de la celda
 *   (10cqi: caben 18 caracteres, hasta «110.485.000,00 €» y más; medido con Geist a 0,53em por carácter).
 */
export function Cifras({ cifras }: { cifras: Cifra[] }) {
  return (
    <ul className="divide-y rounded-lg border bg-background sm:grid sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] sm:divide-y-0 sm:rounded-none sm:border-0 sm:border-t sm:border-l">
      {cifras.map((c) => {
        const contenido = (
          <>
            <span className="min-w-0 flex-1 text-sm text-muted-foreground sm:order-2 sm:flex-none">{c.etiqueta}</span>
            <span
              className={`shrink-0 text-base font-semibold whitespace-nowrap tabular-nums sm:order-1 sm:text-[clamp(0.875rem,10cqi,1.5rem)] ${c.color ?? ''}`}
            >
              {c.valor ?? '–'}
            </span>
            {c.nota && (
              <span className="basis-full text-right text-xs text-muted-foreground tabular-nums sm:order-3 sm:basis-auto sm:text-left">
                {c.nota}
              </span>
            )}
          </>
        )
        // @container: el tamaño del valor depende del ancho de su propia celda
        const clases =
          '@container flex h-full flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2.5 sm:flex-col sm:flex-nowrap sm:items-stretch sm:gap-y-0.5 sm:p-4'
        return (
          <li key={c.etiqueta} className="sm:border-r sm:border-b">
            {c.a ? (
              <Link to={c.a} className={`${clases} hover:bg-muted`}>
                {contenido}
              </Link>
            ) : (
              <div className={clases}>{contenido}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
