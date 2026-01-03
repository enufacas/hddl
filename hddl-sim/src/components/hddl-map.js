import * as d3 from 'd3'
import { getScenario, getEnvelopeAtTime, getEventsNearTime, getTimeHour, onTimeChange, onScenarioChange, getEnvelopeStatus, setStewardFilter, getIsScrubbing, isWithinScrubCatchup } from '../sim/sim-state'
import { getStewardColor, STEWARD_PALETTE, toSemver, getEventColor } from '../sim/steward-colors'
import { navigateTo } from '../router'
import { createEnvelopeDetailModal } from './envelope-detail'
import {
  DETAIL_LEVELS,
  getDetailLevel,
  getAdaptiveAgentName,
  getAdaptiveEnvelopeLabel,
  getAdaptiveStewardLabel,
  shouldShowAgentRole,
  getAdaptiveHeader,
  getEnvelopeDimensions,
  shouldRenderEnvelopeElement,
  getAgentDensity,
  shouldRenderIndividualAgents
} from './map/detail-levels'
import { bezierPoint, makeFlowCurve } from './map/bezier-math'
import {
  canHoverTooltip,
  shouldShowHoverTooltip,
  showAgentTooltip,
  hideAgentTooltip,
  showEnvelopeTooltip,
  hideEnvelopeTooltip,
  showStewardTooltip,
  hideStewardTooltip,
  getStewardEnvelopeInteractionCount
} from './map/tooltip-manager'
import { createEmbeddingRenderer } from './map/embedding-renderer'
import { adjustAgentTextPositions } from './map/agent-layout'
import { formatParticleLabel, wrapTextLinesByChars } from './map/particle-labels'
import {
  getParticleCurveSign,
  computeOrbitDurationTicks,
  getParticleLife,
  computeOrbitTicksLeft,
  getWaypointPulseMax
} from './map/particle-logic'
import { getResolutionTime } from './map/event-resolution'
import { stepParticle } from './map/particle-motion'
import { truncateWithEllipsis, getNodeSubLabelText } from './map/text-utils'
import { nextParticles } from './map/flow-particles'
import { computeOpenExceptionLinks } from './map/exception-links'
import { applyStewardProcessingState } from './map/steward-processing'
import { renderExceptionLinks, renderFleetBoundaries, renderLinks } from './map/render-fleet-links'
import { renderParticlesTick } from './map/particle-renderer'
import { renderEnvelopeEnter, updateEnvelopeRendering } from './map/envelope-renderer'

