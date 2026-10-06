// Partes de trabajo en papel: lo que no depende de Deno ni del navegador. Lo usan las Edge Functions
// `whatsapp` y `leer-parte` y el CRM, y se prueba con Vitest (crm/src/lib/partes.test.ts).
// La tabla es public.partes_trabajo (migración partes_trabajo).

/** Una fila de la hoja: un trabajador con sus horas. `nombre` es lo que pone, tal cual. */
// type y no interface: así cabe en una columna jsonb (los tipos de Supabase piden firma de índice)
export type Linea = {
  nombre: string
  trabajador_id: string | null
  horas_ord: number
  horas_ext: number
}

/** Una fila tal como se lee: horas_ord null si la casilla HORAS está vacía (= la jornada de su contrato). */
export type LineaLeida = Omit<Linea, 'horas_ord'> & { horas_ord: number | null }

/** Lo que devuelve la IA al leer una hoja (con la forma de ESQUEMA). */
export interface Lectura {
  es_parte: boolean
  codigo_obra: string | null
  cliente: string | null
  obra: string | null
  localidad: string | null
  obra_id: string | null
  fecha: string | null
  trabajadores: LineaLeida[]
  vehiculo: string | null
  tipo_vehiculo: 'furgon' | 'camion' | null
  km_salida: number | null
  km_llegada: number | null
  salida_nave: string | null
  llegada_obra: string | null
  salida_obra: string | null
  llegada_nave: string | null
  trabajos: string | null
  material_retirado: string | null
  material_utilizado: string | null
  material_devuelto: string | null
  instrucciones_calidad: string | null
  medio_ambiente: string | null
  mediciones: string | null
  dudas: string[]
}

export interface ObraContexto {
  id: string
  codigo: string
  nombre: string
  cliente: string | null
  localidad: string | null
}
export interface TrabajadorContexto {
  id: string
  nombre: string
  /** Horas al día de su contrato: lo que vale una casilla HORAS vacía */
  jornada_horas: number
}

/** Las columnas de partes_trabajo que salen de una lectura. */
export interface ColumnasParte {
  obra_id: string | null
  fecha: string | null
  lineas: Linea[]
  vehiculo: string | null
  tipo_vehiculo: 'furgon' | 'camion' | null
  km_salida: number | null
  km_llegada: number | null
  salida_nave: string | null
  llegada_obra: string | null
  salida_obra: string | null
  llegada_nave: string | null
  trabajos: string | null
  material_retirado: string | null
  material_utilizado: string | null
  material_devuelto: string | null
  instrucciones_calidad: string | null
  medio_ambiente: string | null
  mediciones: string | null
  lectura: Lectura
  avisos: string[]
}

/** Las mismas cotas que apuntar_parte en SQL: más es una mala lectura. */
export const MAX_HORAS_DIA = 16
export const MAX_KM_DIA = 1500
/** La jornada que se supone si no se sabe quién es (la misma que pone la base de datos por defecto) */
export const JORNADA_POR_DEFECTO = 8

// Teléfonos -------------------------------------------------------------------------------------

/**
 * Teléfono como lo da WhatsApp: solo cifras y con el prefijo del país (34600112233).
 * Un móvil o fijo español de 9 cifras se queda con el 34 delante. null si no parece un teléfono.
 */
export function normalizarTelefono(texto: string): string | null {
  let cifras = texto.replace(/\D/g, '')
  if (cifras.startsWith('00')) cifras = cifras.slice(2)
  if (/^[6-9]\d{8}$/.test(cifras)) cifras = '34' + cifras
  return /^[1-9]\d{7,14}$/.test(cifras) ? cifras : null
}

