import { beforeAll, afterAll, describe, expect, test } from 'vitest'

let getStewardEnvelopeInteractionCount

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
  ;({ getStewardEnvelopeInteractionCount } = await import('./tooltip-manager'))
})

afterAll(() => {
  delete globalThis.localStorage
})

describe('map/tooltip-manager', () => {
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
})
