import './design-tokens.css'
import './style-workspace.css'
import { initRouter, navigateTo } from './router'
import { createWorkspace } from './components/workspace'
import { createScenarioSelector } from './components/scenario-selector'
import { formatSimTime, getEnvelopeAtTime, getScenario, getTimeHour, onScenarioChange, onTimeChange, setTimeHour, getStewardFilter, onFilterChange, setScrubbingState, triggerCatchupWindow } from './sim/sim-state'
import { getStewardColor, getEventColor } from './sim/steward-colors'
import { getStoryModeEnabled, onStoryModeChange, setStoryModeEnabled } from './story-mode'
import { initReviewHarness, isReviewModeEnabled, setReviewModeEnabled } from './review-harness'
import { layoutManager, createLayoutSelector } from './components/layout-manager'
import { layoutOrchestrator, initLayoutOrchestrator } from './components/layout-orchestrator'

// Initialize app
const app = document.querySelector('#app')

// Always start at the beginning of the timeline on initial load.
// (Tests and onboarding expect a deterministic starting point.)
setTimeHour(0)

// Create titlebar with proper icons
const titlebar = document.createElement('div')
titlebar.className = 'titlebar'

// Create mobile hamburger menu button
const mobileHamburger = document.createElement('button')
mobileHamburger.className = 'mobile-hamburger'
mobileHamburger.setAttribute('aria-label', 'Open navigation menu')
mobileHamburger.innerHTML = '<span class="codicon codicon-menu"></span>'

// Click and keyboard event handlers for accessibility
mobileHamburger.addEventListener('click', () => {
  document.body.classList.toggle('mobile-nav-open')
})
mobileHamburger.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    document.body.classList.toggle('mobile-nav-open')
  }
})

const titleLeft = document.createElement('div')
titleLeft.style.cssText = 'display: flex; align-items: center; gap: 8px;'
titleLeft.appendChild(mobileHamburger)

const titleIcon = document.createElement('span')
titleIcon.className = 'codicon codicon-pulse'
const titleText = document.createElement('span')
titleText.className = 'title-text'
titleText.textContent = 'Human-Derived Decision Layer (HDDL) Simulation Platform'
titleLeft.appendChild(titleIcon)
titleLeft.appendChild(titleText)

const titleRight = document.createElement('div')
titleRight.style.cssText = 'display: flex; align-items: center; gap: 4px;'

const refreshBtn = document.createElement('a')
refreshBtn.className = 'codicon codicon-refresh'
refreshBtn.setAttribute('role', 'button')
refreshBtn.setAttribute('aria-label', 'Refresh')
refreshBtn.style.cssText = 'cursor: pointer; padding: 4px;'
refreshBtn.addEventListener('click', () => location.reload())
titleRight.appendChild(refreshBtn)

// Add scenario selector to titlebar
const scenarioSelector = createScenarioSelector()
titleRight.insertBefore(scenarioSelector, titleRight.firstChild)

titlebar.appendChild(titleLeft)
titlebar.appendChild(titleRight)

// Create global timeline scrubber
const timelineBar = document.createElement('div')
timelineBar.className = 'timeline-bar'
timelineBar.setAttribute('data-testid', 'timeline-bar')
timelineBar.style.cssText = 'background: var(--vscode-editor-background); border-bottom: 1px solid var(--vscode-sideBar-border); padding: 8px 16px; display: flex; align-items: center; gap: 16px;'

const timelineControls = document.createElement('div')
timelineControls.className = 'timeline-controls'
timelineControls.style.cssText = 'display: flex; align-items: center; gap: 8px;'

const playBtn = document.createElement('button')
playBtn.className = 'monaco-button'
playBtn.id = 'timeline-play'
playBtn.style.cssText = 'padding: 4px 8px; min-width: unset;'
playBtn.innerHTML = '<span class="codicon codicon-play"></span>'
playBtn.setAttribute('aria-label', 'Play simulation')
let isPlaying = false
let currentTime = getTimeHour()
let playTimer = null

// Loop toggle (default on)
const loopContainer = document.createElement('label')
loopContainer.style.cssText = 'display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--vscode-statusBar-foreground); cursor: pointer;'
const loopCheckbox = document.createElement('input')
loopCheckbox.type = 'checkbox'
loopCheckbox.id = 'timeline-loop'
loopCheckbox.checked = true
loopCheckbox.style.cssText = 'cursor: pointer;'
const loopLabel = document.createElement('span')
loopLabel.textContent = 'Loop'
loopContainer.appendChild(loopCheckbox)
loopContainer.appendChild(loopLabel)

