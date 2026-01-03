/**
 * Tooltip Manager for HDDL Map
 * 
 * Manages D3-powered tooltips for agents, envelopes, and stewards.
 * Handles tooltip creation, positioning, show/hide lifecycle, and auto-hide timeouts.
 * 
 * Exports:
 * - canHoverTooltip() - Check if hover is supported (pointer: fine)
 * - shouldShowHoverTooltip(evt) - Check if event should trigger tooltip
 * - Agent tooltips: showAgentTooltip(), hideAgentTooltip()
 * - Envelope tooltips: showEnvelopeTooltip(), hideEnvelopeTooltip()
 * - Steward tooltips: showStewardTooltip(), hideStewardTooltip()
 * - getStewardEnvelopeInteractionCount() - Helper for steward activity metrics
 */

import * as d3 from 'd3'
import { getEnvelopeStatus, getTimeHour } from '../../sim/sim-state'

// Tooltip DOM nodes (lazily created)
let agentTooltip = null
let agentTooltipHideTimeout = null

let envelopeTooltip = null
let envelopeTooltipHideTimeout = null

let stewardTooltip = null
let stewardTooltipHideTimeout = null

/**
 * Check if hover is supported (pointer: fine, not touch).
 * @returns {boolean} True if hover interactions are supported
 */
export const canHoverTooltip = () => {
  try {
    return window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  } catch {
    return false
  }
}

/**
 * Check if a pointer event should show hover tooltip.
 * @param {PointerEvent} evt - Pointer event
 * @returns {boolean} True if tooltip should be shown
 */
export const shouldShowHoverTooltip = (evt) => {
  const pt = evt?.pointerType
  return computeShouldShowHoverTooltipDecision({ canHover: canHoverTooltip(), pointerType: pt })
}

export function computeShouldShowHoverTooltipDecision({ canHover, pointerType }) {
  if (canHover) return true
  return pointerType === 'mouse' || pointerType === 'pen'
}

export function computeAgentTooltipHtml({ name, role, isRecentlyActive, fleetRole, fleetColor }) {
  return `
        <div style="font-weight: 600; margin-bottom: 6px; font-size: 16px;">${name}</div>
        <div style="font-size: 13px; opacity: 0.85; margin-bottom: 8px;">${role || ''}</div>
        <div style="font-size: 13px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
          <span style="color: ${isRecentlyActive ? '#4ec9b0' : '#cccccc'};">
            ${isRecentlyActive ? '● Active' : '○ Idle'}
          </span>
        </div>
        ${fleetRole ? `<div style="margin-top: 8px; font-size: 13px; opacity: 0.85;">
          <span style="opacity:0.75;">Steward:</span>
          <span style="font-weight: 700; color: ${fleetColor};">${fleetRole}</span>
        </div>` : ''}
      `
}

export function computeEnvelopeTooltipHtml({ label, id, name, ownerRole }) {
  return `
      <div style="font-weight: 600; margin-bottom: 6px; font-size: 16px;">${label || id || 'Envelope'}</div>
      <div style="font-size: 13px; opacity: 0.85; margin-bottom: 8px;">${name || ''}</div>
      <div style="font-size: 13px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
        <span style="opacity:0.75;">Steward:</span>
        <span style="font-weight: 700;">${ownerRole || 'Unknown'}</span>
      </div>
    `
}

export function computeActiveAgentCount({ agents, events, usedHour, windowHours = 6 }) {
  const start = usedHour - windowHours
  const safeAgents = agents || []
  const safeEvents = events || []
  let count = 0

  for (const agent of safeAgents) {
    const agentId = agent?.agentId
    if (!agentId) continue

    let active = false
    for (const e of safeEvents) {
      if (!e || e.agentId !== agentId) continue
      if (typeof e.hour !== 'number') continue
      if (e.hour <= usedHour && e.hour > start) {
        active = true
        break
      }
    }

    if (active) count += 1
  }

  return count
}

export function computeStewardTooltipStats({
  scenario,
  hour,
  stewardRole,
  getEnvelopeStatus: getEnvelopeStatusImpl = getEnvelopeStatus,
  getTimeHour: getTimeHourImpl = getTimeHour,
}) {
  const usedHour = typeof hour === 'number' ? hour : getTimeHourImpl()

  const allEnvelopes = scenario?.envelopes || []
  const ownedEnvelopes = allEnvelopes.filter(e => e && e.ownerRole === stewardRole)
  const activeEnvelopes = ownedEnvelopes.filter(e => {
    const status = getEnvelopeStatusImpl(e, usedHour)
    return status === 'active'
  })

  const fleets = scenario?.fleets || []
  const fleet = fleets.find(f => f && f.stewardRole === stewardRole)
  const agents = fleet?.agents || []

  return {
    ownedEnvelopesCount: ownedEnvelopes.length,
    activeEnvelopesCount: activeEnvelopes.length,
    agentCount: agents.length,
    activeAgentCount: computeActiveAgentCount({ agents, events: scenario?.events || [], usedHour, windowHours: 6 }),
    usedHour,
  }
}

