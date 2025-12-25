// Envelope Detail Modal
import { formatSimTime, getEnvelopeAtTime, getEnvelopeHistory, getEventsNearTime, getScenario, getTimeHour } from '../sim/sim-state'

export function createEnvelopeDetailModal(envelopeId) {
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
  const created = envelope ? formatSimTime(envelope.createdHour ?? 0) : formatSimTime(0)
  const revised = envelope?.revisedHour != null ? formatSimTime(envelope.revisedHour) : null

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
    : [{ metric: 'Signal feed', expected: '—', actual: 'No signals near selected time', status: 'success' }]
  
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
              <span>•</span>
              <span class="codicon codicon-${status === 'active' ? 'pass-filled' : status === 'pending' ? 'clock' : 'circle-slash'}" style="color: var(--status-${status === 'active' ? 'success' : 'warning'});"></span>
              <span>${status}</span>
            </div>
          </div>
        </div>
        <button class="monaco-button" id="close-modal" style="padding: 6px 12px;">
          <span class="codicon codicon-close"></span>
        </button>
      </div>
      
      <p style="color: var(--vscode-statusBar-foreground); margin-bottom: 12px;">${envelope?.domain ? `Domain: ${envelope.domain}` : ''}</p>
      <p style="color: var(--vscode-statusBar-foreground); margin-bottom: 32px;">
        Window: ${created}${revised ? ` • Revised: ${revised}` : ''}
      </p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div>
          <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span class="codicon codicon-checklist"></span>
            Assumptions
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
            Constraints
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
        Revision History
      </h3>
      <div style="background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 16px; border-radius: 6px;">
        ${(historyRows.length ? historyRows : [{ time: created, author: envelope?.ownerRole || 'Steward', action: 'Created envelope', detail: 'Initial parameters set' }]).map(r => `
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
      
    </div>
  `;
  
  modal.appendChild(modalContent);
  
  // Close handlers
  const closeBtn = modalContent.querySelector('#close-modal');
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  return modal;
}