/** 34600112233 → «+34 600 11 22 33»; los de fuera, «+cifras». */
export function telefonoATexto(telefono: string): string {
  const es = /^34(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(telefono)
  return es ? `+34 ${es[1]} ${es[2]} ${es[3]} ${es[4]}` : `+${telefono}`
}

// Lectura con la IA -----------------------------------------------------------------------------

const texto = { type: ['string', 'null'] }
const numero = { type: ['number', 'null'] }
const hora = { type: ['string', 'null'], description: 'HH:MM, 24 h' }

/**
 * Forma exacta de la respuesta: la API la impone con salida estructurada (output_config.format), así que
 * el JSON siempre trae estos campos. Sonnet 5.5 no admite forzar una herramienta (tool_choice da error 400).
 */
export const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    es_parte: { type: 'boolean', description: 'false si la imagen no es un parte de trabajo de IMTEX' },
    codigo_obra: { ...texto, description: 'CÓDIGO OBRA, tal cual' },
    cliente: texto,
    obra: { ...texto, description: 'OBRA, tal cual' },
    localidad: texto,
    obra_id: { ...texto, description: 'id de la obra de la lista que corresponde; null si no estás seguro' },
    fecha: { ...texto, description: 'AAAA-MM-DD' },
    trabajadores: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nombre: { type: 'string', description: 'lo que pone, tal cual' },
          trabajador_id: { ...texto, description: 'id del trabajador de la lista; null si no estás seguro' },
          horas_ord: { type: ['number', 'null'], description: 'columna HORAS; null si la casilla está vacía' },
          horas_ext: { type: 'number', description: 'columna EXTRAS (0 si está vacía)' },
        },
        required: ['nombre', 'trabajador_id', 'horas_ord', 'horas_ext'],
      },
    },
    vehiculo: texto,
    tipo_vehiculo: { type: ['string', 'null'], enum: ['furgon', 'camion', null] },
    km_salida: numero,
    km_llegada: numero,
    salida_nave: hora,
    llegada_obra: hora,
    salida_obra: hora,
    llegada_nave: hora,
    trabajos: { ...texto, description: 'TRABAJOS REALIZADOS (FASE DE LA OBRA)' },
    material_retirado: { ...texto, description: 'MATERIAL RETIRADO ALMACÉN, una línea por material' },
    material_utilizado: { ...texto, description: 'MATERIAL UTILIZADO EN OBRA, una línea por material' },
    material_devuelto: { ...texto, description: 'MATERIAL DEVUELTO A ALMACÉN, una línea por material' },
    instrucciones_calidad: { ...texto, description: 'INSTRUCCIONES TÉCNICAS, CONTROL DE CALIDAD (ISO 9001)' },
    medio_ambiente: { ...texto, description: 'ASPECTOS MEDIOAMBIENTALES (ISO 14001)' },
    mediciones: { ...texto, description: 'CROQUIS/MEDICIONES: el texto y las medidas, una línea por cosa' },
    dudas: {
      type: 'array',
      items: { type: 'string' },
      description: 'Una frase corta por cada cosa que no se lea bien o no cuadre',
    },
  },
  required: [
    'es_parte', 'codigo_obra', 'cliente', 'obra', 'localidad', 'obra_id', 'fecha', 'trabajadores', 'vehiculo',
    'tipo_vehiculo', 'km_salida', 'km_llegada', 'salida_nave', 'llegada_obra', 'salida_obra', 'llegada_nave',
    'trabajos', 'material_retirado', 'material_utilizado', 'material_devuelto', 'instrucciones_calidad',
    'medio_ambiente', 'mediciones', 'dudas',
  ],
}

