import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompanyAnalysisRecords, CompanyAnalysisRelease } from '@/schemas/company-analytics'
import { breakdownFixture, recordsFixture, releaseFixture, seriesFixture, statsFixture } from './company-analytics.fixture'

/**
 * The server render: every request reads the API afresh — nothing is kept
 * between requests, so a release withdrawn after one render stops at the
 * next; every answer is pinned to the release and seeded under the browser's
 * keys; and a refusal of the release by ANY read, whichever read and
 * whenever it lands, fails the render closed with no seed at all.
 */

type Op = 'CompanyAnalysisRelease' | 'CompanyAnalysisStats' | 'CompanyAnalysisBreakdown' | 'CompanyAnalysisSeries' | 'CompanyAnalysisRecords'

const api = vi.hoisted(() => ({
  calls: [] as { readonly op: string; readonly release: unknown }[],
  /** The reads the API refuses for their release (withdrawn since). */
  refuse: new Set<string>(),
  /** The reads that fail for another reason. */
  fail: new Set<string>(),
  /** The reads the API answers SERVICE_UNAVAILABLE (no v2 release published yet). */
  unavailable: new Set<string>(),
  /** Milliseconds each read takes, to order mixed outcomes. */
  delay: {} as Record<string, number>,
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  const answer = (op: string): unknown => {
    if (op === 'CompanyAnalysisRelease') return { companyAnalysisRelease: releaseFixture() }
    if (op === 'CompanyAnalysisStats') return { companyAnalysisStats: statsFixture() }
    if (op === 'CompanyAnalysisBreakdown') return { companyAnalysisBreakdown: breakdownFixture() }
    if (op === 'CompanyAnalysisSeries') return { companyAnalysisSeries: seriesFixture() }
    return { companyAnalysisRecords: recordsFixture() }
  }
  return {
    ...actual,
    graphqlQuery: async (_document: string, variables: Record<string, unknown>, options: { readonly operationName: string }) => {
      const op = options.operationName
      api.calls.push({ op, release: variables.release })
      await new Promise((resolve) => setTimeout(resolve, api.delay[op] ?? 0))
      if (api.refuse.has(op)) throw new actual.GraphQLRequestError('gone', { graphQLErrors: [{ message: 'gone', extensions: { code: 'INVALID_INPUT', field: 'release' } }] })
      if (api.unavailable.has(op)) throw new actual.GraphQLRequestError('unavailable', { graphQLErrors: [{ message: 'the active companies analytics release cannot be served', extensions: { code: 'SERVICE_UNAVAILABLE' } }] })
      if (api.fail.has(op)) throw new Error('down')
      return answer(op)
    },
  }
})

const { readCompanyAnalyticsForSsr } = await import('./company-analytics-ssr')

const calls = (op: Op) => api.calls.filter((call) => call.op === op).length

beforeEach(() => {
  api.calls = []
  api.refuse = new Set()
  api.fail = new Set()
  api.unavailable = new Set()
  api.delay = {}
})

describe('readCompanyAnalyticsForSsr', () => {
  it('pins every answer to the release it resolved, under the keys the browser plans', async () => {
    const read = await readCompanyAnalyticsForSsr({ an: 2024, judet: 'CJ' })
    expect(read.complete).toBe(true)
    expect(api.calls.filter((call) => call.op !== 'CompanyAnalysisRelease').every((call) => call.release === '7')).toBe(true)
    expect(read.seed.map((entry) => entry.key[2])).toEqual(['release', 'stats', 'records'])
    expect(read.seed.filter((entry) => entry.key[2] !== 'release').every((entry) => entry.key[3] === '7')).toBe(true)
  })

  it('reads the API afresh for every request: the same question twice is two releases and two answers read', async () => {
    await readCompanyAnalyticsForSsr({ an: 2024, judet: 'CJ' })
    await readCompanyAnalyticsForSsr({ an: 2024, judet: 'CJ' })
    expect(calls('CompanyAnalysisRelease')).toBe(2)
    expect(calls('CompanyAnalysisStats')).toBe(2)
    expect(calls('CompanyAnalysisRecords')).toBe(2)
  })

  it('stops a release withdrawn after a render at the very next request, with no seed of the earlier one', async () => {
    const primed = await readCompanyAnalyticsForSsr({ an: 2024, editie: 7 })
    expect(primed.seed.length).toBeGreaterThan(0)
    // Withdrawn: the API now refuses the release itself.
    api.refuse = new Set(['CompanyAnalysisRelease'])
    const after = await readCompanyAnalyticsForSsr({ an: 2024, editie: 7 })
    expect(after).toEqual({ seed: [], complete: false })
    expect(calls('CompanyAnalysisRelease')).toBe(2)
  })

  it('stops it too when only the answers are refused: the release read still succeeds, nothing is seeded', async () => {
    await readCompanyAnalyticsForSsr({ an: 2024 })
    api.refuse = new Set(['CompanyAnalysisStats', 'CompanyAnalysisRecords'])
    expect(await readCompanyAnalyticsForSsr({ an: 2024 })).toEqual({ seed: [], complete: false })
  })

  it('fails closed when the figures are read but the list is refused — no release, counts or figures seeded', async () => {
    api.refuse = new Set(['CompanyAnalysisRecords'])
    expect(await readCompanyAnalyticsForSsr({ an: 2024, judet: 'CJ' })).toEqual({ seed: [], complete: false })
  })

  it('fails closed whichever read is refused and whenever it lands', async () => {
    const cases: { readonly search: Record<string, unknown>; readonly refused: Op; readonly delay: Partial<Record<Op, number>> }[] = [
      // The refusal lands last, after every success.
      { search: { an: 2024 }, refused: 'CompanyAnalysisRecords', delay: { CompanyAnalysisRecords: 20 } },
      // The refusal lands first, before the figures.
      { search: { an: 2024 }, refused: 'CompanyAnalysisRecords', delay: { CompanyAnalysisStats: 20 } },
      { search: { an: 2024 }, refused: 'CompanyAnalysisStats', delay: { CompanyAnalysisRecords: 20 } },
      { search: { an: 2024, vedere: 'defalcare' }, refused: 'CompanyAnalysisBreakdown', delay: { CompanyAnalysisStats: 10 } },
      { search: { an: 2024, vedere: 'evolutie' }, refused: 'CompanyAnalysisSeries', delay: { CompanyAnalysisSeries: 10 } },
    ]
    for (const { search, refused, delay } of cases) {
      api.refuse = new Set([refused])
      api.delay = delay
      expect(await readCompanyAnalyticsForSsr(search), refused).toEqual({ seed: [], complete: false })
    }
  })

  it('leaves an ordinary failure incomplete and seeds what was read — only a refusal fails the whole render', async () => {
    api.fail = new Set(['CompanyAnalysisRecords'])
    const read = await readCompanyAnalyticsForSsr({ an: 2024 })
    expect(read.complete).toBe(false)
    expect(read.seed.map((entry) => entry.key[2])).toEqual(['release', 'stats'])
  })

  it('reads nothing past the release for a question the release cannot answer', async () => {
    const read = await readCompanyAnalyticsForSsr({ an: 2031 })
    expect(read.complete).toBe(true)
    expect(calls('CompanyAnalysisStats')).toBe(0)
  })

  it('seeds the v2 answers as read — the ONRC source pin, a record’s bases and recorded date — under the keys of a basis-key and ONRC-observation question', async () => {
    const read = await readCompanyAnalyticsForSsr({ an: 2024, judet: '(multiple_values)', onrc_stare: '1048', onrc_judet: 'CJ' })
    expect(read.complete).toBe(true)
    expect(read.seed.find((entry) => entry.key[2] === 'stats')?.key[4]).toEqual({ fiscalYear: 2024, county: { in: ['(multiple_values)'] }, onrc: { status: ['1048'], county: ['CJ'] } })
    expect((read.seed[0]?.data as CompanyAnalysisRelease).release.source).toMatchObject({ editionId: '41', publicationEpoch: '3', sourcePublishedAt: '2026-09-30' })
    const records = read.seed.find((entry) => entry.key[2] === 'records')?.data as CompanyAnalysisRecords
    expect(records.edges[1]?.node).toMatchObject({ countyBasis: 'MULTIPLE_VALUES', observedStatusCoverage: 'PARTIAL', onrcRecordedDate: '0001-01-01' })
  })

  it('seeds nothing while no v2 release can be served: unavailable, never a zero', async () => {
    api.unavailable = new Set(['CompanyAnalysisRelease'])
    expect(await readCompanyAnalyticsForSsr({ an: 2024 })).toEqual({ seed: [], complete: false })
    expect(calls('CompanyAnalysisStats')).toBe(0)
  })
})
