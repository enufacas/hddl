export function formatSimTime(hour) {
  const day = Math.floor(hour / 24)
  const hh = String(Math.floor(hour % 24)).padStart(2, '0')
  return `Day ${day}, ${hh}:00`
}

function toIntOr(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback
}

function normalizeBoundaryKind(kind) {
  const k = String(kind || '').toLowerCase().trim()
  if (k === 'escalated' || k === 'overridden' || k === 'deferred') return k
  return k || null
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function diffLists(prev, next) {
  const a = new Set(safeArray(prev).map(x => String(x)))
  const b = new Set(safeArray(next).map(x => String(x)))
  const added = Array.from(b).filter(x => !a.has(x))
  const removed = Array.from(a).filter(x => !b.has(x))
  return { added, removed }
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

export function getEnvelopeLineage(scenario, envelopeId) {
  const base = (scenario?.envelopes ?? []).find(e => e.envelopeId === envelopeId)
  if (!base) return []

  const baseVersion = toIntOr(base?.envelope_version, 1) || 1
  const revisions = (scenario?.events ?? [])
    .filter(e => e && e.type === 'revision' && e.envelopeId === envelopeId && typeof e.hour === 'number')
    .sort((a, b) => a.hour - b.hour)

  const chain = []
  chain.push({
    hour: base.createdHour ?? 0,
    envelope_version: baseVersion,
    revision_id: base.revision_id ?? null,
    assumptions: safeArray(base.assumptions),
    constraints: safeArray(base.constraints),
    kind: 'base',
  })

  let currentAssumptions = safeArray(base.assumptions)
  let currentConstraints = safeArray(base.constraints)
  let currentVersion = baseVersion

  revisions.forEach((rev, idx) => {
    const nextAssumptions = Array.isArray(rev.nextAssumptions) && rev.nextAssumptions.length ? rev.nextAssumptions : currentAssumptions
    const nextConstraints = Array.isArray(rev.nextConstraints) && rev.nextConstraints.length ? rev.nextConstraints : currentConstraints
    currentAssumptions = nextAssumptions
    currentConstraints = nextConstraints
    currentVersion = toIntOr(rev.envelope_version, baseVersion + idx + 1)

    chain.push({
      hour: rev.hour,
      envelope_version: currentVersion,
      revision_id: rev.revision_id ?? rev.eventId ?? null,
      assumptions: currentAssumptions,
      constraints: currentConstraints,
      kind: 'revision',
    })
  })

  return chain
}

export function getEnvelopeAtTime(scenario, envelopeId, atHour) {
  const base = (scenario?.envelopes ?? []).find(e => e.envelopeId === envelopeId)
  if (!base) return null

  const lineage = getEnvelopeLineage(scenario, envelopeId)
  const versions = lineage
    .filter(v => typeof v.hour === 'number' && v.hour <= atHour)
    .sort((a, b) => a.hour - b.hour)

  const latest = versions[versions.length - 1]
  if (!latest) return base

  return {
    ...base,
    envelope_version: latest.envelope_version,
    revision_id: latest.revision_id,
    assumptions: safeArray(latest.assumptions),
    constraints: safeArray(latest.constraints),
    revisedHour: latest.kind === 'revision' ? latest.hour : undefined,
  }
}

export function getEnvelopeHistory(scenario, envelopeId) {
  const events = (scenario?.events ?? [])
    .filter(e => e && e.envelopeId === envelopeId)
    .filter(e => ['envelope_promoted', 'revision', 'boundary_interaction', 'escalation', 'dsg_session', 'signal', 'annotation'].includes(e.type))
    .filter(e => typeof e.hour === 'number')
    .sort((a, b) => a.hour - b.hour)

  return events
}

export function getStewardActivity(scenario, atHour, windowHours = 24) {
  const min = atHour - windowHours
  const max = atHour
  return (scenario?.events ?? [])
    .filter(e => e && typeof e.hour === 'number' && e.hour >= min && e.hour <= max)
    .filter(e => ['revision', 'boundary_interaction', 'escalation', 'dsg_session', 'annotation'].includes(e.type))
    .sort((a, b) => b.hour - a.hour)
}

export function getBoundaryInteractionCounts(scenario, atHour, windowHours = 24) {
  const min = atHour - windowHours
  const max = atHour
  const events = (scenario?.events ?? [])
    .filter(e => e && e.type === 'boundary_interaction' && typeof e.hour === 'number')
    .filter(e => e.hour >= min && e.hour <= max)

  const totals = { escalated: 0, overridden: 0, deferred: 0 }
  const byEnvelope = new Map()

  events.forEach(e => {
    const kind = normalizeBoundaryKind(e.boundary_kind)
    if (kind && totals[kind] != null) totals[kind] += 1
    const envId = e.envelopeId || 'GLOBAL'
    if (!byEnvelope.has(envId)) byEnvelope.set(envId, { escalated: 0, overridden: 0, deferred: 0, total: 0 })
    const bucket = byEnvelope.get(envId)
    bucket.total += 1
    if (kind && bucket[kind] != null) bucket[kind] += 1
  })

  return { totals, byEnvelope }
}

export function getDecisionMemoryEntries(scenario, atHour, windowHours = 48) {
  const min = atHour - windowHours
  const max = atHour
  return (scenario?.events ?? [])
    .filter(e => e && e.type === 'annotation' && typeof e.hour === 'number')
    .filter(e => e.hour >= min && e.hour <= max)
    .filter(e => Boolean(e.decision_id))
    .sort((a, b) => b.hour - a.hour)
}

export function getRevisionDiffAtTime(scenario, envelopeId, atHour) {
  const lineage = getEnvelopeLineage(scenario, envelopeId)
    .filter(v => typeof v.hour === 'number' && v.hour <= atHour)
    .sort((a, b) => a.hour - b.hour)
  const current = lineage[lineage.length - 1]
  const prev = lineage[lineage.length - 2]
  if (!current || !prev) {
    return {
      envelopeId,
      fromVersion: null,
      toVersion: current?.envelope_version ?? null,
      assumptions: { added: [], removed: [] },
      constraints: { added: [], removed: [] },
    }
  }

  return {
    envelopeId,
    fromVersion: prev.envelope_version,
    toVersion: current.envelope_version,
    revision_id: current.revision_id ?? null,
    assumptions: diffLists(prev.assumptions, current.assumptions),
    constraints: diffLists(prev.constraints, current.constraints),
  }
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
