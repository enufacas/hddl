export function applyStewardProcessingState(nodes, allEvents, hour) {
  const nodeList = Array.isArray(nodes) ? nodes : []
  const events = Array.isArray(allEvents) ? allEvents : []
  const currentHour = typeof hour === 'number' ? hour : Number.POSITIVE_INFINITY

  // Track steward processing state: boundary interaction received but no revision issued yet.
  const boundaryInteractionsByRole = new Map()
  events
    .filter((e) => e && e.type === 'boundary_interaction')
    .filter((e) => typeof e.hour === 'number' && e.hour <= currentHour)
    .forEach((e) => {
      const role = e.actorRole
      if (!role) return
      if (!boundaryInteractionsByRole.has(role)) boundaryInteractionsByRole.set(role, [])
      boundaryInteractionsByRole.get(role).push({ eventId: e.eventId })
    })

  const revisionsByRole = new Map()
  events
    .filter((e) => e && e.type === 'revision')
    .filter((e) => typeof e.hour === 'number' && e.hour <= currentHour)
    .forEach((e) => {
      const role = e.actorRole
      if (!role) return
      if (!revisionsByRole.has(role)) revisionsByRole.set(role, [])
      revisionsByRole.get(role).push({ resolvesEventId: e.resolvesEventId })
    })

  nodeList
    .filter((n) => n.type === 'steward')
    .forEach((stewardNode) => {
      const role = stewardNode.name
      const interactions = boundaryInteractionsByRole.get(role) || []
      const revisions = revisionsByRole.get(role) || []
      const resolvedEventIds = new Set(revisions.map((r) => r.resolvesEventId).filter(Boolean))
      stewardNode.isProcessing = interactions.some((i) => i.eventId && !resolvedEventIds.has(i.eventId))
    })

  return nodeList
}