playBtn.addEventListener('click', () => {
  isPlaying = !isPlaying
  playBtn.innerHTML = isPlaying ? '<span class="codicon codicon-debug-pause"></span>' : '<span class="codicon codicon-play"></span>'

  window.dispatchEvent(new CustomEvent('hddl:playback', { detail: { playing: isPlaying } }))

  if (!isPlaying) {
    if (playTimer) {
      clearInterval(playTimer)
      playTimer = null
    }
    return
  }

  if (playTimer) {
    clearInterval(playTimer)
    playTimer = null
  }

  playTimer = setInterval(() => {
    const scenario = getScenario()
    const duration = scenario?.durationHours ?? 48
    const speed = Number(speedSelector.value || 1)
    // Use fractional hour steps so short-lived authority moments (e.g. boundary→revision)
    // are observable during autoplay.
    const baseStepHours = 0.25
    const next = getTimeHour() + (baseStepHours * speed)
    if (next >= duration) {
      // Check if loop is enabled
      if (loopCheckbox.checked) {
        setTimeHour(0) // Reset to beginning
        return
      }
      setTimeHour(duration)
      isPlaying = false
      playBtn.innerHTML = '<span class="codicon codicon-play"></span>'
      if (playTimer) {
        clearInterval(playTimer)
        playTimer = null
      }
      return
    }
    setTimeHour(next)
  }, 650)
})

// Auto-start playback on load (including hot reload for fast iteration)
// Only skip in test environments
const isTestEnv = window.navigator.webdriver || window.Playwright

// Expose utility functions to window for console access
import('./sim/scenario-loader.js').then(loaderModule => {
  window.clearGeneratedScenarios = () => {
    loaderModule.clearGeneratedScenarios()
    console.log('✓ Cleared generated scenarios and their narratives. Reload the page to see changes.')
  }
})

if (!isTestEnv) {
  // Defer to ensure DOM is ready
  setTimeout(() => {
    if (!isPlaying) {
      playBtn.click()
    }
  }, 300)
} else {
  // Expose store functions to window for test automation
  window.getScenario = getScenario
  window.setTimeHour = setTimeHour
  window.getTimeHour = getTimeHour
  // Load scenario from URL query parameter if in test mode
  const params = new URLSearchParams(window.location.search)
  const scenarioParam = params.get('scenario')
  if (scenarioParam) {
    // Load from scenario catalog (async)
    Promise.all([
      import('./sim/scenario-loader.js'),
      import('./sim/store.js')
    ]).then(async ([loaderModule, storeModule]) => {
      try {
        const scenarioData = await loaderModule.loadScenarioAsync(scenarioParam)
        storeModule.setScenario(scenarioData)
        const scenario = loaderModule.SCENARIOS[scenarioParam]
        console.log(`✓ Loaded test scenario: ${scenarioParam} (${scenario.title})`)
      } catch (err) {
        console.error(`Failed to load scenario '${scenarioParam}':`, err)
      }
    }).catch(err => console.error(`Failed to load scenario ${scenarioParam}:`, err))
  }
}

const timeDisplay = document.createElement('div')
timeDisplay.id = 'timeline-time'
timeDisplay.style.cssText = 'font-family: monospace; font-size: 13px; min-width: 120px;'
timeDisplay.textContent = formatSimTime(currentTime)

const speedSelector = document.createElement('select')
speedSelector.className = 'monaco-select'
speedSelector.id = 'timeline-speed'
speedSelector.style.cssText = 'background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); color: var(--vscode-input-foreground); padding: 2px 4px; font-size: 12px;'
speedSelector.innerHTML = '<option value="1">1x</option><option value="2">2x</option><option value="3">3x</option><option value="4">4x</option>'
speedSelector.value = '2'

timelineControls.appendChild(playBtn)
timelineControls.appendChild(timeDisplay)
timelineControls.appendChild(speedSelector)
timelineControls.appendChild(loopContainer)

const scrubberContainer = document.createElement('div')
scrubberContainer.id = 'timeline-scrubber'
scrubberContainer.title = 'Timeline: Colored spans indicate active envelope windows. Click or drag to scrub.'
scrubberContainer.style.cssText = 'flex: 1; height: 24px; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); border-radius: 3px; position: relative; cursor: pointer;'

