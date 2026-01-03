import { describe, it, expect } from 'vitest'
import { nextParticles } from './flow-particles'

function makeDeterministicRandom(values) {
  let i = 0
  return () => {
    const v = values[i] ?? 0
    i += 1
    return v
  }
}

describe('flow-particles', () => {
  it('creates boundary_interaction particle with waypoint and steward final target', () => {
    const nodes = [
      { type: 'envelope', id: 'env-1', x: 300, y: 200 },
      { type: 'steward', id: 'stew-1', name: 'Engineering Steward', x: 500, y: 200 },
      { type: 'agent', id: 'agent-1', name: 'Agent Alpha', x: 120, y: 90 }
    ]

    const boundary = {
      type: 'boundary_interaction',
      eventId: 'boundary:1',
      hour: 10,
      envelopeId: 'env-1',
      actorRole: 'Engineering Steward',
      actorName: 'Agent Alpha',
      boundary_kind: 'escalated'
    }

    const revision = {
      type: 'revision',
      eventId: 'rev:1',
      hour: 12,
      resolvesEventId: 'boundary:1',
      envelopeId: 'env-1',
      actorRole: 'Engineering Steward'
    }

    const random = makeDeterministicRandom([0.2, 0.3, 0.4])

    const out = nextParticles({
      particles: [],
      recentEvents: [boundary],
      nodes,
      allEvents: [boundary, revision],
      hour: 12,
      width: 800,
      height: 600,
      mapHeight: 520,
      random
    })

    expect(out).toHaveLength(1)
    const p = out[0]
    expect(p.type).toBe('boundary_interaction')
    expect(p.hasWaypoint).toBe(true)
    expect(p.finalTargetX).toBe(500)
    expect(p.finalTargetY).toBe(200)
    // resolution is 2 hours later => 50 ticks, and boundary interactions orbitTicksLeft = orbitDuration
    expect(p.orbitTicksLeft).toBe(50)
  })

  it('does not create duplicates when called repeatedly', () => {
    const nodes = [{ type: 'envelope', id: 'env-1', x: 300, y: 200 }]
    const e = { type: 'signal', eventId: 'sig:1', hour: 1, envelopeId: 'env-1' }

    const out1 = nextParticles({
      particles: [],
      recentEvents: [e],
      nodes,
      allEvents: [e],
      hour: 1,
      width: 800,
      height: 600,
      mapHeight: 520,
      random: makeDeterministicRandom([0.1, 0.2, 0.3])
    })

    const out2 = nextParticles({
      particles: out1,
      recentEvents: [e],
      nodes,
      allEvents: [e],
      hour: 1,
      width: 800,
      height: 600,
      mapHeight: 520,
      random: makeDeterministicRandom([0.1, 0.2, 0.3])
    })

    expect(out2).toHaveLength(1)
    expect(out2[0].id).toBe('sig:1')
  })

  it('filters out dead particles', () => {
    const nodes = [{ type: 'envelope', id: 'env-1', x: 300, y: 200 }]
    const dead = { id: 'dead', life: 0 }

    const out = nextParticles({
      particles: [dead],
      recentEvents: [],
      nodes,
      allEvents: [],
      hour: 0,
      width: 800,
      height: 600,
      mapHeight: 520
    })

    expect(out).toEqual([])
  })
})
