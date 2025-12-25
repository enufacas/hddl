import './style-workspace.css'
import { initRouter } from './router'
import { createWorkspace } from './components/workspace'
import { formatSimTime, getScenario, getTimeHour, onScenarioChange, onTimeChange, setTimeHour } from './sim/sim-state'
import { addRandomEnvelope, addRandomEvents, importEventsFromFile, resetScenarioToDefault } from './sim/scenario-actions'

// Initialize app
const app = document.querySelector('#app')

// Create titlebar with proper icons
const titlebar = document.createElement('div')
titlebar.className = 'titlebar'
const titleLeft = document.createElement('div')
titleLeft.style.cssText = 'display: flex; align-items: center; gap: 8px;'
const titleIcon = document.createElement('span')
titleIcon.className = 'codicon codicon-pulse'
const titleText = document.createElement('span')
titleText.textContent = 'HDDL Simulation Platform'
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

titlebar.appendChild(titleLeft)
titlebar.appendChild(titleRight)

// Create global timeline scrubber
const timelineBar = document.createElement('div')
timelineBar.className = 'timeline-bar'
timelineBar.setAttribute('data-testid', 'timeline-bar')
timelineBar.style.cssText = 'background: var(--vscode-editor-background); border-bottom: 1px solid var(--vscode-sideBar-border); padding: 8px 16px; display: flex; align-items: center; gap: 16px;'

const timelineControls = document.createElement('div')
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
playBtn.addEventListener('click', () => {
  isPlaying = !isPlaying
  playBtn.innerHTML = isPlaying ? '<span class="codicon codicon-debug-pause"></span>' : '<span class="codicon codicon-play"></span>'

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
    const next = getTimeHour() + (1 * speed)
    if (next >= duration) {
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
  }, 450)
})

const timeDisplay = document.createElement('div')
timeDisplay.id = 'timeline-time'
timeDisplay.style.cssText = 'font-family: monospace; font-size: 13px; min-width: 120px;'
timeDisplay.textContent = formatSimTime(currentTime)

const speedSelector = document.createElement('select')
speedSelector.className = 'monaco-select'
speedSelector.style.cssText = 'background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); color: var(--vscode-input-foreground); padding: 2px 4px; font-size: 12px;'
speedSelector.innerHTML = '<option value="1">1x</option><option value="2">2x</option><option value="4">4x</option><option value="8">8x</option>'

timelineControls.appendChild(playBtn)
timelineControls.appendChild(timeDisplay)
timelineControls.appendChild(speedSelector)

const scrubberContainer = document.createElement('div')
scrubberContainer.id = 'timeline-scrubber'
scrubberContainer.style.cssText = 'flex: 1; height: 24px; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); border-radius: 3px; position: relative; cursor: pointer;'

const envelopeSpans = document.createElement('div')
envelopeSpans.className = 'timeline-envelope-spans'
envelopeSpans.setAttribute('aria-hidden', 'true')

const eventMarkers = document.createElement('div')
eventMarkers.className = 'timeline-event-markers'
eventMarkers.setAttribute('aria-hidden', 'true')

const scrubberFill = document.createElement('div')
scrubberFill.style.cssText = `width: ${(currentTime / 48) * 100}%; height: 100%; background: var(--status-info); opacity: 0.3; pointer-events: none;`

const scrubberHandle = document.createElement('div')
scrubberHandle.style.cssText = `position: absolute; left: ${(currentTime / 48) * 100}%; top: -2px; width: 3px; height: 28px; background: var(--status-info); cursor: ew-resize;`

scrubberContainer.appendChild(envelopeSpans)
scrubberContainer.appendChild(eventMarkers)
scrubberContainer.appendChild(scrubberFill)
scrubberContainer.appendChild(scrubberHandle)

function renderEnvelopeSpans() {
  const scenario = getScenario()
  const duration = scenario?.durationHours ?? 48
  envelopeSpans.innerHTML = ''
  ;(scenario?.envelopes ?? []).forEach((env) => {
    const start = Math.max(0, Math.min(duration, env.createdHour ?? 0))
    const end = Math.max(0, Math.min(duration, env.endHour ?? duration))
    const span = document.createElement('div')
    span.className = 'timeline-envelope-span'
    span.style.left = `${(start / duration) * 100}%`
    span.style.width = `${Math.max(0.5, ((end - start) / duration) * 100)}%`
    span.style.background = env.accent || 'var(--vscode-focusBorder)'
    span.title = `${env.envelopeId}: ${formatSimTime(start)} -> ${formatSimTime(end)}`
    envelopeSpans.appendChild(span)
  })
}

