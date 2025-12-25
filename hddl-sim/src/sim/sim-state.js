// Facade module: preserves the existing sim-state API surface,
// while separating state management (store) from projections (selectors).

export {
  getScenario,
  getTimeHour,
  onScenarioChange,
  onTimeChange,
  setScenario,
  setTimeHour,
} from './store'

export {
  formatSimTime,
  getActiveDSGSession,
  getDSGMessages,
  getEnvelopeAtTime,
  getEnvelopeHistory,
  getEnvelopeStatus,
  getEventsNearTime,
  getStewardActivity,
} from './selectors'