/** Instrucciones para la IA, con las obras en marcha y los trabajadores para casar nombres. */
export function instrucciones(obras: ObraContexto[], trabajadores: TrabajadorContexto[], hoy: string): string {
  const listaObras = obras
    .map((o) => `- ${o.id} | ${o.codigo} | ${o.nombre} | ${o.cliente ?? ''} | ${o.localidad ?? ''}`)
    .join('\n')
  const listaTrabajadores = trabajadores.map((t) => `- ${t.id} | ${t.nombre}`).join('\n')
  return `Pasas a datos los partes de trabajo de IMTEX (empresa de impermeabilizaciones de Badajoz), escritos a mano en una hoja impresa. La foto puede estar girada, torcida o con poca luz.

La hoja tiene, arriba: CÓDIGO OBRA, FECHA, LOCALIDAD, CLIENTE, OBRA, VEHÍCULO, HORA SALIDA NAVE/OBRA (salida de la nave / llegada a la obra), HORA SALIDA OBRA/NAVE (salida de la obra / llegada a la nave) y KM SALIDA/LLEGADA (lecturas del cuentakilómetros). Después, una tabla con HORAS, EXTRAS y TRABAJADOR (una fila por trabajador) junto a TRABAJOS REALIZADOS (FASE DE LA OBRA). Debajo: INSTRUCCIONES TÉCNICAS, CONTROL DE CALIDAD (ISO 9001); ASPECTOS MEDIOAMBIENTALES (ISO 14001); CONTROL MATERIAL (MATERIAL RETIRADO ALMACÉN, MATERIAL UTILIZADO EN OBRA y MATERIAL DEVUELTO A ALMACÉN); CROQUIS/MEDICIONES, y las firmas del trabajador y del encargado.

Reglas:
- Copia lo que pone, sin inventar. Lo que no esté o no se lea: null (o lista vacía).
- Obra: elige de la lista de obras en marcha la que corresponda por código, nombre, cliente o localidad, y pon su id en obra_id. Muchas veces no ponen el código: si por cliente, obra y localidad encaja más de una, o ninguna, obra_id null.
- Trabajadores: una entrada por cada fila con nombre o con horas. En nombre va lo escrito tal cual; en trabajador_id, el id de la lista que corresponda (puede venir solo el nombre, el apellido, un diminutivo o un mote). Si no estás seguro, trabajador_id null.
- HORAS son las horas ordinarias y EXTRAS las horas extra, como número: «8» es 8, «7,5» o «7 y media» es 7.5, «8:30» es 8.5. Fíjate bien en qué columna está cada número. Lo normal es que solo apunten las EXTRAS y dejen HORAS vacía, que quiere decir «su jornada de contrato»: entonces horas_ord es null (no 0). Una casilla de EXTRAS vacía es 0.
- Ojo con las cifras escritas a mano que se parecen (1 y 2, 1 y 7, 4 y 9, 3 y 8, 5 y 6): compáralas con otras de la misma mano en la hoja (la fecha, las horas, las cantidades) y, si alguna no está clara, dilo en dudas.
- Fecha en AAAA-MM-DD. En España se escribe día/mes/año. Si no pone el año, el más reciente que no sea posterior a hoy. Hoy es ${hoy}.
- km sin puntos de miles. tipo_vehiculo: 'camion' solo si es un camión; furgoneta o coche, 'furgon'; sin vehículo, null.
- Horas de salida y llegada en HH:MM (24 h; si por el contexto es de tarde, súmale 12).
- Texto de trabajos, instrucciones, medio ambiente, material y mediciones: como está escrito, corrigiendo solo lo evidente y sin desarrollar abreviaturas que no estés seguro de entender («Imper» se queda «Imper»). El material, una línea por cosa con su cantidad.
- Comillas («"», «""» o «id.») debajo de un texto significan «lo mismo que arriba»: escríbelo entero. Por ejemplo, «6 Rollos Morterplas 4Kg FP» y debajo «6 " " 4Kg FP Min Gris» es «6 Rollos Morterplas 4Kg FP Min Gris».
- Un número tachado o escrito encima de otro vale el último; si no está claro, dilo en dudas.
- Croquis/mediciones: copia las medidas y a qué estancia se refieren (por ejemplo «Cuarto contenedores: suelo 4,4 × 2,7; paredes 16,70 × 2,65»). Los dibujos no.
- dudas: una frase corta en español por cada cosa que no hayas leído bien o que no cuadre (la leerá quien mandó la foto). Vacía si todo está claro.
- Si la imagen no es un parte de trabajo, es_parte = false y lo demás vacío.

Obras en marcha (id | código | nombre | cliente | localidad):
${listaObras || '(ninguna)'}

Trabajadores (id | nombre):
${listaTrabajadores || '(ninguno)'}`
}

/**
 * Cuerpo de la petición a la API de mensajes de Anthropic. Con `anterior` y `correccion`, se le pide
 * que corrija una lectura según lo que dice quien mandó la foto (la foto va igualmente, por si hay que mirarla).
 */
export function peticionLectura(o: {
  modelo: string
  imagen: { base64: string; tipo: string }
  obras: ObraContexto[]
  trabajadores: TrabajadorContexto[]
  hoy: string
  anterior?: Lectura
  correccion?: string
}) {
  const pide =
    o.anterior && o.correccion
      ? `Esta es la lectura que se hizo de la foto:\n${JSON.stringify(o.anterior)}\n\nQuien la mandó la corrige así: «${o.correccion}»\n\nDevuelve la lectura completa con la corrección. Cambia solo lo que pide; si no se entiende, no cambies nada y explícalo en dudas.`
      : 'Lee este parte de trabajo.'
  return {
    model: o.modelo,
    max_tokens: 4096,
    system: instrucciones(o.obras, o.trabajadores, o.hoy),
    output_config: { format: { type: 'json_schema', schema: ESQUEMA } },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: o.imagen.tipo, data: o.imagen.base64 } },
          { type: 'text', text: pide },
        ],
      },
    ],
  }
}

