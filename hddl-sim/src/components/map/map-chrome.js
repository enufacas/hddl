export function computeCycleGeometry({ mapHeight }) {
  const cycleYTop = 100
  const cycleYBottom = mapHeight - 48
  const cycleYMid = (cycleYTop + cycleYBottom) / 2
  const cycleRy = Math.max(65, (cycleYBottom - cycleYTop) * 0.42)
  return { cycleYTop, cycleYBottom, cycleYMid, cycleRy }
}

export function computeCycleLoopPath({ x1, x2, cycleYMid, cycleRy }) {
  const rx = Math.max(80, Math.abs(x2 - x1) * 0.55)
  return `M ${x1} ${cycleYMid} A ${rx} ${cycleRy} 0 0 1 ${x2} ${cycleYMid} A ${rx} ${cycleRy} 0 0 1 ${x1} ${cycleYMid}`
}

export function computeColumnLayout({ width }) {
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

  return {
    col1Width,
    col2Width,
    col3Width,
    col1Center,
    col2Center,
    col3Center,
    col1Left,
    col1Right,
    col3Left,
  }
}

export function renderMapChrome({
  svg,
  headerLayer,
  cycleLayer,
  width,
  mapHeight,
  detailLevel,
  DETAIL_LEVELS,
  getAdaptiveHeader,
  planetUrl,
}) {
  // Lifecycle loop cues (subtle background curves across system boundaries)
  // These are intentionally static: they communicate the conceptual flow.
  const { cycleYMid, cycleRy } = computeCycleGeometry({ mapHeight })

  cycleLayer.append('path')
    .attr('class', 'cycle-loop-left')
    .attr('d', computeCycleLoopPath({ x1: width * 0.15, x2: width * 0.5, cycleYMid, cycleRy }))
    .attr('fill', 'none')
    .attr('stroke', 'var(--vscode-editor-lineHighlightBorder)')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '6 6')
    .attr('opacity', 0.18)

  cycleLayer.append('path')
    .attr('class', 'cycle-loop-right')
    .attr('d', computeCycleLoopPath({ x1: width * 0.5, x2: width * 0.85, cycleYMid, cycleRy }))
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
  } = computeColumnLayout({ width })

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

  return {
    col1Width,
    col2Width,
    col3Width,
    col1Center,
    col2Center,
    col3Center,
    col1Left,
    col1Right,
    col3Left,
  }
}