export function createHDDLMap(container, options = {}) {
  // 1. Setup SVG and Dimensions
  const width = options.width || container.clientWidth || 800
  const mapHeight = 480
  
  // Determine detail level based on container width
  let detailLevel = getDetailLevel(width)

  // GitHub Pages deploys under a subpath; use BASE_URL so assets resolve
  // correctly even on nested routes.
  const darkBgUrl = `${import.meta.env.BASE_URL}dark-bg.png`
  const planetUrl = `${import.meta.env.BASE_URL}planet.png`
  
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
    .attr('height', height + 80)
    .attr('viewBox', [0, -80, width, height + 80])
    .style('background', `linear-gradient(to bottom, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.5) 20%, rgba(0, 0, 0, 0.65) 80%, rgba(0, 0, 0, 0.85) 100%), url(${darkBgUrl}) center 55%/cover no-repeat`)
    .style('border', '1px solid var(--vscode-widget-border)')
    .style('border-radius', '6px')
    .style('overflow', 'visible')
    .style('margin-top', '-80px')

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

  // Planetary Limb (Telemetry / World) - Behind everything, extending into header
  const planetaryLayer = svg.insert('g', ':first-child').attr('class', 'planetary-limb-layer')
  
  // Use Earth limb image (flipped upside down) - extend upward to cover header area
  const earthImageWidth = width * 0.9
  const earthImageHeight = 180
  const earthImageX = width * 0.05
  const earthImageY = -80
  
  // Add clipping path to create curved appearance
  const planetDefs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs')
  const clipPathId = 'earth-limb-clip'
  planetDefs.append('clipPath')
    .attr('id', clipPathId)
    .append('ellipse')
    .attr('cx', width / 2)
    .attr('cy', 40)
    .attr('rx', width * 0.48)
    .attr('ry', 80)
  
  // Add the Earth image, flipped vertically
  planetaryLayer.append('image')
    .attr('href', planetUrl)
    .attr('x', earthImageX)
    .attr('y', earthImageY)
    .attr('width', earthImageWidth)
    .attr('height', earthImageHeight)
    .attr('clip-path', `url(#${clipPathId})`)
    .attr('transform', `scale(1, -1) translate(0, ${-(earthImageY * 2 + earthImageHeight)})`)
    .attr('opacity', 0.7)
    .attr('preserveAspectRatio', 'xMidYMid slice')

  // Column Headers (add a background band so text never becomes black-on-black)
  headerLayer
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width)
    .attr('height', 26)
    .attr('fill', 'var(--vscode-editor-background)')
    .attr('opacity', 0)

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
      .attr('y', -25)
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
        // Create new object to force D3 data binding to update
        return {
          ...existing,
          name: envelope.name,
          ownerRole: envelope.ownerRole,
          ownerColor: undefined,  // Will be set below after stewardColorByRole is built
          isActive: isActive,
          status: status,
          isRecentlyRevised: recentlyRevisedEnvelopeIds.has(envelope.envelopeId),
          version: currentVersion,
          semver: toSemver(currentVersion),
          isVersionBumped: isVersionBumped,
          targetX: targetX,
          targetY: targetY,
          envDims: envDims
        }
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
      console.log(`[HDDL-MAP] Steward color mapping: ${fleet.stewardRole} -> ${color}`)

      const existing = nodes.find(n => n.id === stewardId)
      if (existing) {
          // Create new object to force D3 data binding to update
          newNodes.push({
            ...existing,
            name: fleet.stewardRole,
            targetX: targetX,
            targetY: targetY,
            r: stewardR,
            color: color
          })
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
          // Create new object to force D3 data binding to update
          console.log(`[HDDL-MAP] Updating working agent: ${agent.agentId} (${agent.name}) fleet=${fleet.stewardRole} color=${fleetColor} (existing.fleetColor=${existing.fleetColor})`)
          newNodes.push({
            ...existing,
            targetX: targetX,
            targetY: targetY,
            w: agentW,
            h: agentH,
            name: agent.name,
            role: agent.role,
            isRecentlyActive: true,
            lastActiveHour: agent.lastActiveHour,
            fleetRole: fleet.stewardRole,
            fleetColor: fleetColor,
            r: agentR,
            gridScale: gridPos.iconScale,
            showName: gridPos.showName
          })
        } else if (!newNodes.find(n => n.id === agent.agentId)) {
          console.log(`[HDDL-MAP] Creating NEW working agent: ${agent.agentId} (${agent.name}) fleet=${fleet.stewardRole} color=${fleetColor}`)
          newNodes.push({
            id: agent.agentId,
            type: 'agent',
            name: agent.name,
            role: agent.role,
            isRecentlyActive: true,
            lastActiveHour: agent.lastActiveHour,
            fleetRole: fleet.stewardRole,
            fleetColor: fleetColor,
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
          // Create new object to force D3 data binding to update
          console.log(`[HDDL-MAP] Updating idle agent: ${agent.agentId} (${agent.name}) fleet=${fleet.stewardRole} color=${fleetColor} (existing.fleetColor=${existing.fleetColor})`)
          newNodes.push({
            ...existing,
            targetX: targetX,
            targetY: targetY,
            w: agentW,
            h: agentH,
            name: agent.name,
            role: agent.role,
            isRecentlyActive: false,
            lastActiveHour: agent.lastActiveHour,
            fleetRole: fleet.stewardRole,
            fleetColor: fleetColor,
            r: agentR,
            gridScale: gridPos.iconScale,
            showName: gridPos.showName
          })
        } else if (!newNodes.find(n => n.id === agent.agentId)) {
          console.log(`[HDDL-MAP] Creating NEW idle agent: ${agent.agentId} (${agent.name}) fleet=${fleet.stewardRole} color=${fleetColor}`)
          newNodes.push({
            id: agent.agentId,
            type: 'agent',
            name: agent.name,
            role: agent.role,
            isRecentlyActive: false,
            lastActiveHour: agent.lastActiveHour,
            fleetRole: fleet.stewardRole,
            fleetColor: fleetColor,
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
    exceptionLinks = computeOpenExceptionLinks({ allEvents, hour, nodes })
    applyStewardProcessingState(nodes, allEvents, hour)

    // --- Particles (Events) ---
    particles = nextParticles({
      particles,
      recentEvents,
      nodes,
      allEvents,
      hour,
      width,
      height,
      mapHeight
    })

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

    renderFleetBoundaries({ fleetLayer, fleetBounds, nodes, currentAgentDensity })
    renderLinks({ linkLayer, links })
    renderExceptionLinks({ exceptionLinkLayer, exceptionLinks })

    // --- Nodes ---
    const nodeSelection = nodeLayer.selectAll('g.node')
      .data(nodes, d => d.id)

    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node')

    renderEnvelopeEnter({
      d3,
      nodeSelection,
      nodeEnter,
      shouldRenderEnvelopeElement,
      showEnvelopeTooltip,
      hideEnvelopeTooltip,
      canHoverTooltip,
      getScenario,
      getTimeHour,
      createEnvelopeDetailModal,
    })

    // NOW add drag to parent nodes AFTER envelope handlers are set
    nodeSelection.merge(nodeEnter).call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))

    // Merge selection for updates
    const nodeUpdate = nodeSelection.merge(nodeEnter)

    // Keep agent bot glyph styling in sync on updates.
    // This matters when switching scenarios without a full reload (e.g., AI-generated scenarios)
    // because agentIds are often reused and D3 will reuse existing DOM nodes.
    nodeUpdate.select('g.agent-bot')
      .attr('stroke', d => d?.fleetColor || 'var(--vscode-sideBar-border)')
      .attr('fill', d => d?.fleetColor || 'var(--vscode-statusBar-foreground)')
      .attr('data-agent-active', d => d?.isRecentlyActive ? 'true' : 'false')
      .attr('transform', d => `scale(${(d?.gridScale || 1.0) * currentAgentDensity.botScale})`)

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
      .attr('stroke', d => d.fleetColor || 'var(--vscode-sideBar-border)')
      .attr('fill', d => d.fleetColor || 'var(--vscode-statusBar-foreground)')
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
        return truncateWithEllipsis(d.role, 26)
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
        return truncateWithEllipsis(d.role, 26)
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

    updateEnvelopeRendering({ d3, nodeUpdate })

    // Steward icon stroke matches steward ring.
    nodeUpdate.selectAll('g.steward-icon').selectAll('circle, path')
      .attr('stroke', d => d.color || 'var(--status-warning)')

    // Bot glyph styling (active agents read brighter)
    // IMPORTANT: When switching scenarios without a full reload, D3 may reuse
    // existing DOM nodes for the same agentId. Child shapes can retain old bound
    // data, so style them from the bot group's current datum.
    nodeUpdate.selectAll('g.agent-bot')
      .datum(function() {
        // Ensure bot group uses the parent node's latest datum
        return d3.select(this.parentNode).datum()
      })
      .each(function(d) {
        const bot = d3.select(this)
        const fleetColor = d?.fleetColor || 'var(--vscode-sideBar-border)'
        const eyeColor = d?.fleetColor || 'var(--vscode-statusBar-foreground)'
        const isActive = Boolean(d?.isRecentlyActive)

        bot
          .attr('stroke', fleetColor)
          .attr('fill', eyeColor)
          .attr('data-agent-active', isActive ? 'true' : 'false')

        bot.selectAll('rect.agent-bot-head, line.agent-bot-antenna')
          .attr('stroke', fleetColor)
          .attr('opacity', isActive ? 1 : 0.45)

        bot.selectAll('circle.agent-bot-eye')
          .attr('fill', eyeColor)
          .attr('opacity', isActive ? 1 : 0.35)
      })

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
      .text(d => getNodeSubLabelText(d, detailLevel))

    nodeSelection.exit().transition().duration(500).style('opacity', 0).remove()

    // --- Particles ---
    // We render particles in the tick function for smooth animation
  }

  // 5. Tick Function (Animation Loop)
  function ticked() {
    // Update Node Positions - using CSS transforms for GPU acceleration
    nodeLayer.selectAll('g.node')
      .style('transform', d => `translate(${d.x}px,${d.y}px)`)
      .style('will-change', 'transform')

    // Subtle activity pulse for working agents (CSS animation)
    nodeLayer.selectAll('circle.agent-activity-halo')
      .classed('active', d => d?.isRecentlyActive)

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
      stepParticle(p, nodes)
    })

    renderParticlesTick({
      d3,
      particleLayer,
      particles,
      getEventColor,
      wrapTextLinesByChars,
    })
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

  // ============================================================================
  // EMBEDDING VECTOR SPACE (3D Memory Store)
  // Render embedding visualization using dedicated renderer module
  // ============================================================================
  const embeddingRenderer = createEmbeddingRenderer(svg, {
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
    nodes
  })

  return {
    cleanup: () => {
      unsubscribe()
      embeddingRenderer.cleanup()
      simulation.stop()
    },
    setFilter: (filter) => {
      currentFilter = filter
      update()
    }
  }
}
