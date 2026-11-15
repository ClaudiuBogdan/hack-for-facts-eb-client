import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { pnrrOverviewSchema, type PnrrLiveRelease } from '@/schemas/pnrr-live'
import {
  buildPnrrShareImageResponseHeaders,
  buildPnrrShareImageViewModel,
  handlePnrrShareImageRequest,
  readPnrrShareImageFacts,
  type PnrrShareImageFacts,
} from './pnrr-share-image'

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: vi.fn(),
}))

// The share card must never reach the frozen file set or its proxy.
vi.mock('./pnrr-data-proxy', () => {
  throw new Error('The PNRR share image must not load the legacy data proxy')
})
vi.mock('@/features/pnrr/seo/pnrr-seo-snapshot', () => {
  throw new Error('The PNRR share image must not build a raw-file snapshot')
})

const RELEASE_ID = 'pnrr-release-v1:mipe-20261015T000000Z'

function makeRelease(
  releaseId = RELEASE_ID,
  state: PnrrLiveRelease['state'] = 'degraded',
): PnrrLiveRelease {
  return {
    releaseId,
    releaseKind: 'mipe_scoped',
    state,
    sourceSnapshotAt: '2026-10-15T00:00:00Z',
    completedAt: '2026-11-14T11:00:00Z',
    limitation: 'ORDS payment facts are withheld in this release.',
    lanes: [
      { lane: 'mipe_projects', state: 'served', asOf: '2026-10-15T00:00:00Z', suspended: false, reasonCodes: [] },
      { lane: 'mipe_indicators', state: 'served', asOf: '2026-10-01T00:00:00Z', suspended: false, reasonCodes: [] },
      {
        lane: 'ords_payments_capture',
        state: 'abstained',
        asOf: '2026-11-13 06:17:28+00',
        suspended: false,
        reasonCodes: ['payment_policy_pending'],
      },
    ],
  }
}

const money = (amount: string | null, currency: 'RON' | 'EUR') => ({
  factType: 'fixture',
  amount,
  currency,
  aggregationState: amount === null ? 'withheld' : 'additive',
  coveredCount: 0,
  totalCount: 0,
})

function makeOverview(releaseId = RELEASE_ID) {
  return pnrrOverviewSchema.parse({
    meta: { state: 'degraded', reasonCodes: [], caveats: [], provenance: [], coverage: [], release: makeRelease(releaseId) },
    program: {
      snapshotDate: '2026-10-15',
      projectCount: 21710,
      allocationEur: money('21410527592.99', 'EUR'),
      receivedEur: money('10100000000.00', 'EUR'),
      paidEur: money(null, 'EUR'),
    },
    beneficiaryPayments: {
      count: null,
      firstDate: null,
      lastDate: null,
      netRon: money(null, 'RON'),
      grossRon: money(null, 'RON'),
      reversalRon: money(null, 'RON'),
    },
    commitments: { count: null, additiveCount: null, unresolvedCount: null, additiveRon: money(null, 'RON') },
    delivery: {
      observedCount: 24891,
      completedCount: 3000,
      overHundredCount: 12,
      missingFinancialProgressCount: 40,
      missingPhysicalProgressCount: 41,
    },
  })
}

const makeFacts = (releaseId = RELEASE_ID): PnrrShareImageFacts => ({
  release: makeRelease(releaseId),
  overview: makeOverview(releaseId),
})

describe('buildPnrrShareImageViewModel', () => {
  it('draws the publisher-reported MIPE national indicators of the active release', () => {
    const viewModel = buildPnrrShareImageViewModel(makeFacts())

    expect(viewModel.title).toBe('PNRR Romania')
    expect(viewModel.subtitle).toBe('Indicatori nationali raportati de MIPE')
    expect(viewModel.updatedLabel).toBe(`Versiune ${RELEASE_ID}`)
    expect(viewModel.metrics).toEqual([
      { label: 'Alocare', value: '21,41 mld. €', color: expect.any(String) },
      { label: 'Incasat UE', value: '10,1 mld. €', color: expect.any(String) },
      { label: 'Platit', value: '—', color: expect.any(String) },
      { label: 'Proiecte', value: '21,7 mii', color: expect.any(String) },
    ])
  })

  it('keeps the MIPE snapshot and the ORDS capture dates apart, with payments withheld', () => {
    const viewModel = buildPnrrShareImageViewModel(makeFacts())

    expect(viewModel.footer.map(({ label, value }) => ({ label, value }))).toEqual([
      { label: 'Situatie proiecte MIPE', value: '15.10.2026' },
      { label: 'Captura plati ORDS', value: '13.11.2026 · plati indisponibile' },
    ])
  })

  it('draws a card without figures when no release could be read', () => {
    const viewModel = buildPnrrShareImageViewModel(null)

    expect(viewModel.subtitle).toBe('Date indisponibile momentan')
    expect(viewModel.metrics.every((metric) => metric.value === '—')).toBe(true)
    expect(viewModel.footer).toEqual([])
  })
})

