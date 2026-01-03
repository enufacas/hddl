import { describe, it, expect } from 'vitest'
import {
  DETAIL_LEVELS,
  getDetailLevel,
  getAdaptiveAgentName,
  getAdaptiveEnvelopeLabel,
  getAdaptiveStewardLabel,
  getEnvelopeDimensions,
  shouldRenderEnvelopeElement
} from './map/detail-levels'
import { bezierPoint, makeFlowCurve } from './map/bezier-math'

describe('getDetailLevel', () => {
  it('returns FULL for width > 1000', () => {
    expect(getDetailLevel(1001)).toBe('full')
    expect(getDetailLevel(1500)).toBe('full')
  })

  it('returns STANDARD for width 600-1000', () => {
    expect(getDetailLevel(601)).toBe('standard')
    expect(getDetailLevel(800)).toBe('standard')
    expect(getDetailLevel(1000)).toBe('standard')
  })

  it('returns COMPACT for width 400-600', () => {
    expect(getDetailLevel(401)).toBe('compact')
    expect(getDetailLevel(500)).toBe('compact')
    expect(getDetailLevel(600)).toBe('compact')
  })

  it('returns MINIMAL for width <= 400', () => {
    expect(getDetailLevel(400)).toBe('minimal')
    expect(getDetailLevel(300)).toBe('minimal')
    expect(getDetailLevel(0)).toBe('minimal')
  })
})

describe('getAdaptiveAgentName', () => {
  it('returns empty string for falsy input', () => {
    expect(getAdaptiveAgentName('', 'full')).toBe('')
    expect(getAdaptiveAgentName(null, 'full')).toBe('')
  })

  it('returns full name at FULL level', () => {
    expect(getAdaptiveAgentName('John Smith', 'full')).toBe('John Smith')
    expect(getAdaptiveAgentName('Agent-Alpha-Prime', 'full')).toBe('Agent-Alpha-Prime')
  })

  it('returns first word at STANDARD level', () => {
    expect(getAdaptiveAgentName('John Smith', 'standard')).toBe('John')
    expect(getAdaptiveAgentName('Agent-Alpha', 'standard')).toBe('Agent')
  })

  it('returns initials at COMPACT level', () => {
    expect(getAdaptiveAgentName('John Smith', 'compact')).toBe('JS')
    expect(getAdaptiveAgentName('Agent-Alpha-Prime', 'compact')).toBe('AAP')
  })

  it('returns empty string at MINIMAL level', () => {
    expect(getAdaptiveAgentName('John Smith', 'minimal')).toBe('')
  })
})

describe('getAdaptiveEnvelopeLabel', () => {
  it('returns full label with name at FULL level', () => {
    const result = getAdaptiveEnvelopeLabel('DE-001', 'Insurance', 'full')
    expect(result).toEqual({ label: 'DE-001', showName: true })
  })

  it('returns label without name at STANDARD level', () => {
    const result = getAdaptiveEnvelopeLabel('DE-001', 'Insurance', 'standard')
    expect(result).toEqual({ label: 'DE-001', showName: false })
  })

  it('removes prefix at COMPACT level', () => {
    const result = getAdaptiveEnvelopeLabel('DE-001', 'Insurance', 'compact')
    expect(result).toEqual({ label: '001', showName: false })
  })

  it('returns empty label at MINIMAL level', () => {
    const result = getAdaptiveEnvelopeLabel('DE-001', 'Insurance', 'minimal')
    expect(result).toEqual({ label: '', showName: false })
  })
})

describe('getAdaptiveStewardLabel', () => {
  it('returns full name with version at FULL level', () => {
    const result = getAdaptiveStewardLabel('Sales Steward', 'v2.3.1', 'full')
    expect(result).toEqual({ name: 'Sales Steward', showVersion: true })
  })

  it('abbreviates name at STANDARD level', () => {
    const result = getAdaptiveStewardLabel('Sales Steward', 'v2.3.1', 'standard')
    expect(result).toEqual({ name: 'Sales', showVersion: false })
  })

  it('returns first word at COMPACT level', () => {
    const result = getAdaptiveStewardLabel('Business Domain Steward', 'v1.0.0', 'compact')
    expect(result).toEqual({ name: 'Business', showVersion: false })
  })

  it('returns empty name at MINIMAL level', () => {
    const result = getAdaptiveStewardLabel('Sales Steward', 'v2.3.1', 'minimal')
    expect(result).toEqual({ name: '', showVersion: false })
  })
})

