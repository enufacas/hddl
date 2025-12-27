import * as d3 from 'd3'
import { getScenario, getEnvelopeAtTime, getEventsNearTime, getTimeHour, onTimeChange, onScenarioChange, getEnvelopeStatus } from '../sim/sim-state'
import { getStewardColor, STEWARD_PALETTE, toSemver, getEventColor } from '../sim/steward-colors'

export function createHDDLMap(container, options = {}) {
  // 1. Setup SVG and Dimensions
  const width = container.clientWidth || 800
  const mapHeight = 570
  const embeddingHeight = 180
  const height = mapHeight + embeddingHeight  // Total: 750px
  
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
  const cycleYTop = 118
  const cycleYBottom = mapHeight - 56  // Use mapHeight, not total height
  const cycleYMid = (cycleYTop + cycleYBottom) / 2
  const cycleRy = Math.max(70, (cycleYBottom - cycleYTop) * 0.42)

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
    .attr('height', 34)
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

  headerLayer.append('text').attr('x', col1Center).attr('y', 24).attr('text-anchor', 'middle').text('AGENT FLEETS').attr('fill', 'var(--vscode-editor-foreground)').style('font-size', '9px').style('font-weight', '800').style('letter-spacing', '0.6px').style('paint-order', 'stroke').style('stroke', 'var(--vscode-editor-background)').style('stroke-width', '3px').style('opacity', 0.85)
  headerLayer.append('text').attr('x', col2Center).attr('y', 24).attr('text-anchor', 'middle').text('DECISION ENVELOPES').attr('fill', 'var(--vscode-editor-foreground)').style('font-size', '9px').style('font-weight', '800').style('letter-spacing', '0.6px').style('paint-order', 'stroke').style('stroke', 'var(--vscode-editor-background)').style('stroke-width', '3px').style('opacity', 0.85)
  headerLayer.append('text').attr('x', col3Center).attr('y', 24).attr('text-anchor', 'middle').text('STEWARDS').attr('fill', 'var(--vscode-editor-foreground)').style('font-size', '9px').style('font-weight', '800').style('letter-spacing', '0.6px').style('paint-order', 'stroke').style('stroke', 'var(--vscode-editor-background)').style('stroke-width', '3px').style('opacity', 0.85)

  // Source-of-truth cue for signals so the flow reads as "world -> envelope".
  headerLayer.append('text')
    .attr('x', col2Center)
    .attr('y', 12)
    .attr('text-anchor', 'middle')
    .text('WORLD (Telemetry) ↓')
    .attr('fill', 'var(--vscode-statusBar-foreground)')
    .style('font-size', '8px')
    .style('font-weight', '700')
    .style('opacity', 0.65)
    .style('paint-order', 'stroke')
    .style('stroke', 'var(--vscode-editor-background)')
    .style('stroke-width', '3px')

  // State
  let nodes = []
  let links = []
  let exceptionLinks = []
  let particles = []
  let fleetBounds = []

  const displayEnvelopeId = (id) => String(id || '').replace(/^ENV-/, 'DE-')

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
        <span style="background: var(--vscode-badge-background); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
          ${status.toUpperCase()}
        </span>
        <span style="background: var(--vscode-input-background); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-family: monospace;">
          v${semver}
        </span>
        <span style="background: var(--vscode-input-background); padding: 4px 10px; border-radius: 12px; font-size: 11px;">
          ${envelopeNode.ownerRole}
        </span>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; color: var(--vscode-statusBar-foreground); margin-bottom: 8px; letter-spacing: 0.5px;">Domain</h3>
        <div style="padding: 8px; background: var(--vscode-input-background); border-radius: 4px;">${envelope.domain || 'Not specified'}</div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; color: var(--vscode-statusBar-foreground); margin-bottom: 8px; letter-spacing: 0.5px;">Decision Authority (Assumptions)</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${(envelope.assumptions || []).map(a => `
            <div style="padding: 10px; background: var(--vscode-input-background); border-left: 3px solid var(--vscode-focusBorder); border-radius: 3px; font-size: 13px;">
              ${a}
            </div>
          `).join('') || '<div style="color: var(--vscode-statusBar-foreground); font-style: italic;">No assumptions defined</div>'}
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; color: var(--vscode-statusBar-foreground); margin-bottom: 8px; letter-spacing: 0.5px;">Constraints</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${(envelope.constraints || []).map(c => `
            <div style="padding: 10px; background: var(--vscode-input-background); border-left: 3px solid var(--status-warning); border-radius: 3px; font-size: 13px;">
              ${c}
            </div>
          `).join('') || '<div style="color: var(--vscode-statusBar-foreground); font-style: italic;">No constraints defined</div>'}
        </div>
      </div>
      
      <div style="margin-bottom: 0;">
        <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; color: var(--vscode-statusBar-foreground); margin-bottom: 8px; letter-spacing: 0.5px;">Time Window</h3>
        <div style="padding: 8px; background: var(--vscode-input-background); border-radius: 4px; font-family: monospace; font-size: 12px;">
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
    
    const activeEnvelopes = filteredEnvelopes.map(envelope => {
      return getEnvelopeAtTime(scenario, envelope.envelopeId, hour) || envelope
    })

    // Sort envelopes for layout: Active first, then by ID
    // This creates the "come to the top" behavior
    activeEnvelopes.sort((a, b) => {
        const statusA = getEnvelopeStatus(a, hour)
        const statusB = getEnvelopeStatus(b, hour)
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

    const topMargin = 52
    const bottomMargin = 28
    const usableHeight = Math.max(160, height - topMargin - bottomMargin)
    const rowCount = Math.max(1, activeEnvelopes.length)
    const rowHeight = usableHeight / rowCount
    const envelopeR = Math.max(22, Math.min(40, (rowHeight - 18) / 2))

    // --- Nodes (Envelopes) ---
    // Map envelopes to nodes, preserving existing nodes to keep position
    const newNodes = activeEnvelopes.map((envelope, index) => {
      const existing = nodes.find(n => n.id === envelope.envelopeId)
      
      // Determine if envelope is active in the current time window
      const status = getEnvelopeStatus(envelope, hour)
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
    const stewardR = Math.max(14, Math.min(25, (stewardStep - 14) / 2))
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
    const agentStep = Math.max(26, Math.min(34, rowHeight * 0.42))
    const fleetBand = Math.max(64, Math.min(140, usableHeight / Math.max(1, fleetOrder.length)))

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
      // Need at least 32-35px between agent centers to prevent text overlap
      const safeMinStep = 34
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
      const workingYs = stackYsInSlot(fleetY - (fleetBand * 0.18), working.length, slotTop, slotBottom)
      const idleYs = stackYsInSlot(fleetY + (fleetBand * 0.18), idle.length, slotTop, slotBottom)

      working.forEach((agent, i) => {
        const baseW = 110 + Math.min(140, Math.max(0, String(agent.name || '').length - 8) * 7)
        const targetX = workingX
        const avail = Math.max(120, (col1Right - rightPadding) - targetX)
        const agentW = Math.max(110, Math.min(220, Math.min(baseW, avail)))
        const targetY = workingYs[i] ?? fleetY

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
            x: targetX,
            y: targetY,
            targetX,
            targetY,
          })
        }
      })

      idle.forEach((agent, i) => {
        const baseW = 110 + Math.min(140, Math.max(0, String(agent.name || '').length - 8) * 7)
        const targetX = idleX
        const avail = Math.max(120, (col1Right - rightPadding) - targetX)
        const agentW = Math.max(92, Math.min(180, Math.min(baseW, avail)))
        const targetY = idleYs[i] ?? fleetY

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
            x: targetX,
            y: targetY,
            targetX,
            targetY,
          })
        }
      })
    }

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

    // --- Particles (Events) ---
    // Authority-first map story:
    // - signal: world -> envelope
    // - boundary_interaction: envelope -> steward (actorRole)
    // - revision: steward (actorRole) -> envelope
    const flowEvents = recentEvents.filter(e =>
      e.type === 'signal' || e.type === 'boundary_interaction' || e.type === 'revision' || e.type === 'decision'
    )

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
        // agent -> envelope (allowed) OR agent -> steward (blocked)
        if (agentNode) {
          sourceX = agentNode.x
          sourceY = agentNode.y
        }
        if ((e.status === 'blocked' || e.status === 'denied') && (stewardNode || e.actorRole)) {
          const t = stewardNode || nodes.find(n => n.type === 'steward' && n.name === (e.actorRole || ''))
          if (t) {
            targetX = t.x
            targetY = t.y
          }
        } else {
          targetX = envelopeNode.x
          targetY = envelopeNode.y
        }
      }

      if (e.type === 'boundary_interaction') {
        // envelope -> steward
        sourceX = envelopeNode.x
        sourceY = envelopeNode.y
        if (stewardNode) {
          targetX = stewardNode.x
          targetY = stewardNode.y
        }
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

      particles.push({
        id: pid,
        type: e.type,
        severity: e.severity || 'info',
        status: e.status || (e.boundary_kind === 'escalated' ? 'blocked' : 'allowed'),
        text: (() => {
          const type = String(e.type || '').toLowerCase()
          const status = String(e.status || '').toLowerCase()
          const boundaryKind = String(e.boundary_kind || e.boundaryKind || '').toLowerCase()

          let prefix = 'Event'
          if (type === 'signal') prefix = 'Signal'
          else if (type === 'revision') prefix = 'Revision'
          else if (type === 'boundary_interaction') prefix = boundaryKind === 'escalated' ? 'Exception' : 'Boundary'
          else if (type === 'decision') prefix = (status === 'blocked' || status === 'denied') ? 'Decision (blocked)' : 'Decision'

          let core = ''
          if (type === 'signal') core = String(e.label || e.signalKey || 'telemetry')
          else if (type === 'revision') core = String(e.label || e.revision_id || 'bounds updated')
          else if (type === 'boundary_interaction') core = String(e.label || boundaryKind || 'interaction')
          else if (type === 'decision') core = String(e.label || (status ? status : 'executed'))
          else core = String(e.label || e.type || 'event')

          return `${prefix}: ${core}`
        })(),
        sourceX,
        sourceY,
        targetX,
        targetY,
        targetNodeId: (e.type === 'boundary_interaction' && stewardNode)
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
        life: 1.0,
        labelOpacity: 0.85,

        // Canon cue: allowed decisions "operate within" envelope bounds.
        orbit: false,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitTicksLeft: 0,
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

    fleetSel.merge(fleetEnter).select('rect.fleet-boundary')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', d => d.w)
      .attr('height', d => d.h)
      .attr('stroke', d => d.color)
      .attr('opacity', 0.65)

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
      .attr('stroke', 'var(--status-warning)')
      .attr('stroke-width', 3)
      .attr('opacity', 0.0)
      .transition().duration(200)
      .attr('opacity', 0.85)

    exceptionSel
      .attr('stroke', 'var(--status-warning)')
      .attr('stroke-width', 3)
      .attr('opacity', 0.85)

    exceptionSel.exit().transition().duration(200).attr('opacity', 0).remove()

    // --- Nodes ---
    const nodeSelection = nodeLayer.selectAll('g.node')
      .data(nodes, d => d.id)

    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    // Envelope shape (larger, clearly an envelope — not a circle)
    const envShape = nodeEnter.filter(d => d.type === 'envelope')
      .append('g')
      .attr('class', 'envelope-shape')
      .style('cursor', 'pointer')
      .style('pointer-events', 'all')
      .on('click', function(event, d) {
        event.stopPropagation()
        showEnvelopeAuthority(d, scenario, hour)
      })

    // Outer glow ring for active envelopes (pulsing animation)
    envShape.append('rect')
      .attr('class', 'envelope-glow')
      .attr('x', d => {
        const rr = d.r
        const w = Math.max(84, Math.round(rr * 3.2)) + 16
        return -w / 2
      })
      .attr('y', d => {
        const rr = d.r
        const h = Math.max(52, Math.round(rr * 2.05)) + 16
        return -h / 2
      })
      .attr('width', d => Math.max(84, Math.round(d.r * 3.2)) + 16)
      .attr('height', d => Math.max(52, Math.round(d.r * 2.05)) + 16)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', 'none')
      .attr('stroke', 'var(--vscode-focusBorder)')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .style('filter', 'blur(4px)')

    // Revision burst ring (expands outward when envelope is revised)
    envShape.append('rect')
      .attr('class', 'envelope-revision-burst')
      .attr('x', d => {
        const rr = d.r
        const w = Math.max(84, Math.round(rr * 3.2))
        return -w / 2
      })
      .attr('y', d => {
        const rr = d.r
        const h = Math.max(52, Math.round(rr * 2.05))
        return -h / 2
      })
      .attr('width', d => Math.max(84, Math.round(d.r * 3.2)))
      .attr('height', d => Math.max(52, Math.round(d.r * 2.05)))
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', 'none')
      .attr('stroke', 'var(--status-success)')
      .attr('stroke-width', 3)
      .attr('opacity', 0)

    envShape.append('rect')
      .attr('class', 'envelope-body')
      .attr('x', d => {
        const rr = d.r
        const w = Math.max(84, Math.round(rr * 3.2))
        return -w / 2
      })
      .attr('y', d => {
        const rr = d.r
        const h = Math.max(52, Math.round(rr * 2.05))
        return -h / 2
      })
      .attr('width', d => Math.max(84, Math.round(d.r * 3.2)))
      .attr('height', d => Math.max(52, Math.round(d.r * 2.05)))
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', 'var(--vscode-editor-background)')
      .attr('stroke', 'var(--vscode-focusBorder)')
      .attr('stroke-width', 3)

    // Envelope flap - triangular top that opens/closes
    envShape.append('path')
      .attr('class', 'envelope-flap')
      .attr('fill', 'var(--vscode-editor-background)')
      .attr('stroke-width', 2.5)
      .attr('stroke-linejoin', 'round')
      .style('transform-origin', 'center top')
      .style('transition', 'transform 0.4s ease-out')
      .attr('d', d => {
        const rr = d.r
        const w = Math.max(84, Math.round(rr * 3.2))
        const h = Math.max(52, Math.round(rr * 2.05))
        const left = -w / 2
        const top = -h / 2
        const right = w / 2
        // Triangle flap pointing down into envelope (closed state)
        return `M ${left + 4} ${top + 4} L 0 ${top + h * 0.45} L ${right - 4} ${top + 4} Z`
      })

    // Inner fold line (gives depth to envelope)
    envShape.append('path')
      .attr('class', 'envelope-fold')
      .attr('fill', 'none')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4)
      .attr('d', d => {
        const rr = d.r
        const w = Math.max(84, Math.round(rr * 3.2))
        const h = Math.max(52, Math.round(rr * 2.05))
        const left = -w / 2
        const bottom = h / 2
        const right = w / 2
        // V shape at bottom suggesting paper inside
        return `M ${left + 8} ${bottom - 8} L 0 ${bottom - h * 0.25} L ${right - 8} ${bottom - 8}`
      })

    // Envelope status label (OPEN vs CLOSED)
    nodeEnter.filter(d => d.type === 'envelope')
      .append('text')
      .attr('class', 'envelope-status')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--vscode-editor-background)')
      .style('stroke-width', '4px')
      .style('font-size', '9px')
      .style('font-weight', '800')
      .attr('fill', 'var(--vscode-statusBar-foreground)')

    // Version badge (semver format with bump indicator)
    const versionBadge = nodeEnter.filter(d => d.type === 'envelope')
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
      .style('font-size', '8px')
      .style('font-weight', '700')
      .style('font-family', 'ui-monospace, monospace')

    // Merge selection for updates
    const nodeUpdate = nodeSelection.merge(nodeEnter)

    // Steward Circle
    nodeEnter.filter(d => d.type === 'steward')
      .append('circle')
      .attr('r', d => d.r)
      .attr('fill', 'var(--vscode-editor-background)')
      .attr('stroke', d => d.color || 'var(--status-warning)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '2 2')

    // Steward persona glyph (head + shoulders)
    const stewardIcon = nodeEnter.filter(d => d.type === 'steward')
      .append('g')
      .attr('class', 'steward-icon')
      .style('pointer-events', 'none')
      .attr('opacity', 0.9)

    stewardIcon.append('circle')
      .attr('class', 'steward-icon-head')
      .attr('cx', 0)
      .attr('cy', -6)
      .attr('r', 6)
      .attr('fill', 'none')
      .attr('stroke-width', 2)

    stewardIcon.append('path')
      .attr('class', 'steward-icon-shoulders')
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('d', 'M -14 14 Q 0 2 14 14')

    // Agents (bot glyph + text; no card/box)
    const agentEnter = nodeEnter.filter(d => d.type === 'agent')

    // Activity halo (used to emphasize working agents)
    agentEnter.append('circle')
      .attr('class', 'agent-activity-halo')
      .attr('cx', 0)
      .attr('cy', -1)
      .attr('r', 16)
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('opacity', 0)

    // Bot glyph (head + antenna + eyes)
    const bot = agentEnter.append('g')
      .attr('class', 'agent-bot')
      .style('pointer-events', 'none')
      .attr('opacity', 0.95)

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

    agentEnter
      .append('text')
      .attr('class', 'agent-name')
      .attr('text-anchor', 'start')
      .attr('x', 16)
      .attr('y', -2)
      .style('pointer-events', 'none')
      .style('font-size', '10px')
      .style('font-weight', '700')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--vscode-editor-background)')
      .style('stroke-width', '3px')
      .attr('fill', 'var(--vscode-editor-foreground)')
      .text(d => d.name)

    agentEnter
      .append('text')
      .attr('class', 'agent-role')
      .attr('text-anchor', 'start')
      .attr('x', 16)
      .attr('y', 12)
      .style('pointer-events', 'none')
      .style('font-size', '9px')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--vscode-editor-background)')
      .style('stroke-width', '3px')
      .attr('fill', 'var(--vscode-editor-foreground)')
      .attr('opacity', 0.75)
      .text(d => {
        if (!d.role) return ''
        const maxLen = 26
        return d.role.substring(0, maxLen) + (d.role.length > maxLen ? '...' : '')
      })

    nodeUpdate.select('.agent-name')
      .attr('x', 16)
      .text(d => d.name)

    nodeUpdate.select('.agent-role')
      .attr('x', 16)
      .text(d => {
        if (!d.role) return ''
        const maxLen = 26
        return d.role.substring(0, maxLen) + (d.role.length > maxLen ? '...' : '')
      })

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

    // Animate envelope glow for active envelopes (pulsing effect)
    nodeUpdate.selectAll('g.envelope-shape').select('rect.envelope-glow')
      .attr('x', d => {
        const rr = d.r + (d.isRecentlyRevised ? 6 : 0)
        const w = Math.max(84, Math.round(rr * 3.2)) + 16
        return -w / 2
      })
      .attr('y', d => {
        const rr = d.r + (d.isRecentlyRevised ? 6 : 0)
        const h = Math.max(52, Math.round(rr * 2.05)) + 16
        return -h / 2
      })
      .attr('width', d => Math.max(84, Math.round((d.r + (d.isRecentlyRevised ? 6 : 0)) * 3.2)) + 16)
      .attr('height', d => Math.max(52, Math.round((d.r + (d.isRecentlyRevised ? 6 : 0)) * 2.05)) + 16)
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
          const rr = d.r + 6
          const baseW = Math.max(84, Math.round(rr * 3.2))
          const baseH = Math.max(52, Math.round(rr * 2.05))
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
        const rr = d.r + (d.isRecentlyRevised ? 6 : 0)
        const h = Math.max(52, Math.round(rr * 2.05))
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
        const rr = d.r + (d.isRecentlyRevised ? 6 : 0)
        const w = Math.max(84, Math.round(rr * 3.2))
        const h = Math.max(52, Math.round(rr * 2.05))
        // Position at bottom right of envelope
        return `translate(${w / 2 - 20}, ${h / 2 + 8})`
      })

    nodeUpdate.select('.version-badge-bg')
      .attr('x', -18)
      .attr('y', -7)
      .attr('width', 36)
      .attr('height', 14)
      .attr('fill', d => d.isVersionBumped ? 'var(--status-warning)' : 'var(--vscode-editor-background)')
      .attr('stroke', d => d.isVersionBumped ? 'none' : 'var(--vscode-sideBar-border)')
      .attr('stroke-width', 1)
      .attr('opacity', 0.95)

    nodeUpdate.select('.version-badge-text')
      .attr('fill', d => d.isVersionBumped ? 'var(--vscode-editor-background)' : 'var(--vscode-editor-foreground)')
      .text(d => d.isVersionBumped ? `↑ v${d.semver}` : `v${d.semver}`)

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
        const rr = d.r + (d.isRecentlyRevised ? 6 : 0)
        const w = Math.max(84, Math.round(rr * 3.2))
        const h = Math.max(52, Math.round(rr * 2.05))
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
        const rr = d.r + (d.isRecentlyRevised ? 6 : 0)
        const w = Math.max(84, Math.round(rr * 3.2))
        const h = Math.max(52, Math.round(rr * 2.05))
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

    // Dim idle labels to make "working" pop in each fleet.
    nodeUpdate.selectAll('text.agent-name')
      .attr('opacity', d => d.isRecentlyActive ? 1 : 0.55)

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

    // Update Labels
    nodeUpdate.select('.label-main')
      .attr('dy', d => d.type === 'envelope' ? 5 : 4)
      .attr('text-anchor', d => d.type === 'agent' ? 'end' : (d.type === 'steward' ? 'start' : 'middle'))
      .attr('x', d => d.type === 'agent' ? -d.r - 5 : (d.type === 'steward' ? d.r + 5 : 0))
      .attr('fill', 'var(--vscode-editor-foreground)')
      .attr('opacity', d => (d.status === 'pending' ? 0.6 : d.status === 'ended' ? 0.75 : 1))
        .style('font-size', d => d.type === 'envelope' ? '12px' : '10px')
      .style('font-weight', d => d.type === 'envelope' ? 'bold' : 'normal')
      .text(d => {
      if (d.type === 'envelope') return d.label
      if (d.type === 'steward') return d.name
      if (d.type === 'agent') return d.name
      return ''
      })

    nodeUpdate.select('.label-sub')
      .attr('dy', d => d.type === 'envelope' ? 20 : (d.type === 'steward' ? 15 : 15))
      .attr('text-anchor', d => d.type === 'agent' ? 'end' : (d.type === 'steward' ? 'start' : 'middle'))
      .attr('x', d => d.type === 'agent' ? -d.r - 5 : (d.type === 'steward' ? d.r + 5 : 0))
      .attr('fill', 'var(--vscode-editor-foreground)')
      .attr('opacity', d => (d.status === 'pending' ? 0.5 : d.status === 'ended' ? 0.6 : 0.7))
      .style('font-size', '9px')
      .text(d => {
        if (d.type === 'agent') {
          if (!d.role) return ''
          const maxLen = 20
          return d.role.substring(0, maxLen) + (d.role.length > maxLen ? '...' : '')
        }
        if (d.type === 'steward') return 'Steward'
        // Let envelopes carry their name clearly; other types remain compact.
        const maxLen = d.type === 'envelope' ? 24 : 18
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
        p.life -= 0.015
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
        if (p.type === 'decision' && p.status !== 'blocked' && p.status !== 'denied') {
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
      .attr('opacity', 0)

    pEnter.append('circle')
      .attr('r', 4)

    pEnter.append('text')
      .attr('class', 'particle-label')
      .attr('text-anchor', 'start')
      .attr('x', 8)
      .attr('y', 3)
      .style('pointer-events', 'none')
      .style('font-size', '9px')
      .style('font-weight', '800')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--vscode-editor-background)')
      .style('stroke-width', '4px')
      .attr('fill', 'var(--vscode-editor-foreground)')

    pEnter.transition().duration(200).attr('opacity', 1)

    particleSelection
      .attr('transform', d => `translate(${d.x},${d.y})`)
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

  // ============================================================================
  // EMBEDDING VECTOR SPACE (3D Memory Store)
  // ============================================================================
  
  const embeddingStoreHeight = 180
  const embeddingStoreLayer = svg.append('g')
    .attr('class', 'embedding-store')
    .attr('transform', `translate(0, ${mapHeight})`)

  // 3D box background with perspective
  const box3D = embeddingStoreLayer.append('g')
    .attr('class', 'embedding-box-3d')

  const floorTop = embeddingStoreHeight * 0.3
  const floorBottom = embeddingStoreHeight - 10
  const floorDepthRange = floorBottom - floorTop

  // Back wall (trapezoid for perspective)
  box3D.append('polygon')
    .attr('points', `
      ${width * 0.05},${floorTop}
      ${width * 0.95},${floorTop}
      ${width * 0.85},${floorBottom}
      ${width * 0.15},${floorBottom}
    `)
    .attr('fill', 'url(#embedding-back-wall)')
    .attr('stroke', 'rgba(100, 150, 255, 0.35)')
    .attr('stroke-width', 1)

  // Floor (trapezoid receding into distance)
  box3D.append('polygon')
    .attr('points', `
      ${width * 0.15},${floorTop}
      ${width * 0.85},${floorTop}
      ${width * 0.85},${floorBottom}
      ${width * 0.15},${floorBottom}
    `)
    .attr('fill', 'url(#embedding-floor)')
    .attr('stroke', 'rgba(100, 150, 255, 0.25)')
    .attr('stroke-width', 1)

  // Left wall
  box3D.append('polygon')
    .attr('points', `
      ${width * 0.05},${floorTop}
      ${width * 0.15},${floorTop}
      ${width * 0.15},${floorBottom}
      ${width * 0.05},${floorBottom}
    `)
    .attr('fill', 'rgba(4, 6, 12, 0.92)')
    .attr('stroke', 'rgba(100, 150, 255, 0.3)')
    .attr('stroke-width', 1)

  // Right wall
  box3D.append('polygon')
    .attr('points', `
      ${width * 0.85},${floorTop}
      ${width * 0.95},${floorTop}
      ${width * 0.95},${floorBottom}
      ${width * 0.85},${floorBottom}
    `)
    .attr('fill', 'rgba(4, 6, 12, 0.92)')
    .attr('stroke', 'rgba(100, 150, 255, 0.3)')
    .attr('stroke-width', 1)

  // Gradients for 3D depth
  const boxDefs = svg.append('defs')
  
  const backWallGradient = boxDefs.append('linearGradient')
    .attr('id', 'embedding-back-wall')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%')
  backWallGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', 'rgba(5, 8, 15, 0.98)')
  backWallGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'rgba(2, 4, 10, 1)')

  const floorGradient = boxDefs.append('linearGradient')
    .attr('id', 'embedding-floor')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%')
  floorGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', 'rgba(5, 8, 15, 0.95)')
  floorGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'rgba(10, 14, 22, 0.98)')

  // Perspective grid lines
  const gridLayer = embeddingStoreLayer.append('g')
    .attr('class', 'perspective-grid')
    .attr('opacity', 0.18)

  // Vertical lines converging to vanishing points
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    const backX = width * 0.05 + t * (width * 0.9)
    const frontX = width * 0.15 + t * (width * 0.7)
    gridLayer.append('line')
      .attr('x1', backX)
      .attr('y1', floorTop)
      .attr('x2', frontX)
      .attr('y2', floorBottom)
      .attr('stroke', 'rgba(80, 100, 140, 0.12)')
      .attr('stroke-width', 0.5)
  }

  // Horizontal depth lines
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const y = floorTop + t * floorDepthRange
    const perspectiveScale = 0.7 + t * 0.3
    const leftX = width * 0.05 + (1 - perspectiveScale) * (width * 0.1)
    const rightX = width * 0.95 - (1 - perspectiveScale) * (width * 0.1)
    gridLayer.append('line')
      .attr('x1', leftX)
      .attr('y1', y)
      .attr('x2', rightX)
      .attr('y2', y)
      .attr('stroke', 'rgba(80, 100, 140, 0.12)')
      .attr('stroke-width', 0.5)
  }

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

  // Define 3D box bounds for embedding positioning
  const box3DBounds = {
    floorTop: embeddingStoreHeight * 0.3,
    floorBottom: embeddingStoreHeight - 10,
    floorLeft: width * 0.15,
    floorRight: width * 0.85,
    wallLeft: width * 0.05,
    wallRight: width * 0.95
  }

  let embeddingElements = []
  let embeddingCount = 0

  function createFloatingEmbedding(event) {
    // Find source node position
    const sourceNode = nodes.find(n => n.id === event.primarySteward || n.id === event.actorRole)
    const sourceX = sourceNode ? sourceNode.x : width / 2
    const sourceY = sourceNode ? sourceNode.y : mapHeight / 2

    // Steward color mapping
    const stewardColors = {
      'Customer Steward': '#EC4899',
      'Customer Success Steward': '#EC4899',
      'HR Steward': '#A855F7',
      'Human Resources Steward': '#A855F7',
      'Sales Steward': '#F59E0B',
      'Data Steward': '#4B96FF',
      'Performance Steward': '#4B96FF',
      'Operations Steward': '#EF4444',
      'Infrastructure Steward': '#14B8A6'
    }
    
    const embeddingColor = stewardColors[event.actorRole] || '#4B96FF'

    // Clustering logic: position based on embeddingType (depth) and actorRole (horizontal)
    const typeDepthMap = {
      'decision': 0.2,
      'boundary_interaction': 0.4,
      'revision': 0.5,
      'signal': 0.7,
      'session_artifact': 0.85
    }
    
    const stewardPositionMap = {
      'Customer Steward': 0.15,
      'Customer Success Steward': 0.15,
      'HR Steward': 0.35,
      'Human Resources Steward': 0.35,
      'Sales Steward': 0.5,
      'Data Steward': 0.65,
      'Performance Steward': 0.65,
      'Operations Steward': 0.8,
      'Infrastructure Steward': 0.8
    }

    // Base position from type and steward
    const baseDepthT = typeDepthMap[event.embeddingType] || 0.5
    const baseStewardPos = stewardPositionMap[event.actorRole] || 0.5

    // Add random variation for natural clustering
    const depthVariation = (Math.random() - 0.5) * 0.12
    const horizontalVariation = (Math.random() - 0.5) * 0.1
    
    const depthT = Math.max(0, Math.min(1, baseDepthT + depthVariation))
    const stewardOffset = Math.max(0, Math.min(1, baseStewardPos + horizontalVariation))

    // Perspective-aware positioning
    const perspectiveScale = 0.7 + depthT * 0.3
    const backLeftX = box3DBounds.wallLeft
    const backRightX = box3DBounds.wallRight
    const frontLeftX = box3DBounds.floorLeft
    const frontRightX = box3DBounds.floorRight
    
    const leftAtDepth = backLeftX + depthT * (frontLeftX - backLeftX)
    const rightAtDepth = backRightX + depthT * (frontRightX - backRightX)
    const widthAtDepth = rightAtDepth - leftAtDepth
    
    const targetX = leftAtDepth + stewardOffset * widthAtDepth
    const targetY = box3DBounds.floorTop + depthT * floorDepthRange
    const depthZ = depthT * 100
    
    // Scale based on perspective (smaller = further away)
    const depthScale = 0.5 + perspectiveScale * 0.5  // 0.5 to 1.0
    
    // Rotation follows perspective: chips at back should appear to tilt away
    const perspectiveTilt = -20 * (1 - depthT)  // -20° at back, 0° at front
    const randomWobble = (Math.random() - 0.5) * 15
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
    
    const tooltipData = {
      type: embeddingTypeLabel,
      label: event.label || 'Embedding',
      steward: event.actorRole || 'Unknown',
      envelope: event.envelopeId || 'N/A',
      id: event.embeddingId || event.eventId || 'N/A',
      context: event.semanticContext || event.detail || 'No context available',
      hour: event.hour
    }
    
    // Add hover interaction with optimized tooltip
    chipGroup.on('mouseenter', function(mouseEvent) {
      d3.select(this).transition().duration(100).attr('opacity', 1)
      
      // Update tooltip content and show
      tooltip
        .style('border-color', embeddingColor)
        .style('display', 'block')
        .html(`
          <div style="border-bottom: 1px solid ${embeddingColor}; padding-bottom: 8px; margin-bottom: 8px;">
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
            ⏱️ Hour ${tooltipData.hour}
          </div>
        `)
        .style('left', (mouseEvent.pageX + 15) + 'px')
        .style('top', (mouseEvent.pageY - 10) + 'px')
    })
    .on('mousemove', function(mouseEvent) {
      tooltip
        .style('left', (mouseEvent.pageX + 15) + 'px')
        .style('top', (mouseEvent.pageY - 10) + 'px')
    })
    .on('mouseleave', function() {
      d3.select(this).transition().duration(200).attr('opacity', 0.75 + depthZ / 400)
      tooltip.style('display', 'none')
    })

    // 3D chip design (microchip/memory card style)
    const chipSize = 14
    
    // Back face (darkest - creates depth)
    chipGroup.append('rect')
      .attr('x', -chipSize / 2 + 1)
      .attr('y', -chipSize / 2 - 2)
      .attr('width', chipSize)
      .attr('height', chipSize)
      .attr('rx', 2)
      .attr('fill', 'rgba(0, 0, 0, 0.6)')
      .attr('stroke', 'none')

    // Top face (angled for 3D effect)
    chipGroup.append('polygon')
      .attr('points', `
        ${-chipSize / 2},${-chipSize / 2 - 2}
        ${chipSize / 2},${-chipSize / 2 - 2}
        ${chipSize / 2 + 2},${-chipSize / 2}
        ${-chipSize / 2 + 2},${-chipSize / 2}
      `)
      .attr('fill', 'rgba(0, 0, 0, 0.4)')
      .attr('stroke', 'none')

    // Right face (angled for 3D effect)
    chipGroup.append('polygon')
      .attr('points', `
        ${chipSize / 2},${-chipSize / 2 - 2}
        ${chipSize / 2 + 2},${-chipSize / 2}
        ${chipSize / 2 + 2},${chipSize / 2}
        ${chipSize / 2},${chipSize / 2 - 2}
      `)
      .attr('fill', 'rgba(0, 0, 0, 0.5)')
      .attr('stroke', 'none')

    // Main front face with gradient
    const chipGradient = boxDefs.append('radialGradient')
      .attr('id', `chip-gradient-${event.eventId}`)
    chipGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', embeddingColor)
      .attr('stop-opacity', 0.9)
    chipGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', embeddingColor)
      .attr('stop-opacity', 0.6)

    chipGroup.append('rect')
      .attr('x', -chipSize / 2)
      .attr('y', -chipSize / 2)
      .attr('width', chipSize)
      .attr('height', chipSize)
      .attr('rx', 2)
      .attr('fill', `url(#chip-gradient-${event.eventId})`)
      .attr('stroke', embeddingColor)
      .attr('stroke-width', 1.5)
      .attr('filter', `drop-shadow(0 0 4px ${embeddingColor})`)

    // Circuit pattern on chip
    const circuitGroup = chipGroup.append('g')
      .attr('opacity', 0.6)
    
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

    // Animate to target with rotation and scale
    chipGroup.transition()
      .duration(2500)
      .ease(d3.easeCubicOut)
      .attr('transform', `translate(${targetX}, ${targetY}) scale(${depthScale}) rotate(${rotateAngle})`)
      .attr('opacity', 0.75 + depthZ / 400)

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
  const scenarioUnsubscribe = onScenarioChange(() => {
    embeddingIconsLayer.selectAll('*').remove()
    embeddingElements = []
    embeddingCount = 0
    embeddingBadgeText.text('0 vectors')
    tooltip.style('display', 'none')
    renderEmbeddings()
  })

  // Subscribe to time changes for embeddings
  const embeddingUnsubscribe = onTimeChange(() => {
    renderEmbeddings()
  })

  // ============================================================================
  // END EMBEDDING VECTOR SPACE
  // ============================================================================

  return {
    cleanup: () => {
      unsubscribe()
      scenarioUnsubscribe()
      embeddingUnsubscribe()
      tooltip.remove()
      simulation.stop()
    },
    setFilter: (filter) => {
      currentFilter = filter
      update()
    }
  }
}
