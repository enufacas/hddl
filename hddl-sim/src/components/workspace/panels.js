// Panel components for workspace layout
// Handles activity bar, auxiliary bar (AI Narrative), and bottom panel (terminals/telemetry)

import { navigateTo } from '../../router'
import {
  formatSimTime,
  getBoundaryInteractionCounts,
  getEnvelopeStatus,
  getScenario,
  getTimeHour,
  onScenarioChange,
  onTimeChange,
  getStewardFilter,
  onFilterChange
} from '../../sim/sim-state'
import { getStewardColor } from '../../sim/steward-colors'
import { initGlossaryInline } from '../glossary'
import {
  escapeHtml,
  escapeAttr,
  displayEnvelopeId,
  isNarratableEventType,
  buildNarrativeEventKey,
  narrativePrimaryObjectType,
  loadLayoutState,
  saveLayoutState
} from './utils'
import { mountAINarrative } from './ai-narrative'

// updateTelemetry will be injected by workspace.js to avoid circular dependency
let _updateTelemetry = null
export function setUpdateTelemetry(fn) {
  _updateTelemetry = fn
}
function updateTelemetry(...args) {
  if (!_updateTelemetry) {
    console.error('updateTelemetry not initialized - call setUpdateTelemetry first')
    return
  }
  return _updateTelemetry(...args)
}

// Activity bar icons (primary lenses)
const activityBarItems = [
  { id: 'envelopes', icon: 'shield', label: 'Decision Envelopes', route: '/' },
  { id: 'dts', icon: 'pulse', label: 'Decision Telemetry System', route: '/decision-telemetry' },
  { id: 'stewardship', icon: 'law', label: 'Stewards', route: '/stewardship' },
]

// Normalize route for comparison
const normalizeRoute = (route) => {
  const normalized = route.replace(/\/+$/, '').toLowerCase()
  return normalized === '' ? '/' : normalized
}

function setAuxCollapsed(collapsed) {
  document.body.classList.toggle('aux-hidden', Boolean(collapsed))
  
  // Remove inline CSS variable set by layout manager to let CSS rules take effect
  if (!collapsed) {
    document.documentElement.style.removeProperty('--auxiliarybar-width')
  }
  
  const state = loadLayoutState()
  saveLayoutState({ ...state, auxCollapsed: Boolean(collapsed) })
}

function setBottomCollapsed(collapsed) {
  document.body.classList.toggle('panel-hidden', Boolean(collapsed))
  const state = loadLayoutState()
  saveLayoutState({ ...state, bottomCollapsed: Boolean(collapsed) })
}

// Create activity bar
function createActivityBar() {
  const activitybar = document.createElement('div');
  activitybar.className = 'part activitybar';
  activitybar.setAttribute('role', 'navigation');
  
  const actionBar = document.createElement('div');
  actionBar.className = 'monaco-action-bar';
  
  const actionsContainer = document.createElement('ul');
  actionsContainer.className = 'actions-container';
  actionsContainer.setAttribute('role', 'toolbar');
  
  activityBarItems.forEach(item => {
    const li = document.createElement('li');
    li.className = 'action-item activity-item';
    li.setAttribute('role', 'presentation');
    li.dataset.route = item.route;
    
    const button = document.createElement('a');
    button.className = 'action-label';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', item.label);
    button.setAttribute('tabindex', '0');
    button.title = item.label;
    button.dataset.route = item.route;
    
    const icon = document.createElement('span');
    icon.className = `codicon codicon-${item.icon}`;
    button.appendChild(icon);
    
    // Set active based on current route
    if (normalizeRoute(window.location.pathname) === normalizeRoute(item.route)) {
      li.classList.add('active', 'checked');
    }
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.route);
    });
    
    li.appendChild(button);
    actionsContainer.appendChild(li);
  });
  
  actionBar.appendChild(actionsContainer);
  activitybar.appendChild(actionBar);
  
  return activitybar;
}

