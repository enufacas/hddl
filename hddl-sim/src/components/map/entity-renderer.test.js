import { describe, expect, test } from 'vitest'
import {
  computeAgentTextAnchor,
  computeAgentNameX,
  computeAgentRoleX,
  computeAgentFontSizePx,
  computeAgentNameText,
  computeAgentBotTransform,
  computeAgentBotTestId,
  computeAgentBotActiveAttr,
  computeAgentBotStroke,
  computeAgentBotFill,
  computeAgentNameVisibility,
  computeAgentNameOpacity,
  computeAgentNameFontSizePxForUpdate,
  computeAgentRoleVisibility,
  computeAgentRoleOpacity,
  computeAgentRoleText,
  computeAgentHaloStroke,
  computeAgentHaloOpacity,
  computeAgentHaloRadius,
  computeAgentHaloPulseKeyframes,
  computeAgentCompactDotFill,
  computeAgentCompactDotOpacity,
  computeAgentCompactDotFilter,
  computeAgentCompactDotStroke,
  computeAgentMinimalDotOpacity,
  computeAgentMinimalDotFilter,
  computeAgentMinimalDotFill,
  computeAgentBotPartOpacity,
  computeAgentBotEyeOpacity,
  computeLabelTextAnchor,
  computeLabelX,
  computeLabelMainDy,
  computeLabelSubDy,
  computeLabelFontWeight,
  computeLabelMainOpacity,
  computeLabelMainFontSize,
  computeLabelMainText,
  computeLabelSubOpacity,
} from './entity-renderer'

