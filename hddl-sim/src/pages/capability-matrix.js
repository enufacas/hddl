import {
  formatSimTime,
  getEnvelopeAtTime,
  getEnvelopeStatus,
  getScenario,
  getTimeHour,
  onScenarioChange,
  onTimeChange,
  getStewardFilter,
  setStewardFilter,
} from '../sim/sim-state'

// NOTE: kept export name for routing compatibility.
export function renderCapabilityMatrix(container) {
  container.innerHTML = `
    <div class="page-container" data-testid="fleets-page">
      <div class="fleet-page__top">
        <div class="fleet-page__top-left">
          <h1>Steward Agent Fleets</h1>
          <p class="subtitle">Capability is subordinate to authority: fleets operate only under envelopes (never as authority).</p>
        </div>

        <div class="fleet-page__top-right">
          <div style="min-width: 200px; margin-bottom: 12px;">
            <div style="font-size: 9px; color: var(--vscode-statusBar-foreground); margin-bottom: 4px; letter-spacing: 0.5px; text-transform: uppercase;">View As</div>
            <select id="steward-filter" style="width: 100%; padding: 6px 10px; background: var(--vscode-input-background); color: var(--vscode-editor-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; font-size: 12px; cursor: pointer;">
              <option value="all">All Envelopes</option>
            </select>
          </div>
          <div class="fleet-page__summary">
            <div class="fleet-page__summary-item">
              <div class="fleet-page__k">Selected time</div>
              <div class="fleet-page__v" id="fleets-time"></div>
            </div>
            <div class="fleet-page__summary-item">
              <div class="fleet-page__k">Active envelopes</div>
              <div class="fleet-page__v" id="fleets-active-count" data-testid="fleets-active-count"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="fleet-page__active" id="fleets-active-envelopes" data-testid="fleets-active-envelopes"></div>

      <div class="fleet-page__grid" id="fleet-grid"></div>
    </div>
  `

  const stewardFilter = container.querySelector('#steward-filter')
  let currentFilter = getStewardFilter()
  
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
    populateStewardFilter()
    stewardFilter.value = currentFilter
    stewardFilter.addEventListener('change', (e) => {
      currentFilter = e.target.value
      setStewardFilter(currentFilter)
      draw()
    })
  }

  const draw = () => {
    const scenario = getScenario()
    const timeHour = getTimeHour()
    renderFleets(container, scenario, timeHour, currentFilter)
  }

  draw()
  onTimeChange(() => {
    if (!container.isConnected) return
    draw()
  })
  onScenarioChange(() => {
    if (!container.isConnected) return
    populateStewardFilter()
    draw()
  })
}

function getProhibitedConstraints(constraints) {
  const items = Array.isArray(constraints) ? constraints : []
  return items.filter(c => {
    const s = String(c || '')
    return s.startsWith('No ') || s.includes('Not permitted') || s.startsWith('Human-only') || s.includes('Human-only')
  })
}

function getAllowedConstraints(constraints) {
  const items = Array.isArray(constraints) ? constraints : []
  const prohibited = new Set(getProhibitedConstraints(items))
  return items.filter(x => !prohibited.has(x))
}

