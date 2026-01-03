import { describe, expect, test } from 'vitest'
import {
  computeFleetAgentCounts,
  formatFleetCountText,
  computeLinkStroke,
  computeLinkStrokeWidth,
  computeLinkOpacity,
  computeFleetBadgeTransform,
  computeFleetBadgeOpacity,
  computeFleetBadgeRect,
  computeLinkKey,
} from './render-fleet-links'

describe('map/render-fleet-links', () => {
  test('computeFleetAgentCounts counts active/total agents per fleet role', () => {
    const nodes = [
      { type: 'agent', fleetRole: 'Data Steward', isRecentlyActive: true },
      { type: 'agent', fleetRole: 'Data Steward', isRecentlyActive: false },
      { type: 'agent', fleetRole: 'Other', isRecentlyActive: true },
      { type: 'envelope', fleetRole: 'Data Steward' },
    ]

    expect(computeFleetAgentCounts({ nodes, fleetRole: 'Data Steward' })).toEqual({ active: 1, total: 2 })
    expect(formatFleetCountText({ nodes, fleetRole: 'Data Steward' })).toBe('1/2')
  })

  test('computeLinkStroke uses warning color for escalated ownership', () => {
    expect(computeLinkStroke({ type: 'ownership', hasEscalation: true })).toBe('var(--status-warning)')
    expect(computeLinkStroke({ type: 'ownership', hasEscalation: false })).toBe(
      'var(--vscode-editor-lineHighlightBorder)'
    )
    expect(computeLinkStroke({ type: 'foo' })).toBe('var(--vscode-editor-lineHighlightBorder)')
  })

  test('computeLinkStrokeWidth and opacity scale by interactionCount for ownership', () => {
    expect(computeLinkStrokeWidth({ type: 'foo' })).toBe(1.5)
    expect(computeLinkOpacity({ type: 'foo' })).toBe(0.35)

    expect(computeLinkStrokeWidth({ type: 'ownership', interactionCount: 0 })).toBe(1.5)
    expect(computeLinkOpacity({ type: 'ownership', interactionCount: 0 })).toBe(0.45)

    // 1.5 + min(3, c*0.6)
    expect(computeLinkStrokeWidth({ type: 'ownership', interactionCount: 2 })).toBeCloseTo(1.5 + 1.2)
    expect(computeLinkOpacity({ type: 'ownership', interactionCount: 2 })).toBe(0.8)

    // Cap at +3
    expect(computeLinkStrokeWidth({ type: 'ownership', interactionCount: 100 })).toBe(4.5)
  })

  test('computeFleetBadgeTransform centers the badge in boundary rect', () => {
    expect(computeFleetBadgeTransform({ x: 10, y: 20, w: 100, h: 50 })).toBe('translate(60, 45)')
  })

  test('computeFleetBadgeOpacity shows only in compact/minimal densities', () => {
    expect(computeFleetBadgeOpacity({ currentAgentDensity: { density: 'compact' } })).toBe(1)
    expect(computeFleetBadgeOpacity({ currentAgentDensity: { density: 'minimal' } })).toBe(1)
    expect(computeFleetBadgeOpacity({ currentAgentDensity: { density: 'standard' } })).toBe(0)
    expect(computeFleetBadgeOpacity({ currentAgentDensity: null })).toBe(0)
  })

  test('computeFleetBadgeRect returns symmetric rect around origin', () => {
    expect(computeFleetBadgeRect({ halfWidth: 20, halfHeight: 12 })).toEqual({
      x: -20,
      y: -12,
      width: 40,
      height: 24,
    })
  })

  test('computeLinkKey tolerates id objects or raw ids', () => {
    expect(computeLinkKey({ source: { id: 'A' }, target: { id: 'B' } })).toBe('A-B')
    expect(computeLinkKey({ source: 'A', target: 'B' })).toBe('A-B')
  })
})