const cadena = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const cifra = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}
const horaValida = (v: unknown) => {
  const m = typeof v === 'string' ? /^(\d{1,2}):(\d{2})$/.exec(v.trim()) : null
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}
const fechaValida = (v: unknown) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v) ? v : null
}

/** La lectura que viene en la respuesta de la API, con cada campo comprobado. Error si no hay lectura. */
export function extraerLectura(respuesta: unknown): Lectura {
  const r = respuesta as { content?: { type?: string; text?: string }[]; stop_reason?: string } | null
  if (r?.stop_reason === 'refusal') throw new Error('La IA no ha querido leer la imagen.')
  if (r?.stop_reason === 'max_tokens') throw new Error('La lectura se ha quedado a medias (respuesta demasiado larga).')
  let e: Record<string, unknown>
  try {
    e = JSON.parse(r?.content?.find((b) => b?.type === 'text')?.text ?? '')
  } catch {
    throw new Error('La IA no ha devuelto la lectura.')
  }
  if (typeof e !== 'object' || e === null || Array.isArray(e)) throw new Error('La IA no ha devuelto la lectura.')
  const filas = Array.isArray(e.trabajadores) ? (e.trabajadores as Record<string, unknown>[]) : []
  return {
    es_parte: e.es_parte !== false,
    codigo_obra: cadena(e.codigo_obra),
    cliente: cadena(e.cliente),
    obra: cadena(e.obra),
    localidad: cadena(e.localidad),
    obra_id: cadena(e.obra_id),
    fecha: fechaValida(e.fecha),
    trabajadores: filas
      .filter((f) => typeof f === 'object' && f !== null)
      .map((f) => ({
        nombre: cadena(f.nombre) ?? '',
        trabajador_id: cadena(f.trabajador_id),
        horas_ord: cifra(f.horas_ord) === null ? null : Math.max(0, cifra(f.horas_ord)!),
        horas_ext: Math.max(0, cifra(f.horas_ext) ?? 0),
      })),
    vehiculo: cadena(e.vehiculo),
    tipo_vehiculo: e.tipo_vehiculo === 'camion' || e.tipo_vehiculo === 'furgon' ? e.tipo_vehiculo : null,
    km_salida: cifra(e.km_salida),
    km_llegada: cifra(e.km_llegada),
    salida_nave: horaValida(e.salida_nave),
    llegada_obra: horaValida(e.llegada_obra),
    salida_obra: horaValida(e.salida_obra),
    llegada_nave: horaValida(e.llegada_nave),
    trabajos: cadena(e.trabajos),
    material_retirado: cadena(e.material_retirado),
    material_utilizado: cadena(e.material_utilizado),
    material_devuelto: cadena(e.material_devuelto),
    instrucciones_calidad: cadena(e.instrucciones_calidad),
    medio_ambiente: cadena(e.medio_ambiente),
    mediciones: cadena(e.mediciones),
    dudas: Array.isArray(e.dudas) ? e.dudas.map(cadena).filter((d): d is string => !!d) : [],
  }
}

const sinEspacios = (s: string) => s.toUpperCase().replace(/[\s\-_./]/g, '')

/** 2026-10-06 → 06/10/2026 */
export const fechaATexto = (iso: string) => iso.split('-').reverse().join('/')

/**
 * De la lectura a las columnas del parte. Solo se aceptan obras y trabajadores de las listas que se
 * le dieron (un id inventado se queda en null), y se anota lo que hay que mirar.
 */
