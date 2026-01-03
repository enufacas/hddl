import { describe, it, expect } from 'vitest'

import {
  getEmbeddingTypeLabel,
  getStewardColor,
  computeEmbeddingBoxBounds,
  computeEmbeddingNormalizedPosition,
  computeEmbeddingTargetPosition,
  computeEmbeddingPerspectiveParams,
  buildEmbeddingTooltipData,
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

  it('computeEmbeddingNormalizedPosition uses semanticVector when present', () => {
    const scenario = { envelopes: [{ envelopeId: 'E1' }], durationHours: 24 }
    const event = { semanticVector: [0.25, 0.75], hour: 10, envelopeId: 'E1', embeddingType: 'decision' }

    const { normalizedX, depthT, usedSemanticVector } = computeEmbeddingNormalizedPosition({ event, scenario })
    expect(usedSemanticVector).toBe(true)
    expect(normalizedX).toBeCloseTo(0.1 + 0.25 * 0.8)
    expect(depthT).toBeCloseTo(0.1 + 0.75 * 0.8)
  })

  it('computeEmbeddingNormalizedPosition falls back to envelope/time/type bias when missing semanticVector', () => {
    const scenario = {
      durationHours: 20,
      envelopes: [{ envelopeId: 'A' }, { envelopeId: 'B' }, { envelopeId: 'C' }],
    }

    const event = {
      eventId: 'EV1',
      envelopeId: 'B',
      hour: 10,
      embeddingType: 'signal',
      semanticContext: 'hello',
    }

    const { normalizedX, depthT, usedSemanticVector } = computeEmbeddingNormalizedPosition({ event, scenario })
    expect(usedSemanticVector).toBe(false)
    // Normalized bounds
    expect(normalizedX).toBeGreaterThanOrEqual(0.08)
    expect(normalizedX).toBeLessThanOrEqual(0.92)
    expect(depthT).toBeGreaterThanOrEqual(0.05)
    expect(depthT).toBeLessThanOrEqual(0.95)
  })

  it('computeEmbeddingNormalizedPosition places historical embeddings toward the back', () => {
    const scenario = {
      durationHours: 20,
      envelopes: [{ envelopeId: 'A' }],
    }

    const event = {
      envelopeId: 'A',
      hour: -5,
      embeddingType: 'decision',
      semanticContext: 'baseline',
    }

    const { depthT } = computeEmbeddingNormalizedPosition({ event, scenario })
    // Should be near the back range (after bias/offset/clamp)
    expect(depthT).toBeLessThan(0.4)
  })

  it('computeEmbeddingTargetPosition uses bounds.getXAtDepth and backY + depthT*range', () => {
    const bounds = computeEmbeddingBoxBounds({ width: 100, embeddingStoreHeight: 200 })
    const floorDepthRange = bounds.frontY - bounds.backY

    const normalizedX = 0.5
    const depthT = 0.25
    const { targetX, targetY, depthZ } = computeEmbeddingTargetPosition({
      normalizedX,
      depthT,
      box3DBounds: bounds,
      floorDepthRange,
    })

    expect(targetX).toBe(bounds.getXAtDepth(normalizedX, depthT))
    expect(targetY).toBeCloseTo(bounds.backY + depthT * floorDepthRange)
    expect(depthZ).toBeCloseTo(depthT * 100)
  })

  it('computeEmbeddingPerspectiveParams is deterministic with injected random', () => {
    const depthT = 0.25
    const params = computeEmbeddingPerspectiveParams({ depthT, random: () => 0.5 })
    // random=0.5 => wobble=0
    expect(params.randomWobble).toBe(0)
    expect(params.rotateAngle).toBeCloseTo(params.perspectiveTilt)
    expect(params.perspectiveScale).toBeCloseTo(0.45 + depthT * 0.55)
    expect(params.depthOpacity).toBeCloseTo(0.5 + depthT * 0.5)
  })

  it('buildEmbeddingTooltipData formats expected fields and historical flag', () => {
    const event = {
      embeddingType: 'revision',
      label: 'Policy change',
      actorRole: 'Data Steward',
      envelopeId: 'ENV-9',
      embeddingId: 'EMB-1',
      eventId: 'E-1',
      semanticContext: 'context',
      hour: -1,
    }

    const data = buildEmbeddingTooltipData(event)
    expect(data.type).toBe(getEmbeddingTypeLabel('revision'))
    expect(data.label).toBe('Policy change')
    expect(data.steward).toBe('Data Steward')
    expect(data.envelope).toBe('ENV-9')
    expect(data.id).toBe('EMB-1')
    expect(data.context).toBe('context')
    expect(data.hour).toBe(-1)
    expect(data.isHistorical).toBe(true)
  })
})
