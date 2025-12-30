// Scenario catalog and loading utilities

import defaultScenario from './scenarios/default.scenario.json'
import medicalScenario from './scenarios/medical-diagnosis.scenario.json'
import autonomousVehiclesScenario from './scenarios/autonomous-vehicles.scenario.json'
import financialLendingScenario from './scenarios/financial-lending.scenario.json'
import databasePerformanceScenario from './scenarios/database-performance.scenario.json'
import saasDashboardingScenario from './scenarios/saas-dashboarding.scenario.json'
import insuranceUnderwritingScenario from './scenarios/insurance-underwriting.scenario.json'
import baseballAnalyticsScenario from './scenarios/baseball-analytics.scenario.json'
import airforceAvionicsScenario from './scenarios/airforce-avionics-maintenance.scenario.json'
import verticalHydroponicsScenario from './scenarios/vertical-hydroponics-farm.scenario.json'
import testMinimalScenario from './scenarios/test-minimal.scenario.json'

export const SCENARIOS = {
  'default': {
    id: 'default',
    title: 'HDDL Replay — Four Fleets (Default)',
    description: 'Customer Service, HR, Sales, and Data Stewardship across 48 hours.',
    data: defaultScenario,
    tags: ['default', 'multi-domain', 'foundational']
  },
  'medical-diagnosis': {
    id: 'medical-diagnosis',
    title: 'Medical Diagnosis Support',
    description: 'Healthcare stewardship: diagnostic recommendations, medication safety, and emergency triage across 72 hours.',
    data: medicalScenario,
    tags: ['healthcare', 'safety-critical', 'regulated']
  },
  'autonomous-vehicles': {
    id: 'autonomous-vehicles',
    title: 'Autonomous Vehicle Operations',
    description: 'Fleet safety, navigation ethics, and passenger experience across 96 hours of AV operations.',
    data: autonomousVehiclesScenario,
    tags: ['transportation', 'safety-critical', 'ethics']
  },
  'financial-lending': {
    id: 'financial-lending',
    title: 'Consumer Lending Decisions',
    description: 'Credit underwriting, fraud detection, and regulatory compliance across 120 hours of lending operations.',
    data: financialLendingScenario,
    tags: ['financial', 'regulated', 'fairness']
  },
  'database-performance': {
    id: 'database-performance',
    title: 'Database Performance Monitoring',
    description: 'Observability platform: query optimization, anomaly detection, and SLA compliance across 72 hours.',
    data: databasePerformanceScenario,
    tags: ['infrastructure', 'performance', 'observability']
  },
  'saas-dashboarding': {
    id: 'saas-dashboarding',
    title: 'SaaS Dashboard Builder',
    description: 'Self-service analytics: chart recommendations, query generation, and access control across 96 hours.',
    data: saasDashboardingScenario,
    tags: ['product', 'data-access', 'ux']
  },
  'insurance-underwriting': {
    id: 'insurance-underwriting',
    title: 'Insurance Underwriting',
    description: 'Risk assessment, claims processing, and regulatory compliance across 120 hours of insurance operations.',
    data: insuranceUnderwritingScenario,
    tags: ['insurance', 'regulated', 'fairness']
  },
  'baseball-analytics': {
    id: 'baseball-analytics',
    title: 'Baseball Analytics — Performance & Strategy',
    description: 'Professional baseball team analytics: player performance, in-game strategy, injury risk management, and roster optimization across 168 hours.',
    data: baseballAnalyticsScenario,
    tags: ['sports', 'analytics', 'performance']
  },
  'airforce-avionics-maintenance': {
    id: 'airforce-avionics-maintenance',
    title: 'Air Force Avionics Maintenance Backshop',
    description: 'Aircraft avionics readiness: diagnostics, parts supply chain, safety compliance, maintenance scheduling, and training across 336 hours.',
    data: airforceAvionicsScenario,
    tags: ['defense', 'maintenance', 'safety-critical']
  },
  'vertical-hydroponics-farm': {
    id: 'vertical-hydroponics-farm',
    title: 'Vertical Hydroponics Farm — Sustainable Urban Agriculture',
    description: 'Crop growth optimization, environmental controls, water/nutrient management, harvest quality, energy efficiency, and food safety compliance across 240 hours.',
    data: verticalHydroponicsScenario,
    tags: ['agriculture', 'sustainability', 'food-safety']
  },
  'test-minimal': {
    id: 'test-minimal',
    title: 'Test Minimal — Fast Test Harness',
    description: 'Minimal scenario with 2 agents, 2 envelopes, and 5 events across 6 hours. Designed for fast, predictable test execution.',
    data: testMinimalScenario,
    tags: ['testing', 'minimal', 'fast']
  }
}

/**
 * Get list of all available scenarios
 */
export function getScenarioList() {
  return Object.values(SCENARIOS)
}

/**
 * Load a scenario by ID
 */
export function loadScenario(scenarioId) {
  const scenario = SCENARIOS[scenarioId]
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`)
  }
  // Return a fresh copy to allow safe mutation
  return JSON.parse(JSON.stringify(scenario.data))
}

/**
 * Get scenario metadata without loading full data
 */
export function getScenarioMetadata(scenarioId) {
  const scenario = SCENARIOS[scenarioId]
  if (!scenario) {
    return null
  }
  return {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    tags: scenario.tags
  }
}

/**
 * Get current scenario ID from localStorage or default
 */
export function getCurrentScenarioId() {
  return localStorage.getItem('hddl-current-scenario') || 'default'
}

/**
 * Save current scenario ID to localStorage
 */
export function setCurrentScenarioId(scenarioId) {
  localStorage.setItem('hddl-current-scenario', scenarioId)
}
