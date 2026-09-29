import { expect, test } from 'vitest'
import { coincide, euros, fecha, leerNumero, numeroATexto } from './formato'

// Intl separa importe y símbolo con un espacio duro; lo normalizamos para comparar.
const texto = (s: string) => s.replace(/\s/g, ' ')

test('euros en formato es-ES con separador de miles', () => {
  expect(texto(euros(1234.56))).toBe('1.234,56 €')
  expect(texto(euros(1485000))).toBe('1.485.000,00 €')
  expect(texto(euros(0.5))).toBe('0,50 €')
})

test('fecha dd/mm/aaaa sin desfase de zona horaria', () => {
  expect(fecha('2026-09-29')).toBe('29/09/2026')
  expect(fecha('2026-01-01')).toBe('01/01/2026')
})

test('leerNumero acepta coma o punto decimal y miles con punto', () => {
  expect(leerNumero('1.234,56')).toBe(1234.56)
  expect(leerNumero('18,5')).toBe(18.5)
  expect(leerNumero('18.5')).toBe(18.5)
  expect(leerNumero(' 1 485 000 ')).toBe(1485000)
  expect(leerNumero('')).toBeNull()
  expect(leerNumero('abc')).toBeNull()
})

test('coincide ignora tildes y mayúsculas', () => {
  expect(coincide('merida', 'Mérida', null)).toBe(true)
  expect(coincide('', 'lo que sea')).toBe(true)
  expect(coincide('badajoz', 'Cáceres', undefined)).toBe(false)
})

test('numeroATexto y leerNumero son inversos', () => {
  expect(numeroATexto(18.5)).toBe('18,5')
  expect(numeroATexto(null)).toBe('')
  expect(leerNumero(numeroATexto(1234.5678))).toBe(1234.5678)
})
