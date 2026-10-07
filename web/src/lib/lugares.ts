// Dónde cae cada obra en el mapa (scripts/escena3d/mapa.ts y components/MapaObras.astro).
// La galería solo guarda el lugar como texto («Madrid», «Orellana (Badajoz)», «La Palma»): aquí se busca
// primero el texto entero, luego lo que va antes del paréntesis y después lo de dentro.
// Una obra en un sitio que no está en la tabla no sale en el mapa; para que salga, se añade aquí.
import mapa from './mapa-iberia.json'
import { UBICACION } from './empresa'

/** [latitud, longitud]. Capitales de provincia (y su nombre en las lenguas cooficiales), islas, Portugal y pueblos de las obras. */
const LUGARES: Record<string, [number, number]> = {
  'alava|araba|vitoria': [42.85, -2.67],
  albacete: [38.99, -1.86],
  'alicante|alacant': [38.35, -0.48],
  almeria: [36.84, -2.46],
  'asturias|oviedo': [43.36, -5.85],
  avila: [40.66, -4.7],
  badajoz: [38.88, -6.97],
  barcelona: [41.39, 2.17],
  burgos: [42.34, -3.7],
  caceres: [39.47, -6.37],
  cadiz: [36.53, -6.29],
  'cantabria|santander': [43.46, -3.8],
  'castellon|castello': [39.99, -0.05],
  'ciudad real': [38.99, -3.93],
  cordoba: [37.89, -4.78],
  'a coruna|la coruna|coruna': [43.36, -8.41],
  cuenca: [40.07, -2.13],
  'girona|gerona': [41.98, 2.82],
  granada: [37.18, -3.6],
  guadalajara: [40.63, -3.17],
  'guipuzcoa|gipuzkoa|san sebastian|donostia': [43.32, -1.98],
  huelva: [37.26, -6.94],
  huesca: [42.14, -0.41],
  'baleares|illes balears|islas baleares|mallorca|palma': [39.57, 2.65],
  menorca: [39.95, 4.0],
  'ibiza|eivissa': [38.91, 1.43],
  jaen: [37.77, -3.79],
  'la rioja|logrono': [42.47, -2.45],
  'las palmas|gran canaria': [28.12, -15.43],
  lanzarote: [29.03, -13.63],
  fuerteventura: [28.4, -14.0],
  leon: [42.6, -5.57],
  'lleida|lerida': [41.62, 0.62],
  lugo: [43.01, -7.56],
  madrid: [40.42, -3.7],
  malaga: [36.72, -4.42],
  murcia: [37.99, -1.13],
  'navarra|pamplona|iruna': [42.81, -1.64],
  'ourense|orense': [42.34, -7.86],
  palencia: [42.01, -4.53],
  pontevedra: [42.43, -8.64],
  salamanca: [40.96, -5.66],
  'santa cruz de tenerife|tenerife': [28.46, -16.25],
  'la palma': [28.68, -17.85],
  segovia: [40.95, -4.12],
  sevilla: [37.39, -5.98],
  soria: [41.76, -2.47],
  tarragona: [41.12, 1.25],
  teruel: [40.34, -1.11],
  toledo: [39.86, -4.03],
  valencia: [39.47, -0.38],
  valladolid: [41.65, -4.72],
  'vizcaya|bizkaia|bilbao': [43.26, -2.93],
  zamora: [41.5, -5.75],
  zaragoza: [41.65, -0.89],
  // Portugal
  'lisboa|lisbon': [38.72, -9.14],
  'oporto|porto': [41.15, -8.61],
  faro: [37.02, -7.93],
  coimbra: [40.2, -8.42],
  setubal: [38.52, -8.89],
  evora: [38.57, -7.91],
  braga: [41.55, -8.42],
  // Pueblos y ciudades de las obras, y alrededores de la sede
  'villanueva de la serena': [UBICACION.lat, UBICACION.lon],
  'orellana|orellana la vieja': [39.0, -5.53],
  hervas: [40.27, -5.86],
  'don benito': [38.96, -5.86],
  medellin: [38.96, -5.96],
  merida: [38.92, -6.34],
  plasencia: [40.03, -6.09],
  almaraz: [39.81, -5.67],
  'navalmoral de la mata|navalmoral': [39.89, -5.54],
  talayuela: [39.99, -5.61],
  coria: [39.98, -6.54],
  casatejada: [39.89, -5.68],
  'jerez de la frontera|jerez': [36.69, -6.13],
  linares: [38.09, -3.64],
  torrelaguna: [40.83, -3.54],
  vigo: [42.24, -8.72],
  gijon: [43.53, -5.66],
  cartagena: [37.6, -0.98],
}

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const INDICE = new Map(Object.entries(LUGARES).flatMap(([nombres, punto]) => nombres.split('|').map((n) => [n, punto] as const)))

/** Del mundo al plano del mapa: la misma proyección que scripts/generar-mapa.mjs, con Canarias en su recuadro */
export function proyectar(lat: number, lon: number): [number, number] {
  if (lon < -13 && lat < 30) {
    lat += mapa.canarias.dlat
    lon += mapa.canarias.dlon
  }
  return [+((lon - mapa.origen.lon) * mapa.cos).toFixed(3), +(lat - mapa.origen.lat).toFixed(3)]
}

/** Punto del mapa para el texto de «lugar» de una obra, o null si no se reconoce */
export function situar(lugar: string | null | undefined): [number, number] | null {
  if (!lugar) return null
  const [antes, dentro] = lugar.split('(')
  for (const intento of [lugar, antes, dentro ?? '']) {
    const punto = INDICE.get(normalizar(intento))
    if (punto) return proyectar(...punto)
  }
  return null
}

/** La sede de IMTEX en el mapa */
export const SEDE = proyectar(UBICACION.lat, UBICACION.lon)