describe('getEnvelopeDimensions', () => {
  it('returns detailed dimensions at FULL level', () => {
    const dims = getEnvelopeDimensions('full', 50)
    expect(dims.density).toBe('detailed')
    expect(dims.scale).toBe(1.0)
    expect(dims.isIcon).toBe(false)
  })

  it('returns normal dimensions at STANDARD level', () => {
    const dims = getEnvelopeDimensions('standard', 50)
    expect(dims.density).toBe('normal')
    expect(dims.scale).toBe(0.8)  // Increased for aggressive sizing
  })

  it('returns compact dimensions at COMPACT level', () => {
    const dims = getEnvelopeDimensions('compact', 50)
    expect(dims.density).toBe('compact')
    expect(dims.scale).toBe(0.6)  // Increased for aggressive sizing
  })

  it('returns icon dimensions at MINIMAL level', () => {
    const dims = getEnvelopeDimensions('minimal', 50)
    expect(dims.density).toBe('icon')
    expect(dims.isIcon).toBe(true)
    expect(dims.radius).toBe(26)  // Increased for aggressive sizing
  })
})

describe('shouldRenderEnvelopeElement', () => {
  it('only renders glow at detailed density', () => {
    expect(shouldRenderEnvelopeElement('glow', 'detailed')).toBe(true)
    expect(shouldRenderEnvelopeElement('glow', 'normal')).toBe(false)
    expect(shouldRenderEnvelopeElement('glow', 'compact')).toBe(false)
  })

  it('renders flap at detailed and normal', () => {
    expect(shouldRenderEnvelopeElement('flap', 'detailed')).toBe(true)
    expect(shouldRenderEnvelopeElement('flap', 'normal')).toBe(true)
    expect(shouldRenderEnvelopeElement('flap', 'compact')).toBe(false)
  })

  it('renders version badge at all levels except icon', () => {
    expect(shouldRenderEnvelopeElement('version', 'detailed')).toBe(true)
    expect(shouldRenderEnvelopeElement('version', 'normal')).toBe(true)
    expect(shouldRenderEnvelopeElement('version', 'compact')).toBe(true)
    expect(shouldRenderEnvelopeElement('version', 'icon')).toBe(false)
  })

  it('returns false for unknown elements', () => {
    expect(shouldRenderEnvelopeElement('unknown', 'detailed')).toBe(false)
  })
})

describe('bezierPoint', () => {
  it('returns p0 at t=0', () => {
    const p0 = { x: 0, y: 0 }
    const p1 = { x: 10, y: 10 }
    const p2 = { x: 20, y: 20 }
    const p3 = { x: 30, y: 30 }
    const result = bezierPoint(0, p0, p1, p2, p3)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })

  it('returns p3 at t=1', () => {
    const p0 = { x: 0, y: 0 }
    const p1 = { x: 10, y: 10 }
    const p2 = { x: 20, y: 20 }
    const p3 = { x: 30, y: 30 }
    const result = bezierPoint(1, p0, p1, p2, p3)
    expect(result.x).toBe(30)
    expect(result.y).toBe(30)
  })

  it('calculates midpoint at t=0.5', () => {
    const p0 = { x: 0, y: 0 }
    const p1 = { x: 10, y: 0 }
    const p2 = { x: 20, y: 0 }
    const p3 = { x: 30, y: 0 }
    const result = bezierPoint(0.5, p0, p1, p2, p3)
    expect(result.x).toBe(15)
    expect(result.y).toBe(0)
  })

  it('handles curved paths', () => {
    const p0 = { x: 0, y: 0 }
    const p1 = { x: 0, y: 10 }
    const p2 = { x: 10, y: 10 }
    const p3 = { x: 10, y: 0 }
    const result = bezierPoint(0.5, p0, p1, p2, p3)
    expect(result.x).toBeGreaterThan(0)
    expect(result.x).toBeLessThan(10)
    expect(result.y).toBeGreaterThan(0)
  })
})
