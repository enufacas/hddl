/**
 * @fileoverview Embedding Vector Space Renderer
 * 
 * Renders the 3D "memory store" visualization showing decision embeddings
 * positioned in semantic vector space with true perspective.
 * 
 * Key Features:
 * - 3D perspective box with converging grid lines
 * - Semantic clustering (policy ↔ operational, routine ↔ exceptional)
 * - Isometric chip design with depth effects
 * - Historical baseline markers (hour < 0)
 * - Interactive tooltips with embedding metadata
 * - Responsive animations with scrub-aware rendering
 * 
 * @module embedding-renderer
 */

import * as d3 from 'd3'
import { DETAIL_LEVELS } from './detail-levels.js'

/**
 * Steward color mapping - comprehensive across all scenarios
 * @type {Object<string, string>}
 */
const STEWARD_COLORS = {
  // Default scenario
  'Customer Steward': '#EC4899',
  'Customer Success Steward': '#EC4899',
  'HR Steward': '#A855F7',
  'Human Resources Steward': '#A855F7',
  'Sales Steward': '#F59E0B',
  'Data Steward': '#4B96FF',
  
  // Medical scenario
  'Medical Steward': '#10B981',
  'Pharmacy Steward': '#8B5CF6',
  'Emergency Steward': '#EF4444',
  
  // Autonomous vehicles
  'Safety Steward': '#EF4444',
  'Engineering Steward': '#14B8A6',
  'UX Steward': '#EC4899',
  
  // Financial lending
  'Lending Steward': '#10B981',
  'Risk Steward': '#F59E0B',
  'Recovery Steward': '#EF4444',
  'Compliance Steward': '#8B5CF6',
  
  // Database performance
  'Performance Steward': '#4B96FF',
  'Operations Steward': '#EF4444',
  'Infrastructure Steward': '#14B8A6',
  
  // SaaS dashboarding
  'Security Steward': '#F59E0B',
  'Onboarding Steward': '#A855F7',
  
  // Insurance underwriting
  'Underwriting Steward': '#10B981',
  'Claims Steward': '#EC4899',
  'Pricing Steward': '#F59E0B',
  
  // Baseball analytics
  'Strategy Steward': '#10B981',
  'Health Steward': '#EC4899',
  'Roster Steward': '#8B5CF6',
  
  // Air Force avionics
  'Maintenance Steward': '#3B82F6',
  'Supply Steward': '#F59E0B',
  'Training Steward': '#A855F7',
  
  // Vertical hydroponics farm
  'Growth Steward': '#10B981',
  'Environment Steward': '#4B96FF',
  'Nutrition Steward': '#F59E0B',
  'Harvest Steward': '#8B5CF6',
  'Energy Steward': '#EAB308'
}

/**
 * Embedding type labels for tooltips
 * @type {Object<string, string>}
 */
const EMBEDDING_TYPE_LABELS = {
  'decision': 'Decision Pattern',
  'signal': 'Signal Pattern',
  'boundary_interaction': 'Boundary Interaction',
  'revision': 'Policy Revision',
  'session_artifact': 'Stewardship Session'
}

/**
 * Type depth biases for fallback positioning
 * @type {Object<string, number>}
 */
const TYPE_DEPTH_BIAS = {
  'decision': -0.15,
  'revision': -0.05,
  'boundary_interaction': 0,
  'signal': 0.1,
  'session_artifact': 0.15
}

export function getEmbeddingTypeLabel(type) {
  const key = String(type || '')
  return EMBEDDING_TYPE_LABELS[key] || key || 'Embedding'
}

export function getStewardColor(role, fallback = 'var(--status-warning)') {
  const key = String(role || '')
  return STEWARD_COLORS[key] || fallback
}

export function computeEmbeddingBoxBounds({ width, embeddingStoreHeight }) {
  // Perspective dimensions - back is NARROW, front is WIDE
  const backY = embeddingStoreHeight * 0.25
  const frontY = embeddingStoreHeight - 8

  // Back edge (narrow) - centered
  const backLeft = width * 0.25
  const backRight = width * 0.75

  // Front edge (wide) - spans more
  const frontLeft = width * 0.08
  const frontRight = width * 0.92

  function getXAtDepth(normalizedX, depth) {
    const leftAtDepth = backLeft + depth * (frontLeft - backLeft)
    const rightAtDepth = backRight + depth * (frontRight - backRight)
    return leftAtDepth + normalizedX * (rightAtDepth - leftAtDepth)
  }

  return {
    backY,
    frontY,
    backLeft,
    backRight,
    frontLeft,
    frontRight,
    getXAtDepth,
  }
}

export function getEmbeddingColorForRole(role, fallback = '#4B96FF') {
  return getStewardColor(role, fallback)
}

