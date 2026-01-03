import { describe, it, expect, vi, beforeEach } from 'vitest'

function getFreshInteractiveStore() {
  vi.resetModules()
  return import('./interactive-store')
}

describe('interactive-store', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('starts in replay mode and blocks dispatchAction()', async () => {
    const store = await getFreshInteractiveStore()

    expect(store.isInteractiveMode()).toBe(false)

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = store.dispatchAction({ type: 'emit_signal' })

    expect(result).toEqual({ ok: false, error: 'Not in interactive mode' })
    expect(warnSpy).toHaveBeenCalled()
  })

  it('setInteractiveMode(true) resets state and emits state change', async () => {
    const store = await getFreshInteractiveStore()

    const stateSpy = vi.fn()
    store.onStateChange(stateSpy)

    const enabled = store.setInteractiveMode(true)
    expect(enabled).toBe(true)

    expect(stateSpy).toHaveBeenCalled()

    const st = store.getInteractiveState()
    expect(st).toHaveProperty('hour', 0)
    expect(st).toHaveProperty('envelopes')
    expect(st).toHaveProperty('events')
    expect(st).toHaveProperty('pendingActions')
  })

  it('dispatchAction() validates action shape', async () => {
    const store = await getFreshInteractiveStore()
    store.setInteractiveMode(true)

    expect(store.dispatchAction(null)).toEqual({ ok: false, error: 'Invalid action: must have type' })
    expect(store.dispatchAction({})).toEqual({ ok: false, error: 'Invalid action: must have type' })
  })

  it('dispatchAction() logs entry and notifies listeners when interactive', async () => {
    const store = await getFreshInteractiveStore()

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const stateSpy = vi.fn()
    const actionSpy = vi.fn()
    store.onStateChange(stateSpy)
    store.onActionDispatched(actionSpy)

    store.setInteractiveMode(true)

    const result = store.dispatchAction({ type: 'Emit_Signal', payload: { x: 1 } })

    expect(result.ok).toBe(true)
    expect(result).toHaveProperty('warning')

    const log = store.getActionLog()
    expect(log.length).toBe(1)
    expect(log[0]).toMatchObject({ index: 0 })
    expect(log[0].action).toMatchObject({ type: 'Emit_Signal', payload: { x: 1 } })

    expect(actionSpy).toHaveBeenCalled()
    expect(stateSpy).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
  })

  it('setSeed() resets state and accepts numeric seed', async () => {
    const store = await getFreshInteractiveStore()

    const stateSpy = vi.fn()
    store.onStateChange(stateSpy)

    store.setSeed(123)

    expect(store.getSeed()).toBe(123)
    expect(stateSpy).toHaveBeenCalled()
  })

  it('listener errors are caught (state + action)', async () => {
    const store = await getFreshInteractiveStore()

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    store.onStateChange(() => {
      throw new Error('state listener error')
    })
    store.onActionDispatched(() => {
      throw new Error('action listener error')
    })

    store.setInteractiveMode(true)
    store.dispatchAction({ type: 'noop' })

    expect(errorSpy).toHaveBeenCalled()
  })
})
