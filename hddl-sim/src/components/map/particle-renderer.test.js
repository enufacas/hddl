import { describe, expect, test } from 'vitest'
import {
  computeParticleGroupTransform,
  computeParticleOpacity,
  computeParticleLabelLines,
  computeParticleLabelOpacity,
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
})