const envelopeSpans = document.createElement('div')
envelopeSpans.className = 'timeline-envelope-spans'
envelopeSpans.setAttribute('aria-hidden', 'true')

const eventMarkers = document.createElement('div')
eventMarkers.className = 'timeline-event-markers'
eventMarkers.setAttribute('aria-hidden', 'true')

const mismatchMarkers = document.createElement('div')
mismatchMarkers.className = 'timeline-mismatch-markers'

const initialScenario = getScenario()
const initialDuration = initialScenario?.durationHours ?? 48

const scrubberFill = document.createElement('div')
scrubberFill.style.cssText = `width: ${(currentTime / initialDuration) * 100}%; height: 100%; background: var(--status-info); opacity: 0.3; pointer-events: none; position: relative; z-index: 0;`

const scrubberHandle = document.createElement('div')
scrubberHandle.style.cssText = `position: absolute; left: ${(currentTime / initialDuration) * 100}%; top: -4px; width: 16px; height: 32px; background: var(--status-info); border: 2px solid var(--vscode-editor-background); border-radius: 4px; cursor: ew-resize; z-index: 6; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4); transform: translateX(-50%); transition: transform 0.1s ease; will-change: transform;`
scrubberHandle.setAttribute('title', 'Drag to scrub timeline')

// Add hover effect
scrubberHandle.addEventListener('mouseenter', () => {
  scrubberHandle.style.transform = 'translateX(-50%) scale(1.1)'
  scrubberHandle.style.boxShadow = '0 2px 12px rgba(75, 150, 255, 0.6)'
})
scrubberHandle.addEventListener('mouseleave', () => {
  scrubberHandle.style.transform = 'translateX(-50%) scale(1)'
  scrubberHandle.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)'
})

scrubberContainer.appendChild(envelopeSpans)
scrubberContainer.appendChild(eventMarkers)
scrubberContainer.appendChild(mismatchMarkers)
scrubberContainer.appendChild(scrubberFill)
scrubberContainer.appendChild(scrubberHandle)

// Create timeline tooltip
const timelineTooltip = document.createElement('div')
timelineTooltip.className = 'timeline-tooltip'
timelineTooltip.style.cssText = `
  position: fixed;
  background: var(--vscode-editorHoverWidget-background);
  border: 1px solid var(--vscode-editorHoverWidget-border);
  color: var(--vscode-editorHoverWidget-foreground);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  pointer-events: none;
  z-index: 10000;
  display: none;
  max-width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`
document.body.appendChild(timelineTooltip)

function showTooltip(html, x, y, color = null) {
  timelineTooltip.innerHTML = html
  
  // Set background color if provided
  if (color) {
    timelineTooltip.style.background = `color-mix(in srgb, ${color} 25%, #1e1e1e)`
    timelineTooltip.style.borderColor = color
  } else {
    // Reset to default
    timelineTooltip.style.background = '#1e1e1e'
    timelineTooltip.style.borderColor = 'var(--vscode-editorHoverWidget-border)'
  }
  
  timelineTooltip.style.display = 'block'
  
  // Position tooltip, avoiding edges
  const rect = timelineTooltip.getBoundingClientRect()
  let finalX = x + 10
  let finalY = y + 10
  
  if (finalX + rect.width > window.innerWidth - 10) {
    finalX = x - rect.width - 10
  }
  if (finalY + rect.height > window.innerHeight - 10) {
    finalY = y - rect.height - 10
  }
  
  timelineTooltip.style.left = `${finalX}px`
  timelineTooltip.style.top = `${finalY}px`
}

function hideTooltip() {
  timelineTooltip.style.display = 'none'
}

