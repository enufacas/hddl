export function renderStewardEnter({
  d3,
  nodeEnter,
  showStewardTooltip,
  hideStewardTooltip,
  getScenario,
  getTimeHour,
}) {
  // Steward Circle
  nodeEnter.filter((d) => d.type === 'steward')
    .append('circle')
    .attr('class', 'steward-circle')
    .attr('r', (d) => d.r)
    .attr('fill', 'var(--vscode-editor-background)')
    .attr('stroke', (d) => d.color || 'var(--status-warning)')
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
  const stewardIcon = nodeEnter.filter((d) => d.type === 'steward')
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
}

export function computeAgentTextAnchor({ useLeftSide }) {
  return useLeftSide ? 'end' : 'start'
}

export function computeAgentNameX({ useLeftSide, gridScale, botScale }) {
  const scale = (gridScale || 1.0) * (botScale || 1.0)
  return useLeftSide ? -16 * scale : 16 * scale
}

export function computeAgentRoleX({ useLeftSide }) {
  return useLeftSide ? -16 : 16
}

export function computeAgentFontSizePx({ detailLevel, gridScale, DETAIL_LEVELS }) {
  const baseSize = detailLevel === DETAIL_LEVELS.STANDARD ? 8 : 9
  return `${Math.max(7, baseSize * (gridScale || 1.0))}px`
}

export function computeAgentNameText({ agentDensityConfig, agent, detailLevel, getAdaptiveAgentName }) {
  const shouldShowName = !!agentDensityConfig?.showName && agent?.showName !== false
  if (!shouldShowName) return ''
  return getAdaptiveAgentName(agent?.name, detailLevel)
}

export function computeAgentBotTransform({ gridScale, botScale }) {
  return `scale(${(gridScale || 1.0) * (botScale || 1.0)})`
}

export function computeAgentBotTestId({ id }) {
  return `agent-${id || 'unknown'}`
}

export function computeAgentBotActiveAttr({ isRecentlyActive }) {
  return isRecentlyActive ? 'true' : 'false'
}

export function computeAgentBotStroke({ fleetColor, fallback = 'var(--vscode-sideBar-border)' }) {
  return fleetColor || fallback
}

export function computeAgentBotFill({ fleetColor, fallback = 'var(--vscode-statusBar-foreground)' }) {
  return fleetColor || fallback
}

export function computeAgentNameVisibility({ agentDensityConfig, agent }) {
  const shouldShowName = !!agentDensityConfig?.showName && agent?.showName !== false
  return shouldShowName ? 'visible' : 'hidden'
}

export function computeAgentNameOpacity({ agentDensityConfig, agent }) {
  const shouldShowName = !!agentDensityConfig?.showName && agent?.showName !== false
  if (!shouldShowName) return 0
  return agent?.isRecentlyActive ? 1 : 0.55
}

export function computeAgentNameFontSizePxForUpdate({ detailLevel, gridScale, DETAIL_LEVELS }) {
  const baseSize = detailLevel === DETAIL_LEVELS.STANDARD ? 10 : 11
  return `${Math.max(9, baseSize * (gridScale || 1.0))}px`
}

export function computeAgentRoleVisibility({ agentDensityConfig, agent }) {
  const shouldShowRole = !!agentDensityConfig?.showRole && agent?.showName !== false
  return shouldShowRole ? 'visible' : 'hidden'
}

export function computeAgentRoleOpacity({ agentDensityConfig, agent }) {
  const shouldShowRole = !!agentDensityConfig?.showRole && agent?.showName !== false
  return shouldShowRole ? 0.65 : 0
}

export function computeAgentRoleText({ agentDensityConfig, agent, truncateWithEllipsis }) {
  const shouldShowRole = !!agentDensityConfig?.showRole && agent?.showName !== false
  if (!shouldShowRole || !agent?.role) return ''
  return truncateWithEllipsis(agent.role, 26)
}

export function computeAgentHaloStroke({ isRecentlyActive, fleetColor, fallback = 'var(--vscode-textLink-foreground)' }) {
  return isRecentlyActive ? (fleetColor || fallback) : 'transparent'
}

export function computeAgentHaloOpacity({ isRecentlyActive }) {
  return isRecentlyActive ? 0.7 : 0
}

export function computeAgentHaloRadius({ isRecentlyActive, botScale }) {
  return (isRecentlyActive ? 18 : 16) * (botScale || 1.0)
}

