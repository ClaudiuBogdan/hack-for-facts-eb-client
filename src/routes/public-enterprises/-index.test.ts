import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ options }),
}))
vi.mock('@/lib/i18n', () => ({
  translatorFor: () => ({ _: (message: string | { readonly message?: string; readonly id: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) }),
}))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))

import { PublicEnterpriseHubPending } from '@/features/public-enterprises/components/hub/hub-pending'
import { PUBLIC_ENTERPRISE_HUB_SNAPSHOT } from '@/features/public-enterprises/lib/hub-snapshot'
import { Route } from './index'

type Options = {
  readonly validateSearch: (search: Record<string, unknown>) => unknown
  readonly pendingComponent: unknown
  readonly loader: () => Promise<{ readonly seo: { readonly members: number } }>
  readonly headers: () => Record<string, string>
  readonly head: (input: { readonly loaderData?: unknown; readonly match: { readonly context: { readonly locale: string } } }) => {
    readonly meta?: readonly Record<string, unknown>[]
    readonly links?: readonly Record<string, unknown>[]
  }
}

const options = (Route as unknown as { readonly options: Options }).options

describe('/public-enterprises route', () => {
  it('reads its choices from the address, an unknown one falling back to the default', () => {
    expect(options.validateSearch({ autoritati: 'judete', marime: 'nimic' })).toEqual({ autoritati: 'judete', judete: undefined, domenii: undefined, marime: undefined })
  })

  it('draws the page’s head while its chunk loads', () => {
    expect(options.pendingComponent).toBe(PublicEnterpriseHubPending)
  })

  it('hands the head the snapshot’s figures, and reads no API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const data = await options.loader()
    expect(data.seo.members).toBe(PUBLIC_ENTERPRISE_HUB_SNAPSHOT.members.current)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('caches publicly, the shared cache keyed on the language and theme cookies', () => {
    // The dev server sends no-store; this is the production policy.
    vi.stubEnv('DEV', false)
    const headers = options.headers()
    vi.unstubAllEnvs()
    const cacheControl = headers['Cache-Control'] ?? headers['cache-control'] ?? ''
    expect(cacheControl).toContain('public')
    expect(cacheControl).toContain('s-maxage=3600')
    expect(headers.Vary ?? headers.vary).toContain('Cookie')
  })

  it('titles the page and makes it canonical at its own address', async () => {
    const loaderData = await options.loader()
    const head = options.head({ loaderData, match: { context: { locale: 'ro' } } })
    expect(head.meta?.[0]).toEqual({ title: 'Întreprinderile publice din România — Transparenta.eu' })
    expect(head.links?.[0]).toEqual({ rel: 'canonical', href: 'https://transparenta.eu/public-enterprises' })
    expect(options.head({ match: { context: { locale: 'ro' } } })).toEqual({})
  })
})
