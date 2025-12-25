import { createDefaultScenario } from './scenario-default'
import { normalizeScenario } from './scenario-schema'

const listeners = {
  time: new Set(),
  scenario: new Set(),
}

const state = {
  scenario: normalizeScenario(createDefaultScenario()).scenario,
  timeHour: 25,
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
