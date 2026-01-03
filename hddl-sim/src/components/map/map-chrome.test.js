import { describe, expect, test } from 'vitest'
import {
  computeCycleGeometry,
  computeCycleLoopPath,
  computeColumnLayout,
  computeEarthImageLayout,
  computeEarthImageTransform,
  computeHeaderFontSize,
  computePlanetClipEllipse,
  shouldRenderTelemetryHeader,
} from './map-chrome'

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

  test('computeHeaderFontSize uses smaller size on MINIMAL', () => {
    const DETAIL_LEVELS = { MINIMAL: 'MINIMAL', STANDARD: 'STANDARD', FULL: 'FULL' }
    expect(computeHeaderFontSize({ detailLevel: DETAIL_LEVELS.MINIMAL, DETAIL_LEVELS })).toBe('8px')
    expect(computeHeaderFontSize({ detailLevel: DETAIL_LEVELS.STANDARD, DETAIL_LEVELS })).toBe('10px')
    expect(computeHeaderFontSize({ detailLevel: DETAIL_LEVELS.FULL, DETAIL_LEVELS })).toBe('10px')
  })

  test('shouldRenderTelemetryHeader only enables STANDARD and FULL', () => {
    const DETAIL_LEVELS = { MINIMAL: 'MINIMAL', STANDARD: 'STANDARD', FULL: 'FULL' }
    expect(shouldRenderTelemetryHeader({ detailLevel: DETAIL_LEVELS.MINIMAL, DETAIL_LEVELS })).toBe(false)
    expect(shouldRenderTelemetryHeader({ detailLevel: DETAIL_LEVELS.STANDARD, DETAIL_LEVELS })).toBe(true)
    expect(shouldRenderTelemetryHeader({ detailLevel: DETAIL_LEVELS.FULL, DETAIL_LEVELS })).toBe(true)
  })

  test('computePlanetClipEllipse scales rx with width', () => {
    expect(computePlanetClipEllipse({ width: 1000 })).toEqual({
      cx: 500,
      cy: 40,
      rx: 480,
      ry: 80,
    })
  })

  test('computeEarthImageLayout uses 90% width and stable header-covering Y', () => {
    const layout = computeEarthImageLayout({ width: 1000 })
    expect(layout).toEqual({
      earthImageWidth: 900,
      earthImageHeight: 180,
      earthImageX: 50,
      earthImageY: -80,
    })
  })

  test('computeEarthImageTransform flips around derived baseline', () => {
    expect(computeEarthImageTransform({ earthImageY: -80, earthImageHeight: 180 }))
      .toBe('scale(1, -1) translate(0, -20)')
  })
})
