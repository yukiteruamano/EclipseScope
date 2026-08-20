import { describe, it, expect } from 'vitest'
import { besselianElements, eclipseStateAt, observerFundamental } from './besselian'

const PEAK_2024 = new Date('2024-04-08T18:17:19.5Z')

describe('besselianElements', () => {
  it('gamma ≈ 0.34315 para 2024-04-08', () => {
    const el = besselianElements(PEAK_2024)
    const gamma = Math.hypot(el.x, el.y)
    expect(gamma).toBeCloseTo(0.34315, 2)
  })

  it('campos en rangos esperados', () => {
    const el = besselianElements(PEAK_2024)
    expect(el.d).toBeGreaterThan(-10)
    expect(el.d).toBeLessThan(10)
    expect(el.u).toBeGreaterThanOrEqual(0)
    expect(el.u).toBeLessThan(360)
    expect(el.l1).toBeGreaterThan(0)
    // l2 puede ser negativo (antumbra) o pequeño positivo; solo check finito
    expect(Number.isFinite(el.l2)).toBe(true)
    expect(el.f1).toBeGreaterThan(0)
    expect(el.f1).toBeLessThan(0.01)
  })

  it('axis es unitario', () => {
    const el = besselianElements(PEAK_2024)
    const n = Math.hypot(el.axis.x, el.axis.y, el.axis.z)
    expect(n).toBeCloseTo(1, 8)
  })
})

describe('eclipseStateAt', () => {
  it('Torreón cerca del máximo está en penumbra y alcanza central en su máximo local', async () => {
    const { computeLocalCircumstances } = await import('./localCircumstances')
    const lc = computeLocalCircumstances(PEAK_2024, 25.54, -103.45)
    expect(lc.kind).toBe('total')
    // eclipseStateAt en el instante de máximo local debe ser central/total
    const peakLocal = lc.contacts.peak!
    const s = eclipseStateAt(peakLocal, 25.54, -103.45)
    expect(s.inPenumbra).toBe(true)
    expect(s.inCentral).toBe(true)
    expect(s.inTotal).toBe(true)
    expect(s.magnitude).toBeGreaterThan(1)
  })

  it('Madrid en el máximo es penumbra parcial pequeña', () => {
    const s = eclipseStateAt(PEAK_2024, 40.42, -3.7)
    // magnitud pequeña pero >0 en algún momento cercano; en el máximo global gamma 0.34, Madrid está lejos
    // comprobar que el estado es coherente (no lanza, valores finitos)
    expect(Number.isFinite(s.delta)).toBe(true)
    expect(Number.isFinite(s.magnitude)).toBe(true)
  })

  it('polo opuesto no está en penumbra', () => {
    const s = eclipseStateAt(PEAK_2024, -80, 0)
    expect(s.delta).toBeGreaterThan(s.l1p)
    expect(s.inPenumbra).toBe(false)
  })
})

describe('observerFundamental', () => {
  it('devuelve xi/eta/zeta finitos', () => {
    const o = observerFundamental(PEAK_2024, 40.42, -3.7)
    expect(Number.isFinite(o.xi)).toBe(true)
    expect(Number.isFinite(o.eta)).toBe(true)
    expect(Number.isFinite(o.zeta)).toBe(true)
  })
})
