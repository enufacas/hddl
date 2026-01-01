// Facade module: preserves the existing sim-state API surface,
// while separating state management (store) from projections (selectors).

export {
  getScenario,
  getTimeHour,
  onScenarioChange,
  onTimeChange,
  setScenario,
  setTimeHour,
  getStewardFilter,
  setStewardFilter,
  onFilterChange,
  setScrubbingState,
  getIsScrubbing,
  isWithinScrubCatchup,
  triggerCatchupWindow,
} from './store'

export {
  formatSimTime,
  getActiveDSGSession,
  getBoundaryInteractionCounts,
  getDecisionMemoryEntries,
  getDSGMessages,
  getEnvelopeAtTime,
  getEnvelopeLineage,
  getEnvelopeHistory,
  getEnvelopeStatus,
  getEventsNearTime,
  getRevisionDiffAtTime,
  getStewardActivity,
} from './selectors'
