import { formatSimTime, getScenario, getTimeHour, onScenarioChange, onTimeChange } from '../sim/sim-state'
import { initGlossaryInline } from '../components/glossary'
import { navigateTo } from '../router'
import { getStewardColor } from '../sim/steward-colors'

export function renderDecisionTelemetry(container) {
  let disposeGlossary = () => {}
  let currentQuery = ''
  let currentEvents = []
  let timelineSync = false // default to showing all events; enable to sync with timeline

  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <span class="codicon codicon-database" style="font-size: 28px;"></span>
        <div>
          <h1 style="margin: 0;">Decision Telemetry Stream</h1>
          <p style="margin: 0; color: var(--vscode-statusBar-foreground);">Query-first DTS event log</p>
        </div>
      </div>

      <div style="margin: 10px 0 12px; font-size: 12px; color: var(--vscode-statusBar-foreground);">
        Terms:
        <a class="glossary-term" href="#" data-glossary-term="DTS (Decision Telemetry Specification)">DTS</a>,
        <a class="glossary-term" href="#" data-glossary-term="Decision Envelope">Decision Envelope</a>,
        <a class="glossary-term" href="#" data-glossary-term="Boundary Interaction">Boundary Interaction</a>
      </div>

      <div id="glossary-inline" style="display:none; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 12px; border-radius: 6px; margin-bottom: 12px;"></div>

      <!-- Query Interface -->
      <div style="margin-bottom: 20px;">
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <input 
            type="text" 
            id="query-input" 
            placeholder="Query: type:boundary_interaction | envelope:ENV-003 | actor:Sales Steward | severity:warning"
            style="flex: 1; padding: 8px 12px; background: var(--vscode-input-background); color: var(--vscode-editor-foreground); border: 1px solid var(--vscode-input-border); border-radius: 3px; font-family: ui-monospace, monospace; font-size: 13px;"
          />
          <button id="query-btn" style="padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-weight: 600;">
            Query
          </button>
          <button id="clear-btn" style="padding: 8px 16px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 3px; cursor: pointer;">
            Clear
          </button>
        </div>
        
        <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
          <button class="query-chip" data-query="type:boundary_interaction">Boundary Interactions</button>
          <button class="query-chip" data-query="type:decision">Decisions</button>
          <button class="query-chip" data-query="type:dsg_session">DSG Sessions</button>
          <button class="query-chip" data-query="type:signal">Signals</button>
          <button class="query-chip" data-query="severity:warning">Warnings</button>
          <button class="query-chip" data-query="status:blocked">Blocked</button>
          <button class="query-chip" data-query="envelope:ENV-003">Pricing Envelope</button>
          <span style="margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--vscode-statusBar-foreground);">
            <input type="checkbox" id="timeline-sync" style="accent-color: var(--status-info);" />
            <label for="timeline-sync">Sync with timeline</label>
            <span id="timeline-indicator" style="padding: 2px 8px; background: var(--status-info); color: var(--vscode-button-foreground); border-radius: 3px; font-weight: 600;"></span>
          </span>
        </div>
      </div>

      <!-- Stats Bar -->
      <div id="stats-bar" style="display: flex; gap: 16px; padding: 12px; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-sideBar-border); border-radius: 4px; margin-bottom: 16px; font-size: 13px;"></div>

      <!-- Event Stream -->
      <div id="event-stream" style="display: flex; flex-direction: column; gap: 12px;"></div>
    </div>

    <style>
      .query-chip {
        padding: 4px 10px;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: 1px solid var(--vscode-sideBar-border);
        border-radius: 12px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .query-chip:hover {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }
      
      .event-card {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-sideBar-border);
        border-left: 3px solid;
        border-radius: 4px;
        padding: 12px;
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 12px;
      }
      
      .event-card.type-decision { border-left-color: var(--status-info); }
      .event-card.type-boundary_interaction { border-left-color: var(--status-warning); }
      .event-card.type-dsg_session { border-left-color: var(--status-error); }
      .event-card.type-signal { border-left-color: var(--vscode-charts-blue); }
      .event-card.type-revision { border-left-color: var(--vscode-charts-purple); }
      .event-card.type-envelope_promoted { border-left-color: var(--status-success); }
      
      .event-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 8px;
      }
      
      .event-field {
        margin: 4px 0;
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 8px;
      }
      
      .event-field-label {
        color: var(--vscode-statusBar-foreground);
        font-weight: 600;
      }
      
      .event-field-value {
        color: var(--vscode-editor-foreground);
      }
      
      .badge {
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .badge-info { background: var(--status-info); opacity: 0.2; }
      .badge-warning { background: var(--status-warning); opacity: 0.2; }
      .badge-error { background: var(--status-error); opacity: 0.2; }
      .badge-success { background: var(--status-success); opacity: 0.2; }
    </style>
  `

  const queryInput = container.querySelector('#query-input')
  const queryBtn = container.querySelector('#query-btn')
  const clearBtn = container.querySelector('#clear-btn')
  const eventStream = container.querySelector('#event-stream')
  const statsBar = container.querySelector('#stats-bar')

  const bindGlossary = () => {
    disposeGlossary()
    initGlossaryInline(container, {
      panelSelector: '#glossary-inline',
      openDocs: () => navigateTo('/docs'),
    }).then((dispose) => {
      disposeGlossary = typeof dispose === 'function' ? dispose : (() => {})
    })
  }

  bindGlossary()

  // Query parser
  function parseQuery(queryString) {
    if (!queryString.trim()) return {}
    
    const filters = {}
    const parts = queryString.split('|').map(p => p.trim())
    
    parts.forEach(part => {
      const [key, value] = part.split(':').map(s => s.trim())
      if (key && value) {
        filters[key] = value
      }
    })
    
    return filters
  }

  // Apply filters to events
  function filterEvents(events, filters) {
    if (!Object.keys(filters).length) return events
    
    return events.filter(event => {
      return Object.entries(filters).every(([key, value]) => {
        const eventValue = event[key]
        if (!eventValue) return false
        return String(eventValue).toLowerCase().includes(value.toLowerCase())
      })
    })
  }

  // Render stats bar
  function renderStats(events) {
    const stats = {
      total: events.length,
      decisions: events.filter(e => e.type === 'decision').length,
      boundaries: events.filter(e => e.type === 'boundary_interaction').length,
      signals: events.filter(e => e.type === 'signal').length,
      dsg: events.filter(e => e.type === 'dsg_session').length,
    }

    statsBar.innerHTML = `
      <div><span style="color: var(--vscode-statusBar-foreground);">Total:</span> <strong>${stats.total}</strong></div>
      <div><span style="color: var(--vscode-statusBar-foreground);">Decisions:</span> <strong>${stats.decisions}</strong></div>
      <div><span style="color: var(--vscode-statusBar-foreground);">Boundaries:</span> <strong>${stats.boundaries}</strong></div>
      <div><span style="color: var(--vscode-statusBar-foreground);">Signals:</span> <strong>${stats.signals}</strong></div>
      <div><span style="color: var(--vscode-statusBar-foreground);">DSG Sessions:</span> <strong>${stats.dsg}</strong></div>
    `
  }

  // Pretty print event field
  function prettyPrintValue(key, value) {
    if (!value) return '<span style="color: var(--vscode-statusBar-foreground);">—</span>'
    
    if (key === 'timestamp') {
      return `<strong>${formatSimTime(value)}</strong>`
    }
    
    if (key === 'envelope_id' || key === 'decision_id' || key === 'session_id' || key === 'agent_id') {
      return `<code style="background: var(--vscode-input-background); padding: 2px 6px; border-radius: 3px;">${value}</code>`
    }
    
    if (Array.isArray(value)) {
      return value.map(v => `<div style="margin: 2px 0; padding-left: 8px; border-left: 2px solid var(--vscode-focusBorder);">${v}</div>`).join('')
    }
    
    if (typeof value === 'object') {
      return `<pre style="margin: 4px 0; padding: 8px; background: var(--vscode-input-background); border-radius: 3px; font-size: 11px; overflow-x: auto;">${JSON.stringify(value, null, 2)}</pre>`
    }
    
    return String(value)
  }

  // Render event card
  function renderEventCard(event, currentHour) {
    const card = document.createElement('div')
    card.className = `event-card type-${event.type || 'unknown'}`
    
    // Check if this event is at or near the current timeline position
    const isCurrentEvent = event.hour !== undefined && 
      Math.abs(event.hour - currentHour) < 0.5
    
    if (isCurrentEvent) {
      card.style.boxShadow = '0 0 8px var(--status-info)'
      card.style.borderWidth = '2px'
    }
    
    const severityBadge = event.severity 
      ? `<span class="badge badge-${event.severity}">${event.severity}</span>` 
      : ''
    
    const statusBadge = event.status 
      ? `<span class="badge badge-${event.status === 'allowed' ? 'success' : event.status === 'blocked' ? 'error' : 'info'}">${event.status}</span>` 
      : ''

    const kindBadge = event.boundary_kind
      ? `<span class="badge badge-warning">${event.boundary_kind}</span>`
      : ''
    
    // Actor color badge - use steward color if actor is a steward
    const actorColor = event.actorRole ? getStewardColor(event.actorRole) : null
    const actorBadge = actorColor 
      ? `<span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: ${actorColor}; display: inline-block;"></span></span>`
      : ''

    // Build field list based on DTS spec
    const fields = []
    
    if (event.hour !== undefined) fields.push({ label: 'timestamp', value: event.hour })
    if (event.id) fields.push({ label: 'decision_id', value: event.id })
    if (event.sessionId) fields.push({ label: 'session_id', value: event.sessionId })
    if (event.envelopeId) fields.push({ label: 'envelope_id', value: event.envelopeId })
    if (event.type) fields.push({ label: 'event_type', value: event.type })
    if (event.agentId) fields.push({ label: 'agent_id', value: event.agentId })
    if (event.actorRole) fields.push({ label: 'actor_role', value: event.actorRole, actorColor: actorColor })
    if (event.boundary_kind) fields.push({ label: 'boundary_interaction', value: event.boundary_kind })
    if (event.status) fields.push({ label: 'outcome', value: event.status })
    if (event.reason) fields.push({ label: 'reason', value: event.reason })
    if (event.signalKey) fields.push({ label: 'signal_key', value: event.signalKey })
    if (event.value !== undefined) fields.push({ label: 'value', value: event.value })
    if (event.assumptionRefs) fields.push({ label: 'assumption_refs', value: event.assumptionRefs })
    if (event.label) fields.push({ label: 'label', value: event.label })
    if (event.detail) fields.push({ label: 'detail', value: event.detail })

    card.innerHTML = `
      <div class="event-header">
        <div>
          <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            ${actorBadge}
            ${event.label || event.type || 'Event'}
          </div>
          <div style="display: flex; gap: 6px;">
            ${severityBadge}
            ${statusBadge}
            ${kindBadge}
          </div>
        </div>
        <div style="text-align: right; color: var(--vscode-statusBar-foreground); font-size: 11px;">
          ${event.hour !== undefined ? formatSimTime(event.hour) : ''}
          ${isCurrentEvent ? '<span style="display: block; font-size: 10px; color: var(--status-info);">▶ Current</span>' : ''}
        </div>
      </div>
      
      <div style="margin-top: 12px; border-top: 1px solid var(--vscode-sideBar-border); padding-top: 8px;">
        ${fields.map(f => `
          <div class="event-field">
            <div class="event-field-label">${f.label}</div>
            <div class="event-field-value">${f.actorColor 
              ? `<span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: ${f.actorColor};"></span>${prettyPrintValue(f.label, f.value)}</span>` 
              : prettyPrintValue(f.label, f.value)}</div>
          </div>
        `).join('')}
      </div>
    `
    
    return card
  }

  // Render events
  function renderEvents() {
    const scenario = getScenario()
    const currentHour = getTimeHour()
    const allEvents = scenario?.events || []
    
    // Update timeline indicator
    const indicator = container.querySelector('#timeline-indicator')
    if (indicator) {
      indicator.textContent = timelineSync 
        ? `≤ ${formatSimTime(currentHour)}` 
        : 'All'
      indicator.style.background = timelineSync 
        ? 'var(--status-info)' 
        : 'var(--vscode-button-secondaryBackground)'
    }
    
    const filters = parseQuery(currentQuery)
    let filtered = filterEvents(allEvents, filters)
    
    // Apply timeline filter if sync is enabled
    if (timelineSync) {
      filtered = filtered.filter(event => 
        event.hour === undefined || event.hour <= currentHour
      )
    }
    
    currentEvents = filtered

    renderStats(filtered)
    
    eventStream.innerHTML = ''
    
    if (filtered.length === 0) {
      eventStream.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--vscode-statusBar-foreground); border: 1px solid var(--vscode-sideBar-border); border-radius: 4px;">
          <span class="codicon codicon-search" style="font-size: 32px; opacity: 0.3; display: block; margin-bottom: 12px;"></span>
          No events match your query
        </div>
      `
      return
    }
    
    // Sort by hour descending (most recent first)
    filtered
      .sort((a, b) => (b.hour || 0) - (a.hour || 0))
      .forEach(event => {
        eventStream.appendChild(renderEventCard(event, currentHour))
      })
  }

  // Event handlers
  queryBtn.addEventListener('click', () => {
    currentQuery = queryInput.value
    renderEvents()
  })

  clearBtn.addEventListener('click', () => {
    currentQuery = ''
    queryInput.value = ''
    renderEvents()
  })

  queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      currentQuery = queryInput.value
      renderEvents()
    }
  })

  // Query chip handlers
  container.querySelectorAll('.query-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query
      queryInput.value = query
      currentQuery = query
      renderEvents()
    })
  })

  // Timeline sync toggle
  const timelineSyncCheckbox = container.querySelector('#timeline-sync')
  if (timelineSyncCheckbox) {
    timelineSyncCheckbox.addEventListener('change', (e) => {
      timelineSync = e.target.checked
      renderEvents()
    })
  }

  // Initial render
  renderEvents()

  // Update on scenario/time change
  const unsubTime = onTimeChange(renderEvents)
  const unsubScenario = onScenarioChange(renderEvents)

  // Cleanup
  return () => {
    disposeGlossary()
    unsubTime()
    unsubScenario()
  }
}
