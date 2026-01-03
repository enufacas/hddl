export function formatParticleLabel(event) {
  const e = event || {}
  const type = String(e.type || '').toLowerCase()
  const status = String(e.status || '').toLowerCase()
  const boundaryKind = String(e.boundary_kind || e.boundaryKind || '').toLowerCase()
  const boundaryReason = String(e.boundary_reason || '').toLowerCase()

  let prefix = 'Event'
  if (type === 'signal') prefix = 'Signal'
  else if (type === 'revision') prefix = 'Revision'
  else if (type === 'retrieval') prefix = 'Query'
  else if (type === 'boundary_interaction') {
    if (boundaryKind === 'escalated') prefix = 'Exception Request'
    else if (boundaryKind === 'deferred') prefix = 'Deferred Request'
    else if (boundaryKind === 'overridden') prefix = 'Override Request'
    else prefix = 'Boundary'
  }
  else if (type === 'decision') prefix = (status === 'blocked' || status === 'denied') ? 'Decision (blocked)' : 'Decision'

  let core = ''
  if (type === 'signal') core = String(e.label || e.signalKey || 'telemetry')
  else if (type === 'revision') core = String(e.label || e.revision_id || 'bounds updated')
  else if (type === 'retrieval') {
    const count = (e.retrievedEmbeddings || []).length
    const topScore = (e.relevanceScores || [])[0]
    core = count > 0
      ? `${count} result${count !== 1 ? 's' : ''}${topScore ? ` (${(topScore * 100).toFixed(0)}%)` : ''}`
      : 'decision memory'
  }
  else if (type === 'boundary_interaction') {
    core = boundaryReason ? boundaryReason.replace(/_/g, ' ') : String(e.label || boundaryKind || 'interaction')
  }
  else if (type === 'decision') core = String(e.label || (status ? status : 'executed'))
  else core = String(e.label || e.type || 'event')

  return `${prefix}: ${core}`
}

export function wrapTextLinesByChars(input, maxCharsPerLine) {
  const text = String(input || '')
  const maxChars = Math.max(1, Number.isFinite(maxCharsPerLine) ? Math.floor(maxCharsPerLine) : 1)

  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return []

  const lines = []
  let current = ''

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current)
        current = ''
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars))
      }
      continue
    }

    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars) {
      if (current) lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines
}