export function aColumnas(
  l: Lectura,
  obras: ObraContexto[],
  trabajadores: TrabajadorContexto[],
  hoy: string,
): ColumnasParte {
  const avisos = [...l.dudas]

  const obra =
    obras.find((o) => o.id === l.obra_id) ??
    (l.codigo_obra ? obras.find((o) => sinEspacios(o.codigo) === sinEspacios(l.codigo_obra!)) : undefined)
  if (!obra) {
    const pone = [l.codigo_obra, l.obra, l.localidad].filter(Boolean).join(' · ')
    avisos.push(pone ? `No reconozco la obra (pone «${pone}»).` : 'No se lee la obra.')
  }

  if (!l.fecha) avisos.push('No se lee la fecha.')
  else if (l.fecha > hoy) avisos.push(`La fecha (${fechaATexto(l.fecha)}) es posterior a hoy.`)

  const ids = new Set(trabajadores.map((t) => t.id))
  const lineas = l.trabajadores
    .filter((x) => x.nombre || x.trabajador_id || x.horas_ord || x.horas_ext)
    .map((x) => {
      const id = x.trabajador_id && ids.has(x.trabajador_id) ? x.trabajador_id : null
      // HORAS vacía = la jornada de su contrato (lo que se escribe suele ser solo las extras)
      const jornada = trabajadores.find((t) => t.id === id)?.jornada_horas ?? JORNADA_POR_DEFECTO
      return { ...x, trabajador_id: id, horas_ord: x.horas_ord ?? jornada }
    })
  if (lineas.length === 0) avisos.push('No se leen los trabajadores.')
  for (const x of lineas) {
    const quien = trabajadores.find((t) => t.id === x.trabajador_id)?.nombre ?? `«${x.nombre || '(sin nombre)'}»`
    if (!x.trabajador_id) avisos.push(`No sé quién es «${x.nombre || '(sin nombre)'}».`)
    if (x.horas_ord + x.horas_ext === 0) avisos.push(`Faltan las horas de ${quien}.`)
    else if (x.horas_ord + x.horas_ext > MAX_HORAS_DIA) avisos.push(`Revisa las horas de ${quien}: salen ${x.horas_ord + x.horas_ext}.`)
  }
  const repetidos = lineas.filter((x, i) => x.trabajador_id && lineas.findIndex((y) => y.trabajador_id === x.trabajador_id) !== i)
  for (const x of repetidos) avisos.push(`${trabajadores.find((t) => t.id === x.trabajador_id)!.nombre} sale dos veces.`)

  if (l.km_salida !== null && l.km_llegada !== null) {
    const km = l.km_llegada - l.km_salida
    if (km <= 0) avisos.push('Los km de llegada tienen que ser más que los de salida.')
    else if (km > MAX_KM_DIA) avisos.push(`Revisa los km: salen ${km} en un día.`)
  } else if (l.km_salida !== null || l.km_llegada !== null) {
    avisos.push('Falta una de las dos lecturas de km.')
  }

  return {
    obra_id: obra?.id ?? null,
    fecha: l.fecha,
    lineas,
    vehiculo: l.vehiculo,
    tipo_vehiculo: l.tipo_vehiculo ?? (l.km_salida !== null || l.vehiculo ? 'furgon' : null),
    km_salida: l.km_salida,
    km_llegada: l.km_llegada,
    salida_nave: l.salida_nave,
    llegada_obra: l.llegada_obra,
    salida_obra: l.salida_obra,
    llegada_nave: l.llegada_nave,
    trabajos: l.trabajos,
    material_retirado: l.material_retirado,
    material_utilizado: l.material_utilizado,
    material_devuelto: l.material_devuelto,
    instrucciones_calidad: l.instrucciones_calidad,
    medio_ambiente: l.medio_ambiente,
    mediciones: l.mediciones,
    lectura: l,
    avisos,
  }
}

/**
 * Lo que tiene que estar antes de apuntar, dicho para quien manda el parte. Vacío si está todo.
 * Lo demás (categorías, mes cerrado…) lo comprueba apuntar_parte en la base de datos.
 */
export function faltaParaApuntar(c: Pick<ColumnasParte, 'obra_id' | 'fecha' | 'lineas'>): string[] {
  const falta: string[] = []
  if (!c.obra_id) falta.push('la obra')
  if (!c.fecha) falta.push('la fecha')
  if (c.lineas.length === 0) falta.push('los trabajadores')
  for (const x of c.lineas) {
    if (!x.trabajador_id) falta.push(`quién es «${x.nombre || '(sin nombre)'}»`)
    else if (x.horas_ord + x.horas_ext === 0) falta.push(`las horas de «${x.nombre}»`)
  }
  return falta
}

