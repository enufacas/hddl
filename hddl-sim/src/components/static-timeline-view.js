import { getScenario, getTimeHour, formatSimTime, getStewardFilter, getEnvelopeStatus } from '../sim/sim-state'
import { getStewardColor, getEventColor } from '../sim/steward-colors'
import * as d3 from 'd3'

export function createStaticTimelineButton(stewardFilter) {
  const button = document.createElement('button')
  button.className = 'monaco-button static-timeline-button'
  button.innerHTML = `
    <span class="codicon codicon-timeline-view"></span>
    <span class="button-text">Timeline View</span>
  `
  button.style.cssText = `
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 4px;
    border: 1px solid var(--vscode-button-border);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    transition: all 0.2s;
  `
  
  button.addEventListener('mouseenter', () => {
    button.style.background = 'var(--vscode-button-hoverBackground)'
  })
  
  button.addEventListener('mouseleave', () => {
    button.style.background = 'var(--vscode-button-background)'
  })
  
  button.addEventListener('click', () => {
    console.log('[StaticTimeline] Button clicked, stewardFilter:', stewardFilter)
    openStaticTimelineModal(stewardFilter)
  })
  
  return button
}

function openStaticTimelineModal(stewardFilter) {
  console.log('[StaticTimeline] openStaticTimelineModal called with filter:', stewardFilter)
  const scenario = getScenario()
  console.log('[StaticTimeline] getScenario() returned:', !!scenario, scenario ? 'exists' : 'null/undefined')
  if (!scenario) {
    console.error('[StaticTimeline] No scenario available, aborting')
    return
  }

  // Remove any existing modal overlays to prevent caching
  const existingOverlays = document.querySelectorAll('.static-timeline-modal-overlay')
  existingOverlays.forEach(overlay => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay)
    }
  })
  
  // Clean up any lingering tooltip divs
  if (tooltipDiv && tooltipDiv.parentNode) {
    tooltipDiv.parentNode.removeChild(tooltipDiv)
    tooltipDiv = null
  }
  if (envelopeTooltipDiv && envelopeTooltipDiv.parentNode) {
    envelopeTooltipDiv.parentNode.removeChild(envelopeTooltipDiv)
    envelopeTooltipDiv = null
  }

  // Create modal overlay
  const overlay = document.createElement('div')
  overlay.className = 'static-timeline-modal-overlay'
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
    padding: 20px;
  `
  
  // Create modal content
  const modal = document.createElement('div')
  modal.className = 'static-timeline-modal'
  modal.style.cssText = `
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    width: 95vw;
    max-width: 1600px;
    height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  `
  
  // Modal header
  const header = document.createElement('div')
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--vscode-panel-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `
  
  const stewardColor = getStewardColor(stewardFilter)
  const headerTitle = document.createElement('div')
  headerTitle.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 16px;
    font-weight: 600;
  `
  headerTitle.innerHTML = `
    <span class="codicon codicon-symbol-event" style="color: ${stewardColor}; font-size: 20px;"></span>
    <span>Event Flow: <span style="color: ${stewardColor};">${stewardFilter}</span></span>
  `
  
  const closeButton = document.createElement('button')
  closeButton.className = 'monaco-button'
  closeButton.innerHTML = '<span class="codicon codicon-close"></span>'
  closeButton.style.cssText = `
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    padding: 4px 8px;
    font-size: 16px;
  `
  closeButton.addEventListener('click', () => {
    if (overlay.parentNode) {
      document.body.removeChild(overlay)
    }
  })
  
  header.appendChild(headerTitle)
  header.appendChild(closeButton)
  
  // Modal body with two-column layout: timeline + narrative
  const body = document.createElement('div')
  body.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: row;
    overflow: hidden;
    position: relative;
  `
  
  // Timeline panel (main)
  const timelinePanel = document.createElement('div')
  timelinePanel.style.cssText = `
    flex: 1;
    overflow: hidden;
    position: relative;
  `
  
  // Narrative panel (side)
  const narrativePanel = document.createElement('div')
  narrativePanel.style.cssText = `
    width: 350px;
    border-left: 1px solid var(--vscode-panel-border);
    background: var(--vscode-sideBar-background);
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `
  
  body.appendChild(timelinePanel)
  body.appendChild(narrativePanel)
  
  modal.appendChild(header)
  modal.appendChild(body)
  overlay.appendChild(modal)
  
  // Render infinity symbol timeline after DOM is laid out
  console.log('[StaticTimeline] Modal appended to DOM, scheduling SVG render')
  requestAnimationFrame(() => {
    console.log('[StaticTimeline] Animation frame, rendering SVG now')
    renderInfinityTimeline(timelinePanel, stewardFilter, stewardColor)
    renderNarrativePanel(narrativePanel, stewardFilter, stewardColor)
  })
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && overlay.parentNode) {
      document.body.removeChild(overlay)
    }
  })
  
  // Close on Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape' && overlay.parentNode) {
      document.body.removeChild(overlay)
      document.removeEventListener('keydown', escHandler)
    }
  }
  document.addEventListener('keydown', escHandler)
  
  document.body.appendChild(overlay)
}