function renderEnvelopeSpans() {
  const scenario = getScenario()
  const duration = scenario?.durationHours ?? 48
  envelopeSpans.innerHTML = ''
  
  // Filter envelopes based on steward filter
  const stewardFilter = getStewardFilter()
  const envelopes = scenario?.envelopes ?? []
  const filteredEnvelopes = stewardFilter === 'all'
    ? envelopes
    : envelopes.filter(env => env.ownerRole === stewardFilter)
  
  filteredEnvelopes.forEach((env) => {
    const start = Math.max(0, Math.min(duration, env.createdHour ?? 0))
    const end = Math.max(0, Math.min(duration, env.endHour ?? duration))
    const span = document.createElement('div')
    span.className = 'timeline-envelope-span'
    span.style.left = `${(start / duration) * 100}%`
    span.style.width = `${Math.max(0.5, ((end - start) / duration) * 100)}%`
    // Use shared steward color for consistency with map and panels
    const stewardColor = getStewardColor(env.ownerRole)
    span.style.background = stewardColor
    
    // Enhanced tooltip on hover
    span.addEventListener('mouseenter', (e) => {
      const tooltipHtml = `
        <div style="font-weight: 600; margin-bottom: 4px; color: ${stewardColor};">${env.envelopeId}</div>
        <div style="font-size: 11px; opacity: 0.9;">
          <div><strong>Steward:</strong> ${env.ownerRole}</div>
          <div><strong>Status:</strong> ${env.status || 'active'}</div>
          <div><strong>Version:</strong> v${env.envelope_version || '1.0.0'}</div>
          <div><strong>Active:</strong> ${formatSimTime(start)} → ${formatSimTime(end)}</div>
        </div>
      `
      showTooltip(tooltipHtml, e.clientX, e.clientY, stewardColor)
    })
    span.addEventListener('mouseleave', hideTooltip)
    span.addEventListener('mousemove', (e) => {
      showTooltip(timelineTooltip.innerHTML, e.clientX, e.clientY, stewardColor)
    })
    
    envelopeSpans.appendChild(span)
  })
}

function renderEventMarkers() {
  const scenario = getScenario()
  const duration = scenario?.durationHours ?? 48
  eventMarkers.innerHTML = ''

  // Filter events based on steward filter
  const stewardFilter = getStewardFilter()
  const envelopes = scenario?.envelopes ?? []
  const filteredEnvelopeIds = new Set(
    stewardFilter === 'all'
      ? envelopes.map(e => e.envelopeId)
      : envelopes.filter(e => e.ownerRole === stewardFilter).map(e => e.envelopeId)
  )

  const events = Array.isArray(scenario?.events) ? scenario.events : []
  const filteredEvents = events.filter(ev => {
    const envId = ev?.envelopeId || ev?.envelope_id
    return !envId || filteredEnvelopeIds.has(envId)
  })
  
  // Create envelope index for color lookup
  const envelopeIndex = new Map(envelopes.map(e => [e.envelopeId, e]))
  
  filteredEvents.forEach((ev) => {
    const hour = typeof ev?.hour === 'number' ? ev.hour : null
    if (hour === null) return
    const clamped = Math.max(0, Math.min(duration, hour))

    const marker = document.createElement('div')
    marker.className = 'timeline-event-marker'
    marker.style.left = `${(clamped / duration) * 100}%`
    marker.dataset.type = ev?.type || ''
    marker.dataset.severity = ev?.severity || ''

    // Get colors for tooltip background (steward) and title (event type)
    const envId = ev?.envelopeId || ev?.envelope_id
    const envelope = envId ? envelopeIndex.get(envId) : null
    const eventType = ev?.type || 'event'
    
    // Background color: steward color if envelope exists, otherwise no special color
    const tooltipBgColor = envelope ? getStewardColor(envelope.ownerRole) : null
    
    // Title color: use shared EVENT_COLORS palette via getEventColor()
    const titleColor = getEventColor(eventType, ev?.severity, ev?.status)

    // Enhanced tooltip with event details
    const typeLabels = {
      'signal': '📡 Signal',
      'decision': '✓ Decision',
      'boundary_interaction': '⚠ Boundary',
      'revision': '📝 Revision',
      'escalation': '⬆ Escalation',
      'embedding': '🧠 Embedding',
      'retrieval': '🔍 Retrieval'
    }
    const typeLabel = typeLabels[eventType] || eventType
    
    marker.addEventListener('mouseenter', (e) => {
      const actor = ev?.agentId || ev?.actorStewardRole || 'system'
      const tooltipHtml = `
        <div style="font-weight: 600; margin-bottom: 4px; color: ${titleColor};">${typeLabel}</div>
        <div style="font-size: 11px; opacity: 0.9;">
          <div><strong>Time:</strong> ${formatSimTime(clamped)}</div>
          ${actor ? `<div><strong>Actor:</strong> ${actor}</div>` : ''}
          ${envId ? `<div><strong>Envelope:</strong> ${envId}</div>` : ''}
          ${ev?.label ? `<div style="margin-top: 4px; font-style: italic;">${ev.label}</div>` : ''}
          ${ev?.severity ? `<div><strong>Severity:</strong> ${ev.severity}</div>` : ''}
        </div>
      `
      showTooltip(tooltipHtml, e.clientX, e.clientY, tooltipBgColor)
    })
    marker.addEventListener('mouseleave', hideTooltip)
    marker.addEventListener('mousemove', (e) => {
      showTooltip(timelineTooltip.innerHTML, e.clientX, e.clientY, tooltipBgColor)
    })

    marker.addEventListener('click', (e) => {
      // Jump scrubber to the event time without triggering the container click handler
      e.preventDefault()
      e.stopPropagation()
      setTimeHour(clamped)
    })

    eventMarkers.appendChild(marker)
  })
}

