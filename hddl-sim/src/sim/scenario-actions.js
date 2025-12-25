import { getScenario, setScenario } from './sim-state'
import { createDefaultScenario } from './scenario-default'

function mergeUniqueEnvelopes(baseEnvelopes, extraEnvelopes) {
  const byId = new Map()
  ;(Array.isArray(baseEnvelopes) ? baseEnvelopes : []).forEach(env => {
    if (env?.envelopeId) byId.set(env.envelopeId, env)
  })
  ;(Array.isArray(extraEnvelopes) ? extraEnvelopes : []).forEach(env => {
    if (!env?.envelopeId) return
    if (!byId.has(env.envelopeId)) byId.set(env.envelopeId, env)
  })
  return Array.from(byId.values())
}

function mergeFleets(baseFleets, extraFleets) {
  const base = Array.isArray(baseFleets) ? baseFleets : []
  const extra = Array.isArray(extraFleets) ? extraFleets : []

  const fleetsBySteward = new Map()
  base.forEach(f => {
    const key = f?.stewardRole || 'Steward'
    fleetsBySteward.set(key, {
      stewardRole: key,
      agents: Array.isArray(f?.agents) ? f.agents.slice() : [],
    })
  })

  extra.forEach(f => {
    const stewardRole = f?.stewardRole || 'Steward'
    const current = fleetsBySteward.get(stewardRole) || { stewardRole, agents: [] }
    const agentsById = new Map()
    ;(Array.isArray(current.agents) ? current.agents : []).forEach(a => {
      const id = a?.agentId || a?.name
      if (!id) return
      agentsById.set(id, a)
    })

    ;(Array.isArray(f?.agents) ? f.agents : []).forEach(a => {
      const id = a?.agentId || a?.name
      if (!id) return
      if (!agentsById.has(id)) {
        agentsById.set(id, a)
        return
      }
      const existing = agentsById.get(id)
      const mergedEnvelopeIds = Array.from(new Set([
        ...((existing?.envelopeIds) || []),
        ...((a?.envelopeIds) || []),
      ].filter(Boolean)))
      agentsById.set(id, { ...existing, ...a, envelopeIds: mergedEnvelopeIds })
    })

    fleetsBySteward.set(stewardRole, { stewardRole, agents: Array.from(agentsById.values()) })
  })

  return Array.from(fleetsBySteward.values())
}

function dedupeEventIds(events) {
  const seen = new Map()
  return (Array.isArray(events) ? events : []).map((e) => {
    const baseId = e?.eventId || 'event'
    const nextCount = (seen.get(baseId) || 0) + 1
    seen.set(baseId, nextCount)
    if (nextCount === 1) return e
    return { ...e, eventId: `${baseId}:v${nextCount}` }
  })
}

export function applyAdditivePatch({ envelopes = [], fleets = [], events = [], durationHours = null } = {}) {
  const current = getScenario()
  const next = {
    ...current,
    id: current?.id,
    title: current?.title,
    durationHours: typeof durationHours === 'number'
      ? Math.max(current?.durationHours ?? 48, durationHours)
      : (current?.durationHours ?? 48),
    envelopes: mergeUniqueEnvelopes(current?.envelopes ?? [], envelopes),
    fleets: mergeFleets(current?.fleets ?? [], fleets),
    events: dedupeEventIds([...(current?.events ?? []), ...(events ?? [])]).sort((a, b) => (a?.hour ?? 0) - (b?.hour ?? 0)),
  }
  return setScenario(next)
}

export function resetScenarioToDefault() {
  return setScenario(createDefaultScenario())
}

export function addRandomEvents(count = 10) {
  const current = getScenario()
  const base = current && Array.isArray(current.envelopes) && current.envelopes.length
    ? current
    : createDefaultScenario()

  const durationHours = base?.durationHours ?? 48
  const envelopes = Array.isArray(base?.envelopes) ? base.envelopes : []
  if (!envelopes.length) return { ok: false, errors: ['No envelopes available.'], warnings: [] }

  const events = []
  const types = ['signal', 'signal', 'revision', 'dsg_session', 'escalation']
  const actors = ['Customer Steward', 'HR Steward', 'Domain Engineer', 'Data Steward', 'Sales Steward']

  for (let i = 0; i < count; i++) {
    const env = envelopes[Math.floor(Math.random() * envelopes.length)]
    const hour = Math.round((Math.random() * durationHours) * 10) / 10
    const type = types[Math.floor(Math.random() * types.length)]
    const eventId = `${type}:rnd:${String(hour).replace('.', '_')}:${env.envelopeId}:${Date.now()}:${i}`
    const actorRole = actors[Math.floor(Math.random() * actors.length)]
    const sessionId = type === 'dsg_session' ? `DSG-RND-${Date.now()}-${i}` : undefined

    events.push({
      eventId,
      hour,
      type,
      envelopeId: env.envelopeId,
      actorRole,
      severity: type === 'signal' ? (Math.random() > 0.7 ? 'warning' : 'info') : 'info',
      value: type === 'signal' ? Math.round((Math.random() * 0.25) * 100) / 100 : undefined,
      signalKey: type === 'signal' ? (Math.random() > 0.5 ? 'assumption_drift' : 'outcome_shift') : undefined,
      label: type === 'revision' ? 'Envelope revised' : type === 'dsg_session' ? 'DSG Review triggered' : type === 'escalation' ? 'Escalation requested' : 'Signal observed',
      detail: type === 'signal' ? 'Observed signal near assumptions boundary' : type === 'escalation' ? 'Escalation triggered due to boundary touch' : 'Scenario event',
      nextAssumptions: type === 'revision' ? (env.assumptions ?? []).concat(['Revision applied from steward calibration.']) : undefined,
      nextConstraints: type === 'revision' ? (env.constraints ?? []).slice(0, Math.max(1, (env.constraints ?? []).length - 1)) : undefined,
      sessionId,
      title: type === 'dsg_session' ? `Calibration: ${env.name}` : undefined,
      facilitatorRole: type === 'dsg_session' ? actorRole : undefined,
      involvedEnvelopeIds: type === 'dsg_session' ? [env.envelopeId] : undefined,
    })
  }

  return applyAdditivePatch({ events })
}

