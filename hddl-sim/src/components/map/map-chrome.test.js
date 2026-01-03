import { describe, expect, test } from 'vitest'
import { computeCycleGeometry, computeCycleLoopPath, computeColumnLayout } from './map-chrome'

describe('map/map-chrome', () => {
  test('computeColumnLayout uses 35/38/27 split and returns centers/edges', () => {
    const layout = computeColumnLayout({ width: 1000 })
    expect(layout.col1Width).toBe(350)
    expect(layout.col2Width).toBe(380)
    expect(layout.col3Width).toBe(270)

    expect(layout.col1Center).toBe(175)
    expect(layout.col2Center).toBe(350 + 190)
    expect(layout.col3Center).toBe(350 + 380 + 135)

    expect(layout.col1Left).toBe(0)
    expect(layout.col1Right).toBe(350)
    expect(layout.col3Left).toBe(350 + 380)
  })

  test('computeCycleGeometry derives mid and clamps ry', () => {
    const g = computeCycleGeometry({ mapHeight: 500 })
    // cycleYTop=100, cycleYBottom=452 => mid=276
    expect(g.cycleYMid).toBe((100 + (500 - 48)) / 2)
    expect(g.cycleRy).toBeGreaterThanOrEqual(65)
  })

  test('computeCycleLoopPath uses rx min 80 and returns an SVG arc path', () => {
    const d = computeCycleLoopPath({ x1: 0, x2: 10, cycleYMid: 50, cycleRy: 65 })
    // abs(10-0)*0.55=5.5 => rx should clamp to 80
    expect(d).toContain('A 80 65')
    expect(d).toContain('M 0 50')
    expect(d).toContain('10 50')
  })
})
