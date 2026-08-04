import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundError = new Error('not-found')
const notFoundMock = vi.fn(() => notFoundError)
const fetchPrivateCompanyProfileMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: notFoundMock,
}))

vi.mock('@/features/private-companies/api/private-company-api', () => ({
  fetchPrivateCompanyProfile: fetchPrivateCompanyProfileMock,
}))

const PROFILE = {
  cui: '2816464',
  legalName: 'DEDEMAN SRL',
} as const

type QueryOptionsArg = { readonly queryKey: readonly unknown[] }

type LoaderInput = {
  readonly context: { readonly queryClient: unknown }
  readonly params: { readonly cui: string }
}

async function importRoute() {
  const { Route } = await import('./companies.$cui')
  return Route as unknown as {
    loader: (input: LoaderInput) => Promise<{
      readonly profile?: unknown
      readonly cui: string
    }>
    head: (input: {
      readonly params: { readonly cui: string }
      readonly loaderData?: unknown
    }) => { readonly meta: ReadonlyArray<Record<string, unknown>> }
  }
}

function createQueryClient() {
  return {
    ensureQueryData: vi.fn(
      async (_options: QueryOptionsArg): Promise<unknown> => undefined,
    ),
    prefetchQuery: vi.fn(
      async (_options: QueryOptionsArg): Promise<void> => undefined,
    ),
  }
}

/**
 * Runs `body` with `globalThis.window` removed — the idiom `-entities.$cui`
 * already uses for this branch. The real `shouldBlockLoaderForSsr` runs:
 * stubbing it would leave its environment sniff untested and let an inverted
 * guard ship green.
 */
async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
  const realWindow = globalThis.window
  Reflect.deleteProperty(globalThis, 'window')
  try {
    return await body()
  } finally {
    Object.defineProperty(globalThis, 'window', {
      value: realWindow,
      configurable: true,
      writable: true,
    })
  }
}

describe('/companies/$cui loader', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    notFoundMock.mockClear()
    fetchPrivateCompanyProfileMock.mockReset()
  })

  it('rejects an unparseable CUI on either path, before touching the cache', async () => {
    const route = await importRoute()
    const queryClient = createQueryClient()

    await expect(
      route.loader({ context: { queryClient }, params: { cui: 'not-a-cui' } }),
    ).rejects.toBe(notFoundError)
    expect(queryClient.prefetchQuery).not.toHaveBeenCalled()
    expect(fetchPrivateCompanyProfileMock).not.toHaveBeenCalled()
  })

  it('awaits the profile while server-rendering, so crawlers get a named document', async () => {
    fetchPrivateCompanyProfileMock.mockResolvedValue(PROFILE)
    const route = await importRoute()
    const queryClient = createQueryClient()

    const data = await asServerRender(() =>
      route.loader({ context: { queryClient }, params: { cui: 'RO2816464' } }),
    )

    expect(data.profile).toEqual(PROFILE)
    // Normalised once, in the loader — the page and the cache both read this.
    expect(data.cui).toBe('2816464')
    expect(queryClient.prefetchQuery).not.toHaveBeenCalled()
  })

  it('throws notFound while server-rendering an unknown company', async () => {
    fetchPrivateCompanyProfileMock.mockResolvedValue(null)
    const route = await importRoute()
    const queryClient = createQueryClient()

    await expect(
      asServerRender(() =>
        route.loader({ context: { queryClient }, params: { cui: '2816464' } }),
      ),
    ).rejects.toBe(notFoundError)
  })

  it('never blocks a client-side navigation and never 404s there', async () => {
    // Even for a company the API will answer `null` for: on the client the
    // page's own query owns that verdict (`PrivateCompanyNotFound`), and a
    // loader `notFound()` would blank the previous page instead.
    fetchPrivateCompanyProfileMock.mockResolvedValue(null)
    const route = await importRoute()
    const queryClient = createQueryClient()
    // A prefetch that never settles: awaiting it is exactly the frozen click
    // this split removes.
    queryClient.prefetchQuery.mockImplementation(() => new Promise(() => {}))

    const data = await route.loader({
      context: { queryClient },
      params: { cui: 'RO2816464' },
    })

    expect(data).toEqual({ cui: '2816464' })
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('prefetches under the key the page query reads, so the click starts the request', async () => {
    fetchPrivateCompanyProfileMock.mockResolvedValue(PROFILE)
    const route = await importRoute()
    const queryClient = createQueryClient()
    const { privateCompanyProfileQueryOptions } = await import(
      '@/features/private-companies/hooks/use-private-company-profile'
    )

    await route.loader({
      context: { queryClient },
      params: { cui: 'RO2816464' },
    })

    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1)
    expect(queryClient.prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(
      privateCompanyProfileQueryOptions('2816464').queryKey,
    )
  })

  it('falls back to a CUI placeholder head when the client loader returned no profile', async () => {
    const route = await importRoute()

    // Not "Company not found" — the profile is merely still in flight, and the
    // page corrects the title once its query lands.
    expect(
      route.head({ params: { cui: '2816464' }, loaderData: { cui: '2816464' } }),
    ).toEqual({ meta: [{ title: 'CUI 2816464' }] })
  })
})
