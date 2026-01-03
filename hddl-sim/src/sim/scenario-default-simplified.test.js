import { describe, it, expect } from 'vitest'

import { createDefaultScenario } from './scenario-default-simplified'

describe('scenario-default-simplified', () => {
  it('createDefaultScenario() returns a deep clone (safe to mutate)', () => {
    const a = createDefaultScenario()
    const b = createDefaultScenario()

    expect(a).not.toBe(b)

    // Mutate A and ensure B is unaffected
    a.durationHours = 999
    expect(b.durationHours).not.toBe(999)

    // Nested mutation should not leak either
    if (Array.isArray(a.envelopes) && a.envelopes.length) {
      a.envelopes[0].name = 'mutated'
      expect(b.envelopes?.[0]?.name).not.toBe('mutated')
    }
  })

  it('createDefaultScenario() returns an object with expected top-level keys', () => {
    const s = createDefaultScenario()

    expect(typeof s).toBe('object')
    expect(s).toHaveProperty('durationHours')
    expect(s).toHaveProperty('fleets')
    expect(s).toHaveProperty('envelopes')
    expect(s).toHaveProperty('events')
  })
})
