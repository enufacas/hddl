import { describe, it, expect } from 'vitest'
import { stepParticle } from './particle-motion'

function makeNode(overrides = {}) {
  return {
    id: 'n1',
    x: 100,
    y: 50,
    r: 40,
    ...overrides
  }
}

describe('particle-motion', () => {
  it('updates orbiting particles and decrements orbit ticks', () => {
    const nodes = [makeNode({ id: 'steward', x: 100, y: 50, r: 40 })]

    const p = {
      id: 'p1',
      type: 'boundary_interaction',
      status: 'escalated',
      x: 0,
      y: 0,
      targetNodeId: 'steward',
      targetX: 100,
      targetY: 50,
      orbit: true,
      orbitTicksLeft: 2,
      orbitAngle: 0,
      life: 1.5
    }

    stepParticle(p, nodes)

    // r = min(22, 40 * 0.45) = 18
    expect(p.orbitAngle).toBeCloseTo(0.11, 6)
    expect(p.x).toBeCloseTo(100 + Math.cos(0.11) * 18, 6)
    expect(p.y).toBeCloseTo(50 + Math.sin(0.11) * 18, 6)
    expect(p.orbitTicksLeft).toBe(1)
    expect(p.life).toBeCloseTo(1.5 - 0.003, 6)
    expect(p.labelOpacity).toBeCloseTo(0.85, 6)
  })

  it('reuses curve cache until endpoints move past threshold', () => {
    const nodes = []
    const p = {
      id: 'p2',
      type: 'signal',
      status: 'created',
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 0,
      t: 0,
      life: 1,
      curve: { p0: { x: 0, y: 0 }, p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 }, p3: { x: 100, y: 0 } },
      curveCache: null
    }

    stepParticle(p, nodes)
    const curve1 = p.curveCache?.curve
    expect(curve1).toBeTruthy()

    stepParticle(p, nodes)
    expect(p.curveCache.curve).toBe(curve1)

    // Move endpoint enough to trigger re-bake
    p.targetX = 103
    stepParticle(p, nodes)
    expect(p.curveCache.curve).not.toBe(curve1)
  })

  it('pulses at waypoint then redirects to final target', () => {
    const nodes = [makeNode()]

    const p = {
      id: 'p3',
      type: 'boundary_interaction',
      status: 'escalated',
      sourceX: 0,
      sourceY: 0,
      targetX: 10,
      targetY: 20,
      t: 1,
      life: 1.5,
      curve: null,

      hasWaypoint: true,
      waypointPulseTicks: 0,
      waypointPulseMax: 2,
      finalTargetX: 200,
      finalTargetY: 220,

      shouldOrbitAfterWaypoint: true,
      orbitTicksLeft: 5,
      orbitAfterTravel: false
    }

    stepParticle(p, nodes)
    expect(p.hasWaypoint).toBe(true)
    expect(p.waypointPulseTicks).toBe(1)
    expect(p.pulseScale).toBeGreaterThanOrEqual(0.5)
    expect(p.pulseScale).toBeLessThanOrEqual(1.5)

    stepParticle(p, nodes)
    expect(p.hasWaypoint).toBe(false)
    expect(p.t).toBe(0)
    expect(p.sourceX).toBeCloseTo(10, 6)
    expect(p.sourceY).toBeCloseTo(20, 6)
    expect(p.targetX).toBe(200)
    expect(p.targetY).toBe(220)
    expect(p.curveCache).toBe(null)
    expect(p.curve?.p0?.x).toBeCloseTo(10, 6)
    expect(p.curve?.p3?.x).toBeCloseTo(200, 6)
    expect(p.orbitAfterTravel).toBe(true)
  })
})