function renderMismatchMarkers() {
  const scenario = getScenario()
  const duration = scenario?.durationHours ?? 48
  mismatchMarkers.innerHTML = ''

  // Filter based on steward filter
  const stewardFilter = getStewardFilter()
  const allEnvelopes = scenario?.envelopes ?? []
  const filteredEnvelopes = stewardFilter === 'all'
    ? allEnvelopes
    : allEnvelopes.filter(e => e.ownerRole === stewardFilter)
  const filteredEnvelopeIds = new Set(filteredEnvelopes.map(e => e.envelopeId))

  const envelopesIndex = new Map(allEnvelopes.map(e => [e.envelopeId, e]))
  const events = Array.isArray(scenario?.events) ? scenario.events : []

  events
    .filter(ev => ev && ev.type === 'signal')
    .filter(ev => {
      const envId = ev?.envelopeId
      return envId && filteredEnvelopeIds.has(envId)
    })
    .forEach((ev) => {
      const hour = typeof ev?.hour === 'number' ? ev.hour : null
      const envelopeId = ev?.envelopeId
      const refs = Array.isArray(ev?.assumptionRefs) ? ev.assumptionRefs : []
      if (hour === null || !envelopeId || !refs.length) return

      const clamped = Math.max(0, Math.min(duration, hour))
      const base = envelopesIndex.get(envelopeId)
      if (base && (clamped < Number(base.createdHour ?? 0) || clamped >= Number(base.endHour ?? duration))) return
      const effective = base ? (getEnvelopeAtTime(scenario, envelopeId, clamped) || base) : null
      const assumptions = new Set((effective?.assumptions ?? []).map(a => String(a)))

      const missing = refs.filter(r => !assumptions.has(String(r)))
      if (!missing.length) return

      const marker = document.createElement('div')
      marker.className = 'timeline-mismatch-marker'
      marker.style.left = `${(clamped / duration) * 100}%`
      marker.dataset.severity = ev?.severity || 'warning'
      
      // Enhanced tooltip with mismatch details
      marker.addEventListener('mouseenter', (e) => {
        const tooltipHtml = `
          <div style="font-weight: 600; margin-bottom: 4px; color: var(--status-warning);">⚠ Assumption Mismatch</div>
          <div style="font-size: 11px; opacity: 0.9;">
            <div><strong>Time:</strong> ${formatSimTime(clamped)}</div>
            <div><strong>Envelope:</strong> ${envelopeId}</div>
            <div style="margin-top: 4px;"><strong>Missing Assumptions:</strong></div>
            <div style="margin-left: 8px; font-family: monospace; font-size: 10px;">
              ${missing.map(r => `• ${r}`).join('<br>')}
            </div>
          </div>
        `
        showTooltip(tooltipHtml, e.clientX, e.clientY)
      })
      marker.addEventListener('mouseleave', hideTooltip)
      marker.addEventListener('mousemove', (e) => {
        showTooltip(timelineTooltip.innerHTML, e.clientX, e.clientY)
      })

      // Make mismatch markers discoverable: hover/focus shows title; click jumps to the signal time.
      marker.tabIndex = 0
      marker.setAttribute('role', 'button')
      marker.setAttribute('aria-label', `Assumption mismatch at ${formatSimTime(clamped)} for ${envelopeId}. Jump to time.`)

      marker.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        setTimeHour(clamped)
      })

      marker.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          setTimeHour(clamped)
        }
      })

      mismatchMarkers.appendChild(marker)
    })
}

