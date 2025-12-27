// Interactive Scenario Store (Phase 2 - Experimental)
// Manages state for action-driven scenarios (not replay)

import { normalizeScenario } from './scenario-schema'
import { createDefaultScenario } from './scenario-default-simplified'

const listeners = {
  state: new Set(),
  action: new Set(),
}

const state = {
  // Mode tracking
  isInteractive: false,
  
  // Base scenario (immutable template)
  baseScenario: normalizeScenario(createDefaultScenario()).scenario,
  
  // Runtime state (evolves with actions)
  currentState: {
    hour: 0,
    envelopes: [],
    events: [],
    pendingActions: [],
  },
  
  // Action log (for deterministic replay)
  actionLog: [],
  
  // Seed for deterministic randomness
  seed: Date.now(),
}

// Initialize current state from base scenario
function initializeFromBase() {
  const base = state.baseScenario
  state.currentState = {
    hour: 0,
    envelopes: JSON.parse(JSON.stringify(base.envelopes || [])),
    events: [],
    pendingActions: [],
  }
  state.actionLog = []
}

initializeFromBase()

// Getters
export function isInteractiveMode() {
  return state.isInteractive
}

export function getInteractiveState() {
  return state.currentState
}

export function getActionLog() {
  return state.actionLog.slice()
}

export function getSeed() {
  return state.seed
}

// Setters
export function setInteractiveMode(enabled) {
  const prev = state.isInteractive
  state.isInteractive = Boolean(enabled)
  
  if (enabled && !prev) {
    // Switching to interactive: reset state
    initializeFromBase()
  }
  
  notifyStateChange()
  return state.isInteractive
}

export function setSeed(newSeed) {
  state.seed = typeof newSeed === 'number' ? newSeed : Date.now()
  initializeFromBase()
  notifyStateChange()
}

// Action dispatcher (Phase 2: semantics TBD)
export function dispatchAction(action) {
  if (!state.isInteractive) {
    console.warn('Cannot dispatch actions in replay mode')
    return { ok: false, error: 'Not in interactive mode' }
  }
  
  // Validate action shape
  if (!action || typeof action !== 'object' || !action.type) {
    return { ok: false, error: 'Invalid action: must have type' }
  }
  
  // Record action in log
  const entry = {
    index: state.actionLog.length,
    timestamp: Date.now(),
    hour: state.currentState.hour,
    action: { ...action },
  }
  
  state.actionLog.push(entry)
  
  // Apply action (Phase 2: implement reducer)
  const result = applyAction(action)
  
  notifyActionDispatched(entry)
  notifyStateChange()
  
  return result
}

// Action reducer (Phase 2 - Placeholder)
function applyAction(action) {
  const type = String(action.type || '').toLowerCase()
  
  // Phase 2: implement deterministic state transitions
  // For now, just emit a warning
  console.warn(`[Interactive] Action not yet implemented: ${type}`, action)
  
  // Example stub for future implementation:
  // switch (type) {
  //   case 'emit_signal':
  //     return emitSignal(action)
  //   case 'attempt_decision':
  //     return attemptDecision(action)
  //   case 'apply_revision':
  //     return applyRevision(action)
  //   default:
  //     return { ok: false, error: `Unknown action type: ${type}` }
  // }
  
  return { ok: true, warning: 'Action reducer not yet implemented (Phase 2)' }
}

// Reset to base scenario
export function resetInteractiveState() {
  initializeFromBase()
  notifyStateChange()
}

// Listeners
export function onStateChange(cb) {
  listeners.state.add(cb)
  return () => listeners.state.delete(cb)
}

export function onActionDispatched(cb) {
  listeners.action.add(cb)
  return () => listeners.action.delete(cb)
}

function notifyStateChange() {
  for (const cb of listeners.state) {
    try {
      cb(state.currentState)
    } catch (err) {
      console.error('Interactive state change listener error:', err)
    }
  }
}

function notifyActionDispatched(entry) {
  for (const cb of listeners.action) {
    try {
      cb(entry)
    } catch (err) {
      console.error('Action dispatch listener error:', err)
    }
  }
}
