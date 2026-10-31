import path from 'node:path'
import type { setupI18n as SetupI18n } from '@lingui/core'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { installRequestScopedI18n, runWithRequestI18n } from './i18n-request-scope'

// The test build aliases `@lingui/core` to a stand-in; the scope is about the real instance's state.
const linguiPath = path.join(process.cwd(), 'node_modules/@lingui/core/dist/index.mjs')
const { setupI18n } = (await import(/* @vite-ignore */ linguiPath)) as { setupI18n: typeof SetupI18n }

const instance = setupI18n()
const sharedRomanian = { greeting: 'Bună' }

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('request-scoped Lingui state', () => {
  beforeAll(() => {
    installRequestScopedI18n(instance)
    instance.load('ro', sharedRomanian)
    instance.activate('ro')
  })

  it('keeps each request on its own language and messages across awaits', async () => {
    let releaseFirst = () => {}
    const firstMayResume = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const first = runWithRequestI18n(async () => {
      instance.loadAndActivate({ locale: 'en', messages: { greeting: 'Hello' } })
      await firstMayResume
      await delay(5)
      return [instance.locale, instance._('greeting'), instance.t('greeting')]
    })
    const second = runWithRequestI18n(async () => {
      instance.loadAndActivate({ locale: 'ro', messages: { greeting: 'Salut' } })
      releaseFirst()
      await delay(1)
      return [instance.locale, instance._('greeting')]
    })

    expect(await first).toEqual(['en', 'Hello', 'Hello'])
    expect(await second).toEqual(['ro', 'Salut'])
  })

  it('starts a request from the shared language and leaves the shared state as it was', async () => {
    const seen = await runWithRequestI18n(async () => {
      const atStart = [instance.locale, instance._('greeting')]
      instance.loadAndActivate({ locale: 'ro', messages: { greeting: 'Salut' } })
      await delay(1)
      return { atStart, after: instance._('greeting') }
    })

    expect(seen).toEqual({ atStart: ['ro', 'Bună'], after: 'Salut' })
    expect(instance.locale).toBe('ro')
    expect(instance._('greeting')).toBe('Bună')
    expect(sharedRomanian).toEqual({ greeting: 'Bună' })
  })

  it('refuses to run before it is installed, and when Lingui no longer has its state fields', async () => {
    vi.resetModules()
    const fresh = await import('./i18n-request-scope')
    expect(() => fresh.runWithRequestI18n(() => null)).toThrow(/before installRequestScopedI18n/)
    expect(() => fresh.installRequestScopedI18n({} as ReturnType<typeof SetupI18n>)).toThrow(/no own "_locale" field/)
  })
})
