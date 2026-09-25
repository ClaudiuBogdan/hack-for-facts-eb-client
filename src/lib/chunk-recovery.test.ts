import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const replace = vi.fn()
const reload = vi.fn()

function preloadError(): Event {
  const event = new Event('vite:preloadError', { cancelable: true })
  Object.assign(event, {
    payload: new Error('Failed to fetch dynamically imported module: /assets/_cod.lazy-X.js'),
  })
  return event
}

describe('chunk recovery', () => {
  const realLocation = window.location
  let stop: () => void = () => undefined

  // A fresh module per test: it keeps whether a recovery is under way.
  async function registered() {
    vi.resetModules()
    const chunkRecovery = await import('./chunk-recovery')
    stop = chunkRecovery.registerChunkErrorHandler()
    return chunkRecovery
  }

  beforeEach(() => {
    vi.stubEnv('DEV', false)
    sessionStorage.clear()
    replace.mockClear()
    reload.mockClear()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'https://transparenta.eu/ins', replace, reload },
    })
  })
  afterEach(() => {
    stop()
    vi.unstubAllEnvs()
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
  })

  it('reloads once when a chunk fails to load', async () => {
    await registered()
    window.dispatchEvent(preloadError())
    expect(replace).toHaveBeenCalledTimes(1)
  })

  it('leaves the page alone when the failed chunk was a background load, and says it failed', async () => {
    const { quietChunkLoad } = await registered()
    let fail: (error: Error) => void = () => undefined
    const load = quietChunkLoad(
      () =>
        new Promise<void>((_, reject) => {
          fail = reject
        }),
    )
    window.dispatchEvent(preloadError())
    fail(new Error('Failed to fetch dynamically imported module'))
    await expect(load).resolves.toBe(false)
    expect(replace).not.toHaveBeenCalled()

    // Once it has settled, a failure is the reader's again.
    window.dispatchEvent(preloadError())
    expect(replace).toHaveBeenCalledTimes(1)
  })

  it('counts a chunk error during a load that went on to resolve — a stylesheet Vite skipped', async () => {
    const { quietChunkLoad } = await registered()
    const load = quietChunkLoad(async () => {
      window.dispatchEvent(preloadError())
    })
    await expect(load).resolves.toBe(false)
    expect(replace).not.toHaveBeenCalled()
  })

  it('reloads for code the document cannot load again, once, and the router’s error then adds nothing', async () => {
    const { reloadForFreshCode } = await registered()
    expect(reloadForFreshCode()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    window.dispatchEvent(preloadError())
    expect(reloadForFreshCode()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(replace).not.toHaveBeenCalled()
  })

  it('does not reload offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    try {
      const { reloadForFreshCode } = await registered()
      expect(reloadForFreshCode()).toBe(false)
      expect(reload).not.toHaveBeenCalled()
    } finally {
      Reflect.deleteProperty(navigator, 'onLine')
    }
  })

  it('imports a section’s chunk quietly: its module when it loads, its own error and no reload when it fails', async () => {
    const { quietImport } = await registered()
    await expect(quietImport(() => Promise.resolve({ value: 1 }))).resolves.toEqual({ value: 1 })
    const failure = new Error('Failed to fetch dynamically imported module: /assets/uat-map-band-X.js')
    const load = quietImport(() => {
      window.dispatchEvent(preloadError())
      return Promise.reject(failure)
    })
    await expect(load).rejects.toBe(failure)
    expect(replace).not.toHaveBeenCalled()
  })

  it('reports a clean load as clean', async () => {
    const { quietChunkLoad } = await registered()
    await expect(quietChunkLoad(() => Promise.resolve())).resolves.toBe(true)
  })
})
