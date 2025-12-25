export function formatSimTime(hour) {
  const day = Math.floor(hour / 24)
  const hh = String(Math.floor(hour % 24)).padStart(2, '0')
  return `Day ${day}, ${hh}:00`
}

export function getEnvelopeStatus(envelope, atHour) {
  if (atHour < envelope.createdHour) return 'pending'
  if (atHour >= envelope.endHour) return 'ended'
  return 'active'
}

export function getEventsNearTime(scenario, atHour, windowHours = 6) {
  const min = atHour - windowHours
  const max = atHour + windowHours
  return (scenario?.events ?? [])
    .filter(e => typeof e.hour === 'number' && e.hour >= min && e.hour <= max)
    .sort((a, b) => a.hour - b.hour)
}

export function getEnvelopeAtTime(scenario, envelopeId, atHour) {
  const base = (scenario?.envelopes ?? []).find(e => e.envelopeId === envelopeId)
  if (!base) return null

  const revisions = (scenario?.events ?? [])
    .filter(e => e && e.type === 'revision' && e.envelopeId === envelopeId && typeof e.hour === 'number' && e.hour <= atHour)
    .sort((a, b) => a.hour - b.hour)

  const latest = revisions[revisions.length - 1]
  if (!latest) return base

  // Minimal "versioning": latest revision provides nextAssumptions/nextConstraints snapshots.
  return {
    ...base,
    assumptions: Array.isArray(latest.nextAssumptions) ? latest.nextAssumptions : base.assumptions,
    constraints: Array.isArray(latest.nextConstraints) ? latest.nextConstraints : base.constraints,
    revisedHour: latest.hour,
  }
}

export function getEnvelopeHistory(scenario, envelopeId) {
  const events = (scenario?.events ?? [])
    .filter(e => e && e.envelopeId === envelopeId)
    .filter(e => ['envelope_promoted', 'revision', 'escalation', 'dsg_session', 'signal'].includes(e.type))
    .filter(e => typeof e.hour === 'number')
    .sort((a, b) => a.hour - b.hour)

  return events
}

export function getStewardActivity(scenario, atHour, windowHours = 24) {
  const min = atHour - windowHours
  const max = atHour
  return (scenario?.events ?? [])
    .filter(e => e && typeof e.hour === 'number' && e.hour >= min && e.hour <= max)
    .filter(e => ['revision', 'escalation', 'dsg_session', 'annotation'].includes(e.type))
    .sort((a, b) => b.hour - a.hour)
}

export function getActiveDSGSession(scenario, atHour) {
  const sessions = (scenario?.events ?? [])
    .filter(e => e && e.type === 'dsg_session' && typeof e.hour === 'number')
    .filter(e => e.hour <= atHour)
    .sort((a, b) => a.hour - b.hour)

  return sessions[sessions.length - 1] ?? null
}

export function getDSGMessages(scenario, sessionId, atHour) {
  if (!sessionId) return []
  return (scenario?.events ?? [])
    .filter(e => e && e.type === 'dsg_message' && e.sessionId === sessionId && typeof e.hour === 'number')
    .filter(e => e.hour <= atHour)
    .sort((a, b) => a.hour - b.hour)
}
