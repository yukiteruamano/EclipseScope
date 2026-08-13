// ============================================================
// Elementos besselianos de un eclipse solar.
//
// Un eclipse solar ocurre cuando la Luna pasa por delante del Sol.
// El método de Bessel (y Friedrich Bessel quien lo popularizó) define
// un "plano fundamental" que pasa por el centro de la Tierra y es
// perpendicular a la línea que une los centros del Sol y la Luna.
// Sobre ese plano:
//   x, y  → dónde apunta el eje de la sombra (en radios terrestres)
//   d     → declinación del eje de la sombra (grados)
//   u     → ángulo horario del eje en Greenwich (grados)
//   l1/l2 → radio de la penumbra / umbra en el plano fundamental
//   f1/f2 → medio-ángulo de apertura de los conos de penumbra / umbra
//
// Con estos elementos se calcula qué tipo de eclipse es y las horas de
// contacto en cualquier punto de la Tierra.
// ============================================================

import { Body, GeoVector, Rotation_EQJ_EQD, RotateVector, SiderealTime, Observer, ObserverVector, type Vector } from 'astronomy-engine'
import {
  EARTH_EQUATORIAL_RADIUS_AU,
  EARTH_EQUATORIAL_RADIUS_KM,
  AU_KM,
  SUN_RADIUS_KM,
  MOON_RADIUS_KM,
} from './constants'

// Un vector 3D (x, y, z).
export interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * Elementos besselianos de un eclipse solar en un instante dado.
 * x, y, l1, l2 están en radios ecuatoriales de la Tierra.
 * d, u en grados. f1, f2 en radianes (medio-ángulos de los conos).
 */
export interface BesselianElements {
  t: Date
  x: number
  y: number
  d: number
  u: number
  l1: number
  l2: number
  f1: number
  f2: number
  /** vector unitario del eje de la sombra (Luna → Sol), en EQD */
  axis: Vec3
  /** base del plano fundamental en EQD */
  p: Vec3
  q: Vec3
  a: Vec3
  /** distancia de la Luna al plano fundamental (km) */
  zMoonKm: number
  /** distancia Sol–Luna (km) */
  distSunMoonKm: number
}

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z
const norm = (a: Vec3): number => Math.hypot(a.x, a.y, a.z)
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const rad2deg = (r: number): number => (r * 180) / Math.PI

function eqdVector(body: Body, t: Date, aberration: boolean): Vec3 {
  const rot = Rotation_EQJ_EQD(t)
  const v = RotateVector(rot, GeoVector(body, t, aberration))
  return { x: v.x, y: v.y, z: v.z }
}

/**
 * Calcula los elementos besselianos directos (Meeus/Espenak, método instantáneo)
 * a partir de las efemérides geocéntricas del Sol y la Luna en el ecuador
 * verdadero de la fecha.
 */
export function besselianElements(t: Date): BesselianElements {
  const S = eqdVector(Body.Sun, t, true)
  const M = eqdVector(Body.Moon, t, true)

  // Eje de la sombra: de la Luna hacia el Sol.
  const sm = sub(S, M)
  const distSunMoonKm = norm(sm) * AU_KM
  const a: Vec3 = { x: sm.x / norm(sm), y: sm.y / norm(sm), z: sm.z / norm(sm) }

  // Declinación y ángulo horario del eje.
  const dRad = Math.asin(a.z)
  const alphaRad = Math.atan2(a.y, a.x)
  const u = (SiderealTime(t) * 15 - rad2deg(alphaRad) + 360) % 360

  // Base del plano fundamental: p (este), q (norte), a (eje).
  const p: Vec3 = { x: -Math.sin(alphaRad), y: Math.cos(alphaRad), z: 0 }
  const q = cross(a, p)

  // Posición del eje sobre el plano fundamental (radios ecuatoriales).
  const x = dot(M, p) / EARTH_EQUATORIAL_RADIUS_AU
  const y = dot(M, q) / EARTH_EQUATORIAL_RADIUS_AU

  // Distancia de la Luna al plano fundamental (km).
  const zMoonKm = dot(M, a) * AU_KM

  // Conos de penumbra y umbra.
  const f1 = Math.asin((SUN_RADIUS_KM + MOON_RADIUS_KM) / distSunMoonKm)
  const f2 = Math.asin((SUN_RADIUS_KM - MOON_RADIUS_KM) / distSunMoonKm)
  const l1 = (MOON_RADIUS_KM + zMoonKm * Math.tan(f1)) / EARTH_EQUATORIAL_RADIUS_KM
  const l2 = (MOON_RADIUS_KM - zMoonKm * Math.tan(f2)) / EARTH_EQUATORIAL_RADIUS_KM

  return {
    t,
    x,
    y,
    d: rad2deg(dRad),
    u,
    l1,
    l2,
    f1,
    f2,
    axis: a,
    p,
    q,
    a,
    zMoonKm,
    distSunMoonKm,
  }
}

