import { describe, it, expect } from 'vitest'
import { formatUTC, formatLocal, formatUTCTime, formatUTCDate, formatLat, formatLon, formatDuration, formatRelative, formatTimeLocal } from './time'

describe('format helpers', () => {
  it('formatUTC contiene fecha y hora', () => {
    const d = new Date('2024-04-08T18:17:19Z')
    expect(formatUTC(d)).toContain('2024')
  })
  it('formatUTCTime', () => {
    expect(formatUTCTime(new Date('2024-04-08T18:17:19Z'))).toMatch(/\d{2}:\d{2}/)
  })
  it('formatUTCDate', () => {
    expect(formatUTCDate(new Date('2024-04-08T18:17:19Z'))).toContain('abr')
  })
  it('formatLocal con tz', () => {
    const s = formatLocal(new Date('2024-04-08T18:17:19Z'), 'Europe/Madrid')
    expect(s.length).toBeGreaterThan(5)
  })
  it('formatTimeLocal', () => {
    const s = formatTimeLocal(new Date('2024-04-08T18:17:19Z'), 'UTC')
    expect(s).toMatch(/\d{2}:\d{2}/)
  })
  it('formatLat/formatLon', () => {
    expect(formatLat(25.29)).toBe('25.29°N')
    expect(formatLat(-10)).toBe('10.00°S')
    expect(formatLon(-104.14)).toBe('104.14°O')
    expect(formatLon(10)).toBe('10.00°E')
  })
  it('formatDuration', () => {
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(0)).toBe('—')
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(90)).toBe('1m 30s')
    expect(formatDuration(3690)).toBe('61m 30s')
  })
  it('formatRelative', () => {
    expect(formatRelative(0)).toBe('en 0 días')
    expect(formatRelative(24 * 3600 * 1000)).toBe('en 1 día')
    expect(formatRelative(-24 * 3600 * 1000)).toBe('hace 1 día')
    expect(formatRelative(100 * 24 * 3600 * 1000)).toMatch(/meses/)
    expect(formatRelative(800 * 24 * 3600 * 1000)).toMatch(/años/)
  })
})
