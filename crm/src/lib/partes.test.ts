import { describe, expect, it } from 'vitest'
import {
  aBase64,
  aColumnas,
  extraerLectura,
  faltaParaApuntar,
  firmaValida,
  mensajesDelAviso,
  normalizarTelefono,
  peticionLectura,
  resumen,
  telefonoATexto,
  type Lectura,
} from '../../../supabase/functions/_shared/partes.ts'

const OBRAS = [
  { id: 'o-merc', codigo: 'OB-2026-14', nombre: 'Mercadona Arapiles', cliente: 'Mercadona', localidad: 'Madrid' },
  { id: 'o-otra', codigo: 'OB-2026-11', nombre: 'Depósito', cliente: 'Ayto. Mérida', localidad: 'Mérida' },
]
const TRABAJADORES = [
  { id: 't-isi', nombre: 'Isidoro Sánchez' },
  { id: 't-dav', nombre: 'David Gil' },
  { id: 't-emi', nombre: 'Emilio Pérez' },
]
const HOY = '2026-10-06'

// El primer parte real (06/10/2026), tal como lo devolvería la IA
const MERCADONA: Lectura = {
  es_parte: true,
  codigo_obra: null,
  cliente: 'Mercadona',
  obra: 'Mercadona',
  localidad: 'Madrid Arapiles',
  obra_id: 'o-merc',
  fecha: '2026-07-01',
  trabajadores: [
    { nombre: 'Isidoro', trabajador_id: 't-isi', horas_ord: 4, horas_ext: 0 },
    { nombre: 'David Gil', trabajador_id: 't-dav', horas_ord: 4, horas_ext: 0 },
    { nombre: 'Emilio', trabajador_id: 't-emi', horas_ord: 4, horas_ext: 0 },
  ],
  vehiculo: 'Trafic 3 plazas',
  tipo_vehiculo: 'furgon',
  km_salida: null,
  km_llegada: null,
  salida_nave: '15:30',
  llegada_obra: '16:00',
  salida_obra: null,
  llegada_nave: null,
  trabajos: 'Imper cuarto contenedores y cuarto limpieza',
  material_retirado: '1 lata Emufal Primer\n6 Rollos Morterplas 4Kg FP\n6 Rollos Morterplas 4Kg FP Min Gris',
  material_utilizado: '1/2 lata Emufal Primer\n4 Rollos Morterplas 4Kg FP\n3 Rollos Morterplas 4Kg FP Min Gris',
  material_devuelto: '1/2 lata Emufal Primer\n2 Rollos Morterplas 4Kg FP\n3 Rollos Morterplas 4Kg FP Min Gris',
  instrucciones_calidad: null,
  medio_ambiente: null,
  mediciones: 'Cuarto contenedores: suelo 4,4 × 2,7; paredes 16,70 × 2,65\nCuarto limpieza: suelo 6,40 × 2,80; paredes 9 m² pizarrilla',
  dudas: ['No estoy seguro de las horas de salida (15:30 / 16:00).'],
}

const respuestaApi = (input: Record<string, unknown>) => ({
  content: [{ type: 'tool_use', name: 'parte', input }],
})

describe('normalizarTelefono', () => {
  it('deja los números como los da WhatsApp: cifras y prefijo', () => {
    expect(normalizarTelefono('600 11 22 33')).toBe('34600112233')
    expect(normalizarTelefono('+34 600-11-22-33')).toBe('34600112233')
    expect(normalizarTelefono('0034 600112233')).toBe('34600112233')
    expect(normalizarTelefono('924 84 12 46')).toBe('34924841246')
    expect(normalizarTelefono('+49 151 1234 5678')).toBe('4915112345678')
  })
  it('rechaza lo que no es un teléfono', () => {
    expect(normalizarTelefono('')).toBeNull()
    expect(normalizarTelefono('12345')).toBeNull()
    expect(normalizarTelefono('teléfono')).toBeNull()
  })
  it('se escribe con espacios para leerlo', () => {
    expect(telefonoATexto('34600112233')).toBe('+34 600 11 22 33')
    expect(telefonoATexto('4915112345678')).toBe('+4915112345678')
  })
})

describe('extraerLectura', () => {
  it('comprueba cada campo de lo que devuelve la IA', () => {
    const l = extraerLectura(
      respuestaApi({
        fecha: '2026-02-30',
        trabajadores: [{ nombre: ' Ana ', trabajador_id: '', horas_ord: '7,5', horas_ext: -1 }, 'basura'],
        salida_nave: '7:05',
        llegada_obra: '25:00',
        tipo_vehiculo: 'coche',
        km_salida: '12310',
        dudas: ['', 'La fecha no se lee'],
      }),
    )
    expect(l.es_parte).toBe(true)
    expect(l.fecha).toBeNull() // 30 de febrero no existe
    expect(l.trabajadores).toEqual([{ nombre: 'Ana', trabajador_id: null, horas_ord: 7.5, horas_ext: 0 }])
    expect(l.salida_nave).toBe('07:05')
    expect(l.llegada_obra).toBeNull()
    expect(l.tipo_vehiculo).toBeNull()
    expect(l.km_salida).toBe(12310)
    expect(l.dudas).toEqual(['La fecha no se lee'])
  })
  it('sin la herramienta en la respuesta, error', () => {
    expect(() => extraerLectura({ content: [{ type: 'text', text: 'hola' }] })).toThrow()
    expect(() => extraerLectura(null)).toThrow()
  })
})

