// Scenario catalog and loading utilities

// Only bundle default and test-minimal for fast initial load
import defaultScenario from './scenarios/default.scenario.json'
import testMinimalScenario from './scenarios/test-minimal.scenario.json'

// Cache for dynamically loaded scenarios
const scenarioCache = new Map()

// Storage key for generated scenarios
const GENERATED_SCENARIOS_KEY = 'hddl-generated-scenarios'

/**
 * Load generated scenarios from localStorage on startup
 */
function loadGeneratedScenariosFromStorage() {
  try {
    const stored = localStorage.getItem(GENERATED_SCENARIOS_KEY)
    if (stored) {
      const generatedScenarios = JSON.parse(stored)
      Object.entries(generatedScenarios).forEach(([id, scenarioData]) => {
        if (!SCENARIOS[id]) {
          SCENARIOS[id] = {
            id: id,
            title: scenarioData.title || `Generated: ${id}`,
            description: 'AI-generated scenario',
            data: scenarioData,
            tags: ['generated', 'custom'],
            bundled: true,
            generated: true
          }
          scenarioCache.set(id, scenarioData)
        }
      })
    }
  } catch (err) {
    console.warn('Failed to load generated scenarios from storage:', err)
  }
}

// Scenario metadata (no data bundled initially)
export const SCENARIOS = {
  'default': {
    id: 'default',
    title: 'HDDL Replay — Four Fleets (Default)',
    description: 'Customer Service, HR, Sales, and Data Stewardship across 48 hours.',
    data: defaultScenario,
    tags: ['default', 'multi-domain', 'foundational'],
    bundled: true
  },
  'medical-diagnosis': {
    id: 'medical-diagnosis',
    title: 'Medical Diagnosis Support',
    description: 'Healthcare stewardship: diagnostic recommendations, medication safety, and emergency triage across 72 hours.',
    tags: ['healthcare', 'safety-critical', 'regulated'],
    loader: () => import('./scenarios/medical-diagnosis.scenario.json')
  },
  'autonomous-vehicles': {
    id: 'autonomous-vehicles',
    title: 'Autonomous Vehicle Operations',
    description: 'Fleet safety, navigation ethics, and passenger experience across 96 hours of AV operations.',
    tags: ['transportation', 'safety-critical', 'ethics'],
    loader: () => import('./scenarios/autonomous-vehicles.scenario.json')
  },
  'financial-lending': {
    id: 'financial-lending',
    title: 'Consumer Lending Decisions',
    description: 'Credit underwriting, fraud detection, and regulatory compliance across 120 hours of lending operations.',
    tags: ['financial', 'regulated', 'fairness'],
    loader: () => import('./scenarios/financial-lending.scenario.json')
  },
  'database-performance': {
    id: 'database-performance',
    title: 'Database Performance Monitoring',
    description: 'Observability platform: query optimization, anomaly detection, and SLA compliance across 72 hours.',
    tags: ['infrastructure', 'performance', 'observability'],
    loader: () => import('./scenarios/database-performance.scenario.json')
  },
  'saas-dashboarding': {
    id: 'saas-dashboarding',
    title: 'SaaS Dashboard Builder',
    description: 'Self-service analytics: chart recommendations, query generation, and access control across 96 hours.',
    tags: ['product', 'data-access', 'ux'],
    loader: () => import('./scenarios/saas-dashboarding.scenario.json')
  },
  'insurance-underwriting': {
    id: 'insurance-underwriting',
    title: 'Insurance Underwriting',
    description: 'Risk assessment, claims processing, and regulatory compliance across 120 hours of insurance operations.',
    tags: ['insurance', 'regulated', 'fairness'],
    loader: () => import('./scenarios/insurance-underwriting.scenario.json')
  },
  'baseball-analytics': {
    id: 'baseball-analytics',
    title: 'Baseball Analytics — Performance & Strategy',
    description: 'Professional baseball team analytics: player performance, in-game strategy, injury risk management, and roster optimization across 168 hours.',
    tags: ['sports', 'analytics', 'performance'],
    loader: () => import('./scenarios/baseball-analytics.scenario.json')
  },
  'airforce-avionics-maintenance': {
    id: 'airforce-avionics-maintenance',
    title: 'Air Force Avionics Maintenance Backshop',
    description: 'Aircraft avionics readiness: diagnostics, parts supply chain, safety compliance, maintenance scheduling, and training across 336 hours.',
    tags: ['defense', 'maintenance', 'safety-critical'],
    loader: () => import('./scenarios/airforce-avionics-maintenance.scenario.json')
  },
  'vertical-hydroponics-farm': {
    id: 'vertical-hydroponics-farm',
    title: 'Vertical Hydroponics Farm — Sustainable Urban Agriculture',
    description: 'Crop growth optimization, environmental controls, water/nutrient management, harvest quality, energy efficiency, and food safety compliance across 240 hours.',
    tags: ['agriculture', 'sustainability', 'food-safety'],
    loader: () => import('./scenarios/vertical-hydroponics-farm.scenario.json')
  },
  'test-minimal': {
    id: 'test-minimal',
    title: 'Test Minimal — Fast Test Harness',
    description: 'Minimal scenario with 2 agents, 2 envelopes, and 5 events across 6 hours. Designed for fast, predictable test execution.',
    data: testMinimalScenario,
    tags: ['testing', 'minimal', 'fast'],
    bundled: true
  }
}

