// Envelope Detail Modal
import { formatSimTime, getBoundaryInteractionCounts, getEnvelopeAtTime, getEnvelopeHistory, getEnvelopeLineage, getEventsNearTime, getScenario, getTimeHour } from '../sim/sim-state'
import { toSemver } from '../sim/steward-colors'
import { initGlossaryInline } from './glossary'
import { navigateTo } from '../router'

export function createEnvelopeDetailModal(envelopeId) {
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

  const modal = document.createElement('div');
  modal.className = 'envelope-detail-modal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 1000; display: flex; align-items: center; justify-content: center;';
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = 'background: var(--vscode-editor-background); border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; width: 90%; max-width: 1200px; max-height: 90vh; overflow: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.4);';
  
  const scenario = getScenario()
  const t = getTimeHour()
  const base = (scenario?.envelopes ?? []).find(e => e.envelopeId === envelopeId) || (scenario?.envelopes ?? [])[0]
  const envelope = base ? (getEnvelopeAtTime(scenario, base.envelopeId, t) || base) : null

  const status = envelope ? (t < envelope.createdHour ? 'pending' : (t >= envelope.endHour ? 'ended' : 'active')) : 'active'
  const windowStart = envelope ? formatSimTime(envelope.createdHour ?? 0) : formatSimTime(0)
  const windowEnd = envelope ? formatSimTime(envelope.endHour ?? (envelope.createdHour ?? 0)) : formatSimTime(0)
  const revised = envelope?.revisedHour != null ? formatSimTime(envelope.revisedHour) : null
  const version = envelope?.envelope_version ?? 1
  const revisionId = envelope?.revision_id || '-'

  const boundary = envelope ? getBoundaryInteractionCounts(scenario, t, 24) : null
  const boundaryBucket = envelope ? boundary?.byEnvelope?.get?.(envelope.envelopeId) : null
  const boundaryEscalated = boundaryBucket?.escalated ?? 0
  const boundaryOverridden = boundaryBucket?.overridden ?? 0
  const boundaryDeferred = boundaryBucket?.deferred ?? 0

  const lineageUpToTime = envelope
    ? getEnvelopeLineage(scenario, envelope.envelopeId)
      .filter(v => typeof v.hour === 'number' && v.hour <= t)
      .sort((a, b) => a.hour - b.hour)
    : []

  const revisionTrailRows = lineageUpToTime
    .map((entry, idx) => ({ entry, idx }))
    .filter(({ entry }) => entry?.kind === 'revision')
    .map(({ entry, idx }) => {
      const prev = lineageUpToTime[idx - 1]
      const assumptionsDiff = diffLists(prev?.assumptions, entry?.assumptions)
      const constraintsDiff = diffLists(prev?.constraints, entry?.constraints)

      const matchingEvent = (scenario?.events ?? [])
        .filter(e => e && e.type === 'revision' && e.envelopeId === envelope.envelopeId)
        .find(e =>
          (e.revision_id && entry.revision_id && e.revision_id === entry.revision_id) ||
          (e.eventId && entry.revision_id && e.eventId === entry.revision_id) ||
          (typeof e.hour === 'number' && typeof entry.hour === 'number' && e.hour === entry.hour)
        )

      return {
        time: typeof entry.hour === 'number' ? formatSimTime(entry.hour) : '—',
        fromVersion: prev?.envelope_version ?? null,
        toVersion: entry?.envelope_version ?? null,
        revisionId: entry?.revision_id ?? null,
        why: matchingEvent?.detail || matchingEvent?.label || '',
        assumptions: assumptionsDiff,
        constraints: constraintsDiff,
      }
    })

  const revisionTrailHtml = revisionTrailRows.length
    ? revisionTrailRows.map(r => {
      const hasChanges = Boolean(
        r.assumptions.added.length || r.assumptions.removed.length ||
        r.constraints.added.length || r.constraints.removed.length
      )
      const header = (r.fromVersion != null && r.toVersion != null)
        ? `v${toSemver(r.fromVersion)} → v${toSemver(r.toVersion)}`
        : (r.toVersion != null ? `v${toSemver(r.toVersion)}` : 'Revision')

      return `
        <div style="padding: 12px 0; border-bottom: 1px solid var(--vscode-sideBar-border);">
          <div style="display:flex; justify-content: space-between; gap: 12px; margin-bottom: 6px;">
            <div style="font-weight: 600;">${header}</div>
            <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 11px; color: var(--vscode-statusBar-foreground);">${r.time}</div>
          </div>
          ${r.revisionId ? `<div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 11px; color: var(--vscode-statusBar-foreground); margin-bottom: 6px;">${r.revisionId}</div>` : ''}
          <div style="font-size: 13px; margin: 6px 0 10px; color: var(--vscode-editor-foreground);">${r.why || '<span style="color: var(--vscode-statusBar-foreground);">No revision rationale provided.</span>'}</div>

          <div style="display:flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 10px;">
            <span>Assumptions: +${r.assumptions.added.length} / -${r.assumptions.removed.length}</span>
            <span>Constraints: +${r.constraints.added.length} / -${r.constraints.removed.length}</span>
          </div>

          ${hasChanges
            ? `
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div>
                  <div style="font-size: 11px; color: var(--vscode-statusBar-foreground); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;"><a class="glossary-term" href="#" data-glossary-term="Assumption">Assumptions</a></div>
                  ${[...r.assumptions.added.slice(0, 2).map(x => `<div style="font-size: 12px; margin-bottom: 6px;"><span class="codicon codicon-add" style="color: var(--status-success);"></span> ${x}</div>`),
                      ...r.assumptions.removed.slice(0, 2).map(x => `<div style="font-size: 12px; margin-bottom: 6px;"><span class="codicon codicon-remove" style="color: var(--status-error);"></span> ${x}</div>`)].join('')}
                </div>
                <div>
                  <div style="font-size: 11px; color: var(--vscode-statusBar-foreground); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;"><a class="glossary-term" href="#" data-glossary-term="Constraint">Constraints</a></div>
                  ${[...r.constraints.added.slice(0, 2).map(x => `<div style="font-size: 12px; margin-bottom: 6px;"><span class="codicon codicon-add" style="color: var(--status-success);"></span> ${x}</div>`),
                      ...r.constraints.removed.slice(0, 2).map(x => `<div style="font-size: 12px; margin-bottom: 6px;"><span class="codicon codicon-remove" style="color: var(--status-error);"></span> ${x}</div>`)].join('')}
                </div>
              </div>
            `
            : '<div style="color: var(--vscode-statusBar-foreground); font-size: 12px;">No assumption/constraint changes in this revision.</div>'}
        </div>
      `
    }).join('')
    : '<div style="color: var(--vscode-statusBar-foreground); font-size: 12px;">No revisions yet for this envelope at the selected time.</div>'

  const history = envelope ? getEnvelopeHistory(scenario, envelope.envelopeId) : []
  const historyRows = history.map((e) => {
    const action = e.type === 'revision'
      ? 'Revised envelope'
      : e.type === 'escalation'
        ? 'Added escalation rule'
        : e.type === 'dsg_session'
          ? 'Triggered DSG review'
          : e.type === 'envelope_promoted'
            ? 'Promoted envelope'
            : e.type === 'signal'
              ? 'Observed signal'
              : e.type
    return {
      time: formatSimTime(e.hour),
      author: e.actorRole || (envelope?.ownerRole ?? 'Steward'),
      action,
      detail: e.detail || e.label || ''
    }
  })

  const recentSignals = envelope ? getEventsNearTime(scenario, t, 12).filter(e => e.type === 'signal' && e.envelopeId === envelope.envelopeId) : []
  const signals = recentSignals.length
    ? recentSignals.map(s => ({
      metric: s.signalKey || 'signal',
      expected: (Array.isArray(s.assumptionRefs) && s.assumptionRefs[0]) ? s.assumptionRefs[0] : 'Within assumptions',
      actual: typeof s.value === 'number' ? `${Math.round(s.value * 100)}%` : (s.detail || ''),
      status: s.severity === 'warning' || s.severity === 'error' ? 'warning' : 'success'
    }))
    : [{ metric: 'Signal feed', expected: '-', actual: 'No signals near selected time', status: 'success' }]
  
  modalContent.innerHTML = `
    <div style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <span class="codicon codicon-shield" style="font-size: 32px;"></span>
          <div>
            <div style="font-family: monospace; font-size: 12px; color: var(--vscode-statusBar-foreground);">${envelope?.envelopeId || envelopeId}</div>
            <h2 style="margin: 4px 0 8px 0;">${envelope?.name || 'Envelope'}</h2>
            <div style="display: flex; align-items: center; gap: 12px; font-size: 13px;">
              <span class="codicon codicon-person"></span>
              <span>${envelope?.ownerRole || 'Steward'}</span>
              <span>-</span>
              <span class="codicon codicon-${status === 'active' ? 'pass-filled' : status === 'pending' ? 'clock' : 'circle-slash'}" style="color: var(--status-${status === 'active' ? 'success' : 'warning'});"></span>
              <span>${status}</span>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="monaco-button" id="open-glossary-btn" style="padding: 6px 12px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);">
            Open Glossary
          </button>
          <button class="monaco-button" id="close-modal" style="padding: 6px 12px;">
            Close
          </button>
        </div>
      </div>
      
      <p style="color: var(--vscode-statusBar-foreground); margin-bottom: 12px;">${envelope?.domain ? `Domain: ${envelope.domain}` : ''}</p>
      <p style="color: var(--vscode-statusBar-foreground); margin-bottom: 32px;">
        Window: ${windowStart} - ${windowEnd}${revised ? ` • Revised: ${revised}` : ''}
      </p>

      <div style="margin: 0 0 12px; font-size: 12px; color: var(--vscode-statusBar-foreground);">
        Terms:
        <a class="glossary-term" href="#" data-glossary-term="Decision Envelope">Decision Envelope</a>,
        <a class="glossary-term" href="#" data-glossary-term="Assumption">Assumption</a>,
        <a class="glossary-term" href="#" data-glossary-term="Constraint">Constraint</a>,
        <a class="glossary-term" href="#" data-glossary-term="Boundary Interaction">Boundary Interaction</a>,
        <a class="glossary-term" href="#" data-glossary-term="Revision">Revision</a>
      </div>

      <div id="glossary-inline" style="display:none; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 12px; border-radius: 6px; margin-bottom: 12px;"></div>

      <div style="display:flex; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; padding: 10px 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; background: var(--vscode-editorWidget-background);">
        <div style="display:flex; flex-direction: column; gap: 2px;">
          <div style="font-size: 10px; color: var(--vscode-statusBar-foreground); letter-spacing: 0.6px;">CURRENT VERSION</div>
          <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">v${toSemver(version)}</div>
        </div>
        <div style="display:flex; flex-direction: column; gap: 2px;">
          <div style="font-size: 10px; color: var(--vscode-statusBar-foreground); letter-spacing: 0.6px;">LAST REVISION</div>
          <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${revisionId}</div>
        </div>
        <div style="display:flex; flex-direction: column; gap: 6px; min-width: 220px;">
          <div style="font-size: 10px; color: var(--vscode-statusBar-foreground); letter-spacing: 0.6px;">BOUNDARY (LAST 24H)</div>
          <div style="display:flex; gap: 8px; flex-wrap: wrap; font-size: 11px;">
            <span style="border: 1px solid var(--vscode-sideBar-border); border-left: 3px solid var(--status-warning); background: var(--vscode-editor-background); color: var(--vscode-statusBar-foreground); padding: 2px 8px; border-radius: 999px;">Escalated: ${boundaryEscalated}</span>
            <span style="border: 1px solid var(--vscode-sideBar-border); border-left: 3px solid var(--status-error); background: var(--vscode-editor-background); color: var(--vscode-statusBar-foreground); padding: 2px 8px; border-radius: 999px;">Overridden: ${boundaryOverridden}</span>
            <span style="border: 1px solid var(--vscode-sideBar-border); border-left: 3px solid var(--status-info); background: var(--vscode-editor-background); color: var(--vscode-statusBar-foreground); padding: 2px 8px; border-radius: 999px;">Deferred: ${boundaryDeferred}</span>
          </div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div>
          <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span class="codicon codicon-checklist"></span>
            <a class="glossary-term" href="#" data-glossary-term="Assumption">Assumptions</a>
          </h3>
          <div style="background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 16px; border-radius: 6px;">
            ${(envelope?.assumptions ?? []).map(a => `
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <span class="codicon codicon-check" style="color: var(--status-info); flex-shrink: 0;"></span>
                <span style="font-size: 13px;">${a}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div>
          <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span class="codicon codicon-law"></span>
            <a class="glossary-term" href="#" data-glossary-term="Constraint">Constraints</a>
          </h3>
          <div style="background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 16px; border-radius: 6px;">
            ${(envelope?.constraints ?? []).map(c => `
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <span class="codicon codicon-shield-check" style="color: var(--status-warning); flex-shrink: 0;"></span>
                <span style="font-size: 13px;">${c}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <h3 style="display: flex; align-items: center; gap: 8px; margin: 24px 0 12px 0;">
        <span class="codicon codicon-pulse"></span>
        Signal Health
      </h3>
      <div style="background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 16px; border-radius: 6px;">
        ${signals.map(s => `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--vscode-sideBar-border);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="codicon codicon-${s.status === 'success' ? 'pass-filled' : 'warning'}" style="color: var(--status-${s.status});"></span>
              <span style="font-weight: 500;">${s.metric}</span>
            </div>
            <div style="display: flex; gap: 16px; font-size: 13px;">
              <span style="color: var(--vscode-statusBar-foreground);">Expected: ${s.expected}</span>
              <span style="font-weight: 600;">Actual: ${s.actual}</span>
            </div>
          </div>
        `).join('')}
      </div>
      
      <h3 style="display: flex; align-items: center; gap: 8px; margin: 24px 0 12px 0;">
        <span class="codicon codicon-history"></span>
        <a class="glossary-term" href="#" data-glossary-term="Decision Envelope">Envelope History</a>
      </h3>
      <div style="background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 16px; border-radius: 6px;">
        ${(historyRows.length ? historyRows : [{ time: windowStart, author: envelope?.ownerRole || 'Steward', action: 'Created envelope', detail: 'Initial parameters set' }]).map(r => `
          <div style="padding: 12px 0; border-bottom: 1px solid var(--vscode-sideBar-border);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-weight: 600;">${r.action}</span>
              <span style="font-family: monospace; font-size: 11px;">${r.time}</span>
            </div>
            <div style="font-size: 12px; color: var(--vscode-statusBar-foreground);">
              <span class="codicon codicon-person"></span> ${r.author}
            </div>
            <div style="font-size: 13px; margin-top: 8px;">${r.detail}</div>
          </div>
        `).join('')}
      </div>

      <h3 style="display: flex; align-items: center; gap: 8px; margin: 24px 0 12px 0;">
        <span class="codicon codicon-diff"></span>
        <a class="glossary-term" href="#" data-glossary-term="Revision">Revisions (effective up to selected time)</a>
      </h3>
      <div style="background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 16px; border-radius: 6px;">
        ${revisionTrailHtml}
      </div>
      
    </div>
  `;
  
  modal.appendChild(modalContent);

  initGlossaryInline(modalContent, {
    panelSelector: '#glossary-inline',
    openDocs: () => navigateTo('/docs'),
  })
  
  // Close handlers
  const closeBtn = modalContent.querySelector('#close-modal');
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  const glossaryBtn = modalContent.querySelector('#open-glossary-btn');
  glossaryBtn.addEventListener('click', () => {
    modal.remove();
    // Use setTimeout to ensure modal is removed before navigation
    setTimeout(() => {
      navigateTo('/docs#glossary');
    }, 0);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  return modal;
}
