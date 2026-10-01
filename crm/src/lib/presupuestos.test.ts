import { expect, test } from 'vitest'
import { codigoPartida, errorPartida, siguienteCodigo } from './presupuestos'

test('siguienteCodigo propone el siguiente número libre del año', () => {
  expect(siguienteCodigo([], 2026)).toBe('P.2026-001')
  expect(siguienteCodigo(['P.2026-001', 'P.2026-007', 'P.2025-040', 'OTRO'], 2026)).toBe('P.2026-008')
  expect(siguienteCodigo(['P.2026-abc'], 2026)).toBe('P.2026-001')
})

test('codigoPartida numera con tres cifras', () => {
  expect(codigoPartida(3)).toBe('P.003')
  expect(codigoPartida(12, 'T')).toBe('T.012')
})

test('errorPartida avisa de medición 0 y de precios libres sin descripción', () => {
  const base = { clave: 'x', codigo: 'P.001', titulo: '', medicion: '', gg_pct: 16, ben_pct: 35 }
  const libre = { precio_id: null, codigo: null, unidad: 'ud', coste_unitario: 1, rendimiento: 1 }
  expect(errorPartida({ ...base, cantidad: 1, lineas: [] })).toBeNull()
  expect(errorPartida({ ...base, cantidad: 0, lineas: [] })).toContain('mayor que 0')
  expect(errorPartida({ ...base, cantidad: 1, lineas: [{ ...libre, descripcion: ' ' }] })).toContain('sin descripción')
  expect(errorPartida({ ...base, cantidad: 1, lineas: [{ ...libre, descripcion: 'Tasas' }] })).toBeNull()
})
