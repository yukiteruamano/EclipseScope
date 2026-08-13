// ============================================================
// Modelo de la Tierra (elipsoide WGS84) y conversión de coordenadas.
//
// "Geodésicas" = latitud/longitud (lo que usamos en mapas).
// "ECEF" = coordenadas cartesianas con el centro de la Tierra en el
// origen (x, y, z). Estas funciones permiten pasar de un sistema al
// otro y calcular dónde el eje de la sombra atraviesa la superficie.
// ============================================================

import {
  EARTH_EQUATORIAL_RADIUS_KM,
  EARTH_POLAR_RADIUS_KM,
  AU_KM,
} from './constants'

// Coordenadas geodésicas: latitud y longitud en grados y altura en km.
export interface GeoCoords {
  lat: number
  lon: number
  heightKm: number
}

// Coordenadas cartesianas ECEF (centro de la Tierra en el origen, en km).
export interface Ecef {
  x: number
  y: number
  z: number
}

/**
 * Conversión geodésica → cartesiana ECEF (WGS84).
 * Entrada en kilómetros (altura).
 */
export function geodeticToEcef(latDeg: number, lonDeg: number, heightKm = 0): Ecef {
  const a = EARTH_EQUATORIAL_RADIUS_KM
  const b = EARTH_POLAR_RADIUS_KM
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  const e2 = 1 - (b * b) / (a * a)
  const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat))
  const x = (N + heightKm) * Math.cos(lat) * Math.cos(lon)
  const y = (N + heightKm) * Math.cos(lat) * Math.sin(lon)
  const z = (N * (1 - e2) + heightKm) * Math.sin(lat)
  return { x, y, z }
}

/**
 * Conversión ECEF → geodésica (WGS84), iteración estándar.
 * Devuelve lat/lon en grados y altura en km.
 */
export function ecefToGeodetic(x: number, y: number, z: number): GeoCoords {
  const a = EARTH_EQUATORIAL_RADIUS_KM
  const b = EARTH_POLAR_RADIUS_KM
  const e2 = 1 - (b * b) / (a * a)
  const p = Math.hypot(x, y)
  const lon = (Math.atan2(y, x) * 180) / Math.PI
  let lat = Math.atan2(z, p * (1 - e2))
  for (let i = 0; i < 12; i++) {
    const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat))
    lat = Math.atan2(z + e2 * N * Math.sin(lat), p)
  }
  const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat))
  const heightKm = p / Math.cos(lat) - N
  return { lat: (lat * 180) / Math.PI, lon, heightKm }
}

/**
 * Intersección del eje de sombra (rayo) con el elipsoide terrestre.
 *
 * El eje de la sombra pasa por C = (x·p + y·q)·a_e (km) en el plano fundamental
 * y se extiende en la dirección del eje `axis` (unitario). Resolvemos
 * |C + s·axis| sobre el elipsoide x²+y²)/a² + z²/b² = 1 y devolvemos el punto
 * de la cara cercana a la Luna (raíz mayor de s).
 *
 * `aEq`, `bEq` son las componentes x,y del vector del eje; `cEq` la z.
 * Todas las componentes están en el ecuador verdadero de la fecha (EQD),
 * cuyo eje z es el eje de rotación de la Tierra → el elipsoide es axisimétrico.
 */
export function rayEllipsoid(
  Cx: number,
  Cy: number,
  Cz: number,
  axis: { x: number; y: number; z: number },
): Ecef | null {
  const a2 = EARTH_EQUATORIAL_RADIUS_KM * EARTH_EQUATORIAL_RADIUS_KM
  const b2 = EARTH_POLAR_RADIUS_KM * EARTH_POLAR_RADIUS_KM
  const A = (axis.x * axis.x + axis.y * axis.y) / a2 + (axis.z * axis.z) / b2
  const B = (2 * (Cx * axis.x + Cy * axis.y)) / a2 + (2 * Cz * axis.z) / b2
  const C = (Cx * Cx + Cy * Cy) / a2 + (Cz * Cz) / b2 - 1
  const disc = B * B - 4 * A * C
  if (disc < 0) return null
  const s = (-B + Math.sqrt(disc)) / (2 * A)
  return {
    x: Cx + s * axis.x,
    y: Cy + s * axis.y,
    z: Cz + s * axis.z,
  }
}

/** Kilómetros → unidades astronómicas. */
export function kmToAu(km: number): number {
  return km / AU_KM
}

export function auToKm(au: number): number {
  return au * AU_KM
}