describe('aColumnas', () => {
  it('el parte de Mercadona: sin código de obra, la IA la casa por cliente y localidad', () => {
    const c = aColumnas(MERCADONA, OBRAS, TRABAJADORES, HOY)
    expect(c.obra_id).toBe('o-merc')
    expect(c.lineas.map((l) => l.trabajador_id)).toEqual(['t-isi', 't-dav', 't-emi'])
    expect(c.mediciones).toContain('pizarrilla')
    expect(c.avisos).toEqual(MERCADONA.dudas)
    expect(faltaParaApuntar(c)).toEqual([])
  })
  it('no acepta ids que no estén en las listas', () => {
    const c = aColumnas(
      { ...MERCADONA, obra_id: 'inventada', trabajadores: [{ nombre: 'Manolo', trabajador_id: 'x', horas_ord: 8, horas_ext: 0 }] },
      OBRAS,
      TRABAJADORES,
      HOY,
    )
    expect(c.obra_id).toBeNull()
    expect(c.lineas[0].trabajador_id).toBeNull()
    expect(c.avisos).toContain('No reconozco la obra (pone «Mercadona · Madrid Arapiles»).')
    expect(c.avisos).toContain('No sé quién es «Manolo».')
    expect(faltaParaApuntar(c)).toEqual(['la obra', 'quién es «Manolo»'])
  })
  it('casa la obra por el código aunque lo escriban distinto', () => {
    const c = aColumnas({ ...MERCADONA, obra_id: null, codigo_obra: 'ob 2026/14' }, OBRAS, TRABAJADORES, HOY)
    expect(c.obra_id).toBe('o-merc')
  })
  it('avisa de lo que no cuadra', () => {
    const c = aColumnas(
      {
        ...MERCADONA,
        fecha: '2026-10-07',
        trabajadores: [
          { nombre: 'Isidoro', trabajador_id: 't-isi', horas_ord: 10, horas_ext: 8 },
          { nombre: 'Isi', trabajador_id: 't-isi', horas_ord: 0, horas_ext: 0 },
        ],
        km_salida: 200,
        km_llegada: 100,
      },
      OBRAS,
      TRABAJADORES,
      HOY,
    )
    expect(c.avisos).toEqual(
      expect.arrayContaining([
        'La fecha (07/10/2026) es posterior a hoy.',
        'Revisa las horas de Isidoro Sánchez: salen 18.',
        'Faltan las horas de Isidoro Sánchez.',
        'Isidoro Sánchez sale dos veces.',
        'Los km de llegada tienen que ser más que los de salida.',
      ]),
    )
  })
  it('con km y sin tipo de vehículo, furgoneta', () => {
    const c = aColumnas({ ...MERCADONA, tipo_vehiculo: null, km_salida: 100, km_llegada: 184 }, OBRAS, TRABAJADORES, HOY)
    expect(c.tipo_vehiculo).toBe('furgon')
  })
})

describe('resumen', () => {
  it('lo que se manda para confirmar', () => {
    const texto = resumen(aColumnas(MERCADONA, OBRAS, TRABAJADORES, HOY), OBRAS, TRABAJADORES)
    expect(texto).toContain('*Parte del 01/07/2026*')
    expect(texto).toContain('OB-2026-14 · Mercadona Arapiles (Madrid)')
    expect(texto).toContain('• David Gil: 4 h')
    expect(texto).toContain('🚐 Trafic 3 plazas: km incompletos')
    expect(texto).toContain('ida 15:30–16:00')
    expect(texto).toContain('⚠️ No estoy seguro de las horas de salida')
    expect(texto.endsWith('¿Está bien?')).toBe(true)
  })
  it('las extras y los nombres sin casar', () => {
    const c = aColumnas(
      { ...MERCADONA, trabajadores: [{ nombre: 'Manolo', trabajador_id: null, horas_ord: 8, horas_ext: 1.5 }] },
      OBRAS,
      TRABAJADORES,
      HOY,
    )
    expect(resumen(c, OBRAS, TRABAJADORES)).toContain('• ❓ «Manolo»: 8 h + 1,5 h extra')
  })
  it('cabe en un mensaje con botones (1.024 caracteres)', () => {
    const largo = 'x'.repeat(3000)
    const c = aColumnas({ ...MERCADONA, trabajos: largo, material_utilizado: largo, dudas: [largo] }, OBRAS, TRABAJADORES, HOY)
    expect(resumen(c, OBRAS, TRABAJADORES).length).toBeLessThanOrEqual(1024)
  })
})

