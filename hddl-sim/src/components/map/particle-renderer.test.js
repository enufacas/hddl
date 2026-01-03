import { describe, expect, test } from 'vitest'
import {
  computeParticleGroupTransform,
  computeParticleOpacity,
  computeParticleLabelLines,
  computeParticleLabelOpacity,
  computeParticleTestId,
  computeParticleStatusAttr,
  computeParticleLabelTspanSpecs,
} from './particle-renderer'

describe('map/particle-renderer', () => {
  test('computeParticleGroupTransform includes translate and scale', () => {
    expect(computeParticleGroupTransform({ x: 10, y: 20, pulseScale: 1.5 })).toBe('translate(10,20) scale(1.5)')
    expect(computeParticleGroupTransform({ x: 0, y: 0 })).toBe('translate(0,0) scale(1)')
  })

  test('computeParticleOpacity returns life', () => {
    expect(computeParticleOpacity({ life: 0.2 })).toBe(0.2)
  })

  test('computeParticleLabelLines trims blanks and delegates to wrapper', () => {
    const wrap = (text, max) => [`${text}:${max}`]
    expect(computeParticleLabelLines({ text: 'hello', maxCharsPerLine: 22, wrapTextLinesByChars: wrap })).toEqual([
      'hello:22',
    ])
    expect(computeParticleLabelLines({ text: '   ', maxCharsPerLine: 22, wrapTextLinesByChars: wrap })).toEqual([])
  })

  test('computeParticleLabelOpacity multiplies and clamps at 0', () => {
    expect(computeParticleLabelOpacity({ labelOpacity: 0.5, life: 0.4 })).toBeCloseTo(0.2)
    expect(computeParticleLabelOpacity({ labelOpacity: -1, life: 1 })).toBe(0)
    expect(computeParticleLabelOpacity({})).toBe(0)
  })

  test('computeParticleTestId builds stable test ids', () => {
    expect(computeParticleTestId({ type: 'event', id: 'p1' })).toBe('particle-event-p1')
    expect(computeParticleTestId({ type: 'event' })).toBe('particle-event-unknown')
    expect(computeParticleTestId({})).toBe('particle-undefined-unknown')
  })

  test('computeParticleStatusAttr defaults to none', () => {
    expect(computeParticleStatusAttr({ status: 'active' })).toBe('active')
    expect(computeParticleStatusAttr({})).toBe('none')
  })

  test('computeParticleLabelTspanSpecs returns dy=0 for first line, then lineHeight', () => {
    expect(computeParticleLabelTspanSpecs({ lines: [] })).toEqual([])
    expect(computeParticleLabelTspanSpecs({ lines: ['a', 'b'], x: 8, lineHeight: 12 })).toEqual([
      { x: 8, dy: 0, text: 'a' },
      { x: 8, dy: 12, text: 'b' },
    ])
    expect(computeParticleLabelTspanSpecs({ lines: ['x', 'y'], x: 10, lineHeight: 20 })).toEqual([
      { x: 10, dy: 0, text: 'x' },
      { x: 10, dy: 20, text: 'y' },
    ])
  })
})
