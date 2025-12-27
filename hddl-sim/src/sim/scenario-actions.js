import { getScenario, getTimeHour, setScenario } from './sim-state'
import { createDefaultScenario } from './scenario-default-simplified'

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
  const types = ['signal', 'signal', 'revision', 'dsg_session', 'boundary_interaction']
  const actors = ['Customer Steward', 'HR Steward', 'Domain Engineer', 'Data Steward', 'Sales Steward']

  for (let i = 0; i < count; i++) {
    const env = envelopes[Math.floor(Math.random() * envelopes.length)]
    const hour = Math.round((Math.random() * durationHours) * 10) / 10
    const type = types[Math.floor(Math.random() * types.length)]
    const eventId = `${type}:rnd:${String(hour).replace('.', '_')}:${env.envelopeId}:${Date.now()}:${i}`
    const actorRole = actors[Math.floor(Math.random() * actors.length)]
    const sessionId = type === 'dsg_session' ? `DSG-RND-${Date.now()}-${i}` : undefined

    const boundaryKinds = ['escalated', 'deferred', 'overridden']
    const boundary_kind = type === 'boundary_interaction'
      ? boundaryKinds[Math.floor(Math.random() * boundaryKinds.length)]
      : undefined

    const revision_id = type === 'revision'
      ? `REV-RND-${env.envelopeId}-${String(Date.now()).slice(-6)}-${i}`
      : undefined

    events.push({
      eventId,
      hour,
      type,
      envelopeId: env.envelopeId,
      actorRole,
      severity: type === 'signal' ? (Math.random() > 0.7 ? 'warning' : 'info') : 'info',
      value: type === 'signal' ? Math.round((Math.random() * 0.25) * 100) / 100 : undefined,
      signalKey: type === 'signal' ? (Math.random() > 0.5 ? 'assumption_drift' : 'outcome_shift') : undefined,
      revision_id,
      envelope_version: type === 'revision' ? undefined : undefined,
      boundary_kind,
      label: type === 'revision'
        ? 'Envelope revised'
        : type === 'dsg_session'
          ? 'DSG Review triggered'
          : type === 'boundary_interaction'
            ? `Boundary interaction ${boundary_kind}`
            : 'Signal observed',
      detail: type === 'signal'
        ? 'Observed signal near assumptions boundary'
        : type === 'boundary_interaction'
          ? 'Envelope boundary touched during execution; action recorded.'
          : 'Scenario event',
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
    envelope_version: 1,
    revision_id: null,
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
    detail: `Envelope opened for ${domain} with steward authority window ${start}->${end}.`,
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

export function tryExpandAuthority() {
  const scenario = getScenario()
  const t = getTimeHour()

  const envelopes = Array.isArray(scenario?.envelopes) ? scenario.envelopes : []
  const target = envelopes.find(e => typeof e?.createdHour === 'number' && typeof e?.endHour === 'number' && e.createdHour <= t && t <= e.endHour)
    || envelopes[0]

  if (!target?.envelopeId) {
    return { ok: false, errors: ['No envelopes available.'], warnings: [] }
  }

  const hour = typeof t === 'number' ? t : 0
  const nowKey = String(Date.now()).slice(-7)
  const eventIdBase = `authority_expand_attempt:${String(hour).replace('.', '_')}:${target.envelopeId}:${nowKey}`

  return applyAdditivePatch({
    events: [
      {
        eventId: `${eventIdBase}:boundary`,
        hour,
        type: 'boundary_interaction',
        envelopeId: target.envelopeId,
        actorRole: 'System',
        severity: 'warning',
        boundary_kind: 'escalated',
        boundary_refs: ['authority_expansion'],
        label: 'Authority expansion refused',
        detail: 'Model proposed an out-of-envelope action. The envelope prohibited it and escalation was created.',
        reason: 'Authority cannot expand silently; it changes only through explicit revision artifacts.'
      },
      {
        eventId: `${eventIdBase}:annotation`,
        hour,
        type: 'annotation',
        envelopeId: target.envelopeId,
        severity: 'info',
        label: 'Why this was refused',
        detail: 'HDDL keeps authority explicit: proposals outside the envelope are refused and routed to stewardship. To expand authority, produce a revision artifact (e.g., via DSG) and increment envelope lineage.'
      }
    ]
  })
}

export function addStewardFleet() {
  const scenario = getScenario()
  const currentFleets = Array.isArray(scenario?.fleets) ? scenario.fleets : []

  const CANON_STEWARDS = [
    'Customer Steward',
    'HR Steward',
    'Sales Steward',
    'Engineering Steward',
    'Data Steward',
    'Resiliency Steward',
    'Business Domain Steward',
    'Engineering/Platform Steward',
  ]

  const CANON_AGENT_TEMPLATES = {
    'Customer Steward': [
      { name: 'ReplyAssist', role: 'response drafting' },
      { name: 'RefundGuard', role: 'refund boundary checks' },
      { name: 'EscalationRouter', role: 'boundary routing + packet' },
    ],
    'HR Steward': [
      { name: 'BiasCheck', role: 'protected-class guardrails' },
      { name: 'TransparencyPacket', role: 'candidate packet compilation' },
      { name: 'InterviewScheduler', role: 'coordination (no surveillance)' },
    ],
    'Sales Steward': [
      { name: 'PipelineTriage', role: 'lead routing within bounds' },
      { name: 'DiscountGuard', role: 'pricing/discount boundary checks' },
      { name: 'RenewalAssist', role: 'renewal packet compilation' },
    ],
    'Engineering Steward': [
      { name: 'DeployGate', role: 'release boundary enforcement' },
      { name: 'SLOSentinel', role: 'latency/error regression detection' },
      { name: 'ChangeSummary', role: 'human-readable change packet' },
    ],
    'Engineering/Platform Steward': [
      { name: 'IntegrationGate', role: 'platform integration envelope checks' },
      { name: 'PolicyProbe', role: 'runtime policy validation' },
      { name: 'RollbackPlanner', role: 'bounded rollback recommendations' },
    ],
    'Data Steward': [
      { name: 'SchemaGuard', role: 'schema contract enforcement' },
      { name: 'LineageTracer', role: 'lineage + provenance packet' },
      { name: 'PIIRedactor', role: 'PII boundary checks' },
    ],
    'Resiliency Steward': [
      { name: 'DriftMonitor', role: 'decision degradation detection' },
      { name: 'IncidentRouter', role: 'escalation routing + packet' },
      { name: 'RecoveryCoach', role: 'bounded recovery runbooks' },
    ],
    'Business Domain Steward': [
      { name: 'OutcomeAnalyst', role: 'outcome telemetry interpretation' },
      { name: 'TradeoffRecorder', role: 'decision memory capture' },
      { name: 'KPIBoundaryCheck', role: 'KPI boundary enforcement' },
    ],
  }

  const STEWARD_ABBR = {
    'Customer Steward': 'CS',
    'HR Steward': 'HR',
    'Sales Steward': 'SALES',
    'Engineering Steward': 'ENG',
    'Engineering/Platform Steward': 'PLAT',
    'Data Steward': 'DATA',
    'Resiliency Steward': 'RES',
    'Business Domain Steward': 'BDS',
  }

  // Cap at 5 total steward fleets to keep the UI readable.
  if (currentFleets.length >= 5) {
    return { ok: false, errors: ['Maximum of 5 stewards reached.'], warnings: [] }
  }

  const usedRoles = new Set(currentFleets.map(f => f?.stewardRole).filter(Boolean))
  const stewardRole = CANON_STEWARDS.find(r => !usedRoles.has(r))
  if (!stewardRole) {
    return { ok: false, errors: ['No canonical stewards remaining to add.'], warnings: [] }
  }

  const abbr = STEWARD_ABBR[stewardRole] || String(stewardRole).replace(/[^A-Za-z]/g, '').slice(0, 6).toUpperCase()
  const agentTemplates = CANON_AGENT_TEMPLATES[stewardRole] || [
    { name: 'ExecutionAssist', role: 'execution agent' },
    { name: 'BoundaryGuard', role: 'boundary checks' },
  ]

  const agentIdsInUse = new Set(
    currentFleets
      .flatMap(f => (Array.isArray(f?.agents) ? f.agents : []))
      .map(a => a?.agentId)
      .filter(Boolean)
  )

  const agents = agentTemplates.map((tpl, idx) => {
    const base = `AG-${abbr}-${String(idx + 1).padStart(2, '0')}`
    let agentId = base
    let bump = 1
    while (agentIdsInUse.has(agentId)) {
      bump += 1
      agentId = `${base}v${bump}`
    }
    return {
      agentId,
      name: tpl.name,
      role: tpl.role,
      envelopeIds: [],
    }
  })

  return applyAdditivePatch({
    fleets: [{ stewardRole, agents }],
  })
}
