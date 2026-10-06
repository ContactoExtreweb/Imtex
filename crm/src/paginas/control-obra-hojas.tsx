import { useQuery } from '@tanstack/react-query'
import type { ConfigHoja } from '@/components/hoja-apuntes'
import { costeKm } from '@/lib/calculos/combustible'
import { origenAnterior } from '@/lib/calculos/control-obra'
import type { Apunte } from '@/lib/control-obra'
import { euros, fecha, leerNumero, numeroATexto } from '@/lib/formato'
import { supabase } from '@/lib/supabase'
import { useTabla } from '@/lib/tabla'

// Las siete hojas de apuntes del control de obra, con los mismos campos y cálculos que
// referencia/IMTEX_control_obra.html. El listado y el diálogo son de components/hoja-apuntes.tsx.

export type IdHoja =
  | 'certificaciones'
  | 'personal'
  | 'materiales'
  | 'subcontratas'
  | 'alquileres'
  | 'combustible'
  | 'viajes'

const num = (valor: string | undefined) => leerNumero(valor ?? '') ?? 0
const txt = (valor: string | undefined) => valor?.trim() || null
const n = (fila: Apunte, campo: string) => Number(fila[campo]) || 0
const t = (fila: Apunte, campo: string) => String(fila[campo] ?? '')
const unir = (...partes: (string | false | null | undefined)[]) => partes.filter(Boolean).join(' · ')
const conFecha = (fila: Apunte) => (fila.fecha ? fecha(String(fila.fecha)) : '')

const TIPOS_VEHICULO = { furgon: 'Furgoneta', camion: 'Camión', maquinaria: 'Maquinaria (importe directo)' } as const
const TIPOS_VIAJE = { dietas: 'Dietas', hoteles: 'Hoteles' } as const

/** Hoja de «tercero, documento, concepto e importe»: materiales, subcontratas, alquileres y viajes. */
function hojaSimple(
  tabla: 'materiales' | 'subcontratas' | 'alquileres' | 'gastos_viaje',
  nombre: string,
  tercero: { campo: string; etiqueta: string },
): ConfigHoja {
  return {
    tabla,
    modulo: 'control_obra',
    nombre,
    campoFecha: 'fecha',
    campos: [
      { campo: tercero.campo, etiqueta: tercero.etiqueta, tipo: 'texto' },
      { campo: 'documento', etiqueta: 'Documento (factura, albarán, ticket…)', tipo: 'texto' },
      { campo: 'concepto', etiqueta: 'Concepto', tipo: 'texto' },
      { campo: 'importe', etiqueta: 'Importe (€)', tipo: 'numero' },
    ],
    nuevos: () => ({ [tercero.campo]: '', documento: '', concepto: '', importe: '' }),
    preparar: (v) =>
      num(v.importe) > 0
        ? {
            [tercero.campo]: txt(v[tercero.campo]),
            documento: txt(v.documento),
            concepto: txt(v.concepto),
            importe: num(v.importe),
          }
        : 'Escribe un importe mayor que 0.',
    titulo: (f) => t(f, 'concepto') || t(f, tercero.campo) || `(${nombre} sin concepto)`,
    detalle: (f) => unir(conFecha(f), t(f, tercero.campo), t(f, 'documento')),
    importe: (f) => n(f, 'importe'),
  }
}

// Certificaciones: se escribe lo certificado en el mes y se guarda el importe a origen,
// encadenando con la certificación anterior (como recomputeCertChain de la herramienta).
const anterior = (numero: number, filas: Apunte[], propia: Apunte | null) =>
  origenAnterior(
    numero,
    filas.map((f) => ({ id: f.id, numero: n(f, 'numero'), importe_origen: n(f, 'importe_origen') })),
    propia?.id,
  )
const certificadoEnElMes = (fila: Apunte, filas: Apunte[]) =>
  n(fila, 'importe_origen') - anterior(n(fila, 'numero'), filas, fila)