export function computeStewardTooltipHtml({ stewardRole, stewardColor, stats }) {
  const activeEnvelopesCount = stats?.activeEnvelopesCount || 0
  const ownedEnvelopesCount = stats?.ownedEnvelopesCount || 0
  const activeAgentCount = stats?.activeAgentCount || 0
  const agentCount = stats?.agentCount || 0

  return `
      <div style="font-weight: 800; font-size: 16px; margin-bottom: 6px; color: ${stewardColor};">${stewardRole}</div>
      <div style="font-size: 13px; opacity: 0.85; margin-bottom: 8px;">Human Decision Authority</div>
      
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 13px;">
        <div style="display:flex; justify-content: space-between; gap: 12px; margin-bottom: 6px;">
          <div style="opacity: 0.75;">Envelopes</div>
          <div>${activeEnvelopesCount} active / ${ownedEnvelopesCount} total</div>
        </div>
        <div style="display:flex; justify-content: space-between; gap: 12px;">
          <div style="opacity: 0.75;">Fleet</div>
          <div>${activeAgentCount} working / ${agentCount} agents</div>
        </div>
      </div>
    `
}

/**
 * Ensure agent tooltip exists and return it.
 * @returns {d3.Selection} D3 selection of tooltip element
 */
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

/**
 * Hide agent tooltip and clear auto-hide timeout.
 */
export function hideAgentTooltip() {
  if (agentTooltipHideTimeout) {
    clearTimeout(agentTooltipHideTimeout)
    agentTooltipHideTimeout = null
  }
  if (agentTooltip && !agentTooltip.empty()) {
    agentTooltip.style('display', 'none')
  }
}

/**
 * Ensure envelope tooltip exists and return it.
 * @returns {d3.Selection} D3 selection of tooltip element
 */
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

/**
 * Hide envelope tooltip and clear auto-hide timeout.
 */
export function hideEnvelopeTooltip() {
  if (envelopeTooltipHideTimeout) {
    clearTimeout(envelopeTooltipHideTimeout)
    envelopeTooltipHideTimeout = null
  }
  if (envelopeTooltip && !envelopeTooltip.empty()) {
    envelopeTooltip.style('display', 'none')
  }
}

/**
 * Ensure steward tooltip exists and return it.
 * @returns {d3.Selection} D3 selection of tooltip element
 */
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

/**
 * Hide steward tooltip and clear auto-hide timeout.
 */
export function hideStewardTooltip() {
  if (stewardTooltipHideTimeout) {
    clearTimeout(stewardTooltipHideTimeout)
    stewardTooltipHideTimeout = null
  }
  if (stewardTooltip && !stewardTooltip.empty()) {
    stewardTooltip.style('display', 'none')
  }
}

/**
 * Show steward tooltip with fleet and envelope statistics.
 * @param {Object} stewardNode - Steward data object (id, name, color)
 * @param {MouseEvent} mouseEvent - Mouse event for positioning
 * @param {Element} element - DOM element for fallback positioning
 * @param {Object} options - { scenario, hour }
 */
export function showStewardTooltip(stewardNode, mouseEvent, element, { scenario = null, hour = null } = {}) {
  const tooltipNode = ensureStewardTooltip()

  tooltipNode.style('display', 'block')

  const stewardKey = String(stewardNode?.id || stewardNode?.name || '')
  const stewardRole = stewardNode?.name || ''
  const stewardColor = stewardNode?.color || 'var(--vscode-textLink-foreground)'

  const stats = computeStewardTooltipStats({ scenario, hour, stewardRole })

  tooltipNode
    .attr('data-steward-key', stewardKey)
    .html(computeStewardTooltipHtml({ stewardRole, stewardColor, stats }))

  positionTooltip(tooltipNode, mouseEvent, element)
}

/**
 * Show envelope tooltip with name and steward.
 * @param {Object} envelopeNode - Envelope data object (id, label, name, ownerRole)
 * @param {MouseEvent} mouseEvent - Mouse event for positioning
 * @param {Element} element - DOM element for fallback positioning
 * @param {Object} options - { scenario, hour, autoHideMs }
 */
