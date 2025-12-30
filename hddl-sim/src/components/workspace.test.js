import { describe, it, expect } from 'vitest'

// Copy pure functions from workspace.js for testing
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#96;')
}

function displayEnvelopeId(envelopeId) {
  return String(envelopeId || '').replace(/^ENV-/, 'DE-')
}

function isNarratableEventType(type) {
  return [
    'envelope_promoted',
    'signal',
    'boundary_interaction',
    'escalation',
    'revision',
    'dsg_session',
    'dsg_message',
    'annotation',
    'decision',
  ].includes(String(type || ''))
}

function buildNarrativeEventKey(e, index) {
  const t = String(e?.type || 'event')
  const h = typeof e?.hour === 'number' ? String(e.hour).replace('.', '_') : 'na'
  const env = String(e?.envelopeId || e?.envelope_id || e?.sessionId || 'na')
  return `${t}:${h}:${env}:${index}`
}

function narrativePrimaryObjectType(e) {
  const type = String(e?.type || '')
  if (type === 'decision') return 'decision'
  if (type === 'revision') return 'revision'
  if (type === 'boundary_interaction' || type === 'escalation') return 'exception'
  if (type === 'dsg_session' || type === 'dsg_message') return 'dsg'
  if (type === 'signal') return 'signal'
  if (type === 'annotation') return 'memory'
  return 'envelope'
}

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar')
  })

  it('escapes less-than and greater-than', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
    )
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('Say "hello"')).toBe('Say &quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("It's working")).toBe('It&#39;s working')
  })

  it('handles multiple special characters', () => {
    expect(escapeHtml('<div class="test" data-value=\'foo&bar\'>')).toBe(
      '&lt;div class=&quot;test&quot; data-value=&#39;foo&amp;bar&#39;&gt;'
    )
  })

  it('converts non-strings to strings', () => {
    expect(escapeHtml(123)).toBe('123')
    expect(escapeHtml(null)).toBe('null')
  })
})

describe('escapeAttr', () => {
  it('escapes all HTML special characters', () => {
    expect(escapeAttr('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes backticks for attribute safety', () => {
    expect(escapeAttr('foo`bar')).toBe('foo&#96;bar')
  })

  it('handles combined threats', () => {
    expect(escapeAttr('<a href="`${xss}`">')).toBe(
      '&lt;a href=&quot;&#96;${xss}&#96;&quot;&gt;'
    )
  })

  it('is safe for template literal injection', () => {
    const userInput = '`${alert("xss")}`'
    const escaped = escapeAttr(userInput)
    expect(escaped).not.toContain('`')
    expect(escaped).toBe('&#96;${alert(&quot;xss&quot;)}&#96;')
  })
})

describe('displayEnvelopeId', () => {
  it('converts ENV- prefix to DE-', () => {
    expect(displayEnvelopeId('ENV-001')).toBe('DE-001')
    expect(displayEnvelopeId('ENV-SALES')).toBe('DE-SALES')
  })

  it('leaves DE- prefixes unchanged', () => {
    expect(displayEnvelopeId('DE-001')).toBe('DE-001')
  })

  it('handles missing or empty IDs', () => {
    expect(displayEnvelopeId('')).toBe('')
    expect(displayEnvelopeId(null)).toBe('')
    expect(displayEnvelopeId(undefined)).toBe('')
  })
})

describe('isNarratableEventType', () => {
  it('returns true for envelope_promoted', () => {
    expect(isNarratableEventType('envelope_promoted')).toBe(true)
  })

  it('returns true for signal', () => {
    expect(isNarratableEventType('signal')).toBe(true)
  })

  it('returns true for boundary_interaction', () => {
    expect(isNarratableEventType('boundary_interaction')).toBe(true)
  })

  it('returns true for revision', () => {
    expect(isNarratableEventType('revision')).toBe(true)
  })

  it('returns true for decision', () => {
    expect(isNarratableEventType('decision')).toBe(true)
  })

  it('returns false for unknown types', () => {
    expect(isNarratableEventType('unknown_event')).toBe(false)
    expect(isNarratableEventType('retrieval')).toBe(false)
  })

  it('handles null and undefined', () => {
    expect(isNarratableEventType(null)).toBe(false)
    expect(isNarratableEventType(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isNarratableEventType('')).toBe(false)
  })
})

describe('buildNarrativeEventKey', () => {
  it('builds key from event with all fields', () => {
    const event = { type: 'signal', hour: 12.5, envelopeId: 'ENV-001' }
    const key = buildNarrativeEventKey(event, 3)
    expect(key).toBe('signal:12_5:ENV-001:3')
  })

  it('replaces decimal points with underscores in hour', () => {
    const event = { type: 'decision', hour: 8.75, envelopeId: 'ENV-002' }
    const key = buildNarrativeEventKey(event, 0)
    expect(key).toBe('decision:8_75:ENV-002:0')
  })

  it('handles missing envelopeId', () => {
    const event = { type: 'revision', hour: 10 }
    const key = buildNarrativeEventKey(event, 5)
    expect(key).toBe('revision:10:na:5')
  })

  it('handles missing hour', () => {
    const event = { type: 'signal', envelopeId: 'ENV-003' }
    const key = buildNarrativeEventKey(event, 1)
    expect(key).toBe('signal:na:ENV-003:1')
  })
})

describe('narrativePrimaryObjectType', () => {
  it('returns "decision" for decision events', () => {
    expect(narrativePrimaryObjectType({ type: 'decision' })).toBe('decision')
  })

  it('returns "revision" for revision events', () => {
    expect(narrativePrimaryObjectType({ type: 'revision' })).toBe('revision')
  })

  it('returns "exception" for boundary_interaction', () => {
    expect(narrativePrimaryObjectType({ type: 'boundary_interaction' })).toBe('exception')
  })

  it('returns "exception" for escalation', () => {
    expect(narrativePrimaryObjectType({ type: 'escalation' })).toBe('exception')
  })

  it('returns "dsg" for dsg_session', () => {
    expect(narrativePrimaryObjectType({ type: 'dsg_session' })).toBe('dsg')
  })

  it('returns "signal" for signal events', () => {
    expect(narrativePrimaryObjectType({ type: 'signal' })).toBe('signal')
  })

  it('returns "memory" for annotation events', () => {
    expect(narrativePrimaryObjectType({ type: 'annotation' })).toBe('memory')
  })

  it('returns "envelope" for unknown types', () => {
    expect(narrativePrimaryObjectType({ type: 'unknown' })).toBe('envelope')
    expect(narrativePrimaryObjectType({})).toBe('envelope')
  })
})
