import { describe, it, expect } from 'vitest'
import { formatParticleLabel, wrapTextLinesByChars } from './particle-labels'

describe('formatParticleLabel', () => {
  it('formats boundary interaction with canonical prefix + reason', () => {
    const text = formatParticleLabel({
      type: 'boundary_interaction',
      boundary_kind: 'escalated',
      boundary_reason: 'threshold_escalation'
    })

    expect(text).toBe('Exception Request: threshold escalation')
  })

  it('formats retrieval with result count and top score percent', () => {
    const text = formatParticleLabel({
      type: 'retrieval',
      retrievedEmbeddings: ['EMB-1', 'EMB-2'],
      relevanceScores: [0.93, 0.81]
    })

    expect(text).toBe('Query: 2 results (93%)')
  })

  it('formats blocked decision with blocked prefix', () => {
    const text = formatParticleLabel({
      type: 'decision',
      status: 'denied'
    })

    expect(text).toBe('Decision (blocked): denied')
  })
})

describe('wrapTextLinesByChars', () => {
  it('wraps words without exceeding max chars', () => {
    const lines = wrapTextLinesByChars('one two three four', 7)
    expect(lines).toEqual(['one two', 'three', 'four'])
  })

  it('hard-splits a long word', () => {
    const lines = wrapTextLinesByChars('ABCDEFGHIJK', 4)
    expect(lines).toEqual(['ABCD', 'EFGH', 'IJK'])
  })

  it('returns empty array for blank input', () => {
    expect(wrapTextLinesByChars('   ', 10)).toEqual([])
  })
})