describe('map/entity-renderer helpers', () => {
  const DETAIL_LEVELS = { STANDARD: 'standard', COMPACT: 'compact', MINIMAL: 'minimal' }

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

  test('computeAgentBotTransform multiplies gridScale and botScale', () => {
    expect(computeAgentBotTransform({ gridScale: 2, botScale: 0.5 })).toBe('scale(1)')
    expect(computeAgentBotTransform({ gridScale: 1.25, botScale: 0.8 })).toBe('scale(1)')
    expect(computeAgentBotTransform({ gridScale: 2, botScale: 1 })).toBe('scale(2)')
    expect(computeAgentBotTransform({ gridScale: undefined, botScale: undefined })).toBe('scale(1)')
  })

  test('agent bot helpers build stable attributes and colors', () => {
    expect(computeAgentBotTestId({ id: 'a1' })).toBe('agent-a1')
    expect(computeAgentBotTestId({ id: '' })).toBe('agent-unknown')
    expect(computeAgentBotActiveAttr({ isRecentlyActive: true })).toBe('true')
    expect(computeAgentBotActiveAttr({ isRecentlyActive: false })).toBe('false')
    expect(computeAgentBotStroke({ fleetColor: '#f00' })).toBe('#f00')
    expect(computeAgentBotStroke({ fleetColor: '' })).toBe('var(--vscode-sideBar-border)')
    expect(computeAgentBotFill({ fleetColor: '#0f0' })).toBe('#0f0')
    expect(computeAgentBotFill({ fleetColor: '' })).toBe('var(--vscode-statusBar-foreground)')
  })

  test('computeAgentNameVisibility/Opacity respect density gating and recent activity', () => {
    const agentDensityConfig = { showName: true }

    expect(computeAgentNameVisibility({ agentDensityConfig, agent: { showName: false } })).toBe('hidden')
    expect(computeAgentNameOpacity({ agentDensityConfig, agent: { showName: false, isRecentlyActive: true } })).toBe(0)

    expect(computeAgentNameVisibility({ agentDensityConfig, agent: { isRecentlyActive: true } })).toBe('visible')
    expect(computeAgentNameOpacity({ agentDensityConfig, agent: { isRecentlyActive: true } })).toBe(1)
    expect(computeAgentNameOpacity({ agentDensityConfig, agent: { isRecentlyActive: false } })).toBe(0.55)
  })

  test('computeAgentNameFontSizePxForUpdate uses base 10/11 and clamps at 9px', () => {
    expect(
      computeAgentNameFontSizePxForUpdate({ detailLevel: 'standard', gridScale: 1, DETAIL_LEVELS })
    ).toBe('10px')
    expect(
      computeAgentNameFontSizePxForUpdate({ detailLevel: 'full', gridScale: 1, DETAIL_LEVELS })
    ).toBe('11px')
    expect(
      computeAgentNameFontSizePxForUpdate({ detailLevel: 'standard', gridScale: 0.5, DETAIL_LEVELS })
    ).toBe('9px')
  })

  test('computeAgentRoleVisibility/Opacity/Text gate role display and truncate', () => {
    const truncateWithEllipsis = (text, maxLen) => `${text}:${maxLen}`

    expect(
      computeAgentRoleText({
        agentDensityConfig: { showRole: false },
        agent: { role: 'Engineer' },
        truncateWithEllipsis,
      })
    ).toBe('')

    expect(
      computeAgentRoleText({
        agentDensityConfig: { showRole: true },
        agent: { role: 'Engineer', showName: false },
        truncateWithEllipsis,
      })
    ).toBe('')

    expect(
      computeAgentRoleText({
        agentDensityConfig: { showRole: true },
        agent: { role: 'Engineer' },
        truncateWithEllipsis,
      })
    ).toBe('Engineer:26')

    expect(computeAgentRoleVisibility({ agentDensityConfig: { showRole: true }, agent: { showName: false } })).toBe('hidden')
    expect(computeAgentRoleVisibility({ agentDensityConfig: { showRole: true }, agent: {} })).toBe('visible')
    expect(computeAgentRoleOpacity({ agentDensityConfig: { showRole: true }, agent: {} })).toBe(0.65)
    expect(computeAgentRoleOpacity({ agentDensityConfig: { showRole: false }, agent: {} })).toBe(0)
  })

  test('agent halo + dots compute stroke/opacity/filter deterministically', () => {
    expect(computeAgentHaloStroke({ isRecentlyActive: false, fleetColor: '#f00' })).toBe('transparent')
    expect(computeAgentHaloStroke({ isRecentlyActive: true, fleetColor: '#f00' })).toBe('#f00')
    expect(computeAgentHaloOpacity({ isRecentlyActive: true })).toBe(0.7)
    expect(computeAgentHaloOpacity({ isRecentlyActive: false })).toBe(0)
    expect(computeAgentHaloRadius({ isRecentlyActive: true, botScale: 2 })).toBe(36)
    expect(computeAgentHaloRadius({ isRecentlyActive: false, botScale: 2 })).toBe(32)

    expect(computeAgentCompactDotFill({ isRecentlyActive: false, fleetColor: '#0f0' })).toBe('var(--vscode-editor-background)')
    expect(computeAgentCompactDotFill({ isRecentlyActive: true, fleetColor: '#0f0' })).toBe('#0f0')
    expect(computeAgentCompactDotStroke({ fleetColor: '#0f0' })).toBe('#0f0')
    expect(computeAgentCompactDotStroke({ fleetColor: '' })).toBe('var(--vscode-sideBar-border)')
    expect(computeAgentCompactDotOpacity({ isRecentlyActive: true })).toBe(1)
    expect(computeAgentCompactDotOpacity({ isRecentlyActive: false })).toBe(0.5)
    expect(computeAgentCompactDotFilter({ isRecentlyActive: false, fleetColor: '#0f0' })).toBe('none')
    expect(computeAgentCompactDotFilter({ isRecentlyActive: true, fleetColor: '#0f0' })).toBe('drop-shadow(0 0 4px #0f0)')

    expect(computeAgentMinimalDotFill({ fleetColor: '#00f' })).toBe('#00f')
    expect(computeAgentMinimalDotFill({ fleetColor: '' })).toBe('var(--vscode-sideBar-border)')
    expect(computeAgentMinimalDotOpacity({ isRecentlyActive: true })).toBe(0.9)
    expect(computeAgentMinimalDotOpacity({ isRecentlyActive: false })).toBe(0.4)
    expect(computeAgentMinimalDotFilter({ isRecentlyActive: false, fleetColor: '#00f' })).toBe('none')
    expect(computeAgentMinimalDotFilter({ isRecentlyActive: true, fleetColor: '#00f' })).toBe('drop-shadow(0 0 3px #00f)')
  })

  test('computeAgentHaloPulseKeyframes scales radii by botScale', () => {
    expect(computeAgentHaloPulseKeyframes({ botScale: 2 })).toEqual({
      low: { opacity: 0.4, r: 32 },
      high: { opacity: 0.7, r: 36 },
    })
    expect(computeAgentHaloPulseKeyframes({ botScale: undefined })).toEqual({
      low: { opacity: 0.4, r: 16 },
      high: { opacity: 0.7, r: 18 },
    })
  })

  test('label positioning helpers encode dy/x/anchor/fontWeight decisions', () => {
    expect(computeLabelTextAnchor({ type: 'agent' })).toBe('end')
    expect(computeLabelTextAnchor({ type: 'steward' })).toBe('start')
    expect(computeLabelTextAnchor({ type: 'envelope' })).toBe('middle')

    expect(computeLabelX({ type: 'agent', r: 10 })).toBe(-15)
    expect(computeLabelX({ type: 'steward', r: 10 })).toBe(15)
    expect(computeLabelX({ type: 'envelope', r: 10 })).toBe(0)

    expect(computeLabelMainDy({ type: 'envelope' })).toBe(5)
    expect(computeLabelMainDy({ type: 'steward' })).toBe(4)
    expect(computeLabelSubDy({ type: 'envelope' })).toBe(20)
    expect(computeLabelSubDy({ type: 'steward' })).toBe(15)

    expect(computeLabelFontWeight({ type: 'envelope' })).toBe('bold')
    expect(computeLabelFontWeight({ type: 'agent' })).toBe('normal')
  })

  test('bot part opacity helpers match active/inactive styling', () => {
    expect(computeAgentBotPartOpacity({ isActive: true })).toBe(1)
    expect(computeAgentBotPartOpacity({ isActive: false })).toBe(0.45)
    expect(computeAgentBotEyeOpacity({ isActive: true })).toBe(1)
    expect(computeAgentBotEyeOpacity({ isActive: false })).toBe(0.35)
  })

  test('label main/sub helpers compute opacity, font size, and adaptive text', () => {
    expect(computeLabelMainOpacity({ detailLevel: 'minimal', DETAIL_LEVELS, status: 'active' })).toBe(0)
    expect(computeLabelMainOpacity({ detailLevel: 'full', DETAIL_LEVELS, status: 'pending' })).toBe(0.6)
    expect(computeLabelMainOpacity({ detailLevel: 'full', DETAIL_LEVELS, status: 'ended' })).toBe(0.75)
    expect(computeLabelMainOpacity({ detailLevel: 'full', DETAIL_LEVELS, status: 'active' })).toBe(1)

    expect(computeLabelMainFontSize({ type: 'envelope', detailLevel: 'compact', DETAIL_LEVELS })).toBe('10px')
    expect(computeLabelMainFontSize({ type: 'envelope', detailLevel: 'full', DETAIL_LEVELS })).toBe('12px')
    expect(computeLabelMainFontSize({ type: 'agent', detailLevel: 'compact', DETAIL_LEVELS })).toBe('8px')
    expect(computeLabelMainFontSize({ type: 'agent', detailLevel: 'full', DETAIL_LEVELS })).toBe('10px')

    const getAdaptiveEnvelopeLabel = (label, name, level) => ({ label: `${label}:${name}:${level}` })
    const getAdaptiveStewardLabel = (name, title, level) => ({ name: `${name}:${title}:${level}` })
    const getAdaptiveAgentName = (name, level) => `${name}:${level}`

    expect(
      computeLabelMainText({
        node: { type: 'envelope', label: 'L', name: 'E' },
        detailLevel: 'full',
        getAdaptiveEnvelopeLabel,
        getAdaptiveStewardLabel,
        getAdaptiveAgentName,
      })
    ).toBe('L:E:full')

    expect(
      computeLabelMainText({
        node: { type: 'steward', name: 'S' },
        detailLevel: 'compact',
        getAdaptiveEnvelopeLabel,
        getAdaptiveStewardLabel,
        getAdaptiveAgentName,
      })
    ).toBe('S::compact')

    expect(
      computeLabelMainText({
        node: { type: 'agent', name: 'A' },
        detailLevel: 'full',
        getAdaptiveEnvelopeLabel,
        getAdaptiveStewardLabel,
        getAdaptiveAgentName,
      })
    ).toBe('A:full')

    expect(
      computeLabelMainText({
        node: { type: 'unknown', name: 'U' },
        detailLevel: 'full',
        getAdaptiveEnvelopeLabel,
        getAdaptiveStewardLabel,
        getAdaptiveAgentName,
      })
    ).toBe('')

    expect(computeLabelSubOpacity({ detailLevel: 'compact', DETAIL_LEVELS, status: 'active' })).toBe(0)
    expect(computeLabelSubOpacity({ detailLevel: 'minimal', DETAIL_LEVELS, status: 'active' })).toBe(0)
    expect(computeLabelSubOpacity({ detailLevel: 'full', DETAIL_LEVELS, status: 'pending' })).toBe(0.5)
    expect(computeLabelSubOpacity({ detailLevel: 'full', DETAIL_LEVELS, status: 'ended' })).toBe(0.6)
    expect(computeLabelSubOpacity({ detailLevel: 'full', DETAIL_LEVELS, status: 'active' })).toBe(0.7)
  })
})