describe('peticionLectura', () => {
  const base = { modelo: 'm', imagen: { base64: 'AAA', tipo: 'image/jpeg' }, obras: OBRAS, trabajadores: TRABAJADORES, hoy: HOY }
  it('obliga a contestar con la herramienta y le da las listas', () => {
    const p = peticionLectura(base)
    expect(p.tool_choice).toEqual({ type: 'tool', name: 'parte' })
    expect(p.system).toContain('o-merc | OB-2026-14 | Mercadona Arapiles | Mercadona | Madrid')
    expect(p.system).toContain('t-dav | David Gil')
    expect(p.system).toContain('Hoy es 2026-10-06')
  })
  it('una corrección lleva la lectura anterior y lo que dice quien la mandó', () => {
    const texto = peticionLectura({ ...base, anterior: MERCADONA, correccion: 'Emilio hizo 5 horas' }).messages[0].content[1]
    expect(texto).toMatchObject({ type: 'text' })
    expect(JSON.stringify(texto)).toContain('Emilio hizo 5 horas')
    expect(JSON.stringify(texto)).toContain('Morterplas')
  })
})

describe('mensajesDelAviso', () => {
  const aviso = (mensajes: unknown[]) => ({ entry: [{ changes: [{ value: { messages: mensajes } }] }] })
  const UUID = '0b6f1b8e-4c1d-4a8e-9f3a-2a8b9c0d1e2f'

  it('foto, documento con foto, texto y botón', () => {
    const m = mensajesDelAviso(
      aviso([
        { id: '1', from: '34600112233', type: 'image', image: { id: 'img1', mime_type: 'image/jpeg' } },
        { id: '2', from: '34600112233', type: 'document', document: { id: 'doc1', mime_type: 'image/png' } },
        { id: '3', from: '34600112233', type: 'text', text: { body: ' Pedro 9 horas ' }, context: { id: 'wamid.X' } },
        { id: '4', from: '34600112233', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: `confirmar:${UUID}` } } },
      ]),
    )
    expect(m).toEqual([
      { id: '1', de: '34600112233', respondeA: null, tipo: 'imagen', imagenId: 'img1', mime: 'image/jpeg' },
      { id: '2', de: '34600112233', respondeA: null, tipo: 'imagen', imagenId: 'doc1', mime: 'image/png' },
      { id: '3', de: '34600112233', respondeA: 'wamid.X', tipo: 'texto', texto: 'Pedro 9 horas' },
      { id: '4', de: '34600112233', respondeA: null, tipo: 'boton', accion: 'confirmar', parteId: UUID },
    ])
  })
  it('lo demás es «otro», y los avisos de entrega no traen mensajes', () => {
    const m = mensajesDelAviso(
      aviso([
        { id: '5', from: '34600112233', type: 'audio', audio: { id: 'a' } },
        { id: '6', from: '34600112233', type: 'document', document: { id: 'd', mime_type: 'application/pdf' } },
        { id: '7', from: '34600112233', type: 'interactive', interactive: { button_reply: { id: 'borrar:todo' } } },
      ]),
    )
    expect(m.map((x) => x.tipo)).toEqual(['otro', 'otro', 'otro'])
    expect(mensajesDelAviso({ entry: [{ changes: [{ value: { statuses: [{ id: 'x' }] } }] }] })).toEqual([])
    expect(mensajesDelAviso('basura')).toEqual([])
  })
})

describe('firmaValida', () => {
  const firmar = async (cuerpo: string, secreto: string) => {
    const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const firma = new Uint8Array(await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(cuerpo)))
    return 'sha256=' + [...firma].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  const cuerpo = '{"entry":[{"changes":[]}],"texto":"canción"}'

  it('acepta la firma de Meta con nuestro secreto', async () => {
    expect(await firmaValida(cuerpo, await firmar(cuerpo, 'secreto'), 'secreto')).toBe(true)
  })
  it('rechaza otro secreto, otro cuerpo, sin firma o sin secreto', async () => {
    const firma = await firmar(cuerpo, 'secreto')
    expect(await firmaValida(cuerpo, firma, 'otro')).toBe(false)
    expect(await firmaValida(cuerpo + ' ', firma, 'secreto')).toBe(false)
    expect(await firmaValida(cuerpo, null, 'secreto')).toBe(false)
    expect(await firmaValida(cuerpo, 'sha256=zz', 'secreto')).toBe(false)
    expect(await firmaValida(cuerpo, firma, undefined)).toBe(false)
  })
})

it('aBase64 vale para una foto entera', () => {
  const bytes = new Uint8Array(200_000).map((_, i) => (i * 7) % 256)
  expect(aBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'))
})
