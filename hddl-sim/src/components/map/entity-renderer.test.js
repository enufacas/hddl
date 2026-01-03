import { describe, expect, test } from 'vitest'
import {
  computeAgentTextAnchor,
  computeAgentNameX,
  computeAgentRoleX,
  computeAgentFontSizePx,
  computeAgentNameText,
} from './entity-renderer'

describe('map/entity-renderer helpers', () => {
  const DETAIL_LEVELS = { STANDARD: 'standard' }

  test('computeAgentTextAnchor and X helpers respect useLeftSide', () => {
    expect(computeAgentTextAnchor({ useLeftSide: true })).toBe('end')
    expect(computeAgentTextAnchor({ useLeftSide: false })).toBe('start')

    expect(computeAgentRoleX({ useLeftSide: true })).toBe(-16)
    expect(computeAgentRoleX({ useLeftSide: false })).toBe(16)

    expect(computeAgentNameX({ useLeftSide: true, gridScale: 2, botScale: 0.5 })).toBe(-16)
    expect(computeAgentNameX({ useLeftSide: false, gridScale: 2, botScale: 0.5 })).toBe(16)
  })

  test('computeAgentFontSizePx uses base 8 for STANDARD and clamps to 7px min', () => {
    expect(computeAgentFontSizePx({ detailLevel: 'standard', gridScale: 1, DETAIL_LEVELS })).toBe('8px')
    expect(computeAgentFontSizePx({ detailLevel: 'standard', gridScale: 0.5, DETAIL_LEVELS })).toBe('7px')
    expect(computeAgentFontSizePx({ detailLevel: 'full', gridScale: 1, DETAIL_LEVELS })).toBe('9px')
  })

  test('computeAgentNameText gates on density config and per-agent showName', () => {
    const getAdaptiveAgentName = (name, level) => `${name}:${level}`

    expect(
      computeAgentNameText({
        agentDensityConfig: { showName: false },
        agent: { name: 'A' },
        detailLevel: 'full',
        getAdaptiveAgentName,
      })
    ).toBe('')

    expect(
      computeAgentNameText({
        agentDensityConfig: { showName: true },
        agent: { name: 'A', showName: false },
        detailLevel: 'full',
        getAdaptiveAgentName,
      })
    ).toBe('')

    expect(
      computeAgentNameText({
        agentDensityConfig: { showName: true },
        agent: { name: 'A' },
        detailLevel: 'full',
        getAdaptiveAgentName,
      })
    ).toBe('A:full')
  })
})
