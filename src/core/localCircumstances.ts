// ============================================================
// Circunstancias locales y línea central de un eclipse.
//
// "Circunstancias locales" = lo que se ve desde un punto concreto de la
// Tierra (por ejemplo la capital del país): a qué hora empieza el eclipse
// parcial (P1), cuándo empieza y termina la totalidad o anularidad (C2/C3),
// cuándo acaba el parcial (P4), la magnitud, el oscurecimiento del Sol y
// la altitud del Sol en el máximo.
//
// "Línea central" = la trayectoria que dibuja sobre la superficie de la
// Tierra el punto exacto donde la sombra de la Luna es total/anular.
// ============================================================

import { Body, Equator, Horizon, Observer, SiderealTime } from 'astronomy-engine'
import {
  besselianElements,
  eclipseStateAt,
  type BesselianElements,
  type EclipseState,
} from './besselian'
import { rayEllipsoid, ecefToGeodetic } from './earth'
import { AU_KM, EARTH_EQUATORIAL_RADIUS_KM, SUN_RADIUS_KM, MOON_RADIUS_KM } from './constants'

// Tipo local de eclipse tal y como se vería desde un punto concreto.
export type LocalKind = 'total' | 'annular' | 'partial' | 'none'

export interface LocalContactTimes {
  partialBegin?: Date
  totalBegin?: Date
  peak?: Date
  totalEnd?: Date
  partialEnd?: Date
}

export interface LocalCircumstances {
  kind: LocalKind
  visible: boolean
  contacts: LocalContactTimes
  /** magnitud en el máximo local (fracción del diámetro solar) */
  maxMagnitude: number
  /** oscurecimiento en el máximo local (fracción del área solar), 0..1 */
  obscuration: number
  /** altitud del Sol en el máximo local (grados) */
  sunAltitudeAtMax: number
  /** duración de totalidad/anularidad local (segundos) o null */
  centralDurationSec: number | null
  /** distancia mínima del eje al observador en el máximo (radios terrestres) */
  deltaAtMax: number
  maxState: EclipseState | null
}

const HOUR = 3600 * 1000

function refineCrossing(f: (t: Date) => number, aMs: number, bMs: number): Date {
  let a = aMs
  let b = bMs
  let fa = f(new Date(a))
  for (let i = 0; i < 80; i++) {
    const m = (a + b) / 2
    const fm = f(new Date(m))
    if (Math.sign(fa) !== Math.sign(fm)) {
      b = m
    } else {
      a = m
      fa = fm
    }
  }
  return new Date((a + b) / 2)
}

/**
 * Encuentra los cruces por cero de `f` en [loMs, hiMs] muestreando cada
 * `stepMs`. Devuelve los instantes (ya refinados).
 */
export function findCrossings(
  f: (t: Date) => number,
  loMs: number,
  hiMs: number,
  stepMs = 60 * 1000,
): Date[] {
  const out: Date[] = []
  let prev = loMs
  let prevVal = f(new Date(prev))
  for (let t = loMs + stepMs; t <= hiMs; t += stepMs) {
    const v = f(new Date(t))
    if (Math.sign(prevVal) !== Math.sign(v) && v !== 0) {
      out.push(refineCrossing(f, prev, t))
    } else if (v === 0) {
      out.push(new Date(t))
    }
    prev = t
    prevVal = v
  }
  return out
}

/** Estado (penumbra/umbra) en función del tiempo para un observador. */
function penumbraFn(lat: number, lon: number, heightKm: number) {
  return (t: Date) => {
    const s = eclipseStateAt(t, lat, lon, heightKm)
    return s.delta - s.l1p
  }
}

function umbraFn(lat: number, lon: number, heightKm: number) {
  return (t: Date) => {
    const s = eclipseStateAt(t, lat, lon, heightKm)
    return s.delta - s.l2p
  }
}

/**
 * Circunstancias locales del eclipse en el punto (lat, lon).
 * Busca contactos de penumbra y umbra/antumbra alrededor del máximo global.
 */
