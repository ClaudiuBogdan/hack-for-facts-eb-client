import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BLANC, FUNKY } from '@/features/ngos/organization/test/fixtures'

const api = vi.hoisted(() => ({ fetchNgoRegistryProfile: vi.fn() }))
vi.mock('@/features/ngos/organization/api', () => api)
vi.mock('@/features/ngos/organization/head', () => ({ buildNgoProfileHead: vi.fn(() => ({ meta: [{ title: 'profile' }] })) }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ ...options, options }),
  notFound: () => ({ notFound: true }),
  redirect: (options: unknown) => ({ redirect: options }),
}))

type Loader = (context: {
  readonly params: { readonly number: string }
  readonly deps: { readonly search: Record<string, unknown> }
  readonly abortController: AbortController
}) => Promise<unknown>
type Head = (context: { readonly loaderData: unknown; readonly match: { readonly context: { readonly locale: string } } }) => unknown
type RouteModule = { readonly Route: { readonly options: { readonly loader: Loader; readonly head: Head } } }

const route = async () => ((await import('./ngos.registry.$number')) as unknown as RouteModule).Route.options
const load = async (number: string, search: Record<string, unknown> = {}) =>
  (await route()).loader({ params: { number }, deps: { search }, abortController: new AbortController() })
const settled = (promise: Promise<unknown>) => promise.then((value) => ({ value }), (error: unknown) => ({ error }))

describe('the registry-number profile route’s loader', () => {
  beforeEach(() => api.fetchNgoRegistryProfile.mockReset())

  it('reads the registry’s literal number from its address and hands over a profile without a CUI', async () => {
    api.fetchNgoRegistryProfile.mockResolvedValueOnce({ status: 'resolved', organization: BLANC })
    expect(await load('3117-A-2026')).toEqual({ registryNumber: '3117/A/2026', read: { status: 'resolved', organization: BLANC } })
    expect(api.fetchNgoRegistryProfile).toHaveBeenLastCalledWith('3117/A/2026', expect.anything())
  })

  it('sends an organisation with an admitted CUI to its one address, in one 301, the search kept', async () => {
    api.fetchNgoRegistryProfile.mockResolvedValueOnce({ status: 'resolved', organization: FUNKY })
    expect(await settled(load('1471-A-2012', { lang: 'en' }))).toEqual({
      error: { redirect: { to: '/ngos/$cui', params: { cui: '30339344' }, search: { lang: 'en' }, replace: true, statusCode: 301 } },
    })
  })

  it('answers another writing of the number with one 301 to the registry’s own', async () => {
    api.fetchNgoRegistryProfile.mockResolvedValueOnce({ status: 'resolved', organization: BLANC })
    // The router hands `3117%2FA%2F2026` over decoded.
    expect(await settled(load('3117/A/2026', { lang: 'en' }))).toEqual({
      error: { redirect: { to: '/ngos/registry/$number', params: { number: '3117-A-2026' }, search: { lang: 'en' }, replace: true, statusCode: 301 } },
    })
    expect(api.fetchNgoRegistryProfile).toHaveBeenLastCalledWith('3117/A/2026', expect.anything())
  })

  it('hands over every candidate of a number several organisations share, choosing none', async () => {
    const candidates = [BLANC, { ...BLANC, name: 'ALTA', registryRecords: [] }]
    api.fetchNgoRegistryProfile.mockResolvedValueOnce({ status: 'ambiguous', candidates })
    expect(await load('3117-A-2026')).toEqual({ registryNumber: '3117/A/2026', read: { status: 'ambiguous', candidates } })
  })

  it('is not found for a number the export does not hold, or an address that names none', async () => {
    api.fetchNgoRegistryProfile.mockResolvedValueOnce(null)
    expect(await settled(load('9-A-1900'))).toEqual({ error: { notFound: true } })
    expect(await settled(load('12~x'))).toEqual({ error: { notFound: true } })
    expect(api.fetchNgoRegistryProfile).toHaveBeenCalledTimes(1)
  })

  it('lets a failure through to the error page', async () => {
    api.fetchNgoRegistryProfile.mockRejectedValueOnce(new Error('503'))
    expect(await settled(load('1-A-122'))).toMatchObject({ error: { message: '503' } })
  })
})

describe('the registry-number profile route’s head', () => {
  it('is the profile’s head for one organisation, and keeps a choice between several out of the index', async () => {
    const { head } = await route()
    const context = { locale: 'ro' }
    expect(head({ loaderData: { registryNumber: '3117/A/2026', read: { status: 'resolved', organization: BLANC } }, match: { context } })).toEqual({
      meta: [{ title: 'profile' }],
    })
    expect(head({ loaderData: { registryNumber: '3117/A/2026', read: { status: 'ambiguous', candidates: [] } }, match: { context } })).toEqual({
      meta: [{ title: '3117/A/2026 — Transparenta.eu' }, { name: 'robots', content: 'noindex,follow' }],
    })
  })
})
