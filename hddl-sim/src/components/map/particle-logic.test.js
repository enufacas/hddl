import { describe, it, expect } from 'vitest'
import {
  getParticleCurveSign,
  computeOrbitDurationTicks,
  getParticleLife,
  computeOrbitTicksLeft,
  getWaypointPulseMax
} from './particle-logic'

describe('particle-logic', () => {
  it('uses +1 curve sign for revision, -1 otherwise', () => {
    expect(getParticleCurveSign('revision')).toBe(1)
    expect(getParticleCurveSign('signal')).toBe(-1)
  })

  it('computes orbit duration ticks from resolution time', () => {
    const ticks = computeOrbitDurationTicks({ type: 'boundary_interaction', hour: 10 }, 12)
    expect(ticks).toBe(50)
  })

  it('defaults orbit duration when resolution hour missing', () => {
    const ticks = computeOrbitDurationTicks({ type: 'boundary_interaction', hour: 10 }, null)
    expect(ticks).toBe(30)
  })

  it('assigns extra life to boundary interactions', () => {
    expect(getParticleLife('boundary_interaction')).toBe(1.5)
    expect(getParticleLife('decision')).toBe(1.0)
  })

  it('computes orbit ticks left based on type/status', () => {
    expect(computeOrbitTicksLeft({ type: 'boundary_interaction' }, 77)).toBe(77)
    expect(computeOrbitTicksLeft({ type: 'decision', status: 'allowed' }, 0)).toBe(18)
    expect(computeOrbitTicksLeft({ type: 'decision', status: 'denied' }, 0)).toBe(0)
  })

  it('selects waypoint pulse max by type', () => {
    expect(getWaypointPulseMax('boundary_interaction')).toBe(8)
    expect(getWaypointPulseMax('decision')).toBe(12)
  })
})
