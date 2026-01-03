export function createTicked({
  d3,
  nodeLayer,
  linkLayer,
  exceptionLinkLayer,
  particleLayer,
  getNodes,
  getParticles,
  stepParticle,
  renderParticlesTick,
  getEventColor,
  wrapTextLinesByChars,
}) {
  return function ticked() {
    const nodes = getNodes()
    const particles = getParticles()

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
}

export function createDragHandlers({ simulation }) {
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

  return { dragstarted, dragged, dragended }
}