export function computeAgentCompactDotFill({ isRecentlyActive, fleetColor, fallback = 'var(--vscode-textLink-foreground)' }) {
  return isRecentlyActive ? (fleetColor || fallback) : 'var(--vscode-editor-background)'
}

export function computeAgentCompactDotStroke({ fleetColor, fallback = 'var(--vscode-sideBar-border)' }) {
  return fleetColor || fallback
}

export function computeAgentCompactDotOpacity({ isRecentlyActive }) {
  return isRecentlyActive ? 1 : 0.5
}

export function computeAgentCompactDotFilter({ isRecentlyActive, fleetColor, fallback = 'var(--vscode-textLink-foreground)' }) {
  if (!isRecentlyActive) return 'none'
  return `drop-shadow(0 0 4px ${fleetColor || fallback})`
}

export function computeAgentMinimalDotOpacity({ isRecentlyActive }) {
  return isRecentlyActive ? 0.9 : 0.4
}

export function computeAgentMinimalDotFill({ fleetColor, fallback = 'var(--vscode-sideBar-border)' }) {
  return fleetColor || fallback
}

export function computeAgentMinimalDotFilter({ isRecentlyActive, fleetColor, fallback = 'var(--vscode-sideBar-border)' }) {
  if (!isRecentlyActive) return 'none'
  return `drop-shadow(0 0 3px ${fleetColor || fallback})`
}

export function computeAgentBotPartOpacity({ isActive }) {
  return isActive ? 1 : 0.45
}

export function computeAgentBotEyeOpacity({ isActive }) {
  return isActive ? 1 : 0.35
}

export function computeAgentHaloPulseKeyframes({ botScale }) {
  const scale = botScale || 1.0
  return {
    low: { opacity: 0.4, r: 16 * scale },
    high: { opacity: 0.7, r: 18 * scale },
  }
}

export function computeLabelTextAnchor({ type }) {
  if (type === 'agent') return 'end'
  if (type === 'steward') return 'start'
  return 'middle'
}

export function computeLabelX({ type, r }) {
  if (type === 'agent') return -(r || 0) - 5
  if (type === 'steward') return (r || 0) + 5
  return 0
}

export function computeLabelMainDy({ type }) {
  return type === 'envelope' ? 5 : 4
}

export function computeLabelSubDy({ type }) {
  return type === 'envelope' ? 20 : 15
}

export function computeLabelFontWeight({ type }) {
  return type === 'envelope' ? 'bold' : 'normal'
}

export function computeLabelMainOpacity({ detailLevel, DETAIL_LEVELS, status }) {
  if (detailLevel === DETAIL_LEVELS.MINIMAL) return 0
  if (status === 'pending') return 0.6
  if (status === 'ended') return 0.75
  return 1
}

export function computeLabelMainFontSize({ type, detailLevel, DETAIL_LEVELS }) {
  if (type === 'envelope') {
    return detailLevel === DETAIL_LEVELS.COMPACT ? '10px' : '12px'
  }
  return detailLevel === DETAIL_LEVELS.COMPACT ? '8px' : '10px'
}

export function computeLabelMainText({ node, detailLevel, getAdaptiveEnvelopeLabel, getAdaptiveStewardLabel, getAdaptiveAgentName }) {
  if (node?.type === 'envelope') {
    const adaptive = getAdaptiveEnvelopeLabel(node.label, node.name, detailLevel)
    return adaptive.label
  }
  if (node?.type === 'steward') {
    const adaptive = getAdaptiveStewardLabel(node.name, '', detailLevel)
    return adaptive.name
  }
  if (node?.type === 'agent') return getAdaptiveAgentName(node.name, detailLevel)
  return ''
}

export function computeLabelSubOpacity({ detailLevel, DETAIL_LEVELS, status }) {
  if (detailLevel === DETAIL_LEVELS.COMPACT || detailLevel === DETAIL_LEVELS.MINIMAL) return 0
  if (status === 'pending') return 0.5
  if (status === 'ended') return 0.6
  return 0.7
}

