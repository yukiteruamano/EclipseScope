// ============================================================
// Constantes físicas y astronómicas usadas por el motor de cálculo.
//
// Unidades: la mayoría de los cálculos trabajan en unidades
// astronómicas (UA, distancia media Tierra–Sol) y en kilómetros.
// También se definen los radios de la Tierra (modelo elipsoidal
// WGS84), del Sol y de la Luna, y el periodo de Saros.
// ============================================================

import { KM_PER_AU } from 'astronomy-engine'

// UA → kilómetros: 1 UA ≈ 149 597 870,7 km.
export const KM_PER_AU_VALUE = KM_PER_AU as number
export const AU_KM = KM_PER_AU_VALUE
// La Tierra no es una esfera perfecta: es un elipsoide achatado por los
// polos (modelo WGS84). Radio ecuatorial ~6378 km y polar ~6356 km.
export const EARTH_EQUATORIAL_RADIUS_KM = 6378.137
export const EARTH_POLAR_RADIUS_KM = 6356.752
// Aplastamiento (cuánto "se aplana" la Tierra en los polos).
export const EARTH_FLATTENING = 1 - EARTH_POLAR_RADIUS_KM / EARTH_EQUATORIAL_RADIUS_KM
// Radio ecuatorial terrestre expresado en unidades astronómicas.
export const EARTH_EQUATORIAL_RADIUS_AU = EARTH_EQUATORIAL_RADIUS_KM / AU_KM
export const SUN_RADIUS_KM = 696000 // Radio del Sol (~696 000 km)
export const MOON_RADIUS_KM = 1737.4 // Radio de la Luna (~1737 km)

// Periodo de Saros: 6585,3211 días = 18 años, 11 días y 8 horas.
// Es el ciclo en el que un eclipse solar se repite con geometría casi idéntica.
export const SAROS_PERIOD_DAYS = 6585.3211
export const SAROS_TEXT = '18 años · 11 días · 8 horas'

// Duración de una "temporada de eclipses" (~173 días): el periodo en el que
// el Sol pasa cerca de uno de los nodos de la órbita lunar.
export const ECLIPSE_SEASON_DAYS = 173.31
