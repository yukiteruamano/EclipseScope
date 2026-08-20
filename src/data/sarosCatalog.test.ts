import { describe, it, expect } from 'vitest'
import { lookupCatalogSaros } from './sarosCatalog'

describe('lookupCatalogSaros', () => {
  it('encuentra 2024-04-08', () => {
    expect(lookupCatalogSaros(new Date('2024-04-08T18:17:19.5Z'))).toBe(139)
  })
  it('tolerancia 12h', () => {
    expect(lookupCatalogSaros(new Date('2024-04-08T20:00:00Z'))).toBe(139)
  })
  it('fuera de tolerancia undefined', () => {
    expect(lookupCatalogSaros(new Date('2025-01-01T00:00:00Z'))).toBeUndefined()
  })
})
