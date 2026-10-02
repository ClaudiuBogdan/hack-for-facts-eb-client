import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChartData } from '@/components/charts/hooks/useChartData'
import type { CompaniesSeriesMappingResult } from '@/lib/companies-chart-series'
import { ChartSchema, type Chart } from '@/schemas/charts'
import { recordsFixture, releaseFixture, seriesFixture, statsFixture } from '../api/company-analytics.fixture'
import { CompanyAnalyticsPage } from '../components/analytics/company-analytics-page'
import { releaseOfKey } from './company-analytics-keys'
import { COMPANIES_CHART_QUERY_KEY, knownRefusedReleases, rememberRefusedRelease } from './company-release-refusals'

/**
 * One browser, one QueryClient, two readers of company figures: the analysis
 * page and the chart builder. Before any refusal, figures already downloaded
 * may be shown again; once either reader sees the API refuse a release, the
 * other knows it too — no cached chart is drawn again, no chart read in
 * flight fills its query when it lands, no page shows its old counts, and
 * nothing of the release is read again. A release published since is read
 * as any, and nothing moves to it without the reader.
 */

const router = vi.hoisted(() => ({ search: {} as Record<string, unknown>, navigate: vi.fn() }))

interface Call {
  readonly op: string
  readonly variables: Record<string, unknown>
}

const api = vi.hoisted(() => ({
  calls: [] as Call[],
  active: '7',
  refuse: (() => false) as (call: Call) => boolean,
  /** Holds a series read until released; the read ignores its abort signal. */
  hold: (() => null) as (call: Call) => Promise<void> | null,
}))

vi.mock('@tanstack/react-router', () => ({
  useSearch: () => router.search,
  useNavigate: () => router.navigate,
  Link: ({ children, to, className }: { readonly children: ReactNode; readonly to: string; readonly className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: async (_document: string, variables: Record<string, unknown>, options: { readonly operationName: string }) => {
      const call = { op: options.operationName, variables }
      api.calls.push(call)
      const held = call.op === 'CompanyAnalysisSeries' ? api.hold(call) : null
      if (held) await held
      if (api.refuse(call)) throw new actual.GraphQLRequestError('withdrawn', { graphQLErrors: [{ message: 'withdrawn', extensions: { code: 'INVALID_INPUT', field: 'release' } }] })
      const release = { releaseId: String(variables.release ?? api.active), publishedAt: null, active: true }
      if (call.op === 'CompanyAnalysisRelease') return { companyAnalysisRelease: releaseFixture({ release }) }
      if (call.op === 'CompanyAnalysisStats') return { companyAnalysisStats: statsFixture({ release }) }
      if (call.op === 'CompanyAnalysisRecords') return { companyAnalysisRecords: recordsFixture({ release }) }
      if (call.op === 'CompanyAnalysisSeries') return { companyAnalysisSeries: seriesFixture({ release }) }
      throw new Error(`unexpected ${call.op}`)
    },
  }
})

/** A company series: pinned to a release, or not yet (it reads the active one); `cui` tells its reads apart. */
function companySeries(id: string, release: string | null, cui = '1') {
  return { id, type: 'companies-analytics', label: id, metric: 'TURNOVER', scope: { cuis: [cui] }, period: { type: 'YEAR', selection: { interval: { start: '2008', end: '2011' } } }, ...(release !== null ? { release: { id: release, policy: 'pinned' } } : {}) }
}

function companiesChart(release: string): Chart {
  return ChartSchema.parse({ id: `chart-${release}`, title: 'Turnover', config: { chartType: 'line' }, series: [companySeries('co', release)] })
}

function browser() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  const openChart = (release: string) => {
    const chart = companiesChart(release)
    return renderHook(() => useChartData({ chart }), { wrapper: Wrapper })
  }
  const openSeries = (series: readonly unknown[]) => {
    const chart = ChartSchema.parse({ id: 'chart-multi', title: 'Turnover', config: { chartType: 'line' }, series })
    return renderHook(() => useChartData({ chart }), { wrapper: Wrapper })
  }
  const openPage = (search: Record<string, unknown>) => {
    router.search = search
    return render(
      <Wrapper>
        <CompanyAnalyticsPage />
      </Wrapper>,
    )
  }
  return { client, openChart, openSeries, openPage }
}

/** The page's figures, as a reader sees them. */
const FIGURES = '2,718,250'
const WITHDRAWN_7 = 'Ediția 7 a analizei nu mai este disponibilă'

const chartQueries = (client: QueryClient) => client.getQueryCache().findAll({ queryKey: [COMPANIES_CHART_QUERY_KEY] })
const seriesReads = (release: string) => api.calls.filter((call) => call.op === 'CompanyAnalysisSeries' && call.variables.release === release).length
const activeReads = () => api.calls.filter((call) => call.op === 'CompanyAnalysisRelease' && call.variables.release === undefined).length
type ChartHook = { readonly result: { readonly current: ReturnType<typeof useChartData> } }
const saysWithdrawn = (chart: ChartHook, release: string, seriesId = 'co') =>
  chart.result.current.validationResult?.warnings.some((warning) => warning.seriesId === seriesId && warning.message.includes(`Release ${release} of the companies analysis is no longer available`)) ?? false
/** Every figure a chart query stores. */
const cachedFigures = (client: QueryClient) => chartQueries(client).flatMap((query) => ((query.state.data as CompaniesSeriesMappingResult[] | undefined) ?? []).flatMap((result) => (result.series ? [result.series.seriesId] : [])))
const cuiOf = (call: Call) => (call.variables.scope as { cuis?: string[] } | undefined)?.cuis?.[0]
const seriesReadsOf = (cui: string) => api.calls.filter((call) => call.op === 'CompanyAnalysisSeries' && cuiOf(call) === cui).length
const refuseSeriesOf = (cui: string) => (call: Call) => call.op === 'CompanyAnalysisSeries' && cuiOf(call) === cui
const tick = () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
})
/** A gate a test opens. */
function gate() {
  let open!: () => void
  const closed = new Promise<void>((resolve) => {
    open = resolve
  })
  return { closed, open }
}

