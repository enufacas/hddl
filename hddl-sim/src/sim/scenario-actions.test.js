import { describe, it, expect, vi, beforeEach } from 'vitest'

function makeScenario(overrides = {}) {
  return {
    id: overrides.id ?? 's1',
    title: overrides.title ?? 'Scenario',
    durationHours: overrides.durationHours ?? 48,
    fleets: overrides.fleets ?? [],
    envelopes: overrides.envelopes ?? [],
    events: overrides.events ?? [],
    ...overrides,
  }
}

async function importFreshScenarioActions({
  scenario,
  timeHour = 0,
  setScenarioImpl,
  defaultScenario,
} = {}) {
  vi.resetModules()

  const getScenario = vi.fn(() => scenario ?? makeScenario())
  const getTimeHour = vi.fn(() => timeHour)

  const setScenario = vi.fn(setScenarioImpl ?? (next => ({ ok: true, next })))

  vi.doMock('./sim-state', () => ({
    getScenario,
    getTimeHour,
    setScenario,
  }))

  vi.doMock('./scenario-default-simplified', () => ({
    createDefaultScenario: () => (defaultScenario ?? makeScenario({ id: 'default', durationHours: 48 })),
  }))

  const mod = await import('./scenario-actions')
  return { mod, getScenario, getTimeHour, setScenario }
}

