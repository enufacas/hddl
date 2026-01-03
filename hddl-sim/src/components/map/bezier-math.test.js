import { describe, it, expect } from 'vitest'
import { bezierPoint, makeFlowCurve } from './bezier-math'

describe('bezierPoint', () => {
  it('returns start point at t=0', () => {
    const p0 = { x: 0, y: 0 }
    const p1 = { x: 10, y: 10 }
    const p2 = { x: 20, y: 10 }
    const p3 = { x: 30, y: 0 }
    
    const result = bezierPoint(0, p0, p1, p2, p3)
    expect(result.x).toBeCloseTo(0)
    expect(result.y).toBeCloseTo(0)
  })

  it('returns end point at t=1', () => {
    const p0 = { x: 0, y: 0 }
    const p1 = { x: 10, y: 10 }
    const p2 = { x: 20, y: 10 }
    const p3 = { x: 30, y: 0 }
    
    const result = bezierPoint(1, p0, p1, p2, p3)
    expect(result.x).toBeCloseTo(30)
    expect(result.y).toBeCloseTo(0)
  })

  it('returns midpoint influenced by control points at t=0.5', () => {
    const p0 = { x: 0, y: 0 }
    const p1 = { x: 10, y: 10 }
    const p2 = { x: 20, y: 10 }
    const p3 = { x: 30, y: 0 }
    
    const result = bezierPoint(0.5, p0, p1, p2, p3)
    // Should be influenced by control points, not just linear midpoint
    expect(result.x).toBeCloseTo(15)
    expect(result.y).toBeGreaterThan(0) // Pulled up by control points
  })

  it('produces smooth curve with multiple points', () => {
    const p0 = { x: 0, y: 0 }
    const p1 = { x: 10, y: 10 }
    const p2 = { x: 20, y: 10 }
    const p3 = { x: 30, y: 0 }
    
    const points = [0, 0.25, 0.5, 0.75, 1].map(t => bezierPoint(t, p0, p1, p2, p3))
    
    // Check monotonically increasing x
    for (let i = 1; i < points.length; i++) {
      expect(points[i].x).toBeGreaterThan(points[i - 1].x)
    }
  })
})

describe('makeFlowCurve', () => {
  it('returns control points with correct start and end', () => {
    const result = makeFlowCurve(0, 0, 100, 100)
    
    expect(result.p0).toEqual({ x: 0, y: 0 })
    expect(result.p3).toEqual({ x: 100, y: 100 })
  })

  it('generates control points perpendicular to line', () => {
    // Horizontal line
    const result = makeFlowCurve(0, 50, 100, 50)
    
    // Control points should be offset vertically (perpendicular)
    expect(result.p1.x).toBeGreaterThan(0)
    expect(result.p1.x).toBeLessThan(100)
    expect(result.p2.x).toBeGreaterThan(0)
    expect(result.p2.x).toBeLessThan(100)
    
    // Y offset should be non-zero (perpendicular offset)
    expect(Math.abs(result.p1.y - 50)).toBeGreaterThan(0)
    expect(Math.abs(result.p2.y - 50)).toBeGreaterThan(0)
  })

  it('respects sign parameter for curve direction', () => {
    const result1 = makeFlowCurve(0, 0, 100, 0, -1)
    const result2 = makeFlowCurve(0, 0, 100, 0, 1)
    
    // Control points should be on opposite sides
    expect(result1.p1.y).toBeCloseTo(-result2.p1.y)
    expect(result1.p2.y).toBeCloseTo(-result2.p2.y)
  })

  it('uses default sign of -1', () => {
    const resultDefault = makeFlowCurve(0, 0, 100, 0)
    const resultExplicit = makeFlowCurve(0, 0, 100, 0, -1)
    
    expect(resultDefault.p1).toEqual(resultExplicit.p1)
    expect(resultDefault.p2).toEqual(resultExplicit.p2)
  })

  it('handles vertical lines', () => {
    const result = makeFlowCurve(50, 0, 50, 100)
    
    expect(result.p0).toEqual({ x: 50, y: 0 })
    expect(result.p3).toEqual({ x: 50, y: 100 })
    
    // Control points should be offset horizontally
    expect(Math.abs(result.p1.x - 50)).toBeGreaterThan(0)
    expect(Math.abs(result.p2.x - 50)).toBeGreaterThan(0)
  })

  it('caps offset magnitude for long distances', () => {
    const shortResult = makeFlowCurve(0, 0, 100, 0)
    const longResult = makeFlowCurve(0, 0, 1000, 0)
    
    // Long distance should not produce proportionally larger offset
    const shortOffset = Math.abs(shortResult.p1.y)
    const longOffset = Math.abs(longResult.p1.y)
    
    // Long offset should be capped (not 10x larger)
    expect(longOffset).toBeLessThan(shortOffset * 3)
  })
})
