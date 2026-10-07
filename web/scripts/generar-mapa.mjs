// Genera web/src/lib/mapa-iberia.json: el contorno de España y Portugal para el mapa de obras.
// Se ejecuta una sola vez (el JSON va en git): `node scripts/generar-mapa.mjs` desde web/.
// Fuente: Natural Earth 1:50m (dominio público), a través de los paquetes world-atlas y topojson-client.
//
// Proyección: equirectangular con la longitud acortada por el coseno de 40°, en grados.
// Canarias va en un recuadro, como en los mapas de España: se traslada al suroeste de la península.
// Fuera quedan Azores, Madeira, Ceuta, Melilla y las islas menores del norte de África.

import { readFileSync, writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'

const ORIGEN = { lon: -3.7, lat: 40 }
const COS = Math.cos((40 * Math.PI) / 180)
const CANARIAS = { dlon: 7.2, dlat: 6.25 }
const ESPANA = '724'
const PORTUGAL = '620'

const mundo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url)))
const paises = feature(mundo, mundo.objects.countries).features.filter((f) => f.id === ESPANA || f.id === PORTUGAL)

const proyectar = ([lon, lat]) => [+((lon - ORIGEN.lon) * COS).toFixed(3), +(lat - ORIGEN.lat).toFixed(3)]
const centro = (anillo) => anillo.reduce(([a, b], [x, y]) => [a + x / anillo.length, b + y / anillo.length], [0, 0])

const peninsula = []
const canarias = []
for (const pais of paises) {
  const poligonos = pais.geometry.type === 'Polygon' ? [pais.geometry.coordinates] : pais.geometry.coordinates
  for (const [exterior] of poligonos) {
    const [lon, lat] = centro(exterior)
    if (lon < -13 && lat < 30) {
      canarias.push(exterior.map(([x, y]) => proyectar([x + CANARIAS.dlon, y + CANARIAS.dlat])))
    } else if (lat > 35.95 && lon > -10) {
      // Península y Baleares; las islas de menos de 4 puntos no se ven a esta escala
      if (exterior.length >= 4) peninsula.push(exterior.map(proyectar))
    }
  }
}

// Recuadro de Canarias, con un margen
const xs = canarias.flat().map(([x]) => x)
const ys = canarias.flat().map(([, y]) => y)
const marco = [Math.min(...xs) - 0.25, Math.min(...ys) - 0.25, Math.max(...xs) + 0.25, Math.max(...ys) + 0.25].map((v) => +v.toFixed(3))

const salida = { fuente: 'Natural Earth 1:50m', origen: ORIGEN, cos: +COS.toFixed(6), canarias: CANARIAS, peninsula, islasCanarias: canarias, marco }
writeFileSync(new URL('../src/lib/mapa-iberia.json', import.meta.url), JSON.stringify(salida))
console.log(`${peninsula.length} polígonos en la península y Baleares, ${canarias.length} en Canarias, ${peninsula.flat().length + canarias.flat().length} puntos`)
