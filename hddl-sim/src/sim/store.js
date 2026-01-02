import { loadScenario, loadScenarioAsync, getCurrentScenarioId, SCENARIOS } from './scenario-loader'
import { normalizeScenario } from './scenario-schema'

const listeners = {
  time: new Set(),
  scenario: new Set(),
  filter: new Set(),
}

// Initialize with bundled scenario synchronously
// If saved scenario is not bundled, fall back to default
const initialScenarioId = getCurrentScenarioId()
const scenarioInfo = SCENARIOS[initialScenarioId]
const fallbackId = scenarioInfo?.bundled ? initialScenarioId : 'default'
const initialScenario = loadScenario(fallbackId)

const state = {
  scenario: normalizeScenario(initialScenario).scenario,
  timeHour: 25,
  stewardFilter: 'all',
}

// If we fell back to default, load the desired scenario in the background
if (fallbackId !== initialScenarioId) {
  loadScenarioAsync(initialScenarioId).then(scenarioData => {
    setScenario(normalizeScenario(scenarioData).scenario)
  }).catch(err => {
    console.warn(`Failed to load saved scenario ${initialScenarioId}, using default:`, err.message)
    // Clear the invalid scenario ID from localStorage
    localStorage.removeItem('hddl-current-scenario')
  })
}

// Scrubbing optimization state
let isScrubbing = false
let lastScrubEndTime = 0
let pendingTimeUpdate = null
let lastThrottledTime = 0
const THROTTLE_MS = 16 // ~60fps
const SCRUB_CATCHUP_MS = 500 // Time window after scrub ends to skip animations

export function getScenario() {
  return state.scenario
}

export function setScenario(nextScenario) {
  const report = normalizeScenario(nextScenario)
  state.scenario = report.scenario

  for (const cb of listeners.scenario) cb(state.scenario)
  // Re-emit time so dependent UI can refresh with new duration
  for (const cb of listeners.time) cb(state.timeHour)

  if (report.errors.length) {
    console.error('Scenario schema errors:', report.errors)
  }
  if (report.warnings.length) {
    console.warn('Scenario schema warnings:', report.warnings)
  }

  return { ok: report.errors.length === 0, errors: report.errors, warnings: report.warnings }
}

export function getTimeHour() {
  return state.timeHour
}

export function setTimeHour(nextHour, options = {}) {
  const { throttle = false } = options
  const duration = state.scenario?.durationHours ?? 48
  const clamped = Math.max(0, Math.min(duration, nextHour))
  
  // During scrubbing, throttle updates to reduce render load
  if (throttle && isScrubbing) {
    const now = Date.now()
    pendingTimeUpdate = clamped
    
    if (now - lastThrottledTime < THROTTLE_MS) {
      return // Skip this update, will catch up on next throttle window
    }
    lastThrottledTime = now
  }
  
  if (clamped === state.timeHour) return
  state.timeHour = clamped
  for (const cb of listeners.time) cb(state.timeHour)
}

// Scrubbing state management for performance optimization
export function setScrubbingState(scrubbing) {
  const wasScrubbung = isScrubbing
  isScrubbing = scrubbing
  
  if (!scrubbing && wasScrubbung) {
    // Scrubbing ended - record time for catch-up window
    lastScrubEndTime = Date.now()
    
    // Flush any pending time update
    if (pendingTimeUpdate !== null && pendingTimeUpdate !== state.timeHour) {
      state.timeHour = pendingTimeUpdate
      for (const cb of listeners.time) cb(state.timeHour)
    }
    pendingTimeUpdate = null
  }
}

export function getIsScrubbing() {
  return isScrubbing
}

export function isWithinScrubCatchup() {
  return Date.now() - lastScrubEndTime < SCRUB_CATCHUP_MS
}

// Trigger catch-up window for click-to-jump (no prior scrubbing state)
export function triggerCatchupWindow() {
  lastScrubEndTime = Date.now()
}

export function onScenarioChange(cb) {
  listeners.scenario.add(cb)
  return () => listeners.scenario.delete(cb)
}

export function onTimeChange(cb) {
  listeners.time.add(cb)
  return () => listeners.time.delete(cb)
}

export function getStewardFilter() {
  return state.stewardFilter
}

export function setStewardFilter(filter) {
  if (state.stewardFilter === filter) return
  state.stewardFilter = filter
  for (const cb of listeners.filter) cb(state.stewardFilter)
}

export function onFilterChange(cb) {
  listeners.filter.add(cb)
  return () => listeners.filter.delete(cb)
}