// Resumen para WhatsApp -------------------------------------------------------------------------

const cifras = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
const recortar = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s)
const enUnaLinea = (s: string) => s.replace(/\s*\n\s*/g, ' · ')

/** El texto que se manda por WhatsApp para que quien mandó la foto lo confirme. Cabe en un mensaje con botones. */
export function resumen(c: ColumnasParte, obras: ObraContexto[], trabajadores: TrabajadorContexto[]): string {
  const obra = obras.find((o) => o.id === c.obra_id)
  const partes: string[] = [c.fecha ? `📋 *Parte del ${fechaATexto(c.fecha)}*` : '📋 *Parte* (❓ sin fecha)']
  partes.push(
    obra
      ? `🏗️ ${obra.codigo} · ${obra.nombre}${obra.localidad ? ` (${obra.localidad})` : ''}`
      : '🏗️ ❓ Obra sin reconocer',
  )
  partes.push(
    '👷 ' +
      (c.lineas.length === 0
        ? '❓ Sin trabajadores'
        : c.lineas
            .map((x) => {
              const quien = trabajadores.find((t) => t.id === x.trabajador_id)?.nombre ?? `❓ «${x.nombre || 'sin nombre'}»`
              const horas = `${cifras.format(x.horas_ord)} h${x.horas_ext ? ` + ${cifras.format(x.horas_ext)} h extra` : ''}`
              return `\n• ${quien}: ${horas}`
            })
            .join('')),
  )
  if (c.km_salida !== null || c.km_llegada !== null || c.vehiculo) {
    const km =
      c.km_salida !== null && c.km_llegada !== null
        ? `${cifras.format(c.km_llegada - c.km_salida)} km (${cifras.format(c.km_salida)} → ${cifras.format(c.km_llegada)})`
        : 'km incompletos'
    partes.push(`🚐 ${c.vehiculo ?? (c.tipo_vehiculo === 'camion' ? 'Camión' : 'Furgoneta')}: ${km}`)
  }
  const horario = [
    c.salida_nave || c.llegada_obra ? `ida ${c.salida_nave ?? '?'}–${c.llegada_obra ?? '?'}` : '',
    c.salida_obra || c.llegada_nave ? `vuelta ${c.salida_obra ?? '?'}–${c.llegada_nave ?? '?'}` : '',
  ].filter(Boolean)
  if (horario.length) partes.push(`🕖 ${horario.join(' · ')}`)
  if (c.trabajos) partes.push(`🔧 ${recortar(enUnaLinea(c.trabajos), 200)}`)
  if (c.material_utilizado) partes.push(`📦 Material: ${recortar(enUnaLinea(c.material_utilizado), 150)}`)
  if (c.avisos.length) partes.push(`⚠️ ${recortar(c.avisos.join(' '), 250)}`)
  partes.push('¿Está bien?')
  // El cuerpo de un mensaje con botones admite 1.024 caracteres
  return recortar(partes.join('\n'), 1024)
}

// WhatsApp: avisos de Meta ----------------------------------------------------------------------

export type AccionBoton = 'confirmar' | 'corregir' | 'anular'

export type Mensaje = { id: string; de: string; respondeA: string | null } & (
  | { tipo: 'imagen'; imagenId: string; mime: string }
  | { tipo: 'texto'; texto: string }
  | { tipo: 'boton'; accion: AccionBoton; parteId: string }
  | { tipo: 'otro' }
)

