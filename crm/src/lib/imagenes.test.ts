import { expect, test } from 'vitest'
import { aSlug } from './formato'
import { encajar, rutaMiniatura } from './imagenes'

test('encajar reduce el lado largo sin deformar y nunca amplía', () => {
  expect(encajar(4000, 3000, 2000)).toEqual({ ancho: 2000, alto: 1500 })
  expect(encajar(3000, 4000, 2000)).toEqual({ ancho: 1500, alto: 2000 }) // vertical
  expect(encajar(800, 600, 2000)).toEqual({ ancho: 800, alto: 600 }) // pequeña: se queda igual
  expect(encajar(8064, 6048, 480)).toEqual({ ancho: 480, alto: 360 })
})

test('rutaMiniatura', () => {
  expect(rutaMiniatura('obras/abc/123.jpg')).toBe('obras/abc/123_m.jpg')
})

test('aSlug: minúsculas, sin tildes y con guiones (lo que admite web_obras.slug)', () => {
  const admitido = /^[a-z0-9]+(-[a-z0-9]+)*$/ // mismo check que la base de datos
  for (const [texto, slug] of [
    ['Cubierta ajardinada Mercadona (Madrid, 2025)', 'cubierta-ajardinada-mercadona-madrid-2025'],
    ['E.T.A.P. Torrelaguna', 'e-t-a-p-torrelaguna'],
    ['  Bodegas Williams & Humbert  ', 'bodegas-williams-humbert'],
    ['Balsa PEAD 1,50 mm — Badajoz', 'balsa-pead-1-50-mm-badajoz'],
    ['Depósito Ñ', 'deposito-n'],
  ]) {
    expect(aSlug(texto)).toBe(slug)
    expect(aSlug(texto)).toMatch(admitido)
  }
  expect(aSlug('¡¿?!')).toBe('') // nada aprovechable: quien llama decide qué poner
})
