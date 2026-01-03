import { describe, it, expect } from 'vitest'

import {
  computeEnvelopeGroupScale,
  computeEnvelopeBodyRect,
  computeEnvelopeAccentColor,
  computeEnvelopeBodyStroke,
  computeEnvelopeStrokeWidth,
  computeEnvelopeStrokeDasharray,
  computeEnvelopeOpacity,
  computeEnvelopeIconStatusFill,
  computeEnvelopeIconStatusOpacity,
  computeEnvelopeIconCircleStroke,
  computeEnvelopeIconCircleStrokeWidth,
  computeEnvelopeGlowRect,
  computeEnvelopeGlowKeyframeOpacity,
  computeEnvelopeRevisionBurstKeyframes,
  computeEnvelopeStatusLabelY,
  computeEnvelopeStatusLabelOpacity,
  computeEnvelopeStatusLabelText,
  computeEnvelopeVersionBadgeTransform,
  computeEnvelopeVersionBadgeBgRect,
  computeEnvelopeVersionBadgeBgFill,
  computeEnvelopeVersionBadgeBgStroke,
  computeEnvelopeVersionBadgeTextFill,
  computeEnvelopeVersionBadgeFontSize,
  computeEnvelopeVersionBadgeText,
  computeEnvelopeFlapFill,
  computeEnvelopeFlapOpacity,
  computeEnvelopeFoldOpacity,
  computeEnvelopeFlapPath,
  computeEnvelopeFoldPath,
  computeEnvelopeTestId,
  computeEnvelopeIconRadius,
  computeEnvelopeIconStatusRadius,
  computeEnvelopeBodyCornerRadius,
  computeEnvelopeBodyEnterStrokeWidth,
  computeEnvelopeBodyRectFromDims,
  computeEnvelopeBodyTestId,
  computeEnvelopeGlowPhaseOpacity,
  computeEnvelopeGlowPhaseOpacityForDatum,
  computeEnvelopeGlowStroke,
  computeEnvelopeStatusLabelFontSize,
} from './envelope-renderer.js'