function renderStoryBeatMarkers() {
  const scenario = getScenario()
  const duration = scenario?.durationHours ?? 48
  storyBeatMarkers.innerHTML = ''

  if (!getStoryModeEnabled()) return

  const beats = [
    { hour: 0, label: 'T+0', title: 'T+0 — Authority exists' },
    { hour: 24, label: 'T+24h', title: 'T+24h — Signal strained assumptions' },
    { hour: 36, label: 'T+36h', title: 'T+36h — DSG produced a revision artifact' },
  ].filter(b => duration >= b.hour)

  beats.forEach((b) => {
    const clamped = Math.max(0, Math.min(duration, b.hour))
    const marker = document.createElement('div')
    marker.className = 'timeline-story-beat-marker'
    marker.style.cssText = `position:absolute; top: 0; bottom: 0; width: 2px; left: ${(clamped / duration) * 100}%; background: var(--status-info); opacity: 0.8;`
    marker.title = `${b.title} (jump)`
    marker.tabIndex = 0
    marker.setAttribute('role', 'button')
    marker.setAttribute('aria-label', `Jump to ${b.title} at ${formatSimTime(clamped)}`)

    const pill = document.createElement('div')
    pill.style.cssText = 'position:absolute; top: -20px; left: 50%; transform: translateX(-50%); padding: 1px 6px; border-radius: 999px; font-size: 11px; background: var(--status-info); color: var(--vscode-editor-background); opacity: 0.9; white-space: nowrap; pointer-events: none;'
    pill.textContent = b.label
    marker.appendChild(pill)

    marker.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      setTimeHour(clamped)
    })

    marker.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        setTimeHour(clamped)
      }
    })

    storyBeatMarkers.appendChild(marker)
  })
}

function syncTimelineUI(nextHour) {
  const scenario = getScenario()
  const duration = scenario?.durationHours ?? 48
  const percent = (nextHour / duration) * 100
  scrubberHandle.style.left = `${percent}%`
  scrubberFill.style.width = `${percent}%`
  timeDisplay.textContent = formatSimTime(nextHour)
}

// Initial overlays
renderEnvelopeSpans()
renderEventMarkers()
renderMismatchMarkers()

// Scrubber drag functionality
let isDragging = false
scrubberHandle.addEventListener('mousedown', (e) => {
  isDragging = true
  setScrubbingState(true)
  e.preventDefault()
})

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return
  const rect = scrubberContainer.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const percent = x / rect.width
  const duration = getScenario()?.durationHours ?? 48
  currentTime = Math.round(percent * duration)
  setTimeHour(currentTime, { throttle: true })
})

document.addEventListener('mouseup', () => {
  if (isDragging) {
    setScrubbingState(false)
  }
  isDragging = false
})

scrubberContainer.addEventListener('click', (e) => {
  // Trigger catch-up window for click-to-jump (instant embedding placement)
  triggerCatchupWindow()
  const rect = scrubberContainer.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = x / rect.width
  const duration = getScenario()?.durationHours ?? 48
  currentTime = Math.round(percent * duration)
  setTimeHour(currentTime)
})

// Keep overlays updated when scenario changes.
onScenarioChange(() => {
  renderEnvelopeSpans()
  renderEventMarkers()
  renderMismatchMarkers()
})

// Re-render timeline when filter changes
onFilterChange(() => {
  renderEnvelopeSpans()
  renderEventMarkers()
  renderMismatchMarkers()
})

const timelineLabel = document.createElement('div')
timelineLabel.style.cssText = 'font-size: 11px; color: var(--vscode-statusBar-foreground);'
timelineLabel.textContent = '0h'

const timelineEnd = document.createElement('div')
timelineEnd.style.cssText = 'font-size: 11px; color: var(--vscode-statusBar-foreground);'
timelineEnd.textContent = '48h' // Will be updated when scenario loads

timelineBar.appendChild(timelineControls)
timelineBar.appendChild(timelineLabel)
timelineBar.appendChild(scrubberContainer)
timelineBar.appendChild(timelineEnd)

// Initial render + reactive updates
renderEnvelopeSpans()
renderEventMarkers()
syncTimelineUI(getTimeHour())
onScenarioChange(() => {
  // Update timeline end label to match scenario duration
  const scenario = getScenario()
  if (scenario?.durationHours) {
    timelineEnd.textContent = `${scenario.durationHours}h`
  }
  
  renderEnvelopeSpans()
  renderEventMarkers()
  syncTimelineUI(getTimeHour())
})
onTimeChange((t) => {
  currentTime = t
  syncTimelineUI(t)
})