export function computeLocalCircumstances(
  globalPeak: Date,
  lat: number,
  lon: number,
  heightKm = 0,
): LocalCircumstances {
  const lo = +globalPeak - 4 * HOUR
  const hi = +globalPeak + 4 * HOUR

  const penCross = findCrossings(penumbraFn(lat, lon, heightKm), lo, hi)
  const umbCross = findCrossings(umbraFn(lat, lon, heightKm), lo, hi)

  // Máximo local: minimiza delta con muestreo grueso + refinado fino.
  let best: EclipseState | null = null
  let bestT = 0
  const step = 30 * 1000
  for (let t = lo; t <= hi; t += step) {
    const s = eclipseStateAt(new Date(t), lat, lon, heightKm)
    if (!best || s.delta < best.delta) {
      best = s
      bestT = t
    }
  }
  if (best) {
    for (let t = bestT - step; t <= bestT + step; t += 1000) {
      const s = eclipseStateAt(new Date(t), lat, lon, heightKm)
      if (s.delta < best.delta) best = s
    }
  }

  const maxState = best
  const deltaAtMax = best ? best.delta : Infinity

  const contacts: LocalContactTimes = {}
  if (penCross.length >= 2) {
    contacts.partialBegin = penCross[0]
    contacts.partialEnd = penCross[penCross.length - 1]
  }
  if (umbCross.length >= 2) {
    contacts.totalBegin = umbCross[0]
    contacts.totalEnd = umbCross[umbCross.length - 1]
  }
  if (maxState) contacts.peak = maxState.t

  const centralDurationSec =
    contacts.totalBegin && contacts.totalEnd
      ? (+contacts.totalEnd - +contacts.totalBegin) / 1000
      : null

  let kind: LocalKind = 'none'
  if (contacts.partialBegin) {
    kind = contacts.totalBegin ? (maxState && maxState.inTotal ? 'total' : 'annular') : 'partial'
  }

  let obscuration = 0
  let maxMagnitude = 0
  let sunAltitudeAtMax = 0
  if (maxState) {
    maxMagnitude = Math.max(0, Math.min(2, maxState.magnitude))
    obscuration = computeObscuration(maxState.t, lat, lon, heightKm)
    const obs = new Observer(lat, lon, heightKm * 1000)
    const eq = Equator(Body.Sun, maxState.t, obs, true, true)
    const hor = Horizon(maxState.t, obs, eq.ra, eq.dec, 'normal')
    sunAltitudeAtMax = hor.altitude
  }

  const visible = kind !== 'none' && sunAltitudeAtMax > 0

  return {
    kind,
    visible,
    contacts,
    maxMagnitude,
    obscuration,
    sunAltitudeAtMax,
    centralDurationSec,
    deltaAtMax,
    maxState,
  }
}

/**
 * Oscurecimiento del disco solar (fracción de área, 0..1) en el instante y
 * posición dados, usando radios aparentes y separación angular centro-centro.
 */
export function computeObscuration(t: Date, lat: number, lon: number, heightKm = 0): number {
  const obs = new Observer(lat, lon, heightKm * 1000)
  const eqSun = Equator(Body.Sun, t, obs, true, true)
  const eqMoon = Equator(Body.Moon, t, obs, true, true)
  const hSun = Horizon(t, obs, eqSun.ra, eqSun.dec, undefined)
  const hMoon = Horizon(t, obs, eqMoon.ra, eqMoon.dec, undefined)
  const altS = (hSun.altitude * Math.PI) / 180
  const azS = (hSun.azimuth * Math.PI) / 180
  const altM = (hMoon.altitude * Math.PI) / 180
  const azM = (hMoon.azimuth * Math.PI) / 180
  const cosSep =
    Math.sin(altS) * Math.sin(altM) + Math.cos(altS) * Math.cos(altM) * Math.cos(azS - azM)
  const sep = Math.acos(Math.max(-1, Math.min(1, cosSep)))

  const distSun = eqSun.dist * AU_KM
  const distMoon = eqMoon.dist * AU_KM
  const rSun = Math.asin(SUN_RADIUS_KM / distSun)
  const rMoon = Math.asin(MOON_RADIUS_KM / distMoon)

  return circleOverlapFraction(rSun, rMoon, sep)
}

