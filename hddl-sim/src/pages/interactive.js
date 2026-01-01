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
    <div style="display:flex; align-items:center; gap: 12px; margin-bottom: 24px;">
      <span class="codicon codicon-debug-start" style="font-size: 28px; opacity: 0.5;"></span>
      <div>
        <h1 style="margin: 0;">Interactive Scenario</h1>
        <p style="margin: 0; opacity: 0.7;">Action-driven scenario progression</p>
      </div>
    </div>

    <div style="padding: 24px; border: 1px solid var(--vscode-widget-border); border-radius: 6px; background: var(--vscode-editor-background); text-align: center;">
      <span class="codicon codicon-info" style="font-size: 48px; opacity: 0.3; display: block; margin-bottom: 16px;"></span>
      <h2 style="margin: 0 0 8px 0; font-size: 16px;">Not Yet Implemented</h2>
      <p style="margin: 0; opacity: 0.7; font-size: 13px;">
        Interactive scenario features are planned for a future release.<br>
        This will allow action-driven progression through scenarios with real-time decision-making.
      </p>
    </div>
  `

  container.appendChild(root)
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
