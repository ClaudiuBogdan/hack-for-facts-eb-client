import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ParliamentSpeechesSearchSchema,
  ParliamentStenogramReaderSearchSchema,
} from '@/schemas/parliament'

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

  it('legacy speech route sets cache headers and a share-worthy title', async () => {
    const { Route } = await import('./$speechKey')
    const route = Route as unknown as {
      headers: () => unknown
      head: () => { meta: Array<{ title?: string }> }
    }
    route.headers()
    expect(cacheHeadersMock).toHaveBeenCalled()
    expect(route.head().meta[0]?.title).toContain('Stenogramă')
  })

  it('sitting reader route validates `interventie` and caches publicly', async () => {
    const { Route } = await import('./sedinte.$sessionKey')
    const route = Route as unknown as {
      headers: () => unknown
      head: () => { meta: Array<{ title?: string }> }
      validateSearch: { parse: (input: unknown) => unknown }
    }
    expect(
      route.validateSearch.parse({ interventie: 'canon:sp:3', junk: 1 }),
    ).toEqual({ interventie: 'canon:sp:3' })
    route.headers()
    expect(cacheHeadersMock).toHaveBeenCalledWith({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    })
    expect(route.head().meta[0]?.title).toContain('Stenograma ședinței')
  })
})

describe('ParliamentSpeechesSearchSchema (lenient URL contract)', () => {
  it('accepts a full, valid search and RESTORES every facet', () => {
    expect(
      ParliamentSpeechesSearchSchema.parse({
        view: 'interventii',
        an: '2026',
        camera: 'senat',
        vorbitor: '2:2020:12',
        from: '2026-01-01',
        to: '2026-03-31',
        q: 'buget',
        disponibilitate: 'PARTIAL',
      }),
    ).toEqual({
      view: 'interventii',
      an: 2026,
      camera: 'senat',
      vorbitor: '2:2020:12',
      from: '2026-01-01',
      to: '2026-03-31',
      q: 'buget',
      disponibilitate: 'PARTIAL',
    })
  })

  it('restores a shared sittings URL with the availability facet', () => {
    expect(
      ParliamentSpeechesSearchSchema.parse({
        camera: 'comun',
        disponibilitate: 'SOURCE_ONLY',
        an: '2025',
      }),
    ).toEqual({ camera: 'comun', disponibilitate: 'SOURCE_ONLY', an: 2025 })
  })

  it('the DEFAULT view renders with no params at all', () => {
    expect(ParliamentSpeechesSearchSchema.parse({})).toEqual({})
  })

  it('junk never throws — bad facets fall to undefined', () => {
    const parsed = ParliamentSpeechesSearchSchema.parse({
      view: 'grafice', // not a view
      an: 'abc',
      camera: 'plen',
      vorbitor: '  ',
      from: '2026-99-99', // impossible calendar date
      to: 'yesterday',
      q: 'x'.repeat(500), // oversized
      disponibilitate: 'MAYBE',
    })
    expect(parsed).toEqual({})
  })

  it('an unknown availability value never leaks into a GraphQL enum', () => {
    expect(
      ParliamentSpeechesSearchSchema.parse({ disponibilitate: 'complete' })
        .disponibilitate,
    ).toBeUndefined()
  })
})

describe('ParliamentStenogramReaderSearchSchema', () => {
  it('accepts a canonical key', () => {
    expect(
      ParliamentStenogramReaderSearchSchema.parse({
        interventie: 'canon:cdep:9043:718',
      }),
    ).toEqual({ interventie: 'canon:cdep:9043:718' })
  })

  it('accepts a LEGACY key — old shared links keep landing correctly', () => {
    expect(
      ParliamentStenogramReaderSearchSchema.parse({
        interventie: 'cdep:cdep_stenogram:9043:9:718',
      }),
    ).toEqual({ interventie: 'cdep:cdep_stenogram:9043:9:718' })
  })

  it('drops a blank interventie rather than requesting an empty highlight', () => {
    expect(
      ParliamentStenogramReaderSearchSchema.parse({ interventie: '   ' }),
    ).toEqual({})
    expect(ParliamentStenogramReaderSearchSchema.parse({})).toEqual({})
  })

  it('junk never throws', () => {
    expect(
      ParliamentStenogramReaderSearchSchema.parse({ interventie: 42 }),
    ).toEqual({})
  })
})
