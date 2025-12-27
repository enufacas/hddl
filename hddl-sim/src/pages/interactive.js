// Interactive Scenario Page (Phase 2 - Experimental)
import { 
  getInteractiveState, 
  getActionLog, 
  dispatchAction, 
  resetInteractiveState,
  onStateChange,
  onActionDispatched,
  getSeed,
  setSeed,
} from '../sim/interactive-store'
import { navigateTo } from '../router'
import { initGlossaryInline } from '../components/glossary'

export function render(container) {
  container.innerHTML = ''

  const root = document.createElement('div')
  root.className = 'page-container'
  root.innerHTML = `
    <div style="display:flex; align-items:center; gap: 12px; margin-bottom: 12px;">
      <span class="codicon codicon-debug-start" style="font-size: 28px;"></span>
      <div>
        <h1 style="margin: 0;">Interactive Scenario (Experimental)</h1>
        <p style="margin: 0;">Action-driven progression • Phase 2 semantics</p>
      </div>
    </div>

    <div style="margin: 10px 0 12px; font-size: 12px; color: var(--vscode-statusBar-foreground);">
      Terms:
      <a class="glossary-term" href="#" data-glossary-term="Decision Envelope">Decision Envelope</a>,
      <a class="glossary-term" href="#" data-glossary-term="Revision">Revision</a>,
      <a class="glossary-term" href="#" data-glossary-term="Boundary Interaction">Boundary Interaction</a>
    </div>

    <div id="glossary-inline" style="display:none; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 12px; border-radius: 6px; margin-bottom: 12px;"></div>

    <div style="padding: 12px; margin-bottom: 16px; border: 1px solid var(--status-warning); border-radius: 6px; background: var(--vscode-inputValidation-warningBackground); color: var(--vscode-inputValidation-warningForeground);">
      <div style="display:flex; align-items:start; gap: 8px;">
        <span class="codicon codicon-warning" style="font-size: 16px; margin-top: 2px;"></span>
        <div>
          <div style="font-weight: 700; margin-bottom: 4px;">Phase 2 - Experimental</div>
          <div style="font-size: 12px;">
            Interactive scenario semantics are not yet stable. The action log schema exists, but:
            <ul style="margin: 8px 0 0; padding-left: 20px;">
              <li>Reducer/transition logic is not yet implemented</li>
              <li>Authorization semantics are not yet defined</li>
              <li>Conformance fixtures do not yet exist</li>
            </ul>
            See <a href="#" data-navigate="/docs" style="color: inherit; text-decoration: underline;">docs/spec/Drift_Gap_Analysis.md</a> for status.
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
      <div style="padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; background: var(--vscode-sideBar-background);">
        <div style="font-weight: 700; margin-bottom: 8px;">Current State</div>
        <div id="interactive-state" style="font-size: 12px; color: var(--vscode-statusBar-foreground);"></div>
      </div>

      <div style="padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; background: var(--vscode-sideBar-background);">
        <div style="font-weight: 700; margin-bottom: 8px;">Session Config</div>
        <div style="display:flex; flex-direction: column; gap: 8px;">
          <label style="display:flex; align-items:center; gap: 8px; font-size: 12px;">
            <span>Seed:</span>
            <input type="number" id="interactive-seed" value="${getSeed()}" style="flex: 1; padding: 4px 6px; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); color: var(--vscode-input-foreground); border-radius: 4px;" />
          </label>
          <button type="button" id="interactive-reset" class="monaco-button monaco-text-button" style="padding: 4px 10px;">Reset State</button>
        </div>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h2 style="margin-bottom: 12px;">Available Actions</h2>
      <div id="interactive-actions" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;"></div>
    </div>

    <div>
      <h2 style="margin-bottom: 12px;">Action Log</h2>
      <div id="interactive-log" style="display:flex; flex-direction: column; gap: 8px;"></div>
    </div>
  `

  initGlossaryInline(root, {
    panelSelector: '#glossary-inline',
    openDocs: () => navigateTo('/docs'),
  })

  // Wire up navigation
  root.querySelectorAll('[data-navigate]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault()
      const path = el.getAttribute('data-navigate')
      if (path) navigateTo(path)
    })
  })

  // Seed control
  const seedInput = root.querySelector('#interactive-seed')
  if (seedInput) {
    seedInput.addEventListener('change', () => {
      const val = parseInt(seedInput.value, 10)
      if (Number.isFinite(val)) setSeed(val)
    })
  }

  // Reset button
  const resetBtn = root.querySelector('#interactive-reset')
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetInteractiveState()
      window.dispatchEvent(new CustomEvent('hddl:status', { detail: { message: 'Interactive state reset', kind: 'info' } }))
    })
  }

  // Render functions
  function renderState() {
    const stateEl = root.querySelector('#interactive-state')
    if (!stateEl) return

    const state = getInteractiveState()
    stateEl.innerHTML = `
      <div style="display:flex; flex-direction: column; gap: 6px;">
        <div><strong>Hour:</strong> ${state.hour}</div>
        <div><strong>Envelopes:</strong> ${state.envelopes.length}</div>
        <div><strong>Events:</strong> ${state.events.length}</div>
        <div><strong>Pending Actions:</strong> ${state.pendingActions.length}</div>
      </div>
    `
  }

  function renderActions() {
    const actionsEl = root.querySelector('#interactive-actions')
    if (!actionsEl) return

    // Phase 2: populate with canonical actions
    // For now, show placeholders
    const placeholderActions = [
      { type: 'emit_signal', label: 'Emit Signal', icon: 'pulse', disabled: true },
      { type: 'attempt_decision', label: 'Attempt Decision', icon: 'check', disabled: true },
      { type: 'apply_revision', label: 'Apply Revision', icon: 'edit', disabled: true },
      { type: 'escalate_boundary', label: 'Escalate Boundary', icon: 'arrow-up', disabled: true },
      { type: 'advance_time', label: 'Advance Time', icon: 'clock', disabled: true },
    ]

    actionsEl.innerHTML = placeholderActions.map(action => `
      <button 
        type="button" 
        class="monaco-button ${action.disabled ? 'monaco-text-button' : ''}"
        data-action="${action.type}"
        ${action.disabled ? 'disabled' : ''}
        style="padding: 12px; text-align: left; display: flex; align-items: center; gap: 8px; ${action.disabled ? 'opacity: 0.6; cursor: not-allowed;' : ''}"
      >
        <span class="codicon codicon-${action.icon}" style="font-size: 18px;"></span>
        <span>${action.label}</span>
      </button>
    `).join('')

    // Wire up action buttons (Phase 2: implement handlers)
    actionsEl.querySelectorAll('[data-action]').forEach(btn => {
      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          const actionType = btn.getAttribute('data-action')
          const result = dispatchAction({ type: actionType })
          
          if (!result.ok) {
            window.dispatchEvent(new CustomEvent('hddl:status', { 
              detail: { message: `Action failed: ${result.error}`, kind: 'error' } 
            }))
          } else if (result.warning) {
            window.dispatchEvent(new CustomEvent('hddl:status', { 
              detail: { message: result.warning, kind: 'warning' } 
            }))
          }
        })
      }
    })
  }

  function renderLog() {
    const logEl = root.querySelector('#interactive-log')
    if (!logEl) return

    const log = getActionLog()
    
    if (!log.length) {
      logEl.innerHTML = `
        <div style="padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; color: var(--vscode-statusBar-foreground);">
          No actions dispatched yet. Use the action buttons above to begin.
        </div>
      `
      return
    }

    logEl.innerHTML = log.slice().reverse().map(entry => `
      <div style="padding: 10px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; background: var(--vscode-sideBar-background);">
        <div style="display:flex; justify-content: space-between; align-items:start; margin-bottom: 6px;">
          <div style="font-weight: 700;">#${entry.index}: ${entry.action.type}</div>
          <div style="font-size: 11px; color: var(--vscode-statusBar-foreground); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
            t=${entry.hour}
          </div>
        </div>
        <div style="font-size: 12px; color: var(--vscode-statusBar-foreground);">
          ${JSON.stringify(entry.action, null, 2).split('\\n').slice(0, 3).join('\\n')}
        </div>
      </div>
    `).join('')
  }

  // Initial render
  renderState()
  renderActions()
  renderLog()

  // Subscribe to changes
  const unsubState = onStateChange(() => {
    renderState()
    renderActions()
  })

  const unsubAction = onActionDispatched(() => {
    renderLog()
  })

  container.appendChild(root)

  // Cleanup
  return () => {
    unsubState()
    unsubAction()
  }
}
