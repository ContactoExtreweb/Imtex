import { useQuery } from '@tanstack/react-query'
import type { Json } from './database.types'
import { PRESUPUESTO_POR_DEFECTO } from './empresa'
import { idAleatorio } from './id'
import { supabase, type Fila } from './supabase'

export const FAMILIAS = {
  mano_obra: 'Mano de obra IMTEX',
  subcontrata: 'Subcontrata',
  vehiculos: 'Vehículos',
  maquinaria: 'Maquinaria',
  materiales: 'Materiales',
} as const
export type Familia = keyof typeof FAMILIAS

export const UNIDADES = ['ud', 'ml', 'm', 'm2', 'm3', 'kg', 't', 'h', 'km', 'día', 'mes', 'l', 'rollo', 'global']

export const ESTADOS = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
} as const
export type Estado = keyof typeof ESTADOS

// Forma con la que trabaja el editor (presupuestos y partidas tipo). El coste va siempre en la línea:
// copiado de la base en los presupuestos, y leído de la base al abrir en las partidas tipo.

export interface LineaEdicion {
  /** null = precio libre */
  precio_id: string | null
  codigo: string | null
  descripcion: string
  unidad: string
  coste_unitario: number
  rendimiento: number
}

export interface PartidaEdicion {
  /** Identificador local, solo para las listas de React */
  clave: string
  codigo: string
  titulo: string
  medicion: string
  cantidad: number
  gg_pct: number
  ben_pct: number
  lineas: LineaEdicion[]
}

export interface PresupuestoEdicion {
  id: string | null
  codigo: string
  titulo: string
  cliente_id: string | null
  contacto: string
  localidad: string
  fecha: string
  validez: string
  forma_pago: string
  plazo: string
  iva_pct: number
  gg_pct_def: number
  ben_pct_def: number
  carta: string
  condiciones: string
  estado: Estado
  partidas: PartidaEdicion[]
}

export const nuevaClave = idAleatorio

export function lineaDePrecio(precio: Fila<'precios'>, rendimiento = 1): LineaEdicion {
  return {
    precio_id: precio.id,
    codigo: precio.codigo,
    descripcion: precio.descripcion,
    unidad: precio.unidad,
    coste_unitario: precio.coste,
    rendimiento,
  }
}

export function partidaNueva(codigo: string, gg_pct: number, ben_pct: number): PartidaEdicion {
  return { clave: nuevaClave(), codigo, titulo: '', medicion: '', cantidad: 1, gg_pct, ben_pct, lineas: [] }
}

/** P.001, P.002… según la posición */
export const codigoPartida = (posicion: number, prefijo = 'P') => `${prefijo}.${String(posicion).padStart(3, '0')}`

/** Siguiente código libre del año: P.2026-001, P.2026-002… */
export function siguienteCodigo(existentes: string[], anio = new Date().getFullYear()): string {
  const prefijo = `P.${anio}-`
  const numeros = existentes
    .filter((c) => c.startsWith(prefijo))
    .map((c) => Number(c.slice(prefijo.length)))
    .filter(Number.isInteger)
  return prefijo + String(Math.max(0, ...numeros) + 1).padStart(3, '0')
}

export function presupuestoNuevo(codigo: string): PresupuestoEdicion {
  return {
    id: null,
    codigo,
    titulo: '',
    cliente_id: null,
    contacto: '',
    localidad: '',
    fecha: new Date().toISOString().slice(0, 10),
    forma_pago: '',
    plazo: '',
    estado: 'borrador',
    partidas: [],
    ...PRESUPUESTO_POR_DEFECTO,
  }
}

const porOrden = (a: { orden: number }, b: { orden: number }) => a.orden - b.orden

