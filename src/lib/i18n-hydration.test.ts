import { i18n } from '@lingui/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

const dynamicActivate = vi.hoisted(() => vi.fn())
const attemptChunkRecovery = vi.hoisted(() => vi.fn())
vi.mock('@/lib/i18n', () => ({ dynamicActivate }))
vi.mock('@/lib/chunk-recovery', () => ({ attemptChunkRecovery }))

const { activateLanguageForHydration } = await import('./i18n-hydration')

describe('activateLanguageForHydration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    dynamicActivate.mockReset()
    attemptChunkRecovery.mockReset()
  })

  it('hydrates once the page language is active', async () => {
    dynamicActivate.mockResolvedValue(undefined)
    await expect(activateLanguageForHydration('en', '/pnrr')).resolves.toBe(true)
    expect(dynamicActivate).toHaveBeenCalledWith('en', { pathname: '/pnrr' })
    expect(attemptChunkRecovery).not.toHaveBeenCalled()
  })

  it('never hydrates with an empty catalog when the catalog cannot load', async () => {
    const load = vi.spyOn(i18n, 'load')
    const activate = vi.spyOn(i18n, 'activate')
    const error = new TypeError('Failed to fetch dynamically imported module: /assets/messages-x.js')
    dynamicActivate.mockRejectedValue(error)

    await expect(activateLanguageForHydration('ro', '/companies')).resolves.toBe(false)
    // A fresh page may fetch it; failing that, the server's page stays as it is.
    expect(attemptChunkRecovery).toHaveBeenCalledWith(error)
    expect(load).not.toHaveBeenCalled()
    expect(activate).not.toHaveBeenCalled()
  })
})
