import * as d3 from 'd3'
import { getScenario, getEnvelopeAtTime, getEventsNearTime, getTimeHour, onTimeChange, onScenarioChange, getEnvelopeStatus, setStewardFilter } from '../sim/sim-state'
import { getStewardColor, STEWARD_PALETTE, toSemver, getEventColor } from '../sim/steward-colors'
import { navigateTo } from '../router'

/**
 * Detail levels for responsive SVG rendering
 * Determines what level of detail to show based on available width
 */
const DETAIL_LEVELS = {
  FULL: 'full',       // >1000px - Full names, all labels, complete info
  STANDARD: 'standard', // 600-1000px - First names, abbreviated labels
  COMPACT: 'compact',  // 400-600px - Initials, icons only
  MINIMAL: 'minimal'   // <400px - Hide text, minimal icons
}

/**
 * Get the appropriate detail level based on container width
 * @param {number} width - Container width in pixels
 * @returns {string} Detail level constant
 */
function getDetailLevel(width) {
  if (width > 1000) return DETAIL_LEVELS.FULL
  if (width > 600) return DETAIL_LEVELS.STANDARD
  if (width > 400) return DETAIL_LEVELS.COMPACT
  return DETAIL_LEVELS.MINIMAL
}

/**
 * Get adaptive agent display name based on detail level
 * @param {string} name - Full agent name
 * @param {string} level - Detail level
 * @returns {string} Formatted name for display
 */
function getAdaptiveAgentName(name, level) {
  if (!name) return ''
  switch (level) {
    case DETAIL_LEVELS.FULL:
      return name
    case DETAIL_LEVELS.STANDARD:
      // First name or first part before space/hyphen
      return name.split(/[\s-]/)[0]
    case DETAIL_LEVELS.COMPACT:
      // Initials (first letters of each word)
      return name.split(/[\s-]/).map(w => w[0]).join('').toUpperCase()
    case DETAIL_LEVELS.MINIMAL:
      return '' // Hide on minimal
    default:
      return name
  }
}

/**
 * Get adaptive envelope label based on detail level
 * @param {string} label - Full envelope label (e.g., "DE-001")
 * @param {string} name - Envelope name
 * @param {string} level - Detail level
 * @returns {{ label: string, showName: boolean }}
 */
function getAdaptiveEnvelopeLabel(label, name, level) {
  switch (level) {
    case DETAIL_LEVELS.FULL:
      return { label, showName: true }
    case DETAIL_LEVELS.STANDARD:
      return { label, showName: false }
    case DETAIL_LEVELS.COMPACT:
      // Shorter label
      return { label: label.replace('DE-', ''), showName: false }
    case DETAIL_LEVELS.MINIMAL:
      return { label: '', showName: false }
    default:
      return { label, showName: true }
  }
}

/**
 * Get adaptive steward label based on detail level
 * @param {string} name - Steward role name
 * @param {string} version - Version string
 * @param {string} level - Detail level
 * @returns {{ name: string, showVersion: boolean }}
 */
function getAdaptiveStewardLabel(name, version, level) {
  switch (level) {
    case DETAIL_LEVELS.FULL:
      return { name, showVersion: true }
    case DETAIL_LEVELS.STANDARD:
      // Abbreviated name
      return { name: name.replace(' Steward', '').replace('Steward', ''), showVersion: false }
    case DETAIL_LEVELS.COMPACT:
      // First word only
      return { name: name.split(/[\s]/)[0], showVersion: false }
    case DETAIL_LEVELS.MINIMAL:
      return { name: '', showVersion: false }
    default:
      return { name, showVersion: true }
  }
}

/**
 * Check if agent roles should be shown at this detail level
 * @param {string} level - Detail level
 * @returns {boolean}
 */
function shouldShowAgentRole(level) {
  return level === DETAIL_LEVELS.FULL || level === DETAIL_LEVELS.STANDARD
}

/**
 * Get column header text based on detail level
 * @param {string} header - Full header text
 * @param {string} level - Detail level
 * @returns {string}
 */
function getAdaptiveHeader(header, level) {
  if (level === DETAIL_LEVELS.MINIMAL) return ''
  if (level === DETAIL_LEVELS.COMPACT) {
    // Abbreviated headers
    const abbrevs = {
      'AGENT FLEETS': 'AGENTS',
      'DECISION ENVELOPES': 'ENVELOPES',
      'STEWARDS': 'STEWARDS'
    }
    return abbrevs[header] || header
  }
  return header
}

/**
 * Envelope density modes mapped to detail levels
 * - detailed: Full envelope with all visual elements
 * - normal: Standard envelope with basic visual elements  
 * - compact: Simplified envelope outline
 * - icon: Status circle only
 */
const ENVELOPE_DENSITY = {
  [DETAIL_LEVELS.FULL]: 'detailed',
  [DETAIL_LEVELS.STANDARD]: 'normal',
  [DETAIL_LEVELS.COMPACT]: 'compact',
  [DETAIL_LEVELS.MINIMAL]: 'icon'
}

/**
 * Envelope dimensions by density mode
 * baseWidth: envelope body width
 * baseHeight: envelope body height  
 * radius: radius for icon mode circle
 */
const ENVELOPE_SIZES = {
  detailed: { baseWidth: 140, baseHeight: 88, scale: 1.0 },
  normal: { baseWidth: 110, baseHeight: 68, scale: 0.75 },
  compact: { baseWidth: 80, baseHeight: 50, scale: 0.55 },
  icon: { baseWidth: 48, baseHeight: 48, scale: 0.35, radius: 22 }
}

/**
 * Get envelope dimensions based on detail level
 * @param {string} level - Detail level from DETAIL_LEVELS
 * @param {number} baseR - Base radius from layout calculations
 * @returns {object} - { width, height, scale, isIcon, radius }
 */