function answerGraphql({
  release = () => ({ pnrrCurrentRelease: makeRelease() }),
  overview = () => ({ pnrrOverview: makeOverview() }),
}: {
  readonly release?: () => unknown
  readonly overview?: () => unknown
} = {}) {
  vi.mocked(graphqlQuery).mockImplementation((async (
    _query: string,
    variables?: Record<string, unknown>,
    options?: { readonly operationName?: string },
  ) => {
    switch (options?.operationName) {
      case 'PnrrRelease':
        return release()
      case 'PnrrCapabilities':
        return {
          pnrrCapabilities: [
            {
              id: 'payments',
              releaseId: (variables as { assertReleaseId: string }).assertReleaseId,
              state: 'abstained',
              reasonCodes: ['payment_policy_pending'],
              limitation: null,
            },
          ],
        }
      case 'PnrrOverview':
        return overview()
      default:
        throw new Error(`Unexpected PNRR read ${options?.operationName}`)
    }
  }) as typeof graphqlQuery)
}

const operations = () =>
  vi.mocked(graphqlQuery).mock.calls.map(([, , options]) => options?.operationName)

describe('readPnrrShareImageFacts', () => {
  const fetchSpy = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads only the active release and its overview: no project page, no raw file', async () => {
    answerGraphql()

    const facts = await readPnrrShareImageFacts()

    expect(facts?.release.releaseId).toBe(RELEASE_ID)
    expect(facts?.overview.program.projectCount).toBe(21710)
    expect(operations()).toEqual(['PnrrRelease', 'PnrrCapabilities', 'PnrrOverview'])
    expect(
      vi.mocked(graphqlQuery).mock.calls.find(([, , options]) => options?.operationName === 'PnrrOverview')?.[1],
    ).toEqual({ assertReleaseId: RELEASE_ID })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reads no facts under an abstained release', async () => {
    answerGraphql({ release: () => ({ pnrrCurrentRelease: makeRelease(RELEASE_ID, 'abstained') }) })

    expect(await readPnrrShareImageFacts()).toBeNull()
    expect(operations()).not.toContain('PnrrOverview')
  })

  it('refuses an overview from a divergent snapshot', async () => {
    answerGraphql({ overview: () => ({ pnrrOverview: makeOverview('pnrr-release-v1:other') }) })

    expect(await readPnrrShareImageFacts()).toBeNull()
  })

  it('gives up at its deadline instead of holding the request open', async () => {
    vi.mocked(graphqlQuery).mockImplementation(((
      _query: string,
      _variables?: Record<string, unknown>,
      options?: { readonly signal?: AbortSignal },
    ) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(options.signal?.reason))
      })) as typeof graphqlQuery)

    expect(await readPnrrShareImageFacts(10)).toBeNull()
  })
})

describe('handlePnrrShareImageRequest', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47])

  it('reuses the rendering for the active release', async () => {
    const render = vi.fn().mockResolvedValue(png)
    const facts = makeFacts('pnrr-release-v1:render-once')
    const readFacts = vi.fn().mockResolvedValue(facts)

    const first = await handlePnrrShareImageRequest(
      new Request(`https://transparenta.eu/pnrr/share-image.png?release=${encodeURIComponent(facts.release.releaseId)}`),
      { render, readFacts },
    )
    const second = await handlePnrrShareImageRequest(
      new Request('https://transparenta.eu/pnrr/share-image.png?components=%5B%22C7%22%5D'),
      { render, readFacts },
    )

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(first.headers.get('cache-control')).toContain('max-age=3600')
    expect(render).toHaveBeenCalledTimes(1)
    expect(render.mock.calls[0]?.[0]).toMatchObject({
      subtitle: 'Indicatori nationali raportati de MIPE',
    })
  })

  it('does not put the new release under an older share URL', async () => {
    const render = vi.fn().mockResolvedValue(png)
    const facts = makeFacts('pnrr-release-v1:current')
    const response = await handlePnrrShareImageRequest(
      new Request('https://transparenta.eu/pnrr/share-image.png?release=older'),
      { render, readFacts: async () => facts },
    )

    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(render.mock.calls[0]?.[0]).toEqual(buildPnrrShareImageViewModel(null))
  })

  it('serves an uncached card without figures when no release could be read', async () => {
    const render = vi.fn().mockResolvedValue(png)

    const response = await handlePnrrShareImageRequest(
      new Request('https://transparenta.eu/pnrr/share-image.png'),
      { render, readFacts: async () => null },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(render.mock.calls[0]?.[0]).toMatchObject({ subtitle: 'Date indisponibile momentan' })
  })

  it('answers 503, uncached, when rendering fails', async () => {
    const response = await handlePnrrShareImageRequest(
      new Request('https://transparenta.eu/pnrr/share-image.png'),
      {
        render: vi.fn().mockRejectedValue(new Error('no fonts')),
        readFacts: async () => makeFacts('pnrr-release-v1:render-fails'),
      },
    )

    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})

describe('buildPnrrShareImageResponseHeaders', () => {
  it('builds cacheable and fallback response headers', () => {
    expect(buildPnrrShareImageResponseHeaders({ cacheable: true })).toMatchObject({
      'content-type': 'image/png',
      'cdn-cache-control': expect.stringContaining('max-age=3600'),
    })
    expect(buildPnrrShareImageResponseHeaders({ cacheable: false })).toEqual({
      'content-type': 'image/png',
      'cache-control': 'no-store',
    })
  })
})