// Create auxiliary bar with AI Narrative panel
function createAuxiliaryBar() {
  const auxiliarybar = document.createElement('div');
  auxiliarybar.className = 'part auxiliarybar';
  auxiliarybar.id = 'auxiliarybar';
  auxiliarybar.setAttribute('role', 'complementary');
  
  const header = document.createElement('div');
  header.className = 'composite title';
  
  const titleContainer = document.createElement('div');
  titleContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%;';
  
  const title = document.createElement('h3');
  title.textContent = 'AI NARRATIVE';
  title.style.cssText = 'font-size: 11px; font-weight: 600; margin: 0;';
  
  const minimizeButton = document.createElement('a');
  minimizeButton.className = 'codicon codicon-chevron-right';
  minimizeButton.setAttribute('role', 'button');
  minimizeButton.setAttribute('aria-label', 'Minimize Panel');
  minimizeButton.style.cssText = 'cursor: pointer; padding: 4px;';
  minimizeButton.addEventListener('click', () => {
    setAuxCollapsed(true);
  });
  
  titleContainer.appendChild(title);
  titleContainer.appendChild(minimizeButton);
  
  header.appendChild(titleContainer);
  
  const content = document.createElement('div');
  content.className = 'content';
  content.setAttribute('data-testid', 'ai-narrative-panel');
  
  auxiliarybar.appendChild(header);
  auxiliarybar.appendChild(content);
  
  // Mount AI narrative UI
  mountAINarrative(content);
  
  return auxiliarybar;
}

