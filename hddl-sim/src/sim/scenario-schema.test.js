import { describe, it, expect } from 'vitest'
import {
  SCHEMA_VERSION,
  validateScenario,
  normalizeScenario,
  parseScenarioJson,
  exportScenario,
  exportScenarioJson,
} from './scenario-schema'

describe('sim/scenario-schema', () => {
  it('validates basic scenario structure', () => {
    const bad = validateScenario(null)
    expect(bad.ok).toBe(false)
    expect(bad.errors.length).toBeGreaterThan(0)

    const missingFields = validateScenario({ id: 1, title: 2, durationHours: 'nope', envelopes: {}, events: {} })
    expect(missingFields.ok).toBe(false)
    expect(missingFields.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Scenario.id'),
        expect.stringContaining('Scenario.title'),
        expect.stringContaining('Scenario.durationHours'),
        expect.stringContaining('Scenario.envelopes'),
        expect.stringContaining('Scenario.events'),
      ])
    )
  })

  it('warns on unknown event types and on envelope_version < 1', () => {
    const report = validateScenario({
      id: 's1',
      title: 'T',
      durationHours: 12,
      envelopes: [{ envelopeId: 'ENV-1', name: 'E', createdHour: 0, endHour: 12, envelope_version: 0 }],
      events: [{ type: 'weird_event', hour: 1, envelopeId: 'ENV-1' }],
    })

    expect(report.ok).toBe(true)
    expect(report.warnings.join('\n')).toContain("unknown type 'weird_event'")
    expect(report.warnings.join('\n')).toContain('envelope_version should be >= 1')
  })

  it('normalizes a partial scenario (defaults, drops invalid envelopes, sorts events, generates eventIds)', () => {
    const raw = {
      // no schemaVersion/id/title -> defaults
      durationHours: 10,
      envelopes: [
        { envelopeId: 'ENV-1', name: 'E', createdHour: 0, endHour: 10, assumptions: ['a1'], constraints: ['c1'] },
        { name: 'missing id' },
      ],
      fleets: [
        { stewardRole: 'Customer Steward', agents: [{ name: 'Agent A', envelopeIds: ['ENV-1'] }] },
      ],
      events: [
        { type: 'signal', hour: 2, envelopeId: 'ENV-1', semanticVector: [0.2, 0.3] },
        { type: 'decision', hour: 1, envelopeId: 'ENV-1', status: 'allowed' },
        { type: 'unknown', hour: 3 },
        { type: 'embedding', hour: 4, embeddingId: 'EMB-1', embeddingType: 'decision', sourceEventId: 'decision:1:ENV-1:0', semanticContext: 'ctx' },
      ],
    }

    const { scenario, errors, warnings } = normalizeScenario(raw)
    expect(errors).toEqual([])

    expect(scenario.schemaVersion).toBe(SCHEMA_VERSION)
    expect(String(scenario.id)).toMatch(/^scenario-/)
    expect(scenario.title).toBe('Untitled Scenario')

    // invalid envelope dropped
    expect(scenario.envelopes.map(e => e.envelopeId)).toEqual(['ENV-1'])

    // agent normalization
    expect(scenario.fleets[0].agents[0]).toMatchObject({
      name: 'Agent A',
      envelopeIds: ['ENV-1'],
    })
    expect(typeof scenario.fleets[0].agents[0].agentId).toBe('string')

    // events are sorted by hour and have eventId
    expect(scenario.events.map(e => e.hour)).toEqual([1, 2, 3, 4])
    scenario.events.forEach((e) => {
      expect(typeof e.eventId).toBe('string')
      expect(typeof e.type).toBe('string')
      expect(typeof e.hour).toBe('number')
    })

    // unknown type produces a warning during normalize (via validateScenario)
    expect(warnings.join('\n')).toContain("unknown type 'unknown'")

    // semanticVector is preserved for any event when it is a 2-element array
    const signal = scenario.events.find(e => e.type === 'signal')
    expect(signal.semanticVector).toEqual([0.2, 0.3])

    const emb = scenario.events.find(e => e.type === 'embedding')
    expect(emb.semanticVector).toBeUndefined()
  })

  it('normalizes embedding semanticVector to a 2-number array when provided', () => {
    const raw = {
      id: 's1',
      title: 'T',
      durationHours: 10,
      envelopes: [{ envelopeId: 'ENV-1', name: 'E', createdHour: 0, endHour: 10 }],
      events: [
        { type: 'embedding', hour: 1, embeddingId: 'EMB-1', embeddingType: 'decision', sourceEventId: 'X', semanticContext: 'ctx', semanticVector: ['0.2', 0.9] },
      ],
    }

    const { scenario } = normalizeScenario(raw)
    expect(scenario.events[0].semanticVector).toEqual([0, 0.9])
  })

  it('parseScenarioJson returns ok=false on invalid JSON', () => {
    const report = parseScenarioJson('{ this is not json')
    expect(report.ok).toBe(false)
    expect(report.errors).toEqual(['Invalid JSON.'])
  })

  it('exportScenario and exportScenarioJson round-trip schema-normalized output', () => {
    const raw = {
      id: 's1',
      title: 'T',
      durationHours: 10,
      envelopes: [{ envelopeId: 'ENV-1', name: 'E', createdHour: 0, endHour: 10 }],
      events: [{ type: 'decision', hour: 1, envelopeId: 'ENV-1', status: 'allowed' }],
    }

    const exported = exportScenario(raw)
    expect(exported).toMatchObject({ id: 's1', title: 'T', durationHours: 10 })
    expect(exported.envelopes).toHaveLength(1)

    const json = exportScenarioJson(raw, { pretty: false })
    expect(typeof json).toBe('string')
    const parsed = JSON.parse(json)
    expect(parsed).toMatchObject({ id: 's1', title: 'T', durationHours: 10 })
  })
})
