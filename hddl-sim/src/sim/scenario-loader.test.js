import { describe, it, expect, beforeEach, vi } from 'vitest'

function createLocalStorageMock(initial = {}) {
  let store = { ...initial }
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    },
    setItem(key, value) {
      store[key] = String(value)
    },
    removeItem(key) {
      delete store[key]
    },
    clear() {
      store = {}
    },
    _dump() {
      return { ...store }
    },
  }
}

describe('scenario-loader', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getScenarioList() includes bundled scenarios', async () => {
    globalThis.localStorage = createLocalStorageMock()
    vi.resetModules()

    const { getScenarioList } = await import('./scenario-loader')
    const list = getScenarioList()

    expect(Array.isArray(list)).toBe(true)
    expect(list.some(s => s.id === 'default')).toBe(true)
    expect(list.some(s => s.id === 'test-minimal')).toBe(true)
  })

  it('loadScenario() deep-clones bundled data', async () => {
    globalThis.localStorage = createLocalStorageMock()
    vi.resetModules()

    const { loadScenario } = await import('./scenario-loader')

    const first = loadScenario('test-minimal')
    first.durationHours = 999

    const second = loadScenario('test-minimal')
    expect(second.durationHours).not.toBe(999)
  })

  it('loadScenario() throws for unknown id', async () => {
    globalThis.localStorage = createLocalStorageMock()
    vi.resetModules()

    const { loadScenario } = await import('./scenario-loader')

    expect(() => loadScenario('does-not-exist')).toThrow(/Unknown scenario/i)
  })

  it('loadScenario() throws for non-bundled scenarios', async () => {
    globalThis.localStorage = createLocalStorageMock()
    vi.resetModules()

    const { loadScenario } = await import('./scenario-loader')

    expect(() => loadScenario('medical-diagnosis')).toThrow(/not bundled/i)
  })

  it('getScenarioMetadata() returns null for unknown, and subset for known', async () => {
    globalThis.localStorage = createLocalStorageMock()
    vi.resetModules()

    const { getScenarioMetadata } = await import('./scenario-loader')

    expect(getScenarioMetadata('nope')).toBe(null)

    const meta = getScenarioMetadata('default')
    expect(meta).toMatchObject({ id: 'default' })
    expect(meta).toHaveProperty('title')
    expect(meta).toHaveProperty('description')
    expect(meta).toHaveProperty('tags')
    expect(meta).not.toHaveProperty('data')
    expect(meta).not.toHaveProperty('loader')
  })

  it('getCurrentScenarioId()/setCurrentScenarioId() use localStorage', async () => {
    const storage = createLocalStorageMock()
    globalThis.localStorage = storage
    vi.resetModules()

    const { getCurrentScenarioId, setCurrentScenarioId } = await import('./scenario-loader')

    expect(getCurrentScenarioId()).toBe('default')

    setCurrentScenarioId('test-minimal')
    expect(getCurrentScenarioId()).toBe('test-minimal')
    expect(storage.getItem('hddl-current-scenario')).toBe('test-minimal')
  })

  it('registerGeneratedScenario() updates catalog, persists to storage, and sets current id', async () => {
    const storage = createLocalStorageMock()
    globalThis.localStorage = storage
    vi.resetModules()

    const { registerGeneratedScenario, getCurrentScenarioId, SCENARIOS } = await import('./scenario-loader')

    const scenarioData = {
      id: 'gen-001',
      title: 'Generated: One',
      durationHours: 1,
      fleets: [],
      envelopes: [],
      events: [],
    }

    const id = registerGeneratedScenario(scenarioData)
    expect(id).toBe('gen-001')
    expect(SCENARIOS['gen-001']).toBeTruthy()
    expect(SCENARIOS['gen-001'].generated).toBe(true)
    expect(getCurrentScenarioId()).toBe('gen-001')

    const stored = JSON.parse(storage.getItem('hddl-generated-scenarios'))
    expect(stored['gen-001']).toMatchObject({ id: 'gen-001', title: 'Generated: One' })
  })

  it('clearGeneratedScenarios() removes generated catalog entries and storage key', async () => {
    const storage = createLocalStorageMock()
    globalThis.localStorage = storage
    vi.resetModules()

    const { registerGeneratedScenario, clearGeneratedScenarios, SCENARIOS } = await import('./scenario-loader')

    registerGeneratedScenario({ id: 'gen-002', durationHours: 1, fleets: [], envelopes: [], events: [] })
    expect(SCENARIOS['gen-002']).toBeTruthy()

    clearGeneratedScenarios()

    expect(storage.getItem('hddl-generated-scenarios')).toBe(null)
    expect(SCENARIOS['gen-002']).toBeUndefined()
  })

  it('preloadScenarios() invokes loaders and warms cache (avoids re-loading on async load)', async () => {
    globalThis.localStorage = createLocalStorageMock()
    vi.resetModules()

    const { SCENARIOS, preloadScenarios, loadScenarioAsync } = await import('./scenario-loader')

    const loader = vi.fn(async () => ({
      default: { id: 'test-lazy-data', durationHours: 2, fleets: [], envelopes: [], events: [] },
    }))

    SCENARIOS['test-lazy'] = {
      id: 'test-lazy',
      title: 'Test Lazy',
      description: 'Lazy loader for tests',
      tags: ['testing'],
      loader,
    }

    await preloadScenarios()
    expect(loader).toHaveBeenCalledTimes(1)

    await loadScenarioAsync('test-lazy')
    expect(loader).toHaveBeenCalledTimes(1)

    delete SCENARIOS['test-lazy']
  })

  it('loads generated scenarios from storage during module init', async () => {
    const seeded = {
      'hddl-generated-scenarios': JSON.stringify({
        'gen-seeded': { id: 'gen-seeded', title: 'Seeded', durationHours: 1, fleets: [], envelopes: [], events: [] },
      }),
    }

    globalThis.localStorage = createLocalStorageMock(seeded)
    vi.resetModules()

    const { SCENARIOS, getScenarioMetadata } = await import('./scenario-loader')

    expect(SCENARIOS['gen-seeded']).toBeTruthy()
    expect(SCENARIOS['gen-seeded'].generated).toBe(true)

    const meta = getScenarioMetadata('gen-seeded')
    expect(meta).toMatchObject({ id: 'gen-seeded', title: 'Seeded' })
  })
})
