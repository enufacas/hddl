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

function makeMinimalScenario(overrides = {}) {
  return {
    id: overrides.id ?? 'test-scenario',
    title: overrides.title ?? 'Test Scenario',
    durationHours: overrides.durationHours ?? 10,
    fleets: overrides.fleets ?? [],
    envelopes: overrides.envelopes ?? [],
    events: overrides.events ?? [],
    ...overrides,
  }
}

async function importFreshStore({
  currentScenarioId = 'default',
  bundled = true,
  loadScenarioAsyncImpl,
} = {}) {
  vi.resetModules()

  const storage = createLocalStorageMock({
    'hddl-current-scenario': currentScenarioId,
  })
  globalThis.localStorage = storage

  const initialScenario = makeMinimalScenario({ id: bundled ? currentScenarioId : 'default', durationHours: 10 })

  const loadScenario = vi.fn(() => JSON.parse(JSON.stringify(initialScenario)))

  const SCENARIOS = {
    default: { id: 'default', bundled: true, data: makeMinimalScenario({ id: 'default', durationHours: 48 }) },
    [currentScenarioId]: bundled
      ? { id: currentScenarioId, bundled: true, data: makeMinimalScenario({ id: currentScenarioId, durationHours: 10 }) }
      : { id: currentScenarioId, bundled: false },
  }

  const loadScenarioAsync = vi.fn(loadScenarioAsyncImpl ?? (async () => makeMinimalScenario({ id: currentScenarioId, durationHours: 12 })))

  vi.doMock('./scenario-loader', () => ({
    loadScenario,
    loadScenarioAsync,
    getCurrentScenarioId: () => currentScenarioId,
    SCENARIOS,
  }))

  const store = await import('./store')
  return { store, storage, loadScenario, loadScenarioAsync }
}

describe('store', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('setTimeHour clamps to duration and emits only on change', async () => {
    const { store } = await importFreshStore({ currentScenarioId: 'default', bundled: true })

    const calls = []
    const off = store.onTimeChange(h => calls.push(h))

    store.setTimeHour(5)
    store.setTimeHour(5)
    store.setTimeHour(-1)
    store.setTimeHour(999)

    off()

    // initial scenario in this test is 10 hours long
    expect(calls).toEqual([5, 0, 10])
  })

  it('scrubbing throttle batches updates and flushes on scrub end', async () => {
    const { store } = await importFreshStore({ currentScenarioId: 'default', bundled: true })

    const timeSpy = vi.fn()
    store.onTimeChange(timeSpy)

    // Start scrubbing
    store.setScrubbingState(true)

    let now = 1000
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    store.setTimeHour(1, { throttle: true })
    store.setTimeHour(2, { throttle: true })
    store.setTimeHour(3, { throttle: true })

    // Within throttle window => likely only first emits
    expect(timeSpy.mock.calls.length).toBeGreaterThanOrEqual(1)

    // Advance time beyond throttle window and send another update
    now += 100
    store.setTimeHour(4, { throttle: true })

    // End scrubbing => flush pending update (if any)
    now += 1
    store.setScrubbingState(false)

    const lastEmitted = timeSpy.mock.calls.at(-1)?.[0]
    expect(lastEmitted).toBe(4)
  })

  it('catchup window helpers reflect recent scrubbing/click jump', async () => {
    const { store } = await importFreshStore({ currentScenarioId: 'default', bundled: true })

    let now = 10_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    store.triggerCatchupWindow()
    expect(store.isWithinScrubCatchup()).toBe(true)

    now += 10_000
    expect(store.isWithinScrubCatchup()).toBe(false)
  })

  it('steward filter emits changes', async () => {
    const { store } = await importFreshStore({ currentScenarioId: 'default', bundled: true })

    const filterSpy = vi.fn()
    store.onFilterChange(filterSpy)

    expect(store.getStewardFilter()).toBe('all')

    store.setStewardFilter('data')
    store.setStewardFilter('data')
    store.setStewardFilter('sales')

    expect(filterSpy.mock.calls.map(c => c[0])).toEqual(['data', 'sales'])
  })

  it('if saved scenario is not bundled, falls back to default and loads async in background', async () => {
    let resolveAsync
    const deferred = new Promise(resolve => {
      resolveAsync = resolve
    })

    const { store, loadScenario, loadScenarioAsync } = await importFreshStore({
      currentScenarioId: 'lazy-saved',
      bundled: false,
      loadScenarioAsyncImpl: () => deferred,
    })

    // fallback should have loaded default synchronously
    expect(loadScenario).toHaveBeenCalledTimes(1)
    expect(loadScenario.mock.calls[0][0]).toBe('default')

    // and it should attempt async load of saved scenario
    expect(loadScenarioAsync).toHaveBeenCalledTimes(1)
    expect(loadScenarioAsync.mock.calls[0][0]).toBe('lazy-saved')

    const scenarioSpy = vi.fn()
    store.onScenarioChange(scenarioSpy)

    resolveAsync(makeMinimalScenario({ id: 'lazy-saved', durationHours: 12 }))

    // allow microtasks to run
    await Promise.resolve()
    await Promise.resolve()

    expect(scenarioSpy).toHaveBeenCalled()
  })

  it('if async load of saved scenario fails, it clears invalid localStorage key', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    let rejectAsync
    const deferred = new Promise((_, reject) => {
      rejectAsync = reject
    })

    const { storage } = await importFreshStore({
      currentScenarioId: 'lazy-saved',
      bundled: false,
      loadScenarioAsyncImpl: () => deferred,
    })

    rejectAsync(new Error('boom'))

    // allow promise rejection handler to run
    await Promise.resolve()
    await Promise.resolve()

    expect(storage.getItem('hddl-current-scenario')).toBe(null)
    expect(warnSpy).toHaveBeenCalled()
  })
})