// Load generated scenarios from storage after SCENARIOS is defined
loadGeneratedScenariosFromStorage()

/**
 * Get list of all available scenarios
 */
export function getScenarioList() {
  return Object.values(SCENARIOS)
}

/**
 * Load a scenario by ID synchronously (only works for bundled scenarios)
 * For lazy-loaded scenarios, use loadScenarioAsync()
 */
export function loadScenario(scenarioId) {
  const scenario = SCENARIOS[scenarioId]
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`)
  }
  
  // Only bundled scenarios can be loaded synchronously
  if (scenario.bundled && scenario.data) {
    return JSON.parse(JSON.stringify(scenario.data))
  }
  
  throw new Error(`Scenario ${scenarioId} is not bundled. Use loadScenarioAsync() instead.`)
}

/**
 * Load a scenario by ID (async for lazy-loaded scenarios)
 */
export async function loadScenarioAsync(scenarioId) {
  const scenario = SCENARIOS[scenarioId]
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`)
  }
  
  // If already bundled, return immediately
  if (scenario.bundled && scenario.data) {
    return JSON.parse(JSON.stringify(scenario.data))
  }
  
  // Check cache first
  if (scenarioCache.has(scenarioId)) {
    return JSON.parse(JSON.stringify(scenarioCache.get(scenarioId)))
  }
  
  // Lazy load and cache
  if (scenario.loader) {
    const module = await scenario.loader()
    const data = module.default
    scenarioCache.set(scenarioId, data)
    return JSON.parse(JSON.stringify(data))
  }
  
  throw new Error(`Scenario ${scenarioId} has no data or loader`)
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

/**
 * Register a generated scenario (from AI generation)
 */
export function registerGeneratedScenario(scenarioData) {
  const id = scenarioData.id
  const title = scenarioData.title || `Generated: ${id}`
  
  // Add to SCENARIOS catalog
  SCENARIOS[id] = {
    id: id,
    title: title,
    description: 'AI-generated scenario',
    data: scenarioData,
    tags: ['generated', 'custom'],
    bundled: true,
    generated: true
  }
  
  // Add to cache
  scenarioCache.set(id, scenarioData)
  
  // Persist to localStorage
  try {
    const stored = localStorage.getItem(GENERATED_SCENARIOS_KEY)
    const generatedScenarios = stored ? JSON.parse(stored) : {}
    generatedScenarios[id] = scenarioData
    localStorage.setItem(GENERATED_SCENARIOS_KEY, JSON.stringify(generatedScenarios))
  } catch (err) {
    console.warn('Failed to persist generated scenario:', err)
  }
  
  // Set as current scenario
  setCurrentScenarioId(id)
  
  return id
}

/**
 * Clear all generated scenarios from localStorage
 */
export function clearGeneratedScenarios() {
  try {
    localStorage.removeItem(GENERATED_SCENARIOS_KEY)
    // Remove from catalog
    Object.keys(SCENARIOS).forEach(id => {
      if (SCENARIOS[id].generated) {
        delete SCENARIOS[id]
        scenarioCache.delete(id)
      }
    })
    console.log('Cleared all generated scenarios')
  } catch (err) {
    console.warn('Failed to clear generated scenarios:', err)
  }
}

/**
 * Preload all scenarios in background for instant switching
 * Call this after initial page load
 */
export async function preloadScenarios() {
  const toPreload = Object.entries(SCENARIOS)
    .filter(([id, scenario]) => !scenario.bundled && scenario.loader)
  
  console.log(`📦 Preloading ${toPreload.length} scenarios in background...`)
  
  // Load all scenarios in parallel
  const loadPromises = toPreload.map(async ([id, scenario]) => {
    try {
      if (!scenarioCache.has(id)) {
        const module = await scenario.loader()
        scenarioCache.set(id, module.default)
      }
    } catch (err) {
      console.warn(`Failed to preload scenario ${id}:`, err)
    }
  })
  
  await Promise.all(loadPromises)
  console.log(`✅ All scenarios preloaded`)
}