/** The page's records read again, and refused for the release: the page sees the refusal. */
async function refuseRecords(client: QueryClient, release: string) {
  api.refuse = (call) => call.op === 'CompanyAnalysisRecords' && call.variables.release === release
  await act(async () => {
    await client.invalidateQueries({ predicate: (query) => query.queryKey[2] === 'records' })
  })
  await screen.findByText(`Ediția ${release} a analizei nu mai este disponibilă`)
}

beforeEach(() => {
  router.search = {}
  router.navigate.mockReset()
  router.navigate.mockResolvedValue(undefined)
  api.calls = []
  api.active = '7'
  api.refuse = () => false
  api.hold = () => null
})

describe('a release refused to one reader, known to every reader', () => {
  it('draws nothing from a chart cached before the page saw its release refused, and reads nothing for it', async () => {
    const { client, openChart, openPage } = browser()
    const first = openChart('7')
    await waitFor(() => expect(first.result.current.dataSeriesMap?.has('co')).toBe(true))
    first.unmount()

    const page = openPage({ editie: 7 })
    await screen.findByText('Firma 1')
    await refuseRecords(client, '7')
    await waitFor(() => expect(chartQueries(client)).toEqual([]))
    page.unmount()

    const again = openChart('7')
    await waitFor(() => expect(saysWithdrawn(again, '7')).toBe(true))
    expect(again.result.current.dataSeriesMap?.has('co')).toBe(false)
    expect(seriesReads('7')).toBe(1)
  })

  it('lets no chart read in flight fill its query once the refusal is seen, even when the read ignores its abort', async () => {
    const { client, openChart, openPage } = browser()
    const landing = gate()
    api.hold = () => landing.closed
    const chart = openChart('7')
    await waitFor(() => expect(chartQueries(client)[0]?.state.fetchStatus).toBe('fetching'))

    api.hold = () => null
    openPage({ editie: 7 })
    await screen.findByText('Firma 1')
    await refuseRecords(client, '7')

    // The old read lands, its answer whole.
    await act(async () => {
      landing.open()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await waitFor(() => expect(saysWithdrawn(chart, '7')).toBe(true))
    expect(chart.result.current.dataSeriesMap?.has('co')).toBe(false)
    const cached = chartQueries(client).flatMap((query) => (query.state.data as CompaniesSeriesMappingResult[] | undefined) ?? [])
    expect(cached.some((result) => result.series !== null)).toBe(false)
    expect(seriesReads('7')).toBe(1)
  })

  it('withdraws the page at once after a chart saw its release refused: no old counts, nothing read', async () => {
    const { client, openChart, openPage } = browser()
    const first = openPage({ editie: 7 })
    await screen.findByText(FIGURES)
    first.unmount()

    api.refuse = (call) => call.op === 'CompanyAnalysisSeries' && call.variables.release === '7'
    const chart = openChart('7')
    await waitFor(() => expect(saysWithdrawn(chart, '7')).toBe(true))
    // The page's cached answers of the release are dropped with it.
    await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ['companies', 'analytics'] }).filter((query) => releaseOfKey(query.queryKey) === '7')).toEqual([]))

    const before = api.calls.length
    openPage({ editie: 7 })
    expect(await screen.findByText(WITHDRAWN_7)).toBeInTheDocument()
    expect(screen.queryByText(FIGURES)).not.toBeInTheDocument()
    expect(screen.queryByText(/situații/u)).not.toBeInTheDocument()
    expect(screen.queryByText(/Surse:/u)).not.toBeInTheDocument()
    expect(screen.queryByText('Firma 1')).not.toBeInTheDocument()
    expect(api.calls.length).toBe(before)
  })

  it('keeps a release published since usable to both readers, and moves to it only when asked', async () => {
    const { client, openChart, openPage } = browser()
    const page7 = openPage({ editie: 7 })
    await screen.findByText('Firma 1')
    api.active = '8'
    await refuseRecords(client, '7')
    // Nothing reads the current release by itself.
    expect(activeReads()).toBe(0)
    expect(api.calls.some((call) => call.variables.release === '8')).toBe(false)
    page7.unmount()

    const chart8 = openChart('8')
    await waitFor(() => expect(chart8.result.current.dataSeriesMap?.has('co')).toBe(true))
    expect(seriesReads('8')).toBe(1)

    openPage({ editie: 8 })
    expect(await screen.findByText(FIGURES)).toBeInTheDocument()
    expect(screen.queryByText(WITHDRAWN_7)).not.toBeInTheDocument()
  })
})

