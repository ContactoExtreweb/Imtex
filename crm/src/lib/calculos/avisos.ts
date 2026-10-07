import { euros, pct } from '../formato'
import { nivelMargen } from './control-obra'

// Avisos de la portada sobre una obra en ejecución: margen bajo y desviación del presupuesto.
// El margen usa el semáforo de la herramienta de IMTEX (nivelMargen: menos del 5 % mal, hasta el 15 % justo).
// Coste y avance se miden como en la pestaña Comparativa de la obra.

/** Puntos que el coste consumido puede ir por delante de lo certificado antes de avisar. */
export const PUNTOS_DESVIACION = 10

export interface DatosObra {
  /** Certificado a origen */
  certificado: number
  /** Costes a origen, con estructura */
  costes: number
  /** Costes directos más dietas y hoteles: lo que se compara con el coste del presupuesto */
  costesSinEstructura: number
  /** Presupuesto del que salió la obra, si lo hay y el usuario puede verlo */
  presupuesto?: { base: number; costeDirecto: number } | null
}

export interface Aviso {
  tipo: 'perdidas' | 'margen_bajo' | 'margen_justo' | 'coste_superado' | 'desviacion'
  nivel: 'grave' | 'atencion'
  texto: string
}

export function avisosObra(d: DatosObra): Aviso[] {
  const avisos: Aviso[] = []

  // Sin nada certificado no hay margen que valorar
  if (d.certificado > 0) {
    const resultado = d.certificado - d.costes
    const margen = (resultado / d.certificado) * 100
    const nivel = nivelMargen(margen)
    if (resultado < 0) {
      avisos.push({
        tipo: 'perdidas',
        nivel: 'grave',
        texto: `En pérdidas: resultado a origen de ${euros(resultado)} (${pct(margen)})`,
      })
    } else if (nivel === 'mal') {
      avisos.push({ tipo: 'margen_bajo', nivel: 'grave', texto: `Margen bajo: ${pct(margen)} a origen` })
    } else if (nivel === 'justo') {
      avisos.push({ tipo: 'margen_justo', nivel: 'atencion', texto: `Margen justo: ${pct(margen)} a origen` })
    }
  }

  const p = d.presupuesto
  if (p && p.costeDirecto > 0) {
    const consumido = (d.costesSinEstructura / p.costeDirecto) * 100
    const certificado = p.base > 0 ? (d.certificado / p.base) * 100 : 0
    if (consumido > 100) {
      avisos.push({
        tipo: 'coste_superado',
        nivel: 'grave',
        texto: `Coste superado: lleva gastado el ${pct(consumido)} del coste presupuestado`,
      })
    } else if (consumido - certificado > PUNTOS_DESVIACION) {
      avisos.push({
        tipo: 'desviacion',
        nivel: 'atencion',
        texto: `Se desvía del presupuesto: lleva el ${pct(consumido)} del coste previsto con el ${pct(certificado)} certificado`,
      })
    }
  }

  return avisos
}