function renderInfinityTimeline(container, stewardFilter, stewardColor) {
  console.log('[StaticTimeline] renderInfinityTimeline called', {stewardFilter, stewardColor, containerExists: !!container})
  
  // Clear any existing content from container using D3 to ensure proper cleanup
  d3.select(container).selectAll('*').remove()
  
  const scenario = getScenario()
  if (!scenario) {
    console.error('[StaticTimeline] renderInfinityTimeline: No scenario')
    return
  }

  // Filter envelopes and events for this steward
  const envelopes = (scenario.envelopes || []).filter(env => env.ownerRole === stewardFilter)
  const envelopeIds = new Set(envelopes.map(e => e.envelopeId))
  const events = (scenario.events || []).filter(ev => {
    const envId = ev?.envelopeId || ev?.envelope_id
    return !envId || envelopeIds.has(envId)
  })
  
  console.log('[StaticTimeline] Filtered data:', {
    totalEnvelopes: scenario.envelopes?.length,
    filteredEnvelopes: envelopes.length,
    totalEvents: scenario.events?.length,
    filteredEvents: events.length
  })
  
  // Sort events by hour
  const sortedEvents = [...events].sort((a, b) => (a.hour || 0) - (b.hour || 0))
  
  if (sortedEvents.length === 0) {
    console.warn('[StaticTimeline] No events found for steward:', stewardFilter)
    const emptyMessage = document.createElement('div')
    emptyMessage.style.cssText = `
      text-align: center;
      padding: 40px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      font-size: 16px;
    `
    emptyMessage.textContent = `No events found for ${stewardFilter}`
    container.appendChild(emptyMessage)
    return
  }
  
  // Create SVG
  const rect = container.getBoundingClientRect()
  const width = rect.width
  const height = rect.height
  
  console.log('[StaticTimeline] Creating SVG', {width, height, rect})
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', 'var(--vscode-editor-background)')
  
  console.log('[StaticTimeline] SVG created successfully')
  
  // Infinity symbol path (figure-8) - scale to fill available area
  const padding = 80 // Space for labels and icons
  const centerX = width / 2
  const centerY = height / 2
  const loopRadius = Math.min(width - padding * 2, height - padding * 2) * 0.4
  
  // Create lemniscate path (infinity symbol)
  const pathGenerator = (t) => {
    // Lemniscate of Bernoulli: x = a*cos(t)/(1+sin²(t)), y = a*sin(t)*cos(t)/(1+sin²(t))
    const a = loopRadius
    const sinT = Math.sin(t)
    const cosT = Math.cos(t)
    const denom = 1 + sinT * sinT
    return {
      x: centerX + (a * cosT) / denom,
      y: centerY + (a * sinT * cosT) / denom
    }
  }
  
  // Draw infinity path
  const pathData = []
  for (let t = 0; t <= Math.PI * 2; t += 0.01) {
    const pt = pathGenerator(t)
    pathData.push(pt)
  }
  
  const line = d3.line()
    .x(d => d.x)
    .y(d => d.y)
    .curve(d3.curveCardinal)
  
  svg.append('path')
    .datum(pathData)
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', stewardColor)
    .attr('stroke-width', 3)
    .attr('opacity', 0.3)
  
  // Position events along the infinity path
  // Start at top-right position (offset by π/2) where first event should appear
  // IMPORTANT: spacing by parameter t causes visible bunching because the lemniscate
  // parameterization is not constant-speed. Space events by approximate arc-length instead.
  // Use N+1 slots so the gap between last and first is ~one normal spacing.
  // For this lemniscate, top-right is around t = -π/4 (y negative, x positive).
  const startOffset = -Math.PI / 4
  const eventCount = sortedEvents.length
  const eventPositions = (() => {
    if (eventCount <= 0) return []
    if (eventCount === 1) {
      const t = startOffset
      const pos = pathGenerator(t)
      return [{ event: sortedEvents[0], ...pos, t, index: 0 }]
    }

    // Sample the curve densely and build an arc-length lookup table.
    // NOTE: We sample the full curve for uniform spacing, and handle the center crossover
    // with a *soft* avoidance step (nudging specific points) so we don't compress spacing.
    const samples = []
    const tStart = startOffset
    const tEnd = startOffset + Math.PI * 2
    const dt = 0.002

    // Small visual avoidance radius around the crossover.
    // Keep this conservative to avoid pushing points and causing bunching elsewhere.
    const minCenterDist = Math.max(12, Math.min(36, loopRadius * 0.12))

    let prev = null
    let cumulative = 0
    for (let t = tStart; t <= tEnd + 1e-9; t += dt) {
      const p = pathGenerator(t)
      if (prev) {
        const dx = p.x - prev.x
        const dy = p.y - prev.y
        cumulative += Math.hypot(dx, dy)
      }
      samples.push({ t, x: p.x, y: p.y, s: cumulative })
      prev = p
    }

    const totalLength = samples[samples.length - 1]?.s || 0
    if (totalLength <= 0) {
      return sortedEvents.map((event, i) => {
        const t = tStart + (i / (eventCount + 1)) * (tEnd - tStart)
        const pos = pathGenerator(t)
        return { event, ...pos, t, index: i }
      })
    }

    // Helper: find interpolated point at target arc-length s.
    const pointAtS = (targetS) => {
      // Binary search over samples by s
      let lo = 0
      let hi = samples.length - 1
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2)
        if (samples[mid].s < targetS) lo = mid + 1
        else hi = mid
      }
      const b = samples[Math.min(lo, samples.length - 1)]
      const a = samples[Math.max(0, lo - 1)]
      const span = b.s - a.s
      const u = span > 0 ? (targetS - a.s) / span : 0
      return {
        t: a.t + (b.t - a.t) * u,
        x: a.x + (b.x - a.x) * u,
        y: a.y + (b.y - a.y) * u
      }
    }

    const isTooCloseToCenter = (p) => {
      const dx = p.x - centerX
      const dy = p.y - centerY
      return Math.hypot(dx, dy) < minCenterDist
    }

    // Soft avoidance: if a point lands too close to the crossover, nudge it along the arc
    // until it clears the radius. This preserves overall spacing better than removing
    // chunks of the curve from the arc-length domain.
    const safePointAtS = (targetS) => {
      let p = pointAtS(targetS)
      if (!isTooCloseToCenter(p)) return p

      const step = Math.max(6, totalLength * 0.002)
      const maxSteps = 200

      // Prefer nudging forward to preserve ordering.
      let s = targetS
      for (let i = 0; i < maxSteps && s <= totalLength; i++) {
        s = Math.min(totalLength, s + step)
        p = pointAtS(s)
        if (!isTooCloseToCenter(p)) return p
      }

      // Fallback: try backwards if we hit the end.
      s = targetS
      for (let i = 0; i < maxSteps && s >= 0; i++) {
        s = Math.max(0, s - step)
        p = pointAtS(s)
        if (!isTooCloseToCenter(p)) return p
      }

      // Give up: return the original point.
      return pointAtS(targetS)
    }

    // N+1 slots means final gap equals one normal spacing.
    return sortedEvents.map((event, i) => {
      const targetS = (i / (eventCount + 1)) * totalLength
      const p = safePointAtS(targetS)
      return { event, ...p, index: i }
    })
  })()
  
  console.log('[StaticTimeline] Event positions calculated:', eventPositions.length, 'events')
  
  // Group events by day for coloring
  const eventsByDay = new Map()
  sortedEvents.forEach((event, i) => {
    const day = Math.floor(event.hour / 24)
    if (!eventsByDay.has(day)) {
      eventsByDay.set(day, [])
    }
    eventsByDay.get(day).push({ event, position: eventPositions[i], index: i })
  })
  
  // Add day zones as subtle background arcs
  const dayColors = [
    'rgba(59, 130, 246, 0.08)',  // blue
    'rgba(16, 185, 129, 0.08)',  // green
    'rgba(245, 158, 11, 0.08)',  // amber
    'rgba(239, 68, 68, 0.08)',   // red
    'rgba(168, 85, 247, 0.08)',  // purple
    'rgba(236, 72, 153, 0.08)'   // pink
  ]
  
  eventsByDay.forEach((dayEvents, day) => {
    const color = dayColors[day % dayColors.length]
    const minIdx = Math.min(...dayEvents.map(e => e.index))
    const maxIdx = Math.max(...dayEvents.map(e => e.index))
    
    // Draw arc segment for this day
    const arcPath = []
    for (let i = minIdx; i <= maxIdx; i++) {
      if (i < eventPositions.length) {
        arcPath.push(eventPositions[i])
      }
    }
    
    if (arcPath.length > 1) {
      // Draw thick arc behind events
      const dayLine = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveCardinal)
      
      svg.insert('path', ':first-child')
        .datum(arcPath)
        .attr('d', dayLine)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 40)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.6)
    }
  })
  
  // Add flow arrows between consecutive events
  if (eventPositions.length > 1) {
    for (let i = 0; i < eventPositions.length - 1; i++) {
      const curr = eventPositions[i]
      const next = eventPositions[i + 1]
      
      // Calculate midpoint and angle
      const midX = (curr.x + next.x) / 2
      const midY = (curr.y + next.y) / 2
      const angle = Math.atan2(next.y - curr.y, next.x - curr.x)
      
      // Draw arrow at midpoint
      svg.append('g')
        .attr('transform', `translate(${midX}, ${midY}) rotate(${angle * 180 / Math.PI})`)
        .append('polygon')
        .attr('points', '0,-4 10,0 0,4')
        .attr('fill', stewardColor)
        .attr('opacity', 0.5)
    }
  }
  
  // Create groups for each event
  const eventGroups = svg.append('g')
    .attr('class', 'events')
    .selectAll('g')
    .data(eventPositions)
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
  
  // Render event visualizations
  eventGroups.each(function(d) {
    const group = d3.select(this)
    const event = d.event
    const eventColor = getEventColor(event.type) || stewardColor
    const eventKey = `${event.type}-${event.hour}-${event.envelopeId || event.envelope_id || 'none'}`
    
    // Add data attribute for matching with narrative
    group.attr('data-event-key', eventKey)
    
    // Event particle (matches hddl-map.js particle rendering)
    const particleSize = 12
    
    if (event.type === 'signal' || event.type === 'retrieval') {
      // Circle for signals and retrievals
      group.append('circle')
        .attr('r', particleSize)
        .attr('fill', eventColor)
        .attr('opacity', 0.9)
        .attr('stroke', 'var(--vscode-editor-background)')
        .attr('stroke-width', 2)
    } else if (event.type === 'decision') {
      // Square for decisions
      group.append('rect')
        .attr('x', -particleSize)
        .attr('y', -particleSize)
        .attr('width', particleSize * 2)
        .attr('height', particleSize * 2)
        .attr('fill', eventColor)
        .attr('opacity', 0.8)
        .attr('stroke', 'var(--vscode-editor-background)')
        .attr('stroke-width', 2)
    } else if (event.type === 'boundary_interaction') {
      // Triangle for boundaries
      const size = particleSize * 1.3
      group.append('polygon')
        .attr('points', `0,${-size} ${size},${size} ${-size},${size}`)
        .attr('fill', eventColor)
        .attr('opacity', 0.9)
        .attr('stroke', 'var(--vscode-editor-background)')
        .attr('stroke-width', 2)
    } else if (event.type === 'revision') {
      // Star for revisions
      const star = d3.symbol().type(d3.symbolStar).size(particleSize * particleSize * 3)
      group.append('path')
        .attr('d', star)
        .attr('fill', eventColor)
        .attr('opacity', 0.9)
        .attr('stroke', 'var(--vscode-editor-background)')
        .attr('stroke-width', 2)
    } else if (event.type === 'embedding') {
      // Diamond for embeddings
      group.append('polygon')
        .attr('points', `0,${-particleSize} ${particleSize},0 0,${particleSize} ${-particleSize},0`)
        .attr('fill', eventColor)
        .attr('opacity', 0.8)
        .attr('stroke', 'var(--vscode-editor-background)')
        .attr('stroke-width', 2)
    } else {
      // Default circle
      group.append('circle')
        .attr('r', particleSize)
        .attr('fill', eventColor)
        .attr('opacity', 0.8)
        .attr('stroke', 'var(--vscode-editor-background)')
        .attr('stroke-width', 2)
    }
    
    // Add time label
    const timeLabel = formatSimTime(event.hour || 0)
    group.append('text')
      .attr('dy', particleSize + 16)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .style('text-shadow', '0 0 3px #000000, 0 0 6px #000000, 0 1px 2px rgba(0,0,0,0.8)')
      .text(timeLabel)
    
    // Event type label
    const typeLabels = {
      'signal': 'Signal',
      'decision': 'Decision',
      'boundary_interaction': 'Boundary',
      'revision': 'Revision',
      'escalation': 'Escalation',
      'embedding': 'Embedding',
      'retrieval': 'Retrieval'
    }
    const typeLabel = typeLabels[event.type] || event.type
    
    group.append('text')
      .attr('dy', particleSize + 28)
      .attr('text-anchor', 'middle')
      .attr('fill', eventColor)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .style('text-shadow', '0 0 3px #000000, 0 0 6px #000000, 0 1px 2px rgba(0,0,0,0.8)')
      .text(typeLabel)
    
    // Tooltip on hover
    group.style('cursor', 'pointer')
      .on('mouseenter', function() {
        d3.select(this).selectAll('circle, rect, polygon, path')
          .transition()
          .duration(200)
          .attr('transform', 'scale(1.3)')
        
        // Show tooltip with event details
        showEventTooltip(event, d.x, d.y, eventColor, stewardFilter)
        
        // Highlight corresponding narrative entry
        const narrativeEntry = document.querySelector(`.narrative-entry[data-event-key="${eventKey}"]`)
        if (narrativeEntry) {
          narrativeEntry.style.background = `color-mix(in srgb, ${eventColor} 10%, transparent)`
          narrativeEntry.style.borderLeftWidth = '5px'
          narrativeEntry.style.borderLeftColor = eventColor
          narrativeEntry.style.boxShadow = `inset 0 0 0 1px ${eventColor}80`
          narrativeEntry.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      })
      .on('mouseleave', function() {
        d3.select(this).selectAll('circle, rect, polygon, path')
          .transition()
          .duration(200)
          .attr('transform', 'scale(1)')
        
        hideEventTooltip()
        
        // Remove highlight from narrative entry
        const narrativeEntry = document.querySelector(`.narrative-entry[data-event-key="${eventKey}"]`)
        if (narrativeEntry) {
          narrativeEntry.style.background = `color-mix(in srgb, ${stewardColor} 5%, transparent)`
          narrativeEntry.style.borderLeftWidth = '3px'
          narrativeEntry.style.borderLeftColor = stewardColor
          narrativeEntry.style.boxShadow = ''
        }
      })
      .on('click', function() {
        // Click to scroll narrative to this entry
        const narrativeEntry = document.querySelector(`.narrative-entry[data-event-key="${eventKey}"]`)
        if (narrativeEntry) {
          narrativeEntry.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
  })
  
  // Add steward icon at top center (above infinity symbol)
  renderStewardIcon(svg, centerX, loopRadius * 0.5, stewardFilter, stewardColor)
  
  // Add agents if available
  const agents = scenario.agents || []
  const relevantAgents = agents.filter(agent => {
    // Filter agents that appear in events for this steward
    return sortedEvents.some(ev => ev.agentId === agent.agentId)
  })
  
  if (relevantAgents.length > 0) {
    renderAgents(svg, relevantAgents, centerX, centerY + loopRadius * 0.7, stewardColor)
  }
  
  // Add envelopes
  if (envelopes.length > 0) {
    renderEnvelopes(svg, envelopes, centerX, centerY - loopRadius * 0.7, stewardColor)
  }
}

function renderStewardIcon(svg, cx, cy, stewardName, color) {
  const group = svg.append('g')
    .attr('transform', `translate(${cx}, ${cy})`)
  
  // Steward icon (person with badge)
  const iconSize = 40
  
  // Outer glow
  group.append('circle')
    .attr('r', iconSize + 4)
    .attr('fill', color)
    .attr('opacity', 0.2)
  
  // Main circle
  group.append('circle')
    .attr('r', iconSize)
    .attr('fill', 'var(--vscode-sideBar-background)')
    .attr('stroke', color)
    .attr('stroke-width', 3)
  
  // Person icon
  group.append('circle')
    .attr('cy', -8)
    .attr('r', 10)
    .attr('fill', color)
  
  group.append('path')
    .attr('d', 'M -15,15 Q -15,5 0,5 Q 15,5 15,15 Z')
    .attr('fill', color)
  
  // Badge
  group.append('circle')
    .attr('cx', 16)
    .attr('cy', 16)
    .attr('r', 8)
    .attr('fill', 'var(--status-success)')
    .attr('stroke', 'var(--vscode-editor-background)')
    .attr('stroke-width', 2)
  
  // Label below
  group.append('text')
    .attr('dy', iconSize + 18)
    .attr('text-anchor', 'middle')
    .attr('fill', color)
    .attr('font-size', '14px')
    .attr('font-weight', '600')
    .text(stewardName)
}

function renderAgents(svg, agents, cx, cy, stewardColor) {
  const group = svg.append('g')
    .attr('class', 'agents')
  
  const spacing = 60
  const startX = cx - ((agents.length - 1) * spacing) / 2
  
  agents.forEach((agent, i) => {
    const x = startX + i * spacing
    const agentGroup = group.append('g')
      .attr('transform', `translate(${x}, ${cy})`)
    
    // Agent bot icon
    const size = 16
    
    // Body
    agentGroup.append('rect')
      .attr('x', -size/2)
      .attr('y', -size/2)
      .attr('width', size)
      .attr('height', size)
      .attr('rx', 3)
      .attr('fill', 'var(--vscode-button-secondaryBackground)')
      .attr('stroke', stewardColor)
      .attr('stroke-width', 2)
    
    // Eyes
    agentGroup.append('circle')
      .attr('cx', -size/4)
      .attr('cy', -size/6)
      .attr('r', 2)
      .attr('fill', stewardColor)
    
    agentGroup.append('circle')
      .attr('cx', size/4)
      .attr('cy', -size/6)
      .attr('r', 2)
      .attr('fill', stewardColor)
    
    // Label
    agentGroup.append('text')
      .attr('dy', size + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--vscode-foreground)')
      .attr('font-size', '10px')
      .text(agent.agentId || `Agent ${i + 1}`)
  })
}

function renderEnvelopes(svg, envelopes, cx, cy, stewardColor) {
  const group = svg.append('g')
    .attr('class', 'envelopes')
  
  const spacing = 80
  const startX = cx - ((envelopes.length - 1) * spacing) / 2
  
  envelopes.forEach((env, i) => {
    const x = startX + i * spacing
    const envGroup = group.append('g')
      .attr('transform', `translate(${x}, ${cy})`)
    
    // Simplified envelope shape
    const w = 30
    const h = 20
    
    envGroup.append('rect')
      .attr('x', -w/2)
      .attr('y', -h/2)
      .attr('width', w)
      .attr('height', h)
      .attr('fill', 'var(--vscode-input-background)')
      .attr('stroke', stewardColor)
      .attr('stroke-width', 2)
      .attr('rx', 2)
    
    // Flap
    envGroup.append('path')
      .attr('d', `M ${-w/2},${-h/2} L 0,${h/6} L ${w/2},${-h/2}`)
      .attr('fill', 'none')
      .attr('stroke', stewardColor)
      .attr('stroke-width', 1.5)
    
    // Label
    envGroup.append('text')
      .attr('dy', h + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', stewardColor)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text(env.envelopeId || `ENV ${i + 1}`)
    
    // Add tooltip on hover
    envGroup.style('cursor', 'pointer')
      .on('mouseenter', function(event) {
        d3.select(this).select('rect')
          .transition()
          .duration(200)
          .attr('transform', 'scale(1.2)')
        
        showEnvelopeTooltip(env, event.pageX, event.pageY, stewardColor)
      })
      .on('mouseleave', function() {
        d3.select(this).select('rect')
          .transition()
          .duration(200)
          .attr('transform', 'scale(1)')
        
        hideEnvelopeTooltip()
      })
  })
}

// Tooltip for events
let tooltipDiv = null

function showEventTooltip(event, x, y, color, stewardFilter) {
  if (!tooltipDiv) {
    tooltipDiv = document.createElement('div')
    tooltipDiv.style.cssText = `
      position: fixed;
      background: color-mix(in srgb, ${color} 20%, #1e1e1e);
      border: 2px solid ${color};
      color: var(--vscode-foreground);
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 12px;
      pointer-events: none;
      z-index: 10001;
      max-width: 300px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    `
    document.body.appendChild(tooltipDiv)
  }
  
  const typeIcons = {
    'signal': '📡',
    'decision': '✓',
    'boundary_interaction': '⚠',
    'revision': '📝',
    'escalation': '⬆',
    'embedding': '🧠',
    'retrieval': '🔍'
  }
  const icon = typeIcons[event.type] || '•'
  
  tooltipDiv.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px; color: ${color}; font-size: 14px;">
      ${icon} ${event.type}
    </div>
    <div style="display: grid; gap: 4px; opacity: 0.95;">
      ${event.eventId ? `<div><strong>ID:</strong> ${event.eventId}</div>` : ''}
      <div><strong>Time:</strong> ${formatSimTime(event.hour || 0)}</div>
      ${event.envelopeId || event.envelope_id ? `<div><strong>Envelope:</strong> ${event.envelopeId || event.envelope_id}</div>` : ''}
      ${event.agentId ? `<div><strong>Agent:</strong> ${event.agentId}</div>` : ''}
      ${event.status ? `<div><strong>Status:</strong> ${event.status}</div>` : ''}
      ${event.boundary_kind ? `<div><strong>Boundary:</strong> ${event.boundary_kind}</div>` : ''}
      ${event.label || event.summary ? `<div style="margin-top: 6px; font-style: italic; opacity: 0.9;">${event.label || event.summary}</div>` : ''}
    </div>
  `
  
  tooltipDiv.style.left = `${x + 20}px`
  tooltipDiv.style.top = `${y + 20}px`
  tooltipDiv.style.display = 'block'
}

function hideEventTooltip() {
  if (tooltipDiv) {
    tooltipDiv.style.display = 'none'
  }
}
// Tooltip for envelopes
let envelopeTooltipDiv = null

function showEnvelopeTooltip(envelope, x, y, color) {
  if (!envelopeTooltipDiv) {
    envelopeTooltipDiv = document.createElement('div')
    envelopeTooltipDiv.style.cssText = `
      position: fixed;
      background: color-mix(in srgb, ${color} 20%, #1e1e1e);
      border: 2px solid ${color};
      color: var(--vscode-foreground);
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 12px;
      pointer-events: none;
      z-index: 10001;
      max-width: 300px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    `
    document.body.appendChild(envelopeTooltipDiv)
  }
  
  envelopeTooltipDiv.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px; color: ${color}; font-size: 14px;">
      📧 Envelope
    </div>
    <div style="display: grid; gap: 4px; opacity: 0.95;">
      <div><strong>ID:</strong> ${envelope.envelopeId}</div>
      <div><strong>Owner:</strong> ${envelope.ownerRole}</div>
      ${envelope.subject ? `<div><strong>Subject:</strong> ${envelope.subject}</div>` : ''}
      ${envelope.summary ? `<div style="margin-top: 6px; font-style: italic; opacity: 0.9;">${envelope.summary}</div>` : ''}
    </div>
  `
  
  envelopeTooltipDiv.style.left = `${x + 20}px`
  envelopeTooltipDiv.style.top = `${y + 20}px`
  envelopeTooltipDiv.style.display = 'block'
}

function hideEnvelopeTooltip() {
  if (envelopeTooltipDiv) {
    envelopeTooltipDiv.style.display = 'none'
  }
}

// Narrative panel rendering
function renderNarrativePanel(container, stewardFilter, stewardColor) {
  // Clear any existing content from container
  container.innerHTML = ''
  
  const scenario = getScenario()
  if (!scenario) return
  
  const events = scenario.events || []
  const envelopes = scenario.envelopes || []
  
  // Filter envelopes for this steward
  const filteredEnvelopes = envelopes.filter(env => env.ownerRole === stewardFilter)
  const filteredEnvelopeIds = new Set(filteredEnvelopes.map(e => e.envelopeId))
  
  // Get the maximum hour from all events (end state)
  const maxHour = events.length > 0 ? Math.max(...events.map(e => e.hour || 0)) : 0
  
  // Filter ALL events for this steward's envelopes (show complete timeline)
  const narratableTypes = ['envelope_promoted', 'signal', 'boundary_interaction', 'escalation', 'revision', 'dsg_session', 'decision']
  const filteredEvents = events
    .filter(e => narratableTypes.includes(e.type))
    .filter(e => {
      const envId = e.envelopeId || e.envelope_id
      return !envId || filteredEnvelopeIds.has(envId)
    })
    .sort((a, b) => a.hour - b.hour) // Oldest first (chronological order)
  
  // Panel title
  const title = document.createElement('div')
  title.style.cssText = `
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--vscode-statusBar-foreground);
    border-bottom: 1px solid var(--vscode-panel-border);
    padding-bottom: 8px;
    margin-bottom: 8px;
  `
  title.textContent = 'Narrative'
  container.appendChild(title)
  
  // Status line
  const statusLine = document.createElement('div')
  statusLine.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: var(--vscode-statusBar-foreground);
    padding: 8px;
    background: color-mix(in srgb, ${stewardColor} 8%, transparent);
    border-left: 3px solid ${stewardColor};
    border-radius: 4px;
    margin-bottom: 12px;
  `
  const activeEnvelopes = filteredEnvelopes.filter(e => getEnvelopeStatus(e, maxHour) === 'active')
  statusLine.innerHTML = `
    <span><span class="codicon codicon-history"></span> End: ${formatSimTime(maxHour)}</span>
    <span>Active: ${activeEnvelopes.length}</span>
  `
  container.appendChild(statusLine)
  
  // Events list
  if (filteredEvents.length === 0) {
    const emptyMsg = document.createElement('div')
    emptyMsg.style.cssText = `
      font-size: 12px;
      color: var(--vscode-statusBar-foreground);
      padding: 8px;
      text-align: center;
      font-style: italic;
    `
    emptyMsg.textContent = 'No events yet for this steward'
    container.appendChild(emptyMsg)
    return
  }
  
  filteredEvents.forEach(event => {
    const eventKey = `${event.type}-${event.hour}-${event.envelopeId || event.envelope_id || 'none'}`
    const eventEl = document.createElement('div')
    eventEl.className = 'narrative-entry'
    eventEl.dataset.eventKey = eventKey
    eventEl.style.cssText = `
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 8px;
      border-radius: 4px;
      background: color-mix(in srgb, ${stewardColor} 5%, transparent);
      border-left: 3px solid ${stewardColor};
      margin-bottom: 6px;
      font-size: 12px;
      line-height: 1.4;
      cursor: pointer;
      transition: all 0.2s;
    `
    
    // Hover effect
    eventEl.addEventListener('mouseenter', () => {
      eventEl.style.background = `color-mix(in srgb, ${stewardColor} 10%, transparent)`
      eventEl.style.borderLeftWidth = '5px'
      eventEl.style.borderLeftColor = eventColor
      eventEl.style.boxShadow = `inset 0 0 0 1px ${eventColor}40`
      eventEl.style.transform = 'translateX(4px)'
      // Highlight corresponding timeline particle
      const timelineParticle = document.querySelector(`[data-event-key="${eventKey}"]`)
      if (timelineParticle) {
        timelineParticle.style.filter = 'brightness(1.5) drop-shadow(0 0 8px currentColor)'
      }
    })
    
    eventEl.addEventListener('mouseleave', () => {
      eventEl.style.background = `color-mix(in srgb, ${stewardColor} 5%, transparent)`
      eventEl.style.borderLeftWidth = '3px'
      eventEl.style.borderLeftColor = stewardColor
      eventEl.style.boxShadow = ''
      eventEl.style.transform = 'translateX(0)'
      // Remove highlight from timeline particle
      const timelineParticle = document.querySelector(`[data-event-key="${eventKey}"]`)
      if (timelineParticle) {
        timelineParticle.style.filter = ''
      }
    })
    
    const eventColor = getEventColor(event.type) || stewardColor
    const dot = document.createElement('div')
    dot.style.cssText = `
      flex-shrink: 0;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${eventColor};
      margin-top: 4px;
    `
    
    const content = document.createElement('div')
    content.style.cssText = 'min-width: 0; flex: 1;'
    
    const time = document.createElement('div')
    time.style.cssText = `
      font-family: monospace;
      font-size: 10px;
      color: var(--vscode-statusBar-foreground);
      margin-bottom: 4px;
    `
    time.textContent = formatSimTime(event.hour)
    
    const text = document.createElement('div')
    text.style.cssText = 'color: var(--vscode-foreground);'
    text.innerHTML = formatEventNarrative(event, envelopes)
    
    content.appendChild(time)
    content.appendChild(text)
    
    eventEl.appendChild(dot)
    eventEl.appendChild(content)
    
    container.appendChild(eventEl)
  })
}

function formatEventNarrative(event, envelopes) {
  const envMap = new Map(envelopes.map(e => [e.envelopeId, e]))
  const envId = event.envelopeId || event.envelope_id
  const env = envId ? envMap.get(envId) : null
  const envName = env ? `<strong>${envId}</strong>` : 'system'
  const agent = event.actorName || event.agentId || 'Agent'
  
  switch (event.type) {
    case 'envelope_promoted':
      return `Envelope ${envName} promoted`
    case 'signal':
      const signalLabel = event.label || event.detail || 'Signal detected'
      return `${agent}: ${signalLabel} in ${envName}`
    case 'boundary_interaction':
      const kind = event.boundary_kind || 'boundary'
      const reason = event.boundary_reason ? ` (${event.boundary_reason})` : ''
      return `${agent} <strong>${kind}</strong> in ${envName}${reason}`
    case 'escalation':
      return `${agent} escalated to steward in ${envName}`
    case 'revision':
      const detail = event.detail || event.label || 'Policy updated'
      return `<strong>Revision:</strong> ${detail} in ${envName}`
    case 'decision':
      const status = event.status || 'executed'
      const decisionLabel = event.label || event.detail || 'Decision'
      return `${agent} <strong>${status}</strong>: ${decisionLabel} in ${envName}`
    case 'dsg_session':
      return `<strong>DSG Session:</strong> ${event.title || 'Review'}`
    default:
      return `${event.type} in ${envName}`
  }
}
