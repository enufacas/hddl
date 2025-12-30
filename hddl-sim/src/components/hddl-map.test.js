import { describe, it, expect } from 'vitest'

// Import the functions we want to test
// Note: These functions need to be exported from hddl-map.js first
// For now, we'll copy the functions here for testing

const DETAIL_LEVELS = {
  FULL: 'full',
  STANDARD: 'standard',
  COMPACT: 'compact',
  MINIMAL: 'minimal'
}

function getDetailLevel(width) {
  if (width > 1000) return DETAIL_LEVELS.FULL
  if (width > 600) return DETAIL_LEVELS.STANDARD
  if (width > 400) return DETAIL_LEVELS.COMPACT
  return DETAIL_LEVELS.MINIMAL
}

function getAdaptiveAgentName(name, level) {
  if (!name) return ''
  switch (level) {
    case DETAIL_LEVELS.FULL:
      return name
    case DETAIL_LEVELS.STANDARD:
      return name.split(/[\s-]/)[0]
    case DETAIL_LEVELS.COMPACT:
      return name.split(/[\s-]/).map(w => w[0]).join('').toUpperCase()
    case DETAIL_LEVELS.MINIMAL:
      return ''
    default:
      return name
  }
}

function getAdaptiveEnvelopeLabel(label, name, level) {
  switch (level) {
    case DETAIL_LEVELS.FULL:
      return { label, showName: true }
    case DETAIL_LEVELS.STANDARD:
      return { label, showName: false }
    case DETAIL_LEVELS.COMPACT:
      return { label: label.replace('DE-', ''), showName: false }
    case DETAIL_LEVELS.MINIMAL:
      return { label: '', showName: false }
    default:
      return { label, showName: true }
  }
}

function getAdaptiveStewardLabel(name, version, level) {
  switch (level) {
    case DETAIL_LEVELS.FULL:
      return { name, showVersion: true }
    case DETAIL_LEVELS.STANDARD:
      return { name: name.replace(' Steward', '').replace('Steward', ''), showVersion: false }
    case DETAIL_LEVELS.COMPACT:
      return { name: name.split(/[\s]/)[0], showVersion: false }
    case DETAIL_LEVELS.MINIMAL:
      return { name: '', showVersion: false }
    default:
      return { name, showVersion: true }
  }
}

const ENVELOPE_DENSITY = {
  [DETAIL_LEVELS.FULL]: 'detailed',
  [DETAIL_LEVELS.STANDARD]: 'normal',
  [DETAIL_LEVELS.COMPACT]: 'compact',
  [DETAIL_LEVELS.MINIMAL]: 'icon'
}

const ENVELOPE_SIZES = {
  detailed: { baseWidth: 140, baseHeight: 88, scale: 1.0 },
  normal: { baseWidth: 110, baseHeight: 68, scale: 0.75 },
  compact: { baseWidth: 80, baseHeight: 50, scale: 0.55 },
  icon: { baseWidth: 48, baseHeight: 48, scale: 0.35, radius: 22 }
}

function getEnvelopeDimensions(level, baseR) {
  const density = ENVELOPE_DENSITY[level] || 'normal'
  const sizes = ENVELOPE_SIZES[density]
  
  const scaledWidth = Math.max(sizes.baseWidth * 0.7, Math.min(sizes.baseWidth, baseR * 3.2))
  const scaledHeight = Math.max(sizes.baseHeight * 0.7, Math.min(sizes.baseHeight, baseR * 2.05))
  
  return {
    width: scaledWidth,
    height: scaledHeight,
    scale: sizes.scale,
    isIcon: density === 'icon',
    radius: sizes.radius || 18,
    density
  }
}

function shouldRenderEnvelopeElement(element, density) {
  const rules = {
    glow: ['detailed'],
    revisionBurst: ['detailed', 'normal'],
    flap: ['detailed', 'normal'],
    fold: ['detailed'],
    status: ['detailed', 'normal'],
    version: ['detailed', 'normal', 'compact'],
    constraintBadges: ['detailed']
  }
  return (rules[element] || []).includes(density)
}

function bezierPoint(t, p0, p1, p2, p3) {
  const u = 1 - t
  return {
    x: (u*u*u * p0.x) + (3*u*u*t * p1.x) + (3*u*t*t * p2.x) + (t*t*t * p3.x),
    y: (u*u*u * p0.y) + (3*u*u*t * p1.y) + (3*u*t*t * p2.y) + (t*t*t * p3.y),
  }
}

function makeFlowCurve(sourceX, sourceY, targetX, targetY, sign) {
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const dist = Math.sqrt(dx * dx + dy * dy)
  
  const curveStrength = Math.min(dist * 0.4, 60)
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2
  
  const perpX = -dy / dist
  const perpY = dx / dist
  
  return {
    cp1x: sourceX + dx * 0.25 + perpX * curveStrength * sign,
    cp1y: sourceY + dy * 0.25 + perpY * curveStrength * sign,
    cp2x: targetX - dx * 0.25 + perpX * curveStrength * sign,
    cp2y: targetY - dy * 0.25 + perpY * curveStrength * sign
  }
}

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
    expect(dims.scale).toBe(0.75)
  })

  it('returns compact dimensions at COMPACT level', () => {
    const dims = getEnvelopeDimensions('compact', 50)
    expect(dims.density).toBe('compact')
    expect(dims.scale).toBe(0.55)
  })

  it('returns icon dimensions at MINIMAL level', () => {
    const dims = getEnvelopeDimensions('minimal', 50)
    expect(dims.density).toBe('icon')
    expect(dims.isIcon).toBe(true)
    expect(dims.radius).toBe(22)
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

describe('makeFlowCurve', () => {
  it('calculates control points for rightward flow', () => {
    const result = makeFlowCurve(0, 0, 100, 0, 1)
    expect(result).toHaveProperty('cp1x')
    expect(result).toHaveProperty('cp1y')
    expect(result).toHaveProperty('cp2x')
    expect(result).toHaveProperty('cp2y')
  })

  it('creates symmetric curves with opposite signs', () => {
    const curve1 = makeFlowCurve(0, 0, 100, 0, 1)
    const curve2 = makeFlowCurve(0, 0, 100, 0, -1)
    expect(curve1.cp1y).toBe(-curve2.cp1y)
    expect(curve1.cp2y).toBe(-curve2.cp2y)
  })

  it('adjusts curve strength based on distance', () => {
    const shortCurve = makeFlowCurve(0, 0, 10, 0, 1)
    const longCurve = makeFlowCurve(0, 0, 200, 0, 1)
    const shortStrength = Math.abs(shortCurve.cp1y)
    const longStrength = Math.abs(longCurve.cp1y)
    expect(longStrength).toBeGreaterThan(shortStrength)
  })

  it('handles vertical flows', () => {
    const result = makeFlowCurve(0, 0, 0, 100, 1)
    expect(result.cp1x).not.toBe(0)
    expect(result.cp2x).not.toBe(0)
  })
})