/** Botones del resumen. El id lleva la acción y el parte: así se sabe a qué parte contesta. */
export const botones = (parteId: string) => [
  { type: 'reply', reply: { id: `confirmar:${parteId}`, title: '✅ Está bien' } },
  { type: 'reply', reply: { id: `corregir:${parteId}`, title: '✏️ Corregir' } },
  { type: 'reply', reply: { id: `anular:${parteId}`, title: '🗑️ Anular' } },
]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** Los mensajes que trae un aviso de Meta (los avisos de entrega y lectura se ignoran). */
export function mensajesDelAviso(cuerpo: unknown): Mensaje[] {
  type Crudo = Record<string, Record<string, unknown> | string | undefined>
  const salida: Mensaje[] = []
  const entradas = (cuerpo as { entry?: { changes?: { value?: { messages?: Crudo[] } }[] }[] })?.entry ?? []
  for (const cambio of entradas.flatMap((e) => e?.changes ?? [])) {
    for (const m of cambio?.value?.messages ?? []) {
      if (typeof m?.id !== 'string' || typeof m.from !== 'string') continue
      const base = { id: m.id, de: m.from, respondeA: ((m.context as Record<string, unknown>)?.id as string) ?? null }
      const imagen = (m.type === 'image' ? m.image : m.type === 'document' ? m.document : undefined) as
        | Record<string, unknown>
        | undefined
      const boton = (m.interactive as Record<string, Record<string, unknown>> | undefined)?.button_reply
      const [accion, parteId] = typeof boton?.id === 'string' ? boton.id.split(':') : []
      if (imagen && typeof imagen.id === 'string' && /^image\//.test(String(imagen.mime_type))) {
        salida.push({ ...base, tipo: 'imagen', imagenId: imagen.id, mime: String(imagen.mime_type).split(';')[0] })
      } else if (m.type === 'text' && typeof (m.text as Record<string, unknown>)?.body === 'string') {
        salida.push({ ...base, tipo: 'texto', texto: ((m.text as Record<string, unknown>).body as string).trim() })
      } else if (['confirmar', 'corregir', 'anular'].includes(accion) && UUID.test(parteId ?? '')) {
        salida.push({ ...base, tipo: 'boton', accion: accion as AccionBoton, parteId })
      } else {
        salida.push({ ...base, tipo: 'otro' })
      }
    }
  }
  return salida
}

/**
 * Comprueba la firma de Meta (cabecera X-Hub-Signature-256: «sha256=<hex>», HMAC del cuerpo con el
 * secreto de la app). Sin secreto o sin firma, no vale: el aviso se rechaza.
 */
export async function firmaValida(cuerpo: string, cabecera: string | null, secreto: string | undefined): Promise<boolean> {
  const hex = cabecera?.startsWith('sha256=') ? cabecera.slice(7) : ''
  if (!secreto || !/^[0-9a-f]{64}$/i.test(hex)) return false
  const firma = new Uint8Array(hex.match(/../g)!.map((b) => parseInt(b, 16)))
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  return crypto.subtle.verify('HMAC', clave, firma, new TextEncoder().encode(cuerpo))
}

/** Bytes → base64, por trozos (String.fromCharCode con una foto entera desborda la pila). */
export function aBase64(bytes: Uint8Array): string {
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binario)
}

// Textos del chat -------------------------------------------------------------------------------

export const TEXTOS = {
  ayuda:
    'Hola. Para pasar un parte de trabajo, mándame una foto de la hoja: desde arriba, entera y con buena luz. Te contestaré con lo que he leído para que lo confirmes.',
  noDadoDeAlta:
    'Este número no está dado de alta para mandar partes de IMTEX. Si eres de la empresa, pide en la oficina que añadan tu teléfono a tu ficha.',
  noEsParte:
    'Esto no parece un parte de trabajo. Si lo es, prueba con otra foto desde arriba, con la hoja entera y buena luz.',
  noLeido:
    'No he podido leer la foto ahora mismo. La he pasado a la oficina para que la revisen; no hace falta que hagas nada.',
  pideCorreccion:
    'Dime qué hay que cambiar, con tus palabras. Por ejemplo: «Pedro hizo 9 horas», «la fecha es el 6» o «la obra es la de Mérida».',
  variosPorConfirmar:
    'Tienes varios partes por confirmar. Pulsa «✏️ Corregir» en el que quieras cambiar y luego me dices qué.',
  noCorregido:
    'No he podido aplicar el cambio ahora mismo. Prueba otra vez en un rato o, si ya estaba bien, pulsa «✅ Está bien».',
  anulado: 'Anulado. No se apunta nada de ese parte.',
  yaCerrado: 'Ese parte ya no está pendiente: o ya se apuntó, o se anuló, o lo está revisando la oficina.',
  apuntado: (fecha: string) => `✅ Apuntado. Gracias. (Parte del ${fecha})`,
  falta: (falta: string[]) =>
    `Para apuntarlo falta ${falta.join(', ')}. Pulsa «✏️ Corregir» y dímelo.`,
  aLaOficina: (motivo: string) =>
    `No lo he podido apuntar: ${motivo} Lo he pasado a la oficina para que lo revisen.`,
}
