import { expect, test } from 'vitest'
import { todasLasFilas } from './todas-las-filas'

/** Imita a la API: una tabla de `total` filas que nunca da más de `tope` por petición. */
function api(total: number, tope: number, conCount: boolean) {
  const peticiones: [number, number][] = []
  const pagina = async (desde: number, hasta: number) => {
    peticiones.push([desde, hasta])
    const fin = Math.min(hasta + 1, desde + tope, total)
    const data = Array.from({ length: Math.max(0, fin - desde) }, (_, i) => desde + i)
    return { data, error: null, count: conCount ? total : null }
  }
  return { pagina, peticiones }
}

test('junta todas las páginas cuando hay más de 1.000 filas', async () => {
  const { pagina, peticiones } = api(2600, 1000, true)
  const filas = await todasLasFilas(pagina)
  expect(filas).toHaveLength(2600)
  expect(filas[2599]).toBe(2599)
  expect(new Set(filas).size).toBe(2600) // sin repetidas ni huecos
  expect(peticiones).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
})

test('con pocas filas hace una sola petición', async () => {
  const { pagina, peticiones } = api(7, 1000, true)
  expect(await todasLasFilas(pagina)).toHaveLength(7)
  expect(peticiones).toHaveLength(1)
})

test('sin count, o con un tope de servidor menor, tampoco se deja filas', async () => {
  expect(await todasLasFilas(api(2600, 1000, false).pagina)).toHaveLength(2600)
  expect(await todasLasFilas(api(1200, 500, true).pagina)).toHaveLength(1200)
  expect(await todasLasFilas(api(0, 1000, true).pagina)).toEqual([])
})

test('propaga el error de la API', async () => {
  const fallo = { message: 'permiso denegado' }
  await expect(todasLasFilas(async () => ({ data: null, error: fallo }))).rejects.toBe(fallo)
})
