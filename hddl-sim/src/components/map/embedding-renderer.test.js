import { describe, it, expect } from 'vitest'

import {
  getEmbeddingTypeLabel,
  getStewardColor,
  computeEmbeddingBoxBounds,
  computeEmbeddingNormalizedPosition,
  computeEmbeddingTargetPosition,
  computeEmbeddingPerspectiveParams,
  buildEmbeddingTooltipData,
  computeEmbeddingBadgeWidth,
  computeEmbeddingBadgeLayout,
  computeEmbeddingFloorPolygonPoints,
  computeEmbeddingVerticalGridLine,
  computeEmbeddingHorizontalGridT,
  computeEmbeddingHorizontalGridLineOpacity,
  computeEmbeddingHorizontalGridLine,
  computeEmbeddingFrontGlowRect,
  computeEmbeddingFrontWallHeight,
  computeEmbeddingFrontWallRect,
  computeEmbeddingDepthAxisLabelTransform,
  computeEmbeddingChipFacePoints,
  computeEmbeddingChipFrontFaceAttrs,
  computeEmbeddingChipTransform,
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

  it('computeEmbeddingBadgeWidth clamps to min width and accounts for padding', () => {
    expect(computeEmbeddingBadgeWidth({ badgeTextWidth: 0, badgePaddingX: 12, minWidth: 70 })).toBe(70)
    expect(computeEmbeddingBadgeWidth({ badgeTextWidth: 10, badgePaddingX: 12, minWidth: 70 })).toBe(70)
    // 100 + 24 = 124
    expect(computeEmbeddingBadgeWidth({ badgeTextWidth: 100, badgePaddingX: 12, minWidth: 70 })).toBe(124)
  })

  it('computeEmbeddingBadgeLayout wraps when badge would overflow', () => {
    // Wide enough: inline
    const inline = computeEmbeddingBadgeLayout({ titleWidth: 100, badgeWidth: 70, svgWidth: 500 })
    expect(inline.wrapped).toBe(false)
    expect(inline.badgeY).toBe(-8)
    expect(inline.transform).toMatch(/^translate\(\d+, -8\)$/)

    // Too narrow: wrapped to next line at titleX
    const wrapped = computeEmbeddingBadgeLayout({ titleWidth: 300, badgeWidth: 150, svgWidth: 400 })
    expect(wrapped.wrapped).toBe(true)
    expect(wrapped.badgeX).toBe(22)
    expect(wrapped.badgeY).toBe(12)
    expect(wrapped.transform).toBe('translate(22, 12)')
  })

  it('grid and box geometry helpers compute expected values', () => {
    const bounds = computeEmbeddingBoxBounds({ width: 100, embeddingStoreHeight: 200 })
    const floorDepthRange = bounds.frontY - bounds.backY

    const points = computeEmbeddingFloorPolygonPoints({
      backLeft: bounds.backLeft,
      backRight: bounds.backRight,
      frontRight: bounds.frontRight,
      frontLeft: bounds.frontLeft,
      backY: bounds.backY,
      frontY: bounds.frontY,
    })
    expect(points).toContain(`${bounds.backLeft},${bounds.backY}`)
    expect(points).toContain(`${bounds.frontLeft},${bounds.frontY}`)

    const v0 = computeEmbeddingVerticalGridLine({ index: 0, count: 7, backY: bounds.backY, frontY: bounds.frontY, getXAtDepth: bounds.getXAtDepth })
    expect(v0.normalizedX).toBe(0)
    expect(v0.x1).toBe(bounds.backLeft)
    expect(v0.x2).toBe(bounds.frontLeft)

    const h0 = computeEmbeddingHorizontalGridLine({ index: 0, count: 6, backY: bounds.backY, floorDepthRange, getXAtDepth: bounds.getXAtDepth })
    expect(h0.t).toBe(0)
    expect(h0.y1).toBe(bounds.backY)
    expect(h0.x1).toBe(bounds.backLeft)
    expect(h0.x2).toBe(bounds.backRight)
    expect(h0.opacity).toBeCloseTo(0.15)

    const h6 = computeEmbeddingHorizontalGridLine({ index: 6, count: 6, backY: bounds.backY, floorDepthRange, getXAtDepth: bounds.getXAtDepth })
    expect(h6.t).toBe(1)
    expect(h6.y1).toBeCloseTo(bounds.frontY)
    expect(h6.x1).toBe(bounds.frontLeft)
    expect(h6.x2).toBe(bounds.frontRight)
    expect(h6.opacity).toBeCloseTo(0.5)

    expect(computeEmbeddingHorizontalGridT({ index: 3, count: 6, exponent: 1 })).toBeCloseTo(0.5)
    expect(computeEmbeddingHorizontalGridLineOpacity({ t: 0 })).toBeCloseTo(0.15)
    expect(computeEmbeddingHorizontalGridLineOpacity({ t: 1 })).toBeCloseTo(0.5)

    const glow = computeEmbeddingFrontGlowRect({ frontLeft: bounds.frontLeft, frontRight: bounds.frontRight, frontY: bounds.frontY })
    expect(glow).toEqual({ x: bounds.frontLeft, y: bounds.frontY - 25, width: bounds.frontRight - bounds.frontLeft, height: 30 })

    const wallHeight = computeEmbeddingFrontWallHeight({ floorDepthRange, factor: 0.7 })
    expect(wallHeight).toBeCloseTo(floorDepthRange * 0.7)
    const wallRect = computeEmbeddingFrontWallRect({ frontLeft: bounds.frontLeft, frontRight: bounds.frontRight, frontY: bounds.frontY, frontWallHeight: wallHeight, extraHeight: 5 })
    expect(wallRect.x).toBe(bounds.frontLeft)
    expect(wallRect.y).toBeCloseTo(bounds.frontY - wallHeight)
    expect(wallRect.width).toBe(bounds.frontRight - bounds.frontLeft)
    expect(wallRect.height).toBeCloseTo(wallHeight + 5)

    expect(computeEmbeddingDepthAxisLabelTransform({ frontLeft: bounds.frontLeft, backY: bounds.backY, frontY: bounds.frontY, offsetX: 5 }))
      .toBe(`rotate(-90, ${bounds.frontLeft - 5}, ${(bounds.backY + bounds.frontY) / 2})`)
  })

  it('chip helpers compute points, attrs, and transform deterministically', () => {
    const faces = computeEmbeddingChipFacePoints({ chipSize: 16, depth3D: 5 })
    expect(faces.top).toContain('-8,-13')
    expect(faces.right).toContain('8,-13')

    const hist = computeEmbeddingChipFrontFaceAttrs({ embeddingColor: '#abc', isHistorical: true })
    expect(hist.strokeWidth).toBe(1)
    expect(hist.filter).toBe('none')
    expect(hist.strokeDasharray).toBe('2 2')
    expect(hist.stopOpacityStart).toBe(0.7)
    expect(hist.stopOpacityEnd).toBe(0.65)

    const cur = computeEmbeddingChipFrontFaceAttrs({ embeddingColor: '#abc', isHistorical: false })
    expect(cur.strokeWidth).toBe(1.5)
    expect(cur.filter).toBe('drop-shadow(0 0 6px #abc)')
    expect(cur.strokeDasharray).toBe(null)
    expect(cur.stopOpacityStart).toBe(1)
    expect(cur.stopOpacityEnd).toBe(0.95)

    expect(computeEmbeddingChipTransform({ x: 10, y: 20, perspectiveScale: 0.75, rotateAngle: -5 }))
      .toBe('translate(10, 20) scale(0.75) rotate(-5)')
  })
})
