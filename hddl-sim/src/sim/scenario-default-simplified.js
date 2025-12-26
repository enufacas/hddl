import defaultScenario from './scenarios/default.scenario.json'

export function createDefaultScenario() {
  // Return a fresh copy so callers can safely mutate the scenario object.
  // (This keeps "data pack" scenarios compatible with existing in-memory mutation flows.)
  return JSON.parse(JSON.stringify(defaultScenario))
}
