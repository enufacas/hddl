export function computeEnvelopeGroupScale(status) {
  if (status === 'active') return 1.0
  if (status === 'pending') return 0.92
  return 0.85
}

export function computeEnvelopeBodyRect({ r, isRecentlyRevised }) {
  const rr = Number(r || 0) + (isRecentlyRevised ? 6 : 0)
  const w = Math.max(84, Math.round(rr * 3.2))
  const h = Math.max(52, Math.round(rr * 2.05))
  return { x: -w / 2, y: -h / 2, width: w, height: h }
}

export function computeEnvelopeBodyRectFromDims({ width = 84, height = 52 }) {
  const w = Number(width || 0)
  const h = Number(height || 0)
  const x = -w / 2
  const y = -h / 2
  return {
    x: Object.is(x, -0) ? 0 : x,
    y: Object.is(y, -0) ? 0 : y,
    width: w,
    height: h,
  }
}

export function computeEnvelopeTestId({ id }) {
  return `envelope-${id || 'unknown'}`
}

export function computeEnvelopeBodyTestId({ id }) {
  return `envelope-body-${id || 'unknown'}`
}

export function computeEnvelopeBodyCornerRadius({ density }) {
  return density === 'compact' ? 4 : 6
}

export function computeEnvelopeBodyEnterStrokeWidth({ density }) {
  return density === 'compact' ? 2 : 3
}

export function computeEnvelopeIconRadius({ radius, fallback = 18 }) {
  return Number(radius || 0) || fallback
}

export function computeEnvelopeIconStatusRadius({ radius, fallback = 18 }) {
  const r = computeEnvelopeIconRadius({ radius, fallback })
  return r * 0.5
}

export function computeEnvelopeStatusLabelFontSize({ density }) {
  return density === 'detailed' ? '11px' : '10px'
}

export function computeEnvelopeGlowStroke({ ownerColor, fallback = 'var(--vscode-focusBorder)' }) {
  return ownerColor || fallback
}

export function computeEnvelopeGlowPhaseOpacity({ status, phase }) {
  const { high, low } = computeEnvelopeGlowKeyframeOpacity(status)
  return phase === 'high' ? high : low
}

export function computeEnvelopeGlowPhaseOpacityForDatum({ datum, phase }) {
  if (!datum) return 0
  return computeEnvelopeGlowPhaseOpacity({ status: datum.status, phase })
}

export function computeEnvelopeAccentColor({ ownerColor, fallback = 'var(--vscode-focusBorder)' }) {
  return ownerColor || fallback
}

export function computeEnvelopeBodyStroke({ status, ownerColor }) {
  const accent = computeEnvelopeAccentColor({ ownerColor })
  if (status === 'ended') return 'var(--vscode-sideBar-border)'
  return accent
}

export function computeEnvelopeStrokeWidth({ status, isRecentlyRevised }) {
  if (isRecentlyRevised) return 4.5
  if (status === 'active') return 3.5
  return 2.5
}

export function computeEnvelopeStrokeDasharray(status) {
  return (status === 'ended' || status === 'pending') ? '6 4' : null
}

export function computeEnvelopeOpacity(status) {
  if (status === 'ended') return 0.45
  if (status === 'pending') return 0.75
  return 1
}

export function computeEnvelopeIconStatusFill({ status, ownerColor }) {
  if (status === 'active') return ownerColor || 'var(--status-success)'
  if (status === 'ended') return 'var(--vscode-input-border)'
  return 'var(--status-warning)'
}

export function computeEnvelopeIconStatusOpacity(status) {
  return status === 'active' ? 0.9 : 0.6
}

export function computeEnvelopeIconCircleStroke({ ownerColor, fallback = 'var(--vscode-focusBorder)' }) {
  return ownerColor || fallback
}

export function computeEnvelopeIconCircleStrokeWidth(status) {
  return status === 'active' ? 3 : 2
}

