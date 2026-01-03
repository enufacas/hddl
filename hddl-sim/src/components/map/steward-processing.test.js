import { describe, expect, test } from 'vitest'
import { applyStewardProcessingState } from './steward-processing'

describe('map/steward-processing', () => {
  test('marks steward processing while unresolved boundary exists', () => {
    const nodes = [{ type: 'steward', id: 's1', name: 'Data Steward', isProcessing: false }]

    const allEvents = [
      {
        type: 'boundary_interaction',
        hour: 1,
        eventId: 'B1',
        actorRole: 'Data Steward',
      },
      {
        type: 'revision',
        hour: 2,
        eventId: 'R1',
        actorRole: 'Data Steward',
        resolvesEventId: 'B1',
      },
    ]

    applyStewardProcessingState(nodes, allEvents, 1.5)
    expect(nodes[0].isProcessing).toBe(true)

    applyStewardProcessingState(nodes, allEvents, 3)
    expect(nodes[0].isProcessing).toBe(false)
  })
})
