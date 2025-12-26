// Steward Action Surface
import { formatSimTime, getDecisionMemoryEntries, getEnvelopeAtTime, getEnvelopeStatus, getEventsNearTime, getScenario, getStewardActivity, getTimeHour, onScenarioChange, onTimeChange } from '../sim/sim-state'
import { initGlossaryInline } from '../components/glossary'
import { navigateTo } from '../router'

export function render(container) {
  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'page-container';
  root.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
      <span class="codicon codicon-person" style="font-size: 28px;"></span>
      <div>
        <h1 style="margin: 0;">Steward Actions</h1>
        <p style="margin: 0;">Envelope revision, boundary interactions, and decision memory (recall-only)</p>
      </div>
    </div>

    <div style="margin: 10px 0 12px; font-size: 12px; color: var(--vscode-statusBar-foreground);">
      Terms:
      <a class="glossary-term" href="#" data-glossary-term="Decision Envelope">Decision Envelope</a>,
      <a class="glossary-term" href="#" data-glossary-term="Revision">Revision</a>,
      <a class="glossary-term" href="#" data-glossary-term="Boundary Interaction">Boundary Interaction</a>,
      <a class="glossary-term" href="#" data-glossary-term="Decision Memory">Decision Memory</a>
    </div>

    <div id="glossary-inline" style="display:none; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 12px; border-radius: 6px; margin-bottom: 12px;"></div>

    <div style="display:flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 12px 0 20px; padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; background: var(--vscode-editorWidget-background);">
      <div style="display:flex; align-items:center; gap: 8px;">
        <span class="codicon codicon-calendar"></span>
        <div>
          <div style="font-size: 11px; color: var(--vscode-statusBar-foreground);">SELECTED TIME</div>
          <div id="steward-time" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;"></div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap: 8px; color: var(--vscode-statusBar-foreground); font-size: 12px;">
        <span class="codicon codicon-info"></span>
        Actions become available as signals and envelope status change.
      </div>
    </div>
  `;

  // Permitted actions section
  const actionsSection = document.createElement('div');
  actionsSection.innerHTML = `
    <h2 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
      <span class="codicon codicon-checklist"></span>
      Permitted Steward Actions
    </h2>
  `;

  const actionGrid = document.createElement('div');
  actionGrid.className = 'card-grid';
  actionGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 32px;';

  const timeEl = root.querySelector('#steward-time')

  initGlossaryInline(root, {
    panelSelector: '#glossary-inline',
    openDocs: () => navigateTo('/docs'),
  })

  function renderActions() {
    const scenario = getScenario()
    const t = getTimeHour()
    if (timeEl) timeEl.textContent = formatSimTime(t)

    const envelopes = scenario?.envelopes ?? []
    const near = getEventsNearTime(scenario, t, 6)

    actionGrid.innerHTML = ''

    envelopes.forEach((env) => {
      const status = getEnvelopeStatus(env, t)
      const effective = getEnvelopeAtTime(scenario, env.envelopeId, t) || env
      const envSignals = near.filter(e => e.envelopeId === env.envelopeId && e.type === 'signal')
      const hasWarning = envSignals.some(s => s.severity === 'warning' || s.severity === 'error')

      const actions = [
        {
          icon: 'shield',
          label: 'Narrow or Expand Envelope',
          description: `Adjust boundaries (${(effective.constraints ?? []).length} constraints at t).`,
          color: 'var(--status-info)',
          enabled: status === 'active'
        },
        {
          icon: 'law',
          label: 'Record Boundary Interaction',
          description: hasWarning ? 'Signals indicate elevated risk; record how the boundary was touched (escalated/deferred/overridden).' : 'Record an escalation/defer/override touchpoint without changing authority.',
          color: 'var(--status-warning)',
          enabled: status === 'active'
        },
        {
          icon: 'edit',
          label: 'Revise Assumptions / Constraints',
          description: hasWarning ? 'Warning signals present near t; revise envelope to restore assumption fit.' : 'Update envelope assumptions based on observed signals.',
          color: 'var(--status-info)',
          enabled: status === 'active'
        },
        {
          icon: 'note',
          label: 'Annotate Decision Memory',
          description: 'Add context to decisions and steward intent.',
          color: 'var(--status-info)',
          enabled: status !== 'pending'
        },
        {
          icon: 'comment-discussion',
          label: 'Trigger DSG Review',
          description: hasWarning ? 'Cross-domain calibration recommended due to warning signal(s).' : 'Request cross-domain stewardship review.',
          color: 'var(--status-warning)',
          enabled: status === 'active' && hasWarning
        },
        {
          icon: 'ban',
          label: 'Code Changes',
          description: 'Not permitted for stewards',
          color: 'var(--status-muted)',
          enabled: false
        },
        {
          icon: 'ban',
          label: 'Model Tuning',
          description: 'Not permitted for stewards',
          color: 'var(--status-muted)',
          enabled: false
        },
        {
          icon: 'ban',
          label: 'Execution Overrides',
          description: 'Not permitted for stewards',
          color: 'var(--status-muted)',
          enabled: false
        }
      ]

      const group = document.createElement('div')
      group.style.cssText = 'grid-column: 1 / -1; margin-top: 8px;'
      group.innerHTML = `
        <div style="display:flex; justify-content: space-between; gap: 12px; align-items: baseline; margin: 6px 0 10px;">
          <div style="font-weight: 700;">${env.envelopeId}: ${env.name}</div>
          <div style="font-size: 12px; color: var(--vscode-statusBar-foreground);">Status at t: ${status}</div>
        </div>
      `
      actionGrid.appendChild(group)

      actions.forEach(action => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = `background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 16px; border-radius: 6px; ${!action.enabled ? 'opacity: 0.5;' : 'cursor: pointer;'}`;
        
        card.innerHTML = `
          <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 12px;">
            <span class="codicon codicon-${action.icon}" style="font-size: 24px; color: ${action.color}; flex-shrink: 0;"></span>
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0; font-size: 14px;">${action.label}</h3>
              <p style="margin: 0; font-size: 12px; color: var(--vscode-statusBar-foreground);">${action.description}</p>
              <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-statusBar-foreground);">Envelope: ${env.envelopeId}</div>
            </div>
            ${action.enabled ? '<span class="codicon codicon-chevron-right" style="color: var(--vscode-statusBar-foreground);"></span>' : ''}
          </div>
        `;
        
        if (action.enabled) {
          card.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('hddl:status', {
              detail: {
                message: `Steward action '${action.label}' not implemented yet.`,
                kind: 'info',
              }
            }));
          });
        }
        
        actionGrid.appendChild(card);
      })
    })
  }

  renderActions()

  const unsubScenario = onScenarioChange(() => {
    if (!container.isConnected) { unsubScenario(); unsubTime(); return }
    renderActions()
    renderRecentActivity()
  })
  const unsubTime = onTimeChange(() => {
    if (!container.isConnected) { unsubScenario(); unsubTime(); return }
    renderActions()
    renderRecentActivity()
  })

  actionsSection.appendChild(actionGrid);
  root.appendChild(actionsSection);

  // Decision memory (recall-only)
  const memorySection = document.createElement('div');
  memorySection.innerHTML = `
    <h2 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
      <span class="codicon codicon-note"></span>
      Decision Memory (recall-only)
    </h2>
  `;

  const memoryList = document.createElement('div');
  memoryList.style.cssText = 'display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px;';

  function renderDecisionMemory() {
    const scenario = getScenario()
    const t = getTimeHour()
    const items = getDecisionMemoryEntries(scenario, t, 48)
    memoryList.innerHTML = ''

    if (!items.length) {
      const empty = document.createElement('div')
      empty.style.cssText = 'padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; color: var(--vscode-statusBar-foreground);'
      empty.textContent = 'No decision memory entries in the last 48h.'
      memoryList.appendChild(empty)
      return
    }

    items.slice(0, 8).forEach((evt) => {
      const card = document.createElement('div');
      card.style.cssText = 'display: flex; gap: 12px; padding: 12px; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; align-items: start;';

      card.innerHTML = `
        <span class="codicon codicon-note" style="font-size: 24px; color: var(--status-info); flex-shrink: 0; margin-top: 4px;"></span>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
            <div style="font-weight: 600;">${evt.label || 'Decision memory'}${evt.decision_id ? ` - ${evt.decision_id}` : ''}</div>
            <div style="font-size: 11px; color: var(--vscode-statusBar-foreground); font-family: monospace;">${formatSimTime(evt.hour)}</div>
          </div>
          <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 4px;">
            <span class="codicon codicon-link" style="font-size: 12px;"></span>
            recall-only ${evt.envelopeId ? ` • envelope: ${evt.envelopeId}` : ''}
          </div>
          <div style="font-size: 12px; color: var(--vscode-statusBar-foreground);">${evt.detail || ''}</div>
        </div>
      `;

      memoryList.appendChild(card);
    })
  }

  renderDecisionMemory()
  memorySection.appendChild(memoryList);
  root.appendChild(memorySection);

  // Recent steward activity
  const activitySection = document.createElement('div');
  activitySection.innerHTML = `
    <h2 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
      <span class="codicon codicon-history"></span>
      Recent Steward Activity
    </h2>
  `;

  const activityList = document.createElement('div');
  activityList.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

  function renderRecentActivity() {
    const scenario = getScenario()
    const t = getTimeHour()
    const items = getStewardActivity(scenario, t, 24)
    activityList.innerHTML = ''

    if (!items.length) {
      const empty = document.createElement('div')
      empty.style.cssText = 'padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; color: var(--vscode-statusBar-foreground);'
      empty.textContent = 'No steward activity in the last 24h.'
      activityList.appendChild(empty)
      return
    }

    items.slice(0, 8).forEach((evt) => {
      const icon = evt.type === 'revision' ? 'edit'
        : evt.type === 'boundary_interaction' ? 'law'
          : evt.type === 'escalation' ? 'arrow-up'
            : evt.type === 'dsg_session' ? 'comment-discussion'
              : 'note'
      const color = evt.severity === 'warning' ? 'var(--status-warning)' : evt.severity === 'error' ? 'var(--status-error)' : 'var(--status-info)'
      const title = evt.label || (evt.type === 'revision' ? 'Envelope revised' : evt.type === 'boundary_interaction' ? 'Boundary interaction' : evt.type === 'escalation' ? 'Escalation requested' : evt.type === 'dsg_session' ? 'DSG session' : evt.type)
      const lineage = evt.type === 'revision' ? `v${evt.envelope_version ?? ''}${evt.revision_id ? ` • ${evt.revision_id}` : ''}` : ''
      const boundary = evt.type === 'boundary_interaction' ? (evt.boundary_kind || '') : ''

      const activityCard = document.createElement('div');
      activityCard.style.cssText = 'display: flex; gap: 12px; padding: 12px; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; align-items: start;';

      activityCard.innerHTML = `
        <span class="codicon codicon-${icon}" style="font-size: 24px; color: ${color}; flex-shrink: 0; margin-top: 4px;"></span>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
            <div style="font-weight: 600;">${title}${evt.envelopeId ? ` - ${evt.envelopeId}` : ''}</div>
            <div style="font-size: 11px; color: var(--vscode-statusBar-foreground); font-family: monospace;">${formatSimTime(evt.hour)}</div>
          </div>
          <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 4px;">
            <span class="codicon codicon-person" style="font-size: 12px;"></span>
            ${evt.actorRole || 'Steward'}
          </div>
          ${lineage ? `<div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${lineage}</div>` : ''}
          ${boundary ? `<div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 4px;">Boundary: <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${boundary}</span></div>` : ''}
          <div style="font-size: 12px; color: var(--vscode-statusBar-foreground);">${evt.detail || ''}</div>
        </div>
      `;

      activityList.appendChild(activityCard);
    })
  }

  renderRecentActivity()

  activitySection.appendChild(activityList);
  root.appendChild(activitySection);

  container.appendChild(root);
}
