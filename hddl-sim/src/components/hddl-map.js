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
import { renderMapChrome } from './map/map-chrome'
import { createDragHandlers, createTicked } from './map/simulation-handlers'
import {
  renderAgentEnter,
  renderNodeLabelsEnter,
  renderStewardEnter,
  updateAgentRendering,
  updateNodeLabels,
  updateStewardRendering,
} from './map/entity-renderer'

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
    .style('background', `linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.4) 15%, rgba(0, 0, 0, 0.6) 70%, rgba(0, 0, 0, 0.8) 100%), url(${darkBgUrl}) center 50%/cover no-repeat`)
    .style('border', '1px solid var(--vscode-widget-border)')
    .style('border-radius', '6px')
    .style('overflow', 'visible')
    .style('margin-top', '-80px')

  // Zoom behavior - wrap all content in a zoomable group
  const zoomGroup = svg.append('g').attr('class', 'zoom-container')
  
  let currentZoom = 1
  const zoom = d3.zoom()
    .scaleExtent([0.5, 3])  // Allow 50% to 300% zoom
    .on('zoom', (event) => {
      currentZoom = event.transform.k
      zoomGroup.attr('transform', event.transform)
    })
  
  svg.call(zoom)
  
  // Double-click to reset zoom
  svg.on('dblclick.zoom', () => {
    svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity)
  })

  // 2. Simulation Setup
  // Keep a lightweight simulation running so particles animate smoothly,
  // but lock nodes to deterministic lane coordinates ("on rails").
  let ticked = () => {}
  const simulation = d3.forceSimulation()
    .alphaDecay(0) // keep ticking (used as an animation loop)
    .velocityDecay(0.55)
    .on('tick', () => ticked())

  const { dragstarted, dragged, dragended } = createDragHandlers({ simulation })

  // Layers (inside zoomGroup so they zoom together)
  const headerLayer = zoomGroup.append('g').attr('class', 'headers')
  const cycleLayer = zoomGroup.append('g').attr('class', 'cycles')
  const fleetLayer = zoomGroup.append('g').attr('class', 'fleets')
  const linkLayer = zoomGroup.append('g').attr('class', 'links')
  const exceptionLinkLayer = zoomGroup.append('g').attr('class', 'exception-links')
  const nodeLayer = zoomGroup.append('g').attr('class', 'nodes')
  const particleLayer = zoomGroup.append('g').attr('class', 'particles')

  const {
    col1Width,
    col2Width,
    col3Width,
    col1Center,
    col2Center,
    col3Center,
    col1Left,
    col1Right,
    col3Left,
  } = renderMapChrome({
    svg: zoomGroup,  // Pass zoomGroup so chrome content zooms too
    headerLayer,
    cycleLayer,
    width,
    mapHeight,
    detailLevel,
    DETAIL_LEVELS,
    getAdaptiveHeader,
    planetUrl,
  })

  // State
  let nodes = []
  let links = []
  let exceptionLinks = []
  let particles = []
  let fleetBounds = []

  ticked = createTicked({
    d3,
    nodeLayer,
    linkLayer,
    exceptionLinkLayer,
    particleLayer,
    getNodes: () => nodes,
    getParticles: () => particles,
    stepParticle,
    renderParticlesTick,
    getEventColor,
    wrapTextLinesByChars,
  })

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
      // Aggressive sizing: favor larger icons, fewer columns
      let cols, iconScale, showNames, cellPadding
      if (agentCount <= 2) {
        cols = 1
        iconScale = 1.2
        showNames = true
        cellPadding = 10
      } else if (agentCount <= 4) {
        cols = 2
        iconScale = 1.1
        showNames = true
        cellPadding = 8
      } else if (agentCount <= 6) {
        cols = 2
        iconScale = 1.0
        showNames = true
        cellPadding = 6
      } else if (agentCount <= 9) {
        cols = 3
        iconScale = 0.85
        showNames = false  // Hide names, show on hover/click
        cellPadding = 5
      } else if (agentCount <= 12) {
        cols = 3
        iconScale = 0.7
        showNames = false
        cellPadding = 4
      } else {
        cols = 4
        iconScale = 0.6
        showNames = false
        cellPadding = 3
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
        const agentR = 16 * gridPos.iconScale  // Increased from 12

        const existing = nodes.find(n => n.id === agent.agentId)
        if (existing) {
          // Create new object to force D3 data binding to update
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
        const agentR = 16 * gridPos.iconScale  // Increased from 12

        const existing = nodes.find(n => n.id === agent.agentId)
        if (existing) {
          // Create new object to force D3 data binding to update
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

    renderStewardEnter({
      d3,
      nodeEnter,
      showStewardTooltip,
      hideStewardTooltip,
      getScenario,
      getTimeHour,
    })

    renderAgentEnter({
      d3,
      nodeEnter,
      detailLevel,
      DETAIL_LEVELS,
      getAgentDensity,
      canHoverTooltip,
      showAgentTooltip,
      hideAgentTooltip,
      getAdaptiveAgentName,
      truncateWithEllipsis,
    })

    renderNodeLabelsEnter({ nodeEnter })

    // NOW add drag to parent nodes AFTER envelope handlers are set
    nodeSelection.merge(nodeEnter).call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))

    // Merge selection for updates
    const nodeUpdate = nodeSelection.merge(nodeEnter)

    updateStewardRendering({ d3, nodeUpdate })
    updateAgentRendering({
      d3,
      nodeUpdate,
      detailLevel,
      DETAIL_LEVELS,
      getAgentDensity,
      getAdaptiveAgentName,
      truncateWithEllipsis,
    })

    updateEnvelopeRendering({ d3, nodeUpdate })

    updateNodeLabels({
      nodeUpdate,
      detailLevel,
      DETAIL_LEVELS,
      getAdaptiveEnvelopeLabel,
      getAdaptiveStewardLabel,
      getAdaptiveAgentName,
      getNodeSubLabelText,
    })

    nodeSelection.exit().transition().duration(500).style('opacity', 0).remove()

    // --- Particles ---
    // We render particles in the tick function for smooth animation
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
  const embeddingRenderer = createEmbeddingRenderer(zoomGroup, {
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
    update,
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