describe('envelope-renderer helpers', () => {
  it('computeEnvelopeGroupScale returns expected scales', () => {
    expect(computeEnvelopeGroupScale('active')).toBe(1.0)
    expect(computeEnvelopeGroupScale('pending')).toBe(0.92)
    expect(computeEnvelopeGroupScale('ended')).toBe(0.85)
    expect(computeEnvelopeGroupScale('unknown')).toBe(0.85)
    expect(computeEnvelopeGroupScale(undefined)).toBe(0.85)
  })

  it('computeEnvelopeBodyRect enforces minimum size and centers', () => {
    const rect = computeEnvelopeBodyRect({ r: 0, isRecentlyRevised: false })
    expect(rect).toEqual({ x: -42, y: -26, width: 84, height: 52 })

    const rect2 = computeEnvelopeBodyRect({ r: 30, isRecentlyRevised: false })
    expect(rect2.width).toBeGreaterThanOrEqual(84)
    expect(rect2.height).toBeGreaterThanOrEqual(52)
    expect(rect2.x).toBeCloseTo(-rect2.width / 2)
    expect(rect2.y).toBeCloseTo(-rect2.height / 2)

    const revised = computeEnvelopeBodyRect({ r: 30, isRecentlyRevised: true })
    expect(revised.width).toBeGreaterThan(rect2.width)
    expect(revised.height).toBeGreaterThan(rect2.height)
  })

  it('computeEnvelopeBodyRectFromDims centers the rect', () => {
    expect(computeEnvelopeBodyRectFromDims({ width: 84, height: 52 })).toEqual({ x: -42, y: -26, width: 84, height: 52 })
    expect(computeEnvelopeBodyRectFromDims({ width: 0, height: 0 })).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  it('computeEnvelopeTestId / computeEnvelopeBodyTestId are stable', () => {
    expect(computeEnvelopeTestId({ id: 'E-1' })).toBe('envelope-E-1')
    expect(computeEnvelopeTestId({ id: '' })).toBe('envelope-unknown')
    expect(computeEnvelopeBodyTestId({ id: 'E-1' })).toBe('envelope-body-E-1')
    expect(computeEnvelopeBodyTestId({ id: null })).toBe('envelope-body-unknown')
  })

  it('computeEnvelopeBodyCornerRadius matches density', () => {
    expect(computeEnvelopeBodyCornerRadius({ density: 'compact' })).toBe(4)
    expect(computeEnvelopeBodyCornerRadius({ density: 'detailed' })).toBe(6)
    expect(computeEnvelopeBodyCornerRadius({ density: undefined })).toBe(6)
  })

  it('computeEnvelopeBodyEnterStrokeWidth matches density', () => {
    expect(computeEnvelopeBodyEnterStrokeWidth({ density: 'compact' })).toBe(2)
    expect(computeEnvelopeBodyEnterStrokeWidth({ density: 'detailed' })).toBe(3)
    expect(computeEnvelopeBodyEnterStrokeWidth({ density: undefined })).toBe(3)
  })

  it('computeEnvelopeIconRadius / computeEnvelopeIconStatusRadius default correctly', () => {
    expect(computeEnvelopeIconRadius({ radius: 0, fallback: 18 })).toBe(18)
    expect(computeEnvelopeIconRadius({ radius: 22, fallback: 18 })).toBe(22)
    expect(computeEnvelopeIconStatusRadius({ radius: 22, fallback: 18 })).toBe(11)
  })

  it('computeEnvelopeStatusLabelFontSize matches density', () => {
    expect(computeEnvelopeStatusLabelFontSize({ density: 'detailed' })).toBe('11px')
    expect(computeEnvelopeStatusLabelFontSize({ density: 'compact' })).toBe('10px')
    expect(computeEnvelopeStatusLabelFontSize({ density: undefined })).toBe('10px')
  })

  it('computeEnvelopeGlowStroke uses ownerColor fallback', () => {
    expect(computeEnvelopeGlowStroke({ ownerColor: '#abc' })).toBe('#abc')
    expect(computeEnvelopeGlowStroke({ ownerColor: '' })).toBe('var(--vscode-focusBorder)')
  })

  it('computeEnvelopeGlowPhaseOpacity selects high/low by phase', () => {
    const active = computeEnvelopeGlowKeyframeOpacity('active')
    expect(computeEnvelopeGlowPhaseOpacity({ status: 'active', phase: 'high' })).toBe(active.high)
    expect(computeEnvelopeGlowPhaseOpacity({ status: 'active', phase: 'low' })).toBe(active.low)
    expect(computeEnvelopeGlowPhaseOpacity({ status: 'pending', phase: 'high' })).toBe(0)
  })

  it('computeEnvelopeGlowPhaseOpacityForDatum is null-safe', () => {
    expect(computeEnvelopeGlowPhaseOpacityForDatum({ datum: null, phase: 'high' })).toBe(0)
    const active = computeEnvelopeGlowKeyframeOpacity('active')
    expect(computeEnvelopeGlowPhaseOpacityForDatum({ datum: { status: 'active' }, phase: 'high' })).toBe(active.high)
  })

  it('computeEnvelopeAccentColor prefers ownerColor and falls back', () => {
    expect(computeEnvelopeAccentColor({ ownerColor: '#123' })).toBe('#123')
    expect(computeEnvelopeAccentColor({ ownerColor: '' })).toBe('var(--vscode-focusBorder)')
    expect(computeEnvelopeAccentColor({ ownerColor: undefined, fallback: 'x' })).toBe('x')
  })

  it('computeEnvelopeBodyStroke uses sideBar border for ended', () => {
    expect(computeEnvelopeBodyStroke({ status: 'ended', ownerColor: '#abc' })).toBe('var(--vscode-sideBar-border)')
    expect(computeEnvelopeBodyStroke({ status: 'active', ownerColor: '#abc' })).toBe('#abc')
    expect(computeEnvelopeBodyStroke({ status: 'pending', ownerColor: undefined })).toBe('var(--vscode-focusBorder)')
  })

  it('computeEnvelopeStrokeWidth reflects status and revision burst', () => {
    expect(computeEnvelopeStrokeWidth({ status: 'active', isRecentlyRevised: false })).toBe(3.5)
    expect(computeEnvelopeStrokeWidth({ status: 'pending', isRecentlyRevised: false })).toBe(2.5)
    expect(computeEnvelopeStrokeWidth({ status: 'ended', isRecentlyRevised: false })).toBe(2.5)
    expect(computeEnvelopeStrokeWidth({ status: 'active', isRecentlyRevised: true })).toBe(4.5)
  })

  it('computeEnvelopeStrokeDasharray and opacity match status', () => {
    expect(computeEnvelopeStrokeDasharray('active')).toBe(null)
    expect(computeEnvelopeStrokeDasharray('pending')).toBe('6 4')
    expect(computeEnvelopeStrokeDasharray('ended')).toBe('6 4')

    expect(computeEnvelopeOpacity('active')).toBe(1)
    expect(computeEnvelopeOpacity('pending')).toBe(0.75)
    expect(computeEnvelopeOpacity('ended')).toBe(0.45)
  })

  it('computeEnvelopeFlapPath differs for active vs pending', () => {
    const pending = computeEnvelopeFlapPath({ width: 84, height: 52, status: 'pending' })
    expect(pending).toMatch(/ Z$/)
    expect(pending).toContain('L 0')

    const active = computeEnvelopeFlapPath({ width: 84, height: 52, status: 'active' })
    expect(active).not.toContain(' Z')
    // Active flap should open upward beyond the top edge (negative relative to top)
    const coords = active.match(/L 0 (-?\d+(?:\.\d+)?)/)
    expect(coords).toBeTruthy()
    expect(Number(coords[1])).toBeLessThan(-26) // top is -height/2
  })

  it('icon helpers compute fill/stroke/opacity by status', () => {
    expect(computeEnvelopeIconStatusFill({ status: 'active', ownerColor: '#abc' })).toBe('#abc')
    expect(computeEnvelopeIconStatusFill({ status: 'active', ownerColor: '' })).toBe('var(--status-success)')
    expect(computeEnvelopeIconStatusFill({ status: 'ended', ownerColor: '#abc' })).toBe('var(--vscode-input-border)')
    expect(computeEnvelopeIconStatusFill({ status: 'pending', ownerColor: '#abc' })).toBe('var(--status-warning)')

    expect(computeEnvelopeIconStatusOpacity('active')).toBe(0.9)
    expect(computeEnvelopeIconStatusOpacity('pending')).toBe(0.6)

    expect(computeEnvelopeIconCircleStroke({ ownerColor: '#123' })).toBe('#123')
    expect(computeEnvelopeIconCircleStroke({ ownerColor: '' })).toBe('var(--vscode-focusBorder)')
    expect(computeEnvelopeIconCircleStrokeWidth('active')).toBe(3)
    expect(computeEnvelopeIconCircleStrokeWidth('ended')).toBe(2)
  })

  it('glow helpers compute rect and keyframe opacities', () => {
    expect(computeEnvelopeGlowRect({ width: 84, height: 52, padding: 16 })).toEqual({
      x: -50,
      y: -34,
      width: 100,
      height: 68,
    })

    expect(computeEnvelopeGlowKeyframeOpacity('active')).toEqual({ high: 0.6, low: 0.2 })
    expect(computeEnvelopeGlowKeyframeOpacity('pending')).toEqual({ high: 0, low: 0 })
  })

  it('revision burst keyframes expand symmetrically', () => {
    const k = computeEnvelopeRevisionBurstKeyframes({ width: 84, height: 52, expand: 30 })
    expect(k.start).toEqual({ x: -42, y: -26, width: 84, height: 52, opacity: 0.9, strokeWidth: 4 })
    expect(k.end).toEqual({ x: -57, y: -41, width: 114, height: 82, opacity: 0, strokeWidth: 1 })
  })

  it('status label helpers compute y/opacity/text', () => {
    expect(computeEnvelopeStatusLabelY({ height: 52 })).toBe(-12)
    expect(computeEnvelopeStatusLabelOpacity('active')).toBe(0.85)
    expect(computeEnvelopeStatusLabelOpacity('ended')).toBe(0.65)
    expect(computeEnvelopeStatusLabelText('active')).toBe('OPEN')
    expect(computeEnvelopeStatusLabelText('ended')).toBe('CLOSED')
    expect(computeEnvelopeStatusLabelText('pending')).toBe('PENDING')
  })

  it('version badge helpers compute transform and badge styling', () => {
    expect(computeEnvelopeVersionBadgeTransform({ width: 84, height: 52, density: 'compact' })).toBe('translate(28, 34)')
    expect(computeEnvelopeVersionBadgeTransform({ width: 84, height: 52, density: 'normal' })).toBe('translate(22, 34)')

    expect(computeEnvelopeVersionBadgeBgRect({ density: 'compact' })).toEqual({ x: -14, y: -7, width: 28, height: 14 })
    expect(computeEnvelopeVersionBadgeBgRect({ density: 'normal' })).toEqual({ x: -18, y: -7, width: 36, height: 14 })

    expect(computeEnvelopeVersionBadgeBgFill({ isVersionBumped: true })).toBe('var(--status-warning)')
    expect(computeEnvelopeVersionBadgeBgFill({ isVersionBumped: false })).toBe('var(--vscode-editor-background)')
    expect(computeEnvelopeVersionBadgeBgStroke({ isVersionBumped: true })).toBe('none')
    expect(computeEnvelopeVersionBadgeBgStroke({ isVersionBumped: false })).toBe('var(--vscode-sideBar-border)')
    expect(computeEnvelopeVersionBadgeTextFill({ isVersionBumped: true })).toBe('var(--vscode-editor-background)')
    expect(computeEnvelopeVersionBadgeTextFill({ isVersionBumped: false })).toBe('var(--vscode-editor-foreground)')

    expect(computeEnvelopeVersionBadgeFontSize({ density: 'compact' })).toBe('7px')
    expect(computeEnvelopeVersionBadgeFontSize({ density: 'normal' })).toBe('8px')

    expect(computeEnvelopeVersionBadgeText({ density: 'compact', isVersionBumped: false, semver: '1.2.3' })).toBe('v1.2.3')
    expect(computeEnvelopeVersionBadgeText({ density: 'normal', isVersionBumped: true, semver: '1.2.3' })).toBe('↑ v1.2.3')
    expect(computeEnvelopeVersionBadgeText({ density: 'normal', isVersionBumped: false, semver: '1.2.3' })).toBe('v1.2.3')
  })

  it('flap/fold styling helpers match status rules', () => {
    expect(computeEnvelopeFlapFill('active')).toBe('none')
    expect(computeEnvelopeFlapFill('pending')).toBe('var(--vscode-editor-background)')
    expect(computeEnvelopeFlapOpacity('ended')).toBe(0.5)
    expect(computeEnvelopeFlapOpacity('active')).toBe(0.9)

    expect(computeEnvelopeFoldOpacity('ended')).toBe(0.3)
    expect(computeEnvelopeFoldOpacity('active')).toBe(0.6)
    expect(computeEnvelopeFoldOpacity('pending')).toBe(0.4)
  })

  it('computeEnvelopeFoldPath produces a centered triangular fold line', () => {
    const path = computeEnvelopeFoldPath({ width: 84, height: 52 })
    expect(path).toContain('L 0')
    // Should start on left and end on right
    expect(path).toMatch(/^M -?\d+(?:\.\d+)? -?\d+(?:\.\d+)? L 0 -?\d+(?:\.\d+)? L \d+(?:\.\d+)? -?\d+(?:\.\d+)?$/)
  })
})
