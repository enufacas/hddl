import { formatSimTime, getScenario, getTimeHour, onScenarioChange, onTimeChange, getStewardFilter, setStewardFilter, onFilterChange } from '../sim/sim-state'
import { initGlossaryInline } from '../components/glossary'
import { navigateTo } from '../router'
import { getStewardColor } from '../sim/steward-colors'

export function renderDecisionTelemetry(container) {
  let disposeGlossary = () => {}
  let currentQuery = ''
  let currentEvents = []
  let timelineSync = true // default to sync with timeline

  container.innerHTML = `
    <div class="page-container" style="max-width: 100%; padding: 16px 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="codicon codicon-database" style="font-size: 28px;"></span>
          <div>
            <h1 style="margin: 0;">Decision Telemetry Stream</h1>
            <p style="margin: 0; color: var(--vscode-statusBar-foreground);">Query-first DTS event log</p>
          </div>
        </div>
        <div style="min-width: 180px;">
          <div style="font-size: 9px; color: var(--vscode-statusBar-foreground); margin-bottom: 4px; letter-spacing: 0.5px; text-transform: uppercase;">Filter By Steward</div>
          <select id="steward-filter" style="width: 100%; padding: 6px 10px; background: var(--vscode-input-background); color: var(--vscode-editor-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; font-size: 12px; cursor: pointer;">
            <option value="all">All Envelopes</option>
            <option value="Customer Steward">Customer Steward</option>
            <option value="HR Steward">HR Steward</option>
            <option value="Sales Steward">Sales Steward</option>
            <option value="Data Steward">Data Steward</option>
            <option value="Domain Engineer">Domain Engineer</option>
          </select>
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
            <input type="checkbox" id="timeline-sync" checked style="accent-color: var(--status-info);" />
            <label for="timeline-sync">Sync with timeline</label>
            <span id="timeline-indicator" style="padding: 2px 8px; background: var(--status-info); color: var(--vscode-button-foreground); border-radius: 3px; font-weight: 600;"></span>
          </span>
        </div>
      </div>

      <!-- Stats Bar -->
      <div id="stats-bar" style="display: flex; gap: 16px; padding: 12px; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-sideBar-border); border-radius: 4px; margin-bottom: 16px; font-size: 13px;"></div>

      <!-- Event Stream -->
      <div id="event-stream" style="display: flex; flex-direction: column; gap: 2px;"></div>
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
      
      .log-line {
        display: grid;
        grid-template-columns: 130px 160px 110px 180px 1fr auto;
        gap: 16px;
        align-items: start;
        padding: 10px 16px;
        font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        font-size: 12px;
        border-bottom: 1px solid var(--vscode-sideBar-border);
        background: var(--vscode-editor-background);
        transition: background 0.15s;
        line-height: 1.5;
      }
      
      .log-line:hover {
        background: color-mix(in srgb, var(--vscode-list-hoverBackground) 50%, transparent);
      }
      
      .log-line.current {
        background: color-mix(in srgb, var(--status-info) 8%, var(--vscode-editor-background));
        border-left: 3px solid var(--status-info);
        padding-left: 9px;
      }
      
      .log-timestamp {
        color: var(--vscode-statusBar-foreground);
        font-weight: 600;
        flex-shrink: 0;
        white-space: nowrap;
        padding-top: 2px;
      }
      
      .type-pill {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        white-space: nowrap;
        text-align: center;
        align-self: start;
      }
      
      .type-pill.decision {
        background: color-mix(in srgb, var(--status-info) 25%, transparent);
        color: var(--status-info);
        border: 1px solid var(--status-info);
      }
      
      .type-pill.boundary_interaction {
        background: color-mix(in srgb, var(--status-warning) 25%, transparent);
        color: var(--status-warning);
        border: 1px solid var(--status-warning);
      }
      
      .type-pill.dsg_session {
        background: color-mix(in srgb, var(--status-error) 25%, transparent);
        color: var(--status-error);
        border: 1px solid var(--status-error);
      }
      
      .type-pill.signal {
        background: color-mix(in srgb, var(--vscode-charts-blue) 25%, transparent);
        color: var(--vscode-charts-blue);
        border: 1px solid var(--vscode-charts-blue);
      }
      
      .type-pill.revision {
        background: color-mix(in srgb, var(--vscode-charts-purple) 25%, transparent);
        color: var(--vscode-charts-purple);
        border: 1px solid var(--vscode-charts-purple);
      }
      
      .type-pill.envelope_promoted {
        background: color-mix(in srgb, var(--status-success) 25%, transparent);
        color: var(--status-success);
        border: 1px solid var(--status-success);
      }
      
      .log-envelope {
        color: var(--vscode-charts-purple);
        font-weight: 600;
        flex-shrink: 0;
        white-space: nowrap;
        padding-top: 2px;
      }
      
      .log-actor {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        padding-top: 2px;
      }
      
      .actor-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      
      .log-message {
        color: var(--vscode-editor-foreground);
        word-wrap: break-word;
        overflow-wrap: break-word;
        padding-top: 2px;
      }
      
      .log-meta {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        padding-top: 2px;
      }
      
      .meta-badge {
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .meta-badge.warning {
        background: color-mix(in srgb, var(--status-warning) 20%, transparent);
        color: var(--status-warning);
      }
      
      .meta-badge.error {
        background: color-mix(in srgb, var(--status-error) 20%, transparent);
        color: var(--status-error);
      }
      
      .meta-badge.success {
        background: color-mix(in srgb, var(--status-success) 20%, transparent);
        color: var(--status-success);
      }
      
      .meta-badge.blocked {
        background: color-mix(in srgb, var(--status-error) 20%, transparent);
        color: var(--status-error);
      }
      
      .meta-badge.allowed {
        background: color-mix(in srgb, var(--status-success) 20%, transparent);
        color: var(--status-success);
      }
      
      .meta-badge.info {
        background: color-mix(in srgb, var(--status-info) 20%, transparent);
        color: var(--status-info);
      }
      
      .log-id {
        color: var(--vscode-statusBar-foreground);
        font-size: 11px;
        opacity: 0.7;
      }
    </style>
  `

  const queryInput = container.querySelector('#query-input')
  const queryBtn = container.querySelector('#query-btn')
  const clearBtn = container.querySelector('#clear-btn')
  const eventStream = container.querySelector('#event-stream')
  const statsBar = container.querySelector('#stats-bar')
  const stewardFilter = container.querySelector('#steward-filter')
  
  // Initialize steward filter
  let currentFilter = getStewardFilter()
  if (stewardFilter) {
    stewardFilter.value = currentFilter
    stewardFilter.addEventListener('change', (e) => {
      currentFilter = e.target.value
      setStewardFilter(currentFilter)
      renderEvents()
    })
  }
  
  // Listen for filter changes from other pages
  const unsubFilter = onFilterChange((newFilter) => {
    currentFilter = newFilter
    if (stewardFilter) stewardFilter.value = newFilter
    renderEvents()
  })

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

  // Render event as log line
  function renderLogLine(event, currentHour) {
    const line = document.createElement('div')
    
    // Check if this event is at or near the current timeline position
    const isCurrentEvent = event.hour !== undefined && 
      Math.abs(event.hour - currentHour) < 0.5
    
    line.className = 'log-line' + (isCurrentEvent ? ' current' : '')
    
    // Timestamp
    const timestamp = event.hour !== undefined 
      ? formatSimTime(event.hour) 
      : '—'
    
    // Type pill
    const eventType = event.type || 'unknown'
    
    // Actor with color
    const actorColor = event.actorRole ? getStewardColor(event.actorRole) : null
    const actorDisplay = event.actorRole 
      ? `<span class="actor-dot" style="background: ${actorColor};"></span><span>${event.actorRole}</span>`
      : '<span style="opacity: 0.5;">—</span>'
    
    // Envelope
    const envelope = event.envelopeId || ''
    
    // Build message
    let message = event.label || event.detail || ''
    if (!message) {
      // Construct default message based on type
      if (eventType === 'decision') {
        message = `Decision ${event.status || ''} ${event.id || ''}`
      } else if (eventType === 'boundary_interaction') {
        message = `Boundary ${event.boundary_kind || 'interaction'}: ${event.reason || ''}`
      } else if (eventType === 'signal') {
        message = `Signal ${event.signalKey || ''} = ${event.value !== undefined ? event.value : ''}`
      } else if (eventType === 'dsg_session') {
        message = `DSG session ${event.sessionId || ''}`
      } else if (eventType === 'revision') {
        message = `Revision v${event.envelope_version || ''}`
      } else {
        message = eventType
      }
    }
    
    // Meta badges
    const metaBadges = []
    if (event.severity && event.severity !== 'info') {
      metaBadges.push(`<span class="meta-badge ${event.severity}">${event.severity}</span>`)
    }
    if (event.status === 'blocked') {
      metaBadges.push(`<span class="meta-badge blocked">blocked</span>`)
    } else if (event.status === 'allowed') {
      metaBadges.push(`<span class="meta-badge allowed">allowed</span>`)
    }
    if (event.boundary_kind) {
      metaBadges.push(`<span class="meta-badge info">${event.boundary_kind}</span>`)
    }
    
    // ID (if present)
    const idDisplay = event.id ? `<span class="log-id">${event.id}</span>` : ''
    
    line.innerHTML = `
      <span class="log-timestamp">${timestamp}</span>
      <span class="type-pill ${eventType}">${eventType.replace('_', ' ')}</span>
      <span class="log-envelope">${envelope || '—'}</span>
      <span class="log-actor">${actorDisplay}</span>
      <span class="log-message" title="${message}">${message}</span>
      <span class="log-meta">${metaBadges.join('')}${idDisplay}</span>
    `
    
    return line
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
    
    // Apply steward filter
    if (currentFilter !== 'all') {
      const envelopes = scenario?.envelopes || []
      const filteredEnvelopeIds = envelopes
        .filter(env => env.ownerRole === currentFilter)
        .map(env => env.envelopeId)
      
      filtered = filtered.filter(event => 
        !event.envelopeId || filteredEnvelopeIds.includes(event.envelopeId)
      )
    }
    
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
        eventStream.appendChild(renderLogLine(event, currentHour))
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
    unsubFilter()
  }
}