export function computeEnvelopeGlowRect({ width = 84, height = 52, padding = 16 }) {
  const w = Number(width || 0) + padding
  const h = Number(height || 0) + padding
  return { x: -w / 2, y: -h / 2, width: w, height: h }
}

export function computeEnvelopeGlowKeyframeOpacity(status) {
  // Used for the pulsing transitions: active alternates between 0.6 and 0.2
  if (status === 'active') return { high: 0.6, low: 0.2 }
  return { high: 0, low: 0 }
}

export function computeEnvelopeRevisionBurstKeyframes({ width = 84, height = 52, expand = 30 }) {
  const baseW = Number(width || 0)
  const baseH = Number(height || 0)
  return {
    start: { x: -baseW / 2, y: -baseH / 2, width: baseW, height: baseH, opacity: 0.9, strokeWidth: 4 },
    end: { x: -(baseW + expand) / 2, y: -(baseH + expand) / 2, width: baseW + expand, height: baseH + expand, opacity: 0, strokeWidth: 1 },
  }
}

export function computeEnvelopeStatusLabelY({ height = 52 }) {
  const h = Number(height || 0)
  return -(h / 2) + 14
}

export function computeEnvelopeStatusLabelOpacity(status) {
  return status === 'active' ? 0.85 : 0.65
}

export function computeEnvelopeStatusLabelText(status) {
  if (status === 'active') return 'OPEN'
  if (status === 'ended') return 'CLOSED'
  return 'PENDING'
}

export function computeEnvelopeVersionBadgeTransform({ width = 84, height = 52, density = 'normal' }) {
  const w = Number(width || 0)
  const h = Number(height || 0)
  const xOffset = density === 'compact' ? w / 2 - 14 : w / 2 - 20
  return `translate(${xOffset}, ${h / 2 + 8})`
}

export function computeEnvelopeVersionBadgeBgRect({ density = 'normal' }) {
  return {
    x: density === 'compact' ? -14 : -18,
    y: -7,
    width: density === 'compact' ? 28 : 36,
    height: 14,
  }
}

export function computeEnvelopeVersionBadgeBgFill({ isVersionBumped }) {
  return isVersionBumped ? 'var(--status-warning)' : 'var(--vscode-editor-background)'
}

export function computeEnvelopeVersionBadgeBgStroke({ isVersionBumped }) {
  return isVersionBumped ? 'none' : 'var(--vscode-sideBar-border)'
}

export function computeEnvelopeVersionBadgeTextFill({ isVersionBumped }) {
  return isVersionBumped ? 'var(--vscode-editor-background)' : 'var(--vscode-editor-foreground)'
}

export function computeEnvelopeVersionBadgeFontSize({ density = 'normal' }) {
  return density === 'compact' ? '7px' : '8px'
}

export function computeEnvelopeVersionBadgeText({ density = 'normal', isVersionBumped, semver }) {
  if (density === 'compact') return `v${semver}`
  return isVersionBumped ? `↑ v${semver}` : `v${semver}`
}

export function computeEnvelopeFlapFill(status) {
  if (status === 'active') return 'none'
  return 'var(--vscode-editor-background)'
}

export function computeEnvelopeFlapOpacity(status) {
  return status === 'ended' ? 0.5 : 0.9
}

export function computeEnvelopeFoldOpacity(status) {
  if (status === 'ended') return 0.3
  if (status === 'active') return 0.6
  return 0.4
}

export function computeEnvelopeFlapPath({ width = 84, height = 52, status = 'pending' }) {
  const w = width
  const h = height
  const left = -w / 2
  const top = -h / 2
  const right = w / 2

  if (status === 'active') {
    const flapHeight = h * 0.4
    return `M ${left + 4} ${top + 4} L 0 ${top - flapHeight} L ${right - 4} ${top + 4}`
  }

  return `M ${left + 4} ${top + 4} L 0 ${top + h * 0.45} L ${right - 4} ${top + 4} Z`
}

