export function computeParticleGroupTransform(d) {
  const scale = d?.pulseScale || 1.0
  return `translate(${d?.x},${d?.y}) scale(${scale})`
}

export function computeParticleOpacity(d) {
  return d?.life
}

export function computeParticleLabelLines({ text, maxCharsPerLine, wrapTextLinesByChars }) {
  const raw = text ? String(text) : ''
  if (!raw.trim()) return []
  return wrapTextLinesByChars(raw, maxCharsPerLine)
}

export function computeParticleLabelOpacity(d) {
  return Math.max(0, (d?.labelOpacity || 0) * (d?.life || 0))
}

export function renderParticlesTick({ d3, particleLayer, particles, getEventColor, wrapTextLinesByChars }) {
  // Render Particles
  const particleSelection = particleLayer.selectAll('g.particle')
    .data(particles, (d) => d.id)

  const pEnter = particleSelection.enter()
    .append('g')
    .attr('class', 'particle')
    .attr('data-testid', (d) => `particle-${d.type}-${d.id || 'unknown'}`)
    .attr('data-particle-type', (d) => d.type)
    .attr('data-particle-status', (d) => d.status || 'none')
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
    .attr('transform', (d) => computeParticleGroupTransform(d))
    .attr('opacity', (d) => computeParticleOpacity(d))

  particleSelection.select('circle')
    .attr('fill', (d) => {
      // Use shared event color palette for consistency across views
      return getEventColor(d.type, d.severity, d.status)
    })

  particleSelection.select('text.particle-label')
    .each(function (d) {
      const el = d3.select(this)
      const maxCharsPerLine = 22

      const lines = computeParticleLabelLines({
        text: d?.text,
        maxCharsPerLine,
        wrapTextLinesByChars,
      })

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
    .attr('opacity', (d) => computeParticleLabelOpacity(d))

  particleSelection.exit().remove()
}