describe('within one chart, series by series', () => {
  // An unpinned series (being configured) reads the active release — 7 here — then its figures; its pinned sibling's 7 is refused.
  const sameRelease = () => [companySeries('unpinned', null, '1001'), companySeries('pinned', '7', '2001')]

  it('withdraws an unpinned series that read the release before its pinned sibling was refused', async () => {
    const { client, openSeries } = browser()
    const refusal = gate()
    api.refuse = refuseSeriesOf('2001')
    api.hold = (call) => (cuiOf(call) === '2001' ? refusal.closed : null)
    const chart = openSeries(sameRelease())
    await waitFor(() => expect(seriesReadsOf('1001')).toBe(1))
    await tick()
    // The unpinned figures are in; now the sibling is refused.
    refusal.open()
    await waitFor(() => expect(knownRefusedReleases(client).has('7')).toBe(true))
    await waitFor(() => expect(chart.result.current.isLoadingData).toBe(false))
    expect(chart.result.current.dataSeriesMap?.has('unpinned')).toBe(false)
    expect(chart.result.current.dataSeriesMap?.has('pinned')).toBe(false)
    expect(saysWithdrawn(chart, '7', 'unpinned')).toBe(true)
    expect(cachedFigures(client)).toEqual([])
  })

  it('withdraws an unpinned series whose figures land after its pinned sibling was refused', async () => {
    const { client, openSeries } = browser()
    const late = gate()
    api.refuse = refuseSeriesOf('2001')
    api.hold = (call) => (cuiOf(call) === '1001' ? late.closed : null)
    const chart = openSeries(sameRelease())
    // Known to every reader while the sibling is still being read.
    await waitFor(() => expect(knownRefusedReleases(client).has('7')).toBe(true))
    expect(chartQueries(client)[0]?.state.fetchStatus).toBe('fetching')
    late.open()
    await waitFor(() => expect(chart.result.current.isLoadingData).toBe(false))
    await tick()
    expect(chart.result.current.dataSeriesMap?.has('unpinned')).toBe(false)
    expect(saysWithdrawn(chart, '7', 'unpinned')).toBe(true)
    expect(cachedFigures(client)).toEqual([])
  })

  it('withdraws the page the moment one series is refused, while another release is still read — and then draws that one', async () => {
    const { client, openSeries, openPage } = browser()
    openPage({ editie: 7 })
    await screen.findByText(FIGURES)
    const eight = gate()
    api.refuse = refuseSeriesOf('2001')
    api.hold = (call) => (cuiOf(call) === '3001' ? eight.closed : null)
    const chart = openSeries([companySeries('refused-seven', '7', '2001'), companySeries('pending-eight', '8', '3001')])

    expect(await screen.findByText(WITHDRAWN_7)).toBeInTheDocument()
    expect(screen.queryByText(FIGURES)).not.toBeInTheDocument()
    // Release 8 is still being read, and is not dropped to hide 7.
    expect(chartQueries(client)[0]?.state.fetchStatus).toBe('fetching')
    expect(seriesReadsOf('3001')).toBe(1)

    eight.open()
    await waitFor(() => expect(chart.result.current.dataSeriesMap?.has('pending-eight')).toBe(true))
    expect(chart.result.current.dataSeriesMap?.has('refused-seven')).toBe(false)
    expect(cachedFigures(client)).toEqual(['pending-eight'])
    expect(seriesReadsOf('3001')).toBe(1)
    // Nothing moved to the current release by itself.
    expect(activeReads()).toBe(0)
  })

  it('stops drawing an unpinned series cached from a release the moment that release is known refused', async () => {
    const { client, openSeries } = browser()
    const chart = openSeries([companySeries('unpinned', null, '1001')])
    await waitFor(() => expect(chart.result.current.dataSeriesMap?.has('unpinned')).toBe(true))

    act(() => {
      rememberRefusedRelease(client, '7')
    })
    // At once, from the figures it already holds: nothing read again first.
    expect(chart.result.current.dataSeriesMap?.has('unpinned')).toBe(false)
    expect(saysWithdrawn(chart, '7', 'unpinned')).toBe(true)
    await tick()
    expect(seriesReadsOf('1001')).toBe(1)
    expect(cachedFigures(client)).toEqual([])
  })
})
