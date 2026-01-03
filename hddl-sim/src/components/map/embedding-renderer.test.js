import { describe, it, expect } from 'vitest'

import {
  getEmbeddingTypeLabel,
  getStewardColor,
  computeEmbeddingBoxBounds,
} from './embedding-renderer.js'

describe('embedding-renderer helpers', () => {
  it('getEmbeddingTypeLabel maps known types and falls back', () => {
    expect(getEmbeddingTypeLabel('decision')).toBe('Decision Pattern')
    expect(getEmbeddingTypeLabel('boundary_interaction')).toBe('Boundary Interaction')

    // Unknown type should round-trip the key
    expect(getEmbeddingTypeLabel('custom_type')).toBe('custom_type')

    // Empty/absent should yield a generic label
    expect(getEmbeddingTypeLabel(undefined)).toBe('Embedding')
    expect(getEmbeddingTypeLabel('')).toBe('Embedding')
  })

  it('getStewardColor maps known roles and uses fallback', () => {
    expect(getStewardColor('Data Steward')).toBe('#4B96FF')

    // Unknown role uses default fallback
    expect(getStewardColor('Unknown Role')).toBe('var(--status-warning)')

    // Custom fallback overrides default
    expect(getStewardColor('Unknown Role', 'x')).toBe('x')
  })

  it('computeEmbeddingBoxBounds returns expected perspective geometry', () => {
    const bounds = computeEmbeddingBoxBounds({ width: 100, embeddingStoreHeight: 200 })

    expect(bounds.backY).toBe(50)
    expect(bounds.frontY).toBe(192)

    expect(bounds.backLeft).toBe(25)
    expect(bounds.backRight).toBe(75)

    expect(bounds.frontLeft).toBe(8)
    expect(bounds.frontRight).toBe(92)

    // At depth 0, map across the back edge
    expect(bounds.getXAtDepth(0, 0)).toBe(25)
    expect(bounds.getXAtDepth(1, 0)).toBe(75)

    // At depth 1, map across the front edge
    expect(bounds.getXAtDepth(0, 1)).toBe(8)
    expect(bounds.getXAtDepth(1, 1)).toBe(92)

    // Midpoints should be interpolated
    expect(bounds.getXAtDepth(0.5, 0)).toBe(50)
    expect(bounds.getXAtDepth(0.5, 1)).toBe(50)

    // A depth between should land between back and front at same normalizedX
    const midDepth = bounds.getXAtDepth(0.25, 0.5)
    expect(midDepth).toBeGreaterThan(8)
    expect(midDepth).toBeLessThan(75)
  })
})
