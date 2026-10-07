// Imagen para compartir la web (og:image): la plantilla imagen-compartir.html, fotografiada con Chrome sin ventana
// y pasada a JPEG en public/compartir.jpg (1200 × 630 y poco peso: WhatsApp no enseña las que pasan de unos 300 KB).
// Se repite si cambian la marca o la foto. Desde web/:  node scripts/imagen-compartir.mjs
// Usa el Chrome o el Edge instalados; si no los encuentra, se le indica con la variable CHROME.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const { default: sharp } = await import('sharp')
const AQUI = path.dirname(fileURLToPath(import.meta.url))
const SALIDA = path.join(AQUI, '../public/compartir.jpg')

const chrome = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/opt/pw-browsers/chromium',
].find((ruta) => ruta && existsSync(ruta))
if (!chrome) throw new Error('No encuentro Chrome. Indícalo así: CHROME="/ruta/a/chrome" node scripts/imagen-compartir.mjs')

const temporal = mkdtempSync(path.join(tmpdir(), 'compartir-'))
const captura = path.join(temporal, 'captura.png')
// La ventana es más alta que la imagen: Chrome sin ventana le quita algo de alto a la página. Luego se recorta.
execFileSync(
  chrome,
  [
    '--headless=new',
    ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,900',
    '--virtual-time-budget=3000',
    `--screenshot=${captura}`,
    pathToFileURL(path.join(AQUI, 'imagen-compartir.html')).href,
  ],
  { stdio: 'ignore' },
)
await sharp(captura).extract({ left: 0, top: 0, width: 1200, height: 630 }).jpeg({ quality: 84, mozjpeg: true }).toFile(SALIDA)
rmSync(temporal, { recursive: true })
console.log(`public/compartir.jpg: ${Math.round(statSync(SALIDA).size / 1024)} KB`)
