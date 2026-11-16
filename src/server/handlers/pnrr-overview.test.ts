import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PnrrSearchState } from '@/schemas/pnrr'
import type { PnrrLiveRelease } from '@/schemas/pnrr-live'
import {
  FIXTURE_RELEASE_ID,
  makeFixtureRelease,
  makeFixtureSnapshot,
  makeFixtureSnapshotEnvelope,
  NEXT_FIXTURE_RELEASE_ID,
} from '@/features/pnrr/lib/pnrr-api-snapshot.fixture'
import {
  buildPnrrOverviewRequestPath,
  PNRR_DASHBOARD_RELEASE_HEADER,
  type PnrrOverviewPart,
  type PnrrOverviewPartParams,
} from '@/features/pnrr/lib/pnrr-overview-request'
import {
  buildPnrrQueryResult,
  buildPnrrWorkerModelFromApiSnapshot,
  createPnrrFilteredProjectsCache,
} from '@/features/pnrr/workers/pnrr-query-model'
import type {
  PnrrServerOverview,
  PnrrWorkerProjectPage,
} from '@/features/pnrr/workers/pnrr-worker-types'
import {
  PNRR_DASHBOARD_SNAPSHOT_PATH,
  resetPnrrDashboardReleaseState,
} from './pnrr-dashboard-release'
import {
  handlePnrrOverviewRequest,
  readPnrrOverviewForSsr,
} from './pnrr-overview'

// The dashboard's read path must never reach the frozen S3 file set.
vi.mock('./pnrr-data-proxy', () => {
  throw new Error('the PNRR dashboard must not load the raw S3 data proxy')
})
vi.mock('@/features/pnrr/seo/pnrr-seo-loader', () => {
  throw new Error('the PNRR dashboard must not load the legacy SEO loader')
})

const snapshots = new Map([
  [FIXTURE_RELEASE_ID, makeFixtureSnapshotEnvelope(FIXTURE_RELEASE_ID)],
  [NEXT_FIXTURE_RELEASE_ID, makeFixtureSnapshotEnvelope(NEXT_FIXTURE_RELEASE_ID)],
])

let activeRelease: PnrrLiveRelease
let now: number
const readRelease = vi.fn(async () => activeRelease)
const fetchSnapshot = vi.fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input))
  const snapshot = snapshots.get(url.searchParams.get('assertReleaseId') ?? '')
  return snapshot
    ? new Response(JSON.stringify(snapshot), {
        headers: { 'content-type': 'application/json' },
      })
    : new Response('{}', { status: 404 })
})

function workerResult(search: Partial<PnrrSearchState>) {
  const model = buildPnrrWorkerModelFromApiSnapshot(
    makeFixtureSnapshot(FIXTURE_RELEASE_ID),
  )
  const result = buildPnrrQueryResult(
    model,
    { search },
    createPnrrFilteredProjectsCache(),
  )
  return JSON.parse(JSON.stringify(result)) as typeof result
}

async function request(
  search: Partial<PnrrSearchState>,
  part: PnrrOverviewPart = 'summary',
  options: {
    readonly releaseId?: string | null
    readonly params?: PnrrOverviewPartParams
  } = { releaseId: FIXTURE_RELEASE_ID },
): Promise<Response> {
  return handlePnrrOverviewRequest(
    new Request(
      `https://example.test${buildPnrrOverviewRequestPath(search, part, options)}`,
    ),
  )
}