function renderFleets(container, scenario, timeHour, stewardFilter = 'all') {
  const timeEl = container.querySelector('#fleets-time')
  const countEl = container.querySelector('#fleets-active-count')
  const activeEl = container.querySelector('#fleets-active-envelopes')
  const gridEl = container.querySelector('#fleet-grid')
  if (!gridEl) return

  if (timeEl) timeEl.textContent = formatSimTime(timeHour)

  const envelopes = scenario?.envelopes ?? []
  const fleets = Array.isArray(scenario?.fleets) ? scenario.fleets : []

  const filteredEnvelopes = stewardFilter === 'all'
    ? envelopes
    : envelopes.filter(e => e.ownerRole === stewardFilter)

  const activeEnvelopes = filteredEnvelopes
    .filter(e => getEnvelopeStatus(e, timeHour) === 'active')
    .map(e => getEnvelopeAtTime(scenario, e.envelopeId, timeHour) || e)

  const activeEnvelopeIds = new Set(activeEnvelopes.map(e => e.envelopeId).filter(Boolean))
  if (countEl) countEl.textContent = String(activeEnvelopeIds.size)

  if (activeEl) {
    if (!activeEnvelopes.length) {
      activeEl.innerHTML = `<div class="fleet-page__empty">No active envelopes at the selected time.</div>`
    } else {
      activeEl.innerHTML = activeEnvelopes
        .map(env => {
          const version = env?.envelope_version ?? 1
          const rev = env?.revision_id || '-'
          const prohibited = getProhibitedConstraints(env?.constraints).slice(0, 2)
          const allowed = getAllowedConstraints(env?.constraints).slice(0, 2)
          return `
            <div class="fleet-env" data-envelope-id="${escapeAttr(env.envelopeId)}" style="--env-accent: ${escapeAttr(env.accent || 'var(--status-muted)')};">
              <div class="fleet-env__id">${escapeHtml(env.envelopeId)}</div>
              <div class="fleet-env__name">${escapeHtml(env.name)}</div>
              <div class="fleet-env__meta">${escapeHtml(env.domain || '-')} - ${escapeHtml(env.ownerRole || '-')}</div>
              <div class="fleet-env__meta" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">v${escapeHtml(version)} • rev: ${escapeHtml(rev)}</div>
              <div style="display:flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
                ${allowed.map(a => `<span style="border: 1px solid var(--vscode-sideBar-border); background: var(--vscode-editor-background); border-radius: 999px; padding: 2px 8px; font-size: 11px; color: var(--vscode-statusBar-foreground);" title="${escapeAttr(a)}">Allowed</span>`).join('')}
                ${prohibited.map(p => `<span style="border: 1px solid var(--vscode-sideBar-border); background: var(--vscode-editor-background); border-radius: 999px; padding: 2px 8px; font-size: 11px; color: var(--vscode-statusBar-foreground);" title="${escapeAttr(p)}">Prohibited</span>`).join('')}
              </div>
            </div>
          `
        })
        .join('')
    }
  }

  if (!fleets.length) {
    gridEl.innerHTML = `<div class="fleet-page__empty">No fleet data in this scenario.</div>`
    return
  }

  const ranked = fleets
    .map((fleet) => {
      const agents = Array.isArray(fleet?.agents) ? fleet.agents : []
      const activeAgents = agents.filter(a => (a?.envelopeIds ?? []).some(id => activeEnvelopeIds.has(id))).length
      const stewardRole = fleet?.stewardRole || 'Steward'
      return {
        fleet,
        stewardRole,
        activeAgents,
        totalAgents: agents.length,
        isActive: activeAgents > 0,
      }
    })
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      if (a.activeAgents !== b.activeAgents) return b.activeAgents - a.activeAgents
      return String(a.stewardRole).localeCompare(String(b.stewardRole))
    })

  gridEl.innerHTML = ranked
    .map(({ fleet, activeAgents, totalAgents, isActive }) => renderFleetCard(fleet, { envelopes, activeEnvelopeIds, activeAgents, totalAgents, isActive }))
    .join('')
}

function renderFleetCard(fleet, { envelopes, activeEnvelopeIds, activeAgents, totalAgents, isActive }) {
  const stewardRole = fleet?.stewardRole || 'Steward'
  const agents = Array.isArray(fleet?.agents) ? fleet.agents : []

  const computedActive = agents.filter(a => (a?.envelopeIds ?? []).some(id => activeEnvelopeIds.has(id))).length
  const activeCount = typeof activeAgents === 'number' ? activeAgents : computedActive
  const totalCount = typeof totalAgents === 'number' ? totalAgents : agents.length
  const fleetIsActive = typeof isActive === 'boolean' ? isActive : activeCount > 0

  const agentIcons = agents
    .map(agent => {
      const agentId = agent?.agentId || agent?.name || 'AGENT'
      const name = agent?.name || agentId
      const role = agent?.role || ''
      const envIds = Array.isArray(agent?.envelopeIds) ? agent.envelopeIds : []
      const isActive = envIds.some(id => activeEnvelopeIds.has(id))

      const envList = envIds.length ? `envelopes: ${envIds.join(', ')}` : 'envelopes: -'
      const tooltip = `${name}${role ? ` - ${role}` : ''} - ${envList}`
      const initials = getAgentInitials(name)

      return `
        <div
          class="fleet-agent-icon ${isActive ? 'active' : ''}"
          data-testid="fleet-agent-icon"
          data-agent-id="${escapeAttr(agentId)}"
          title="${escapeAttr(tooltip)}"
          aria-label="${escapeAttr(tooltip)}"
        >
          <div class="fleet-agent-icon__glyph">${escapeHtml(initials)}</div>
          <div class="fleet-agent-icon__label">${escapeHtml(name)}</div>
        </div>
      `
    })
    .join('')

  return `
    <section class="fleet-card ${fleetIsActive ? 'is-active' : 'is-inactive'}" data-testid="fleet-card" data-steward-role="${escapeAttr(stewardRole)}">
      <header class="fleet-card__hdr">
        <div class="fleet-card__title">${escapeHtml(stewardRole)}</div>
        <div class="fleet-card__meta" data-testid="fleet-active-agents">${activeCount}/${totalCount} active</div>
      </header>
      <div class="fleet-card__body">
        ${agentIcons ? `<div class="fleet-agent-icons">${agentIcons}</div>` : '<div class="fleet-page__empty">No agents defined.</div>'}
      </div>
    </section>
  `
}

function getAgentInitials(name) {
  const clean = String(name || '').trim()
  if (!clean) return 'A'

  // Prefer CamelCase initials (ReplyAssist -> RA)
  const capitals = clean.replace(/[^A-Z]/g, '')
  if (capitals.length >= 2) return capitals.slice(0, 2)
  if (capitals.length === 1) return (capitals + clean[1] || capitals).slice(0, 2).toUpperCase()

  // Fallback: first 2 letters
  return clean.slice(0, 2).toUpperCase()
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#96;')
}

