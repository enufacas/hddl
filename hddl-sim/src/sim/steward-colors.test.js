import { describe, it, expect } from 'vitest'
import {
  STEWARD_COLORS,
  STEWARD_PALETTE,
  ENVELOPE_PALETTE,
  EVENT_COLORS,
  getStewardColor,
  getEnvelopeColor,
  toSemver,
  getVersionBadgeInfo,
  getEventColor,
} from './steward-colors'

describe('steward-colors', () => {
  it('returns explicit steward colors for known roles', () => {
    expect(getStewardColor('Customer Steward')).toBe(STEWARD_COLORS['Customer Steward'])
    expect(getStewardColor('Engineering Steward')).toBe(STEWARD_COLORS['Engineering Steward'])
  })

  it('falls back to a deterministic palette color for unknown/empty roles', () => {
    // Empty/undefined role hashes to 0 -> first palette entry.
    expect(getStewardColor()).toBe(STEWARD_PALETTE[0])
    expect(STEWARD_PALETTE).toContain(getStewardColor('Some New Steward Role'))
  })

  it('assigns envelope colors by index when provided', () => {
    expect(getEnvelopeColor('ENV-001', 0)).toBe(ENVELOPE_PALETTE[0])
    expect(getEnvelopeColor('ENV-001', ENVELOPE_PALETTE.length)).toBe(ENVELOPE_PALETTE[0])
    expect(getEnvelopeColor('ENV-001', 3)).toBe(ENVELOPE_PALETTE[3])
  })

  it('assigns envelope colors deterministically by ID when no index is provided', () => {
    const c1 = getEnvelopeColor('ENV-001')
    const c2 = getEnvelopeColor('ENV-001')
    expect(c1).toBe(c2)
    expect(ENVELOPE_PALETTE).toContain(c1)
  })

  it('converts integer envelope version to semver-like string', () => {
    expect(toSemver(1)).toBe('1.0.0')
    expect(toSemver(2)).toBe('1.1.0')
    expect(toSemver(10)).toBe('1.9.0')
    // Defensive defaulting
    expect(toSemver(0)).toBe('1.0.0')
    expect(toSemver(null)).toBe('1.0.0')
  })

  it('computes version badge info for bumps vs stable versions', () => {
    const bumped = getVersionBadgeInfo(3, 2)
    expect(bumped).toMatchObject({
      semver: '1.2.0',
      color: 'var(--status-warning)',
      label: '↑ v1.2.0',
      isNew: true,
      bump: 'minor',
    })

    const stable = getVersionBadgeInfo(2, 2)
    expect(stable).toMatchObject({
      semver: '1.1.0',
      color: 'var(--vscode-badge-background)',
      label: 'v1.1.0',
      isNew: false,
      bump: null,
    })
  })

  it('maps event colors with special handling for decisions', () => {
    expect(getEventColor('decision', undefined, 'allowed')).toBe(EVENT_COLORS.decision)
    expect(getEventColor('decision', 'warning', 'allowed')).toBe(EVENT_COLORS.decision_blocked)
    expect(getEventColor('decision', undefined, 'blocked')).toBe(EVENT_COLORS.decision_blocked)
    expect(getEventColor('boundary_interaction')).toBe(EVENT_COLORS.boundary_interaction)
    expect(getEventColor('unknown-type')).toBe(EVENT_COLORS.signal)
  })
})
