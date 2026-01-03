import { beforeAll, afterAll, describe, expect, test } from 'vitest'

let getStewardEnvelopeInteractionCount
let computeTooltipFixedPosition
let computeShouldShowHoverTooltipDecision
let computeAgentTooltipHtml
let computeEnvelopeTooltipHtml
let computeActiveAgentCount
let computeStewardTooltipStats

function createLocalStorageMock() {
  const store = new Map()
  return {
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => store.set(String(k), String(v)),
    removeItem: (k) => store.delete(String(k)),
    clear: () => store.clear(),
  }
}

beforeAll(async () => {
  // tooltip-manager imports sim-state, which pulls in store/scenario-loader.
  // Those read localStorage during module init, so provide a minimal mock.
  globalThis.localStorage = createLocalStorageMock()
  ;({
    getStewardEnvelopeInteractionCount,
    computeTooltipFixedPosition,
    computeShouldShowHoverTooltipDecision,
    computeAgentTooltipHtml,
    computeEnvelopeTooltipHtml,
    computeActiveAgentCount,
    computeStewardTooltipStats,
  } = await import('./tooltip-manager'))
})

afterAll(() => {
  delete globalThis.localStorage
})

describe('map/tooltip-manager', () => {
  test('computeShouldShowHoverTooltipDecision prefers hover and allows mouse/pen', () => {
    expect(computeShouldShowHoverTooltipDecision({ canHover: true, pointerType: 'touch' })).toBe(true)
    expect(computeShouldShowHoverTooltipDecision({ canHover: false, pointerType: 'mouse' })).toBe(true)
    expect(computeShouldShowHoverTooltipDecision({ canHover: false, pointerType: 'pen' })).toBe(true)
    expect(computeShouldShowHoverTooltipDecision({ canHover: false, pointerType: 'touch' })).toBe(false)
    expect(computeShouldShowHoverTooltipDecision({ canHover: false, pointerType: undefined })).toBe(false)
  })

  test('computeAgentTooltipHtml includes active/idle label and optional steward section', () => {
    const active = computeAgentTooltipHtml({
      name: 'Agent A',
      role: 'Operator',
      isRecentlyActive: true,
      fleetRole: 'Data Steward',
      fleetColor: 'red',
    })
    expect(active).toContain('Agent A')
    expect(active).toContain('Operator')
    expect(active).toContain('● Active')
    expect(active).toContain('Data Steward')
    expect(active).toContain('color: red')

    const idleNoSteward = computeAgentTooltipHtml({
      name: 'Agent B',
      role: '',
      isRecentlyActive: false,
      fleetRole: '',
      fleetColor: 'blue',
    })
    expect(idleNoSteward).toContain('○ Idle')
    expect(idleNoSteward).not.toContain('Steward:')
  })

  test('computeEnvelopeTooltipHtml uses fallbacks and includes steward', () => {
    const html = computeEnvelopeTooltipHtml({ label: '', id: 'ENV-1', name: 'Policy', ownerRole: 'Data Steward' })
    expect(html).toContain('ENV-1')
    expect(html).toContain('Policy')
    expect(html).toContain('Steward:')
    expect(html).toContain('Data Steward')

    const html2 = computeEnvelopeTooltipHtml({ label: '', id: '', name: '', ownerRole: '' })
    expect(html2).toContain('Envelope')
    expect(html2).toContain('Unknown')
  })

  test('computeActiveAgentCount counts agents with recent events', () => {
    const agents = [{ agentId: 'A1' }, { agentId: 'A2' }]
    const events = [
      { agentId: 'A1', hour: 9.5 },
      { agentId: 'A2', hour: 1 },
      { agentId: 'A1', hour: 2 },
    ]
    expect(computeActiveAgentCount({ agents, events, usedHour: 10, windowHours: 6 })).toBe(1)
    expect(computeActiveAgentCount({ agents, events, usedHour: 10, windowHours: 12 })).toBe(2)
  })

  test('computeStewardTooltipStats derives envelope and fleet counts', () => {
    const scenario = {
      envelopes: [
        { id: 'ENV-1', ownerRole: 'Data Steward' },
        { id: 'ENV-2', ownerRole: 'Other Steward' },
      ],
      fleets: [
        { stewardRole: 'Data Steward', agents: [{ agentId: 'A1' }, { agentId: 'A2' }] },
      ],
      events: [
        { agentId: 'A1', hour: 9 },
        { agentId: 'A2', hour: 2 },
      ],
    }

    const stats = computeStewardTooltipStats({
      scenario,
      hour: null,
      stewardRole: 'Data Steward',
      getTimeHour: () => 10,
      getEnvelopeStatus: (env) => (env.id === 'ENV-1' ? 'active' : 'idle'),
    })

    expect(stats.usedHour).toBe(10)
    expect(stats.ownedEnvelopesCount).toBe(1)
    expect(stats.activeEnvelopesCount).toBe(1)
    expect(stats.agentCount).toBe(2)
    expect(stats.activeAgentCount).toBe(1)
  })

  test('counts steward-envelope interactions in window and flags escalation', () => {
    const scenario = {
      events: [
        // outside window
        { type: 'boundary_interaction', hour: 0, envelopeId: 'ENV-1', actorRole: 'Data Steward', boundary_kind: 'escalated' },

        // inside window but different envelope
        { type: 'boundary_interaction', hour: 5, envelopeId: 'ENV-2', actorRole: 'Data Steward', boundary_kind: 'escalated' },

        // inside window but different actor
        { type: 'boundary_interaction', hour: 6, envelopeId: 'ENV-1', actorRole: 'Other Steward', boundary_kind: 'escalated' },

        // inside window and matches
        { type: 'dsg_message', hour: 7, envelopeId: 'ENV-1', actorRole: 'Data Steward' },
        { type: 'revision', hour: 8, envelopeId: 'ENV-1', actorRole: 'Data Steward' },
        { type: 'boundary_interaction', hour: 9, envelopeId: 'ENV-1', actorRole: 'Data Steward', boundary_kind: 'overridden' },

        // counted types only; unrelated event shouldn't increment
        { type: 'decision', hour: 9.5, envelopeId: 'ENV-1', actorRole: 'Data Steward' },

        // envelope_id alias is supported
        { type: 'dsg_session', hour: 10, envelope_id: 'ENV-1', actorRole: 'Data Steward' },
      ],
    }

    const hour = 10
    const { count, hasEscalation } = getStewardEnvelopeInteractionCount(
      scenario,
      hour,
      'ENV-1',
      'Data Steward',
      4 // window = [6, 10]
    )

    // Included: dsg_message (7), revision (8), boundary_interaction (9), dsg_session (10) => 4
    expect(count).toBe(4)
    expect(hasEscalation).toBe(true)
  })

  test('returns zero when no matching events exist', () => {
    const scenario = { events: [{ type: 'revision', hour: 1, envelopeId: 'ENV-1', actorRole: 'Data Steward' }] }
    const { count, hasEscalation } = getStewardEnvelopeInteractionCount(scenario, 10, 'ENV-1', 'Data Steward', 2)
    expect(count).toBe(0)
    expect(hasEscalation).toBe(false)
  })

  test('computeTooltipFixedPosition prefers above pointer and clamps to viewport', () => {
    const pos = computeTooltipFixedPosition({
      pointer: { x: 990, y: 10 },
      tooltipSize: { width: 200, height: 120 },
      viewport: { width: 1000, height: 800 },
      padding: 10,
    })

    // Should clamp x to keep tooltip in viewport
    expect(pos.left).toBe(1000 - 200 - 10)
    // Pointer is near top; above-pointer y would be negative, so clamp to padding
    expect(pos.top).toBe(10)
  })

  test('computeTooltipFixedPosition anchors above element when no pointer', () => {
    const pos = computeTooltipFixedPosition({
      anchorRect: { left: 100, top: 200, width: 80, height: 40 },
      tooltipSize: { width: 160, height: 100 },
      viewport: { width: 1000, height: 800 },
      padding: 10,
    })

    // Centered on anchor
    expect(pos.left).toBe(100 + 80 / 2)
    // Above anchor (top - tooltipHeight - 10)
    expect(pos.top).toBe(200 - 100 - 10)
  })

  test('computeTooltipFixedPosition falls back to padding when inputs missing', () => {
    const pos = computeTooltipFixedPosition({
      tooltipSize: { width: 0, height: 0 },
      viewport: { width: 0, height: 0 },
      padding: 12,
    })
    expect(pos).toEqual({ left: 12, top: 12 })
  })
})