/** Configuración de las hojas. Lee las categorías, los trabajadores y las tarifas de combustible de Ajustes. */
export function useHojas(): Record<IdHoja, ConfigHoja> {
  const categorias = useTabla('categorias_profesionales', 'nombre').lista.data ?? []
  const trabajadores = useTabla('trabajadores', 'nombre').lista.data ?? []
  const tarifas = useQuery({
    queryKey: ['tarifas_combustible'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tarifas_combustible').select().single()
      if (error) throw error
      return data
    },
  }).data

  const tarifaKm = (tipo: string) =>
    tarifas
      ? costeKm(tarifas.precio_litro_ref, tipo === 'camion' ? tarifas.consumo_camion_l100 : tarifas.consumo_furgon_l100)
      : 0
  const manoDeObra = (v: Record<string, string>) => {
    const categoria = categorias.find((c) => c.id === v.categoria_id)
    return categoria ? num(v.horas_ord) * categoria.precio_ord + num(v.horas_ext) * categoria.precio_ext : 0
  }

  return {
    certificaciones: {
      tabla: 'certificaciones',
      modulo: 'certificaciones',
      nombre: 'certificación',
      campoFecha: 'fecha_corte',
      campos: [
        { campo: 'numero', etiqueta: 'Nº de certificación', tipo: 'numero' },
        { campo: 'descripcion', etiqueta: 'Descripción', tipo: 'texto' },
        { campo: 'importe_mes', etiqueta: 'Certificado en el mes (€)', tipo: 'numero' },
      ],
      nuevos: (filas) => ({
        numero: String(Math.max(0, ...filas.map((f) => n(f, 'numero'))) + 1),
        descripcion: '',
        importe_mes: '',
      }),
      aFormulario: (f, filas) => ({
        numero: String(n(f, 'numero')),
        descripcion: t(f, 'descripcion'),
        importe_mes: numeroATexto(Number(certificadoEnElMes(f, filas).toFixed(2))),
      }),
      preparar: (v, filas, editando) => {
        const numero = Math.round(num(v.numero))
        if (numero < 1) return 'Escribe el número de la certificación.'
        if (filas.some((f) => f.id !== editando?.id && n(f, 'numero') === numero))
          return `Ya hay una certificación nº ${numero} en esta obra.`
        if (num(v.importe_mes) <= 0) return 'El importe certificado en el mes tiene que ser mayor que 0.'
        return {
          numero,
          descripcion: txt(v.descripcion),
          importe_origen: Number((anterior(numero, filas, editando) + num(v.importe_mes)).toFixed(2)),
        }
      },
      previa: (v, filas, editando) => {
        const previo = anterior(Math.round(num(v.numero)), filas, editando)
        return (
          <>
            <p>
              A origen: {euros(previo)} + {euros(num(v.importe_mes))} ={' '}
              <b>{euros(previo + num(v.importe_mes))}</b>
            </p>
            {editando && (
              <p className="mt-1 text-xs text-muted-foreground">
                Si cambias este importe, la certificación siguiente absorbe la diferencia: su importe a origen no
                cambia.
              </p>
            )}
          </>
        )
      },
      titulo: (f) => `Certificación nº ${n(f, 'numero')}`,
      detalle: (f) => unir(t(f, 'descripcion'), `a origen ${euros(n(f, 'importe_origen'))}`),
      importe: certificadoEnElMes,
    },

    personal: {
      tabla: 'partes_horas',
      modulo: 'partes_horas',
      nombre: 'parte de horas',
      campoFecha: 'fecha',
      campos: [
        {
          campo: 'trabajador_id',
          etiqueta: 'Trabajador',
          tipo: 'select',
          opciones: [
            { valor: '', texto: 'Otro (escribir el nombre)' },
            ...trabajadores.filter((x) => x.activo).map((x) => ({ valor: x.id, texto: x.nombre })),
          ],
        },
        { campo: 'operario', etiqueta: 'Nombre (trabajador o equipo)', tipo: 'texto', visible: (v) => !v.trabajador_id },
        {
          campo: 'categoria_id',
          etiqueta: 'Categoría',
          tipo: 'select',
          opciones: [
            { valor: '', texto: 'Elige la categoría…' },
            ...categorias.map((c) => ({
              valor: c.id,
              texto: `${c.nombre} · ${euros(c.precio_ord)}/h · extra ${euros(c.precio_ext)}/h`,
            })),
          ],
        },
        { campo: 'horas_ord', etiqueta: 'Horas ordinarias', tipo: 'numero' },
        { campo: 'horas_ext', etiqueta: 'Horas extra', tipo: 'numero' },
        { campo: 'dietas', etiqueta: 'Dietas (€)', tipo: 'numero' },
        { campo: 'alojamiento', etiqueta: 'Alojamiento (€)', tipo: 'numero' },
      ],
      nuevos: () => ({
        trabajador_id: '',
        operario: '',
        categoria_id: '',
        horas_ord: '',
        horas_ext: '',
        dietas: '',
        alojamiento: '',
      }),
      // Al elegir trabajador se propone su categoría
      alCambiar: (campo, v) => {
        const categoria = trabajadores.find((x) => x.id === v.trabajador_id)?.categoria_id
        return campo === 'trabajador_id' && categoria ? { ...v, categoria_id: categoria } : v
      },
      preparar: (v) => {
        const trabajador = trabajadores.find((x) => x.id === v.trabajador_id)
        const operario = trabajador?.nombre ?? v.operario?.trim()
        if (!operario) return 'Elige un trabajador o escribe el nombre.'
        const categoria = categorias.find((c) => c.id === v.categoria_id)
        if (!categoria) return 'Elige la categoría: de ella salen los precios por hora.'
        if (num(v.horas_ord) + num(v.horas_ext) + num(v.dietas) + num(v.alojamiento) <= 0)
          return 'Escribe las horas o algún gasto.'
        // Los precios de la categoría se copian en el parte, como hace la herramienta
        return {
          trabajador_id: trabajador?.id ?? null,
          operario,
          categoria_id: categoria.id,
          horas_ord: num(v.horas_ord),
          precio_ord: categoria.precio_ord,
          horas_ext: num(v.horas_ext),
          precio_ext: categoria.precio_ext,
          dietas: num(v.dietas),
          alojamiento: num(v.alojamiento),
        }
      },
      previa: (v) => (
        <p>
          Mano de obra: <b>{euros(manoDeObra(v))}</b> · Dietas y alojamiento:{' '}
          <b>{euros(num(v.dietas) + num(v.alojamiento))}</b>
        </p>
      ),
      titulo: (f) => t(f, 'operario'),
      detalle: (f) =>
        unir(
          conFecha(f),
          categorias.find((c) => c.id === f.categoria_id)?.nombre,
          `${numeroATexto(n(f, 'horas_ord'))} h + ${numeroATexto(n(f, 'horas_ext'))} h extra`,
          n(f, 'dietas') + n(f, 'alojamiento') > 0 &&
            `dietas y alojamiento ${euros(n(f, 'dietas') + n(f, 'alojamiento'))}`,
        ),
      // En la matriz, dietas y alojamiento van a sus filas; aquí, la mano de obra
      importe: (f) => n(f, 'horas_ord') * n(f, 'precio_ord') + n(f, 'horas_ext') * n(f, 'precio_ext'),
    },

    materiales: {
      ...hojaSimple('materiales', 'material', { campo: 'proveedor', etiqueta: 'Proveedor' }),
      campos: [
        { campo: 'proveedor', etiqueta: 'Proveedor', tipo: 'texto' },
        { campo: 'tipo', etiqueta: 'Tipo de material', tipo: 'texto' },
        { campo: 'documento', etiqueta: 'Documento (factura, albarán…)', tipo: 'texto' },
        { campo: 'concepto', etiqueta: 'Concepto', tipo: 'texto' },
        { campo: 'importe', etiqueta: 'Importe (€)', tipo: 'numero' },
      ],
      nuevos: () => ({ proveedor: '', tipo: '', documento: '', concepto: '', importe: '' }),
      preparar: (v) =>
        num(v.importe) > 0
          ? {
              proveedor: txt(v.proveedor),
              tipo: txt(v.tipo),
              documento: txt(v.documento),
              concepto: txt(v.concepto),
              importe: num(v.importe),
            }
          : 'Escribe un importe mayor que 0.',
      detalle: (f) => unir(conFecha(f), t(f, 'proveedor'), t(f, 'tipo'), t(f, 'documento')),
    },

    subcontratas: {
      ...hojaSimple('subcontratas', 'subcontrata', { campo: 'empresa', etiqueta: 'Empresa subcontratada' }),
      campos: [
        { campo: 'empresa', etiqueta: 'Empresa subcontratada', tipo: 'texto' },
        { campo: 'documento', etiqueta: 'Documento (certificación, factura…)', tipo: 'texto' },
        { campo: 'concepto', etiqueta: 'Concepto', tipo: 'texto' },
        { campo: 'importe', etiqueta: 'Importe (€)', tipo: 'numero' },
        { campo: 'retencion_pct', etiqueta: 'Retención (%)', tipo: 'numero' },
      ],
      nuevos: () => ({ empresa: '', documento: '', concepto: '', importe: '', retencion_pct: '5' }),
      preparar: (v) =>
        num(v.importe) > 0
          ? {
              empresa: txt(v.empresa),
              documento: txt(v.documento),
              concepto: txt(v.concepto),
              importe: num(v.importe),
              retencion_pct: num(v.retencion_pct),
            }
          : 'Escribe un importe mayor que 0.',
      // La retención no cambia el coste de la obra: solo lo que se paga ahora
      previa: (v) => {
        const retencion = (num(v.importe) * num(v.retencion_pct)) / 100
        return (
          <p>
            Retención: {euros(retencion)} · Líquido a pagar: <b>{euros(num(v.importe) - retencion)}</b>
          </p>
        )
      },
      detalle: (f) =>
        unir(
          conFecha(f),
          t(f, 'empresa'),
          t(f, 'documento'),
          `líquido ${euros(n(f, 'importe') * (1 - n(f, 'retencion_pct') / 100))}`,
        ),
    },

    alquileres: hojaSimple('alquileres', 'alquiler', { campo: 'empresa', etiqueta: 'Empresa' }),

    combustible: {
      tabla: 'combustible',
      modulo: 'control_obra',
      nombre: 'combustible',
      campoFecha: 'fecha',
      campos: [
        {
          campo: 'tipo_vehiculo',
          etiqueta: 'Tipo',
          tipo: 'select',
          opciones: Object.entries(TIPOS_VEHICULO).map(([valor, texto]) => ({ valor, texto })),
        },
        { campo: 'vehiculo', etiqueta: 'Vehículo o máquina', tipo: 'texto' },
        { campo: 'km', etiqueta: 'Kilómetros', tipo: 'numero', visible: (v) => v.tipo_vehiculo !== 'maquinaria' },
        { campo: 'importe', etiqueta: 'Importe (€)', tipo: 'numero', visible: (v) => v.tipo_vehiculo === 'maquinaria' },
      ],
      nuevos: () => ({ tipo_vehiculo: 'furgon', vehiculo: '', km: '', importe: '' }),
      preparar: (v) => {
        const comun = { tipo_vehiculo: v.tipo_vehiculo, vehiculo: txt(v.vehiculo) }
        if (v.tipo_vehiculo === 'maquinaria') {
          return num(v.importe) > 0
            ? { ...comun, km: 0, tarifa_km: 0, importe: num(v.importe) }
            : 'Escribe un importe mayor que 0.'
        }
        if (!tarifas) return 'No se han podido leer las tarifas de combustible. Recarga la página.'
        if (num(v.km) <= 0) return 'Escribe los kilómetros.'
        const tarifa = tarifaKm(v.tipo_vehiculo)
        return { ...comun, km: num(v.km), tarifa_km: tarifa, importe: Number((num(v.km) * tarifa).toFixed(2)) }
      },
      previa: (v) =>
        v.tipo_vehiculo === 'maquinaria' ? (
          <p>La maquinaria se apunta con el importe del combustible, sin kilómetros.</p>
        ) : (
          <p>
            {numeroATexto(num(v.km))} km × {numeroATexto(tarifaKm(v.tipo_vehiculo))} €/km ={' '}
            <b>{euros(num(v.km) * tarifaKm(v.tipo_vehiculo))}</b>
          </p>
        ),
      titulo: (f) => t(f, 'vehiculo') || TIPOS_VEHICULO[t(f, 'tipo_vehiculo') as keyof typeof TIPOS_VEHICULO],
      detalle: (f) =>
        unir(
          conFecha(f),
          t(f, 'tipo_vehiculo') === 'maquinaria'
            ? 'Maquinaria'
            : `${numeroATexto(n(f, 'km'))} km × ${numeroATexto(n(f, 'tarifa_km'))} €/km`,
        ),
      importe: (f) => n(f, 'importe'),
    },

    viajes: {
      ...hojaSimple('gastos_viaje', 'gasto de dietas u hotel', { campo: 'tercero', etiqueta: 'Restaurante u hotel' }),
      campos: [
        {
          campo: 'tipo',
          etiqueta: 'Tipo',
          tipo: 'select',
          opciones: Object.entries(TIPOS_VIAJE).map(([valor, texto]) => ({ valor, texto })),
        },
        { campo: 'tercero', etiqueta: 'Restaurante u hotel', tipo: 'texto' },
        { campo: 'documento', etiqueta: 'Documento (ticket, factura…)', tipo: 'texto' },
        { campo: 'concepto', etiqueta: 'Concepto', tipo: 'texto' },
        { campo: 'importe', etiqueta: 'Importe (€)', tipo: 'numero' },
      ],
      nuevos: () => ({ tipo: 'dietas', tercero: '', documento: '', concepto: '', importe: '' }),
      preparar: (v) =>
        num(v.importe) > 0
          ? {
              tipo: v.tipo,
              tercero: txt(v.tercero),
              documento: txt(v.documento),
              concepto: txt(v.concepto),
              importe: num(v.importe),
            }
          : 'Escribe un importe mayor que 0.',
      detalle: (f) =>
        unir(conFecha(f), TIPOS_VIAJE[t(f, 'tipo') as keyof typeof TIPOS_VIAJE], t(f, 'tercero'), t(f, 'documento')),
    },
  }
}