export function computeEmbeddingNormalizedPosition({ event, scenario, typeDepthBias = TYPE_DEPTH_BIAS }) {
  let normalizedX
  let depthT
  let usedSemanticVector = false

  if (event?.semanticVector && Array.isArray(event.semanticVector) && event.semanticVector.length === 2) {
    usedSemanticVector = true
    normalizedX = 0.1 + event.semanticVector[0] * 0.8
    depthT = 0.1 + event.semanticVector[1] * 0.8
    return { normalizedX, depthT, usedSemanticVector }
  }

  const envelopes = scenario?.envelopes || []
  const envelopeIds = [...new Set(envelopes.map(e => e?.envelopeId).filter(Boolean))]
  const envelopeIndex = envelopeIds.indexOf(event?.envelopeId)
  const envelopeCount = Math.max(envelopeIds.length, 1)

  const envelopeBaseX = envelopeIndex >= 0
    ? 0.15 + (envelopeIndex / Math.max(envelopeCount - 1, 1)) * 0.7
    : 0.5

  const semanticHash = (event?.semanticContext || event?.label || '').split('').reduce(
    (acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0
  )
  const semanticOffsetX = ((semanticHash % 100) / 100 - 0.5) * 0.12
  const semanticOffsetY = (((semanticHash * 7) % 100) / 100 - 0.5) * 0.15

  normalizedX = Math.max(0.08, Math.min(0.92, envelopeBaseX + semanticOffsetX))

  const scenarioDuration = scenario?.durationHours || 24
  const normalizedTime = (typeof event?.hour === 'number' && event.hour < 0)
    ? 0
    : Math.min(1, (Number(event?.hour || 0) / scenarioDuration))

  const baseDepthT = normalizedTime * 0.7 + 0.15
  const typeBias = typeDepthBias?.[event?.embeddingType] || 0
  depthT = Math.max(0.05, Math.min(0.95, baseDepthT + typeBias + semanticOffsetY))

  return { normalizedX, depthT, usedSemanticVector }
}

export function computeEmbeddingTargetPosition({ normalizedX, depthT, box3DBounds, floorDepthRange }) {
  const targetX = box3DBounds.getXAtDepth(normalizedX, depthT)
  const targetY = box3DBounds.backY + depthT * floorDepthRange
  const depthZ = depthT * 100
  return { targetX, targetY, depthZ }
}

export function computeEmbeddingPerspectiveParams({ depthT, random = Math.random }) {
  const perspectiveScale = 0.45 + depthT * 0.55
  const depthOpacity = 0.5 + depthT * 0.5
  const perspectiveTilt = -12 * (1 - depthT)
  const randomWobble = (random() - 0.5) * 8
  const rotateAngle = perspectiveTilt + randomWobble
  return { perspectiveScale, depthOpacity, rotateAngle, perspectiveTilt, randomWobble }
}

export function buildEmbeddingTooltipData(event) {
  const isHistorical = (typeof event?.hour === 'number') ? event.hour < 0 : false
  return {
    type: getEmbeddingTypeLabel(event?.embeddingType) || 'Unknown',
    label: event?.label || 'Embedding',
    steward: event?.actorRole || 'Unknown',
    envelope: event?.envelopeId || 'N/A',
    id: event?.embeddingId || event?.eventId || 'N/A',
    context: event?.semanticContext || event?.detail || 'No context available',
    hour: event?.hour,
    isHistorical,
  }
}

export function computeEmbeddingBadgeWidth({ badgeTextWidth, badgePaddingX = 12, minWidth = 70 }) {
  const width = Math.ceil((Number(badgeTextWidth || 0)) + (Number(badgePaddingX || 0) * 2))
  return Math.max(Number(minWidth || 0), width)
}

export function computeEmbeddingBadgeLayout({
  titleWidth,
  badgeWidth,
  svgWidth,
  titleX = 22,
  gap = 12,
  margin = 16,
  inlineY = -8,
  wrappedY = 12,
}) {
  let x = Math.ceil(Number(titleX || 0) + Number(titleWidth || 0) + Number(gap || 0))
  const maxX = Math.max(margin, (Number(svgWidth || 0) - margin) - Number(badgeWidth || 0))
  const wrapped = x > maxX
  if (wrapped) x = Number(titleX || 0)
  return {
    badgeX: x,
    badgeY: wrapped ? wrappedY : inlineY,
    wrapped,
    transform: `translate(${x}, ${wrapped ? wrappedY : inlineY})`,
  }
}

export function computeEmbeddingFloorPolygonPoints({ backLeft, backRight, frontRight, frontLeft, backY, frontY }) {
  return `
      ${backLeft},${backY}
      ${backRight},${backY}
      ${frontRight},${frontY}
      ${frontLeft},${frontY}
    `
}

export function computeEmbeddingVerticalGridLine({ index, count = 7, backY, frontY, getXAtDepth }) {
  const normalizedX = Number(count || 0) === 0 ? 0 : Number(index || 0) / Number(count)
  const x1 = getXAtDepth(normalizedX, 0)
  const x2 = getXAtDepth(normalizedX, 1)
  return { normalizedX, x1, y1: backY, x2, y2: frontY }
}

export function computeEmbeddingHorizontalGridT({ index, count = 6, exponent = 0.7 }) {
  const denom = Math.max(Number(count || 0), 1)
  return Math.pow(Number(index || 0) / denom, Number(exponent || 0))
}

export function computeEmbeddingHorizontalGridLineOpacity({ t, min = 0.15, range = 0.35 }) {
  return Number(min || 0) + Number(t || 0) * Number(range || 0)
}

export function computeEmbeddingHorizontalGridLine({ index, count = 6, backY, floorDepthRange, getXAtDepth, exponent = 0.7 }) {
  const t = computeEmbeddingHorizontalGridT({ index, count, exponent })
  const y = backY + t * floorDepthRange
  const leftX = getXAtDepth(0, t)
  const rightX = getXAtDepth(1, t)
  const opacity = computeEmbeddingHorizontalGridLineOpacity({ t })
  return { t, x1: leftX, y1: y, x2: rightX, y2: y, opacity }
}

export function computeEmbeddingFrontGlowRect({ frontLeft, frontRight, frontY, height = 30, yOffset = 25 }) {
  return {
    x: frontLeft,
    y: frontY - Number(yOffset || 0),
    width: frontRight - frontLeft,
    height: Number(height || 0),
  }
}

export function computeEmbeddingFrontWallHeight({ floorDepthRange, factor = 0.7 }) {
  return Number(floorDepthRange || 0) * Number(factor || 0)
}

export function computeEmbeddingFrontWallRect({ frontLeft, frontRight, frontY, frontWallHeight, extraHeight = 5 }) {
  return {
    x: frontLeft,
    y: frontY - frontWallHeight,
    width: frontRight - frontLeft,
    height: frontWallHeight + Number(extraHeight || 0),
  }
}

export function computeEmbeddingDepthAxisLabelTransform({ frontLeft, backY, frontY, offsetX = 5 }) {
  const x = frontLeft - Number(offsetX || 0)
  const y = (backY + frontY) / 2
  return `rotate(-90, ${x}, ${y})`
}

export function computeEmbeddingChipFacePoints({ chipSize = 16, depth3D = 5 }) {
  const s = Number(chipSize || 0)
  const d = Number(depth3D || 0)
  const half = s / 2
  const top = `
        ${-half},${-half - d}
        ${half},${-half - d}
        ${half + d},${-half - d + 2}
        ${-half + d},${-half - d + 2}
      `
  const right = `
        ${half},${-half - d}
        ${half + d},${-half - d + 2}
        ${half + d},${half - d + 2}
        ${half},${half}
      `
  return { top, right }
}

export function computeEmbeddingChipFrontFaceAttrs({ embeddingColor, isHistorical }) {
  return {
    strokeWidth: isHistorical ? 1 : 1.5,
    filter: isHistorical ? 'none' : `drop-shadow(0 0 6px ${embeddingColor})`,
    strokeDasharray: isHistorical ? '2 2' : null,
    stopOpacityStart: isHistorical ? 0.7 : 1,
    stopOpacityEnd: isHistorical ? 0.65 : 0.95,
  }
}

export function computeEmbeddingChipTransform({ x, y, perspectiveScale, rotateAngle }) {
  return `translate(${x}, ${y}) scale(${perspectiveScale}) rotate(${rotateAngle})`
}

/**
 * Create embedding renderer for the 3D memory visualization
 * 
 * @param {d3.Selection} svg - D3 selection for SVG container
 * @param {Object} options - Configuration options
 * @param {number} options.width - Total SVG width
 * @param {number} options.mapHeight - Height of map (embedding sits below)
 * @param {number} options.embeddingHeight - Height allocated for embedding section
 * @param {string} options.detailLevel - Current detail level (FULL, STANDARD, COMPACT, MINIMAL)
 * @param {Function} options.getScenario - Function to get current scenario
 * @param {Function} options.getTimeHour - Function to get current time hour
 * @param {Function} options.getIsScrubbing - Function to check if actively scrubbing
 * @param {Function} options.isWithinScrubCatchup - Function to check if in catch-up window
 * @param {Function} options.onScenarioChange - Subscribe to scenario changes
 * @param {Function} options.onTimeChange - Subscribe to time changes
 * @param {Array} options.nodes - Node array for source positioning (optional)
 * @returns {Object} Renderer API
 */
export function createEmbeddingRenderer(svg, options) {
  const {
    width,
    mapHeight,
    embeddingHeight,
    detailLevel,
    getScenario,
    getTimeHour,
    getIsScrubbing,
    isWithinScrubCatchup,
    onScenarioChange,
    onTimeChange,
    nodes = []
  } = options

  // Define subscription variables at top level so cleanup always works
  let scenarioUnsubscribe = () => {}
  let embeddingUnsubscribe = () => {}
  let embeddingTooltip = null  // Will be set in FULL/STANDARD modes
  let embeddingElements = []
  let embeddingCount = 0
  
  // Layer references
  let embeddingStoreLayer = null
  let embeddingIconsLayer = null
  let embeddingBadgeText = null
  let embeddingBadgeRect = null
  let headerTitleText = null
  let embeddingBadge = null
  let box3DBounds = null

  // Skip embedding section on COMPACT and MINIMAL - just show simple badge
  if (detailLevel === DETAIL_LEVELS.COMPACT || detailLevel === DETAIL_LEVELS.MINIMAL) {
    const memoryBadge = svg.append('g')
      .attr('class', 'memory-badge-compact')
      .attr('transform', `translate(${width / 2}, ${mapHeight - 10})`)
    
    memoryBadge.append('rect')
      .attr('x', -50)
      .attr('y', -10)
      .attr('width', 100)
      .attr('height', 20)
      .attr('rx', 10)
      .attr('fill', 'rgba(30, 40, 60, 0.9)')
      .attr('stroke', 'rgba(100, 120, 150, 0.4)')
      .attr('stroke-width', 1)
    
    memoryBadge.append('text')
      .attr('class', 'memory-badge-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'var(--vscode-statusBar-foreground)')
      .style('font-size', '10px')
      .text('Memories')

    return {
      cleanup: () => {
        scenarioUnsubscribe()
        embeddingUnsubscribe()
      }
    }
  }

  // Full embedding store only on FULL and STANDARD
  const embeddingStoreHeight = embeddingHeight
  embeddingStoreLayer = svg.append('g')
    .attr('class', 'embedding-store')
    .attr('transform', `translate(0, ${mapHeight})`)

  // 3D box background with TRUE perspective (back narrow, front wide)
  const box3D = embeddingStoreLayer.append('g')
    .attr('class', 'embedding-box-3d')

  box3DBounds = computeEmbeddingBoxBounds({ width, embeddingStoreHeight })
  const { backY, frontY, backLeft, backRight, frontLeft, frontRight, getXAtDepth } = box3DBounds
  const floorDepthRange = frontY - backY

  // Gradients for 3D depth
  const boxDefs = svg.append('defs')
  
  const floorGradient = boxDefs.append('linearGradient')
    .attr('id', 'embedding-floor')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%')
  floorGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', 'rgba(8, 12, 20, 0.95)')
  floorGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'rgba(15, 20, 30, 0.98)')

  // Main floor polygon (trapezoid with perspective)
  box3D.append('polygon')
    .attr('points', computeEmbeddingFloorPolygonPoints({ backLeft, backRight, frontRight, frontLeft, backY, frontY }))
    .attr('fill', 'url(#embedding-floor)')
    .attr('stroke', 'rgba(100, 120, 150, 0.4)')
    .attr('stroke-width', 1.5)

  // Perspective grid with proper convergence
  const gridLayer = embeddingStoreLayer.append('g')
    .attr('class', 'perspective-grid')

  // Gradient for vertical lines (atmospheric perspective - fade toward back)
  const vertLineGradient = boxDefs.append('linearGradient')
    .attr('id', 'vert-line-fade')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%')
  vertLineGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', 'rgba(100, 140, 180, 0.15)')  // Faded at back
  vertLineGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'rgba(100, 140, 180, 0.5)')   // Brighter at front

  // Vertical lines (converging from front to back) - 8 lines
  for (let i = 0; i <= 7; i++) {
    const { x1, y1, x2, y2 } = computeEmbeddingVerticalGridLine({ index: i, count: 7, backY, frontY, getXAtDepth })
    gridLayer.append('line')
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2)
      .attr('stroke', 'url(#vert-line-fade)')
      .attr('stroke-width', 1)
  }

  // Horizontal lines (with perspective compression and opacity fade)
  for (let i = 0; i <= 6; i++) {
    const { x1, y1, x2, y2, opacity } = computeEmbeddingHorizontalGridLine({ index: i, count: 6, backY, floorDepthRange, getXAtDepth, exponent: 0.7 })
    gridLayer.append('line')
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2)
      .attr('stroke', `rgba(100, 140, 180, ${opacity})`)
      .attr('stroke-width', 1)
  }

  // Front edge glow (subtle illumination at the front of the floor)
  const frontGlowGradient = boxDefs.append('linearGradient')
    .attr('id', 'front-glow')
    .attr('x1', '0%')
    .attr('y1', '100%')
    .attr('x2', '0%')
    .attr('y2', '0%')
  frontGlowGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', 'rgba(75, 150, 255, 0.15)')
  frontGlowGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'rgba(75, 150, 255, 0)')

  box3D.append('rect')
    .attr('x', computeEmbeddingFrontGlowRect({ frontLeft, frontRight, frontY }).x)
    .attr('y', computeEmbeddingFrontGlowRect({ frontLeft, frontRight, frontY }).y)
    .attr('width', computeEmbeddingFrontGlowRect({ frontLeft, frontRight, frontY }).width)
    .attr('height', computeEmbeddingFrontGlowRect({ frontLeft, frontRight, frontY }).height)
    .attr('fill', 'url(#front-glow)')
    .attr('pointer-events', 'none')

  // Front wall (transparent rectangle for 3D box illusion)
  const frontWallHeight = computeEmbeddingFrontWallHeight({ floorDepthRange, factor: 0.7 })
  const frontWallGradient = boxDefs.append('linearGradient')
    .attr('id', 'front-wall-fade')
    .attr('x1', '0%')
    .attr('y1', '100%')
    .attr('x2', '0%')
    .attr('y2', '0%')
  frontWallGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', 'rgba(80, 140, 200, 0.25)')  // More visible at bottom
  frontWallGradient.append('stop')
    .attr('offset', '50%')
    .attr('stop-color', 'rgba(80, 140, 200, 0.08)')  // Fade through middle
  frontWallGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'rgba(80, 140, 200, 0)')     // Transparent at top

  // Front wall rectangle
  box3D.append('rect')
    .attr('x', computeEmbeddingFrontWallRect({ frontLeft, frontRight, frontY, frontWallHeight, extraHeight: 5 }).x)
    .attr('y', computeEmbeddingFrontWallRect({ frontLeft, frontRight, frontY, frontWallHeight, extraHeight: 5 }).y)
    .attr('width', computeEmbeddingFrontWallRect({ frontLeft, frontRight, frontY, frontWallHeight, extraHeight: 5 }).width)
    .attr('height', computeEmbeddingFrontWallRect({ frontLeft, frontRight, frontY, frontWallHeight, extraHeight: 5 }).height)
    .attr('fill', 'url(#front-wall-fade)')
    .attr('pointer-events', 'none')

  // Front wall edge line (bottom of the "glass")
  box3D.append('line')
    .attr('x1', frontLeft)
    .attr('y1', frontY)
    .attr('x2', frontRight)
    .attr('y2', frontY)
    .attr('stroke', 'rgba(100, 160, 220, 0.5)')
    .attr('stroke-width', 2)

  // Left wall edge (vertical from front corner going up)
  box3D.append('line')
    .attr('x1', frontLeft)
    .attr('y1', frontY)
    .attr('x2', frontLeft)
    .attr('y2', frontY - frontWallHeight)
    .attr('stroke', 'rgba(100, 160, 220, 0.3)')
    .attr('stroke-width', 1)

  // Right wall edge (vertical from front corner going up)
  box3D.append('line')
    .attr('x1', frontRight)
    .attr('y1', frontY)
    .attr('x2', frontRight)
    .attr('y2', frontY - frontWallHeight)
    .attr('stroke', 'rgba(100, 160, 220, 0.3)')
    .attr('stroke-width', 1)

  // Subtle scanlines overlay for tech aesthetic
  const scanlinePattern = boxDefs.append('pattern')
    .attr('id', 'scanlines')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 4)
    .attr('height', 4)
  scanlinePattern.append('line')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 4)
    .attr('y2', 0)
    .attr('stroke', 'rgba(255, 255, 255, 0.02)')
    .attr('stroke-width', 1)

  box3D.append('polygon')
    .attr('points', `
      ${backLeft},${backY}
      ${backRight},${backY}
      ${frontRight},${frontY}
      ${frontLeft},${frontY}
    `)
    .attr('fill', 'url(#scanlines)')
    .attr('pointer-events', 'none')

  // Axis labels for canonical vector space semantics
  const axisLabelGroup = embeddingStoreLayer.append('g')
    .attr('class', 'axis-labels')
  
  // Depth axis label (back = archived, front = recent)
  axisLabelGroup.append('text')
    .attr('x', frontLeft - 5)
    .attr('y', (backY + frontY) / 2)
    .attr('text-anchor', 'end')
    .attr('fill', 'rgba(100, 140, 180, 0.5)')
    .attr('font-size', '9px')
    .attr('font-style', 'italic')
    .attr('transform', computeEmbeddingDepthAxisLabelTransform({ frontLeft, backY, frontY, offsetX: 5 }))
    .text('← policy ─ operational →')

  // Back label (routine patterns)
  axisLabelGroup.append('text')
    .attr('x', (backLeft + backRight) / 2)
    .attr('y', backY - 4)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(100, 140, 180, 0.35)')
    .attr('font-size', '8px')
    .text('routine patterns')

  // Front label (exceptional patterns)
  axisLabelGroup.append('text')
    .attr('x', (frontLeft + frontRight) / 2)
    .attr('y', frontY + 12)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(100, 140, 180, 0.5)')
    .attr('font-size', '8px')
    .text('exceptional patterns')

  // Header text
  const headerGroup = embeddingStoreLayer.append('g')
    .attr('transform', 'translate(16, 20)')

  // Inline "vector DB" icon (simple database cylinder)
  const headerIcon = headerGroup.append('g')
    .attr('transform', 'translate(0, -12)')
    .attr('opacity', 0.9)

  headerIcon.append('ellipse')
    .attr('cx', 8)
    .attr('cy', 4)
    .attr('rx', 7)
    .attr('ry', 3)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(255, 255, 255, 0.85)')
    .attr('stroke-width', 1.5)

  headerIcon.append('path')
    .attr('d', 'M1,4 L1,14 C1,16.5 15,16.5 15,14 L15,4')
    .attr('fill', 'none')
    .attr('stroke', 'rgba(255, 255, 255, 0.85)')
    .attr('stroke-width', 1.5)

  headerIcon.append('path')
    .attr('d', 'M1,14 C1,16.5 15,16.5 15,14')
    .attr('fill', 'none')
    .attr('stroke', 'rgba(255, 255, 255, 0.85)')
    .attr('stroke-width', 1.5)

  headerTitleText = headerGroup.append('text')
    .attr('x', 22)
    .attr('y', 0)
    .attr('fill', 'rgba(255, 255, 255, 0.9)')
    .attr('font-size', '13px')
    .attr('font-weight', '600')
    .text('Memories — Embedding Vector Space')

  embeddingBadge = headerGroup.append('g')
    .attr('transform', 'translate(260, -8)')

  embeddingBadgeRect = embeddingBadge.append('rect')
    .attr('width', 70)
    .attr('height', 18)
    .attr('rx', 4)
    .attr('fill', 'rgba(75, 150, 255, 0.15)')
    .attr('stroke', 'rgba(75, 150, 255, 0.4)')
    .attr('stroke-width', 1)

  embeddingBadgeText = embeddingBadge.append('text')
    .attr('x', 35)
    .attr('y', 13)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgb(75, 150, 255)')
    .attr('font-size', '11px')
    .attr('font-weight', '500')
    .text('0 vectors')

  function layoutEmbeddingHeader() {
    const titleNode = headerTitleText?.node()
    const badgeTextNode = embeddingBadgeText?.node()
    if (!titleNode || !badgeTextNode) return

    const titleWidth = titleNode.getComputedTextLength?.() ?? 0
    const badgeTextWidth = badgeTextNode.getComputedTextLength?.() ?? 0
    const badgePaddingX = 12
    const badgeWidth = computeEmbeddingBadgeWidth({ badgeTextWidth, badgePaddingX, minWidth: 70 })

    embeddingBadgeRect.attr('width', badgeWidth)
    embeddingBadgeText.attr('x', badgeWidth / 2)

    const layout = computeEmbeddingBadgeLayout({ titleWidth, badgeWidth, svgWidth: width, titleX: 22, gap: 12, margin: 16, inlineY: -8, wrappedY: 12 })
    embeddingBadge.attr('transform', layout.transform)
  }

  // Initial layout after nodes exist
  layoutEmbeddingHeader()

  // Embedding icons layer
  embeddingIconsLayer = embeddingStoreLayer.append('g')
    .attr('class', 'embedding-icons')

  // Single reusable tooltip element (performance optimization)
  const tooltip = d3.select('body').append('div')
    .attr('class', 'embedding-tooltip')
    .style('position', 'absolute')
    .style('display', 'none')
    .style('background', 'rgba(20, 25, 35, 0.98)')
    .style('border', '1px solid')
    .style('border-radius', '6px')
    .style('padding', '12px')
    .style('font-size', '13px')
    .style('pointer-events', 'none')
    .style('z-index', '10000')
    .style('box-shadow', '0 4px 12px rgba(0,0,0,0.5)')
    .style('backdrop-filter', 'blur(8px)')
    .style('max-width', '320px')
  
  // Store reference at top level for cleanup
  embeddingTooltip = tooltip

  /**
   * Create a floating embedding chip with 3D isometric design
   * 
   * @param {Object} event - Embedding event data
   * @param {boolean} skipAnimation - If true, instantly place chip (for catch-up)
   */
  function createFloatingEmbedding(event, skipAnimation = false) {
    // Find source node position
    const sourceNode = nodes.find(n => n.id === event.primarySteward || n.id === event.actorRole)
    const sourceX = sourceNode ? sourceNode.x : width / 2
    const sourceY = sourceNode ? sourceNode.y : mapHeight / 2

    const embeddingColor = getEmbeddingColorForRole(event.actorRole)

    // ═══════════════════════════════════════════════════════════════════════════
    // CANONICAL VECTOR SPACE CLUSTERING
    // ═══════════════════════════════════════════════════════════════════════════
    // Position is determined by semanticVector [x, y] where:
    //   X-AXIS: policy(0) ↔ operational(1)
    //   Y-AXIS: routine(0) ↔ exceptional(1)
    //
    // Quadrants:
    //   Top-left:     Exceptional policy (revisions, DSG sessions, governance)
    //   Top-right:    Exceptional operational (escalations, boundary violations)
    //   Bottom-left:  Routine policy (baseline signals, drift monitoring)
    //   Bottom-right: Routine operational (normal decisions, approvals)
    //
    // Similar patterns cluster together based on semantic meaning, not envelope.
    // ═══════════════════════════════════════════════════════════════════════════

    const scenario = getScenario()
    const { normalizedX, depthT, usedSemanticVector } = computeEmbeddingNormalizedPosition({
      event,
      scenario,
      typeDepthBias: TYPE_DEPTH_BIAS,
    })
    if (!usedSemanticVector) {
      console.log(`No semanticVector found for ${event.eventId}, using fallback positioning`)
    }

    const { targetX, targetY, depthZ } = computeEmbeddingTargetPosition({
      normalizedX,
      depthT,
      box3DBounds,
      floorDepthRange,
    })

    const { perspectiveScale, depthOpacity, rotateAngle } = computeEmbeddingPerspectiveParams({ depthT })

    // Create chip group with detailed 3D design
    const chipGroup = embeddingIconsLayer.append('g')
      .attr('class', 'embedding-chip')
      .attr('transform', `translate(${sourceX}, ${sourceY - mapHeight})`)
      .attr('opacity', 0)
      .style('cursor', 'pointer')
      .attr('data-embedding-id', event.embeddingId || event.eventId)
    
    const tooltipData = buildEmbeddingTooltipData(event)
    
    // Add hover interaction with optimized tooltip
    chipGroup.on('mouseenter', function(mouseEvent) {
      d3.select(this).transition().duration(100).attr('opacity', 1)
      
      // Update tooltip content and show
      const tooltipNode = tooltip
        .style('border-color', embeddingColor)
        .style('display', 'block')
        .html(`
          <div style="border-bottom: 1px solid ${embeddingColor}; padding-bottom: 8px; margin-bottom: 8px;">
            ${tooltipData.isHistorical ? `<div style="font-size: 10px; color: rgba(255,255,255,0.5); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">📚 Historical Baseline</div>` : ''}
            <div style="font-size: 11px; color: ${embeddingColor}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${tooltipData.type}</div>
            <div style="font-size: 15px; font-weight: 600; margin-top: 4px;">${tooltipData.label}</div>
          </div>
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; font-size: 12px;">
            <div style="color: rgba(255,255,255,0.6);">Steward:</div>
            <div style="font-weight: 500;">${tooltipData.steward}</div>
            <div style="color: rgba(255,255,255,0.6);">Envelope:</div>
            <div style="font-weight: 500; font-family: monospace; font-size: 11px;">${tooltipData.envelope}</div>
            <div style="color: rgba(255,255,255,0.6);">ID:</div>
            <div style="font-family: monospace; font-size: 11px;">${tooltipData.id}</div>
          </div>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
            <div style="color: rgba(255,255,255,0.6); font-size: 11px; margin-bottom: 4px;">SEMANTIC CONTEXT:</div>
            <div style="font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.9);">${tooltipData.context}</div>
          </div>
          <div style="margin-top: 12px; text-align: right; font-size: 11px; color: ${embeddingColor}; opacity: 0.8;">
            ⏱️ Hour ${tooltipData.hour}${tooltipData.isHistorical ? ' (before scenario window)' : ''}
          </div>
        `)
      
      // Position tooltip above cursor
      const tooltipHeight = tooltipNode.node().offsetHeight
      tooltip
        .style('left', (mouseEvent.pageX + 15) + 'px')
        .style('top', (mouseEvent.pageY - tooltipHeight - 10) + 'px')
    })
    .on('mousemove', function(mouseEvent) {
      // Position tooltip above cursor
      const tooltipHeight = tooltip.node().offsetHeight
      tooltip
        .style('left', (mouseEvent.pageX + 15) + 'px')
        .style('top', (mouseEvent.pageY - tooltipHeight - 10) + 'px')
    })
    .on('mouseleave', function() {
      d3.select(this).transition().duration(200).attr('opacity', depthOpacity)
      tooltip.style('display', 'none')
    })

    // 3D chip design - isometric cube style with prominent depth
    const chipSize = 16
    const depth3D = 5  // Depth offset for 3D effect
    const isHistorical = (typeof event?.hour === 'number') ? event.hour < 0 : false
    const chipFacePoints = computeEmbeddingChipFacePoints({ chipSize, depth3D })
    const chipFrontAttrs = computeEmbeddingChipFrontFaceAttrs({ embeddingColor, isHistorical })
    
    // Shadow underneath for grounding
    chipGroup.append('ellipse')
      .attr('cx', 2)
      .attr('cy', chipSize / 2 + 2)
      .attr('rx', chipSize / 2)
      .attr('ry', 3)
      .attr('fill', 'rgba(0, 0, 0, 0.4)')
      .attr('filter', 'blur(2px)')
    
    // Top face (lighter - catches "light")
    chipGroup.append('polygon')
      .attr('points', chipFacePoints.top)
      .attr('fill', `color-mix(in srgb, ${embeddingColor} 70%, white)`)
      .attr('stroke', embeddingColor)
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.9)

    // Right face (medium - side lighting)
    chipGroup.append('polygon')
      .attr('points', chipFacePoints.right)
      .attr('fill', `color-mix(in srgb, ${embeddingColor} 50%, black)`)
      .attr('stroke', embeddingColor)
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.85)

    // Main front face with gradient
    const chipGradient = boxDefs.append('radialGradient')
      .attr('id', `chip-gradient-${event.eventId}`)
    chipGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', embeddingColor)
      .attr('stop-opacity', chipFrontAttrs.stopOpacityStart) // Slightly faded for historical
    chipGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', `color-mix(in srgb, ${embeddingColor} 70%, black)`)
      .attr('stop-opacity', chipFrontAttrs.stopOpacityEnd) // Slightly faded for historical

    chipGroup.append('rect')
      .attr('x', -chipSize / 2)
      .attr('y', -chipSize / 2)
      .attr('width', chipSize)
      .attr('height', chipSize)
      .attr('rx', 2)
      .attr('fill', `url(#chip-gradient-${event.eventId})`)
      .attr('stroke', embeddingColor)
      .attr('stroke-width', chipFrontAttrs.strokeWidth) // Thinner stroke for historical
      .attr('filter', chipFrontAttrs.filter) // No glow for historical
      .attr('stroke-dasharray', chipFrontAttrs.strokeDasharray) // Dashed border for historical

    // Circuit pattern on chip
    const circuitGroup = chipGroup.append('g')
      .attr('opacity', 0.5)
    
    // Horizontal traces
    circuitGroup.append('line')
      .attr('x1', -chipSize / 2 + 2)
      .attr('y1', -2)
      .attr('x2', chipSize / 2 - 2)
      .attr('y2', -2)
      .attr('stroke', 'rgba(255,255,255,0.8)')
      .attr('stroke-width', 0.5)
    
    circuitGroup.append('line')
      .attr('x1', -chipSize / 2 + 2)
      .attr('y1', 2)
      .attr('x2', chipSize / 2 - 2)
      .attr('y2', 2)
      .attr('stroke', 'rgba(255,255,255,0.8)')
      .attr('stroke-width', 0.5)

    // Vertical traces
    circuitGroup.append('line')
      .attr('x1', -2)
      .attr('y1', -chipSize / 2 + 2)
      .attr('x2', -2)
      .attr('y2', chipSize / 2 - 2)
      .attr('stroke', 'rgba(255,255,255,0.8)')
      .attr('stroke-width', 0.5)
    
    circuitGroup.append('line')
      .attr('x1', 2)
      .attr('y1', -chipSize / 2 + 2)
      .attr('x2', 2)
      .attr('y2', chipSize / 2 - 2)
      .attr('stroke', 'rgba(255,255,255,0.8)')
      .attr('stroke-width', 0.5)

    // Center icon
    chipGroup.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('stroke', 'rgba(0,0,0,0.5)')
      .attr('stroke-width', 0.5)
      .attr('filter', `drop-shadow(0 0 3px ${embeddingColor})`)
      .attr('fill', 'rgba(255,255,255,0.9)')
      .text('</>')

    // Animate to target with rotation, scale, and depth-based opacity
    // Skip animation during catch-up window for instant placement
    if (skipAnimation) {
      chipGroup
        .attr('transform', computeEmbeddingChipTransform({ x: targetX, y: targetY, perspectiveScale, rotateAngle }))
        .attr('opacity', depthOpacity)
    } else {
      chipGroup.transition()
        .duration(2500)
        .ease(d3.easeCubicOut)
        .attr('transform', computeEmbeddingChipTransform({ x: targetX, y: targetY, perspectiveScale, rotateAngle }))
        .attr('opacity', depthOpacity)
    }

    embeddingElements.push({ element: chipGroup, event, timestamp: Date.now() })
    embeddingCount++
    embeddingBadgeText.text(`${embeddingCount} vector${embeddingCount !== 1 ? 's' : ''}`)
    layoutEmbeddingHeader()
  }

  /**
   * Render all embeddings up to current time
   */
  function renderEmbeddings() {
    // Skip rendering during active scrubbing for performance
    if (getIsScrubbing()) {
      return
    }
    
    const scenario = getScenario()
    const currentHour = getTimeHour()
    const skipAnimation = isWithinScrubCatchup()

    const embeddingEvents = scenario.events
      .filter(e => e.type === 'embedding' && e.hour <= currentHour)
      .sort((a, b) => a.hour - b.hour)

    // Check if we need to clear (time went backwards)
    const shouldClear = embeddingElements.some(e => e.event.hour > currentHour)
    if (shouldClear) {
      console.log('Clearing embeddings (time went backwards)')
      embeddingIconsLayer.selectAll('*').remove()
      embeddingElements = []
      embeddingCount = 0
      embeddingBadgeText.text('0 vectors')
      layoutEmbeddingHeader()
    }

    // Only add new embeddings
    const existingIds = new Set(embeddingElements.map(e => e.event.eventId))
    const newEvents = embeddingEvents.filter(e => !existingIds.has(e.eventId))

    // During catch-up window, create all embeddings instantly without stagger
    if (skipAnimation && newEvents.length > 0) {
      newEvents.forEach((event) => {
        createFloatingEmbedding(event, true) // skipAnimation = true
      })
    } else {
      newEvents.forEach((event, index) => {
        setTimeout(() => {
          createFloatingEmbedding(event, false)
        }, index * 150)
      })
    }
  }

  renderEmbeddings()

  // Subscribe to scenario changes
  scenarioUnsubscribe = onScenarioChange(() => {
    console.log('[EMBEDDING-RENDERER] Scenario changed - clearing embeddings')
    embeddingIconsLayer.selectAll('*').remove()
    embeddingElements = []
    embeddingCount = 0
    embeddingBadgeText.text('0 vectors')
    layoutEmbeddingHeader()
    tooltip.style('display', 'none')
    renderEmbeddings()
  })

  // Subscribe to time changes for embeddings
  embeddingUnsubscribe = onTimeChange(() => {
    renderEmbeddings()
  })

  return {
    /**
     * Cleanup: unsubscribe and remove tooltip
     */
    cleanup: () => {
      scenarioUnsubscribe()
      embeddingUnsubscribe()
      if (embeddingTooltip) {
        embeddingTooltip.remove()
      }
    },
    
    /**
     * Re-render embeddings (called after scenario change)
     */
    render: () => {
      renderEmbeddings()
    },
    
    /**
     * Clear all embeddings
     */
    clear: () => {
      if (embeddingIconsLayer) {
        embeddingIconsLayer.selectAll('*').remove()
      }
      embeddingElements = []
      embeddingCount = 0
      if (embeddingBadgeText) {
        embeddingBadgeText.text('0 vectors')
        layoutEmbeddingHeader()
      }
    }
  }
}
