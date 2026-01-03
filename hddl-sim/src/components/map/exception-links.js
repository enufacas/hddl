export function computeOpenExceptionLinks({ allEvents, hour, nodes }) {
  const events = Array.isArray(allEvents) ? allEvents : []
  const currentHour = typeof hour === 'number' ? hour : Number.POSITIVE_INFINITY
  const nodeList = Array.isArray(nodes) ? nodes : []

  // HDDL story: an escalated boundary interaction remains "open" until a resolving revision lands.
  const escalations = events
    .filter((e) => e && e.type === 'boundary_interaction')
    .filter((e) => typeof e.hour === 'number' && e.hour <= currentHour)
    .filter((e) => String(e.boundary_kind || e.boundaryKind || '').toLowerCase() === 'escalated')

  const resolvingRevisionIds = new Set(
    events
      .filter((e) => e && e.type === 'revision')
      .filter((e) => typeof e.hour === 'number' && e.hour <= currentHour)
      .map((e) => e.resolvesEventId)
      .filter(Boolean)
  )

  return escalations
    .filter((e) => Boolean(e.eventId) && !resolvingRevisionIds.has(e.eventId))
    .map((e) => {
      const envId = e.envelopeId || e.envelope_id
      const envNode = nodeList.find((n) => n.type === 'envelope' && n.id === envId)
      const stewardNode = e.actorRole
        ? nodeList.find((n) => n.type === 'steward' && n.name === e.actorRole)
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
}
