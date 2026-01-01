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

      <div id="hddl-map-container" style="position: relative; z-index: 1;"></div>

            <div id="glossary-inline" style="display:none; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 10px; border-radius: 4px;"></div>
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
      // Update map filter
      if (activeMapInstance && activeMapInstance.setFilter) {
        activeMapInstance.setFilter(currentFilter)
      }
    })
  }

  const unsubScenario = onScenarioChange(() => {
    if (!container.isConnected) { unsubScenario(); unsubTime(); return }
    populateStewardFilter()

    // Re-mount the map on scenario change so it can't get stuck rendering nothing
    // due to stale internal state or an invalid steward filter for the new scenario.
    if (mountMap) {
      if (activeMapMountRaf != null) cancelAnimationFrame(activeMapMountRaf)
      activeMapMountRaf = requestAnimationFrame(mountMap)
    }
  })
  const unsubTime = onTimeChange(() => {
    if (!container.isConnected) { unsubScenario(); unsubTime(); return }
  })

}
