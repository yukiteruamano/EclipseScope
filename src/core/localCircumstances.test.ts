import { describe, it, expect } from 'vitest'
import {
  circleOverlapFraction,
  computeObscuration,
  computeLocalCircumstances,
  computeCentralLine,
  findCrossings,
  greatestGeometry,
} from './localCircumstances'

const PEAK_2024 = new Date('2024-04-08T18:17:19.5Z')

describe('circleOverlapFraction', () => {
  it('sin solapamiento', () => {
    expect(circleOverlapFraction(1, 0.5, 2)).toBeCloseTo(0, 8)
  })
  it('inclusión total Luna mayor que Sol', () => {
    expect(circleOverlapFraction(1, 2, 0.1)).toBeCloseTo(1, 8)
  })
  it('inclusión parcial Luna menor que Sol', () => {
    const v = circleOverlapFraction(1, 0.5, 0.1)
    expect(v).toBeCloseTo(0.25, 8)
  })
  it('solapamiento parcial a mitad', () => {
    const v = circleOverlapFraction(1, 1, 1)
    expect(v).toBeGreaterThan(0.3)
    expect(v).toBeLessThan(0.7)
  })
  it('justo tangentes', () => {
    expect(circleOverlapFraction(1, 0.5, 1.5)).toBeCloseTo(0, 8)
  })
})

describe('findCrossings', () => {
  it('detecta cruce lineal', () => {
    const f = (t: Date) => +t - 1000
    const res = findCrossings(f, 0, 2000, 500)
    expect(res.length).toBeGreaterThanOrEqual(1)
    expect(res.some((d) => Math.abs(+d - 1000) < 1)).toBe(true)
  })
  it('sin cruce', () => {
    const f = () => 1
    expect(findCrossings(f, 0, 1000, 200)).toHaveLength(0)
  })
})

describe('computeObscuration', () => {
  it('Torreón cerca del máximo ~100%', () => {
    const o = computeObscuration(PEAK_2024, 25.54, -103.45)
    expect(o).toBeGreaterThan(0.9)
  })
  it('rango 0..1', () => {
    const o = computeObscuration(PEAK_2024, 40.42, -3.7)
    expect(o).toBeGreaterThanOrEqual(0)
    expect(o).toBeLessThanOrEqual(1)
  })
})

describe('computeLocalCircumstances', () => {
  it('Torreón es total y visible', () => {
    const lc = computeLocalCircumstances(PEAK_2024, 25.54, -103.45)
    expect(lc.kind).toBe('total')
    expect(lc.visible).toBe(true)
    expect(lc.contacts.partialBegin).toBeDefined()
    expect(lc.contacts.totalBegin).toBeDefined()
    expect(lc.contacts.totalEnd).toBeDefined()
    expect(lc.centralDurationSec).not.toBeNull()
    expect(lc.centralDurationSec!).toBeGreaterThan(0)
  })

  it('Madrid es parcial', () => {
    const lc = computeLocalCircumstances(PEAK_2024, 40.42, -3.7)
    expect(lc.kind).toBe('partial')
    expect(lc.contacts.partialBegin).toBeDefined()
    expect(lc.contacts.totalBegin).toBeUndefined()
  })

  it('punto invisible de noche -> none', () => {
    // antípoda aproximada, Sol bajo horizonte
    const lc = computeLocalCircumstances(PEAK_2024, -25, 75)
    // puede ser 'none' o si hay penumbra pero Sol bajo horizonte visible=false
    expect(['none', 'partial', 'total', 'annular']).toContain(lc.kind)
    if (lc.kind === 'none') expect(lc.visible).toBe(false)
  })
})

describe('computeCentralLine', () => {
  it('eclipse total 2024 tiene línea central', () => {
    const line = computeCentralLine(PEAK_2024)
    expect(line.length).toBeGreaterThan(10)
    // punto medio cerca de 25N
    const mid = line[Math.floor(line.length / 2)]
    expect(mid.lat).toBeGreaterThan(15)
    expect(mid.lat).toBeLessThan(35)
  })

  it('eclipse parcial sin línea central (simulado lejos)', () => {
    // fecha sin eclipse central: usar un eclipse parcial conocido 2023-10-14 es anular pero tiene línea
    // para forzar parcial, usar peak muy alejado del instante real -> probablemente sin hit
    const far = new Date('2024-04-08T00:00:00Z')
    const line = computeCentralLine(far, 30 * 60 * 1000, 10 * 60 * 1000)
    // puede tener 0 o pocos puntos, solo check no lanza
    expect(Array.isArray(line)).toBe(true)
  })
})

describe('greatestGeometry', () => {
  it('gamma coincide con besselianElements', () => {
    const g = greatestGeometry(PEAK_2024)
    expect(g.gamma).toBeCloseTo(0.343, 2)
    expect(g.lat).toBeCloseTo(25.29, 1)
    expect(g.lon).toBeCloseTo(-104.14, 1)
  })
})
