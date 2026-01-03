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

  // Perspective dimensions - back is NARROW, front is WIDE
  const backY = embeddingStoreHeight * 0.25      // Top edge (back of floor)
  const frontY = embeddingStoreHeight - 8         // Bottom edge (front of floor)
  const floorDepthRange = frontY - backY
  
  // Back edge (narrow) - centered
  const backLeft = width * 0.25
  const backRight = width * 0.75
  
  // Front edge (wide) - spans more
  const frontLeft = width * 0.08
  const frontRight = width * 0.92

  // Helper: interpolate X position at a given depth (0=back, 1=front)
  function getXAtDepth(normalizedX, depth) {
    // normalizedX: 0=left edge, 1=right edge
    // depth: 0=back, 1=front
    const leftAtDepth = backLeft + depth * (frontLeft - backLeft)
    const rightAtDepth = backRight + depth * (frontRight - backRight)
    return leftAtDepth + normalizedX * (rightAtDepth - leftAtDepth)
  }

  // Store bounds for chip positioning
  box3DBounds = {
    backY,
    frontY,
    backLeft,
    backRight,
    frontLeft,
    frontRight,
    getXAtDepth
  }

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
    .attr('points', `
      ${backLeft},${backY}
      ${backRight},${backY}
      ${frontRight},${frontY}
      ${frontLeft},${frontY}
    `)
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
    const normalizedX = i / 7
    const x1 = getXAtDepth(normalizedX, 0) // back
    const x2 = getXAtDepth(normalizedX, 1) // front
    gridLayer.append('line')
      .attr('x1', x1)
      .attr('y1', backY)
      .attr('x2', x2)
      .attr('y2', frontY)
      .attr('stroke', 'url(#vert-line-fade)')
      .attr('stroke-width', 1)
  }

  // Horizontal lines (with perspective compression and opacity fade)
  for (let i = 0; i <= 6; i++) {
    // Use non-linear spacing - lines compress toward the back
    const t = Math.pow(i / 6, 0.7) // Power < 1 compresses lines toward back
    const y = backY + t * floorDepthRange
    const leftX = getXAtDepth(0, t)
    const rightX = getXAtDepth(1, t)
    // Atmospheric perspective: lines fade toward back
    const lineOpacity = 0.15 + t * 0.35  // 0.15 at back, 0.5 at front
    gridLayer.append('line')
      .attr('x1', leftX)
      .attr('y1', y)
      .attr('x2', rightX)
      .attr('y2', y)
      .attr('stroke', `rgba(100, 140, 180, ${lineOpacity})`)
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
    .attr('x', frontLeft)
    .attr('y', frontY - 25)
    .attr('width', frontRight - frontLeft)
    .attr('height', 30)
    .attr('fill', 'url(#front-glow)')
    .attr('pointer-events', 'none')

  // Front wall (transparent rectangle for 3D box illusion)
  const frontWallHeight = floorDepthRange * 0.7  // Taller front wall
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
    .attr('x', frontLeft)
    .attr('y', frontY - frontWallHeight)
    .attr('width', frontRight - frontLeft)
    .attr('height', frontWallHeight + 5)
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
    .attr('transform', `rotate(-90, ${frontLeft - 5}, ${(backY + frontY) / 2})`)
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
    const badgeWidth = Math.max(70, Math.ceil(badgeTextWidth + badgePaddingX * 2))

    embeddingBadgeRect.attr('width', badgeWidth)
    embeddingBadgeText.attr('x', badgeWidth / 2)

    const titleX = 22
    const gap = 12
    let badgeX = Math.ceil(titleX + titleWidth + gap)

    // If the badge would overflow the embedding box, wrap it to the next line.
    const maxBadgeX = Math.max(16, (width - 16) - badgeWidth)
    const wrapped = badgeX > maxBadgeX
    if (wrapped) {
      badgeX = titleX
      embeddingBadge.attr('transform', `translate(${badgeX}, 12)`)
    } else {
      embeddingBadge.attr('transform', `translate(${badgeX}, -8)`)
    }
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

    const embeddingColor = STEWARD_COLORS[event.actorRole] || '#4B96FF'

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

    // Use pre-computed semanticVector if available, otherwise fall back to heuristics
    let normalizedX, depthT
    
    if (event.semanticVector && Array.isArray(event.semanticVector) && event.semanticVector.length === 2) {
      // Use pre-computed semantic position
      normalizedX = 0.1 + event.semanticVector[0] * 0.8  // Map to 0.1-0.9 range with padding
      depthT = 0.1 + event.semanticVector[1] * 0.8      // Y maps to depth (routine=back, exceptional=front)
    } else {
      console.log(`No semanticVector found for ${event.eventId}, using fallback positioning`)
      // Fallback: envelope-based positioning (legacy behavior)
      const scenario = getScenario()
      const envelopeIds = [...new Set(scenario.envelopes.map(e => e.envelopeId))]
      const envelopeIndex = envelopeIds.indexOf(event.envelopeId)
      const envelopeCount = Math.max(envelopeIds.length, 1)
      
      const envelopeBaseX = envelopeIndex >= 0 
        ? 0.15 + (envelopeIndex / Math.max(envelopeCount - 1, 1)) * 0.7
        : 0.5
      
      // Semantic clustering fallback: hash semanticContext
      const semanticHash = (event.semanticContext || event.label || '').split('').reduce(
        (acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0
      )
      const semanticOffsetX = ((semanticHash % 100) / 100 - 0.5) * 0.12
      const semanticOffsetY = (((semanticHash * 7) % 100) / 100 - 0.5) * 0.15
      
      normalizedX = Math.max(0.08, Math.min(0.92, envelopeBaseX + semanticOffsetX))
      
      // Y-axis (depth): Recency + type bias
      const scenarioDuration = scenario.durationHours || 24
      // For historical embeddings (hour < 0), position them at the back
      const normalizedTime = event.hour < 0 
        ? 0 // Historical = far back
        : Math.min(1, event.hour / scenarioDuration)
      
      const baseDepthT = normalizedTime * 0.7 + 0.15
      const typeBias = TYPE_DEPTH_BIAS[event.embeddingType] || 0
      depthT = Math.max(0.05, Math.min(0.95, baseDepthT + typeBias + semanticOffsetY))
    }

    // Perspective-aware positioning using the helper function
    const targetX = box3DBounds.getXAtDepth(normalizedX, depthT)
    const targetY = box3DBounds.backY + depthT * floorDepthRange
    const depthZ = depthT * 100
    
    // Scale based on perspective (smaller at back, larger at front)
    // depthT: 0=back (small), 1=front (large)
    const perspectiveScale = 0.45 + depthT * 0.55  // 0.45 to 1.0 (more dramatic)
    
    // Opacity fade for atmospheric depth (dimmer at back)
    const depthOpacity = 0.5 + depthT * 0.5  // 0.5 at back, 1.0 at front
    
    // Rotation follows perspective: chips at back should appear to tilt away
    const perspectiveTilt = -12 * (1 - depthT)  // -12° at back, 0° at front
    const randomWobble = (Math.random() - 0.5) * 8
    const rotateAngle = perspectiveTilt + randomWobble

    // Create chip group with detailed 3D design
    const chipGroup = embeddingIconsLayer.append('g')
      .attr('class', 'embedding-chip')
      .attr('transform', `translate(${sourceX}, ${sourceY - mapHeight})`)
      .attr('opacity', 0)
      .style('cursor', 'pointer')
      .attr('data-embedding-id', event.embeddingId || event.eventId)
    
    const embeddingTypeLabel = EMBEDDING_TYPE_LABELS[event.embeddingType] || event.embeddingType || 'Unknown'
    const isHistorical = event.hour < 0
    
    const tooltipData = {
      type: embeddingTypeLabel,
      label: event.label || 'Embedding',
      steward: event.actorRole || 'Unknown',
      envelope: event.envelopeId || 'N/A',
      id: event.embeddingId || event.eventId || 'N/A',
      context: event.semanticContext || event.detail || 'No context available',
      hour: event.hour,
      isHistorical
    }
    
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
      .attr('points', `
        ${-chipSize / 2},${-chipSize / 2 - depth3D}
        ${chipSize / 2},${-chipSize / 2 - depth3D}
        ${chipSize / 2 + depth3D},${-chipSize / 2 - depth3D + 2}
        ${-chipSize / 2 + depth3D},${-chipSize / 2 - depth3D + 2}
      `)
      .attr('fill', `color-mix(in srgb, ${embeddingColor} 70%, white)`)
      .attr('stroke', embeddingColor)
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.9)

    // Right face (medium - side lighting)
    chipGroup.append('polygon')
      .attr('points', `
        ${chipSize / 2},${-chipSize / 2 - depth3D}
        ${chipSize / 2 + depth3D},${-chipSize / 2 - depth3D + 2}
        ${chipSize / 2 + depth3D},${chipSize / 2 - depth3D + 2}
        ${chipSize / 2},${chipSize / 2}
      `)
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
      .attr('stop-opacity', event.hour < 0 ? 0.7 : 1) // Slightly faded for historical
    chipGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', `color-mix(in srgb, ${embeddingColor} 70%, black)`)
      .attr('stop-opacity', event.hour < 0 ? 0.65 : 0.95) // Slightly faded for historical

    chipGroup.append('rect')
      .attr('x', -chipSize / 2)
      .attr('y', -chipSize / 2)
      .attr('width', chipSize)
      .attr('height', chipSize)
      .attr('rx', 2)
      .attr('fill', `url(#chip-gradient-${event.eventId})`)
      .attr('stroke', embeddingColor)
      .attr('stroke-width', event.hour < 0 ? 1 : 1.5) // Thinner stroke for historical
      .attr('filter', event.hour < 0 ? 'none' : `drop-shadow(0 0 6px ${embeddingColor})`) // No glow for historical
      .attr('stroke-dasharray', event.hour < 0 ? '2 2' : null) // Dashed border for historical

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
        .attr('transform', `translate(${targetX}, ${targetY}) scale(${perspectiveScale}) rotate(${rotateAngle})`)
        .attr('opacity', depthOpacity)
    } else {
      chipGroup.transition()
        .duration(2500)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(${targetX}, ${targetY}) scale(${perspectiveScale}) rotate(${rotateAngle})`)
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
