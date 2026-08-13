// ============================================================
// Orquestador del cálculo ("el motor").
//
// Une todas las piezas:
//   1. Enumera los próximos eclipses (eclipseSearch).
//   2. Asigna a cada uno su número de Saros (saros).
//   3. Para cada eclipse calcula los elementos besselianos, la línea
//      central y las circunstancias locales del país elegido.
//
// La versión "async" procesa los eclipses de uno en uno, dejando que la
// interfaz respire entre cada uno (así se puede mostrar el progreso sin
// congelar la página).
// ============================================================

import { findNextSolarEclipses, type GlobalEclipse } from './eclipseSearch'
import { besselianElements, type BesselianElements } from './besselian'
import {
  computeLocalCircumstances,
  computeCentralLine,
  greatestGeometry,
  type LocalCircumstances,
  type PathPoint,
} from './localCircumstances'
import { assignSaros, sarosFamily, type SarosAssignment, type EclipseNode } from './saros'
import type { Country } from '../data/countries'

// Tipo global de un eclipse (el que se ve desde toda la Tierra).
export type GlobalKind = 'total' | 'annular' | 'hybrid' | 'partial'

// Todo lo que la aplicación necesita saber de un solo eclipse.
export interface EclipseData {
  /** fecha de máxima magnitud global */
  peak: Date
  kind: GlobalKind
  /** tipo declarado por astronomy-engine como respaldo */
  engineKind: string
  gamma: number
  greatestLat: number
  greatestLon: number
  saros: number
  node: EclipseNode
  secondary: boolean
  /** elementos besselianos en el máximo */
  elements: BesselianElements
  /** línea central (para eclipses centrales) */
  centralLine: PathPoint[]
  /** circunstancias locales en la capital del país elegido */
  local: LocalCircumstances
}

export interface EngineResult {
  eclipses: EclipseData[]
  /** fecha de inicio usada */
  startDate: Date
  country: Country
}

/** Datos ligeros por eclipse (sin línea central ni circunstancias locales). */
export interface RawEclipse {
  peak: Date
  engineKind: string
  gamma: number
}

function globalGamma(peak: Date): number {
  const el = besselianElements(peak)
  return Math.hypot(el.x, el.y)
}

/**
 * Fase 1 (ligera): enumera los próximos eclipses y asigna los números de Saros.
 * Devuelve lo necesario para pintar y para lanzar el cálculo pesado por eclipse.
 */
export function enumerateEclipses(startDate: Date, count = 15): { raws: RawEclipse[]; assignments: SarosAssignment[] } {
  const rawList: GlobalEclipse[] = findNextSolarEclipses(startDate, count)
  const raws: RawEclipse[] = rawList.map((e) => ({
    peak: e.peak,
    engineKind: String(e.kind),
    gamma: globalGamma(e.peak),
  }))
  const assignments = assignSaros(raws.map((r) => ({ peak: r.peak, gamma: r.gamma })))
  return { raws, assignments }
}

function classifyFromLine(line: PathPoint[]): GlobalKind {
  if (line.length === 0) return 'partial'
  let hasTotal = false
  let hasAnnular = false
  for (const p of line) {
    if (p.total) hasTotal = true
    else hasAnnular = true
  }
  if (hasTotal && hasAnnular) return 'hybrid'
  if (hasTotal) return 'total'
  return 'annular'
}

/**
 * Fase 2 (pesada): calcula todo el detalle de un único eclipse: tipo global,
 * línea central, geometría del máximo y circunstancias locales en el país.
 */
export function buildEclipseData(raw: RawEclipse, saros: SarosAssignment, country: Country): EclipseData {
  const el = besselianElements(raw.peak)
  const line = computeCentralLine(raw.peak)
  const kind = classifyFromLine(line)
  const geo = greatestGeometry(raw.peak)
  const local = computeLocalCircumstances(raw.peak, country.lat, country.lon)
  return {
    peak: raw.peak,
    kind,
    engineKind: raw.engineKind,
    gamma: raw.gamma,
    greatestLat: geo.lat,
    greatestLon: geo.lon,
    saros: saros.saros,
    node: saros.node,
    secondary: saros.secondary,
    elements: el,
    centralLine: line,
    local,
  }
}

/**
 * Cálculo completo no-bloqueante: procesa los eclipses uno a uno, cediendo al
 * event loop entre cada uno y reportando progreso. La UI permanece fluida y
 * puede mostrar skeleton + barra de progreso.
 */
export async function computeEclipsesAsync(
  startDate: Date,
  country: Country,
  count = 15,
  onProgress?: (done: number, total: number) => void,
): Promise<EngineResult> {
  const { raws, assignments } = enumerateEclipses(startDate, count)
  const eclipses: EclipseData[] = []
  for (let i = 0; i < raws.length; i++) {
    eclipses.push(buildEclipseData(raws[i], assignments[i], country))
    onProgress?.(i + 1, raws.length)
    // cede el hilo para que la UI repinte (skeleton/progreso)
    await new Promise<void>((r) => setTimeout(r, 0))
  }
  return { eclipses, startDate, country }
}

/** Versión síncrona (para usos puntuales/validación). */
export function computeEclipses(startDate: Date, country: Country, count = 15): EngineResult {
  const { raws, assignments } = enumerateEclipses(startDate, count)
  const eclipses = raws.map((raw, i) => buildEclipseData(raw, assignments[i], country))
  return { eclipses, startDate, country }
}

/** Serie de Saros (cadena 18y11d8h) de un eclipse concreto. */
export function eclipseFamily(peak: Date, saros: number) {
  return sarosFamily(peak, saros)
}