export function addRandomEnvelope() {
  const scenario = getScenario()
  const duration = scenario?.durationHours ?? 48

  const domains = ['Customer', 'Sales', 'HR', 'Finance', 'Platform', 'Data', 'Security']
  const ownerRoles = ['Customer Steward', 'Sales Steward', 'HR Steward', 'Engineering Steward', 'Data Steward', 'Resiliency Steward']
  const domain = domains[Math.floor(Math.random() * domains.length)]
  const ownerRole = ownerRoles[Math.floor(Math.random() * ownerRoles.length)]

  const start = Math.round((Math.random() * Math.max(1, duration - 4)) * 10) / 10
  const windowHours = 6 + Math.floor(Math.random() * 18) // 6..23
  const end = Math.max(start + 1, Math.min(duration, start + windowHours))

  const existingIds = new Set((scenario?.envelopes ?? []).map(e => e?.envelopeId).filter(Boolean))
  const envelopeIdBase = `ENV-RND-${String(Date.now()).slice(-6)}`
  const envelopeId = existingIds.has(envelopeIdBase)
    ? `${envelopeIdBase}-${Math.floor(Math.random() * 999)}`
    : envelopeIdBase

  const accentOptions = ['var(--status-info)', 'var(--status-success)', 'var(--status-warning)', 'var(--status-muted)']
  const accent = accentOptions[Math.floor(Math.random() * accentOptions.length)]

  const envelope = {
    envelopeId,
    name: `${domain} Envelope ${String(envelopeId).slice(-4)}`,
    domain,
    ownerRole,
    createdHour: start,
    endHour: end,
    accent,
    assumptions: [
      `${domain} baseline assumptions hold within approved bounds.`,
      'Signals will be reviewed by the owning steward within 24h.',
    ],
    constraints: [
      'Escalate on boundary touch.',
      'Record decision artifacts for replay.',
    ],
  }

  const promoteEvent = {
    eventId: `envelope_promoted:rnd:${String(start).replace('.', '_')}:${envelopeId}:${Date.now()}`,
    hour: start,
    type: 'envelope_promoted',
    envelopeId,
    actorRole: ownerRole,
    severity: 'info',
    label: 'Envelope created',
    detail: `Envelope opened for ${domain} with steward authority window ${start}→${end}.`,
  }

  const signalHour = Math.min(end, Math.round((start + 1 + Math.random() * Math.max(1, end - start - 1)) * 10) / 10)
  const signalEvent = {
    eventId: `signal:rnd:${String(signalHour).replace('.', '_')}:${envelopeId}:${Date.now()}`,
    hour: signalHour,
    type: 'signal',
    envelopeId,
    actorRole: ownerRole,
    severity: Math.random() > 0.65 ? 'warning' : 'info',
    signalKey: Math.random() > 0.5 ? 'assumption_drift' : 'outcome_shift',
    value: Math.round((Math.random() * 0.25) * 100) / 100,
    label: 'Signal observed',
    detail: 'Observed signal near assumptions boundary.',
  }

  const maybeDSG = Math.random() > 0.75
  const dsgHour = Math.min(end, Math.max(start, Math.round((signalHour + 0.5) * 10) / 10))
  const sessionId = `DSG-RND-ENV-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const dsgEvent = maybeDSG
    ? {
      eventId: `dsg_session:rnd:${String(dsgHour).replace('.', '_')}:${envelopeId}:${Date.now()}`,
      hour: dsgHour,
      type: 'dsg_session',
      envelopeId,
      actorRole: ownerRole,
      severity: 'warning',
      sessionId,
      title: `Calibration: ${envelope.name}`,
      facilitatorRole: ownerRole,
      involvedEnvelopeIds: [envelopeId],
      label: 'DSG Review triggered',
      detail: 'Cross-domain arbitration invoked due to drift risk.',
      trigger: 'Signal threshold crossed',
      scope: `${domain} envelope authority boundary`,
    }
    : null

  return applyAdditivePatch({ envelopes: [envelope], events: [promoteEvent, signalEvent, ...(dsgEvent ? [dsgEvent] : [])] })
}

export async function importEventsFromFile(file) {
  const text = await file.text()
  const parsed = JSON.parse(text)

  const isEventArray = Array.isArray(parsed)
  const isSingleEvent = !isEventArray && parsed && typeof parsed === 'object' && typeof parsed.type === 'string' && typeof parsed.hour === 'number'
  const hasEvents = !isEventArray && !isSingleEvent && parsed && Array.isArray(parsed.events)

  if (!isEventArray && !isSingleEvent && !hasEvents) {
    return {
      ok: false,
      errors: ['Invalid event bundle. Expected an event object, an array of events, or an object with an `events` array.'],
      warnings: [],
    }
  }

  const patch = isEventArray
    ? { events: parsed }
    : isSingleEvent
      ? { events: [parsed] }
      : {
        envelopes: Array.isArray(parsed.envelopes) ? parsed.envelopes : [],
        fleets: Array.isArray(parsed.fleets) ? parsed.fleets : [],
        events: parsed.events,
        durationHours: typeof parsed.durationHours === 'number' ? parsed.durationHours : null,
      }

  return applyAdditivePatch(patch)
}