function renderEventMarkers() {
  const scenario = getScenario()
  const duration = scenario?.durationHours ?? 48
  eventMarkers.innerHTML = ''

  const events = Array.isArray(scenario?.events) ? scenario.events : []
  events.forEach((ev) => {
    const hour = typeof ev?.hour === 'number' ? ev.hour : null
    if (hour === null) return
    const clamped = Math.max(0, Math.min(duration, hour))

    const marker = document.createElement('div')
    marker.className = 'timeline-event-marker'
    marker.style.left = `${(clamped / duration) * 100}%`
    marker.dataset.type = ev?.type || ''
    marker.dataset.severity = ev?.severity || ''
    marker.title = `${ev?.type || 'event'} @ ${formatSimTime(clamped)}${ev?.label ? ` - ${ev.label}` : ''}`

    marker.addEventListener('click', (e) => {
      // Jump scrubber to the event time without triggering the container click handler
      e.preventDefault()
      e.stopPropagation()
      setTimeHour(clamped)
    })

    eventMarkers.appendChild(marker)
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

// Scrubber drag functionality
let isDragging = false
scrubberHandle.addEventListener('mousedown', (e) => {
  isDragging = true
  e.preventDefault()
})

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return
  const rect = scrubberContainer.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const percent = x / rect.width
  const duration = getScenario()?.durationHours ?? 48
  currentTime = Math.round(percent * duration)
  setTimeHour(currentTime)
})

document.addEventListener('mouseup', () => {
  isDragging = false
})

scrubberContainer.addEventListener('click', (e) => {
  const rect = scrubberContainer.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = x / rect.width
  const duration = getScenario()?.durationHours ?? 48
  currentTime = Math.round(percent * duration)
  setTimeHour(currentTime)
})

const timelineLabel = document.createElement('div')
timelineLabel.style.cssText = 'font-size: 11px; color: var(--vscode-statusBar-foreground);'
timelineLabel.textContent = '0h'

const timelineEnd = document.createElement('div')
timelineEnd.style.cssText = 'font-size: 11px; color: var(--vscode-statusBar-foreground);'
timelineEnd.textContent = '48h'

// Timeline header actions (home-only)
const timelineActions = document.createElement('div')
timelineActions.id = 'timeline-actions'
timelineActions.className = 'timeline-actions'
timelineActions.setAttribute('data-testid', 'timeline-actions')
timelineActions.innerHTML = `
  <div class="timeline-actions__buttons">
    <button class="monaco-button monaco-text-button timeline-action-button" data-action="import" aria-label="Import events" title="Import events (additive)">
      <span class="codicon codicon-file-add"></span>
      <span class="timeline-action-label">Import</span>
    </button>
    <button class="monaco-button monaco-text-button timeline-action-button" data-action="random-events" aria-label="Add random events" title="Add random events (10)">
      <span class="codicon codicon-sparkle"></span>
      <span class="timeline-action-label">+10</span>
    </button>
    <button class="monaco-button monaco-text-button timeline-action-button" data-action="random-envelope" aria-label="Add random envelope" title="Add random envelope">
      <span class="codicon codicon-new-file"></span>
      <span class="timeline-action-label">Envelope</span>
    </button>
    <button class="monaco-button timeline-action-button" data-action="reset" aria-label="Clear & reset" title="Clear & reset">
      <span class="codicon codicon-clear-all"></span>
      <span class="timeline-action-label">Reset</span>
    </button>
  </div>
  <div class="timeline-actions__status" id="timeline-actions-status" aria-live="polite"></div>
`

let statusTimer = null
function setTimelineStatus(message, { kind = 'info' } = {}) {
  const el = document.getElementById('timeline-actions-status')
  if (!el) return
  el.textContent = String(message || '')
  el.dataset.kind = kind

  if (statusTimer) {
    clearTimeout(statusTimer)
    statusTimer = null
  }

  if (!message) return
  statusTimer = setTimeout(() => {
    const current = document.getElementById('timeline-actions-status')
    if (!current) return
    current.textContent = ''
    current.dataset.kind = ''
  }, 3500)
}

window.addEventListener('hddl:status', (e) => {
  const msg = e?.detail?.message
  const kind = e?.detail?.kind || 'info'
  if (!msg) return
  setTimelineStatus(msg, { kind })
})

function isHomePath(pathname) {
  const p = String(pathname || '/').split('?')[0].split('#')[0]
  const normalized = (p.length > 1 && p.endsWith('/')) ? p.slice(0, -1) : p
  return normalized === '/'
}

function syncTimelineActionsVisibility(pathname) {
  const show = isHomePath(pathname)
  timelineActions.style.display = show ? 'flex' : 'none'
}

syncTimelineActionsVisibility(window.location.pathname)
window.addEventListener('hddl:navigate', (e) => {
  syncTimelineActionsVisibility(e?.detail?.path || window.location.pathname)
})
window.addEventListener('popstate', () => {
  syncTimelineActionsVisibility(window.location.pathname)
})

timelineActions.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]')
  if (!btn) return

  const action = btn.dataset.action
  if (!action) return

  const beforeEvents = (getScenario()?.events ?? []).length
  const beforeEnvelopes = (getScenario()?.envelopes ?? []).length

  try {
    if (action === 'import') {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        try {
          const report = await importEventsFromFile(file)
          if (report?.errors?.length) {
            setTimelineStatus(`Schema error: ${report.errors[0]}`, { kind: 'error' })
            return
          }

          const afterEvents = (getScenario()?.events ?? []).length
          const added = Math.max(0, afterEvents - beforeEvents)
          setTimelineStatus(`Added ${added} event${added === 1 ? '' : 's'}.`)
        } catch (err) {
          setTimelineStatus('Invalid JSON.', { kind: 'error' })
          console.error(err)
        }
      }
      input.click()
      return
    }

    if (action === 'random-events') {
      const report = addRandomEvents(10)
      if (report?.errors?.length) {
        setTimelineStatus(`Schema error: ${report.errors[0]}`, { kind: 'error' })
        return
      }
      const afterEvents = (getScenario()?.events ?? []).length
      const added = Math.max(0, afterEvents - beforeEvents)
      setTimelineStatus(`Added ${added} event${added === 1 ? '' : 's'}.`)
      return
    }

    if (action === 'random-envelope') {
      const report = addRandomEnvelope()
      if (report?.errors?.length) {
        setTimelineStatus(`Schema error: ${report.errors[0]}`, { kind: 'error' })
        return
      }
      const afterEvents = (getScenario()?.events ?? []).length
      const afterEnvelopes = (getScenario()?.envelopes ?? []).length
      const eventsAdded = Math.max(0, afterEvents - beforeEvents)
      const envelopesAdded = Math.max(0, afterEnvelopes - beforeEnvelopes)
      setTimelineStatus(`Added ${envelopesAdded} envelope, ${eventsAdded} event${eventsAdded === 1 ? '' : 's'}.`)
      return
    }

    if (action === 'reset') {
      resetScenarioToDefault()
      setTimelineStatus('Reset to default scenario.')
      return
    }
  } catch (err) {
    console.error(err)
    setTimelineStatus('Action failed.', { kind: 'error' })
  }
})

timelineBar.appendChild(timelineControls)
timelineBar.appendChild(timelineLabel)
timelineBar.appendChild(scrubberContainer)
timelineBar.appendChild(timelineActions)
timelineBar.appendChild(timelineEnd)

// Initial render + reactive updates
renderEnvelopeSpans()
renderEventMarkers()
syncTimelineUI(getTimeHour())
onScenarioChange(() => {
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

statusLeft.appendChild(connStatus)
statusLeft.appendChild(versionItem)

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

statusbar.appendChild(statusLeft)
statusbar.appendChild(statusRight)

// Mount components
app.appendChild(titlebar)
app.appendChild(timelineBar)
app.appendChild(workbench)
app.appendChild(statusbar)

// Initialize router (pages will render into #editor-area)
initRouter()
