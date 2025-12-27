export const SCHEMA_VERSION = 2

const VALID_EVENT_TYPES = new Set([
  'envelope_promoted',
  'signal',
  'decision',
  'revision',
  'boundary_interaction',
  'escalation',
  'dsg_session',
  'dsg_message',
  'annotation',
  'embedding',
])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asString(value) {
  if (typeof value === 'string') return value
  return null
}

function asNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asNullableString(value) {
  const s = asString(value)
  return s === null ? null : s
}

function asStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.filter(v => typeof v === 'string')
}

function buildEventId(event, index) {
  const type = asString(event?.type) || 'event'
  const hour = asNumber(event?.hour)
  const hourKey = hour === null ? 'na' : String(hour).replace('.', '_')
  const env = asString(event?.envelopeId) || asString(event?.sessionId) || 'na'
  return `${type}:${hourKey}:${env}:${index}`
}

export function validateScenario(rawScenario) {
  const errors = []
  const warnings = []

  if (!isRecord(rawScenario)) {
    errors.push('Scenario must be an object.')
    return { ok: false, errors, warnings }
  }

  if (!asString(rawScenario.id)) errors.push('Scenario.id must be a string.')
  if (!asString(rawScenario.title)) errors.push('Scenario.title must be a string.')
  if (asNumber(rawScenario.durationHours) === null) errors.push('Scenario.durationHours must be a number.')

  if (!Array.isArray(rawScenario.envelopes)) errors.push('Scenario.envelopes must be an array.')
  if (!Array.isArray(rawScenario.events)) errors.push('Scenario.events must be an array.')

  const envelopes = Array.isArray(rawScenario.envelopes) ? rawScenario.envelopes : []
  const envelopeIds = new Set()
  envelopes.forEach((env, idx) => {
    if (!isRecord(env)) {
      errors.push(`Envelope[${idx}] must be an object.`)
      return
    }
    const id = asString(env.envelopeId)
    if (!id) errors.push(`Envelope[${idx}].envelopeId must be a string.`)
    else envelopeIds.add(id)

    if (!asString(env.name)) errors.push(`Envelope[${idx}].name must be a string.`)
    if (asNumber(env.createdHour) === null) errors.push(`Envelope[${idx}].createdHour must be a number.`)
    if (asNumber(env.endHour) === null) errors.push(`Envelope[${idx}].endHour must be a number.`)

    const version = asNumber(env.envelope_version ?? env.envelopeVersion)
    if (version !== null && version < 1) warnings.push(`Envelope[${idx}].envelope_version should be >= 1.`)
  })

  const events = Array.isArray(rawScenario.events) ? rawScenario.events : []
  events.forEach((event, idx) => {
    if (!isRecord(event)) {
      errors.push(`Event[${idx}] must be an object.`)
      return
    }
    const type = asString(event.type)
    if (!type) {
      errors.push(`Event[${idx}].type must be a string.`)
      return
    }
    if (!VALID_EVENT_TYPES.has(type)) {
      warnings.push(`Event[${idx}] has unknown type '${type}'.`)
    }

    if (asNumber(event.hour) === null) errors.push(`Event[${idx}].hour must be a number.`)

    // Type-specific expectations (lightweight; keeps evolution easy)
    if (type === 'signal') {
      if (!asString(event.signalKey)) warnings.push(`Signal[${idx}] missing signalKey.`)
      if (!asString(event.severity)) warnings.push(`Signal[${idx}] missing severity.`)
    }
    if (type === 'decision') {
      if (!asString(event.envelopeId)) errors.push(`Decision[${idx}] missing envelopeId.`)
      if (!asString(event.agentId)) warnings.push(`Decision[${idx}] missing agentId.`)
    }
    if (type === 'revision') {
      if (!asString(event.envelopeId)) errors.push(`Revision[${idx}] missing envelopeId.`)
      if (!asString(event.revision_id ?? event.revisionId)) warnings.push(`Revision[${idx}] missing revision_id.`)

      const resolves = asString(event.resolvesEventId ?? event.resolves_eventId ?? event.resolvesEventID ?? event.resolves)
      if ((event.resolvesEventId ?? event.resolves_eventId ?? event.resolvesEventID ?? event.resolves) != null && !resolves) {
        warnings.push(`Revision[${idx}] has non-string resolvesEventId.`)
      }
    }
    if (type === 'boundary_interaction') {
      if (!asString(event.envelopeId)) errors.push(`Boundary interaction[${idx}] missing envelopeId.`)
      if (!asString(event.boundary_kind ?? event.boundaryKind)) warnings.push(`Boundary interaction[${idx}] missing boundary_kind.`)
    }
    if (type === 'dsg_session') {
      if (!asString(event.sessionId)) errors.push(`DSG session[${idx}] missing sessionId.`)
      if (!Array.isArray(event.involvedEnvelopeIds)) warnings.push(`DSG session[${idx}] missing involvedEnvelopeIds.`)
    }
    if (type === 'dsg_message') {
      if (!asString(event.sessionId)) errors.push(`DSG message[${idx}] missing sessionId.`)
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // EMBEDDING SPEC: Event-driven embedding creation rules
    // ═══════════════════════════════════════════════════════════════════════════
    // Embeddings are NOT random - they are created when specific events occur.
    // This ensures decision memory is built logically from meaningful operations.
    //
    // Required embedding triggers:
    //   - decision (especially blocked/escalated): precedent patterns
    //   - boundary_interaction: escalation patterns for future detection
    //   - revision: policy changes with rationale
    //   - signal (significant): baselines and anomalies for drift detection
    //   - dsg_session: governance decisions as session_artifact
    //
    // Embedding rules:
    //   - embeddingType MUST match the sourceEventId event type
    //   - sourceEventId MUST reference an existing event
    //   - hour should be shortly after the source event (embedding captures it)
    //   - semanticContext describes the retrievable pattern
    // ═══════════════════════════════════════════════════════════════════════════
    if (type === 'embedding') {
      if (!asString(event.embeddingId)) warnings.push(`Embedding[${idx}] missing embeddingId.`)
      if (!asString(event.embeddingType)) warnings.push(`Embedding[${idx}] missing embeddingType.`)
      if (!asString(event.sourceEventId)) warnings.push(`Embedding[${idx}] missing sourceEventId.`)
      if (!asString(event.semanticContext)) warnings.push(`Embedding[${idx}] missing semanticContext.`)
    }

    const envId = asString(event.envelopeId)
    if (envId && envelopeIds.size && !envelopeIds.has(envId)) {
      warnings.push(`Event[${idx}] references unknown envelopeId '${envId}'.`)
    }
  })

  return { ok: errors.length === 0, errors, warnings }
}

export function normalizeScenario(rawScenario) {
  const errors = []
  const warnings = []

  if (!isRecord(rawScenario)) {
    errors.push('Scenario must be an object.')
    return { scenario: createEmptyScenario(), errors, warnings }
  }

  const durationHours = asNumber(rawScenario.durationHours) ?? 48
  const scenario = {
    schemaVersion: asNumber(rawScenario.schemaVersion) ?? SCHEMA_VERSION,
    id: asString(rawScenario.id) ?? `scenario-${Date.now()}`,
    title: asString(rawScenario.title) ?? 'Untitled Scenario',
    durationHours,
    envelopes: Array.isArray(rawScenario.envelopes) ? rawScenario.envelopes : [],
    fleets: Array.isArray(rawScenario.fleets) ? rawScenario.fleets : [],
    events: Array.isArray(rawScenario.events) ? rawScenario.events : [],
  }

  scenario.envelopes = scenario.envelopes
    .filter(isRecord)
    .map((env, idx) => {
      const envelopeId = asString(env.envelopeId)
      if (!envelopeId) warnings.push(`Envelope[${idx}] missing envelopeId; it will be omitted.`)
      return {
        envelopeId: envelopeId || '',
        name: asString(env.name) ?? 'Untitled envelope',
        domain: asString(env.domain) ?? '-',
        ownerRole: asString(env.ownerRole) ?? '-',
        createdHour: asNumber(env.createdHour) ?? 0,
        endHour: asNumber(env.endHour) ?? durationHours,
        accent: asString(env.accent) ?? 'var(--status-muted)',
        envelope_version: asNumber(env.envelope_version ?? env.envelopeVersion) ?? 1,
        revision_id: asNullableString(env.revision_id ?? env.revisionId),
        assumptions: asStringArray(env.assumptions),
        constraints: asStringArray(env.constraints),
      }
    })
    .filter(env => Boolean(env.envelopeId))

  scenario.fleets = scenario.fleets
    .filter(isRecord)
    .map(fleet => {
      const agents = Array.isArray(fleet.agents) ? fleet.agents : []
      return {
        stewardRole: asString(fleet.stewardRole) ?? 'Steward',
        agents: agents
          .filter(isRecord)
          .map(agent => ({
            agentId: asString(agent.agentId) ?? asString(agent.name) ?? 'AGENT',
            name: asString(agent.name) ?? asString(agent.agentId) ?? 'Agent',
            role: asString(agent.role) ?? '',
            envelopeIds: asStringArray(agent.envelopeIds),
          })),
      }
    })

  scenario.events = scenario.events
    .filter(isRecord)
    .map((event, idx) => {
      const type = asString(event.type) ?? 'annotation'
      const hour = asNumber(event.hour) ?? 0
      const normalized = {
        eventId: asString(event.eventId) ?? buildEventId(event, idx),
        hour,
        type,
        envelopeId: asString(event.envelopeId) ?? undefined,
        severity: asString(event.severity) ?? undefined,
        label: asString(event.label) ?? undefined,
        detail: asString(event.detail) ?? undefined,

        // Commonly used optional fields across the sim
        actorRole: asString(event.actorRole) ?? undefined,
        actorName: asString(event.actorName) ?? undefined,
        reason: asString(event.reason) ?? undefined,

        // Signals
        signalKey: asString(event.signalKey) ?? undefined,
        value: asNumber(event.value) ?? undefined,
        assumptionRefs: asStringArray(event.assumptionRefs),

        // Decisions (agent execution inside envelope bounds)
        agentId: asString(event.agentId) ?? undefined,
        status: asString(event.status) ?? undefined,

        // Revisions
        revision_id: asString(event.revision_id ?? event.revisionId) ?? undefined,
        envelope_version: asNumber(event.envelope_version ?? event.envelopeVersion) ?? undefined,
        nextAssumptions: asStringArray(event.nextAssumptions),
        nextConstraints: asStringArray(event.nextConstraints),

        // Causality / linkage
        // Used to explicitly indicate that a revision resolves a prior boundary interaction.
        resolvesEventId: asString(event.resolvesEventId ?? event.resolves_eventId ?? event.resolvesEventID ?? event.resolves) ?? undefined,

        // Boundary interactions
        boundary_kind: asString(event.boundary_kind ?? event.boundaryKind) ?? undefined,
        boundary_refs: asStringArray(event.boundary_refs ?? event.boundaryRefs),

        // Decision memory (recall-only join key)
        decision_id: asString(event.decision_id ?? event.decisionId) ?? undefined,

        // DSG
        sessionId: asString(event.sessionId) ?? undefined,
        title: asString(event.title) ?? undefined,
        facilitatorRole: asString(event.facilitatorRole) ?? undefined,
        trigger: asString(event.trigger) ?? undefined,
        scope: asString(event.scope) ?? undefined,
        involvedEnvelopeIds: asStringArray(event.involvedEnvelopeIds),
        impactSummary: asStringArray(event.impactSummary),
        resolutionPolicy: asStringArray(event.resolutionPolicy),
        artifactOutput: Array.isArray(event.artifactOutput) ? event.artifactOutput.filter(isRecord) : [],

        // DSG message
        authorRole: asString(event.authorRole) ?? undefined,
        authorName: asString(event.authorName) ?? undefined,
        kind: asString(event.kind) ?? undefined,
        text: asString(event.text) ?? undefined,

        // Embeddings (decision memory vector storage)
        embeddingId: asString(event.embeddingId) ?? undefined,
        embeddingType: asString(event.embeddingType) ?? undefined,
        vectorDimensions: asNumber(event.vectorDimensions) ?? undefined,
        sourceEventId: asString(event.sourceEventId) ?? undefined,
        semanticContext: asString(event.semanticContext) ?? undefined,
        similarityThreshold: asNumber(event.similarityThreshold) ?? undefined,
      }

      if (!VALID_EVENT_TYPES.has(normalized.type)) {
        warnings.push(`Event '${normalized.eventId}' has unknown type '${normalized.type}'.`)
      }

      return normalized
    })
    .filter(e => typeof e.hour === 'number' && Number.isFinite(e.hour))
    .sort((a, b) => a.hour - b.hour)

  const report = validateScenario(scenario)
  errors.push(...report.errors)
  warnings.push(...report.warnings)

  return { scenario, errors, warnings }
}

/**
 * Parse scenario JSON text, normalize it, and return a structured report.
 * This is the recommended entrypoint for file imports.
 */
export function parseScenarioJson(jsonText) {
  try {
    const parsed = JSON.parse(String(jsonText ?? ''))
    const report = normalizeScenario(parsed)
    return {
      ok: report.errors.length === 0,
      scenario: report.scenario,
      errors: report.errors,
      warnings: report.warnings,
    }
  } catch (err) {
    return {
      ok: false,
      scenario: createEmptyScenario(),
      errors: ['Invalid JSON.'],
      warnings: [],
      cause: err,
    }
  }
}

/**
 * Export a scenario as a portable, schema-normalized object.
 * Useful for persistence, sharing, and deterministic replay.
 */
export function exportScenario(scenario) {
  return normalizeScenario(scenario).scenario
}

/**
 * Export a scenario to JSON text (pretty by default).
 */
export function exportScenarioJson(scenario, { pretty = true } = {}) {
  const normalized = exportScenario(scenario)
  return JSON.stringify(normalized, null, pretty ? 2 : 0)
}

function createEmptyScenario() {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: `scenario-empty-${Date.now()}`,
    title: 'Empty Scenario',
    durationHours: 48,
    envelopes: [],
    fleets: [],
    events: [],
  }
}
