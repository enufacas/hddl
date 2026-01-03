import { describe, it, expect } from 'vitest'
import { getResolutionTime } from './event-resolution'

describe('getResolutionTime', () => {
  it('returns hour of first resolving revision/decision', () => {
    const allEvents = [
      { type: 'signal', hour: 1 },
      { type: 'revision', hour: 4, resolvesEventId: 'b:1' },
      { type: 'decision', hour: 5, resolvesEventId: 'b:1' }
    ]

    expect(getResolutionTime(allEvents, 'b:1')).toBe(4)
  })

  it('returns null if no resolver found', () => {
    const allEvents = [{ type: 'revision', hour: 4, resolvesEventId: 'x' }]
    expect(getResolutionTime(allEvents, 'b:1')).toBeNull()
  })

  it('returns null for falsy eventId', () => {
    expect(getResolutionTime([], '')).toBeNull()
  })
})
