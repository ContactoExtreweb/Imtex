import { expect, test } from 'vitest'
import { costeKm } from './combustible'

test('coste por km igual que la herramienta de control de obra', () => {
  // Tarifas por defecto de referencia/IMTEX_control_obra.html
  expect(costeKm(1.45, 8)).toBe(0.116)
  expect(costeKm(1.45, 26)).toBe(0.377)
})
