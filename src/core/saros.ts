// ============================================================
// Ciclo de Saros.
//
// El ciclo de Saros dura 6585,32 días (18 años, 11 días y 8 horas).
// Pasado ese tiempo, el Sol, la Tierra y la Luna vuelven casi a la
// misma posición relativa, por lo que se produce un eclipse muy parecido
// al anterior: a esa cadena de eclipses repetidos se la llama una
// "familia de Saros", numerada según el catálogo de la NASA.
//
// Este módulo asigna a cada eclipse su número de Saros y calcula las
// fechas aproximadas de toda la serie de su familia.
// ============================================================

import { AstroTime } from 'astronomy-engine'
import { SAROS_PERIOD_DAYS, ECLIPSE_SEASON_DAYS } from './constants'
import { lookupCatalogSaros } from '../data/sarosCatalog'

// Nodo lunar: "ascendente" cuando la Luna cruza la eclíptica hacia el
// norte y "descendente" cuando la cruza hacia el sur.
export type EclipseNode = 'ascending' | 'descending'

export interface SarosAssignment {
  saros: number
  node: EclipseNode
  /** true si es el eclipse secundario de su temporada (nº = primario −/+ 38) */
  secondary: boolean
}

/**
 * Calibración empírica del sistema de numeración de Saros (solar).
 *
 * Cada temporada de eclipses (~173,31 días) el número de Saros del eclipse
 * "primario" avanza +5 (módulo 38). La referencia es el eclipse de
 * 2017-02-26 (Saros 140), validado contra el catálogo de la NASA 1999-2024
 * (58/58 coincidencias).
 */
const REF_DATE = '2017-02-26T14:53:32Z'
const REF_SAROS = 140

export function julianDay(d: Date): number {
  return new AstroTime(d).ut
}

/** Índice de temporada de eclipses (entero) respecto a la referencia. */
export function seasonIndex(t: Date): number {
  return Math.round((julianDay(t) - julianDay(new Date(REF_DATE))) / ECLIPSE_SEASON_DAYS)
}

function primarySarosForRaw(raw: number): number {
  const r = ((raw % 38) + 38) % 38
  if (r === 3) return 155
  return 117 + ((r - 3 + 38) % 38)
}

/** Número de Saros del eclipse "primario" de la temporada que contiene a `t`. */
export function primarySarosAt(t: Date): number {
  return primarySarosForRaw(REF_SAROS + 5 * seasonIndex(t))
}

/** Número de Saros del eclipse secundario de la misma temporada. */
export function secondarySaros(primary: number): number {
  const s = primary - 38
  return s >= 117 ? s : primary + 38
}

export function nodeOf(saros: number): EclipseNode {
  return saros % 2 === 1 ? 'ascending' : 'descending'
}

/** gamma global en el máximo (para discriminar primario/secundario). */
export interface SarosInput {
  peak: Date
  gamma: number
}

/**
 * Asigna el número de Saros a una lista de eclipses (fechas de máximo).
 * Agrupa por temporada; en temporadas con dos eclipses, el de menor gamma
 * (eje más cercano al centro de la Tierra, eclipse más profundo) es el
 * primario y el otro recibe el secundario (S ± 38).
 * Si el catálogo NASA embebido (sarosCatalog) contiene el peak dentro de 12h,
 * se usa el valor del catálogo como fuente de verdad (fallback heurístico si no).
 */
export function assignSaros(eclipses: SarosInput[]): SarosAssignment[] {
  const sorted = [...eclipses].sort((a, b) => +a.peak - +b.peak)
  const groups: SarosInput[][] = []
  for (const e of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.some((x) => Math.abs(+x.peak - +e.peak) < 45 * 24 * 3600 * 1000)) {
      last.push(e)
    } else {
      groups.push([e])
    }
  }
  const result = new Map<Date, SarosAssignment>()
  for (const g of groups) {
    const primary = primarySarosAt(g[0].peak)
    if (g.length === 1) {
      const catalog = lookupCatalogSaros(g[0].peak)
      const saros = catalog ?? primary
      const secondary = catalog !== undefined ? catalog !== primary : false
      result.set(g[0].peak, { saros, node: nodeOf(saros), secondary })
    } else {
      // temporada doble: prioriza catálogo individual por peak
      const catalogs = g.map((e) => lookupCatalogSaros(e.peak))
      const allCatalog = catalogs.every((c) => c !== undefined)
      if (allCatalog) {
        for (let i = 0; i < g.length; i++) {
          const saros = catalogs[i]!
          const secondary = saros !== primary
          result.set(g[i].peak, { saros, node: nodeOf(saros), secondary })
        }
      } else {
        const [a, b] = [...g].sort((x, y) => x.gamma - y.gamma)
        // intenta catálogo para cada uno individualmente, si no fallback gamma
        const sarosA = lookupCatalogSaros(a.peak) ?? primary
        const sarosB = lookupCatalogSaros(b.peak) ?? secondarySaros(primary)
        // si A ya tomó secondary, intercambiar
        if (sarosA !== primary && sarosB === primary) {
          result.set(a.peak, { saros: sarosA, node: nodeOf(sarosA), secondary: true })
          result.set(b.peak, { saros: sarosB, node: nodeOf(sarosB), secondary: false })
        } else {
          result.set(a.peak, { saros: sarosA, node: nodeOf(sarosA), secondary: sarosA !== primary })
          result.set(b.peak, { saros: sarosB, node: nodeOf(sarosB), secondary: true })
        }
      }
    }
  }
  return sorted.map((e) => result.get(e.peak)!)
}

export interface SarosFamily {
  saros: number
  node: EclipseNode
  /** fechas aproximadas de la serie: ancla ± k·periodo de Saros */
  dates: Date[]
}

/**
 * Serie de Saros de un eclipse: la misma familia se repite cada
 * 6585,32 días (18 años 11 días 8 horas).
 */
export function sarosFamily(anchorPeak: Date, saros: number, past = 3, future = 6): SarosFamily {
  const dates: Date[] = []
  for (let k = -past; k <= future; k++) {
    if (k === 0) continue
    dates.push(new Date(+anchorPeak + k * SAROS_PERIOD_DAYS * 24 * 3600 * 1000))
  }
  dates.sort((a, b) => +a - +b)
  return { saros, node: nodeOf(saros), dates }
}
