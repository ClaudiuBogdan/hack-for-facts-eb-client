import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseCompanyHubSearch } from '@/schemas/private-company-search'
import { analyticsSearchOf, stateOf } from '../lib/company-analytics-url'
import type { CompanyAnalyticsServerRead } from './company-analytics-ssr'
import { breakdownFixture, recordsFixture, releaseFixture, seriesFixture, statsFixture } from './company-analytics.fixture'
import { BREAKDOWN_TOP, BREAKDOWN_TOP_EXPANDED, planBreakdown, planRecords, planSeries, planStats, resolveQuestion } from './company-analytics-plan'

/**
 * The hub's reads: the active release, then one read per section pinned to
 * it — each the analysis page's own question under the page's own key — and
 * nothing of the registry or its nation-wide aggregates. The server read is
 * the analysis page's: afresh per request, within one deadline, failed
 * closed on any refusal of the release, incomplete on an ordinary failure.
 * The transport is scripted here and refuses anything it does not know: no
 * test reaches a live API.
 */

const api = vi.hoisted(() => ({
  calls: [] as { readonly op: string; readonly variables: Record<string, unknown>; readonly signal: unknown }[],
  refuse: new Set<string>(),
  fail: new Set<string>(),
  unavailable: new Set<string>(),
  /** Reads that never answer: they end only when their signal aborts. */
  hang: new Set<string>(),
  delay: {} as Record<string, number>,
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  const answer = (op: string): unknown => {
    if (op === 'CompanyAnalysisRelease') return { companyAnalysisRelease: releaseFixture() }
    if (op === 'CompanyAnalysisStats') return { companyAnalysisStats: statsFixture() }
    if (op === 'CompanyAnalysisBreakdown') return { companyAnalysisBreakdown: breakdownFixture() }
    if (op === 'CompanyAnalysisSeries') return { companyAnalysisSeries: seriesFixture() }
    if (op === 'CompanyAnalysisRecords') return { companyAnalysisRecords: recordsFixture() }
    throw new Error(`unexpected operation ${op}: the hub reads the analytics release only`)
  }
  return {
    ...actual,
    graphqlQuery: async (_document: string, variables: Record<string, unknown>, options: { readonly operationName: string; readonly signal?: AbortSignal; readonly auth?: string }) => {
      const op = options.operationName
      api.calls.push({ op, variables, signal: options.signal })
      await new Promise((resolve) => setTimeout(resolve, api.delay[op] ?? 0))
      if (api.hang.has(op)) {
        await new Promise((_resolve, reject) => {
          const signal = options.signal
          if (signal?.aborted) reject(signal.reason)
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
      }
      if (api.refuse.has(op)) throw new actual.GraphQLRequestError('gone', { graphQLErrors: [{ message: 'gone', extensions: { code: 'INVALID_INPUT', field: 'release' } }] })
      if (api.unavailable.has(op)) throw new actual.GraphQLRequestError('unavailable', { graphQLErrors: [{ message: 'unavailable', extensions: { code: 'SERVICE_UNAVAILABLE' } }] })
      if (api.fail.has(op)) throw new Error('down')
      return answer(op)
    },
  }
})

const { planCompanyHub, hubReadsOf, readCompanyHubForSsr } = await import('./company-hub-analytics')

const ANALYTICS_OPS = new Set(['CompanyAnalysisRelease', 'CompanyAnalysisStats', 'CompanyAnalysisBreakdown', 'CompanyAnalysisSeries', 'CompanyAnalysisRecords'])

beforeEach(() => {
  api.calls = []
  api.refuse = new Set()
  api.fail = new Set()
  api.unavailable = new Set()
  api.hang = new Set()
  api.delay = {}
})

describe('planCompanyHub', () => {
  const release = releaseFixture()

  it('asks the analysis page’s own questions for the release’s default year, under the page’s keys', () => {
    const plan = planCompanyHub(release, parseCompanyHubSearch({}))!
    expect(plan).toMatchObject({ release: '7', year: 2024, choices: { ranking: 'TURNOVER', sectors: 'TURNOVER', map: 'TURNOVER' }, trendMetric: 'TURNOVER' })
    // The keys the analysis page plans for the same question, read from the address a hub link writes.
    const page = (search: Record<string, unknown>) => resolveQuestion(stateOf(analyticsSearchOf(search)), release)
    expect(plan.stats.key).toEqual(planStats(page({ an: 2024, editie: 7 })).key)
    expect(plan.leaders?.key).toEqual(planRecords(page({ an: 2024, editie: 7, indicator: 'turnover' }), null).key)
    expect(plan.sectors.key).toEqual(planBreakdown(page({ an: 2024, editie: 7, indicator: 'turnover', vedere: 'defalcare', dupa: 'caen' }), 'MAIN_CAEN', BREAKDOWN_TOP).key)
    expect(plan.counties.key).toEqual(planBreakdown(page({ an: 2024, editie: 7, indicator: 'turnover', vedere: 'defalcare' }), 'COUNTY', BREAKDOWN_TOP_EXPANDED).key)
    expect(plan.trend?.key).toEqual(planSeries(page({ an: 2024, editie: 7, indicator: 'turnover', vedere: 'evolutie', cohorta: 'fiecare-an' }), release).key)
    // Every read names the release and the year in its key: one release's answer never stands for another's.
    for (const read of hubReadsOf(plan)) {
      expect(read.key[3]).toBe('7')
      expect(read.key[4]).toEqual({ fiscalYear: 2024 })
      expect(read.enabled).toBe(true)
    }
  })

  it('reads every county in one answer, and the companies with a statement by the companies-with-a-statement ranking', () => {
    const plan = planCompanyHub(release, parseCompanyHubSearch({ indicator: 'firme', domenii: 'firme', clasament: 'salariati' }))!
    // [companies, analytics, breakdown, release, scope, dimension, metric, rankBy, topN]
    expect(plan.counties.key.slice(5)).toEqual(['COUNTY', 'TURNOVER', 'FILERS', BREAKDOWN_TOP_EXPANDED])
    expect(plan.sectors.key.slice(5)).toEqual(['MAIN_CAEN', 'TURNOVER', 'FILERS', BREAKDOWN_TOP])
    expect(plan.sizes.key.slice(5)).toEqual(['EMPLOYEE_SIZE', 'TURNOVER', 'FILERS', BREAKDOWN_TOP])
    // [companies, analytics, records, release, scope, sort, sortMetric, direction, metrics, after]
    expect(plan.leaders?.key.slice(5, 8)).toEqual(['METRIC', 'EMPLOYEES', 'DESC'])
  })

  it('stays within the release’s limits, and plans nothing for a release without its default year', () => {
    const narrow = releaseFixture({ limits: { ...release.limits, maxTopN: 50 } })
    const counties = planCompanyHub(narrow, {})!.counties.key
    expect(counties[counties.length - 1]).toBe(50)
    expect(planCompanyHub(releaseFixture({ defaults: { ...release.defaults, fiscalYear: 2031 } }), {})).toBeNull()
  })
})

describe('readCompanyHubForSsr', () => {
  it('reads the active release, then each section pinned to it — analytics operations only, never the registry or its aggregates', async () => {
    const read = await readCompanyHubForSsr({})
    expect(read.complete).toBe(true)
    expect(api.calls.map((call) => call.op).every((op) => ANALYTICS_OPS.has(op))).toBe(true)
    expect(api.calls.map((call) => call.op)).not.toContain('CompanyHubStats')
    expect(api.calls[0]).toMatchObject({ op: 'CompanyAnalysisRelease', variables: {} })
    expect(api.calls.slice(1).every((call) => call.variables.release === '7')).toBe(true)
    expect(read.seed.map((entry) => entry.key[2])).toEqual(['release', 'stats', 'records', 'breakdown', 'breakdown', 'breakdown', 'series'])
    expect(read.seed[0]?.key).toEqual(['companies', 'analytics', 'release', 'active'])
    // One deadline bounds the whole render: every read carries it.
    const signals = new Set(api.calls.map((call) => call.signal))
    expect(signals.size).toBe(1)
    expect([...signals][0]).toBeInstanceOf(AbortSignal)
  })

  it('ends the whole render at one deadline from its start: a slow release leaves the sections only what remains of it', async () => {
    vi.useFakeTimers()
    try {
      api.delay = { CompanyAnalysisRelease: 3_000 }
      api.hang = new Set(['CompanyAnalysisStats', 'CompanyAnalysisBreakdown', 'CompanyAnalysisSeries', 'CompanyAnalysisRecords'])
      let settled: CompanyAnalyticsServerRead | null = null
      void readCompanyHubForSsr({}).then((read) => {
        settled = read
      })
      // 3.0 s of release, then the sections; at 3.499 s the render is still waiting on them.
      await vi.advanceTimersByTimeAsync(3_499)
      expect(settled).toBeNull()
      expect(api.calls.filter((call) => call.op !== 'CompanyAnalysisRelease')).toHaveLength(6)
      // At 3.5 s from the start — not 3.5 s after the release — every section is abandoned: the release alone is seeded.
      await vi.advanceTimersByTimeAsync(1)
      expect(settled).toEqual({ seed: [expect.objectContaining({ key: ['companies', 'analytics', 'release', 'active'] })], complete: false })
    } finally {
      vi.useRealTimers()
    }
  })

  it('reads the API afresh for every request', async () => {
    await readCompanyHubForSsr({})
    await readCompanyHubForSsr({})
    expect(api.calls.filter((call) => call.op === 'CompanyAnalysisRelease')).toHaveLength(2)
    expect(api.calls.filter((call) => call.op === 'CompanyAnalysisStats')).toHaveLength(2)
  })

  it('fails closed — no seed at all — when any read refuses the release, whenever it lands', async () => {
    for (const [refused, delay] of [
      ['CompanyAnalysisRelease', {}],
      ['CompanyAnalysisStats', { CompanyAnalysisRecords: 10 }],
      ['CompanyAnalysisSeries', {}],
      ['CompanyAnalysisBreakdown', { CompanyAnalysisBreakdown: 10 }],
    ] as const) {
      api.refuse = new Set([refused])
      api.delay = delay
      expect(await readCompanyHubForSsr({}), refused).toEqual({ seed: [], complete: false })
    }
  })

  it('seeds nothing while no release can be served: unavailable, never a zero', async () => {
    api.unavailable = new Set(['CompanyAnalysisRelease'])
    expect(await readCompanyHubForSsr({})).toEqual({ seed: [], complete: false })
    expect(api.calls.map((call) => call.op)).toEqual(['CompanyAnalysisRelease'])
  })

  it('leaves an ordinary failure to the browser and seeds the sections that were read', async () => {
    api.fail = new Set(['CompanyAnalysisSeries'])
    const read = await readCompanyHubForSsr({})
    expect(read.complete).toBe(false)
    expect(read.seed.map((entry) => entry.key[2])).toEqual(['release', 'stats', 'records', 'breakdown', 'breakdown', 'breakdown'])
  })

  it('reads the sections the address chose', async () => {
    const read = await readCompanyHubForSsr(parseCompanyHubSearch({ clasament: 'salariati', indicator: 'salariati' }))
    const records = api.calls.find((call) => call.op === 'CompanyAnalysisRecords')
    expect(records?.variables).toMatchObject({ sort: 'METRIC', sortMetric: 'EMPLOYEES', direction: 'DESC' })
    const county = api.calls.find((call) => call.op === 'CompanyAnalysisBreakdown' && call.variables.dimension === 'COUNTY')
    expect(county?.variables).toMatchObject({ metric: 'EMPLOYEES', rankBy: 'METRIC_SUM', topN: BREAKDOWN_TOP_EXPANDED, scope: { fiscalYear: 2024 } })
    expect(read.complete).toBe(true)
  })
})
