import {
  formatSimTime,
  getEnvelopeAtTime,
  getScenario,
  getTimeHour,
  onScenarioChange,
  onTimeChange,
  getActiveDSGSession,
} from '../sim/sim-state'

export function renderDSGEvent(container) {
  container.innerHTML = `
    <div class="page-container" data-testid="dsg-page">
      <h1>DSG Review</h1>
      <p class="subtitle">Cross-domain arbitration rendered as durable artifacts at the selected timeline time</p>

      <div class="dsg-container">
        <div class="dsg-header">
          <div class="dsg-info">
            <h3 id="dsg-title">No DSG session at selected time</h3>
            <p id="dsg-meta">Move the timeline to a DSG session window.</p>
          </div>
          <div class="dsg-timer">
            <span class="timer-label">Timeline:</span>
            <span class="timer-value" id="dsg-time"></span>
          </div>
        </div>

        <div class="dsg-main">
          <div class="dsg-section" id="dsg-record">
            <h3>DSG Review - Event Record</h3>
            <div class="case-card" id="dsg-record-kv"></div>
          </div>

          <div class="dsg-sidebar">
            <div class="dsg-section">
              <h3>Participating Stewards</h3>
              <div id="steward-list" class="steward-list" data-testid="dsg-stewards"></div>
            </div>

            <div class="dsg-section">
              <h3>Artifact Output</h3>
              <div class="case-card" id="dsg-artifacts" data-testid="dsg-artifacts"></div>
            </div>
          </div>
        </div>

        <div class="dsg-section" style="margin-top: 12px;">
          <h3>Cross-domain Impact (summary)</h3>
          <div class="case-card" id="dsg-impact"></div>
        </div>

        <div class="dsg-section" style="margin-top: 12px;">
          <h3>Resolution Policy (what changed)</h3>
          <div class="case-card" id="dsg-resolution"></div>
        </div>
      </div>
    </div>
  `

  const rerender = () => {
    const scenario = getScenario()
    const timeHour = getTimeHour()
    renderView({ container, scenario, timeHour })
  }

  rerender()
  onTimeChange(rerender)
  onScenarioChange(rerender)
}

function renderView({ container, scenario, timeHour }) {
  const timeEl = container.querySelector('#dsg-time')
  if (timeEl) timeEl.textContent = formatSimTime(timeHour)

  const session = getActiveDSGSession(scenario, timeHour)
  const titleEl = container.querySelector('#dsg-title')
  const metaEl = container.querySelector('#dsg-meta')
  const stewardsEl = container.querySelector('#steward-list')
  const recordEl = container.querySelector('#dsg-record-kv')
  const artifactsEl = container.querySelector('#dsg-artifacts')
  const impactEl = container.querySelector('#dsg-impact')
  const resolutionEl = container.querySelector('#dsg-resolution')

  if (!session) {
    if (titleEl) titleEl.textContent = 'No DSG session at selected time'
    if (metaEl) metaEl.textContent = 'Move the timeline to a DSG session window.'
    if (stewardsEl) stewardsEl.innerHTML = ''
    if (recordEl) recordEl.innerHTML = '<p class="muted">No DSG record at selected time.</p>'
    if (artifactsEl) artifactsEl.innerHTML = '<p class="muted">No artifacts.</p>'
    if (impactEl) impactEl.innerHTML = '<p class="muted">-</p>'
    if (resolutionEl) resolutionEl.innerHTML = '<p class="muted">-</p>'
    return
  }

  if (titleEl) titleEl.textContent = session.title || session.label || `DSG Session ${session.sessionId || ''}`
  if (metaEl) metaEl.textContent = `Time: ${formatSimTime(session.hour)} | Scope: ${session.scope || 'cross-domain review'} | Facilitator: ${session.facilitatorRole || 'Steward'}`

  const participants = Array.isArray(session.participants) ? session.participants : []
  if (stewardsEl) {
    stewardsEl.innerHTML = participants
      .map(s => {
        const initial = (s?.name || '?').slice(0, 1).toUpperCase()
        const name = s?.name || 'Unknown'
        const role = s?.role || 'Steward'
        const status = s?.status || 'observing'
        return `
          <div class="steward-item">
            <div class="steward-avatar">${initial}</div>
            <div class="steward-info">
              <div class="steward-name">${escapeHtml(name)}</div>
              <div class="steward-role">${escapeHtml(role)}</div>
            </div>
            <div class="steward-status ${escapeHtml(status)}">${escapeHtml(status)}</div>
          </div>
        `
      })
      .join('')
  }

  const involvedEnvelopeIds = Array.isArray(session.involvedEnvelopeIds)
    ? session.involvedEnvelopeIds
    : (session.envelopeId ? [session.envelopeId] : [])

  const involvedNames = involvedEnvelopeIds
    .map(id => {
      const env = id ? getEnvelopeAtTime(scenario, id, timeHour) : null
      return env ? `${env.envelopeId} - ${env.name}` : id
    })

  if (recordEl) {
    recordEl.innerHTML = `
      <div class="event__row"><span class="k">Trigger</span><span class="v">${escapeHtml(session.trigger || session.detail || 'Cross-domain boundary collision')}</span></div>
      <div class="event__row"><span class="k">Involved envelopes</span><span class="v">${escapeHtml(involvedNames.join(' / ') || '-')}</span></div>
      <div class="event__row"><span class="k">Decision</span><span class="v">${escapeHtml('Clarify authority + constrain capability')}</span></div>
    `
  }

  if (impactEl) {
    const impact = Array.isArray(session.impactSummary) ? session.impactSummary : []
    impactEl.innerHTML = impact.length
      ? `<ul style="margin: 0; padding-left: 18px;">${impact.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
      : '<p class="muted">-</p>'
  }

  if (resolutionEl) {
    const policy = Array.isArray(session.resolutionPolicy) ? session.resolutionPolicy : []
    resolutionEl.innerHTML = policy.length
      ? `<ul style="margin: 0; padding-left: 18px;">${policy.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
      : '<p class="muted">-</p>'
  }

  if (artifactsEl) {
    const artifacts = Array.isArray(session.artifactOutput) ? session.artifactOutput : []

    const revisions = (scenario?.events ?? [])
      .filter(e => e && e.type === 'revision' && typeof e.hour === 'number')
      .filter(e => e.hour >= session.hour && e.hour <= timeHour)
      .filter(e => involvedEnvelopeIds.includes(e.envelopeId))
      .sort((a, b) => a.hour - b.hour)

    const revisionLines = revisions.map(r => {
      const when = formatSimTime(r.hour)
      return `<li>Envelope: <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${escapeHtml(r.envelopeId)}</span> / ${escapeHtml(when)} (${escapeHtml(r.actorRole || 'Steward')})</li>`
    })

    artifactsEl.innerHTML = `
      <div class="pillrow" style="display:flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
        ${artifacts
          .slice(0, 6)
          .map(a => `<span class="pill" style="border: 1px solid var(--vscode-sideBar-border); background: var(--vscode-editor-background); border-radius: 999px; padding: 2px 8px; font-size: 11px; color: var(--vscode-statusBar-foreground);">${escapeHtml(a.type)}</span>`)
          .join('')}
      </div>
      <div style="margin-bottom: 8px; color: var(--vscode-statusBar-foreground); font-size: 12px;">Revisions observed by selected time:</div>
      ${revisionLines.length ? `<ul style="margin: 0; padding-left: 18px;">${revisionLines.join('')}</ul>` : '<p class="muted">No revisions observed yet.</p>'}
    `
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