export function updateStewardRendering({ d3, nodeUpdate }) {
  // Update steward circle rotation based on processing state
  nodeUpdate.filter((d) => d.type === 'steward').select('circle.steward-circle')
    .each(function (d) {
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
              .attrTween('stroke-dashoffset', function () {
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

  // Steward icon stroke matches steward ring.
  nodeUpdate.selectAll('g.steward-icon').selectAll('circle, path')
    .attr('stroke', (d) => d.color || 'var(--status-warning)')
}

export function renderAgentEnter({
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
}) {
  // Agents (density-aware rendering)
  // Full/Standard: Bot glyph with name/role
  // Compact: Small bot icon, fleet count badge visible
  // Minimal: Just a colored dot
  const agentDensityConfig = getAgentDensity(detailLevel)
  const agentEnter = nodeEnter.filter((d) => d.type === 'agent')

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
    .attr('fill', (d) => computeAgentMinimalDotFill({ fleetColor: d.fleetColor }))
    .attr('stroke', 'var(--vscode-editor-background)')
    .attr('stroke-width', 1)
    .attr('opacity', (d) => computeAgentMinimalDotOpacity({ isRecentlyActive: d.isRecentlyActive }))

  // Compact mode: small dot with count (count rendered at fleet level)
  agentEnter.filter(() => agentDensityConfig.density === 'compact')
    .append('circle')
    .attr('class', 'agent-compact-dot')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 8)
    .attr('fill', (d) => computeAgentCompactDotFill({ isRecentlyActive: d.isRecentlyActive, fleetColor: d.fleetColor }))
    .attr('stroke', (d) => computeAgentCompactDotStroke({ fleetColor: d.fleetColor }))
    .attr('stroke-width', 2)
    .attr('opacity', (d) => computeAgentCompactDotOpacity({ isRecentlyActive: d.isRecentlyActive }))

  // Bot glyph (head + antenna + eyes) - full and standard modes, scaled by grid
  const bot = agentEnter.filter(() => agentDensityConfig.density === 'full' || agentDensityConfig.density === 'standard')
    .append('g')
    .attr('class', 'agent-bot')
    .attr('data-testid', (d) => computeAgentBotTestId({ id: d.id }))
    .attr('data-agent-active', (d) => computeAgentBotActiveAttr({ isRecentlyActive: d.isRecentlyActive }))
    .attr('stroke', (d) => computeAgentBotStroke({ fleetColor: d.fleetColor }))
    .attr('fill', (d) => computeAgentBotFill({ fleetColor: d.fleetColor }))
    .attr('tabindex', 0)
    .style('pointer-events', 'all')
    .style('cursor', 'pointer')
    .attr('opacity', 0.95)
    .attr('transform', (d) => computeAgentBotTransform({ gridScale: d.gridScale, botScale: agentDensityConfig.botScale }))
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
    .attr('text-anchor', (d) => computeAgentTextAnchor({ useLeftSide: d.useLeftSide }))
    .attr('x', (d) => computeAgentNameX({ useLeftSide: d.useLeftSide, gridScale: d.gridScale, botScale: agentDensityConfig.botScale }))
    .attr('y', (d) => -3 + (d.textYOffset || 0))
    .style('pointer-events', 'none')
    .style('font-size', (d) => computeAgentFontSizePx({ detailLevel, gridScale: d.gridScale, DETAIL_LEVELS }))
    .style('font-weight', '700')
    .style('paint-order', 'stroke')
    .style('stroke', 'var(--vscode-editor-background)')
    .style('stroke-width', '4px')
    .attr('fill', 'var(--vscode-editor-foreground)')
    .style('opacity', 0) // Start at 0, will be set correctly in update phase
    .attr('opacity', 0) // Start at 0, will be set correctly in update phase
    .text((d) => computeAgentNameText({ agentDensityConfig, agent: d, detailLevel, getAdaptiveAgentName }))

  // Agent role - only shown in full mode (with collision avoidance)
  // Note: also respect per-agent showName gating so large fleets don't render label text.
  agentEnter.filter((d) => agentDensityConfig.showRole && d.showName !== false)
    .append('text')
    .attr('class', 'agent-role')
    .attr('text-anchor', (d) => computeAgentTextAnchor({ useLeftSide: d.useLeftSide }))
    .attr('x', (d) => computeAgentRoleX({ useLeftSide: d.useLeftSide }))
    .attr('y', (d) => 10 + (d.textYOffset || 0))
    .style('pointer-events', 'none')
    .style('font-size', '10px')
    .style('paint-order', 'stroke')
    .style('stroke', 'var(--vscode-editor-background)')
    .style('stroke-width', '4px')
    .attr('fill', 'var(--vscode-editor-foreground)')
    .attr('opacity', 0.65)
    .text((d) => truncateWithEllipsis(d.role, 26))
}

export function updateAgentRendering({
  d3,
  nodeUpdate,
  detailLevel,
  DETAIL_LEVELS,
  getAgentDensity,
  getAdaptiveAgentName,
  truncateWithEllipsis,
}) {
  // Get density for this render/update
  const agentDensityConfig = getAgentDensity(detailLevel)

  // Keep agent bot glyph styling in sync on updates.
  // This matters when switching scenarios without a full reload (e.g., AI-generated scenarios)
  // because agentIds are often reused and D3 will reuse existing DOM nodes.
  nodeUpdate.select('g.agent-bot')
    .attr('stroke', (d) => d?.fleetColor || 'var(--vscode-sideBar-border)')
    .attr('fill', (d) => d?.fleetColor || 'var(--vscode-statusBar-foreground)')
    .attr('data-agent-active', (d) => d?.isRecentlyActive ? 'true' : 'false')
    .attr('transform', (d) => computeAgentBotTransform({ gridScale: d?.gridScale, botScale: agentDensityConfig.botScale }))

  // Update agent text elements (visibility controlled by per-node showName property)
  const agentNameSelection = nodeUpdate.filter((d) => d.type === 'agent').select('.agent-name')

  // Interrupt transitions on both the parent node AND the text element
  nodeUpdate.filter((d) => d.type === 'agent' && d.showName === false).interrupt()

  agentNameSelection
    .interrupt() // Cancel any ongoing transitions
    .attr('text-anchor', (d) => computeAgentTextAnchor({ useLeftSide: d.useLeftSide }))
    .attr('x', (d) => computeAgentNameX({ useLeftSide: d.useLeftSide, gridScale: d.gridScale, botScale: agentDensityConfig.botScale }))
    .attr('y', (d) => -3 + (d.textYOffset || 0))
    .style('visibility', (d) => computeAgentNameVisibility({ agentDensityConfig, agent: d }))
    .style('opacity', (d) => computeAgentNameOpacity({ agentDensityConfig, agent: d }))
    .attr('opacity', (d) => computeAgentNameOpacity({ agentDensityConfig, agent: d }))
    .style('font-size', (d) => computeAgentNameFontSizePxForUpdate({ detailLevel, gridScale: d.gridScale, DETAIL_LEVELS }))
    .text((d) => computeAgentNameText({ agentDensityConfig, agent: d, detailLevel, getAdaptiveAgentName }))

  nodeUpdate.select('.agent-role')
    .attr('text-anchor', (d) => computeAgentTextAnchor({ useLeftSide: d.useLeftSide }))
    .attr('x', (d) => computeAgentRoleX({ useLeftSide: d.useLeftSide }))
    .attr('y', (d) => 10 + (d.textYOffset || 0))
    .style('visibility', (d) => computeAgentRoleVisibility({ agentDensityConfig, agent: d }))
    .attr('opacity', (d) => computeAgentRoleOpacity({ agentDensityConfig, agent: d }))
    .text((d) => computeAgentRoleText({ agentDensityConfig, agent: d, truncateWithEllipsis }))

  // Update agent activity halo with pulsing glow for active agents
  nodeUpdate.select('circle.agent-activity-halo')
    .transition()
    .duration(800)
    .attr('stroke', (d) => computeAgentHaloStroke({ isRecentlyActive: d.isRecentlyActive, fleetColor: d.fleetColor }))
    .attr('opacity', (d) => computeAgentHaloOpacity({ isRecentlyActive: d.isRecentlyActive }))
    .attr('r', (d) => computeAgentHaloRadius({ isRecentlyActive: d.isRecentlyActive, botScale: agentDensityConfig.botScale }))
    .on('end', function (event, d) {
      if (!d || !d.isRecentlyActive) return

      const halo = d3.select(this)
      halo.interrupt()

      function repeatPulse() {
        const current = halo.datum()
        if (!current || !current.isRecentlyActive) return

        const keyframes = computeAgentHaloPulseKeyframes({ botScale: agentDensityConfig.botScale })

        halo
          .transition()
          .duration(1200)
          .attr('opacity', keyframes.low.opacity)
          .attr('r', keyframes.low.r)
          .transition()
          .duration(800)
          .attr('opacity', keyframes.high.opacity)
          .attr('r', keyframes.high.r)
          .on('end', repeatPulse)
      }

      repeatPulse()
    })

  // Update compact and minimal agent indicators with glow
  nodeUpdate.select('circle.agent-compact-dot')
    .attr('fill', (d) => computeAgentCompactDotFill({ isRecentlyActive: d.isRecentlyActive, fleetColor: d.fleetColor }))
    .attr('opacity', (d) => computeAgentCompactDotOpacity({ isRecentlyActive: d.isRecentlyActive }))
    .style('filter', (d) => computeAgentCompactDotFilter({ isRecentlyActive: d.isRecentlyActive, fleetColor: d.fleetColor }))

  nodeUpdate.select('circle.agent-minimal-dot')
    .attr('fill', (d) => d.fleetColor || 'var(--vscode-sideBar-border)')
    .attr('opacity', (d) => computeAgentMinimalDotOpacity({ isRecentlyActive: d.isRecentlyActive }))
    .style('filter', (d) => computeAgentMinimalDotFilter({ isRecentlyActive: d.isRecentlyActive, fleetColor: d.fleetColor }))

  // Bot glyph styling (active agents read brighter)
  // IMPORTANT: When switching scenarios without a full reload, D3 may reuse
  // existing DOM nodes for the same agentId. Child shapes can retain old bound
  // data, so style them from the bot group's current datum.
  nodeUpdate.selectAll('g.agent-bot')
    .datum(function () {
      // Ensure bot group uses the parent node's latest datum
      return d3.select(this.parentNode).datum()
    })
    .each(function (d) {
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
        .attr('opacity', computeAgentBotPartOpacity({ isActive }))

      bot.selectAll('circle.agent-bot-eye')
        .attr('fill', eyeColor)
        .attr('opacity', computeAgentBotEyeOpacity({ isActive }))
    })

  // Activity halo styling
  nodeUpdate.selectAll('circle.agent-activity-halo')
    .attr('stroke', (d) => d.fleetColor || 'var(--vscode-textLink-foreground)')
    .attr('opacity', (d) => d.isRecentlyActive ? 0.55 : 0)

  nodeUpdate.selectAll('text.agent-role')
    .attr('opacity', (d) => d.isRecentlyActive ? 0.75 : 0.25)
}

export function renderNodeLabelsEnter({ nodeEnter }) {
  // Labels (Main) — only for envelopes + stewards (agents are rendered as pills)
  nodeEnter.filter((d) => d.type !== 'agent').append('text')
    .attr('class', 'label-main')
    .style('pointer-events', 'none')
    .style('paint-order', 'stroke')
    .style('stroke', 'var(--vscode-editor-background)')
    .style('stroke-width', '4px')

  // Labels (Sub) — only for envelopes + stewards
  nodeEnter.filter((d) => d.type !== 'agent').append('text')
    .attr('class', 'label-sub')
    .style('pointer-events', 'none')
    .style('paint-order', 'stroke')
    .style('stroke', 'var(--vscode-editor-background)')
    .style('stroke-width', '4px')
}

export function updateNodeLabels({
  nodeUpdate,
  detailLevel,
  DETAIL_LEVELS,
  getAdaptiveEnvelopeLabel,
  getAdaptiveStewardLabel,
  getAdaptiveAgentName,
  getNodeSubLabelText,
}) {
  // Update Labels - adaptive based on detail level
  nodeUpdate.select('.label-main')
    .attr('dy', (d) => computeLabelMainDy({ type: d.type }))
    .attr('text-anchor', (d) => computeLabelTextAnchor({ type: d.type }))
    .attr('x', (d) => computeLabelX({ type: d.type, r: d.r }))
    .attr('fill', 'var(--vscode-editor-foreground)')
    .attr('opacity', (d) => computeLabelMainOpacity({ detailLevel, DETAIL_LEVELS, status: d.status }))
    .style('font-size', (d) => computeLabelMainFontSize({ type: d.type, detailLevel, DETAIL_LEVELS }))
    .style('font-weight', (d) => computeLabelFontWeight({ type: d.type }))
    .text((d) => computeLabelMainText({ node: d, detailLevel, getAdaptiveEnvelopeLabel, getAdaptiveStewardLabel, getAdaptiveAgentName }))

  nodeUpdate.select('.label-sub')
    .attr('dy', (d) => computeLabelSubDy({ type: d.type }))
    .attr('text-anchor', (d) => computeLabelTextAnchor({ type: d.type }))
    .attr('x', (d) => computeLabelX({ type: d.type, r: d.r }))
    .attr('fill', 'var(--vscode-editor-foreground)')
    .attr('opacity', (d) => computeLabelSubOpacity({ detailLevel, DETAIL_LEVELS, status: d.status }))
    .style('font-size', '9px')
    .text((d) => getNodeSubLabelText(d, detailLevel))
}