beforeEach(() => {
  now = 1_000_000
  activeRelease = makeFixtureRelease(FIXTURE_RELEASE_ID)
  readRelease.mockClear()
  fetchSnapshot.mockClear()
  resetPnrrDashboardReleaseState({
    readRelease,
    fetchSnapshot: fetchSnapshot as unknown as typeof fetch,
    apiBaseUrl: () => 'https://example.test',
    now: () => now,
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('no other network read is allowed')
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the release-backed dashboard answers', () => {
  it.each([
    {},
    { counties: ['Cluj'] },
    { components: ['C12'], includeNational: false },
    { beneficiaryCui: '4267117' },
    { search: 'spital', fundingSources: ['loan'] },
  ] satisfies Partial<PnrrSearchState>[])(
    'serves the worker overview of the release for %j',
    async (search) => {
      const response = await request(search)
      const body = (await response.json()) as PnrrServerOverview
      const { mapPreview: _mapPreview, ...expectedOverview } =
        workerResult(search).overview

      expect(response.status).toBe(200)
      expect(response.headers.get(PNRR_DASHBOARD_RELEASE_HEADER)).toBe(
        FIXTURE_RELEASE_ID,
      )
      expect(response.headers.get('cache-control')).toContain('s-maxage=3600')
      expect(body.fileSetId).toBe(FIXTURE_RELEASE_ID)
      expect(body.overview).toEqual(expectedOverview)
      // Listed MIPE values rank beneficiaries; no ORDS payment is claimed.
      expect(body.overview.beneficiaryRankingSource).toBe('listed-project-value')
      expect(body.meta.paymentCapability).toBe('degraded')
      expect(body.meta.officialAllocatedTotalEur).toBe(21_410_527_592.99)
      expect(body.meta.officialPaidTotalEur).toBeNull()
    },
  )

  it('serves the explorer parts as the worker would', async () => {
    const search: Partial<PnrrSearchState> = { sortBy: 'title', sortOrder: 'asc' }
    const worker = workerResult(search)

    const projects = await request(search, 'projects')
    expect((await projects.json()) as PnrrWorkerProjectPage).toEqual(
      worker.projectPage,
    )
    expect(await (await request(search, 'beneficiaries')).json()).toEqual(
      worker.beneficiaryPage,
    )
    expect(await (await request(search, 'anomalies')).json()).toEqual(
      worker.anomalyModel,
    )
    expect(await (await request(search, 'facets')).json()).toEqual(
      worker.filterFacets,
    )
    expect(await (await request(search, 'map')).json()).toEqual({
      mapModel: worker.mapModel,
    })

    const detail = await request({}, 'project', {
      releaseId: FIXTURE_RELEASE_ID,
      params: { projectId: 'key:project-1' },
    })
    expect(await detail.json()).toMatchObject({
      project: { id: 'key:project-1', recordCount: 2 },
    })

    const beneficiary = await request({}, 'beneficiary', {
      releaseId: FIXTURE_RELEASE_ID,
      params: { detailCui: '4267117' },
    })
    expect(await beneficiary.json()).toMatchObject({
      beneficiary: { cui: '4267117', count: 1 },
    })
  })

  it('exports the filtered projects as CSV, named and sourced by the release', async () => {
    const response = await request({ counties: ['Cluj'] }, 'csv')
    const csv = await response.text()

    expect(response.headers.get('content-type')).toContain('text/csv')
    expect(response.headers.get('content-disposition')).toContain(
      'pnrr-projects-pnrr-release-v1_mipe-20261015T000000Z.csv',
    )
    expect(csv.split('\r\n')).toHaveLength(3)
    expect(csv).toContain(FIXTURE_RELEASE_ID)
    expect(csv).not.toContain('20260619')
  })

  it('reads one snapshot per release, from the API, however many requests arrive at once', async () => {
    await Promise.all([
      request({}),
      request({}, 'projects'),
      request({ counties: ['Cluj'] }, 'map'),
    ])
    await request({}, 'beneficiaries')

    expect(fetchSnapshot).toHaveBeenCalledTimes(1)
    const snapshotUrl = new URL(String(fetchSnapshot.mock.calls[0]![0]))
    expect(snapshotUrl.pathname).toBe(PNRR_DASHBOARD_SNAPSHOT_PATH)
    expect(snapshotUrl.searchParams.get('assertReleaseId')).toBe(
      FIXTURE_RELEASE_ID,
    )
    // Nothing else was fetched: no raw file, no S3 object.
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('follows a declared release switch and refuses the old release', async () => {
    await request({})
    activeRelease = makeFixtureRelease(NEXT_FIXTURE_RELEASE_ID)

    // A browser that already read the new release declares it: the server
    // re-reads the active release at once instead of waiting out its cache.
    const next = await request({}, 'summary', {
      releaseId: NEXT_FIXTURE_RELEASE_ID,
    })
    expect(next.status).toBe(200)
    expect(next.headers.get(PNRR_DASHBOARD_RELEASE_HEADER)).toBe(
      NEXT_FIXTURE_RELEASE_ID,
    )
    expect(((await next.json()) as PnrrServerOverview).fileSetId).toBe(
      NEXT_FIXTURE_RELEASE_ID,
    )

    // A page still on the old release is told to re-read it, not served it.
    const stale = await request({}, 'projects', {
      releaseId: FIXTURE_RELEASE_ID,
    })
    expect(stale.status).toBe(409)
    expect(stale.headers.get('cache-control')).toBe('no-store')
    expect(await stale.json()).toEqual({
      error: 'release_mismatch',
      releaseId: NEXT_FIXTURE_RELEASE_ID,
    })
    expect(fetchSnapshot).toHaveBeenCalledTimes(2)
  })

  it('never serves a snapshot of another release under the asked one', async () => {
    fetchSnapshot.mockResolvedValueOnce(
      new Response(
        JSON.stringify(makeFixtureSnapshotEnvelope(NEXT_FIXTURE_RELEASE_ID)),
      ),
    )

    const response = await request({})

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'release_changing' })
  })

  it('reads nothing for an abstained release', async () => {
    activeRelease = makeFixtureRelease(FIXTURE_RELEASE_ID, { state: 'abstained' })

    const response = await request({})

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: 'release_abstained' })
    expect(fetchSnapshot).not.toHaveBeenCalled()
  })

  it('answers 502, uncached, when the snapshot cannot be read, and waits before trying again', async () => {
    fetchSnapshot.mockResolvedValueOnce(new Response('{}', { status: 500 }))

    const failed = await request({})
    const retried = await request({})

    expect(failed.status).toBe(502)
    expect(failed.headers.get('cache-control')).toBe('no-store')
    expect(retried.status).toBe(502)
    expect(fetchSnapshot).toHaveBeenCalledTimes(1)

    now += 31_000
    expect((await request({})).status).toBe(200)
    expect(fetchSnapshot).toHaveBeenCalledTimes(2)
  })

  it('refuses invalid or oversized input before any read', async () => {
    const send = (query: string) =>
      handlePnrrOverviewRequest(
        new Request(`https://example.test/api/pnrr/overview?${query}`),
      )

    expect(
      (await send(`fundingSources=${encodeURIComponent('["gift"]')}`)).status,
    ).toBe(400)
    expect((await send('part=raw')).status).toBe(400)
    expect((await send('release=..%2Fetc')).status).toBe(400)
    expect((await send(`part=project&projectId=${'x'.repeat(600)}`)).status).toBe(
      400,
    )
    expect((await send('part=project')).status).toBe(400)
    expect((await send('part=map&series=everything')).status).toBe(400)
    expect((await send(`search=${'a'.repeat(5000)}`)).status).toBe(414)
    expect(readRelease).not.toHaveBeenCalled()
    expect(fetchSnapshot).not.toHaveBeenCalled()
  })
})

describe('readPnrrOverviewForSsr', () => {
  it('renders the same overview as the API once the release model is in memory', async () => {
    const search: Partial<PnrrSearchState> = { counties: ['Cluj'] }
    const body = await (await request(search)).json()

    expect(
      JSON.parse(
        JSON.stringify(readPnrrOverviewForSsr(search, FIXTURE_RELEASE_ID)),
      ),
    ).toEqual(body)
  })

  it('renders nothing, and starts the snapshot load, when the model is not in memory', async () => {
    expect(readPnrrOverviewForSsr({}, FIXTURE_RELEASE_ID)).toBeNull()

    await vi.waitFor(() => expect(fetchSnapshot).toHaveBeenCalledTimes(1))
    await vi.waitFor(() =>
      expect(readPnrrOverviewForSsr({}, FIXTURE_RELEASE_ID)).not.toBeNull(),
    )
  })
})
