// Steward Action Surface
import { formatSimTime, getDecisionMemoryEntries, getEnvelopeAtTime, getEnvelopeStatus, getEventsNearTime, getScenario, getStewardActivity, getTimeHour, onScenarioChange, onTimeChange, setTimeHour, getStewardFilter, setStewardFilter, onFilterChange } from '../sim/sim-state'
import { initGlossaryInline } from '../components/glossary'
import { navigateTo } from '../router'
import { getStewardColor } from '../sim/steward-colors'

let conceptMode = false;
let actionDetailModal = null;

export function render(container) {
  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'page-container';
  root.style.maxWidth = '1400px';
  root.style.margin = '0 auto';
  
  root.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span class="codicon codicon-person" style="font-size: 28px;"></span>
        <div>
          <h1 style="margin: 0;">Steward Action Surface</h1>
          <p style="margin: 0; font-size: 13px; color: var(--vscode-statusBar-foreground);">What stewards can and cannot do · All actions shown · Availability based on timeline state</p>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="min-width: 180px;">
          <div style="font-size: 9px; color: var(--vscode-statusBar-foreground); margin-bottom: 4px; letter-spacing: 0.5px; text-transform: uppercase;">View As</div>
          <select id="steward-filter" style="width: 100%; padding: 6px 10px; background: var(--vscode-input-background); color: var(--vscode-editor-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; font-size: 12px; cursor: pointer;">
            <option value="all">All Envelopes</option>
            <option value="Customer Steward">Customer Steward</option>
            <option value="HR Steward">HR Steward</option>
            <option value="Sales Steward">Sales Steward</option>
            <option value="Data Steward">Data Steward</option>
            <option value="Domain Engineer">Domain Engineer</option>
          </select>
        </div>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; user-select: none;">
          <input type="checkbox" id="concept-mode-toggle" style="cursor: pointer;">
          <span>Concept View</span>
          <span class="codicon codicon-book" style="font-size: 14px;"></span>
        </label>
        <div style="text-align: right;">
          <div style="font-size: 11px; color: var(--vscode-statusBar-foreground); text-transform: uppercase;">Selected Time</div>
          <div id="steward-time" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 14px; font-weight: 600;"></div>
        </div>
        <span class="codicon codicon-calendar" style="font-size: 20px; color: var(--vscode-statusBar-foreground);"></span>
      </div>
    </div>

    <div style="margin: 0 0 10px; font-size: 12px; color: var(--vscode-statusBar-foreground);">
      <a class="glossary-term" href="#" data-glossary-term="Decision Envelope">Decision Envelope</a> ·
      <a class="glossary-term" href="#" data-glossary-term="Revision">Revision</a> ·
      <a class="glossary-term" href="#" data-glossary-term="Boundary Interaction">Boundary Interaction</a> ·
      <a class="glossary-term" href="#" data-glossary-term="Decision Memory">Decision Memory</a>
    </div>

    <div id="glossary-inline" style="display:none; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 12px; border-radius: 6px; margin-bottom: 16px;"></div>

    <div id="actions-container" style="margin-bottom: 24px;"></div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div id="memory-container"></div>
      <div id="activity-container"></div>
    </div>

    <div id="action-detail-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 1000; align-items: center; justify-content: center;"></div>
  `;

  const timeEl = root.querySelector('#steward-time');
  const actionsContainer = root.querySelector('#actions-container');
  const memoryContainer = root.querySelector('#memory-container');
  const activityContainer = root.querySelector('#activity-container');
  const conceptToggle = root.querySelector('#concept-mode-toggle');
  const stewardFilter = root.querySelector('#steward-filter');
  actionDetailModal = root.querySelector('#action-detail-modal');

  conceptToggle.checked = conceptMode;
  conceptToggle.addEventListener('change', (e) => {
    conceptMode = e.target.checked;
    renderActions();
  });

  // Initialize and sync steward filter
  let currentFilter = getStewardFilter();
  
  // Populate filter options based on scenario
  function populateStewardFilter() {
    if (!stewardFilter) return
    const scenario = getScenario()
    const envelopes = scenario?.envelopes ?? []
    const uniqueRoles = new Set(envelopes.map(e => e.ownerRole).filter(Boolean))
    const sortedRoles = Array.from(uniqueRoles).sort()
    
    const currentValue = stewardFilter.value
    stewardFilter.innerHTML = '<option value="all">All Envelopes</option>' +
      sortedRoles.map(role => `<option value="${role}">${role}</option>`).join('')
    
    // Restore selection if it still exists
    if (sortedRoles.includes(currentValue) || currentValue === 'all') {
      stewardFilter.value = currentValue
    } else {
      stewardFilter.value = 'all'
      currentFilter = 'all'
      setStewardFilter('all')
    }
  }
  
  if (stewardFilter) {
    populateStewardFilter();
    stewardFilter.value = currentFilter;
    stewardFilter.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      setStewardFilter(currentFilter);
      renderActions();
    });
  }

  // Listen for filter changes from other pages
  const unsubFilter = onFilterChange((newFilter) => {
    currentFilter = newFilter;
    if (stewardFilter) stewardFilter.value = newFilter;
    renderActions();
  });

  initGlossaryInline(root, {
    panelSelector: '#glossary-inline',
    openDocs: () => navigateTo('/docs'),
  });

  function showActionDetail(action, env, status, hasWarning) {
    const stewardColor = getStewardColor(env.ownerRole);
    actionDetailModal.style.display = 'flex';
    actionDetailModal.innerHTML = `
      <div style="background: var(--vscode-editor-background); border: 1px solid var(--vscode-sideBar-border); border-radius: 8px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
        <div style="padding: 20px; border-bottom: 1px solid var(--vscode-sideBar-border); background: color-mix(in srgb, ${stewardColor} 8%, var(--vscode-sideBar-background)); display: flex; justify-content: space-between; align-items: start;">
          <div style="display: flex; align-items: start; gap: 12px;">
            <span class="codicon codicon-${action.icon}" style="font-size: 32px; color: ${action.isProhibited ? 'var(--status-error)' : stewardColor};"></span>
            <div>
              <h2 style="margin: 0 0 8px 0;">${action.label}</h2>
              <div style="font-size: 12px; color: var(--vscode-statusBar-foreground);">${env.envelopeId}: ${env.name} · ${env.ownerRole}</div>
            </div>
          </div>
          <button id="close-modal" style="background: none; border: none; cursor: pointer; padding: 4px;">
            <span class="codicon codicon-close" style="font-size: 20px;"></span>
          </button>
        </div>
        <div style="padding: 20px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: var(--vscode-statusBar-foreground);">Description</h3>
          <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6;">${action.description}</p>

          <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: var(--vscode-statusBar-foreground);">Example Use Case</h3>
          <div style="padding: 12px; background: var(--vscode-input-background); border-radius: 4px; font-size: 13px; font-style: italic; margin-bottom: 16px; line-height: 1.6;">
            ${action.example}
          </div>

          ${action.detail ? `
            <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: var(--vscode-statusBar-foreground);">Details</h3>
            <p style="margin: 0 0 16px 0; font-size: 13px; color: var(--vscode-statusBar-foreground); line-height: 1.6;">${action.detail}</p>
          ` : ''}

          <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: var(--vscode-statusBar-foreground);">Availability</h3>
          <div style="padding: 12px; background: ${action.isAvailable ? 'color-mix(in srgb, var(--status-success) 20%, var(--vscode-sideBar-background))' : 'var(--vscode-sideBar-background)'}; border-left: 4px solid ${action.isAvailable ? 'var(--status-success)' : 'var(--status-muted)'}; border-radius: 4px; font-size: 13px; margin-bottom: 16px;">
            ${action.isAvailable ? '✓ Available now' : action.availableWhen}
          </div>

          ${action.docLink ? `
            <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: var(--vscode-statusBar-foreground);">Learn More</h3>
            <a href="${action.docLink}" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-radius: 4px; text-decoration: none; font-size: 13px;">
              <span class="codicon codicon-book"></span>
              Steward Playbook
            </a>
          ` : ''}
        </div>
      </div>
    `;

    actionDetailModal.querySelector('#close-modal').addEventListener('click', () => {
      actionDetailModal.style.display = 'none';
    });

    actionDetailModal.addEventListener('click', (e) => {
      if (e.target === actionDetailModal) {
        actionDetailModal.style.display = 'none';
      }
    });
  }

  function renderActions() {
    const scenario = getScenario();
    const t = getTimeHour();
    if (timeEl) timeEl.textContent = formatSimTime(t);

    const allEnvelopes = scenario?.envelopes ?? [];
    // Filter envelopes based on selected steward
    const envelopes = currentFilter === 'all' 
      ? allEnvelopes 
      : allEnvelopes.filter(env => env.ownerRole === currentFilter);
    const near = getEventsNearTime(scenario, t, 6);

    actionsContainer.innerHTML = '';

    // Show message if no envelopes match filter
    if (envelopes.length === 0) {
      actionsContainer.innerHTML = `
        <div style="padding: 60px; text-align: center; color: var(--vscode-statusBar-foreground);">
          <span class="codicon codicon-filter" style="font-size: 48px; opacity: 0.3; display: block; margin-bottom: 16px;"></span>
          <div style="font-size: 14px;">No envelopes found for <strong>${currentFilter}</strong></div>
          <div style="font-size: 12px; margin-top: 8px;">Try selecting a different steward or "All Envelopes"</div>
        </div>
      `;
      return;
    }

    envelopes.forEach((env) => {
      const status = getEnvelopeStatus(env, t);
      const effective = getEnvelopeAtTime(scenario, env.envelopeId, t) || env;
      const envSignals = near.filter(e => e.envelopeId === env.envelopeId && e.type === 'signal');
      const hasWarning = envSignals.some(s => s.severity === 'warning' || s.severity === 'error');
      const stewardColor = getStewardColor(env.ownerRole);

      // Envelope header
      const header = document.createElement('div');
      header.style.cssText = `
        background: color-mix(in srgb, ${stewardColor} 8%, var(--vscode-sideBar-background));
        border-left: 4px solid ${stewardColor};
        padding: 12px 16px;
        margin-bottom: 12px;
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${stewardColor};"></span>
          <strong style="font-size: 15px;">${env.envelopeId}: ${env.name}</strong>
          <span style="font-size: 12px; color: var(--vscode-statusBar-foreground);">${env.ownerRole}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${conceptMode ? '<span style="font-size: 11px; padding: 3px 8px; border-radius: 3px; background: var(--status-info); color: var(--vscode-editor-background); font-weight: 600;">CONCEPT VIEW</span>' : ''}
          <span style="font-size: 12px; padding: 3px 8px; border-radius: 3px; background: ${
            status === 'active' ? 'var(--status-success)' : status === 'pending' ? 'var(--status-info)' : 'var(--status-muted)'
          }; color: var(--vscode-editor-background); font-weight: 600; text-transform: uppercase;">${status}</span>
          <span style="font-size: 12px; font-family: monospace; color: var(--vscode-statusBar-foreground);">${formatSimTime(env.createdHour)} → ${formatSimTime(env.endHour)}</span>
        </div>
      `;
      actionsContainer.appendChild(header);

      // Action definitions with examples and availability logic
      const actions = [
        {
          icon: 'shield',
          label: 'Adjust Authority Bounds',
          category: 'permitted',
          description: 'Narrow or expand decision envelope boundaries based on confidence and drift.',
          example: hasWarning ? 'Drift detected → Narrow autonomy to restore fit' : 'High confidence observed → Consider expanding autonomy',
          enabled: conceptMode || status === 'active',
          availableWhen: `Active window: ${formatSimTime(env.createdHour)} → ${formatSimTime(env.endHour)}`,
          jumpTo: (!conceptMode && status !== 'active') ? (status === 'pending' ? env.createdHour + 2 : null) : null,
          detail: `Currently ${(effective.constraints ?? []).length} constraints, ${(effective.assumptions ?? []).length} assumptions. Requires revision event.`,
          docLink: '/docs#steward-playbook'
        },
        {
          icon: 'law',
          label: 'Record Boundary Interaction',
          category: 'permitted',
          description: 'Document how boundaries were approached or touched without changing authority.',
          example: hasWarning ? 'Warning signals → Record escalation/defer/override decision' : 'Boundary touchpoint → Log interaction type and context',
          enabled: conceptMode || status === 'active',
          availableWhen: `Active window: ${formatSimTime(env.createdHour)} → ${formatSimTime(env.endHour)}`,
          jumpTo: (!conceptMode && status !== 'active') ? (status === 'pending' ? env.createdHour + 2 : null) : null,
          detail: 'Types: escalated (human review), deferred (delayed execution), overridden (boundary exceeded).',
          docLink: '/docs#steward-playbook'
        },
        {
          icon: 'edit',
          label: 'Revise Envelope',
          category: 'permitted',
          description: 'Update assumptions or constraints based on observed signals and drift.',
          example: hasWarning ? 'Warning signals present → Revise to restore assumption fit' : 'Assumption drift observed → Update bounds to reflect reality',
          enabled: conceptMode || status === 'active',
          availableWhen: `Active window: ${formatSimTime(env.createdHour)} → ${formatSimTime(env.endHour)}`,
          jumpTo: (!conceptMode && status !== 'active') ? (status === 'pending' ? env.createdHour + 2 : null) : null,
          detail: 'Creates new version with lineage. Assumptions define expected operating conditions. Constraints define hard boundaries.',
          docLink: '/docs#steward-playbook'
        },
        {
          icon: 'note',
          label: 'Annotate Decision Memory',
          category: 'permitted',
          description: 'Add context to decisions for future recall. Decision memory is read-only after creation.',
          example: 'Document steward intent, business context, or rationale behind envelope changes',
          enabled: conceptMode || status !== 'pending',
          availableWhen: status === 'pending' ? `After envelope starts: ${formatSimTime(env.createdHour)}` : 'Available once envelope is active or ended',
          jumpTo: (!conceptMode && status === 'pending') ? env.createdHour + 1 : null,
          detail: 'Recall-only entries. Cannot be modified after creation. Linked to specific decision_id.',
          docLink: '/docs#steward-playbook'
        },
        {
          icon: 'comment-discussion',
          label: 'Trigger DSG Review',
          category: 'permitted',
          description: 'Request cross-domain stewardship calibration when multiple envelopes interact.',
          example: hasWarning ? 'Multiple boundary interactions → DSG calibration recommended' : 'Cross-domain coordination needed → Initiate DSG session',
          enabled: conceptMode || (status === 'active' && hasWarning),
          availableWhen: hasWarning ? 'Available (warning signals present)' : 'Triggered by warning signals or cross-domain needs',
          jumpTo: (!conceptMode && (!hasWarning || status !== 'active')) ? (status !== 'active' ? env.createdHour + 4 : null) : null,
          detail: 'Involves multiple steward roles. Produces calibration recommendations for envelope adjustments.',
          docLink: '/docs#dsg'
        },
        {
          icon: 'pulse',
          label: 'Monitor Signals',
          category: 'permitted',
          description: 'Observe decision telemetry and envelope health passively.',
          example: 'Track signal trends, boundary proximity, decision outcome patterns over time',
          enabled: true,
          availableWhen: 'Always available',
          jumpTo: null,
          detail: 'Passive monitoring of Decision Telemetry Standard (DTS) signals. No envelope modification.',
          docLink: '/docs#dts'
        },
        {
          icon: 'code',
          label: 'Code Changes',
          category: 'prohibited',
          description: 'NOT PERMITTED for stewards',
          example: 'Implementation logic belongs to Domain Engineers',
          enabled: false,
          availableWhen: 'Never',
          jumpTo: null,
          detail: 'Separation of concerns: stewards tune authority and boundaries, engineers write implementation code.',
          docLink: '/docs#steward-playbook',
          isProhibited: true
        },
        {
          icon: 'hubot',
          label: 'Model Tuning',
          category: 'prohibited',
          description: 'NOT PERMITTED for stewards',
          example: 'Model parameters and hypertuning are engineering concerns',
          enabled: false,
          availableWhen: 'Never',
          jumpTo: null,
          detail: 'Stewards adjust envelope bounds and authority, not model weights or training parameters.',
          docLink: '/docs#steward-playbook',
          isProhibited: true
        },
        {
          icon: 'debug-restart',
          label: 'Direct Execution Override',
          category: 'prohibited',
          description: 'NOT PERMITTED for stewards',
          example: 'Cannot bypass decision envelope at runtime',
          enabled: false,
          availableWhen: 'Never',
          jumpTo: null,
          detail: 'Runtime overrides must be recorded as boundary interactions. No silent bypasses.',
          docLink: '/docs#steward-playbook',
          isProhibited: true
        }
      ];

      // Render action grid (3 columns for efficient space usage)
      const grid = document.createElement('div');
      grid.style.cssText = `
        display: grid; 
        grid-template-columns: repeat(3, 1fr); 
        gap: 12px; 
        margin-bottom: 24px;
        @media (max-width: 900px) {
          grid-template-columns: repeat(2, 1fr);
        }
        @media (max-width: 600px) {
          grid-template-columns: 1fr;
        }
      `;

      actions.forEach(action => {
        const isProhibited = action.isProhibited;
        const isAvailable = !isProhibited && action.enabled;
        
        const card = document.createElement('div');
        card.style.cssText = `
          background: ${isProhibited ? 'color-mix(in srgb, var(--status-error) 10%, var(--vscode-input-background))' : (isAvailable ? 'var(--vscode-sideBar-background)' : 'var(--vscode-sideBar-background)')};
          border: 1px solid ${isProhibited ? 'var(--status-error)' : (isAvailable ? stewardColor : 'var(--vscode-sideBar-border)')};
          padding: 12px;
          border-radius: 4px;
          opacity: ${isAvailable ? '1' : '0.6'};
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
        `;

        if (isAvailable) {
          card.style.boxShadow = '0 0 0 0 ' + stewardColor;
          card.addEventListener('mouseenter', () => {
            card.style.boxShadow = `0 0 0 2px ${stewardColor}`;
            card.style.transform = 'translateY(-2px)';
          });
          card.addEventListener('mouseleave', () => {
            card.style.boxShadow = '0 0 0 0 ' + stewardColor;
            card.style.transform = 'translateY(0)';
          });
        }

        const iconColor = isProhibited ? 'var(--status-error)' : (isAvailable ? stewardColor : 'var(--vscode-statusBar-foreground)');

        card.innerHTML = `
          <div style="display: flex; align-items: start; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="codicon codicon-${action.icon}" style="font-size: 20px; color: ${iconColor}; flex-shrink: 0;"></span>
              <strong style="font-size: 13px; line-height: 1.3;">${action.label}</strong>
            </div>
            ${isProhibited ? '<span title="Stewards cannot perform this action. Domain Engineers handle implementation." style="font-size: 10px; padding: 2px 6px; background: var(--status-error); color: var(--vscode-editor-background); border-radius: 3px; font-weight: 600; cursor: help;">PROHIBITED</span>' : ''}
          </div>
          <p style="margin: 0; font-size: 11px; color: var(--vscode-statusBar-foreground); line-height: 1.4;">${action.description}</p>
          <div style="font-size: 11px; padding: 6px 8px; background: var(--vscode-input-background); border-radius: 3px; font-style: italic; color: var(--vscode-statusBar-foreground); line-height: 1.4;">
            ${action.example}
          </div>
          <div style="font-size: 10px; color: var(--vscode-statusBar-foreground); opacity: 0.8; margin-top: 4px; line-height: 1.3;">
            ${action.detail}
          </div>
          ${!isAvailable && action.jumpTo ? `
            <button class="jump-button" data-time="${action.jumpTo}" style="
              margin-top: 4px;
              padding: 4px 8px;
              font-size: 10px;
              background: ${stewardColor};
              color: var(--vscode-editor-background);
              border: none;
              border-radius: 3px;
              cursor: pointer;
              font-weight: 600;
              font-family: monospace;
            ">
              Jump to ${formatSimTime(action.jumpTo)} →
            </button>
          ` : ''}
          <div style="font-size: 10px; margin-top: 4px; padding-top: 6px; border-top: 1px solid var(--vscode-sideBar-border); color: var(--vscode-statusBar-foreground); display: flex; justify-content: space-between; align-items: center;">
            <span>${isAvailable ? '✓ Available now' : action.availableWhen}</span>
            ${action.docLink ? '<span class="codicon codicon-book" style="opacity: 0.6;"></span>' : ''}
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (!e.target.classList.contains('jump-button')) {
            action.isAvailable = isAvailable;
            showActionDetail(action, env, status, hasWarning);
          }
        });

        const jumpBtn = card.querySelector('.jump-button');
        if (jumpBtn) {
          jumpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const time = parseFloat(e.target.dataset.time);
            setTimeHour(time);
          });
        }

        grid.appendChild(card);
      });

      actionsContainer.appendChild(grid);
    });
  }

  function renderDecisionMemory() {
    const scenario = getScenario();
    const t = getTimeHour();
    const items = getDecisionMemoryEntries(scenario, t, 48);

    memoryContainer.innerHTML = `
      <h3 style="margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
        <span class="codicon codicon-note"></span>
        Decision Memory (recall-only)
      </h3>
    `;

    if (!items.length) {
      memoryContainer.innerHTML += '<div style="padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 4px; color: var(--vscode-statusBar-foreground); font-size: 12px;">No memory entries in last 48h</div>';
      return;
    }

    items.slice(0, 5).forEach((evt) => {
      const card = document.createElement('div');
      card.style.cssText = 'padding: 10px; background: var(--vscode-sideBar-background); border-left: 3px solid var(--status-info); border-radius: 4px; margin-bottom: 8px; font-size: 12px;';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <strong style="font-size: 11px;">${evt.label || 'Memory'}</strong>
          <span style="font-family: monospace; font-size: 10px; color: var(--vscode-statusBar-foreground);">${formatSimTime(evt.hour)}</span>
        </div>
        <div style="font-size: 11px; color: var(--vscode-statusBar-foreground);">${evt.detail || ''}</div>
        ${evt.envelopeId ? `<div style="font-size: 10px; margin-top: 4px; color: var(--vscode-statusBar-foreground);">Envelope: ${evt.envelopeId}</div>` : ''}
      `;
      memoryContainer.appendChild(card);
    });
  }

  function renderRecentActivity() {
    const scenario = getScenario();
    const t = getTimeHour();
    const items = getStewardActivity(scenario, t, 24);

    activityContainer.innerHTML = `
      <h3 style="margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
        <span class="codicon codicon-history"></span>
        Recent Steward Activity
      </h3>
    `;

    if (!items.length) {
      activityContainer.innerHTML += '<div style="padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 4px; color: var(--vscode-statusBar-foreground); font-size: 12px;">No activity in last 24h</div>';
      return;
    }

    items.slice(0, 5).forEach((evt) => {
      const icon = evt.type === 'revision' ? 'edit' : evt.type === 'boundary_interaction' ? 'law' : evt.type === 'dsg_session' ? 'comment-discussion' : 'note';
      const stewardColor = evt.actorRole ? getStewardColor(evt.actorRole) : 'var(--status-info)';

      const card = document.createElement('div');
      card.style.cssText = `padding: 10px; background: color-mix(in srgb, ${stewardColor} 5%, var(--vscode-sideBar-background)); border-left: 3px solid ${stewardColor}; border-radius: 4px; margin-bottom: 8px; font-size: 12px;`;
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="codicon codicon-${icon}" style="font-size: 14px; color: ${stewardColor};"></span>
            <strong style="font-size: 11px;">${evt.label || evt.type}</strong>
          </div>
          <span style="font-family: monospace; font-size: 10px; color: var(--vscode-statusBar-foreground);">${formatSimTime(evt.hour)}</span>
        </div>
        <div style="font-size: 11px; color: var(--vscode-statusBar-foreground);">${evt.actorRole || 'Steward'}</div>
        ${evt.detail ? `<div style="font-size: 11px; margin-top: 4px; color: var(--vscode-statusBar-foreground);">${evt.detail}</div>` : ''}
      `;
      activityContainer.appendChild(card);
    });
  }

  renderActions();
  renderDecisionMemory();
  renderRecentActivity();

  const unsubScenario = onScenarioChange(() => {
    if (!container.isConnected) { unsubScenario(); unsubTime(); unsubFilter(); return; }
    populateStewardFilter();
    renderActions();
    renderDecisionMemory();
    renderRecentActivity();
  });
  
  const unsubTime = onTimeChange(() => {
    if (!container.isConnected) { unsubScenario(); unsubTime(); unsubFilter(); return; }
    renderActions();
    renderDecisionMemory();
    renderRecentActivity();
  });

  container.appendChild(root);
}