export function computeEnvelopeFoldPath({ width = 84, height = 52 }) {
  const w = width
  const h = height
  const left = -w / 2
  const bottom = h / 2
  const right = w / 2
  return `M ${left + 8} ${bottom - 8} L 0 ${bottom - h * 0.25} L ${right - 8} ${bottom - 8}`
}

export function renderEnvelopeEnter({
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
}) {
  // Envelope shape (density-aware rendering)
  // At detailed/normal: full envelope shape with body, flap, fold
  // At compact: simplified outline only
  // At icon: status circle only
  const envShape = nodeEnter.filter((d) => d.type === 'envelope')
    .append('g')
    .attr('class', (d) => `envelope-shape envelope-density-${d.envDims?.density || 'normal'}`)
    .attr('data-testid', (d) => computeEnvelopeTestId({ id: d.id }))
    .attr('tabindex', 0)

  // Apply handlers to ALL envelope shapes (both new and existing)
  // These handlers are on the envelope-shape child, not the draggable parent node
  const allEnvShapes = nodeSelection.merge(nodeEnter)
    .filter((d) => d.type === 'envelope')
    .select('g.envelope-shape')

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
    .on('click', function (event, d) {
      event.stopPropagation()
      // Touch / coarse pointers: use click-to-peek tooltip with short duration
      if (!canHoverTooltip()) {
        showEnvelopeTooltip(d, event, event.currentTarget, { scenario: getScenario(), hour: getTimeHour(), autoHideMs: 1500 })
      }

      // Open the envelope detail modal
      const modal = createEnvelopeDetailModal(d.id)
      const app = document.querySelector('#app')
      if (app) app.appendChild(modal)
    })

  // Icon mode: render a simple status circle
  envShape.filter((d) => d.envDims?.isIcon)
    .append('circle')
    .attr('class', 'envelope-icon-circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', (d) => computeEnvelopeIconRadius({ radius: d.envDims?.radius, fallback: 18 }))
    .attr('fill', 'var(--vscode-editor-background)')
    .attr('stroke', 'var(--vscode-focusBorder)')
    .attr('stroke-width', 3)

  // Icon mode: inner status indicator
  envShape.filter((d) => d.envDims?.isIcon)
    .append('circle')
    .attr('class', 'envelope-icon-status')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', (d) => computeEnvelopeIconStatusRadius({ radius: d.envDims?.radius, fallback: 18 }))
    .attr('fill', (d) => computeEnvelopeIconStatusFill({ status: d.status, ownerColor: d.ownerColor }))
    .attr('opacity', (d) => computeEnvelopeIconStatusOpacity(d.status))

  // Non-icon modes: render envelope shape elements
  const envBodyShape = envShape.filter((d) => !d.envDims?.isIcon)

  // Outer glow ring for active envelopes (pulsing animation) - detailed only
  envBodyShape.filter((d) => shouldRenderEnvelopeElement('glow', d.envDims?.density))
    .append('rect')
    .attr('class', 'envelope-glow')
    .attr('x', (d) => computeEnvelopeGlowRect({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).x)
    .attr('y', (d) => computeEnvelopeGlowRect({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).y)
    .attr('width', (d) => computeEnvelopeGlowRect({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).width)
    .attr('height', (d) => computeEnvelopeGlowRect({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).height)
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('fill', 'none')
    .attr('stroke', 'var(--vscode-focusBorder)')
    .attr('stroke-width', 2)
    .attr('opacity', 0)
    .style('filter', 'blur(4px)')

  // Revision burst ring - detailed and normal only
  envBodyShape.filter((d) => shouldRenderEnvelopeElement('revisionBurst', d.envDims?.density))
    .append('rect')
    .attr('class', 'envelope-revision-burst')
    .attr('x', (d) => computeEnvelopeRevisionBurstKeyframes({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).start.x)
    .attr('y', (d) => computeEnvelopeRevisionBurstKeyframes({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).start.y)
    .attr('width', (d) => computeEnvelopeRevisionBurstKeyframes({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).start.width)
    .attr('height', (d) => computeEnvelopeRevisionBurstKeyframes({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).start.height)
    .attr('rx', 6)
    .attr('ry', 6)
    .attr('fill', 'none')
    .attr('stroke', 'var(--status-success)')
    .attr('stroke-width', 3)
    .attr('opacity', 0)

  // Envelope body - all non-icon modes
  envBodyShape.append('rect')
    .attr('class', 'envelope-body')
    .attr('data-testid', (d) => computeEnvelopeBodyTestId({ id: d.id }))
    .attr('data-envelope-status', (d) => d.status || 'unknown')
    .attr('x', (d) => computeEnvelopeBodyRectFromDims({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).x)
    .attr('y', (d) => computeEnvelopeBodyRectFromDims({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).y)
    .attr('width', (d) => computeEnvelopeBodyRectFromDims({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).width)
    .attr('height', (d) => computeEnvelopeBodyRectFromDims({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).height)
    .attr('rx', (d) => computeEnvelopeBodyCornerRadius({ density: d.envDims?.density }))
    .attr('ry', (d) => computeEnvelopeBodyCornerRadius({ density: d.envDims?.density }))
    .attr('fill', 'var(--vscode-editor-background)')
    .attr('stroke', 'var(--vscode-focusBorder)')
    .attr('stroke-width', (d) => computeEnvelopeBodyEnterStrokeWidth({ density: d.envDims?.density }))

  // Envelope flap - triangular top (detailed and normal only)
  envBodyShape.filter((d) => shouldRenderEnvelopeElement('flap', d.envDims?.density))
    .append('path')
    .attr('class', 'envelope-flap')
    .attr('fill', 'var(--vscode-editor-background)')
    .attr('stroke-width', 2.5)
    .attr('stroke-linejoin', 'round')
    .style('transform-origin', 'center top')
    .style('transition', 'transform 0.4s ease-out')
    .attr('d', (d) => computeEnvelopeFlapPath({
      width: d.envDims?.width || 84,
      height: d.envDims?.height || 52,
      status: 'pending',
    }))

  // Inner fold line (detailed only - gives depth)
  envBodyShape.filter((d) => shouldRenderEnvelopeElement('fold', d.envDims?.density))
    .append('path')
    .attr('class', 'envelope-fold')
    .attr('fill', 'none')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.4)
    .attr('d', (d) => computeEnvelopeFoldPath({
      width: d.envDims?.width || 84,
      height: d.envDims?.height || 52,
    }))

  // Envelope status label (OPEN vs CLOSED) - detailed and normal only
  nodeEnter.filter((d) => d.type === 'envelope' && shouldRenderEnvelopeElement('status', d.envDims?.density))
    .append('text')
    .attr('class', 'envelope-status')
    .attr('text-anchor', 'middle')
    .style('pointer-events', 'none')
    .style('paint-order', 'stroke')
    .style('stroke', 'var(--vscode-editor-background)')
    .style('stroke-width', '4px')
    .style('font-size', (d) => computeEnvelopeStatusLabelFontSize({ density: d.envDims?.density }))
    .style('font-weight', '800')
    .attr('fill', 'var(--vscode-statusBar-foreground)')

  // Version badge (semver format) - detailed, normal, compact
  const versionBadge = nodeEnter.filter((d) => d.type === 'envelope' && shouldRenderEnvelopeElement('version', d.envDims?.density))
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

  return { envShape, allEnvShapes }
}

export function updateEnvelopeRendering({ d3, nodeUpdate }) {
  // Envelope group scale animation based on status
  nodeUpdate.filter((d) => d.type === 'envelope')
    .select('g.envelope-shape')
    .transition()
    .duration(400)
    .ease(d3.easeBackOut.overshoot(1.2))
    .attr('transform', (d) => `scale(${computeEnvelopeGroupScale(d.status)})`)

  // Envelope OPEN/CLOSED styling (+ gentle grow on recent revisions)
  nodeUpdate.select('rect.envelope-body')
    .transition()
    .duration(300)
    .attr('x', (d) => computeEnvelopeBodyRect({ r: d.r, isRecentlyRevised: d.isRecentlyRevised }).x)
    .attr('y', (d) => computeEnvelopeBodyRect({ r: d.r, isRecentlyRevised: d.isRecentlyRevised }).y)
    .attr('width', (d) => computeEnvelopeBodyRect({ r: d.r, isRecentlyRevised: d.isRecentlyRevised }).width)
    .attr('height', (d) => computeEnvelopeBodyRect({ r: d.r, isRecentlyRevised: d.isRecentlyRevised }).height)
    .attr('stroke', (d) => computeEnvelopeBodyStroke({ status: d.status, ownerColor: d.ownerColor }))
    .attr('stroke-width', (d) => computeEnvelopeStrokeWidth({ status: d.status, isRecentlyRevised: d.isRecentlyRevised }))
    .attr('stroke-dasharray', (d) => computeEnvelopeStrokeDasharray(d.status))
    .attr('fill', 'var(--vscode-editor-background)')
    .attr('opacity', (d) => computeEnvelopeOpacity(d.status))

  // Update icon mode status indicator
  nodeUpdate.selectAll('g.envelope-shape').select('circle.envelope-icon-status')
    .attr('fill', (d) => computeEnvelopeIconStatusFill({ status: d.status, ownerColor: d.ownerColor }))
    .attr('opacity', (d) => computeEnvelopeIconStatusOpacity(d.status))

  // Update icon mode outer circle
  nodeUpdate.selectAll('g.envelope-shape').select('circle.envelope-icon-circle')
    .attr('stroke', (d) => computeEnvelopeIconCircleStroke({ ownerColor: d.ownerColor }))
    .attr('stroke-width', (d) => computeEnvelopeIconCircleStrokeWidth(d.status))
    .attr('r', (d) => computeEnvelopeIconRadius({ radius: d.envDims?.radius, fallback: 18 }))

  // Animate envelope glow for active envelopes (pulsing effect) - only if element exists
  nodeUpdate.selectAll('g.envelope-shape').select('rect.envelope-glow')
    .attr('x', (d) => computeEnvelopeGlowRect({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).x)
    .attr('y', (d) => computeEnvelopeGlowRect({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).y)
    .attr('width', (d) => computeEnvelopeGlowRect({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).width)
    .attr('height', (d) => computeEnvelopeGlowRect({ width: d.envDims?.width || 84, height: d.envDims?.height || 52 }).height)
    .attr('stroke', (d) => computeEnvelopeGlowStroke({ ownerColor: d.ownerColor }))
    .transition()
    .duration(800)
    .attr('opacity', (d) => computeEnvelopeGlowPhaseOpacity({ status: d.status, phase: 'high' }))
    .transition()
    .duration(800)
    .attr('opacity', (d) => computeEnvelopeGlowPhaseOpacity({ status: d.status, phase: 'low' }))
    .on('end', function repeat() {
      d3.select(this)
        .transition()
        .duration(800)
        .attr('opacity', function () {
          const d = d3.select(this.parentNode).datum()
          return computeEnvelopeGlowPhaseOpacityForDatum({ datum: d, phase: 'high' })
        })
        .transition()
        .duration(800)
        .attr('opacity', function () {
          const d = d3.select(this.parentNode).datum()
          return computeEnvelopeGlowPhaseOpacityForDatum({ datum: d, phase: 'low' })
        })
        .on('end', repeat)
    })

  // Animate revision burst (expanding ring effect when recently revised)
  nodeUpdate.selectAll('g.envelope-shape').select('rect.envelope-revision-burst')
    .attr('stroke', (d) => d.ownerColor || 'var(--status-success)')
    .each(function (d) {
      const burst = d3.select(this)
      if (d.isRecentlyRevised) {
        const baseW = d.envDims?.width || 84
        const baseH = d.envDims?.height || 52
        const keyframes = computeEnvelopeRevisionBurstKeyframes({ width: baseW, height: baseH })
        burst
          .attr('x', keyframes.start.x)
          .attr('y', keyframes.start.y)
          .attr('width', keyframes.start.width)
          .attr('height', keyframes.start.height)
          .attr('opacity', keyframes.start.opacity)
          .attr('stroke-width', keyframes.start.strokeWidth)
          .transition()
          .duration(600)
          .ease(d3.easeQuadOut)
          .attr('x', keyframes.end.x)
          .attr('y', keyframes.end.y)
          .attr('width', keyframes.end.width)
          .attr('height', keyframes.end.height)
          .attr('opacity', keyframes.end.opacity)
          .attr('stroke-width', keyframes.end.strokeWidth)
      } else {
        burst.attr('opacity', 0)
      }
    })

  nodeUpdate.select('.envelope-status')
    .attr('y', (d) => computeEnvelopeStatusLabelY({ height: d.envDims?.height || 52 }))
    .attr('opacity', (d) => computeEnvelopeStatusLabelOpacity(d.status))
    .text((d) => computeEnvelopeStatusLabelText(d.status))
    .style('font-size', (d) => computeEnvelopeStatusLabelFontSize({ density: d.envDims?.density }))

  // Update version badge position and content
  nodeUpdate.select('.envelope-version-badge')
    .attr('transform', (d) => computeEnvelopeVersionBadgeTransform({
      width: d.envDims?.width || 84,
      height: d.envDims?.height || 52,
      density: d.envDims?.density,
    }))

  nodeUpdate.select('.version-badge-bg')
    .attr('x', (d) => computeEnvelopeVersionBadgeBgRect({ density: d.envDims?.density }).x)
    .attr('y', (d) => computeEnvelopeVersionBadgeBgRect({ density: d.envDims?.density }).y)
    .attr('width', (d) => computeEnvelopeVersionBadgeBgRect({ density: d.envDims?.density }).width)
    .attr('height', (d) => computeEnvelopeVersionBadgeBgRect({ density: d.envDims?.density }).height)
    .attr('fill', (d) => computeEnvelopeVersionBadgeBgFill({ isVersionBumped: d.isVersionBumped }))
    .attr('stroke', (d) => computeEnvelopeVersionBadgeBgStroke({ isVersionBumped: d.isVersionBumped }))
    .attr('stroke-width', 1)
    .attr('opacity', 0.95)

  nodeUpdate.select('.version-badge-text')
    .attr('fill', (d) => computeEnvelopeVersionBadgeTextFill({ isVersionBumped: d.isVersionBumped }))
    .style('font-size', (d) => computeEnvelopeVersionBadgeFontSize({ density: d.envDims?.density }))
    .text((d) => computeEnvelopeVersionBadgeText({ density: d.envDims?.density, isVersionBumped: d.isVersionBumped, semver: d.semver }))

  // Envelope linework (flap/fold) follows envelope status.
  // Flap opens (rotates back) when envelope is active
  nodeUpdate.selectAll('g.envelope-shape').select('path.envelope-flap')
    .attr('stroke', (d) => computeEnvelopeBodyStroke({ status: d.status, ownerColor: d.ownerColor }))
    .attr('fill', (d) => computeEnvelopeFlapFill(d.status))
    .attr('opacity', (d) => computeEnvelopeFlapOpacity(d.status))
    .attr('d', (d) => computeEnvelopeFlapPath({
      width: d.envDims?.width || 84,
      height: d.envDims?.height || 52,
      status: d.status,
    }))

  // Inner fold line
  nodeUpdate.selectAll('g.envelope-shape').select('path.envelope-fold')
    .attr('stroke', (d) => computeEnvelopeBodyStroke({ status: d.status, ownerColor: d.ownerColor }))
    .attr('opacity', (d) => computeEnvelopeFoldOpacity(d.status))
    .attr('d', (d) => computeEnvelopeFoldPath({
      width: d.envDims?.width || 84,
      height: d.envDims?.height || 52,
    }))
}