/** Fracción del área del disco (R1=Sol) cubierta por el disco (R2=Luna). */
export function circleOverlapFraction(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0
  if (d <= Math.abs(r1 - r2)) {
    return r2 >= r1 ? 1 : (r2 * r2) / (r1 * r1)
  }
  const d2 = d * d
  const r12 = r1 * r1
  const r22 = r2 * r2
  const part1 = r12 * Math.acos((d2 + r12 - r22) / (2 * d * r1))
  const part2 = r22 * Math.acos((d2 + r22 - r12) / (2 * d * r2))
  const part3 =
    0.5 * Math.sqrt(Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)))
  return Math.max(0, Math.min(1, (part1 + part2 - part3) / (Math.PI * r12)))
}

// ---------------------------------------------------------------------------
// Línea central
// ---------------------------------------------------------------------------

export interface PathPoint {
  t: Date
  lat: number
  lon: number
  /** true si en ese punto la sombra es umbra (total); false si antumbra (anular) */
  total: boolean
  elements: BesselianElements
}

/**
 * Calcula la trayectoria del eje de la sombra sobre la superficie terrestre
 * (línea central) muestreando el elipsoide WGS84 alrededor del máximo.
 */
export function computeCentralLine(
  globalPeak: Date,
  halfSpanMs = 3 * HOUR,
  stepMs = 2 * 60 * 1000,
): PathPoint[] {
  const lo = +globalPeak - halfSpanMs
  const hi = +globalPeak + halfSpanMs
  const pts: PathPoint[] = []
  for (let t = lo; t <= hi; t += stepMs) {
    const tt = new Date(t)
    const el = besselianElements(tt)
    const Cx = (el.x * el.p.x + el.y * el.q.x) * EARTH_EQUATORIAL_RADIUS_KM
    const Cy = (el.x * el.p.y + el.y * el.q.y) * EARTH_EQUATORIAL_RADIUS_KM
    const Cz = (el.x * el.p.z + el.y * el.q.z) * EARTH_EQUATORIAL_RADIUS_KM
    const hit = rayEllipsoid(Cx, Cy, Cz, el.axis)
    if (!hit) continue
    const geo = ecefToGeodetic(hit.x, hit.y, hit.z)
    const gast = SiderealTime(tt) * 15
    const lon = (((Math.atan2(hit.y, hit.x) * 180) / Math.PI - gast) + 540) % 360 - 180
    const zeta =
      (hit.x * el.axis.x + hit.y * el.axis.y + hit.z * el.axis.z) / EARTH_EQUATORIAL_RADIUS_KM
    const l2p = el.l2 + zeta * Math.tan(el.f2)
    pts.push({ t: tt, lat: geo.lat, lon, total: l2p > 0, elements: el })
  }
  return pts
}

/** Determina el tipo global del eclipse a partir de la geometría besseliana. */
export type GlobalKind = 'total' | 'annular' | 'hybrid' | 'partial'

export function classifyGlobal(peak: Date): GlobalKind {
  const line = computeCentralLine(peak, 2.5 * HOUR, 10 * 60 * 1000)
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

/** Geometría global del eclipse en el máximo: gamma y punto de máxima magnitud. */
export function greatestGeometry(peak: Date): { gamma: number; lat: number; lon: number } {
  const el = besselianElements(peak)
  const gamma = Math.hypot(el.x, el.y)
  const Cx = (el.x * el.p.x + el.y * el.q.x) * EARTH_EQUATORIAL_RADIUS_KM
  const Cy = (el.x * el.p.y + el.y * el.q.y) * EARTH_EQUATORIAL_RADIUS_KM
  const Cz = (el.x * el.p.z + el.y * el.q.z) * EARTH_EQUATORIAL_RADIUS_KM
  const hit = rayEllipsoid(Cx, Cy, Cz, el.axis)
  if (!hit) return { gamma, lat: el.d, lon: el.u }
  const geo = ecefToGeodetic(hit.x, hit.y, hit.z)
  const gast = SiderealTime(peak) * 15
  const lon = (((Math.atan2(hit.y, hit.x) * 180) / Math.PI - gast) + 540) % 360 - 180
  return { gamma, lat: geo.lat, lon }
}
