import { i18n } from '@lingui/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dynamicActivate, registerServerCatalogs } from './i18n'

/**
 * A catalog chunk whose import the app's chunk-error handler recovered from
 * (it reloads the page and cancels the error) resolves to nothing. A module of
 * its own: what this test leaves cached must not meet the other i18n tests.
 */
describe('a catalog chunk that resolves to nothing', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fails the activation and is asked for again next time, never cached as an empty catalog', async () => {
    const load = vi.spyOn(i18n, 'load')
    let module: unknown = undefined
    // The catalogs as loaders, the way the browser has them.
    registerServerCatalogs({
      messages: { '../locales/en/messages.po': async () => module },
      admin: {},
      pnrr: {},
    })

    await expect(dynamicActivate('en', { pathname: '/ins' })).rejects.toThrow(/did not load/)
    expect(load).not.toHaveBeenCalled()

    module = { messages: { greeting: 'Hello' } }
    await dynamicActivate('en', { pathname: '/ins' })
    expect(load).toHaveBeenCalledWith('en', { greeting: 'Hello' })
  })
})