export function showEnvelopeTooltip(envelopeNode, mouseEvent, element, { scenario = null, hour = null, autoHideMs = null } = {}) {
  const tooltipNode = ensureEnvelopeTooltip()

  tooltipNode
    .html(computeEnvelopeTooltipHtml({
      label: envelopeNode?.label,
      id: envelopeNode?.id,
      name: envelopeNode?.name,
      ownerRole: envelopeNode?.ownerRole,
    }))
    .style('display', 'block')

  positionTooltip(tooltipNode, mouseEvent, element)

  if (envelopeTooltipHideTimeout) {
    clearTimeout(envelopeTooltipHideTimeout)
    envelopeTooltipHideTimeout = null
  }
  if (typeof autoHideMs === 'number' && autoHideMs > 0) {
    envelopeTooltipHideTimeout = setTimeout(() => hideEnvelopeTooltip(), autoHideMs)
  }
}

export function computeTooltipFixedPosition({
  pointer,
  anchorRect,
  tooltipSize,
  viewport,
  padding = 10,
  offsetX = 12,
  offsetY = 10,
}) {
  const tooltipWidth = tooltipSize?.width || 0
  const tooltipHeight = tooltipSize?.height || 0
  const vw = viewport?.width || 0
  const vh = viewport?.height || 0

  let x
  let y

  if (pointer && typeof pointer.x === 'number' && typeof pointer.y === 'number') {
    x = pointer.x + offsetX
    y = pointer.y - offsetY
  } else if (anchorRect && typeof anchorRect.left === 'number' && typeof anchorRect.top === 'number') {
    x = anchorRect.left + (anchorRect.width || 0) / 2
    y = anchorRect.top
  } else {
    x = padding
    y = padding
  }

  // Prefer above-cursor placement when we have a pointer
  if (pointer && tooltipHeight) {
    y = pointer.y - tooltipHeight - 12
  } else if (anchorRect && tooltipHeight) {
    y = y - tooltipHeight - 10
  }

  if (tooltipWidth && vw) {
    x = Math.max(padding, Math.min(x, vw - tooltipWidth - padding))
  }
  if (tooltipHeight && vh) {
    y = Math.max(padding, Math.min(y, vh - tooltipHeight - padding))
  }

  return { left: x, top: y }
}

/**
 * Position tooltip relative to mouse cursor or anchor element.
 * @param {d3.Selection} tooltipNode - D3 selection of tooltip element
 * @param {MouseEvent} mouseEvent - Mouse event for positioning
 * @param {Element} anchorEl - DOM element for fallback positioning
 */
function positionTooltip(tooltipNode, mouseEvent, anchorEl) {
  const node = tooltipNode.node()
  const { left: x, top: y } = computeTooltipFixedPosition({
    pointer: mouseEvent && typeof mouseEvent.clientX === 'number' && typeof mouseEvent.clientY === 'number'
      ? { x: mouseEvent.clientX, y: mouseEvent.clientY }
      : null,
    anchorRect: anchorEl && typeof anchorEl.getBoundingClientRect === 'function'
      ? anchorEl.getBoundingClientRect()
      : null,
    tooltipSize: { width: node?.offsetWidth || 0, height: node?.offsetHeight || 0 },
    viewport: { width: window.innerWidth || 0, height: window.innerHeight || 0 },
  })

  tooltipNode
    .style('left', `${x}px`)
    .style('top', `${y}px`)
    .style('transform', null)
}

/**
 * Show agent tooltip with name, role, status, and fleet info.
 * @param {Object} agentNode - Agent data object (id, name, role, fleetRole, fleetColor, isRecentlyActive)
 * @param {MouseEvent} mouseEvent - Mouse event for positioning
 * @param {Element} element - DOM element for fallback positioning
 * @param {Object} options - { autoHideMs }
 */
export function showAgentTooltip(agentNode, mouseEvent, element, { autoHideMs = null } = {}) {
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
      .html(computeAgentTooltipHtml({
        name: agentNode?.name,
        role: agentNode?.role,
        isRecentlyActive: agentNode?.isRecentlyActive,
        fleetRole,
        fleetColor,
      }))
  }

  positionTooltip(tooltipNode, mouseEvent, element)

  if (agentTooltipHideTimeout) {
    clearTimeout(agentTooltipHideTimeout)
    agentTooltipHideTimeout = null
  }
  if (typeof autoHideMs === 'number' && autoHideMs > 0) {
    agentTooltipHideTimeout = setTimeout(() => hideAgentTooltip(), autoHideMs)
  }
}

/**
 * Count steward interactions with an envelope in a time window.
 * @param {Object} scenario - Scenario data
 * @param {number} hour - Current simulation hour
 * @param {string} envelopeId - Envelope ID
 * @param {string} stewardRole - Steward role name
 * @param {number} windowHours - Time window to search (default 24)
 * @returns {{ count: number, hasEscalation: boolean }} Interaction count and escalation flag
 */
export function getStewardEnvelopeInteractionCount(scenario, hour, envelopeId, stewardRole, windowHours = 24) {
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
