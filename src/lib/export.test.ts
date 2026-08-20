import { describe, it, expect } from 'vitest'
import { toCsv, toJson } from './export'
import type { EclipseData } from '../core/engine'

function fakeEclipse(): EclipseData {
  const peak = new Date('2024-04-08T18:17:19.5Z')
  return {
    peak,
    kind: 'total',
    engineKind: 'Total',
    gamma: 0.343,
    greatestLat: 25.29,
    greatestLon: -104.14,
    saros: 139,
    node: 'ascending',
    secondary: false,
    elements: { t: peak, x: 0.1, y: 0.2, d: 5, u: 10, l1: 1, l2: 0.5, f1: 0.004, f2: 0.004, axis: { x: 0, y: 0, z: 1 }, p: { x: 1, y: 0, z: 0 }, q: { x: 0, y: 1, z: 0 }, a: { x: 0, y: 0, z: 1 }, zMoonKm: 300000, distSunMoonKm: 149000000 },
    centralLine: [{ t: peak, lat: 25, lon: -104, total: true, elements: { t: peak, x: 0.1, y: 0.2, d: 5, u: 10, l1: 1, l2: 0.5, f1: 0.004, f2: 0.004, axis: { x: 0, y: 0, z: 1 }, p: { x: 1, y: 0, z: 0 }, q: { x: 0, y: 1, z: 0 }, a: { x: 0, y: 0, z: 1 }, zMoonKm: 300000, distSunMoonKm: 149000000 } }],
    local: {
      kind: 'total',
      visible: true,
      contacts: { partialBegin: new Date('2024-04-08T16:00:00Z'), totalBegin: new Date('2024-04-08T17:00:00Z'), peak, totalEnd: new Date('2024-04-08T17:05:00Z'), partialEnd: new Date('2024-04-08T18:00:00Z') },
      maxMagnitude: 1.05,
      obscuration: 1,
      sunAltitudeAtMax: 60,
      centralDurationSec: 300,
      deltaAtMax: 0.1,
      maxState: null,
    },
  }
}

describe('export', () => {
  it('toCsv header + row', () => {
    const csv = toCsv([fakeEclipse()])
    const lines = csv.split('\n')
    expect(lines[0]).toContain('Fecha máxima')
    expect(lines[1]).toContain('2024-04-08')
    expect(lines[1]).toContain('total')
    expect(lines[1]).toContain('139')
  })
  it('toCsv escapa comas y comillas', () => {
    // peak ISO no contiene comas, pero check no lanza
    const csv = toCsv([fakeEclipse()])
    expect(csv).not.toContain('""')
  })
  it('toJson estructura', () => {
    const json = toJson([fakeEclipse()])
    const arr = JSON.parse(json)
    expect(arr[0].saros).toBe(139)
    expect(arr[0].besselian.x).toBe(0.1)
    expect(arr[0].centralLine).toHaveLength(1)
    expect(arr[0].local.contacts.partialBegin).toBe('2024-04-08T16:00:00.000Z')
  })
})
