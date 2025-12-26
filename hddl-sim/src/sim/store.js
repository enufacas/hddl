import { createDefaultScenario } from './scenario-default-simplified'
import { normalizeScenario } from './scenario-schema'

const listeners = {
  time: new Set(),
  scenario: new Set(),
  filter: new Set(),
}

const state = {
  scenario: normalizeScenario(createDefaultScenario()).scenario,
  timeHour: 25,
  stewardFilter: 'all',
}

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

export function setTimeHour(nextHour) {
  const duration = state.scenario?.durationHours ?? 48
  const clamped = Math.max(0, Math.min(duration, nextHour))
  if (clamped === state.timeHour) return
  state.timeHour = clamped
  for (const cb of listeners.time) cb(state.timeHour)
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