// Create workspace layout
const workbench = createWorkspace()

// Preload all scenarios in background after initial render (non-blocking)
// This ensures zero delay when users switch scenarios
if (!isTestEnv) {
  setTimeout(async () => {
    const { preloadScenarios } = await import('./sim/scenario-loader.js')
    await preloadScenarios()
  }, 1000) // Wait 1s after initial load
}

// Create statusbar with proper status indicators
const statusbar = document.createElement('div')
statusbar.className = 'part statusbar'
statusbar.setAttribute('role', 'status')

const statusLeft = document.createElement('div')
statusLeft.className = 'items-container status-left'

// Connection status
const connStatus = document.createElement('div')
connStatus.className = 'statusbar-item'
const connIcon = document.createElement('span')
connIcon.className = 'codicon codicon-pass-filled'
connIcon.style.color = '#3fb950'
const connText = document.createElement('span')
connText.textContent = 'Connected'
connStatus.appendChild(connIcon)
connStatus.appendChild(connText)

// Version
const versionItem = document.createElement('div')
versionItem.className = 'statusbar-item'
const versionIcon = document.createElement('span')
versionIcon.className = 'codicon codicon-info'
const versionText = document.createElement('span')
versionText.textContent = 'Simulation v1.0'
versionItem.appendChild(versionIcon)
versionItem.appendChild(versionText)

// GitHub link
const githubLink = document.createElement('a')
githubLink.href = 'https://github.com/enufacas/hddl'
githubLink.target = '_blank'
githubLink.rel = 'noopener noreferrer'
githubLink.className = 'statusbar-item statusbar-link'
githubLink.style.cssText = 'cursor: pointer; text-decoration: none; color: inherit;'
const githubIcon = document.createElement('span')
githubIcon.className = 'codicon codicon-github'
const githubText = document.createElement('span')
githubText.textContent = 'GitHub'
githubLink.appendChild(githubIcon)
githubLink.appendChild(githubText)

statusLeft.appendChild(connStatus)
statusLeft.appendChild(versionItem)
statusLeft.appendChild(githubLink)

const statusRight = document.createElement('div')
statusRight.className = 'items-container status-right'

// Last update time
const timeItem = document.createElement('div')
timeItem.className = 'statusbar-item'
const timeIcon = document.createElement('span')
timeIcon.className = 'codicon codicon-clock'
const timeText = document.createElement('span')
timeText.textContent = new Date().toLocaleTimeString()
timeItem.appendChild(timeIcon)
timeItem.appendChild(timeText)

// Update time every second
setInterval(() => {
  timeText.textContent = new Date().toLocaleTimeString()
}, 1000)

statusRight.appendChild(timeItem)

// Layout selector (desktop only)
const layoutSelector = createLayoutSelector(layoutManager)
statusRight.appendChild(layoutSelector)

statusbar.appendChild(statusLeft)
statusbar.appendChild(statusRight)

// Mount components
app.appendChild(titlebar)
app.appendChild(timelineBar)
app.appendChild(workbench)
app.appendChild(statusbar)

// Initialize layout manager after DOM is mounted
layoutManager.init({
  sidebar: document.querySelector('.sidebar'),
  auxiliary: document.querySelector('.auxiliarybar'),
  bottom: document.querySelector('.panel'),
  setSidebarCollapsed: (collapsed) => {
    document.body.classList.toggle('sidebar-hidden', Boolean(collapsed))
  },
  setAuxCollapsed: (collapsed) => {
    document.body.classList.toggle('aux-hidden', Boolean(collapsed))
  },
  setBottomCollapsed: (collapsed) => {
    document.body.classList.toggle('panel-hidden', Boolean(collapsed))
  }
})

// Initialize layout orchestrator for responsive breakpoint handling
initLayoutOrchestrator(app, {
  debounceDelay: 100,
  onModeChange: (newMode, oldMode) => {
    console.log(`Layout mode changed: ${oldMode} → ${newMode}`)
  }
})

// Listen for layout changes to sync with other components
document.addEventListener('hddl:layout:resize', (e) => {
  // The HDDL map will automatically recalculate on next render
  // based on its container width
  const { width, mode } = e.detail
  console.log(`Layout resize: ${width}px (${mode})`)
})

// UX review harness (optional)
initReviewHarness()

// Initialize router (pages will render into #editor-area)
initRouter()
