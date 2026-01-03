import { describe, it, expect } from 'vitest'
import {
  formatSimTime,
  getEnvelopeStatus,
  getEventsNearTime,
  getEnvelopeLineage,
  getEnvelopeAtTime,
  getEnvelopeHistory,
  getStewardActivity,
  getBoundaryInteractionCounts,
  getDecisionMemoryEntries,
  getRevisionDiffAtTime,
  getActiveDSGSession,
  getDSGMessages,
} from './selectors'

describe('sim/selectors', () => {
  it('formats sim time with day/hour', () => {
    expect(formatSimTime(0)).toBe('Day 0, 00:00')
    expect(formatSimTime(1)).toBe('Day 0, 01:00')
    expect(formatSimTime(24)).toBe('Day 1, 00:00')
    expect(formatSimTime(49)).toBe('Day 2, 01:00')
  })

  it('computes envelope status across lifecycle boundaries', () => {
    const env = { envelopeId: 'ENV-1', createdHour: 10, endHour: 20 }
    expect(getEnvelopeStatus(env, 9)).toBe('pending')
    expect(getEnvelopeStatus(env, 10)).toBe('active')
    expect(getEnvelopeStatus(env, 19.999)).toBe('active')
    expect(getEnvelopeStatus(env, 20)).toBe('ended')
  })

  it('filters and sorts events near a time window (inclusive)', () => {
    const scenario = {
      events: [
        { type: 'signal', hour: 10 },
        { type: 'signal', hour: 4 },
        { type: 'signal', hour: 16 },
        { type: 'signal', hour: 17 },
        { type: 'signal', hour: 'bad' },
      ],
    }

    const near = getEventsNearTime(scenario, 10, 6)
    expect(near.map(e => e.hour)).toEqual([4, 10, 16])
  })

  it('builds envelope lineage from base + revisions', () => {
    const scenario = {
      envelopes: [
        {
          envelopeId: 'ENV-1',
          createdHour: 0,
          endHour: 48,
          envelope_version: 1,
          assumptions: ['a1'],
          constraints: ['c1'],
        },
      ],
      events: [
        {
          type: 'revision',
          hour: 5,
          envelopeId: 'ENV-1',
          revision_id: 'rev-1',
          envelope_version: 2,
          nextAssumptions: ['a1', 'a2'],
          nextConstraints: ['c1'],
        },
        {
          type: 'revision',
          hour: 8,
          envelopeId: 'ENV-1',
          eventId: 'rev-2-event',
          // no nextAssumptions/nextConstraints -> carry forward
        },
      ],
    }

    const chain = getEnvelopeLineage(scenario, 'ENV-1')
    expect(chain.map(v => v.kind)).toEqual(['base', 'revision', 'revision'])
    expect(chain[0].assumptions).toEqual(['a1'])
    expect(chain[1]).toMatchObject({
      hour: 5,
      envelope_version: 2,
      revision_id: 'rev-1',
      assumptions: ['a1', 'a2'],
      constraints: ['c1'],
    })
    expect(chain[2].revision_id).toBe('rev-2-event')
    expect(chain[2].assumptions).toEqual(['a1', 'a2'])
  })

  it('projects envelope state at a given hour', () => {
    const scenario = {
      envelopes: [
        { envelopeId: 'ENV-1', name: 'E', createdHour: 0, endHour: 48, assumptions: ['a1'], constraints: ['c1'] },
      ],
      events: [
        { type: 'revision', hour: 5, envelopeId: 'ENV-1', revision_id: 'rev-1', envelope_version: 2, nextAssumptions: ['a2'], nextConstraints: ['c2'] },
      ],
    }

    const at4 = getEnvelopeAtTime(scenario, 'ENV-1', 4)
    expect(at4.envelope_version).toBe(1)
    expect(at4.assumptions).toEqual(['a1'])

    const at5 = getEnvelopeAtTime(scenario, 'ENV-1', 5)
    expect(at5.envelope_version).toBe(2)
    expect(at5.revision_id).toBe('rev-1')
    expect(at5.assumptions).toEqual(['a2'])
    expect(at5.constraints).toEqual(['c2'])
    expect(at5.revisedHour).toBe(5)
  })

  it('filters envelope history to relevant types and sorts ascending', () => {
    const scenario = {
      events: [
        { type: 'decision', hour: 1, envelopeId: 'ENV-1' },
        { type: 'signal', hour: 2, envelopeId: 'ENV-1' },
        { type: 'annotation', hour: 3, envelopeId: 'ENV-1' },
        { type: 'weird', hour: 0, envelopeId: 'ENV-1' },
        { type: 'revision', hour: 4, envelopeId: 'ENV-1' },
      ],
    }

    const history = getEnvelopeHistory(scenario, 'ENV-1')
    expect(history.map(e => e.type)).toEqual(['signal', 'annotation', 'revision'])
    expect(history.map(e => e.hour)).toEqual([2, 3, 4])
  })

  it('gets steward activity in a lookback window and sorts descending', () => {
    const scenario = {
      events: [
        { type: 'revision', hour: 10 },
        { type: 'boundary_interaction', hour: 9 },
        { type: 'decision', hour: 8 },
        { type: 'annotation', hour: 7 },
      ],
    }

    const act = getStewardActivity(scenario, 10, 24)
    expect(act.map(e => e.type)).toEqual(['revision', 'boundary_interaction', 'annotation'])
    expect(act.map(e => e.hour)).toEqual([10, 9, 7])
  })

  it('counts boundary interactions by kind and by envelope', () => {
    const scenario = {
      events: [
        { type: 'boundary_interaction', hour: 10, envelopeId: 'ENV-1', boundary_kind: 'escalated' },
        { type: 'boundary_interaction', hour: 11, envelopeId: 'ENV-1', boundary_kind: 'OVERRIDDEN' },
        { type: 'boundary_interaction', hour: 12, envelopeId: 'ENV-2', boundary_kind: ' deferred ' },
        { type: 'boundary_interaction', hour: 13, envelopeId: 'ENV-2', boundary_kind: 'unknown' },
      ],
    }

    const { totals, byEnvelope } = getBoundaryInteractionCounts(scenario, 13, 24)
    expect(totals).toEqual({ escalated: 1, overridden: 1, deferred: 1 })

    expect(byEnvelope.get('ENV-1')).toMatchObject({ escalated: 1, overridden: 1, deferred: 0, total: 2 })
    expect(byEnvelope.get('ENV-2')).toMatchObject({ escalated: 0, overridden: 0, deferred: 1, total: 2 })
  })

  it('extracts decision memory entries (annotation + decision_id) and sorts descending', () => {
    const scenario = {
      events: [
        { type: 'annotation', hour: 9, decision_id: 'D-1' },
        { type: 'annotation', hour: 10, decision_id: 'D-2' },
        { type: 'annotation', hour: 11 },
      ],
    }

    const entries = getDecisionMemoryEntries(scenario, 12, 48)
    expect(entries.map(e => e.decision_id)).toEqual(['D-2', 'D-1'])
  })

  it('computes revision diffs between successive lineage entries', () => {
    const scenario = {
      envelopes: [
        { envelopeId: 'ENV-1', createdHour: 0, endHour: 48, assumptions: ['a1'], constraints: ['c1'] },
      ],
      events: [
        { type: 'revision', hour: 5, envelopeId: 'ENV-1', revision_id: 'rev-1', envelope_version: 2, nextAssumptions: ['a1', 'a2'], nextConstraints: ['c1'] },
        { type: 'revision', hour: 7, envelopeId: 'ENV-1', revision_id: 'rev-2', envelope_version: 3, nextAssumptions: ['a2'], nextConstraints: ['c1', 'c2'] },
      ],
    }

    const diff = getRevisionDiffAtTime(scenario, 'ENV-1', 7)
    expect(diff).toMatchObject({ envelopeId: 'ENV-1', fromVersion: 2, toVersion: 3, revision_id: 'rev-2' })
    expect(diff.assumptions).toEqual({ added: [], removed: ['a1'] })
    expect(diff.constraints).toEqual({ added: ['c2'], removed: [] })
  })

  it('returns the active DSG session and messages up to a time', () => {
    const scenario = {
      events: [
        { type: 'dsg_session', hour: 1, sessionId: 'S1' },
        { type: 'dsg_message', hour: 1.5, sessionId: 'S1', text: 'a' },
        { type: 'dsg_session', hour: 5, sessionId: 'S2' },
        { type: 'dsg_message', hour: 6, sessionId: 'S2', text: 'b' },
        { type: 'dsg_message', hour: 7, sessionId: 'S2', text: 'c' },
      ],
    }

    expect(getActiveDSGSession(scenario, 4).sessionId).toBe('S1')
    expect(getActiveDSGSession(scenario, 6).sessionId).toBe('S2')

    const msgs = getDSGMessages(scenario, 'S2', 6)
    expect(msgs.map(m => m.text)).toEqual(['b'])
  })
})