/** Coordenadas (ξ, η, ζ) del observador en el plano fundamental. */
export interface FundamentalObserver {
  xi: number
  eta: number
  zeta: number
}

function observerVectorEqd(t: Date, lat: number, lon: number, heightKm: number): Vec3 {
  const obs = new Observer(lat, lon, heightKm)
  const rot = Rotation_EQJ_EQD(t)
  const O: Vector = RotateVector(rot, ObserverVector(t, obs, true))
  return { x: O.x, y: O.y, z: O.z }
}

export function observerFundamental(t: Date, lat: number, lon: number, heightKm = 0): FundamentalObserver {
  const el = besselianElements(t)
  const o = observerVectorEqd(t, lat, lon, heightKm)
  return {
    xi: dot(o, el.p) / EARTH_EQUATORIAL_RADIUS_AU,
    eta: dot(o, el.q) / EARTH_EQUATORIAL_RADIUS_AU,
    zeta: dot(o, el.a) / EARTH_EQUATORIAL_RADIUS_AU,
  }
}

/**
 * Circunstancias del eclipse en un punto de la superficie en un instante.
 * Δ = distancia del observador al eje; l1p/l2p = radios de penumbra/umbra
 * corregidos por la altura ζ del observador sobre el plano fundamental.
 */
export interface EclipseState {
  t: Date
  delta: number
  l1p: number
  l2p: number
  /** true si el observador está dentro de la penumbra (eclipse parcial o más) */
  inPenumbra: boolean
  /** true si está dentro de la umbra/antumbra (total o anular) */
  inCentral: boolean
  /** true si está dentro de la umbra real (total) */
  inTotal: boolean
  /** true si está dentro de la antumbra (anular) */
  inAnnular: boolean
  /** magnitud (fracción del diámetro solar cubierto), sin limitar */
  magnitude: number
  elements: BesselianElements
}

export function eclipseStateAt(
  t: Date,
  lat: number,
  lon: number,
  heightKm = 0,
): EclipseState {
  const el = besselianElements(t)
  const o = observerVectorEqd(t, lat, lon, heightKm)
  const xi = dot(o, el.p) / EARTH_EQUATORIAL_RADIUS_AU
  const eta = dot(o, el.q) / EARTH_EQUATORIAL_RADIUS_AU
  const zeta = dot(o, el.a) / EARTH_EQUATORIAL_RADIUS_AU
  const f1 = el.f1
  const f2 = el.f2
  const l1p = el.l1 - zeta * Math.tan(f1)
  const l2p = el.l2 + zeta * Math.tan(f2)
  const delta = Math.hypot(el.x - xi, el.y - eta)
  const inPenumbra = delta < l1p
  const inCentral = delta < l2p
  const magnitude = (l1p - delta) / (l1p - l2p)
  return {
    t,
    delta,
    l1p,
    l2p,
    inPenumbra,
    inCentral,
    inTotal: inCentral && l2p > 0,
    inAnnular: inCentral && l2p <= 0,
    magnitude,
    elements: el,
  }
}
