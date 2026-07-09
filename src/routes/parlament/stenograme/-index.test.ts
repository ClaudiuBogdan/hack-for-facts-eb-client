import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ParliamentSpeechesSearchSchema } from '@/schemas/parliament'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const createFileRouteMock = vi.fn(() => routeStub)
const cacheHeadersMock = vi.fn((opts: Record<string, unknown>) => ({
  'cache-control': 'public',
  ...opts,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: createFileRouteMock,
}))
vi.mock('@/lib/http-cache', () => ({
  createPublicPageCacheHeaders: cacheHeadersMock,
}))

describe('/parlament/stenograme routes', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    createFileRouteMock.mockClear()
    cacheHeadersMock.mockClear()
  })

  it('list route sets public page cache headers and the search schema', async () => {
    const { Route } = await import('./index')
    const route = Route as unknown as {
      headers: () => unknown
      validateSearch: { parse: (input: unknown) => unknown }
    }
    // Identity varies across vi.resetModules() — assert the lenient behavior.
    expect(route.validateSearch.parse({ camera: 'junk', an: '2026' })).toEqual({
      an: 2026,
    })
    route.headers()
    expect(cacheHeadersMock).toHaveBeenCalledWith({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    })
  })

  it('detail route sets cache headers and a share-worthy title', async () => {
    const { Route } = await import('./$speechKey')
    const route = Route as unknown as {
      headers: () => unknown
      head: () => { meta: Array<{ title?: string }> }
    }
    route.headers()
    expect(cacheHeadersMock).toHaveBeenCalled()
    expect(route.head().meta[0]?.title).toContain('Stenogramă')
  })
})

describe('ParliamentSpeechesSearchSchema (lenient URL contract)', () => {
  it('accepts a full, valid search', () => {
    expect(
      ParliamentSpeechesSearchSchema.parse({
        an: '2026',
        camera: 'senat',
        vorbitor: '2:2020:12',
        from: '2026-01-01',
        to: '2026-03-31',
        q: 'buget',
      }),
    ).toEqual({
      an: 2026,
      camera: 'senat',
      vorbitor: '2:2020:12',
      from: '2026-01-01',
      to: '2026-03-31',
      q: 'buget',
    })
  })

  it('junk never throws — bad facets fall to undefined', () => {
    const parsed = ParliamentSpeechesSearchSchema.parse({
      an: 'abc',
      camera: 'plen',
      vorbitor: '  ',
      from: '2026-99-99', // impossible calendar date
      to: 'yesterday',
      q: 'x'.repeat(500), // oversized
    })
    expect(parsed).toEqual({})
  })
})
