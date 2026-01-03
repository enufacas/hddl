import { describe, it, expect } from 'vitest'

import {
  computeEnvelopeGroupScale,
  computeEnvelopeBodyRect,
  computeEnvelopeAccentColor,
  computeEnvelopeBodyStroke,
  computeEnvelopeStrokeWidth,
  computeEnvelopeStrokeDasharray,
  computeEnvelopeOpacity,
  computeEnvelopeFlapPath,
  computeEnvelopeFoldPath,
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

  it('computeEnvelopeFoldPath produces a centered triangular fold line', () => {
    const path = computeEnvelopeFoldPath({ width: 84, height: 52 })
    expect(path).toContain('L 0')
    // Should start on left and end on right
    expect(path).toMatch(/^M -?\d+(?:\.\d+)? -?\d+(?:\.\d+)? L 0 -?\d+(?:\.\d+)? L \d+(?:\.\d+)? -?\d+(?:\.\d+)?$/)
  })
})
