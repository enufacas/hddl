import { createEnvelopeDetailModal } from '../components/envelope-detail';
import { initGlossaryInline } from '../components/glossary'
import { formatSimTime, getBoundaryInteractionCounts, getEnvelopeAtTime, getEnvelopeStatus, getScenario, getTimeHour, onScenarioChange, onTimeChange, getStewardFilter, setStewardFilter, onFilterChange } from '../sim/sim-state';
import { navigateTo } from '../router'
import { createHDDLMap } from '../components/hddl-map'
import { getStewardColor, toSemver } from '../sim/steward-colors'
import { createTourButton } from '../components/tour'
import { createStaticTimelineButton } from '../components/static-timeline-view'

// Track active map cleanup to prevent leaks
let activeMapCleanup = null
let activeMapInstance = null
let activeMapResizeObserver = null
let activeMapMountRaf = null

export function renderHome(container) {
  // Cleanup previous map if it exists
  if (activeMapCleanup) {
    activeMapCleanup()
    activeMapCleanup = null
    activeMapInstance = null
  }

  if (activeMapResizeObserver) {
    activeMapResizeObserver.disconnect()
    activeMapResizeObserver = null
  }

  if (activeMapMountRaf != null) {
    cancelAnimationFrame(activeMapMountRaf)
    activeMapMountRaf = null
  }

  let disposeGlossary = () => {}
  let currentFilter = getStewardFilter()
  let mountMap = null // Will be initialized if mapContainer exists

  container.innerHTML = `
    <div class="page-container" data-testid="home-page">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; position: relative; z-index: 10;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="codicon codicon-shield" style="font-size: 20px;"></span>
          <div>
            <h1 style="margin: 0; font-size: 16px;">Decision Envelopes</h1>
          </div>
          <div id="tour-button-container" style="display: flex; align-items: center; gap: 8px;"></div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 8px;">
          <div id="timeline-button-container" style="display: flex; align-items: center;"></div>
          <select id="steward-filter" style="padding: 6px 10px; background: var(--vscode-input-background); color: var(--vscode-editor-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; font-size: 12px; cursor: pointer; min-width: 200px;">
            <option value="all">All Envelopes</option>
            <option value="Customer Steward">Customer Steward</option>
            <option value="HR Steward">HR Steward</option>
            <option value="Sales Steward">Sales Steward</option>
            <option value="Data Steward">Data Steward</option>
            <option value="Domain Engineer">Domain Engineer</option>
          </select>
        </div>
      </div>

      <div id="hddl-map-container" style="margin-bottom: 24px; position: relative; z-index: 1;"></div>

            <div id="glossary-inline" style="display:none; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 10px; border-radius: 4px; margin-bottom: 10px;"></div>

      <h2 style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
        <span class="codicon codicon-layers"></span>
        Active Envelopes
      </h2>
      
      <div id="envelope-grid" class="card-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 32px;"></div>
    </div>
  `

  // Initialize HDDL Map
  const mapContainer = container.querySelector('#hddl-map-container')
  if (mapContainer) {
    const getDetailBreakpoint = (width) => {
      if (width > 1000) return 'full'
      if (width > 600) return 'standard'
      if (width > 400) return 'compact'
      return 'minimal'
    }

    let lastBreakpoint = null
    let destroyed = false

    mountMap = () => {
      if (destroyed || !container.isConnected) return

      const measuredWidth = Math.round(mapContainer.getBoundingClientRect().width || 0)
      if (measuredWidth < 10) {
        activeMapMountRaf = requestAnimationFrame(mountMap)
        return
      }

      const nextBreakpoint = getDetailBreakpoint(measuredWidth)
      if (lastBreakpoint === nextBreakpoint && activeMapInstance) return
      lastBreakpoint = nextBreakpoint

      if (activeMapCleanup) {
        activeMapCleanup()
        activeMapCleanup = null
        activeMapInstance = null
      }

      try {
        const mapResult = createHDDLMap(mapContainer, { 
          initialFilter: currentFilter,
          width: measuredWidth 
        })
        activeMapInstance = mapResult
        activeMapCleanup = mapResult.cleanup

        if (activeMapInstance && activeMapInstance.setFilter) {
          activeMapInstance.setFilter(currentFilter)
        }
      } catch (e) {
        console.error('HDDL Map Error:', e)
        mapContainer.innerHTML = `<div style="color:var(--status-error); padding: 10px;">Error loading map: ${e.message}</div>`
      }
    }

    // Mount once layout is stable (prevents 0px width fallback → stuck downgraded mode)
    activeMapMountRaf = requestAnimationFrame(mountMap)

    // Re-mount only when available width crosses detail breakpoints
    activeMapResizeObserver = new ResizeObserver((entries) => {
      if (destroyed || !entries?.length) return
      const width = entries[0].contentRect?.width || 0
      const bp = getDetailBreakpoint(width)
      if (bp !== lastBreakpoint) {
        if (activeMapMountRaf != null) cancelAnimationFrame(activeMapMountRaf)
        activeMapMountRaf = requestAnimationFrame(mountMap)
      }
    })
    activeMapResizeObserver.observe(mapContainer)

    // Ensure we stop recreating if this page gets disconnected
    queueMicrotask(() => {
      if (!container.isConnected) {
        destroyed = true
        if (activeMapResizeObserver) {
          activeMapResizeObserver.disconnect()
          activeMapResizeObserver = null
        }
        if (activeMapMountRaf != null) {
          cancelAnimationFrame(activeMapMountRaf)
          activeMapMountRaf = null
        }
      }
    })
  }

  // Add tour button
  const tourButtonContainer = container.querySelector('#tour-button-container')
  if (tourButtonContainer) {
    tourButtonContainer.style.gap = '8px'
    
    const tourButton = createTourButton()
    tourButtonContainer.appendChild(tourButton)
  }

  // Add static timeline button when filtered to single steward
  const timelineButtonContainer = container.querySelector('#timeline-button-container')
  if (timelineButtonContainer) {
    const updateTimelineButton = () => {
      const existingTimelineButton = timelineButtonContainer.querySelector('.static-timeline-button')
      const isDesktop = window.innerWidth >= 768
      const isSingleSteward = currentFilter && currentFilter !== 'all'
      
      if (isDesktop && isSingleSteward) {
        // Always recreate button to capture current filter value
        if (existingTimelineButton) {
          existingTimelineButton.remove()
        }
        const timelineButton = createStaticTimelineButton(currentFilter)
        timelineButtonContainer.appendChild(timelineButton)
      } else {
        if (existingTimelineButton) {
          existingTimelineButton.remove()
        }
      }
    }
    
    // Initial check
    updateTimelineButton()
    
    // Update on filter change
    onFilterChange(() => {
      updateTimelineButton()
    })
    
    // Update on window resize
    window.addEventListener('resize', updateTimelineButton)
  }

  const grid = container.querySelector('#envelope-grid')

  // Glossary inline definitions (click a term above)
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

  // Steward filter functionality
  const stewardFilter = container.querySelector('#steward-filter')
  
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

    // Keep the map filter in sync even when a scenario change forces a reset.
    if (activeMapInstance && activeMapInstance.setFilter) {
      activeMapInstance.setFilter(stewardFilter.value)
    }
  }
  
  if (stewardFilter) {
    populateStewardFilter()
    stewardFilter.value = currentFilter
    stewardFilter.addEventListener('change', (e) => {
      currentFilter = e.target.value
      setStewardFilter(currentFilter)
      renderEnvelopeCards()
      // Update map filter
      if (activeMapInstance && activeMapInstance.setFilter) {
        activeMapInstance.setFilter(currentFilter)
      }
    })
  }

  function getProhibitedConstraints(constraints) {
    const items = Array.isArray(constraints) ? constraints : []
    return items.filter(c => {
      const s = String(c || '')
      return s.startsWith('No ') || s.includes('Not permitted') || s.startsWith('Human-only') || s.includes('Human-only')
    })
  }

  function renderEnvelopeCards() {
    const scenario = getScenario()
    const atHour = getTimeHour()
    const envelopes = scenario?.envelopes ?? []

    // Filter envelopes based on selected steward
    const filteredEnvelopes = currentFilter === 'all' 
      ? envelopes 
      : envelopes.filter(env => env.ownerRole === currentFilter)

    const boundary = getBoundaryInteractionCounts(scenario, atHour, 24)
    const byEnvelope = boundary?.byEnvelope

    const renderBoundaryBadges = (envelopeId) => {
      const bucket = byEnvelope?.get?.(envelopeId)
      if (!bucket) return ''
      const escalated = bucket.escalated ?? 0
      const overridden = bucket.overridden ?? 0
      const deferred = bucket.deferred ?? 0
      if (!escalated && !overridden && !deferred) return ''

      const parts = []
      if (escalated) parts.push(`<span style="background: var(--status-warning); opacity: 0.18; padding: 2px 6px; border-radius: 3px;" title="Boundary escalations (last 24h)">Esc ${escalated}</span>`)
      if (overridden) parts.push(`<span style="background: var(--status-error); opacity: 0.18; padding: 2px 6px; border-radius: 3px;" title="Boundary overrides (last 24h)">Ovr ${overridden}</span>`)
      if (deferred) parts.push(`<span style="background: var(--status-info); opacity: 0.18; padding: 2px 6px; border-radius: 3px;" title="Boundary deferrals (last 24h)">Def ${deferred}</span>`)
      return parts.join('')
    }

    // Show message if no envelopes match filter
    if (filteredEnvelopes.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--vscode-statusBar-foreground);">
          <span class="codicon codicon-filter" style="font-size: 48px; opacity: 0.3; display: block; margin-bottom: 16px;"></span>
          <div style="font-size: 14px;">No envelopes found for <strong>${currentFilter}</strong></div>
          <div style="font-size: 12px; margin-top: 8px;">Try selecting a different steward or "All Envelopes"</div>
        </div>
      `
      bindGlossary()
      return
    }

    grid.innerHTML = filteredEnvelopes.map((env) => {
      const effective = getEnvelopeAtTime(scenario, env.envelopeId, atHour) || env
      const status = getEnvelopeStatus(env, atHour)
      const statusIcon = status === 'active' ? 'pass-filled' : status === 'pending' ? 'clock' : 'circle-slash'
      const statusColor = status === 'active' ? 'var(--status-success)' : status === 'pending' ? 'var(--status-muted)' : 'var(--status-muted)'
      const statusLabel = status === 'active'
        ? 'Active at selected time'
        : status === 'pending'
          ? `Starts: ${formatSimTime(env.createdHour)}`
          : `Ended: ${formatSimTime(env.endHour)}`

      const version = effective?.envelope_version ?? 1
      const baseVersion = env?.envelope_version ?? 1
      const semver = toSemver(version)
      const isVersionBumped = version > baseVersion
      const revisionId = effective?.revision_id || '-'
      const prohibited = getProhibitedConstraints(effective?.constraints).slice(0, 2)
      const boundaryBadges = renderBoundaryBadges(env.envelopeId)
      
      // Get steward color for visual correlation with map
      const stewardColor = getStewardColor(env.ownerRole)
      const borderStyle = status === 'active' 
        ? `3px solid ${stewardColor}` 
        : `1px solid var(--vscode-sideBar-border)`
      const accentBar = status === 'active'
        ? `<div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${stewardColor}; border-radius: 6px 0 0 6px;"></div>`
        : ''
      
      // Version badge with bump indicator
      const versionBadge = isVersionBumped
        ? `<span style="background: var(--status-warning); color: var(--vscode-editor-background); padding: 2px 6px; border-radius: 3px; font-weight: 600;">↑ v${semver}</span>`
        : `<a class="glossary-term" href="#" data-glossary-term="Envelope Version">v${semver}</a>`

      return `
        <div class="envelope-card" data-envelope="${env.envelopeId}" data-steward-color="${stewardColor}" style="--envelope-accent: ${stewardColor}; position: relative; background: var(--vscode-sideBar-background); border: ${borderStyle}; padding: 16px; padding-left: ${status === 'active' ? '20px' : '16px'}; border-radius: 6px; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;">
          ${accentBar}
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <div>
              <div style="font-family: monospace; font-size: 11px; color: var(--vscode-statusBar-foreground);">${env.envelopeId}</div>
              <h3 style="margin: 4px 0;">${env.name}</h3>
              <div style="display:flex; gap: 10px; flex-wrap: wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 11px; color: var(--vscode-statusBar-foreground);">
                ${versionBadge}
                <span><a class="glossary-term" href="#" data-glossary-term="Revision">rev</a>: ${revisionId}</span>
              </div>
            </div>
            <span class="codicon codicon-${statusIcon}" style="color: ${statusColor};"></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${stewardColor};"></span>
            <span>${env.ownerRole}</span>
          </div>
          <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 12px;">${statusLabel}</div>
          <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 12px;">Window: ${formatSimTime(env.createdHour)} -> ${formatSimTime(env.endHour)}</div>
          <div style="display: flex; gap: 8px; font-size: 11px; flex-wrap: wrap;">
            <span style="background: var(--status-info); opacity: 0.2; padding: 2px 6px; border-radius: 3px;"><a class="glossary-term" href="#" data-glossary-term="Constraint">${(effective.constraints ?? []).length} constraints</a></span>
            <span style="background: var(--status-muted); opacity: 0.2; padding: 2px 6px; border-radius: 3px;">${env.domain}</span>
            ${prohibited.map(p => `<span style="background: var(--status-error); opacity: 0.18; padding: 2px 6px; border-radius: 3px;" title="${p}">Prohibited</span>`).join('')}
            ${boundaryBadges ? `<span><a class="glossary-term" href="#" data-glossary-term="Boundary Interaction">${boundaryBadges}</a></span>` : ''}
          </div>
        </div>
      `
    }).join('')

    // Rebind glossary listeners for newly-rendered card terms.
    bindGlossary()

    // Attach handlers
    const envelopeCards = container.querySelectorAll('.envelope-card')
    envelopeCards.forEach(card => {
      const stewardColor = card.dataset.stewardColor || 'var(--status-info)'
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = stewardColor
        card.style.boxShadow = `0 0 8px ${stewardColor}40`
      })
      card.addEventListener('mouseleave', () => {
        const isActive = card.style.border.includes('3px')
        card.style.borderColor = isActive ? stewardColor : 'var(--vscode-sideBar-border)'
        card.style.boxShadow = 'none'
      })
      card.addEventListener('click', (e) => {
        e.stopPropagation()
        const envelopeId = card.dataset.envelope
        const modal = createEnvelopeDetailModal(envelopeId)
        const app = document.querySelector('#app')
        app.appendChild(modal)
      })
    })
  }

  renderEnvelopeCards()

  const unsubScenario = onScenarioChange(() => {
    if (!container.isConnected) { unsubScenario(); unsubTime(); return }
    populateStewardFilter()
    renderEnvelopeCards()

    // Re-mount the map on scenario change so it can't get stuck rendering nothing
    // due to stale internal state or an invalid steward filter for the new scenario.
    if (mountMap) {
      if (activeMapMountRaf != null) cancelAnimationFrame(activeMapMountRaf)
      activeMapMountRaf = requestAnimationFrame(mountMap)
    }
  })
  const unsubTime = onTimeChange(() => {
    if (!container.isConnected) { unsubScenario(); unsubTime(); return }
    renderEnvelopeCards()
  })

}
