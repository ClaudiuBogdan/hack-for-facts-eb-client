import { i18n } from '@lingui/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { browserLocaleFor, dynamicActivate } from './i18n'

// The test build's Lingui is a writable stand-in; the real one's locale is read-only.
const lingui = i18n as { locale: string }

describe('dynamicActivate', () => {
  const initialLocale = i18n.locale

  beforeEach(() => {
    // The test build's Lingui is a stand-in whose `activate` does nothing: make it switch.
    vi.spyOn(i18n, 'activate').mockImplementation((locale: string) => {
      lingui.locale = locale
    })
    vi.spyOn(i18n, 'load')
  })
  afterEach(() => {
    vi.restoreAllMocks()
    lingui.locale = initialLocale
  })

  it('activates a language, and again only when the language or its catalogs change', async () => {
    lingui.locale = 'ro'
    await dynamicActivate('en', { pathname: '/ins' })
    expect(i18n.activate).toHaveBeenCalledTimes(1)
    expect(i18n.locale).toBe('en')

    // Every navigation and every hover preload runs this: nothing to do, so nothing emitted.
    await dynamicActivate('en', { pathname: '/ins/seturi/POP107D' })
    expect(i18n.activate).toHaveBeenCalledTimes(1)
    expect(i18n.load).toHaveBeenCalledTimes(1)

    // PNRR pages bring a catalog of their own.
    await dynamicActivate('en', { pathname: '/pnrr' })
    expect(i18n.activate).toHaveBeenCalledTimes(2)

    await dynamicActivate('ro', { pathname: '/ins' })
    expect(i18n.locale).toBe('ro')
    expect(i18n.activate).toHaveBeenCalledTimes(3)
  })
})

describe('browserLocaleFor', () => {
  afterEach(() => {
    document.cookie = 'user-locale=; path=/; max-age=0'
    localStorage.removeItem('user-locale')
  })

  it('reads the address first, then the cookie, then storage, as the root route does', () => {
    localStorage.setItem('user-locale', 'en')
    expect(browserLocaleFor({ pathname: '/ins' })).toBe('en')
    document.cookie = 'user-locale=ro; path=/'
    expect(browserLocaleFor({ pathname: '/ins' })).toBe('ro')
    expect(browserLocaleFor({ pathname: '/en/learning' })).toBe('en')
    expect(browserLocaleFor({ pathname: '/ins', searchStr: '?lang=en' })).toBe('en')
  })

  it('falls back to Romanian with nothing saved', () => {
    expect(browserLocaleFor({ pathname: '/ins' })).toBe('ro')
  })
})

describe('registerServerCatalogs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('serves every catalog from the compiled-in modules, and loads the default language at once', async () => {
    vi.resetModules()
    const { i18n: lingui } = await import('@lingui/core')
    const load = vi.spyOn(lingui, 'load')
    const { dynamicActivate, registerServerCatalogs } = await import('./i18n')

    registerServerCatalogs({
      messages: {
        '../locales/ro/messages.po': { messages: { greeting: 'Salut' } },
        '../locales/en/messages.po': { messages: { greeting: 'Hello' } },
      },
      admin: {},
      pnrr: { '../locales/en/pnrr.po': { messages: { plan: 'Recovery plan' } } },
    })
    expect(load).toHaveBeenCalledWith('ro', { greeting: 'Salut' })

    // No loader runs: the language and the route's catalog come from the modules registered above.
    await dynamicActivate('en', { pathname: '/pnrr' })
    expect(load).toHaveBeenLastCalledWith('en', { greeting: 'Hello', plan: 'Recovery plan' })
  })
})
