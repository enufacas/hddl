import { describe, expect, test } from 'vitest'
import { computeOpenExceptionLinks } from './exception-links'

describe('map/exception-links', () => {
  test('returns link for escalated boundary interaction until resolved by revision', () => {
    const nodes = [
      { type: 'envelope', id: 'ENV-1' },
      { type: 'steward', id: 'steward-1', name: 'Data Steward' },
    ]

    const allEvents = [
      {
        type: 'boundary_interaction',
        hour: 1,
        eventId: 'B1',
        envelopeId: 'ENV-1',
        actorRole: 'Data Steward',
        boundary_kind: 'escalated',
        label: 'Needs approval',
      },
      {
        type: 'revision',
        hour: 2,
        eventId: 'R1',
        resolvesEventId: 'B1',
        actorRole: 'Data Steward',
      },
    ]

    const linksAt1_5 = computeOpenExceptionLinks({ allEvents, hour: 1.5, nodes })
    expect(linksAt1_5).toHaveLength(1)
    expect(linksAt1_5[0].id).toBe('B1')

    const linksAt3 = computeOpenExceptionLinks({ allEvents, hour: 3, nodes })
    expect(linksAt3).toHaveLength(0)
  })

  test('treats boundaryKind and casing consistently', () => {
    const nodes = [
      { type: 'envelope', id: 'ENV-1' },
      { type: 'steward', id: 'steward-1', name: 'Data Steward' },
    ]

    const allEvents = [
      {
        type: 'boundary_interaction',
        hour: 1,
        eventId: 'B1',
        envelope_id: 'ENV-1',
        actorRole: 'Data Steward',
        boundaryKind: 'ESCALATED',
      },
    ]

    const links = computeOpenExceptionLinks({ allEvents, hour: 1, nodes })
    expect(links).toHaveLength(1)
  })
})
