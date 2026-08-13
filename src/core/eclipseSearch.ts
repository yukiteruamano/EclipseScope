// ============================================================
// Búsqueda de los próximos eclipses solares en el tiempo.
//
// astronomy-engine ya sabe calcular cuándo ocurren los eclipses; aquí
// se le pide la lista de los próximos `count` eclipses a partir de una
// fecha, junto con datos básicos como el tipo, la fecha del máximo y
// la "gamma" (cuán cerca pasa el eje de la sombra del centro terrestre).
// ============================================================

import { SearchGlobalSolarEclipse, NextGlobalSolarEclipse, type EclipseKind } from 'astronomy-engine'
import { EARTH_EQUATORIAL_RADIUS_KM } from './constants'

/** Resultado crudo de astronomy-engine para un eclipse solar global. */
export interface GlobalEclipse {
  /** tipo declarado por astronomy-engine (hybrid se reporta como total) */
  kind: EclipseKind
  /** instante de máxima magnitud */
  peak: Date
  /** distancia del eje de sombra al centro de la Tierra (km) */
  distanceKm: number
  /** gamma: distancia mínima del eje al centro en radios terrestres */
  gamma: number
  /** punto de máxima magnitud (si central) */
  latitude: number
  longitude: number
}

/**
 * Enumera los próximos `count` eclipses solares (visibles en algún lugar
 * de la Tierra) después de `startTime` usando astronomy-engine.
 */
export function findNextSolarEclipses(startTime: Date, count: number): GlobalEclipse[] {
  const out: GlobalEclipse[] = []
  let info = SearchGlobalSolarEclipse(startTime)
  for (let i = 0; i < count; i++) {
    const peak = info.peak.date
    out.push({
      kind: info.kind,
      peak,
      distanceKm: info.distance,
      gamma: info.distance / EARTH_EQUATORIAL_RADIUS_KM,
      latitude: info.latitude ?? 0,
      longitude: info.longitude ?? 0,
    })
    info = NextGlobalSolarEclipse(info.peak)
  }
  return out
}