/** Presupuesto completo, con partidas y líneas, en la forma del editor. */
export async function cargarPresupuesto(id: string): Promise<PresupuestoEdicion> {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('*, presupuesto_partidas(*, presupuesto_lineas(*))')
    .eq('id', id)
    .single()
  if (error) throw error
  const { presupuesto_partidas, ...p } = data
  return {
    id: p.id,
    codigo: p.codigo,
    titulo: p.titulo,
    cliente_id: p.cliente_id,
    contacto: p.contacto ?? '',
    localidad: p.localidad ?? '',
    fecha: p.fecha,
    validez: p.validez ?? '',
    forma_pago: p.forma_pago ?? '',
    plazo: p.plazo ?? '',
    iva_pct: p.iva_pct,
    gg_pct_def: p.gg_pct_def,
    ben_pct_def: p.ben_pct_def,
    carta: p.carta,
    condiciones: p.condiciones,
    estado: p.estado as Estado,
    partidas: presupuesto_partidas.sort(porOrden).map((pp) => ({
      clave: pp.id,
      codigo: pp.codigo,
      titulo: pp.titulo,
      medicion: pp.medicion,
      cantidad: pp.cantidad,
      gg_pct: pp.gg_pct,
      ben_pct: pp.ben_pct,
      lineas: pp.presupuesto_lineas.sort(porOrden).map((l) => ({
        precio_id: l.precio_id,
        codigo: l.codigo,
        descripcion: l.descripcion,
        unidad: l.unidad ?? '',
        coste_unitario: l.coste_unitario,
        rendimiento: l.rendimiento,
      })),
    })),
  }
}

export function usePresupuesto(id: string | undefined) {
  return useQuery({
    queryKey: ['presupuesto', id],
    enabled: !!id,
    queryFn: () => cargarPresupuesto(id!),
  })
}

/** Guarda cabecera, partidas y líneas en una transacción (función guardar_presupuesto). Devuelve el id. */
export async function guardarPresupuesto(p: PresupuestoEdicion): Promise<string> {
  const vacioANull = (s: string) => s.trim() || null
  const { data, error } = await supabase.rpc('guardar_presupuesto', {
    p: {
      ...p,
      contacto: vacioANull(p.contacto),
      localidad: vacioANull(p.localidad),
      validez: vacioANull(p.validez),
      forma_pago: vacioANull(p.forma_pago),
      plazo: vacioANull(p.plazo),
    } as unknown as Json,
  })
  if (error) throw error
  return data
}

/** Partidas tipo con sus líneas; las líneas de la base toman el precio vigente. */
export function usePartidasTipo(precios: Fila<'precios'>[]) {
  return useQuery({
    queryKey: ['partidas_tipo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partidas_tipo')
        .select('*, partidas_tipo_lineas(*)')
        .order('codigo')
      if (error) throw error
      return data
    },
    // En select y no en queryFn: si cambia la base de precios, se recalcula sin volver a pedir datos
    select: (data) =>
      data.map(({ partidas_tipo_lineas, ...t }) => ({
        id: t.id,
        partida: {
          clave: t.id,
          codigo: t.codigo,
          titulo: t.titulo,
          medicion: t.medicion,
          cantidad: t.cantidad,
          gg_pct: t.gg_pct,
          ben_pct: t.ben_pct,
          lineas: [...partidas_tipo_lineas].sort(porOrden).map((l): LineaEdicion => {
            const precio = precios.find((x) => x.id === l.precio_id)
            return precio
              ? lineaDePrecio(precio, l.rendimiento)
              : {
                  precio_id: null,
                  codigo: null,
                  descripcion: l.descripcion ?? '',
                  unidad: l.unidad ?? '',
                  coste_unitario: l.coste_unitario ?? 0,
                  rendimiento: l.rendimiento,
                }
          }),
        } satisfies PartidaEdicion,
      })),
  })
}

export async function guardarPartidaTipo(id: string | null, partida: PartidaEdicion): Promise<string> {
  const { data, error } = await supabase.rpc('guardar_partida_tipo', {
    p: {
      ...partida,
      id,
      // De las líneas de la base solo se guarda la referencia: el precio se lee al usarla
      lineas: partida.lineas.map((l) =>
        l.precio_id
          ? { precio_id: l.precio_id, rendimiento: l.rendimiento }
          : { descripcion: l.descripcion, unidad: l.unidad, coste_unitario: l.coste_unitario, rendimiento: l.rendimiento },
      ),
    } as unknown as Json,
  })
  if (error) throw error
  return data
}

/** Lo que impide guardar una partida, o null si está bien. */
export function errorPartida(p: PartidaEdicion): string | null {
  const nombre = p.codigo || p.titulo || 'sin código'
  if (!(p.cantidad > 0)) return `La partida ${nombre} tiene que tener una medición mayor que 0.`
  if (p.lineas.some((l) => !l.precio_id && !l.descripcion.trim()))
    return `La partida ${nombre} tiene un precio libre sin descripción.`
  return null
}
