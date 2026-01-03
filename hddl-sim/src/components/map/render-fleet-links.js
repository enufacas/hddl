export function computeFleetAgentCounts({ nodes, fleetRole }) {
  const safeNodes = Array.isArray(nodes) ? nodes : []
  const role = String(fleetRole || '')

  let total = 0
  let active = 0
  for (const n of safeNodes) {
    if (n?.type !== 'agent') continue
    if (String(n?.fleetRole || '') !== role) continue
    total += 1
    if (n?.isRecentlyActive) active += 1
  }

  return { active, total }
}

export function formatFleetCountText({ nodes, fleetRole }) {
  const { active, total } = computeFleetAgentCounts({ nodes, fleetRole })
  return `${active}/${total}`
}

export function computeLinkStroke(d) {
  if (d?.type === 'ownership' && d?.hasEscalation) return 'var(--status-warning)'
  return 'var(--vscode-editor-lineHighlightBorder)'
}

export function computeLinkStrokeWidth(d) {
  if (d?.type !== 'ownership') return 1.5
  const c = Number(d?.interactionCount || 0)
  return 1.5 + Math.min(3, c * 0.6)
}

export function computeLinkOpacity(d) {
  if (d?.type !== 'ownership') return 0.35
  const c = Number(d?.interactionCount || 0)
  return c > 0 ? 0.8 : 0.45
}

export function computeFleetBadgeTransform({ x, y, w, h }) {
  return `translate(${x + w / 2}, ${y + h / 2})`
}

export function computeFleetBadgeOpacity({ currentAgentDensity }) {
  const density = currentAgentDensity?.density
  return density === 'compact' || density === 'minimal' ? 1 : 0
}

export function computeFleetBadgeRect({ halfWidth = 20, halfHeight = 12 }) {
  return {
    x: -halfWidth,
    y: -halfHeight,
    width: halfWidth * 2,
    height: halfHeight * 2,
  }
}

export function computeLinkKey(d) {
  const s = d?.source?.id || d?.source
  const t = d?.target?.id || d?.target
  return `${s}-${t}`
}

export function renderFleetBoundaries({ fleetLayer, fleetBounds, nodes, currentAgentDensity }) {
  const fleetSel = fleetLayer.selectAll('g.fleet')
    .data(fleetBounds, (d) => d.id)

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
    .attr('x', (d) => d.x)
    .attr('y', (d) => d.y)
    .attr('width', (d) => d.w)
    .attr('height', (d) => d.h)
    .attr('stroke', (d) => d.color)
    .attr('opacity', 0.65)

  // Update fleet count badge (visible in compact/minimal modes)
  const fleetMerged = fleetSel.merge(fleetEnter)

  fleetMerged.select('.fleet-count-badge')
    .attr('transform', (d) => computeFleetBadgeTransform(d))
    .attr('opacity', () => computeFleetBadgeOpacity({ currentAgentDensity }))

  const badgeRect = computeFleetBadgeRect({ halfWidth: 20, halfHeight: 12 })
  fleetMerged.select('.fleet-count-bg')
    .attr('x', badgeRect.x)
    .attr('y', badgeRect.y)
    .attr('width', badgeRect.width)
    .attr('height', badgeRect.height)
    .attr('fill', (d) => d.color)
    .attr('opacity', 0.15)

  fleetMerged.select('.fleet-count-text')
    .attr('fill', (d) => d.color)
    .text((d) => formatFleetCountText({ nodes, fleetRole: d.role }))

  fleetSel.exit().remove()
}

export function renderLinks({ linkLayer, links }) {
  const linkSelection = linkLayer.selectAll('line')
    .data(links, (d) => computeLinkKey(d))

  linkSelection.enter()
    .append('line')
    .attr('stroke', 'var(--vscode-editor-lineHighlightBorder)')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '4 4')
    .attr('opacity', 0.55)

  linkSelection
    .attr('stroke', (d) => computeLinkStroke(d))
    .attr('stroke-width', (d) => computeLinkStrokeWidth(d))
    .attr('opacity', (d) => computeLinkOpacity(d))

  linkSelection.exit().remove()
}

export function renderExceptionLinks({ exceptionLinkLayer, exceptionLinks }) {
  // HIDDEN: Temporarily disabled for cleaner visualization
  const exceptionSel = exceptionLinkLayer.selectAll('line')
    .data(exceptionLinks, (d) => d.id)

  exceptionSel.enter()
    .append('line')
    .attr('stroke', 'red')
    .attr('stroke-width', 15)
    .attr('opacity', 0.0)
    .transition().duration(200)
    .attr('opacity', 0.0) // Hidden

  exceptionSel
    .attr('stroke', 'red')
    .attr('stroke-width', 15)
    .attr('opacity', 0.0) // Hidden

  exceptionSel.exit().transition().duration(200).attr('opacity', 0).remove()
}