function getEnvelopeDimensions(level, baseR) {
  const density = ENVELOPE_DENSITY[level] || 'normal'
  const sizes = ENVELOPE_SIZES[density]
  
  // Scale based on available space (baseR) but cap to size limits
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

/**
 * Check if envelope element should render at this density
 * @param {string} element - Element name (glow, flap, fold, status, version)
 * @param {string} density - Density mode
 * @returns {boolean}
 */
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

/**
 * Agent density modes mapped to detail levels
 * - full: Full bot glyph with name, role, activity halo
 * - standard: Bot glyph with name (truncated), fleet grouping
 * - compact: Small dot with fleet count badge, no individual names
 * - minimal: Fleet indicator bar only (colored rectangle)
 */
const AGENT_DENSITY = {
  [DETAIL_LEVELS.FULL]: 'full',
  [DETAIL_LEVELS.STANDARD]: 'standard',
  [DETAIL_LEVELS.COMPACT]: 'compact',
  [DETAIL_LEVELS.MINIMAL]: 'minimal'
}

/**
 * Agent dimensions by density mode
 */
const AGENT_SIZES = {
  full: { botScale: 1.0, showName: true, showRole: true, showHalo: true },
  standard: { botScale: 0.9, showName: true, showRole: false, showHalo: true },
  compact: { botScale: 0.6, showName: false, showRole: false, showHalo: false, showCount: true },
  minimal: { botScale: 0, showName: false, showRole: false, showHalo: false, showFleetBar: true }
}

/**
 * Get agent display properties based on detail level
 * @param {string} level - Detail level from DETAIL_LEVELS
 * @returns {object} - Agent display configuration
 */
function getAgentDensity(level) {
  const density = AGENT_DENSITY[level] || 'standard'
  return { density, ...AGENT_SIZES[density] }
}

/**
 * Check if individual agents should be rendered vs fleet summary
 * @param {string} level - Detail level
 * @returns {boolean}
 */
function shouldRenderIndividualAgents(level) {
  return level === DETAIL_LEVELS.FULL || level === DETAIL_LEVELS.STANDARD
}

export function createHDDLMap(container, options = {}) {
  // 1. Setup SVG and Dimensions
  const width = options.width || container.clientWidth || 800
  const mapHeight = 480
  
  // Determine detail level based on container width
  let detailLevel = getDetailLevel(width)
  
  // Dynamic embedding height based on detail level
  const embeddingHeight = detailLevel === DETAIL_LEVELS.FULL ? 200 
    : detailLevel === DETAIL_LEVELS.STANDARD ? 120 
    : 0  // Hide entirely on COMPACT and MINIMAL
  
  const height = mapHeight + embeddingHeight  // Total height varies by detail
  
  // Filter state
  let currentFilter = options.initialFilter || 'all'
  
  container.innerHTML = '' // Clear previous content
  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('background', 'var(--vscode-editor-background)')
    .style('border', '1px solid var(--vscode-widget-border)')
    .style('border-radius', '6px')

  // 2. Simulation Setup
  // Keep a lightweight simulation running so particles animate smoothly,
  // but lock nodes to deterministic lane coordinates ("on rails").
  const simulation = d3.forceSimulation()
    .alphaDecay(0) // keep ticking (used as an animation loop)
    .velocityDecay(0.55)
    .on('tick', ticked)

  // Layers
  const headerLayer = svg.append('g').attr('class', 'headers')
  const cycleLayer = svg.append('g').attr('class', 'cycles')
  const fleetLayer = svg.append('g').attr('class', 'fleets')
  const linkLayer = svg.append('g').attr('class', 'links')
  const exceptionLinkLayer = svg.append('g').attr('class', 'exception-links')
  const nodeLayer = svg.append('g').attr('class', 'nodes')
  const particleLayer = svg.append('g').attr('class', 'particles')

  // Lifecycle loop cues (subtle background curves across system boundaries)
  // These are intentionally static: they communicate the conceptual flow.
  const cycleYTop = 100
  const cycleYBottom = mapHeight - 48  // Use mapHeight, not total height
  const cycleYMid = (cycleYTop + cycleYBottom) / 2
  const cycleRy = Math.max(65, (cycleYBottom - cycleYTop) * 0.42)

  function loopPath(x1, x2) {
    const rx = Math.max(80, Math.abs(x2 - x1) * 0.55)
    return `M ${x1} ${cycleYMid} A ${rx} ${cycleRy} 0 0 1 ${x2} ${cycleYMid} A ${rx} ${cycleRy} 0 0 1 ${x1} ${cycleYMid}`
  }

  cycleLayer.append('path')
    .attr('class', 'cycle-loop-left')
    .attr('d', loopPath(width * 0.15, width * 0.5))
    .attr('fill', 'none')
    .attr('stroke', 'var(--vscode-editor-lineHighlightBorder)')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '6 6')
    .attr('opacity', 0.18)

  cycleLayer.append('path')
    .attr('class', 'cycle-loop-right')
    .attr('d', loopPath(width * 0.5, width * 0.85))
    .attr('fill', 'none')
    .attr('stroke', 'var(--vscode-editor-lineHighlightBorder)')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '6 6')
    .attr('opacity', 0.18)

  function bezierPoint(t, p0, p1, p2, p3) {
    const u = 1 - t
    const tt = t * t
    const uu = u * u
    const uuu = uu * u
    const ttt = tt * t
    return {
      x: (uuu * p0.x) + (3 * uu * t * p1.x) + (3 * u * tt * p2.x) + (ttt * p3.x),
      y: (uuu * p0.y) + (3 * uu * t * p1.y) + (3 * u * tt * p2.y) + (ttt * p3.y),
    }
  }

  function makeFlowCurve(sourceX, sourceY, targetX, targetY, sign = -1) {
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const nx = -dy
    const ny = dx
    const norm = Math.sqrt(nx * nx + ny * ny) || 1

    // Offset magnitude: proportional to lane width, capped.
    const base = Math.min(140, Math.max(48, Math.abs(dx) * 0.36))
    const ox = (nx / norm) * base * sign
    const oy = (ny / norm) * base * sign

    const p0 = { x: sourceX, y: sourceY }
    const p3 = { x: targetX, y: targetY }
    const p1 = { x: sourceX + dx * 0.33 + ox, y: sourceY + dy * 0.33 + oy }
    const p2 = { x: sourceX + dx * 0.66 + ox, y: sourceY + dy * 0.66 + oy }
    return { p0, p1, p2, p3 }
  }

  // Column Headers (add a background band so text never becomes black-on-black)
  headerLayer
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width)
    .attr('height', 26)
    .attr('fill', 'var(--vscode-editor-background)')
    .attr('opacity', 0.84)

  // Give agents and envelopes more space: 35% / 38% / 27%
  const col1Width = width * 0.35
  const col2Width = width * 0.38
  const col3Width = width * 0.27
  const col1Center = col1Width * 0.5
  const col2Center = col1Width + (col2Width * 0.5)
  const col3Center = col1Width + col2Width + (col3Width * 0.5)

  const col1Left = 0
  const col1Right = col1Width
  const col3Left = col1Width + col2Width

  // Headers with adaptive text based on detail level
  headerLayer.append('text')
    .attr('class', 'header-agents')
    .attr('x', col1Center).attr('y', 18).attr('text-anchor', 'middle')
    .text(getAdaptiveHeader('AGENT FLEETS', detailLevel))
    .attr('fill', 'var(--vscode-editor-foreground)')
    .style('font-size', detailLevel === DETAIL_LEVELS.MINIMAL ? '8px' : '10px')
    .style('font-weight', '800').style('letter-spacing', '0.6px')
    .style('paint-order', 'stroke').style('stroke', 'var(--vscode-editor-background)')
    .style('stroke-width', '3px').style('opacity', 0.85)
  
  headerLayer.append('text')
    .attr('class', 'header-envelopes')
    .attr('x', col2Center).attr('y', 18).attr('text-anchor', 'middle')
    .text(getAdaptiveHeader('DECISION ENVELOPES', detailLevel))
    .attr('fill', 'var(--vscode-editor-foreground)')
    .style('font-size', detailLevel === DETAIL_LEVELS.MINIMAL ? '8px' : '10px')
    .style('font-weight', '800').style('letter-spacing', '0.6px')
    .style('paint-order', 'stroke').style('stroke', 'var(--vscode-editor-background)')
    .style('stroke-width', '3px').style('opacity', 0.85)
  
  headerLayer.append('text')
    .attr('class', 'header-stewards')
    .attr('x', col3Center).attr('y', 18).attr('text-anchor', 'middle')
    .text(getAdaptiveHeader('STEWARDS', detailLevel))
    .attr('fill', 'var(--vscode-editor-foreground)')
    .style('font-size', detailLevel === DETAIL_LEVELS.MINIMAL ? '8px' : '10px')
    .style('font-weight', '800').style('letter-spacing', '0.6px')
    .style('paint-order', 'stroke').style('stroke', 'var(--vscode-editor-background)')
    .style('stroke-width', '3px').style('opacity', 0.85)

  // Source-of-truth cue for signals so the flow reads as "world -> envelope".
  // Only show on FULL and STANDARD detail levels
  if (detailLevel === DETAIL_LEVELS.FULL || detailLevel === DETAIL_LEVELS.STANDARD) {
    headerLayer.append('text')
      .attr('class', 'header-telemetry')
      .attr('x', col2Center)
      .attr('y', 8)
      .attr('text-anchor', 'middle')
      .text('WORLD (Telemetry) ↓')
      .attr('fill', 'var(--vscode-statusBar-foreground)')
      .style('font-size', '9px')
      .style('font-weight', '700')
      .style('opacity', 0.65)
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--vscode-editor-background)')
      .style('stroke-width', '3px')
  }

  // State
  let nodes = []
  let links = []
  let exceptionLinks = []
  let particles = []
  let fleetBounds = []

  const displayEnvelopeId = (id) => String(id || '').replace(/^ENV-/, 'DE-')

  let agentTooltip = null
  let agentTooltipHideTimeout = null

  let envelopeTooltip = null
  let envelopeTooltipHideTimeout = null

  let stewardTooltip = null
  let stewardTooltipHideTimeout = null

  const canHoverTooltip = () => {
    try {
      return window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    } catch {
      return false
    }
  }

  const shouldShowHoverTooltip = (evt) => {
    if (canHoverTooltip()) return true
    const pt = evt?.pointerType
    return pt === 'mouse' || pt === 'pen'
  }

  function ensureAgentTooltip() {
    if (agentTooltip && !agentTooltip.empty()) return agentTooltip

    agentTooltip = d3.select('body')
      .append('div')
      .attr('class', 'agent-tooltip')
      .style('position', 'fixed')
      .style('background', 'rgba(30, 30, 30, 0.98)')
      .style('color', 'var(--vscode-editor-foreground)')
      .style('border', '1px solid var(--vscode-widget-border)')
      .style('padding', '10px 14px')
      .style('border-radius', '6px')
      .style('pointer-events', 'none')
      .style('z-index', '10000')
      .style('font-size', '14px')
      .style('box-shadow', '0 6px 16px rgba(0,0,0,0.5)')
      .style('backdrop-filter', 'blur(8px)')
      .style('display', 'none')

    return agentTooltip
  }

  function hideAgentTooltip() {
    if (agentTooltipHideTimeout) {
      clearTimeout(agentTooltipHideTimeout)
      agentTooltipHideTimeout = null
    }
    if (agentTooltip && !agentTooltip.empty()) {
      agentTooltip.style('display', 'none')
    }
  }

  function ensureEnvelopeTooltip() {
    if (envelopeTooltip && !envelopeTooltip.empty()) return envelopeTooltip

    envelopeTooltip = d3.select('body')
      .append('div')
      .attr('class', 'envelope-tooltip')
      .style('position', 'fixed')
      .style('background', 'rgba(30, 30, 30, 0.98)')
      .style('color', 'var(--vscode-editor-foreground)')
      .style('border', '1px solid var(--vscode-widget-border)')
      .style('padding', '10px 14px')
      .style('border-radius', '6px')
      .style('pointer-events', 'none')
      .style('z-index', '10000')
      .style('font-size', '14px')
      .style('box-shadow', '0 6px 16px rgba(0,0,0,0.5)')
      .style('backdrop-filter', 'blur(8px)')
      .style('display', 'none')
      .style('max-width', '360px')

    return envelopeTooltip
  }

  function hideEnvelopeTooltip() {
    if (envelopeTooltipHideTimeout) {
      clearTimeout(envelopeTooltipHideTimeout)
      envelopeTooltipHideTimeout = null
    }
    if (envelopeTooltip && !envelopeTooltip.empty()) {
      envelopeTooltip.style('display', 'none')
    }
  }

  function ensureStewardTooltip() {
    if (stewardTooltip && !stewardTooltip.empty()) return stewardTooltip

    stewardTooltip = d3.select('body')
      .append('div')
      .attr('class', 'steward-tooltip')
      .style('position', 'fixed')
      .style('background', 'rgba(30, 30, 30, 0.98)')
      .style('color', 'var(--vscode-editor-foreground)')
      .style('border', '1px solid var(--vscode-widget-border)')
      .style('padding', '10px 14px')
      .style('border-radius', '6px')
      .style('pointer-events', 'none')
      .style('z-index', '10000')
      .style('font-size', '14px')
      .style('box-shadow', '0 6px 16px rgba(0,0,0,0.5)')
      .style('backdrop-filter', 'blur(8px)')
      .style('display', 'none')
      .style('max-width', '300px')

    return stewardTooltip
  }

  function hideStewardTooltip() {
    if (stewardTooltipHideTimeout) {
      clearTimeout(stewardTooltipHideTimeout)
      stewardTooltipHideTimeout = null
    }
    if (stewardTooltip && !stewardTooltip.empty()) {
      stewardTooltip.style('display', 'none')
    }
  }

  function showStewardTooltip(stewardNode, mouseEvent, element, { scenario = null, hour = null } = {}) {
    const tooltipNode = ensureStewardTooltip()

    tooltipNode.style('display', 'block')

    const stewardKey = String(stewardNode?.id || stewardNode?.name || '')
    const stewardRole = stewardNode?.name || ''
    const stewardColor = stewardNode?.color || 'var(--vscode-textLink-foreground)'

    // Count envelopes owned by this steward
    const allEnvelopes = scenario?.envelopes || []
    const ownedEnvelopes = allEnvelopes.filter(e => e && e.ownerRole === stewardRole)
    const usedHour = typeof hour === 'number' ? hour : getTimeHour()
    const activeEnvelopes = ownedEnvelopes.filter(e => {
      const status = getEnvelopeStatus(e, usedHour)
      return status === 'active'
    })

    // Count agents in this steward's fleet
    const fleets = scenario?.fleets || []
    const fleet = fleets.find(f => f && f.stewardRole === stewardRole)
    const agentCount = fleet?.agents?.length || 0
    const activeAgentCount = (fleet?.agents || []).filter(a => {
      const agentEvents = (scenario?.events || []).filter(e => 
        e && e.agentId === a.agentId && typeof e.hour === 'number' && e.hour <= usedHour && e.hour > (usedHour - 6)
      )
      return agentEvents.length > 0
    }).length

    tooltipNode
      .attr('data-steward-key', stewardKey)
      .html(`
        <div style="font-weight: 800; font-size: 16px; margin-bottom: 6px; color: ${stewardColor};">${stewardRole}</div>
        <div style="font-size: 13px; opacity: 0.85; margin-bottom: 8px;">Human Decision Authority</div>
        
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 13px;">
          <div style="display:flex; justify-content: space-between; gap: 12px; margin-bottom: 6px;">
            <div style="opacity: 0.75;">Envelopes</div>
            <div>${activeEnvelopes.length} active / ${ownedEnvelopes.length} total</div>
          </div>
          <div style="display:flex; justify-content: space-between; gap: 12px;">
            <div style="opacity: 0.75;">Fleet</div>
            <div>${activeAgentCount} working / ${agentCount} agents</div>
          </div>
        </div>
      `)

    positionAgentTooltip(tooltipNode, mouseEvent, element)
  }

  function showEnvelopeTooltip(envelopeNode, mouseEvent, element, { scenario = null, hour = null, autoHideMs = null } = {}) {
    const tooltipNode = ensureEnvelopeTooltip()

    tooltipNode
      .html(`
        <div style="font-weight: 600; margin-bottom: 6px; font-size: 16px;">${envelopeNode?.label || envelopeNode?.id || 'Envelope'}</div>
        <div style="font-size: 13px; opacity: 0.85; margin-bottom: 8px;">${envelopeNode?.name || ''}</div>
        <div style="font-size: 13px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
          <span style="opacity:0.75;">Steward:</span>
          <span style="font-weight: 700;">${envelopeNode?.ownerRole || 'Unknown'}</span>
        </div>
      `)
      .style('display', 'block')

    positionAgentTooltip(tooltipNode, mouseEvent, element)

    if (envelopeTooltipHideTimeout) {
      clearTimeout(envelopeTooltipHideTimeout)
      envelopeTooltipHideTimeout = null
    }
    if (typeof autoHideMs === 'number' && autoHideMs > 0) {
      envelopeTooltipHideTimeout = setTimeout(() => hideEnvelopeTooltip(), autoHideMs)
    }
  }

  function positionAgentTooltip(tooltipNode, mouseEvent, anchorEl) {
    const padding = 10
    const offsetX = 12
    const offsetY = 10

    let x = null
    let y = null

    if (mouseEvent && typeof mouseEvent.clientX === 'number' && typeof mouseEvent.clientY === 'number') {
      x = mouseEvent.clientX + offsetX
      y = mouseEvent.clientY - offsetY
    } else if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
      const rect = anchorEl.getBoundingClientRect()
      x = rect.left + rect.width / 2
      y = rect.top
    } else {
      x = padding
      y = padding
    }

    // Measure after content is set and display is enabled
    const node = tooltipNode.node()
    const tooltipWidth = node?.offsetWidth || 0
    const tooltipHeight = node?.offsetHeight || 0
    const vw = window.innerWidth || 0
    const vh = window.innerHeight || 0

    // Prefer above-cursor placement when we have a pointer event
    if (mouseEvent && tooltipHeight) {
      y = mouseEvent.clientY - tooltipHeight - 12
    } else if (anchorEl && tooltipHeight) {
      y = y - tooltipHeight - 10
    }

    if (tooltipWidth && vw) {
      x = Math.max(padding, Math.min(x, vw - tooltipWidth - padding))
    }
    if (tooltipHeight && vh) {
      y = Math.max(padding, Math.min(y, vh - tooltipHeight - padding))
    }

    tooltipNode
      .style('left', `${x}px`)
      .style('top', `${y}px`)
      .style('transform', null)
  }

  function showAgentTooltip(agentNode, mouseEvent, element, { autoHideMs = null } = {}) {
    const tooltipNode = ensureAgentTooltip()

    const agentKey = String(agentNode?.id || agentNode?.name || '')
    const prevKey = tooltipNode.attr('data-agent-key')
    const wasHidden = tooltipNode.style('display') === 'none'

    tooltipNode.style('display', 'block')

    if (wasHidden || prevKey !== agentKey) {
      const fleetRole = agentNode?.fleetRole || ''
      const fleetColor = agentNode?.fleetColor || 'var(--vscode-textLink-foreground)'
      tooltipNode
        .attr('data-agent-key', agentKey)
        .html(`
          <div style="font-weight: 600; margin-bottom: 6px; font-size: 16px;">${agentNode.name}</div>
          <div style="font-size: 13px; opacity: 0.85; margin-bottom: 8px;">${agentNode.role || ''}</div>
          <div style="font-size: 13px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
            <span style="color: ${agentNode.isRecentlyActive ? '#4ec9b0' : '#cccccc'};">
              ${agentNode.isRecentlyActive ? '● Active' : '○ Idle'}
            </span>
          </div>
          ${fleetRole ? `<div style="margin-top: 8px; font-size: 13px; opacity: 0.85;">
            <span style="opacity:0.75;">Steward:</span>
            <span style="font-weight: 700; color: ${fleetColor};">${fleetRole}</span>
          </div>` : ''}
        `)
    }

    positionAgentTooltip(tooltipNode, mouseEvent, element)

    if (agentTooltipHideTimeout) {
      clearTimeout(agentTooltipHideTimeout)
      agentTooltipHideTimeout = null
    }
    if (typeof autoHideMs === 'number' && autoHideMs > 0) {
      agentTooltipHideTimeout = setTimeout(() => hideAgentTooltip(), autoHideMs)
    }
  }

  function showEnvelopeAuthority(envelopeNode, scenario, hour) {
    // Create modal overlay to show envelope decision authority details
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(2px);
    `
    
    const modal = document.createElement('div')
    modal.style.cssText = `
      background: var(--vscode-editor-background);
      border: 2px solid var(--vscode-focusBorder);
      border-radius: 8px;
      padding: 24px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    `
    
    const envelope = getEnvelopeAtTime(scenario, envelopeNode.id, hour) || 
                     scenario?.envelopes?.find(e => e.envelopeId === envelopeNode.id)
    
    if (!envelope) {
      modal.innerHTML = '<p>Envelope not found</p>'
      overlay.appendChild(modal)
      document.body.appendChild(overlay)
      overlay.addEventListener('click', () => overlay.remove())
      return
    }
    
    const status = envelopeNode.status || 'unknown'
    const version = envelope.envelope_version || 1
    const semver = toSemver(version)
    const revision = envelope.revision_id || 'Initial'
    
    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
        <div>
          <h2 style="margin: 0 0 4px 0; font-size: 18px;">${envelopeNode.label}</h2>
          <div style="font-size: 14px; color: var(--vscode-statusBar-foreground);">${envelope.name}</div>
        </div>
        <button id="close-modal" style="background: none; border: none; color: var(--vscode-editor-foreground); font-size: 20px; cursor: pointer; padding: 4px 8px;">&times;</button>
      </div>
      
      <div style="display: flex; gap: 12px; margin-bottom: 20px;">
        <span style="background: var(--vscode-badge-background); padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">
          ${status.toUpperCase()}
        </span>
        <span style="background: var(--vscode-input-background); padding: 4px 10px; border-radius: 12px; font-size: 13px; font-family: monospace;">
          v${semver}
        </span>
        <span style="background: var(--vscode-input-background); padding: 4px 10px; border-radius: 12px; font-size: 13px;">
          ${envelopeNode.ownerRole}
        </span>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 15px; font-weight: 600; text-transform: uppercase; color: var(--vscode-statusBar-foreground); margin-bottom: 8px; letter-spacing: 0.5px;">Domain</h3>
        <div style="padding: 8px; background: var(--vscode-input-background); border-radius: 4px;">${envelope.domain || 'Not specified'}</div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 15px; font-weight: 600; text-transform: uppercase; color: var(--vscode-statusBar-foreground); margin-bottom: 8px; letter-spacing: 0.5px;">Decision Authority (Assumptions)</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${(envelope.assumptions || []).map(a => `
            <div style="padding: 10px; background: var(--vscode-input-background); border-left: 3px solid var(--vscode-focusBorder); border-radius: 3px; font-size: 14px;">
              ${a}
            </div>
          `).join('') || '<div style="color: var(--vscode-statusBar-foreground); font-style: italic;">No assumptions defined</div>'}
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 15px; font-weight: 600; text-transform: uppercase; color: var(--vscode-statusBar-foreground); margin-bottom: 8px; letter-spacing: 0.5px;">Constraints</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${(envelope.constraints || []).map(c => `
            <div style="padding: 10px; background: var(--vscode-input-background); border-left: 3px solid var(--status-warning); border-radius: 3px; font-size: 14px;">
              ${c}
            </div>
          `).join('') || '<div style="color: var(--vscode-statusBar-foreground); font-style: italic;">No constraints defined</div>'}
        </div>
      </div>
      
      <div style="margin-bottom: 0;">
        <h3 style="font-size: 15px; font-weight: 600; text-transform: uppercase; color: var(--vscode-statusBar-foreground); margin-bottom: 8px; letter-spacing: 0.5px;">Time Window</h3>
        <div style="padding: 8px; background: var(--vscode-input-background); border-radius: 4px; font-family: monospace; font-size: 14px;">
          Created: Day ${Math.floor((envelope.createdHour || 0) / 24)}, ${String(Math.floor((envelope.createdHour || 0) % 24)).padStart(2, '0')}:00<br>
          Ends: Day ${Math.floor((envelope.endHour || 48) / 24)}, ${String(Math.floor((envelope.endHour || 48) % 24)).padStart(2, '0')}:00
        </div>
      </div>
    `
    
    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    
    // Close handlers
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove()
    })
    
    modal.querySelector('#close-modal').addEventListener('click', () => overlay.remove())
    
    // Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        overlay.remove()
        document.removeEventListener('keydown', handleEscape)
      }
    }
    document.addEventListener('keydown', handleEscape)
  }

  function getStewardEnvelopeInteractionCount(scenario, hour, envelopeId, stewardRole, windowHours = 24) {
    const events = scenario?.events || []
    const start = hour - windowHours
    let count = 0
    let hasEscalation = false
    for (const e of events) {
      if (typeof e?.hour !== 'number') continue
      if (e.hour < start || e.hour > hour) continue
      const eid = e.envelopeId || e.envelope_id
      if (!eid || eid !== envelopeId) continue
      if (!stewardRole || e.actorRole !== stewardRole) continue

      if (e.type === 'boundary_interaction' || e.type === 'revision' || e.type === 'dsg_session' || e.type === 'dsg_message') {
        count += 1
      }
      if (e.type === 'boundary_interaction' && (e.boundary_kind === 'escalated' || e.boundary_kind === 'overridden')) {
        hasEscalation = true
      }
    }
    return { count, hasEscalation }
  }

  // 3. Update Function (Called on time change)
  function update() {
    const hour = getTimeHour()
    const scenario = getScenario()
    
    // Get all envelopes and resolve their state at the current time
    const allEnvelopes = scenario?.envelopes || []
    
    // Apply filter
    const filteredEnvelopes = currentFilter === 'all'
      ? allEnvelopes
      : allEnvelopes.filter(env => env.ownerRole === currentFilter)
    
    // Find the active instance of each envelope at the current time
    // Multiple envelope instances with the same ID can exist (for reopening patterns)
    // We want the instance that is active at the current hour
    const envelopesById = new Map()
    for (const envelope of filteredEnvelopes) {
      const status = getEnvelopeStatus(envelope, hour)
      const existing = envelopesById.get(envelope.envelopeId)
      
      // Prefer active envelopes, then the most recent instance
      if (!existing || status === 'active' || 
          (status !== 'active' && existing.status !== 'active' && envelope.createdHour > existing.createdHour)) {
        envelopesById.set(envelope.envelopeId, { ...envelope, status })
      }
    }
    
    const activeEnvelopes = Array.from(envelopesById.values())

    // Sort envelopes for layout: Active first, then by ID
    // This creates the "come to the top" behavior
    activeEnvelopes.sort((a, b) => {
        const statusA = a.status
        const statusB = b.status
        if (statusA === 'active' && statusB !== 'active') return -1
        if (statusA !== 'active' && statusB === 'active') return 1
        return a.envelopeId.localeCompare(b.envelopeId)
    })

    const allRecentEvents = getEventsNearTime(scenario, hour, 1) // Events in the last hour
    
    // Filter events to only those related to filtered envelopes
    const filteredEnvelopeIds = new Set(activeEnvelopes.map(e => e.envelopeId))
    const recentEvents = allRecentEvents.filter(e => {
      const envId = e.envelopeId || e.envelope_id
      return !envId || filteredEnvelopeIds.has(envId)
    })
    
    const activeAgentIds = new Set(recentEvents.map(e => e.agentId).filter(Boolean))

    // Agent recency: track last observed activity hour per agent so we can
    // distinguish "recently working" vs "idle" even within the same fleet.
    const agentLastActiveHour = new Map()
    for (const e of (scenario?.events || [])) {
      if (!e || typeof e.hour !== 'number' || e.hour > hour) continue
      if (!e.agentId) continue
      const prev = agentLastActiveHour.get(e.agentId)
      if (typeof prev !== 'number' || e.hour > prev) agentLastActiveHour.set(e.agentId, e.hour)
    }
    const recentlyRevisedEnvelopeIds = new Set(
      recentEvents
        .filter(e => e && e.type === 'revision')
        .map(e => e.envelopeId || e.envelope_id)
        .filter(Boolean)
    )

    const topMargin = 38
    const bottomMargin = 16
    const usableHeight = Math.max(160, mapHeight - topMargin - bottomMargin)  // Use mapHeight, not total height
    const rowCount = Math.max(1, activeEnvelopes.length)
    const rowHeight = usableHeight / rowCount
    const baseEnvelopeR = Math.max(22, Math.min(40, (rowHeight - 18) / 2))
    
    // Get envelope dimensions based on current detail level
    const envDims = getEnvelopeDimensions(detailLevel, baseEnvelopeR)
    const envelopeR = envDims.isIcon ? envDims.radius : baseEnvelopeR * envDims.scale

    // --- Nodes (Envelopes) ---
    // Map envelopes to nodes, preserving existing nodes to keep position
    let newNodes = activeEnvelopes.map((envelope, index) => {
      const existing = nodes.find(n => n.id === envelope.envelopeId)
      
      // Status already computed earlier
      const status = envelope.status
      const isActive = status === 'active'
      
      // Get effective envelope at current time (with revisions applied)
      const effective = getEnvelopeAtTime(scenario, envelope.envelopeId, hour) || envelope
      const currentVersion = effective?.envelope_version ?? 1
      const baseVersion = envelope?.envelope_version ?? 1
      const isVersionBumped = currentVersion > baseVersion
      
      // Calculate target position based on row index.
      const targetY = topMargin + (index * rowHeight) + (rowHeight * 0.5)
      const targetX = col2Center // Center of middle third

      if (existing) {
        existing.isActive = isActive
        existing.status = status
        existing.isRecentlyRevised = recentlyRevisedEnvelopeIds.has(envelope.envelopeId)
        existing.version = currentVersion
        existing.semver = toSemver(currentVersion)
        existing.isVersionBumped = isVersionBumped
        existing.targetX = targetX
        existing.targetY = targetY
        existing.envDims = envDims  // Update dimensions on existing nodes
        return existing
      }

      return {
        id: envelope.envelopeId,
        type: 'envelope',
        label: displayEnvelopeId(envelope.envelopeId),
        name: envelope.name,
        ownerRole: envelope.ownerRole,
        ownerColor: undefined,
        r: envelopeR,
        envDims: envDims,  // Store envelope dimensions on node
        isActive: isActive,
        status: status,
        isRecentlyRevised: recentlyRevisedEnvelopeIds.has(envelope.envelopeId),
        version: currentVersion,
        semver: toSemver(currentVersion),
        isVersionBumped: isVersionBumped,
        x: targetX,
        y: targetY,
        targetX: targetX,
        targetY: targetY
      }
    })

    // --- Nodes (Stewards) ---
    // Add persistent Steward nodes from scenario fleets
    const allFleets = scenario?.fleets || []
    
    // Filter fleets based on current filter
    const fleets = currentFilter === 'all'
      ? allFleets
      : allFleets.filter(f => f.stewardRole === currentFilter)

    const stewardColorByRole = new Map()

    const stewardCount = Math.max(1, fleets.length)
    const stewardStep = stewardCount > 1 ? usableHeight / (stewardCount - 1) : usableHeight
    const stewardR = Math.max(20, Math.min(36, (stewardStep - 14) / 2))
    const stewardScale = d3.scalePoint()
      .domain(fleets.map(f => f.stewardRole))
      .range([topMargin, topMargin + usableHeight])
      .padding(0.2)

    fleets.forEach(fleet => {
      const stewardId = `steward-${fleet.stewardRole.replace(/\s+/g, '-')}`
      const targetY = stewardScale(fleet.stewardRole) ?? topMargin
      const targetX = col3Center // Center of right third
      // Use shared steward color utility for consistency across views
      const color = getStewardColor(fleet.stewardRole)
      stewardColorByRole.set(fleet.stewardRole, color)

      const existing = nodes.find(n => n.id === stewardId)
      if (existing) {
          existing.targetX = targetX
          existing.targetY = targetY
          existing.r = stewardR
          existing.color = color
          newNodes.push(existing)
      } else {
        newNodes.push({
          id: stewardId,
          type: 'steward',
          label: 'Steward',
          name: fleet.stewardRole,
          color,
          r: stewardR,
          x: targetX,
          y: targetY,
          targetX: targetX,
          targetY: targetY
        })
      }
    })

    // Envelopes carry their owner's color so rendering code doesn't need
    // to reach back into update-local maps.
    for (const n of newNodes) {
      if (!n || n.type !== 'envelope') continue
      n.ownerColor = stewardColorByRole.get(n.ownerRole) || undefined
    }

    // --- Nodes (Agents) ---
    // Layout agents per-fleet, with a clear "working" vs "idle" split.
    // Working = has activity within the last hour (or present in recent events).
    const RECENT_WORK_WINDOW_HOURS = 6
    const fleetOrder = fleets
      .slice()
      .filter(f => f && f.stewardRole)
      .sort((a, b) => String(a.stewardRole).localeCompare(String(b.stewardRole)))

    const agentH = Math.max(26, Math.min(34, rowHeight * 0.38))
    const leftPadding = 18
    const rightPadding = 18
    const idleX = col1Left + leftPadding + 20
    const workingX = col1Left + Math.max(96, (col1Right - col1Left) * 0.43)
    const agentStep = Math.max(26, Math.min(30, rowHeight * 0.42))
    const fleetBand = Math.max(52, Math.min(120, usableHeight / Math.max(1, fleetOrder.length)))

    // Fleet vertical slots (prevents fleets from overlapping even when a fleet has many agents).
    const stewardDomain = stewardScale.domain()
    const stewardCenters = stewardDomain.map(role => stewardScale(role) ?? topMargin)
    const fleetSlotByRole = new Map()
    for (let i = 0; i < stewardDomain.length; i++) {
      const role = stewardDomain[i]
      const center = stewardCenters[i]
      const slotTop = i === 0 ? topMargin : (stewardCenters[i - 1] + center) / 2
      const slotBottom = i === (stewardDomain.length - 1) ? (topMargin + usableHeight) : (center + stewardCenters[i + 1]) / 2
      fleetSlotByRole.set(role, { top: slotTop, bottom: slotBottom, center })
    }

    // Fast lookup for envelope status so agents can be treated as "working" while their
    // envelope is actively open (more realistic than relying on the last 1h of events).
    const envelopeStatusById = new Map()
    for (const env of activeEnvelopes) {
      const id = env?.envelopeId
      if (!id) continue
      envelopeStatusById.set(id, getEnvelopeStatus(env, hour))
    }

    function stackYsInSlot(centerY, count, slotTop, slotBottom) {
      const pad = 8
      const minY = Math.max(topMargin, slotTop + pad + (agentH / 2))
      const maxY = Math.min(topMargin + usableHeight, slotBottom - pad - (agentH / 2))
      const clampedCenter = Math.max(minY, Math.min(maxY, centerY))
      if (count <= 1) return [clampedCenter]

      const span = Math.max(0, maxY - minY)
      // Agent name + role occupy ~30px vertical space (name at y=-2, role at y=12, plus margins)
      // Increased to 36px for better text separation
      const safeMinStep = 36
      const ideal = span / Math.max(1, (count - 1))
      const step = Math.max(safeMinStep, Math.min(agentStep, ideal))
      
      const total = (count - 1) * step
      let start = clampedCenter - (total / 2)
      if (start < minY) start = minY
      if ((start + total) > maxY) start = Math.max(minY, maxY - total)

      const ys = []
      for (let i = 0; i < count; i++) ys.push(start + i * step)
      return ys
    }
    
    // Smart text positioning to avoid overlaps
    function adjustAgentTextPositions(agentNodes) {
      if (!agentNodes || !agentNodes.length) return []
      
      const textBoxes = new Map()
      const adjusted = []
      
      // Group by fleet to check collisions within each fleet
      const byFleet = d3.group(agentNodes, d => d.fleetRole || 'default')
      
      byFleet.forEach((fleetAgents, fleetRole) => {
        // Sort by y position within fleet
        const sorted = [...fleetAgents].sort((a, b) => a.targetY - b.targetY)
        
        sorted.forEach((agent, index) => {
          const baseTextY = -3
          const estimatedTextWidth = (agent.name?.length || 10) * 5.5
          const textHeight = 24 // Increased for name + role
          
          let textYOffset = 0
          let useLeftSide = false
          
          // Check for overlaps with previously placed text in this fleet
          let hasOverlap = true
          let attempts = 0
          
          while (hasOverlap && attempts < 4) {
            hasOverlap = false
            const candidateY = agent.targetY + baseTextY + textYOffset
            
            for (const [otherId, box] of textBoxes.entries()) {
              if (otherId.startsWith(`${fleetRole}:`)) {
                const yDist = Math.abs(candidateY - box.y)
                const xOverlap = Math.abs(agent.targetX - box.x) < estimatedTextWidth + 20
                
                if (yDist < textHeight && xOverlap) {
                  hasOverlap = true
                  // Alternate: try shifting down or flipping to left side
                  if (attempts < 2) {
                    textYOffset += 14
                  } else {
                    useLeftSide = true
                  }
                  break
                }
              }
            }
            
            attempts++
          }
          
          textBoxes.set(`${fleetRole}:${agent.id}`, {
            x: agent.targetX,
            y: agent.targetY + baseTextY + textYOffset,
            width: estimatedTextWidth,
            height: textHeight
          })
          
          adjusted.push({
            ...agent,
            textYOffset,
            useLeftSide
          })
        })
      })
      
      return adjusted
    }

    for (const fleet of fleetOrder) {
      const allAgents = (Array.isArray(fleet?.agents) ? fleet.agents : [])
        .filter(a => a && a.agentId)
        .map(a => ({ ...a, stewardRole: fleet.stewardRole }))
        .sort((a, b) => String(a.name || a.agentId).localeCompare(String(b.name || b.agentId)))
      
      // Filter agents to only show those working on filtered envelopes
      const filteredEnvelopeIds = new Set(activeEnvelopes.map(env => env.envelopeId))
      const agents = allAgents.filter(a => {
        if (!Array.isArray(a?.envelopeIds)) return false
        return a.envelopeIds.some(envId => filteredEnvelopeIds.has(envId))
      })

      const fleetColor = stewardColorByRole.get(fleet.stewardRole) || 'var(--vscode-sideBar-border)'

      const slot = fleetSlotByRole.get(fleet.stewardRole)
      const fleetY = slot?.center ?? (stewardScale(fleet.stewardRole) ?? topMargin)
      const lastHourYs = (Array.isArray(agents) ? agents : [])
      if (!lastHourYs.length) continue

      const working = []
      const idle = []

      for (const agent of agents) {
        const last = agentLastActiveHour.get(agent.agentId)
        const envelopeOpen = Array.isArray(agent?.envelopeIds)
          ? agent.envelopeIds.some(id => envelopeStatusById.get(id) === 'active')
          : false
        const isWorking = envelopeOpen || activeAgentIds.has(agent.agentId) || (typeof last === 'number' && (hour - last) <= RECENT_WORK_WINDOW_HOURS)
        const bucket = isWorking ? working : idle
        bucket.push({ ...agent, lastActiveHour: last, isWorking, fleetColor })
      }

      const slotTop = slot?.top ?? (fleetY - fleetBand / 2)
      const slotBottom = slot?.bottom ?? (fleetY + fleetBand / 2)
      
      // Scalable grid layout for N agents with progressive detail reduction
      const allFleetAgents = [...working, ...idle]
      const agentCount = allFleetAgents.length
      
      // Progressive grid configuration based on fleet size
      let cols, iconScale, showNames, cellPadding
      if (agentCount <= 2) {
        cols = 1
        iconScale = 1.0
        showNames = true
        cellPadding = 8
      } else if (agentCount <= 4) {
        cols = 2
        iconScale = 0.9
        showNames = true
        cellPadding = 6
      } else if (agentCount <= 6) {
        cols = 3
        iconScale = 0.75
        showNames = true
        cellPadding = 4
      } else if (agentCount <= 9) {
        cols = 3
        iconScale = 0.6
        showNames = false  // Hide names, show on hover/click
        cellPadding = 3
      } else if (agentCount <= 12) {
        cols = 4
        iconScale = 0.5
        showNames = false
        cellPadding = 2
      } else {
        cols = 5
        iconScale = 0.4
        showNames = false
        cellPadding = 2
      }
      
      const rows = Math.ceil(agentCount / cols)
      const availableWidth = col1Right - col1Left - leftPadding - rightPadding
      const cellWidth = availableWidth / cols
      const cellHeight = Math.min(52, (slotBottom - slotTop - 16) / Math.max(1, rows))
      
      const gridPositions = allFleetAgents.map((agent, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const xOffset = col1Left + leftPadding + (col * cellWidth) + (cellWidth / 2)
        const yOffset = slotTop + 12 + (row * cellHeight) + (cellHeight / 2)
        return { 
          x: xOffset, 
          y: yOffset, 
          isWorking: agent.isWorking,
          iconScale,
          showName: showNames
        }
      })

      working.forEach((agent, i) => {
        const gridPos = gridPositions[i]
        const targetX = gridPos.x
        const targetY = gridPos.y
        const agentW = Math.min(cellWidth - cellPadding * 2, 180)
        const agentR = 12 * gridPos.iconScale

        const existing = nodes.find(n => n.id === agent.agentId)
        if (existing) {
          existing.targetX = targetX
          existing.targetY = targetY
          existing.w = agentW
          existing.h = agentH
          existing.name = agent.name
          existing.role = agent.role
          existing.isRecentlyActive = true
          existing.lastActiveHour = agent.lastActiveHour
          existing.fleetRole = fleet.stewardRole
          existing.fleetColor = agent.fleetColor
          existing.r = agentR
          existing.gridScale = gridPos.iconScale
          existing.showName = gridPos.showName
          newNodes.push(existing)
        } else if (!newNodes.find(n => n.id === agent.agentId)) {
          newNodes.push({
            id: agent.agentId,
            type: 'agent',
            name: agent.name,
            role: agent.role,
            isRecentlyActive: true,
            lastActiveHour: agent.lastActiveHour,
            fleetRole: fleet.stewardRole,
            fleetColor: agent.fleetColor,
            w: agentW,
            h: agentH,
            r: agentR,
            gridScale: gridPos.iconScale,
            showName: gridPos.showName,
            x: targetX,
            y: targetY,
            targetX,
            targetY,
          })
        }
      })

      idle.forEach((agent, i) => {
        const gridIdx = working.length + i
        const gridPos = gridPositions[gridIdx]
        const targetX = gridPos.x
        const targetY = gridPos.y
        const agentW = Math.min(cellWidth - cellPadding * 2, 180)
        const agentR = 12 * gridPos.iconScale

        const existing = nodes.find(n => n.id === agent.agentId)
        if (existing) {
          existing.targetX = targetX
          existing.targetY = targetY
          existing.w = agentW
          existing.h = agentH
          existing.name = agent.name
          existing.role = agent.role
          existing.isRecentlyActive = false
          existing.lastActiveHour = agent.lastActiveHour
          existing.fleetRole = fleet.stewardRole
          existing.fleetColor = agent.fleetColor
          existing.r = agentR
          existing.gridScale = gridPos.iconScale
          existing.showName = gridPos.showName
          newNodes.push(existing)
        } else if (!newNodes.find(n => n.id === agent.agentId)) {
          newNodes.push({
            id: agent.agentId,
            type: 'agent',
            name: agent.name,
            role: agent.role,
            isRecentlyActive: false,
            lastActiveHour: agent.lastActiveHour,
            fleetRole: fleet.stewardRole,
            fleetColor: agent.fleetColor,
            w: agentW,
            h: agentH,
            r: agentR,
            gridScale: gridPos.iconScale,
            showName: gridPos.showName,
            x: targetX,
            y: targetY,
            targetX,
            targetY,
          })
        }
      })
    }

    // Apply smart text positioning to prevent overlaps
    const agentNodesForAdjustment = newNodes.filter(n => n.type === 'agent')
    const adjustedAgents = adjustAgentTextPositions(agentNodesForAdjustment)
    const agentAdjustmentMap = new Map(adjustedAgents.map(a => [a.id, a]))
    
    // Merge adjustments back into nodes
    newNodes = newNodes.map(n => {
      if (n.type === 'agent' && agentAdjustmentMap.has(n.id)) {
        const adj = agentAdjustmentMap.get(n.id)
        return { ...n, textYOffset: adj.textYOffset, useLeftSide: adj.useLeftSide }
      }
      return n
    })

    // --- Fleet boundaries ---
    // Visual cue: each steward owns a fleet; boundaries + agent tint use the steward's color.
    const fleetAgents = newNodes.filter(n => n && n.type === 'agent' && n.fleetRole)
    const fleetsByRole = d3.group(fleetAgents, d => d.fleetRole)
    fleetBounds = Array.from(fleetsByRole.entries()).map(([role, members]) => {
      const ys = members.map(m => m.targetY)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const slot = fleetSlotByRole.get(role)
      const slotTop = slot?.top ?? topMargin
      const slotBottom = slot?.bottom ?? (topMargin + usableHeight)
      const top = Math.max(slotTop + 6, (minY - (agentH / 2) - 10))
      const bottom = Math.min(slotBottom - 6, (maxY + (agentH / 2) + 10))

      const left = col1Left + leftPadding
      const right = col1Right - rightPadding
      return {
        id: `fleet:${role}`,
        role,
        color: stewardColorByRole.get(role) || 'var(--vscode-sideBar-border)',
        x: left,
        y: top,
        w: Math.max(120, right - left),
        h: Math.max(48, bottom - top),
      }
    })
    
    nodes = newNodes

    // --- Links ---
    // Link Stewards to their Envelopes
    const stewardLinks = nodes
      .filter(n => n.type === 'steward')
      .flatMap(stewardNode => {
         // Find envelopes owned by this steward
         return nodes
           .filter(n => n.type === 'envelope' && n.ownerRole === stewardNode.name)
           .map(envelopeNode => ({
             source: stewardNode.id,
             target: envelopeNode.id,
             type: 'ownership'
           }))
      })

    // Link Agents to their Envelopes (working agents only, to keep the fleet roster readable)
    const agentLinks = nodes
      .filter(n => n.type === 'agent' && n.isRecentlyActive)
        .flatMap(agentNode => {
            // Find the agent definition to get envelopeIds
            const agentDef = fleets.flatMap(f => (Array.isArray(f?.agents) ? f.agents : [])).find(a => a.agentId === agentNode.id)
            if (!agentDef) return []
            
            return nodes
                .filter(n => n.type === 'envelope' && agentDef.envelopeIds.includes(n.id))
                .map(envelopeNode => ({
                    source: agentNode.id,
                    target: envelopeNode.id,
                    type: 'interaction'
                }))
        })

    // Add recent interaction signal on steward->envelope links (last 24h by default)
    const stewardshipLinks = stewardLinks.map(l => {
      const stewardNode = nodes.find(n => n.id === l.source)
      const envNode = nodes.find(n => n.id === l.target)
      if (!stewardNode || !envNode) return l
      const { count, hasEscalation } = getStewardEnvelopeInteractionCount(scenario, hour, envNode.id, stewardNode.name, 24)
      return { ...l, interactionCount: count, hasEscalation }
    })

    links = [...stewardshipLinks, ...agentLinks]
      .filter(l => nodes.find(n => n.id === l.target) && nodes.find(n => n.id === l.source))

    // --- Open exception links (Boundary Interaction in-flight) ---
    // HDDL story: an escalated boundary interaction remains "open" until a resolving revision lands.
    const allEvents = scenario?.events ?? []
    const escalations = allEvents
      .filter(e => e && e.type === 'boundary_interaction')
      .filter(e => typeof e.hour === 'number' && e.hour <= hour)
      .filter(e => String(e.boundary_kind || e.boundaryKind || '').toLowerCase() === 'escalated')

    const resolvingRevisionIds = new Set(
      allEvents
        .filter(e => e && e.type === 'revision')
        .filter(e => typeof e.hour === 'number' && e.hour <= hour)
        .map(e => e.resolvesEventId)
        .filter(Boolean)
    )

    exceptionLinks = escalations
      .filter(e => Boolean(e.eventId) && !resolvingRevisionIds.has(e.eventId))
      .map(e => {
        const envId = e.envelopeId || e.envelope_id
        const envNode = nodes.find(n => n.type === 'envelope' && n.id === envId)
        const stewardNode = e.actorRole
          ? nodes.find(n => n.type === 'steward' && n.name === e.actorRole)
          : null
        if (!envNode || !stewardNode) return null
        return {
          id: e.eventId,
          type: 'open_exception',
          source: envNode,
          target: stewardNode,
          label: e.label,
        }
      })
      .filter(Boolean)

    // Track steward processing state: boundary interaction received but no revision issued yet
    // Find all boundary interactions up to current time
    const boundaryInteractionsByRole = new Map()
    allEvents
      .filter(e => e && e.type === 'boundary_interaction')
      .filter(e => typeof e.hour === 'number' && e.hour <= hour)
      .forEach(e => {
        const role = e.actorRole
        if (!role) return
        if (!boundaryInteractionsByRole.has(role)) {
          boundaryInteractionsByRole.set(role, [])
        }
        boundaryInteractionsByRole.get(role).push({ eventId: e.eventId, hour: e.hour, envelopeId: e.envelopeId || e.envelope_id })
      })
    
    // Find all revisions up to current time
    const revisionsByRole = new Map()
    allEvents
      .filter(e => e && e.type === 'revision')
      .filter(e => typeof e.hour === 'number' && e.hour <= hour)
      .forEach(e => {
        const role = e.actorRole
        if (!role) return
        if (!revisionsByRole.has(role)) {
          revisionsByRole.set(role, [])
        }
        revisionsByRole.get(role).push({ eventId: e.eventId, hour: e.hour, resolvesEventId: e.resolvesEventId })
      })
    
    // Update steward nodes with processing state
    nodes.filter(n => n.type === 'steward').forEach(stewardNode => {
      const role = stewardNode.name
      const interactions = boundaryInteractionsByRole.get(role) || []
      const revisions = revisionsByRole.get(role) || []
      const resolvedEventIds = new Set(revisions.map(r => r.resolvesEventId).filter(Boolean))
      
      // Check if there are any unresolved interactions
      const hasUnresolvedInteraction = interactions.some(i => i.eventId && !resolvedEventIds.has(i.eventId))
      stewardNode.isProcessing = hasUnresolvedInteraction
    })

    // --- Particles (Events) ---
    // Authority-first map story:
    // - signal: world -> envelope
    // - boundary_interaction: agent -> envelope -> steward
    // - revision: steward (actorRole) -> envelope
    // - retrieval: embedding store -> agent
    const flowEvents = recentEvents.filter(e =>
      e.type === 'signal' || e.type === 'boundary_interaction' || e.type === 'revision' || e.type === 'decision' || e.type === 'retrieval'
    )
    
    // Helper to find resolution time for boundary interactions (reuse allEvents from above)
    function getResolutionTime(eventId) {
      const resolving = allEvents.find(ev => 
        (ev.type === 'revision' || ev.type === 'decision') && 
        ev.resolvesEventId === eventId
      )
      return resolving?.hour || null
    }

    flowEvents.forEach(e => {
      const pid = e.eventId || e.id || `${e.type}-${String(e.hour)}-${e.envelopeId || e.envelope_id || e.envelope_id}`
      if (particles.find(p => p.id === pid)) return

      const envelopeId = e.envelopeId || e.envelope_id
      const envelopeNode = nodes.find(n => n.type === 'envelope' && n.id === envelopeId)
      if (!envelopeNode) return

      const stewardNode = e.actorRole
        ? nodes.find(n => n.type === 'steward' && n.name === e.actorRole)
        : null

      const agentNode = e.agentId ? nodes.find(n => n.type === 'agent' && n.id === e.agentId) : null

      // Default: start off-screen
      let sourceX = Math.random() < 0.5 ? -20 : width + 20
      let sourceY = Math.random() * height
      let targetX = envelopeNode.x
      let targetY = envelopeNode.y

      if (e.type === 'signal') {
        // world -> envelope
        // Always originate from above the envelope lane so it never reads
        // like it came from a steward.
        sourceX = envelopeNode.x + (Math.random() * 40 - 20)
        sourceY = -24
        targetX = envelopeNode.x
        targetY = envelopeNode.y
      }

      if (e.type === 'decision') {
        // agent -> envelope (all decisions go to envelope first)
        if (agentNode) {
          sourceX = agentNode.x
          sourceY = agentNode.y
        }
        // All decisions target envelope first
        targetX = envelopeNode.x
        targetY = envelopeNode.y
      }

      if (e.type === 'boundary_interaction') {
        // agent -> envelope (agent requests escalation, envelope forwards to steward)
        // Look up agent by actorName since boundary_interaction events don't have agentId
        const boundaryAgentNode = e.actorName 
          ? nodes.find(n => n.type === 'agent' && n.name === e.actorName)
          : null
        
        if (boundaryAgentNode) {
          sourceX = boundaryAgentNode.x
          sourceY = boundaryAgentNode.y
        } else {
          // Fallback to envelope if agent not found
          sourceX = envelopeNode.x
          sourceY = envelopeNode.y
        }
        
        // Target envelope first (boundary check), then forward to steward
        targetX = envelopeNode.x
        targetY = envelopeNode.y
      }

      if (e.type === 'revision') {
        // steward -> envelope
        if (stewardNode) {
          sourceX = stewardNode.x
          sourceY = stewardNode.y
        }
        targetX = envelopeNode.x
        targetY = envelopeNode.y
      }

      if (e.type === 'retrieval') {
        // embedding store -> agent (agent queries decision memory)
        // Source: embedding store at bottom of map (center of the 3D box)
        sourceX = width * 0.5 + (Math.random() * 100 - 50) // Center with slight randomness
        sourceY = mapHeight + 40 // Embedding store area (below the main map)
        
        // Target: agent that made the query (via actorName)
        const retrievalAgentNode = e.actorName 
          ? nodes.find(n => n.type === 'agent' && n.name === e.actorName)
          : null
        
        if (retrievalAgentNode) {
          targetX = retrievalAgentNode.x
          targetY = retrievalAgentNode.y
        } else {
          // Fallback to envelope if agent not found
          targetX = envelopeNode.x
          targetY = envelopeNode.y
        }
      }

      // Calculate orbit duration for boundary interactions based on resolution time
      const resolutionHour = e.type === 'boundary_interaction' && e.eventId 
        ? getResolutionTime(e.eventId) 
        : null
      const hoursDiff = resolutionHour ? (resolutionHour - e.hour) : 0
      // Increase ticks per hour for more visible orbiting (25 ticks/hour)
      // At 0.11 radians/tick, full circle = 57 ticks, so 25 ticks ≈ 0.4 circles
      const orbitDuration = resolutionHour 
        ? Math.max(25, Math.min(150, hoursDiff * 25)) // 25 ticks per hour, cap at 25-150 ticks
        : 30 // Default if no resolution found
      
      // Debug logging for boundary interactions
      if (e.type === 'boundary_interaction') {
        console.log(`[Boundary Interaction] ${e.eventId}`, {
          currentHour: e.hour,
          resolutionHour,
          hoursDiff,
          orbitDuration,
          orbitCircles: (orbitDuration * 0.11 / (2 * Math.PI)).toFixed(1)
        })
      }

      particles.push({
        id: pid,
        type: e.type,
        severity: e.severity || 'info',
        status: e.status || (e.boundary_kind === 'escalated' ? 'blocked' : 'allowed'),
        text: (() => {
          const type = String(e.type || '').toLowerCase()
          const status = String(e.status || '').toLowerCase()
          const boundaryKind = String(e.boundary_kind || e.boundaryKind || '').toLowerCase()
          const boundaryReason = String(e.boundary_reason || '').toLowerCase()

          let prefix = 'Event'
          if (type === 'signal') prefix = 'Signal'
          else if (type === 'revision') prefix = 'Revision'
          else if (type === 'retrieval') prefix = 'Query'
          else if (type === 'boundary_interaction') {
            // Use canonical boundary_kind for prefix
            if (boundaryKind === 'escalated') prefix = 'Exception Request'
            else if (boundaryKind === 'deferred') prefix = 'Deferred Request'
            else if (boundaryKind === 'overridden') prefix = 'Override Request'
            else prefix = 'Boundary'
          }
          else if (type === 'decision') prefix = (status === 'blocked' || status === 'denied') ? 'Decision (blocked)' : 'Decision'

          let core = ''
          if (type === 'signal') core = String(e.label || e.signalKey || 'telemetry')
          else if (type === 'revision') core = String(e.label || e.revision_id || 'bounds updated')
          else if (type === 'retrieval') {
            // Show number of retrieved embeddings and top relevance score
            const count = (e.retrievedEmbeddings || []).length
            const topScore = (e.relevanceScores || [])[0]
            core = count > 0 
              ? `${count} result${count !== 1 ? 's' : ''}${topScore ? ` (${(topScore * 100).toFixed(0)}%)` : ''}`
              : 'decision memory'
          }
          else if (type === 'boundary_interaction') {
            // Use boundary_reason for richer context if available
            core = boundaryReason ? boundaryReason.replace(/_/g, ' ') : String(e.label || boundaryKind || 'interaction')
          }
          else if (type === 'decision') core = String(e.label || (status ? status : 'executed'))
          else core = String(e.label || e.type || 'event')

          return `${prefix}: ${core}`
        })(),
        sourceX,
        sourceY,
        targetX,
        targetY,
        targetNodeId: (e.type === 'revision' && stewardNode)
          ? stewardNode.id
          : (e.type === 'boundary_interaction' && stewardNode)
          ? stewardNode.id
          : envelopeNode.id,
        x: sourceX,
        y: sourceY,
        t: 0,
        curve: (() => {
          const type = String(e.type || '').toLowerCase()
          const status = String(e.status || '').toLowerCase()
          // Coordinate system: y increases downward. sign=-1 yields an "upper" arc.
          if (type === 'revision') return makeFlowCurve(sourceX, sourceY, targetX, targetY, +1)
          if (type === 'boundary_interaction') return makeFlowCurve(sourceX, sourceY, targetX, targetY, -1)
          if (type === 'decision') {
            if (status === 'blocked' || status === 'denied') return makeFlowCurve(sourceX, sourceY, targetX, targetY, -1)
            return makeFlowCurve(sourceX, sourceY, targetX, targetY, -1)
          }
          if (type === 'signal') return makeFlowCurve(sourceX, sourceY, targetX, targetY, -1)
          return makeFlowCurve(sourceX, sourceY, targetX, targetY, -1)
        })(),
        life: e.type === 'boundary_interaction' ? 1.5 : 1.0, // Extra life for orbiting particles
        labelOpacity: 0.85,

        // Canon cue: boundary interactions orbit steward while processing; allowed decisions orbit envelope.
        orbit: false,
        orbitAfterTravel: false, // Boundary interactions orbit at steward, not at envelope
        orbitAngle: Math.random() * Math.PI * 2,
        orbitTicksLeft: e.type === 'boundary_interaction' ? orbitDuration : (e.type === 'decision' && e.status !== 'blocked' && e.status !== 'denied' ? 18 : 0),
        
        // For boundary_interaction: pulse at envelope then continue to steward
        hasWaypoint: e.type === 'boundary_interaction',
        waypointPulseTicks: 0,
        waypointPulseMax: e.type === 'boundary_interaction' ? 8 : 12, // Shorter pulse for boundary checks (8 ticks)
        finalTargetX: (e.type === 'boundary_interaction' && stewardNode) ? stewardNode.x : (e.type === 'decision' && (e.status === 'blocked' || e.status === 'denied') && stewardNode) ? stewardNode.x : null,
        finalTargetY: (e.type === 'boundary_interaction' && stewardNode) ? stewardNode.y : (e.type === 'decision' && (e.status === 'blocked' || e.status === 'denied') && stewardNode) ? stewardNode.y : null,
        shouldOrbitAfterWaypoint: e.type === 'boundary_interaction', // Flag to orbit at steward after waypoint
      })
    })

    // Remove old particles
    particles = particles.filter(p => p.life > 0)

    // Lock nodes to their lane coordinates (deterministic / on-rails)
    for (const n of nodes) {
      n.fx = n.targetX
      n.fy = n.targetY
      n.x = n.targetX
      n.y = n.targetY
    }

    // Restart simulation with new nodes/links
    simulation.nodes(nodes)
    simulation.force('x', d3.forceX(d => d.targetX).strength(1))
    simulation.force('y', d3.forceY(d => d.targetY).strength(1))
    simulation.alpha(0.2).restart()

    render()
  }

  // 4. Render Function (D3 Enter/Update/Exit)
  function render() {
    // Get agent density for this render
    const currentAgentDensity = getAgentDensity(detailLevel)
    
    // --- Fleet boundaries (behind links/nodes) ---
    const fleetSel = fleetLayer.selectAll('g.fleet')
      .data(fleetBounds, d => d.id)

    const fleetEnter = fleetSel.enter()
      .append('g')
      .attr('class', 'fleet')

    fleetEnter.append('rect')
      .attr('class', 'fleet-boundary')
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6 6')
      .attr('opacity', 0.65)

    // Fleet count badge (shown in compact/minimal modes)
    fleetEnter.append('g')
      .attr('class', 'fleet-count-badge')
      .style('pointer-events', 'none')

    fleetEnter.select('.fleet-count-badge')
      .append('rect')
      .attr('class', 'fleet-count-bg')
      .attr('rx', 8)
      .attr('ry', 8)

    fleetEnter.select('.fleet-count-badge')
      .append('text')
      .attr('class', 'fleet-count-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '10px')
      .style('font-weight', '700')

    // Update fleet boundary
    fleetSel.merge(fleetEnter).select('rect.fleet-boundary')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', d => d.w)
      .attr('height', d => d.h)
      .attr('stroke', d => d.color)
      .attr('opacity', 0.65)

    // Update fleet count badge (visible in compact/minimal modes)
    const fleetMerged = fleetSel.merge(fleetEnter)
    
    fleetMerged.select('.fleet-count-badge')
      .attr('transform', d => `translate(${d.x + d.w / 2}, ${d.y + d.h / 2})`)
      .attr('opacity', () => currentAgentDensity.density === 'compact' || currentAgentDensity.density === 'minimal' ? 1 : 0)

    fleetMerged.select('.fleet-count-bg')
      .attr('x', -20)
      .attr('y', -12)
      .attr('width', 40)
      .attr('height', 24)
      .attr('fill', d => d.color)
      .attr('opacity', 0.15)

    fleetMerged.select('.fleet-count-text')
      .attr('fill', d => d.color)
      .text(d => {
        // Count agents in this fleet
        const count = nodes.filter(n => n.type === 'agent' && n.fleetRole === d.role).length
        const active = nodes.filter(n => n.type === 'agent' && n.fleetRole === d.role && n.isRecentlyActive).length
        return `${active}/${count}`
      })

    fleetSel.exit().remove()

    // --- Links ---
    const linkSelection = linkLayer.selectAll('line')
      .data(links, d => {
        const s = d.source.id || d.source
        const t = d.target.id || d.target
        return `${s}-${t}`
      })

    linkSelection.enter()
      .append('line')
      .attr('stroke', 'var(--vscode-editor-lineHighlightBorder)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 4')
      .attr('opacity', 0.55)

    linkSelection
      .attr('stroke', d => {
        if (d.type === 'ownership' && d.hasEscalation) return 'var(--status-warning)'
        return 'var(--vscode-editor-lineHighlightBorder)'
      })
      .attr('stroke-width', d => {
        if (d.type !== 'ownership') return 1.5
        const c = Number(d.interactionCount || 0)
        return 1.5 + Math.min(3, c * 0.6)
      })
      .attr('opacity', d => {
        if (d.type !== 'ownership') return 0.35
        const c = Number(d.interactionCount || 0)
        return c > 0 ? 0.8 : 0.45
      })

    linkSelection.exit().remove()

    // --- Open Exception Links (rendered on top) ---
    const exceptionSel = exceptionLinkLayer.selectAll('line')
      .data(exceptionLinks, d => d.id)

    exceptionSel.enter()
      .append('line')
      .attr('stroke', 'red')
      .attr('stroke-width', 15)
      .attr('opacity', 0.0)
      .transition().duration(200)
      .attr('opacity', 0.85)

    exceptionSel
      .attr('stroke', 'red')
      .attr('stroke-width', 15)
      .attr('opacity', 0.85)

    exceptionSel.exit().transition().duration(200).attr('opacity', 0).remove()

    // --- Nodes ---
    const nodeSelection = nodeLayer.selectAll('g.node')
      .data(nodes, d => d.id)

    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node')

    // Envelope shape (density-aware rendering)
    // At detailed/normal: full envelope shape with body, flap, fold
    // At compact: simplified outline only
    // At icon: status circle only
    const envShape = nodeEnter.filter(d => d.type === 'envelope')
      .append('g')
      .attr('class', d => `envelope-shape envelope-density-${d.envDims?.density || 'normal'}`)
      .attr('data-testid', d => `envelope-${d.id}`)
      .attr('tabindex', 0)

    // Apply handlers to ALL envelope shapes (both new and existing)
    // These handlers are on the envelope-shape child, not the draggable parent node
    const allEnvShapes = nodeSelection.merge(nodeEnter).filter(d => d.type === 'envelope').select('g.envelope-shape')
    
    allEnvShapes
      .style('cursor', 'pointer')
      .style('pointer-events', 'all')
      .on('pointerenter', (event, d) => {
        showEnvelopeTooltip(d, event, event.currentTarget, { scenario: getScenario(), hour: getTimeHour() })
      })
      .on('pointermove', (event, d) => {
        showEnvelopeTooltip(d, event, event.currentTarget, { scenario: getScenario(), hour: getTimeHour() })
      })
      .on('pointerleave', () => {
        hideEnvelopeTooltip()
      })
      .on('focus', (event, d) => {
        showEnvelopeTooltip(d, null, event.currentTarget, { scenario: getScenario(), hour: getTimeHour() })
      })
      .on('blur', () => {
        hideEnvelopeTooltip()
      })
      .on('click', function(event, d) {
        event.stopPropagation()
        // Touch / coarse pointers: use click-to-peek tooltip, but still open the modal.
        if (!canHoverTooltip()) showEnvelopeTooltip(d, event, event.currentTarget, { scenario: getScenario(), hour: getTimeHour(), autoHideMs: 1500 })
        showEnvelopeAuthority(d, getScenario(), getTimeHour())
      })
    
    // Don't set pointer-events: none on children - let them receive events normally

    // NOW add drag to parent nodes AFTER envelope handlers are set
    nodeSelection.merge(nodeEnter).call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))

    // Icon mode: render a simple status circle
    envShape.filter(d => d.envDims?.isIcon)
      .append('circle')
      .attr('class', 'envelope-icon-circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', d => d.envDims?.radius || 18)
      .attr('fill', 'var(--vscode-editor-background)')
      .attr('stroke', 'var(--vscode-focusBorder)')
      .attr('stroke-width', 3)

    // Icon mode: inner status indicator
    envShape.filter(d => d.envDims?.isIcon)
      .append('circle')
      .attr('class', 'envelope-icon-status')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', d => (d.envDims?.radius || 18) * 0.5)
      .attr('fill', d => d.status === 'active' ? 'var(--status-success)' : 'var(--vscode-input-border)')
      .attr('opacity', 0.8)

    // Non-icon modes: render envelope shape elements
    const envBodyShape = envShape.filter(d => !d.envDims?.isIcon)

    // Outer glow ring for active envelopes (pulsing animation) - detailed only
    envBodyShape.filter(d => shouldRenderEnvelopeElement('glow', d.envDims?.density))
      .append('rect')
      .attr('class', 'envelope-glow')
      .attr('x', d => {
        const dims = d.envDims || { width: 84, height: 52 }
        return -(dims.width + 16) / 2
      })
      .attr('y', d => {
        const dims = d.envDims || { width: 84, height: 52 }
        return -(dims.height + 16) / 2
      })
      .attr('width', d => (d.envDims?.width || 84) + 16)
      .attr('height', d => (d.envDims?.height || 52) + 16)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', 'none')
      .attr('stroke', 'var(--vscode-focusBorder)')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .style('filter', 'blur(4px)')

    // Revision burst ring - detailed and normal only
    envBodyShape.filter(d => shouldRenderEnvelopeElement('revisionBurst', d.envDims?.density))
      .append('rect')
      .attr('class', 'envelope-revision-burst')
      .attr('x', d => -(d.envDims?.width || 84) / 2)
      .attr('y', d => -(d.envDims?.height || 52) / 2)
      .attr('width', d => d.envDims?.width || 84)
      .attr('height', d => d.envDims?.height || 52)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', 'none')
      .attr('stroke', 'var(--status-success)')
      .attr('stroke-width', 3)
      .attr('opacity', 0)

    // Envelope body - all non-icon modes
    envBodyShape.append('rect')
      .attr('class', 'envelope-body')
      .attr('data-testid', d => `envelope-body-${d.id}`)
      .attr('data-envelope-status', d => d.status || 'unknown')
      .attr('x', d => -(d.envDims?.width || 84) / 2)
      .attr('y', d => -(d.envDims?.height || 52) / 2)
      .attr('width', d => d.envDims?.width || 84)
      .attr('height', d => d.envDims?.height || 52)
      .attr('rx', d => d.envDims?.density === 'compact' ? 4 : 6)
      .attr('ry', d => d.envDims?.density === 'compact' ? 4 : 6)
      .attr('fill', 'var(--vscode-editor-background)')
      .attr('stroke', 'var(--vscode-focusBorder)')
      .attr('stroke-width', d => d.envDims?.density === 'compact' ? 2 : 3)

    // Envelope flap - triangular top (detailed and normal only)
    envBodyShape.filter(d => shouldRenderEnvelopeElement('flap', d.envDims?.density))
      .append('path')
      .attr('class', 'envelope-flap')
      .attr('fill', 'var(--vscode-editor-background)')
      .attr('stroke-width', 2.5)
      .attr('stroke-linejoin', 'round')
      .style('transform-origin', 'center top')
      .style('transition', 'transform 0.4s ease-out')
      .attr('d', d => {
        const w = d.envDims?.width || 84
        const h = d.envDims?.height || 52
        const left = -w / 2
        const top = -h / 2
        const right = w / 2
        // Triangle flap pointing down into envelope (closed state)
        return `M ${left + 4} ${top + 4} L 0 ${top + h * 0.45} L ${right - 4} ${top + 4} Z`
      })

    // Inner fold line (detailed only - gives depth)
    envBodyShape.filter(d => shouldRenderEnvelopeElement('fold', d.envDims?.density))
      .append('path')
      .attr('class', 'envelope-fold')
      .attr('fill', 'none')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4)
      .attr('d', d => {
        const w = d.envDims?.width || 84
        const h = d.envDims?.height || 52
        const left = -w / 2
        const bottom = h / 2
        const right = w / 2
        // V shape at bottom suggesting paper inside
        return `M ${left + 8} ${bottom - 8} L 0 ${bottom - h * 0.25} L ${right - 8} ${bottom - 8}`
      })

    // Envelope status label (OPEN vs CLOSED) - detailed and normal only
    nodeEnter.filter(d => d.type === 'envelope' && shouldRenderEnvelopeElement('status', d.envDims?.density))
      .append('text')
      .attr('class', 'envelope-status')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--vscode-editor-background)')
      .style('stroke-width', '4px')
      .style('font-size', d => d.envDims?.density === 'detailed' ? '11px' : '10px')
      .style('font-weight', '800')
      .attr('fill', 'var(--vscode-statusBar-foreground)')

    // Version badge (semver format) - detailed, normal, compact
    const versionBadge = nodeEnter.filter(d => d.type === 'envelope' && shouldRenderEnvelopeElement('version', d.envDims?.density))
      .append('g')
      .attr('class', 'envelope-version-badge')
      .style('pointer-events', 'none')

    versionBadge.append('rect')
      .attr('class', 'version-badge-bg')
      .attr('rx', 3)
      .attr('ry', 3)

    versionBadge.append('text')
      .attr('class', 'version-badge-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '10px')
      .style('font-weight', '700')
      .style('font-family', 'ui-monospace, monospace')

    // Merge selection for updates
    const nodeUpdate = nodeSelection.merge(nodeEnter)

    // Steward Circle
    nodeEnter.filter(d => d.type === 'steward')
      .append('circle')
      .attr('class', 'steward-circle')
      .attr('r', d => d.r)
      .attr('fill', 'var(--vscode-editor-background)')
      .attr('stroke', d => d.color || 'var(--status-warning)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '2 2')
      .style('cursor', 'pointer')
      .style('pointer-events', 'all')
      .style('transform-origin', 'center')
      .on('pointerenter', (event, d) => {
        showStewardTooltip(d, event, event.currentTarget, { scenario: getScenario(), hour: getTimeHour() })
      })
      .on('pointermove', (event, d) => {
        showStewardTooltip(d, event, event.currentTarget, { scenario: getScenario(), hour: getTimeHour() })
      })
      .on('pointerleave', () => {
        hideStewardTooltip()
      })
      .on('focus', (event, d) => {
        showStewardTooltip(d, null, event.currentTarget, { scenario: getScenario(), hour: getTimeHour() })
      })
      .on('blur', () => {
        hideStewardTooltip()
      })

    // Steward persona glyph (head + shoulders)
    const stewardIcon = nodeEnter.filter(d => d.type === 'steward')
      .append('g')
      .attr('class', 'steward-icon')
      .style('pointer-events', 'none')
      .attr('opacity', 0.9)

    stewardIcon.append('circle')
      .attr('class', 'steward-icon-head')
      .attr('cx', 0)
      .attr('cy', -8)
      .attr('r', 8)
      .attr('fill', 'none')
      .attr('stroke-width', 2.5)

    stewardIcon.append('path')
      .attr('class', 'steward-icon-shoulders')
      .attr('fill', 'none')
      .attr('stroke-width', 2.5)
      .attr('d', 'M -18 18 Q 0 3 18 18')

    // Update steward circle rotation based on processing state
    nodeUpdate.filter(d => d.type === 'steward').select('circle.steward-circle')
      .each(function(d) {
        const circle = d3.select(this)
        if (d.isProcessing) {
          // Start continuous rotation animation
          if (!circle.classed('steward-processing')) {
            circle.classed('steward-processing', true)
            
            function rotateCircle() {
              const node = circle.datum()
              if (!node || !node.isProcessing) {
                circle.classed('steward-processing', false)
                circle.interrupt()
                return
              }
              
              circle
                .transition()
                .duration(2000)
                .ease(d3.easeLinear)
                .attrTween('stroke-dashoffset', function() {
                  const length = 2 * Math.PI * (node.r || 20)
                  return d3.interpolate(0, -length)
                })
                .on('end', rotateCircle)
            }
            
            rotateCircle()
          }
        } else {
          // Stop rotation
          if (circle.classed('steward-processing')) {
            circle.classed('steward-processing', false)
            circle.interrupt()
            circle.attr('stroke-dashoffset', 0)
          }
        }
      })

    // Agents (density-aware rendering)
    // Full/Standard: Bot glyph with name/role
    // Compact: Small bot icon, fleet count badge visible
    // Minimal: Just a colored dot
    const agentDensityConfig = getAgentDensity(detailLevel)
    const agentEnter = nodeEnter.filter(d => d.type === 'agent')

    // Activity halo (only on full/standard - shows working state with glow)
    agentEnter.filter(() => agentDensityConfig.showHalo)
      .append('circle')
      .attr('class', 'agent-activity-halo')
      .attr('cx', 0)
      .attr('cy', -1)
      .attr('r', 16 * agentDensityConfig.botScale)
      .attr('fill', 'none')
      .attr('stroke-width', 3)
      .style('filter', 'blur(3px)')
      .attr('opacity', 0)

    // Minimal mode: just a colored dot indicator
    agentEnter.filter(() => agentDensityConfig.density === 'minimal')
      .append('circle')
      .attr('class', 'agent-minimal-dot')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 6)
      .attr('fill', d => d.fleetColor || 'var(--vscode-sideBar-border)')
      .attr('stroke', 'var(--vscode-editor-background)')
      .attr('stroke-width', 1)
      .attr('opacity', d => d.isRecentlyActive ? 0.9 : 0.4)

    // Compact mode: small dot with count (count rendered at fleet level)
    agentEnter.filter(() => agentDensityConfig.density === 'compact')
      .append('circle')
      .attr('class', 'agent-compact-dot')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 8)
      .attr('fill', d => d.isRecentlyActive ? d.fleetColor || 'var(--vscode-textLink-foreground)' : 'var(--vscode-editor-background)')
      .attr('stroke', d => d.fleetColor || 'var(--vscode-sideBar-border)')
      .attr('stroke-width', 2)
      .attr('opacity', d => d.isRecentlyActive ? 1 : 0.5)

    // Bot glyph (head + antenna + eyes) - full and standard modes, scaled by grid
    const bot = agentEnter.filter(() => agentDensityConfig.density === 'full' || agentDensityConfig.density === 'standard')
      .append('g')
      .attr('class', 'agent-bot')
      .attr('data-testid', d => `agent-${d.id}`)
      .attr('data-agent-active', d => d.isRecentlyActive ? 'true' : 'false')
      .attr('tabindex', 0)
      .style('pointer-events', 'all')
      .style('cursor', 'pointer')
      .attr('opacity', 0.95)
      .attr('transform', d => `scale(${(d.gridScale || 1.0) * agentDensityConfig.botScale})`)
      .on('pointerenter', (event, d) => {
        showAgentTooltip(d, event, event.currentTarget)
      })
      .on('pointermove', (event, d) => {
        showAgentTooltip(d, event, event.currentTarget)
      })
      .on('pointerleave', () => {
        hideAgentTooltip()
      })
      .on('focus', (event, d) => {
        showAgentTooltip(d, null, event.currentTarget)
      })
      .on('blur', () => {
        hideAgentTooltip()
      })
      .on('click', (event, d) => {
        // Touch / coarse pointers: use click-to-peek with short auto-hide.
        if (canHoverTooltip()) return
        event.stopPropagation()
        showAgentTooltip(d, event, event.currentTarget, { autoHideMs: 3000 })
      })

    bot.append('rect')
      .attr('class', 'agent-bot-head')
      .attr('x', -10)
      .attr('y', -9)
      .attr('width', 20)
      .attr('height', 18)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('fill', 'var(--vscode-editor-background)')
      .attr('stroke-width', 2)

    bot.append('line')
      .attr('class', 'agent-bot-antenna')
      .attr('x1', 0)
      .attr('y1', -10)
      .attr('x2', 0)
      .attr('y2', -16)
      .attr('stroke-width', 2)

    bot.append('circle')
      .attr('class', 'agent-bot-eye')
      .attr('cx', -4)
      .attr('cy', -1)
      .attr('r', 1.7)

    bot.append('circle')
      .attr('class', 'agent-bot-eye')
      .attr('cx', 4)
      .attr('cy', -1)
      .attr('r', 1.7)

    // Agent name - shown based on per-agent showName property (with collision avoidance)
    agentEnter.append('text')
      .attr('class', 'agent-name')
      .attr('text-anchor', d => d.useLeftSide ? 'end' : 'start')
      .attr('x', d => {
        const scale = (d.gridScale || 1.0) * agentDensityConfig.botScale
        return d.useLeftSide ? -16 * scale : 16 * scale
      })
      .attr('y', d => -3 + (d.textYOffset || 0))
      .style('pointer-events', 'none')
      .style('font-size', d => {
        const baseSize = detailLevel === DETAIL_LEVELS.STANDARD ? 8 : 9
        return `${Math.max(7, baseSize * (d.gridScale || 1.0))}px`
      })
      .style('font-weight', '700')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--vscode-editor-background)')
      .style('stroke-width', '4px')
      .attr('fill', 'var(--vscode-editor-foreground)')
      .style('opacity', 0)  // Start at 0, will be set correctly in update phase
      .attr('opacity', 0)  // Start at 0, will be set correctly in update phase
      .text(d => {
        const shouldShowName = agentDensityConfig.showName && d.showName !== false
        return shouldShowName ? getAdaptiveAgentName(d.name, detailLevel) : ''
      })

    // Agent role - only shown in full mode (with collision avoidance)
    // Note: also respect per-agent showName gating so large fleets don't render label text.
    agentEnter.filter(d => agentDensityConfig.showRole && d.showName !== false)
      .append('text')
      .attr('class', 'agent-role')
      .attr('text-anchor', d => d.useLeftSide ? 'end' : 'start')
      .attr('x', d => d.useLeftSide ? -16 : 16)
      .attr('y', d => 10 + (d.textYOffset || 0))
      .style('pointer-events', 'none')
      .style('font-size', '10px')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--vscode-editor-background)')
      .style('stroke-width', '4px')
      .attr('fill', 'var(--vscode-editor-foreground)')
      .attr('opacity', 0.65)
      .text(d => {
        if (!d.role) return ''
        const maxLen = 26
        return d.role.substring(0, maxLen) + (d.role.length > maxLen ? '...' : '')
      })

    // Update agent text elements (visibility controlled by per-node showName property)
    const agentNameSelection = nodeUpdate.filter(d => d.type === 'agent').select('.agent-name')
    
    // Interrupt transitions on both the parent node AND the text element
    nodeUpdate.filter(d => d.type === 'agent' && d.showName === false).interrupt()
    
    agentNameSelection
      .interrupt()  // Cancel any ongoing transitions
      .attr('text-anchor', d => d.useLeftSide ? 'end' : 'start')
      .attr('x', d => {
        const scale = (d.gridScale || 1.0) * agentDensityConfig.botScale
        return d.useLeftSide ? -16 * scale : 16 * scale
      })
      .attr('y', d => -3 + (d.textYOffset || 0))
      .style('visibility', d => {
        const shouldShowName = agentDensityConfig.showName && d.showName !== false
        return shouldShowName ? 'visible' : 'hidden'
      })
      .style('opacity', d => {
        const shouldShowName = agentDensityConfig.showName && d.showName !== false
        if (!shouldShowName) return 0
        return d.isRecentlyActive ? 1 : 0.55
      })
      .attr('opacity', d => {
        const shouldShowName = agentDensityConfig.showName && d.showName !== false
        if (!shouldShowName) return 0
        return d.isRecentlyActive ? 1 : 0.55
      })
      .style('font-size', d => {
        const baseSize = detailLevel === DETAIL_LEVELS.STANDARD ? 10 : 11
        return `${Math.max(9, baseSize * (d.gridScale || 1.0))}px`
      })
      .text(d => {
        const shouldShowName = agentDensityConfig.showName && d.showName !== false
        return shouldShowName ? getAdaptiveAgentName(d.name, detailLevel) : ''
      })

    nodeUpdate.select('.agent-role')
      .attr('text-anchor', d => d.useLeftSide ? 'end' : 'start')
      .attr('x', d => d.useLeftSide ? -16 : 16)
      .attr('y', d => 10 + (d.textYOffset || 0))
      .style('visibility', d => {
        const shouldShowRole = agentDensityConfig.showRole && d.showName !== false
        return shouldShowRole ? 'visible' : 'hidden'
      })
      .attr('opacity', d => {
        const shouldShowRole = agentDensityConfig.showRole && d.showName !== false
        return shouldShowRole ? 0.65 : 0
      })
      .text(d => {
        const shouldShowRole = agentDensityConfig.showRole && d.showName !== false
        if (!shouldShowRole || !d.role) return ''
        const maxLen = 26
        return d.role.substring(0, maxLen) + (d.role.length > maxLen ? '...' : '')
      })

    // Update agent activity halo with pulsing glow for active agents
    nodeUpdate.select('circle.agent-activity-halo')
      .transition()
      .duration(800)
      .attr('stroke', d => d.isRecentlyActive ? d.fleetColor || 'var(--vscode-textLink-foreground)' : 'transparent')
      .attr('opacity', d => d.isRecentlyActive ? 0.7 : 0)
      .attr('r', d => d.isRecentlyActive ? 18 * agentDensityConfig.botScale : 16 * agentDensityConfig.botScale)
      .on('end', function(event, d) {
        if (!d || !d.isRecentlyActive) return

        const halo = d3.select(this)
        halo.interrupt()

        function repeatPulse() {
          const current = halo.datum()
          if (!current || !current.isRecentlyActive) return

          halo
            .transition()
            .duration(1200)
            .attr('opacity', 0.4)
            .attr('r', 16 * agentDensityConfig.botScale)
            .transition()
            .duration(800)
            .attr('opacity', 0.7)
            .attr('r', 18 * agentDensityConfig.botScale)
            .on('end', repeatPulse)
        }

        repeatPulse()
      })

    // Update compact and minimal agent indicators with glow
    nodeUpdate.select('circle.agent-compact-dot')
      .attr('fill', d => d.isRecentlyActive ? d.fleetColor || 'var(--vscode-textLink-foreground)' : 'var(--vscode-editor-background)')
      .attr('opacity', d => d.isRecentlyActive ? 1 : 0.5)
      .style('filter', d => d.isRecentlyActive ? `drop-shadow(0 0 4px ${d.fleetColor || 'var(--vscode-textLink-foreground)'})` : 'none')

    nodeUpdate.select('circle.agent-minimal-dot')
      .attr('fill', d => d.fleetColor || 'var(--vscode-sideBar-border)')
      .attr('opacity', d => d.isRecentlyActive ? 0.9 : 0.4)
      .style('filter', d => d.isRecentlyActive ? `drop-shadow(0 0 3px ${d.fleetColor || 'var(--vscode-sideBar-border)'})` : 'none')

    // Envelope group scale animation based on status
    nodeUpdate.filter(d => d.type === 'envelope')
      .select('g.envelope-shape')
      .transition()
      .duration(400)
      .ease(d3.easeBackOut.overshoot(1.2))
      .attr('transform', d => {
        const scale = d.status === 'active' ? 1.0 : (d.status === 'pending' ? 0.92 : 0.85)
        return `scale(${scale})`
      })

    // Envelope OPEN/CLOSED styling (+ gentle grow on recent revisions)
    nodeUpdate.select('rect.envelope-body')
      .transition()
      .duration(300)
      .attr('x', d => {
        const rr = d.r + (d.isRecentlyRevised ? 6 : 0)
        const w = Math.max(84, Math.round(rr * 3.2))
        return -w / 2
      })
      .attr('y', d => {
        const rr = d.r + (d.isRecentlyRevised ? 6 : 0)
        const h = Math.max(52, Math.round(rr * 2.05))
        return -h / 2
      })
      .attr('width', d => {
        const rr = d.r + (d.isRecentlyRevised ? 6 : 0)
        return Math.max(84, Math.round(rr * 3.2))
      })
      .attr('height', d => {
        const rr = d.r + (d.isRecentlyRevised ? 6 : 0)
        return Math.max(52, Math.round(rr * 2.05))
      })
      .attr('stroke', d => {
        const accent = d.ownerColor || 'var(--vscode-focusBorder)'
        if (d.status === 'ended') return 'var(--vscode-sideBar-border)'
        if (d.status === 'pending') return accent
        return accent
      })
      .attr('stroke-width', d => (d.isRecentlyRevised ? 4.5 : (d.status === 'active' ? 3.5 : 2.5)))
      .attr('stroke-dasharray', d => (d.status === 'ended' || d.status === 'pending') ? '6 4' : null)
      .attr('fill', 'var(--vscode-editor-background)')
      .attr('opacity', d => {
        if (d.status === 'ended') return 0.45
        if (d.status === 'pending') return 0.75
        return 1
      })

    // Update icon mode status indicator
    nodeUpdate.selectAll('g.envelope-shape').select('circle.envelope-icon-status')
      .attr('fill', d => {
        if (d.status === 'active') return d.ownerColor || 'var(--status-success)'
        if (d.status === 'ended') return 'var(--vscode-input-border)'
        return 'var(--status-warning)'
      })
      .attr('opacity', d => d.status === 'active' ? 0.9 : 0.6)

    // Update icon mode outer circle
    nodeUpdate.selectAll('g.envelope-shape').select('circle.envelope-icon-circle')
      .attr('stroke', d => d.ownerColor || 'var(--vscode-focusBorder)')
      .attr('stroke-width', d => d.status === 'active' ? 3 : 2)

    // Animate envelope glow for active envelopes (pulsing effect) - only if element exists
    nodeUpdate.selectAll('g.envelope-shape').select('rect.envelope-glow')
      .attr('x', d => {
        const w = (d.envDims?.width || 84) + 16
        return -w / 2
      })
      .attr('y', d => {
        const h = (d.envDims?.height || 52) + 16
        return -h / 2
      })
      .attr('width', d => (d.envDims?.width || 84) + 16)
      .attr('height', d => (d.envDims?.height || 52) + 16)
      .attr('stroke', d => d.ownerColor || 'var(--vscode-focusBorder)')
      .transition()
      .duration(800)
      .attr('opacity', d => d.status === 'active' ? 0.6 : 0)
      .transition()
      .duration(800)
      .attr('opacity', d => d.status === 'active' ? 0.2 : 0)
      .on('end', function repeat() {
        d3.select(this)
          .transition()
          .duration(800)
          .attr('opacity', function() { 
            const d = d3.select(this.parentNode).datum()
            return d && d.status === 'active' ? 0.6 : 0 
          })
          .transition()
          .duration(800)
          .attr('opacity', function() { 
            const d = d3.select(this.parentNode).datum()
            return d && d.status === 'active' ? 0.2 : 0 
          })
          .on('end', repeat)
      })

    // Animate revision burst (expanding ring effect when recently revised)
    nodeUpdate.selectAll('g.envelope-shape').select('rect.envelope-revision-burst')
      .attr('stroke', d => d.ownerColor || 'var(--status-success)')
      .each(function(d) {
        const burst = d3.select(this)
        if (d.isRecentlyRevised) {
          const baseW = d.envDims?.width || 84
          const baseH = d.envDims?.height || 52
          burst
            .attr('x', -baseW / 2)
            .attr('y', -baseH / 2)
            .attr('width', baseW)
            .attr('height', baseH)
            .attr('opacity', 0.9)
            .attr('stroke-width', 4)
            .transition()
            .duration(600)
            .ease(d3.easeQuadOut)
            .attr('x', -(baseW + 30) / 2)
            .attr('y', -(baseH + 30) / 2)
            .attr('width', baseW + 30)
            .attr('height', baseH + 30)
            .attr('opacity', 0)
            .attr('stroke-width', 1)
        } else {
          burst.attr('opacity', 0)
        }
      })

    nodeUpdate.select('.envelope-status')
      .attr('y', d => {
        const h = d.envDims?.height || 52
        return -(h / 2) + 14
      })
      .attr('opacity', d => (d.status === 'active' ? 0.85 : 0.65))
      .text(d => {
        if (d.status === 'active') return 'OPEN'
        if (d.status === 'ended') return 'CLOSED'
        return 'PENDING'
      })

    // Update version badge position and content
    nodeUpdate.select('.envelope-version-badge')
      .attr('transform', d => {
        const w = d.envDims?.width || 84
        const h = d.envDims?.height || 52
        // Position at bottom right of envelope (adjust for compact mode)
        const xOffset = d.envDims?.density === 'compact' ? w / 2 - 14 : w / 2 - 20
        return `translate(${xOffset}, ${h / 2 + 8})`
      })

    nodeUpdate.select('.version-badge-bg')
      .attr('x', d => d.envDims?.density === 'compact' ? -14 : -18)
      .attr('y', -7)
      .attr('width', d => d.envDims?.density === 'compact' ? 28 : 36)
      .attr('height', 14)
      .attr('fill', d => d.isVersionBumped ? 'var(--status-warning)' : 'var(--vscode-editor-background)')
      .attr('stroke', d => d.isVersionBumped ? 'none' : 'var(--vscode-sideBar-border)')
      .attr('stroke-width', 1)
      .attr('opacity', 0.95)

    nodeUpdate.select('.version-badge-text')
      .attr('fill', d => d.isVersionBumped ? 'var(--vscode-editor-background)' : 'var(--vscode-editor-foreground)')
      .style('font-size', d => d.envDims?.density === 'compact' ? '7px' : '8px')
      .text(d => {
        if (d.envDims?.density === 'compact') {
          return `v${d.semver}`  // Shorter in compact mode
        }
        return d.isVersionBumped ? `↑ v${d.semver}` : `v${d.semver}`
      })

    // Envelope linework (flap/fold) follows envelope status.
    // Flap opens (rotates back) when envelope is active
    nodeUpdate.selectAll('g.envelope-shape').select('path.envelope-flap')
      .attr('stroke', d => {
        const accent = d.ownerColor || 'var(--vscode-focusBorder)'
        if (d.status === 'ended') return 'var(--vscode-sideBar-border)'
        return accent
      })
      .attr('fill', d => {
        if (d.status === 'active') return 'none' // Open flap has no fill
        return 'var(--vscode-editor-background)'
      })
      .attr('opacity', d => (d.status === 'ended' ? 0.5 : 0.9))
      .attr('d', d => {
        const w = d.envDims?.width || 84
        const h = d.envDims?.height || 52
        const left = -w / 2
        const top = -h / 2
        const right = w / 2
        
        if (d.status === 'active') {
          // Open envelope: flap rotated back (pointing UP above envelope)
          const flapHeight = h * 0.4
          return `M ${left + 4} ${top + 4} L 0 ${top - flapHeight} L ${right - 4} ${top + 4}`
        } else {
          // Closed/pending: flap pointing down into envelope
          return `M ${left + 4} ${top + 4} L 0 ${top + h * 0.45} L ${right - 4} ${top + 4} Z`
        }
      })

    // Inner fold line
    nodeUpdate.selectAll('g.envelope-shape').select('path.envelope-fold')
      .attr('stroke', d => {
        const accent = d.ownerColor || 'var(--vscode-focusBorder)'
        if (d.status === 'ended') return 'var(--vscode-sideBar-border)'
        return accent
      })
      .attr('opacity', d => (d.status === 'ended' ? 0.3 : d.status === 'active' ? 0.6 : 0.4))
      .attr('d', d => {
        const w = d.envDims?.width || 84
        const h = d.envDims?.height || 52
        const left = -w / 2
        const bottom = h / 2
        const right = w / 2
        return `M ${left + 8} ${bottom - 8} L 0 ${bottom - h * 0.25} L ${right - 8} ${bottom - 8}`
      })

    // Steward icon stroke matches steward ring.
    nodeUpdate.selectAll('g.steward-icon').selectAll('circle, path')
      .attr('stroke', d => d.color || 'var(--status-warning)')

    // Bot glyph styling (active agents read brighter)
    nodeUpdate.selectAll('g.agent-bot').selectAll('rect.agent-bot-head, line.agent-bot-antenna')
      .attr('stroke', d => d.fleetColor || 'var(--vscode-sideBar-border)')
      .attr('opacity', d => d.isRecentlyActive ? 1 : 0.45)

    nodeUpdate.selectAll('g.agent-bot').selectAll('circle.agent-bot-eye')
      .attr('fill', d => d.fleetColor || 'var(--vscode-statusBar-foreground)')
      .attr('opacity', d => d.isRecentlyActive ? 1 : 0.35)

    // Activity halo styling
    nodeUpdate.selectAll('circle.agent-activity-halo')
      .attr('stroke', d => d.fleetColor || 'var(--vscode-textLink-foreground)')
      .attr('opacity', d => d.isRecentlyActive ? 0.55 : 0)

    nodeUpdate.selectAll('text.agent-role')
      .attr('opacity', d => d.isRecentlyActive ? 0.75 : 0.25)

    // Labels (Main) — only for envelopes + stewards (agents are rendered as pills)
    nodeEnter.filter(d => d.type !== 'agent').append('text')
      .attr('class', 'label-main')
      .style('pointer-events', 'none')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--vscode-editor-background)')
      .style('stroke-width', '4px')

    // Labels (Sub) — only for envelopes + stewards
    nodeEnter.filter(d => d.type !== 'agent').append('text')
      .attr('class', 'label-sub')
      .style('pointer-events', 'none')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--vscode-editor-background)')
      .style('stroke-width', '4px')

    // Update Labels - adaptive based on detail level
    nodeUpdate.select('.label-main')
      .attr('dy', d => d.type === 'envelope' ? 5 : 4)
      .attr('text-anchor', d => d.type === 'agent' ? 'end' : (d.type === 'steward' ? 'start' : 'middle'))
      .attr('x', d => d.type === 'agent' ? -d.r - 5 : (d.type === 'steward' ? d.r + 5 : 0))
      .attr('fill', 'var(--vscode-editor-foreground)')
      .attr('opacity', d => {
        if (detailLevel === DETAIL_LEVELS.MINIMAL) return 0
        if (d.status === 'pending') return 0.6
        if (d.status === 'ended') return 0.75
        return 1
      })
      .style('font-size', d => {
        if (d.type === 'envelope') {
          return detailLevel === DETAIL_LEVELS.COMPACT ? '10px' : '12px'
        }
        return detailLevel === DETAIL_LEVELS.COMPACT ? '8px' : '10px'
      })
      .style('font-weight', d => d.type === 'envelope' ? 'bold' : 'normal')
      .text(d => {
        if (d.type === 'envelope') {
          const adaptive = getAdaptiveEnvelopeLabel(d.label, d.name, detailLevel)
          return adaptive.label
        }
        if (d.type === 'steward') {
          const adaptive = getAdaptiveStewardLabel(d.name, '', detailLevel)
          return adaptive.name
        }
        if (d.type === 'agent') return getAdaptiveAgentName(d.name, detailLevel)
        return ''
      })

    nodeUpdate.select('.label-sub')
      .attr('dy', d => d.type === 'envelope' ? 20 : (d.type === 'steward' ? 15 : 15))
      .attr('text-anchor', d => d.type === 'agent' ? 'end' : (d.type === 'steward' ? 'start' : 'middle'))
      .attr('x', d => d.type === 'agent' ? -d.r - 5 : (d.type === 'steward' ? d.r + 5 : 0))
      .attr('fill', 'var(--vscode-editor-foreground)')
      .attr('opacity', d => {
        // Hide sub-labels on COMPACT and MINIMAL
        if (detailLevel === DETAIL_LEVELS.COMPACT || detailLevel === DETAIL_LEVELS.MINIMAL) return 0
        if (d.status === 'pending') return 0.5
        if (d.status === 'ended') return 0.6
        return 0.7
      })
      .style('font-size', '9px')
      .text(d => {
        // Skip sub-labels on COMPACT and MINIMAL
        if (detailLevel === DETAIL_LEVELS.COMPACT || detailLevel === DETAIL_LEVELS.MINIMAL) return ''
        if (d.type === 'agent') {
          if (!d.role) return ''
          const maxLen = detailLevel === DETAIL_LEVELS.STANDARD ? 16 : 20
          return d.role.substring(0, maxLen) + (d.role.length > maxLen ? '...' : '')
        }
        if (d.type === 'steward') return 'Steward'
        // Let envelopes carry their name clearly; other types remain compact.
        const maxLen = d.type === 'envelope' ? (detailLevel === DETAIL_LEVELS.STANDARD ? 18 : 24) : 18
        return d.name.substring(0, maxLen) + (d.name.length > maxLen ? '...' : '')
      })

    nodeSelection.exit().transition().duration(500).style('opacity', 0).remove()

    // --- Particles ---
    // We render particles in the tick function for smooth animation
  }

  // 5. Tick Function (Animation Loop)
  function ticked() {
    // Update Node Positions
    nodeLayer.selectAll('g.node')
      .attr('transform', d => `translate(${d.x},${d.y})`)

    // Subtle activity pulse for working agents.
    const now = Date.now()
    const pulse = 0.5 + 0.5 * Math.sin(now / 260)
    nodeLayer.selectAll('circle.agent-activity-halo')
      .attr('r', d => d?.isRecentlyActive ? (15 + pulse * 4) : 16)

    linkLayer.selectAll('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    exceptionLinkLayer.selectAll('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    // Update Particle Positions (follow curved lifecycle lines)
    particles.forEach(p => {
      // Keep particles tracking their intended endpoints as nodes move.
      const targetMatch = nodes.find(n => Math.abs(n.x - p.targetX) < 80 && Math.abs(n.y - p.targetY) < 80)
      if (targetMatch) {
        p.targetX = targetMatch.x
        p.targetY = targetMatch.y
      }

      p.labelOpacity = 0.85

      if (p.orbit && p.orbitTicksLeft > 0) {
        const center = nodes.find(n => n.id === p.targetNodeId) || null
        const r = center?.r ? Math.max(10, Math.min(22, center.r * 0.45)) : 16
        const cx = center?.x ?? p.targetX
        const cy = center?.y ?? p.targetY

        p.orbitAngle += 0.11
        p.x = cx + Math.cos(p.orbitAngle) * r
        p.y = cy + Math.sin(p.orbitAngle) * r
        p.orbitTicksLeft -= 1
        // Much slower decay during orbit - needs to survive 150 ticks max
        p.life -= 0.003
        return
      }

      // Move along the curve from source->target.
      const speed = 0.011
      p.t = Math.min(1, (p.t ?? 0) + speed)

      if (p.curve) {
        // Re-bake curve endpoints so the curve stays attached as nodes move.
        const sign = (p.type === 'revision') ? +1 : -1
        p.curve = makeFlowCurve(p.sourceX, p.sourceY, p.targetX, p.targetY, sign)
        const pt = bezierPoint(p.t, p.curve.p0, p.curve.p1, p.curve.p2, p.curve.p3)
        p.x = pt.x
        p.y = pt.y
      } else {
        // Fallback to linear if curve is missing.
        p.x = p.sourceX + (p.targetX - p.sourceX) * p.t
        p.y = p.sourceY + (p.targetY - p.sourceY) * p.t
      }

      if (p.t >= 1) {
        // Handle waypoint pulse for denied/blocked decisions and boundary_interactions at envelope
        if (p.hasWaypoint && p.waypointPulseTicks < p.waypointPulseMax) {
          // Pulse at envelope to show rejection or boundary check
          p.waypointPulseTicks += 1
          const pulsePhase = p.waypointPulseTicks / p.waypointPulseMax
          // Pulse effect: scale particle up/down
          p.pulseScale = 1.0 + Math.sin(pulsePhase * Math.PI * 3) * 0.5 // 3 pulses
          p.life -= 0.005
          
          // After pulse completes, redirect to steward
          if (p.waypointPulseTicks >= p.waypointPulseMax && p.finalTargetX && p.finalTargetY) {
            p.hasWaypoint = false
            p.sourceX = p.x
            p.sourceY = p.y
            p.targetX = p.finalTargetX
            p.targetY = p.finalTargetY
            p.t = 0
            p.curve = makeFlowCurve(p.sourceX, p.sourceY, p.targetX, p.targetY, -1)
            p.pulseScale = 1.0
            
            // If this is a boundary_interaction, prepare to orbit at steward
            if (p.shouldOrbitAfterWaypoint && p.orbitTicksLeft > 0) {
              p.orbitAfterTravel = true
            }
          }
          return
        }
        
        if (p.orbitAfterTravel && p.orbitTicksLeft > 0) {
          // Boundary interactions orbit at steward after arrival
          p.orbit = true
          p.life -= 0.002
        } else if (p.type === 'decision' && p.status !== 'blocked' && p.status !== 'denied') {
          // Allowed decisions orbit at envelope
          p.orbit = true
          p.orbitTicksLeft = 18
          p.life -= 0.01
        } else {
          p.life -= 0.025
        }
      }
    })

    // Render Particles
    const particleSelection = particleLayer.selectAll('g.particle')
      .data(particles, d => d.id)

    const pEnter = particleSelection.enter()
      .append('g')
      .attr('class', 'particle')
      .attr('data-testid', d => `particle-${d.type}-${d.id || 'unknown'}`)
      .attr('data-particle-type', d => d.type)
      .attr('data-particle-status', d => d.status || 'none')
      .attr('opacity', 0)

    pEnter.append('circle')
      .attr('r', 4)

    pEnter.append('text')
      .attr('class', 'particle-label')
      .attr('text-anchor', 'start')
      .attr('x', 8)
      .attr('y', 3)
      .style('pointer-events', 'none')
      .style('font-size', '11px')
      .style('font-weight', '800')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--vscode-editor-background)')
      .style('stroke-width', '4px')
      .attr('fill', 'var(--vscode-editor-foreground)')

    pEnter.transition().duration(200).attr('opacity', 1)

    particleSelection
      .attr('transform', d => {
        const scale = d.pulseScale || 1.0
        return `translate(${d.x},${d.y}) scale(${scale})`
      })
      .attr('opacity', d => d.life)

    particleSelection.select('circle')
      .attr('fill', d => {
        // Use shared event color palette for consistency across views
        return getEventColor(d.type, d.severity, d.status)
      })

    particleSelection.select('text.particle-label')
      .each(function(d) {
        const el = d3.select(this)
        const text = d?.text ? String(d.text) : ''
        const maxCharsPerLine = 22

        function wrapLines(input) {
          const words = String(input || '').split(/\s+/).filter(Boolean)
          const lines = []
          let current = ''
          for (const word of words) {
            // If a single word is too long, hard-split it.
            if (word.length > maxCharsPerLine) {
              if (current) {
                lines.push(current)
                current = ''
              }
              for (let i = 0; i < word.length; i += maxCharsPerLine) {
                lines.push(word.slice(i, i + maxCharsPerLine))
              }
              continue
            }

            const next = current ? `${current} ${word}` : word
            if (next.length > maxCharsPerLine) {
              if (current) lines.push(current)
              current = word
            } else {
              current = next
            }
          }
          if (current) lines.push(current)
          return lines
        }

        const lines = text ? wrapLines(text) : []

        // Clear and rebuild tspans so we can wrap without truncation.
        el.text(null)
        if (!lines.length) return

        lines.forEach((line, i) => {
          el.append('tspan')
            .attr('x', 8)
            .attr('dy', i === 0 ? 0 : 12)
            .text(line)
        })
      })
      .attr('opacity', d => Math.max(0, (d.labelOpacity || 0) * d.life))

    particleSelection.exit().remove()
  }

  // Drag interactions
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
  }

  function dragged(event, d) {
    d.fx = event.x
    d.fy = event.y
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0)
    // Snap back to rail position.
    d.fx = d.targetX
    d.fy = d.targetY
  }

  // Initial render
  update()

  // Subscribe to time changes
  const unsubscribe = onTimeChange(() => {
    update()
  })

  // Define subscription variables at top level so cleanup always works
  let scenarioUnsubscribe = () => {}
  let embeddingUnsubscribe = () => {}
  let embeddingTooltip = null  // Will be set in FULL/STANDARD modes

  // ============================================================================
  // EMBEDDING VECTOR SPACE (3D Memory Store)
  // Only rendered on FULL and STANDARD detail levels
  // ============================================================================
  
  // Skip embedding section on COMPACT and MINIMAL
  if (detailLevel === DETAIL_LEVELS.COMPACT || detailLevel === DETAIL_LEVELS.MINIMAL) {
    // Add a simple memory count badge instead
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
      .text('💾 Memories')
  }
  
  // Full embedding store only on FULL and STANDARD
  if (detailLevel === DETAIL_LEVELS.FULL || detailLevel === DETAIL_LEVELS.STANDARD) {
    const embeddingStoreHeight = embeddingHeight
    const embeddingStoreLayer = svg.append('g')
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

    // Helper: interpolate X position at a given depth (0=back, 1=front)
    function getXAtDepth(normalizedX, depth) {
      // normalizedX: 0=left edge, 1=right edge
      // depth: 0=back, 1=front
      const leftAtDepth = backLeft + depth * (frontLeft - backLeft)
      const rightAtDepth = backRight + depth * (frontRight - backRight)
      return leftAtDepth + normalizedX * (rightAtDepth - leftAtDepth)
    }

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

  // Store bounds for chip positioning
  const floorTop = backY
  const floorBottom = frontY

  // Header text
  const headerGroup = embeddingStoreLayer.append('g')
    .attr('transform', 'translate(16, 20)')

  headerGroup.append('text')
    .attr('x', 20)
    .attr('y', 0)
    .attr('fill', 'rgba(255, 255, 255, 0.9)')
    .attr('font-size', '13px')
    .attr('font-weight', '600')
    .text('💾 Memories — Embedding Vector Space')

  const embeddingBadge = headerGroup.append('g')
    .attr('transform', 'translate(260, -8)')

  embeddingBadge.append('rect')
    .attr('width', 70)
    .attr('height', 18)
    .attr('rx', 4)
    .attr('fill', 'rgba(75, 150, 255, 0.15)')
    .attr('stroke', 'rgba(75, 150, 255, 0.4)')
    .attr('stroke-width', 1)

  const embeddingBadgeText = embeddingBadge.append('text')
    .attr('x', 35)
    .attr('y', 13)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgb(75, 150, 255)')
    .attr('font-size', '11px')
    .attr('font-weight', '500')
    .text('0 vectors')

  // Embedding icons layer
  const embeddingIconsLayer = embeddingStoreLayer.append('g')
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

  // Define 3D box bounds for embedding positioning (uses perspective variables from above)
  const box3DBounds = {
    backY,
    frontY,
    backLeft,
    backRight,
    frontLeft,
    frontRight,
    getXAtDepth  // Include the perspective helper function
  }

  let embeddingElements = []
  let embeddingCount = 0

  function createFloatingEmbedding(event) {
    // Find source node position
    const sourceNode = nodes.find(n => n.id === event.primarySteward || n.id === event.actorRole)
    const sourceX = sourceNode ? sourceNode.x : width / 2
    const sourceY = sourceNode ? sourceNode.y : mapHeight / 2

    // Steward color mapping - comprehensive across all scenarios
    const stewardColors = {
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
    
    const embeddingColor = stewardColors[event.actorRole] || '#4B96FF'

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
      console.log(`Using semanticVector [${event.semanticVector[0]}, ${event.semanticVector[1]}] → normalizedX=${normalizedX.toFixed(2)}, depthT=${depthT.toFixed(2)} for ${event.embeddingId}`)
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
      
      const typeDepthBias = {
        'decision': -0.15,
        'revision': -0.05,
        'boundary_interaction': 0,
        'signal': 0.1,
        'session_artifact': 0.15
      }
      
      const baseDepthT = normalizedTime * 0.7 + 0.15
      const typeBias = typeDepthBias[event.embeddingType] || 0
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
    
    // Store tooltip data for hover
    const embeddingTypeLabels = {
      'decision': 'Decision Pattern',
      'signal': 'Signal Pattern',
      'boundary_interaction': 'Boundary Interaction',
      'revision': 'Policy Revision',
      'session_artifact': 'Stewardship Session'
    }
    
    const embeddingTypeLabel = embeddingTypeLabels[event.embeddingType] || event.embeddingType || 'Unknown'
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
    chipGroup.transition()
      .duration(2500)
      .ease(d3.easeCubicOut)
      .attr('transform', `translate(${targetX}, ${targetY}) scale(${perspectiveScale}) rotate(${rotateAngle})`)
      .attr('opacity', depthOpacity)

    embeddingElements.push({ element: chipGroup, event, timestamp: Date.now() })
    embeddingCount++
    embeddingBadgeText.text(`${embeddingCount} vector${embeddingCount !== 1 ? 's' : ''}`)
  }

  function renderEmbeddings() {
    const scenario = getScenario()
    const currentHour = getTimeHour()

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
    }

    // Only add new embeddings
    const existingIds = new Set(embeddingElements.map(e => e.event.eventId))
    const newEvents = embeddingEvents.filter(e => !existingIds.has(e.eventId))

    console.log(`renderEmbeddings at hour ${currentHour}: ${embeddingEvents.length} total, ${existingIds.size} existing, ${newEvents.length} new`)
    
    if (newEvents.length > 0) {
      console.log(`Adding ${newEvents.length} new embedding(s):`)
      newEvents.forEach(e => {
        console.log(`  - eventId: ${e.eventId}, embeddingId: ${e.embeddingId}, type: ${e.embeddingType}, steward: ${e.actorRole}`)
      })
    }

    newEvents.forEach((event, index) => {
      setTimeout(() => {
        createFloatingEmbedding(event)
      }, index * 150)
    })
  }

  renderEmbeddings()

  // Subscribe to scenario changes
  scenarioUnsubscribe = onScenarioChange(() => {
    embeddingIconsLayer.selectAll('*').remove()
    embeddingElements = []
    embeddingCount = 0
    embeddingBadgeText.text('0 vectors')
    tooltip.style('display', 'none')
    renderEmbeddings()
  })

  // Subscribe to time changes for embeddings (only when embedding is visible)
  if (detailLevel === DETAIL_LEVELS.FULL || detailLevel === DETAIL_LEVELS.STANDARD) {
    embeddingUnsubscribe = onTimeChange(() => {
      renderEmbeddings()
    })
  }
  } // End of embedding detail level conditional

  // ============================================================================
  // END EMBEDDING VECTOR SPACE
  // ============================================================================

  return {
    cleanup: () => {
      unsubscribe()
      scenarioUnsubscribe()
      embeddingUnsubscribe()
      // Only remove tooltip if it was created (FULL/STANDARD modes)
      if (embeddingTooltip) {
        embeddingTooltip.remove()
      }
      simulation.stop()
    },
    setFilter: (filter) => {
      currentFilter = filter
      update()
    }
  }
}
