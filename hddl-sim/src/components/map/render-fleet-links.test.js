import { describe, expect, test } from 'vitest'
import {
  computeFleetAgentCounts,
  formatFleetCountText,
  computeLinkStroke,
  computeLinkStrokeWidth,
  computeLinkOpacity,
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
})
