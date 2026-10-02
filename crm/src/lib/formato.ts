// es-ES no agrupa miles en números de 4 cifras (1234,56 €) salvo con useGrouping: 'always'.
const formatoEuros = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: 'always',
})

const formatoFecha = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

/** 1234.56 → «1.234,56 €» */
export const euros = (valor: number) => formatoEuros.format(valor)

/** «2026-09-29» (columna date de Postgres) → «29/09/2026» */
export const fecha = (iso: string) => formatoFecha.format(new Date(iso))

const formatoFechaHora = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Instante (columna timestamptz) → «02/10/2026, 09:35», en la hora de quien mira */
export const fechaHora = (iso: string) => formatoFechaHora.format(new Date(iso))

/**
 * Lee lo que se escribe en un campo numérico: «1.234,56», «18,5» o «18.5».
 * Si hay coma, es el decimal y los puntos son de miles; si no, el punto es el decimal.
 * Devuelve null si está vacío o no es un número.
 */
export function leerNumero(texto: string): number | null {
  const t = texto.replace(/\s/g, '')
  if (t === '') return null
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
  return Number.isFinite(n) ? n : null
}

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Búsqueda sin tildes ni mayúsculas en cualquiera de los valores. */
export const coincide = (busqueda: string, ...valores: (string | null | undefined)[]) =>
  valores.some((v) => v && normalizar(v).includes(normalizar(busqueda.trim())))

/** «E.T.A.P. Torrelaguna» → «e-t-a-p-torrelaguna»: para direcciones de la web. */
export const aSlug = (texto: string) =>
  normalizar(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Primer slug sin usar: «obra», y si ya existe, «obra-2», «obra-3»… */
export function slugLibre(base: string, ocupados: Iterable<string>): string {
  const usados = new Set(ocupados)
  let slug = base
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`
  return slug
}

/** Valor para un campo de formulario: 18.5 → «18,5» */
export const numeroATexto = (n: number | null | undefined) =>
  n == null ? '' : String(n).replace('.', ',')

const formatoPct = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 16.234 → «16,2 %» */
export const pct = (valor: number) => `${formatoPct.format(valor)} %`
