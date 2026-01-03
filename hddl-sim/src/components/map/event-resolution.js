export function getResolutionTime(allEvents, eventId) {
  if (!eventId) return null
  const events = Array.isArray(allEvents) ? allEvents : []

  const resolving = events.find(ev =>
    ev && (ev.type === 'revision' || ev.type === 'decision') && ev.resolvesEventId === eventId
  )

  return (typeof resolving?.hour === 'number') ? resolving.hour : null
}
