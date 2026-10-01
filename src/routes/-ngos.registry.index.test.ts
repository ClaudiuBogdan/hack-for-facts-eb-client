import { describe, expect, it, vi } from 'vitest'

const ssr = vi.hoisted(() => ({ readRegistryForSsr: vi.fn() }))
vi.mock('@/features/ngos/registry/registry-ssr', () => ssr)
vi.mock('@/features/ngos/registry/registry-page', () => ({ RegistryUnavailable: () => null }))
const cache = vi.hoisted(() => ({
  createPublicPageCacheHeaders: vi.fn(() => ({ 'Cache-Control': 'public' })),
  createNoStoreHeaders: vi.fn(() => ({ 'Cache-Control': 'no-store' })),
}))
vi.mock('@/lib/http-cache', () => cache)
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => ({ ...options, options }) }))

type Options = {
  readonly validateSearch: (search: Record<string, unknown>) => unknown
  readonly loader: (context: { readonly deps: { readonly search: Record<string, string> }; readonly abortController: AbortController }) => Promise<unknown>
  readonly headers: (context: { readonly loaderData: { readonly complete: boolean } | undefined }) => Record<string, string>
}
const route = async () => ((await import('./ngos.registry.index')) as unknown as { readonly Route: { readonly options: Options } }).Route.options

describe('the registry route', () => {
  it('keeps its own keys, set, in the address', async () => {
    const { validateSearch } = await route()
    expect(validateSearch({ q: ' banca ', county: '', after: 'cursor', lang: 'en', status: 'Radiat' })).toEqual({ q: 'banca', status: 'Radiat' })
  })

  it('reads nothing on a client-side navigation: the page reads in the browser, the click never waits', async () => {
    const { loader } = await route()
    expect(await loader({ deps: { search: { status: 'Radiat' } }, abortController: new AbortController() })).toEqual({ seed: null, complete: true })
    expect(ssr.readRegistryForSsr).not.toHaveBeenCalled()
  })

  it('caches a complete render for everyone, and never one without its first page', async () => {
    const { headers } = await route()
    expect(headers({ loaderData: { complete: true } })).toEqual({ 'Cache-Control': 'public' })
    expect(cache.createPublicPageCacheHeaders).toHaveBeenCalledWith(expect.objectContaining({ sharedMaxAgeSeconds: 600 }))
    expect(headers({ loaderData: { complete: false } })).toEqual({ 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' })
  })
})