describe('scenario-actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('applyAdditivePatch merges envelopes uniquely, merges fleets, dedupes eventIds, and sorts by hour', async () => {
    const base = makeScenario({
      durationHours: 10,
      envelopes: [
        { envelopeId: 'E1', name: 'Base 1' },
        { envelopeId: 'E2', name: 'Base 2' },
      ],
      fleets: [
        {
          stewardRole: 'Customer Steward',
          agents: [{ agentId: 'A1', name: 'Alpha', envelopeIds: ['E1'] }],
        },
      ],
      events: [
        { eventId: 'signal:1', hour: 5, type: 'signal', envelopeId: 'E1' },
      ],
    })

    const captured = []
    const { mod } = await importFreshScenarioActions({
      scenario: base,
      setScenarioImpl: next => {
        captured.push(next)
        return { ok: true }
      },
    })

    mod.applyAdditivePatch({
      durationHours: 12,
      envelopes: [
        { envelopeId: 'E2', name: 'Extra should not override' },
        { envelopeId: 'E3', name: 'Extra 3' },
      ],
      fleets: [
        {
          stewardRole: 'Customer Steward',
          agents: [{ agentId: 'A1', name: 'Alpha2', envelopeIds: ['E2'] }],
        },
        {
          stewardRole: 'Data Steward',
          agents: [{ agentId: 'D1', name: 'Delta', envelopeIds: ['E3'] }],
        },
      ],
      events: [
        { eventId: 'signal:1', hour: 2, type: 'signal', envelopeId: 'E2' },
        { eventId: 'signal:1', hour: 7, type: 'signal', envelopeId: 'E3' },
      ],
    })

    expect(captured.length).toBe(1)
    const next = captured[0]

    // duration should be max(current, requested)
    expect(next.durationHours).toBe(12)

    // envelopes: E2 should remain base entry; E3 added
    const byId = new Map(next.envelopes.map(e => [e.envelopeId, e]))
    expect(byId.get('E2').name).toBe('Base 2')
    expect(byId.get('E3').name).toBe('Extra 3')

    // fleets: merge within steward role; A1 envelopeIds merged uniquely
    const customerFleet = next.fleets.find(f => f.stewardRole === 'Customer Steward')
    expect(customerFleet).toBeTruthy()
    const a1 = customerFleet.agents.find(a => a.agentId === 'A1')
    expect(a1.envelopeIds.sort()).toEqual(['E1', 'E2'])

    const dataFleet = next.fleets.find(f => f.stewardRole === 'Data Steward')
    expect(dataFleet.agents[0]).toMatchObject({ agentId: 'D1', envelopeIds: ['E3'] })

    // eventId dedupe should suffix duplicates beyond first
    const ids = next.events.map(e => e.eventId)
    expect(ids[0]).toBeTruthy()
    expect(ids.filter(id => id === 'signal:1').length).toBe(1)
    expect(ids.some(id => id.startsWith('signal:1:v'))).toBe(true)

    // events should be sorted by hour
    const hours = next.events.map(e => e.hour)
    expect(hours).toEqual(hours.slice().sort((a, b) => a - b))
  })

  it('resetScenarioToDefault() calls setScenario(createDefaultScenario())', async () => {
    const defaultScenario = makeScenario({ id: 'defaultX', durationHours: 48 })
    const { mod, setScenario } = await importFreshScenarioActions({
      scenario: makeScenario(),
      defaultScenario,
    })

    mod.resetScenarioToDefault()
    expect(setScenario).toHaveBeenCalled()
    expect(setScenario.mock.calls[0][0]).toMatchObject({ id: 'defaultX' })
  })

  it('tryExpandAuthority() emits boundary_interaction + annotation events at current hour', async () => {
    const base = makeScenario({
      durationHours: 10,
      envelopes: [
        { envelopeId: 'E1', createdHour: 0, endHour: 3 },
        { envelopeId: 'E2', createdHour: 4, endHour: 9 },
      ],
      events: [],
    })

    vi.spyOn(Date, 'now').mockReturnValue(1234567890)

    const captured = []
    const { mod } = await importFreshScenarioActions({
      scenario: base,
      timeHour: 5,
      setScenarioImpl: next => {
        captured.push(next)
        return { ok: true }
      },
    })

    mod.tryExpandAuthority()

    expect(captured.length).toBe(1)
    const next = captured[0]
    const added = next.events

    expect(added.some(e => e.type === 'boundary_interaction')).toBe(true)
    expect(added.some(e => e.type === 'annotation')).toBe(true)

    const boundary = added.find(e => e.type === 'boundary_interaction')
    expect(boundary.hour).toBe(5)
    expect(boundary.boundary_kind).toBe('escalated')
    expect(boundary.envelopeId).toBe('E2')
  })

  it('addStewardFleet() refuses when already at max fleets', async () => {
    const base = makeScenario({
      fleets: [
        { stewardRole: 'Customer Steward', agents: [] },
        { stewardRole: 'HR Steward', agents: [] },
        { stewardRole: 'Sales Steward', agents: [] },
        { stewardRole: 'Engineering Steward', agents: [] },
        { stewardRole: 'Data Steward', agents: [] },
      ],
    })

    const captured = []
    const { mod } = await importFreshScenarioActions({
      scenario: base,
      setScenarioImpl: next => {
        captured.push(next)
        return { ok: true }
      },
    })

    const res = mod.addStewardFleet()
    expect(res.ok).toBe(false)
    expect(res.errors?.[0]).toMatch(/Maximum of 5 stewards/i)
    expect(captured.length).toBe(0)
  })

  it('addStewardFleet() adds the next canonical steward role with agentIds', async () => {
    const base = makeScenario({
      fleets: [
        { stewardRole: 'Customer Steward', agents: [{ agentId: 'AG-CS-01', envelopeIds: [] }] },
      ],
    })

    const captured = []
    const { mod } = await importFreshScenarioActions({
      scenario: base,
      setScenarioImpl: next => {
        captured.push(next)
        return { ok: true }
      },
    })

    const res = mod.addStewardFleet()
    expect(res.ok).toBe(true)

    expect(captured.length).toBe(1)
    const next = captured[0]

    expect(next.fleets.length).toBeGreaterThan(1)
    const addedFleet = next.fleets.find(f => f.stewardRole !== 'Customer Steward')
    expect(addedFleet).toBeTruthy()

    const agentIds = (addedFleet.agents || []).map(a => a.agentId)
    expect(agentIds.length).toBeGreaterThan(0)
    expect(agentIds.every(Boolean)).toBe(true)
  })
})