// Create bottom panel with terminals and telemetry
function createBottomPanel() {
  const panel = document.createElement('div')
  panel.className = 'part panel'
  panel.id = 'panel'
  panel.setAttribute('role', 'region')
  panel.setAttribute('aria-label', 'Panel')

  const tabs = [
    { id: 'envelopes', label: 'ENVELOPES' },
    { id: 'steward', label: 'STEWARD ACTIVITY' },
    { id: 'cli', label: 'HDDL CLI' },
    { id: 'evidence', label: 'DTS STREAM' },
  ]

  panel.innerHTML = `
    <div class="panel-header">
      <div class="panel-tabs" role="tablist" aria-label="Panel tabs">
        ${tabs
          .map((t, idx) => {
            const isActive = t.id === 'cli' && idx === tabs.length - 1
            return `
              <button
                class="panel-tab ${t.id === 'cli' ? 'active' : ''}"
                type="button"
                role="tab"
                aria-selected="${t.id === 'cli' ? 'true' : 'false'}"
                data-tab="${t.id}"
              >${t.label}</button>
            `
          })
          .join('')}
      </div>
      <div class="panel-actions">
        <button class="panel-action" type="button" aria-label="Close panel" title="Close" data-action="close-panel">
          <span class="codicon codicon-close" aria-hidden="true"></span>
        </button>
        <button class="panel-action" type="button" aria-label="Clear panel" title="Clear">
          <span class="codicon codicon-clear-all" aria-hidden="true"></span>
        </button>
      </div>
    </div>
    <div class="panel-body" data-testid="terminal-panel">
      ${tabs
        .map(
          t =>
            `<div class="terminal-output" data-terminal="${t.id}" aria-label="${t.label} output"></div>`
        )
        .join('')}
      <div class="terminal-input-row" id="terminal-input-row">
        <span class="terminal-prompt" id="terminal-prompt" aria-hidden="true"></span>
        <input class="terminal-input" id="terminal-input" type="text" autocomplete="off" spellcheck="false" aria-label="Terminal input" />
      </div>
    </div>
  `

  const outputEls = new Map(
    Array.from(panel.querySelectorAll('.terminal-output[data-terminal]')).map(el => [el.dataset.terminal, el])
  )

  const inputEl = panel.querySelector('#terminal-input')
  const inputRowEl = panel.querySelector('#terminal-input-row')
  const promptEl = panel.querySelector('#terminal-prompt')
  const closeBtn = panel.querySelector('[data-action="close-panel"]')
  const clearBtn = panel.querySelector('.panel-action:not([data-action="close-panel"])')

  let activeTab = 'cli'

  let lastObservedTime = getTimeHour()
  let lastEmittedTime = lastObservedTime
  let lastScenarioId = getScenario()?.id || 'unknown'

  const setPrompt = () => {
    if (!promptEl) return
    promptEl.textContent = `hddl@${formatSimTime(getTimeHour())}>`
  }

  const getOutputEl = (tabId) => outputEls.get(tabId) || outputEls.get('cli')

  const writeLine = (tabId, text, kind = 'normal') => {
    const outputEl = getOutputEl(tabId)
    if (!outputEl) return
    const line = document.createElement('div')
    line.className = `terminal-line terminal-line--${kind}`
    line.textContent = text
    outputEl.appendChild(line)
    outputEl.scrollTop = outputEl.scrollHeight
  }

  const setActiveTab = (tabId) => {
    activeTab = tabId
    panel.querySelectorAll('.panel-tab[data-tab]').forEach(btn => {
      const isActive = btn.dataset.tab === tabId
      btn.classList.toggle('active', isActive)
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false')
    })
    panel.querySelectorAll('.terminal-output[data-terminal]').forEach(el => {
      el.style.display = el.dataset.terminal === tabId ? 'block' : 'none'
    })
    const cliActive = tabId === 'cli'
    if (inputRowEl) inputRowEl.style.display = cliActive ? 'flex' : 'none'
    if (cliActive && inputEl) inputEl.focus()
    
    // Initialize Evidence (Bounded) tab on first activation
    if (tabId === 'evidence') {
      initializeEvidenceBounded()
    }
  }

  const initializeEvidenceBounded = () => {
    const outputEl = getOutputEl('evidence')
    if (!outputEl) return
    if (outputEl.dataset.initialized === 'true') return
    outputEl.dataset.initialized = 'true'

    outputEl.style.padding = '12px'
    outputEl.style.overflow = 'auto'

    const rerender = () => {
      const scenario = getScenario()
      const timeHour = getTimeHour()
      updateTelemetry(outputEl, scenario, timeHour)
    }

    rerender()
    onTimeChange(() => {
      if (!outputEl.isConnected) return
      if (activeTab !== 'evidence') return
      rerender()
    })
    onScenarioChange(() => {
      if (!outputEl.isConnected) return
      if (activeTab !== 'evidence') return
      rerender()
    })
    onFilterChange(() => {
      if (!outputEl.isConnected) return
      if (activeTab !== 'evidence') return
      rerender()
    })
  }

  const formatEventLine = (event) => {
    const ts = formatSimTime(event?.hour)
    const envelope = event?.envelopeId ? ` ${event.envelopeId}` : ''

    if (event?.type === 'envelope_promoted') {
      return {
        envelopes: { text: `[${ts}] ACTIVE${envelope} - ${event.detail || event.label || ''}`.trim(), kind: 'info' },
        steward: null,
        dts: null,
      }
    }
    if (event?.type === 'signal') {
      const sev = (event.severity || 'info').toUpperCase()
      const key = event.signalKey ? ` ${event.signalKey}` : ''
      const detail = event.detail || event.label || ''
      return {
        envelopes: { text: `[${ts}] ${sev}${envelope}${key} - ${detail}`.trim(), kind: sev === 'WARNING' ? 'warning' : 'info' },
        steward: null,
        dts: null,
      }
    }
    if (event?.type === 'boundary_interaction') {
      const kind = String(event?.boundary_kind || 'boundary').toUpperCase()
      const actor = event.actorRole ? ` by ${event.actorRole}` : ''
      const detail = event.detail || event.label || ''
      const line = `[${ts}] ${kind}${envelope}${actor} - ${detail}`.trim()
      return {
        envelopes: { text: line, kind: event.severity === 'warning' ? 'warning' : 'info' },
        steward: { text: line, kind: event.severity === 'warning' ? 'warning' : 'info' },
        dts: null,
      }
    }
    if (event?.type === 'escalation') {
      const actor = event.actorRole ? ` by ${event.actorRole}` : ''
      const detail = event.detail || event.label || ''
      return {
        envelopes: null,
        steward: { text: `[${ts}] ESCALATION${envelope}${actor} - ${detail}`.trim(), kind: event.severity === 'warning' ? 'warning' : 'info' },
        dts: null,
      }
    }
    if (event?.type === 'dsg_session') {
      const session = event.sessionId ? ` ${event.sessionId}` : ''
      const title = event.title ? ` - ${event.title}` : ''
      return {
        envelopes: { text: `[${ts}] DSG REVIEW${session}${envelope}${title}`.trim(), kind: 'info' },
        steward: { text: `[${ts}] DSG REVIEW${session}${envelope}${title}`.trim(), kind: 'info' },
        dts: null,
      }
    }
    if (event?.type === 'revision') {
      const actor = event.actorRole ? ` by ${event.actorRole}` : ''
      const detail = event.detail || event.label || ''
      return {
        envelopes: { text: `[${ts}] REVISION${envelope}${actor} - ${detail}`.trim(), kind: 'info' },
        steward: { text: `[${ts}] REVISION${envelope}${actor} - ${detail}`.trim(), kind: 'info' },
        dts: null,
      }
    }

    return null
  }

  const emitTimelineEvents = (fromTime, toTime) => {
    const scenario = getScenario()
    const events = scenario?.events ?? []
    if (!Array.isArray(events) || !events.length) return

    // Keep this focused and envelope-relevant.
    const allowed = new Set(['envelope_promoted', 'signal', 'boundary_interaction', 'escalation', 'dsg_session', 'revision'])
    const slice = events
      .filter(e => e && allowed.has(e.type) && typeof e.hour === 'number')
      .filter(e => e.hour > fromTime && e.hour <= toTime)
      .sort((a, b) => a.hour - b.hour)

    slice.forEach(ev => {
      const formatted = formatEventLine(ev)
      if (!formatted) return

      if (formatted.envelopes) writeLine('envelopes', formatted.envelopes.text, formatted.envelopes.kind)
      if (formatted.steward) writeLine('steward', formatted.steward.text, formatted.steward.kind)
    })
  }

  const runCommand = (raw) => {
    const cmd = String(raw || '').trim()
    if (!cmd) return

    writeLine('cli', `${promptEl?.textContent || 'hddl>'} ${cmd}`, 'cmd')

    if (cmd === 'help') {
      writeLine('cli', 'Commands: help, clear, time, route, active', 'info')
      writeLine('cli', 'Note: this is a simulated CLI (not your OS shell).', 'muted')
      return
    }
    if (cmd === 'clear') {
      const cliOut = getOutputEl('cli')
      if (cliOut) cliOut.innerHTML = ''
      return
    }
    if (cmd === 'time') {
      writeLine('cli', formatSimTime(getTimeHour()), 'info')
      return
    }
    if (cmd === 'route') {
      writeLine('cli', window.location.pathname || '/', 'info')
      return
    }
    if (cmd === 'active') {
      const scenario = getScenario()
      const envelopes = scenario?.envelopes ?? []
      const timeHour = getTimeHour()
      const active = envelopes
        .filter(e => getEnvelopeStatus(e, timeHour) === 'active')
        .map(e => e.envelopeId)
        .filter(Boolean)
      writeLine('cli', active.length ? active.join(', ') : 'No active envelopes.', 'info')
      return
    }

    writeLine('cli', `Unknown command: ${cmd}. Type 'help'.`, 'warning')
  }

  setPrompt()
  // Default visibility state
  setActiveTab('cli')

  writeLine('cli', 'HDDL CLI - type "help" to see commands.', 'muted')
  writeLine('envelopes', 'Envelope console - tracks envelope activations and revisions.', 'muted')
  writeLine('steward', 'Steward activity - escalations, DSG reviews, and steward actions.', 'muted')

  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return
      const value = inputEl.value
      inputEl.value = ''
      runCommand(value)
    })
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const out = getOutputEl(activeTab)
      if (out) out.innerHTML = ''
    })
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      setBottomCollapsed(true)
    })
  }

  // Tab switching
  panel.querySelectorAll('.panel-tab[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab
      if (!tabId) return
      setActiveTab(tabId)
    })
  })

  // Keep prompt time in sync
  onTimeChange(() => {
    if (!panel.isConnected) return
    setPrompt()

    const next = getTimeHour()
    const prev = lastObservedTime
    lastObservedTime = next

    // If time moves backwards (scrub/rewind), reset emission window.
    if (next < prev) {
      lastEmittedTime = next
      const marker = `[${formatSimTime(next)}] timeline rewound`
      writeLine('envelopes', marker, 'muted')
      writeLine('steward', marker, 'muted')
      writeLine('cli', marker, 'muted')
      return
    }

    // Only emit deltas we haven't logged yet.
    if (next > lastEmittedTime) {
      emitTimelineEvents(lastEmittedTime, next)
      lastEmittedTime = next
    }
  })
  onScenarioChange(() => {
    if (!panel.isConnected) return
    setPrompt()

    const scenario = getScenario()
    const scenarioId = scenario?.id || 'unknown'
    const now = getTimeHour()
    lastObservedTime = now
    lastEmittedTime = now

    if (scenarioId !== lastScenarioId) {
      lastScenarioId = scenarioId
      const msg = `Scenario loaded: ${scenario?.title || scenarioId}`
      writeLine('envelopes', msg, 'muted')
      writeLine('steward', msg, 'muted')
      writeLine('cli', msg, 'muted')
    }
  })

  return panel
}

// Note: updateTelemetry and related helper functions remain in workspace.js
// They are called by createBottomPanel via initializeEvidenceBounded
// This keeps the telemetry rendering logic separate from panel creation

// Export main APIs
export { createActivityBar, createAuxiliaryBar, createBottomPanel, setAuxCollapsed, setBottomCollapsed }
