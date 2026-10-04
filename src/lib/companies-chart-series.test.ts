import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompaniesAnalyticsSeriesConfigurationSchema, type CompaniesAnalyticsSeriesConfiguration } from '@/schemas/charts'
import { releaseFixture, releaseRef, seriesFixture } from '@/features/private-companies/api/company-analytics.fixture'
import { mapCompaniesSeriesToAnalyticsSeries } from './companies-chart-series'

/**
 * A company series as the chart draws it: every year of its period present
 * either as a point or as a missing period (never a 0), the exact decimal
 * beside the plotted float, the API's unit, and a pinned release that the
 * API no longer serves left unavailable rather than replaced.
 */

const api = vi.hoisted(() => ({ calls: [] as { readonly op: string; readonly variables: Record<string, unknown> }[], refuse: false, refuseSeries: false }))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: (_document: string, variables: Record<string, unknown>, options: { readonly operationName: string }) => {
      api.calls.push({ op: options.operationName, variables })
      const refused = api.refuse || (api.refuseSeries && options.operationName === 'CompanyAnalysisSeries')
      if (refused) return Promise.reject(new actual.GraphQLRequestError('gone', { graphQLErrors: [{ message: 'gone', extensions: { code: 'INVALID_INPUT', field: 'release' } }] }))
      if (options.operationName === 'CompanyAnalysisRelease') return Promise.resolve({ companyAnalysisRelease: releaseFixture({ release: releaseRef('9', { publishedAt: null }) }) })
      return Promise.resolve({ companyAnalysisSeries: seriesFixture() })
    },
  }
})

function series(overrides: Partial<CompaniesAnalyticsSeriesConfiguration> = {}): CompaniesAnalyticsSeriesConfiguration {
  return CompaniesAnalyticsSeriesConfigurationSchema.parse({
    id: 'companies',
    type: 'companies-analytics',
    label: 'Turnover',
    metric: 'TURNOVER',
    period: { type: 'YEAR', selection: { interval: { start: '2008', end: '2011' } } },
    scope: { county: { in: ['CJ'] } },
    referenceYear: 2024,
    release: { id: '7', policy: 'pinned' },
    ...overrides,
  })
}

beforeEach(() => {
  api.calls = []
  api.refuse = false
  api.refuseSeries = false
})

describe('mapCompaniesSeriesToAnalyticsSeries', () => {
  it('draws reported years as points and every other year as a gap — a zero only where zero was reported', async () => {
    const result = await mapCompaniesSeriesToAnalyticsSeries(series())
    expect(result.series?.data).toEqual([
      // Only the plotted float loses digits; `pointDetails` keeps them.
      { x: '2008', y: Number('9007199254741973.32') },
      { x: '2010', y: 0 },
    ])
    expect(result.series?.missingPeriods).toEqual(['2009', '2011'])
  })

  it('keeps the exact decimal beside the plotted float, with who reported it and the release’s ONRC edition', async () => {
    const result = await mapCompaniesSeriesToAnalyticsSeries(series())
    expect(result.series?.pointDetails?.['2008']).toEqual({ exact: '9007199254741973.32', note: 'reported by 70 of 80 companies with a statement · release 7, ONRC edition 41' })
    expect(result.series?.pointDetails?.['2010']?.exact).toBe('0.00')
  })

  it('reads a saved consensus basis key and the ONRC observations exactly as saved', async () => {
    // The companies whose entries name different counties, with a public 1048 and a Cluj county on the SAME entry.
    const scope = { county: { in: ['(multiple_values)'] }, onrc: { status: ['1048'], county: ['CJ'], caenCode: ['6201'], onrcCaen: ['rev2:6201'], exclude: { caenCode: ['4711'] } } }
    await mapCompaniesSeriesToAnalyticsSeries(series({ scope }))
    expect(api.calls[0]?.variables.scope).toEqual({ fiscalYear: 2024, ...scope })
  })

  it('refuses a saved exact-revision exclusion instead of reading the series without it', () => {
    const saved = { id: 'companies', type: 'companies-analytics', label: 'Turnover', metric: 'TURNOVER', scope: { onrc: { exclude: { onrcCaen: ['rev2:6201'] } } } }
    expect(CompaniesAnalyticsSeriesConfigurationSchema.safeParse(saved).success).toBe(false)
  })

  it('marks the release an unpinned series resolved to as refused when its read is refused, and reads no other', async () => {
    api.refuseSeries = true
    const result = await mapCompaniesSeriesToAnalyticsSeries(series({ release: undefined }))
    expect(result.series).toBeNull()
    expect(result.refusedRelease).toBe('9')
    expect(api.calls.map((call) => [call.op, call.variables.release])).toEqual([
      ['CompanyAnalysisRelease', undefined],
      ['CompanyAnalysisSeries', '9'],
    ])
  })

  it('supplies missing periods even when there are none', async () => {
    const result = await mapCompaniesSeriesToAnalyticsSeries(series({ period: { type: 'YEAR', selection: { dates: ['2008', '2010'] } } }))
    expect(result.series?.missingPeriods).toEqual([])
    expect(result.series?.data.map((point) => point.x)).toEqual(['2008', '2010'])
  })

  it('reads the pinned release, the scope in its reference year, and the API’s unit — never the series’ label for it', async () => {
    const result = await mapCompaniesSeriesToAnalyticsSeries(series({ unit: 'EUR' }))
    expect(api.calls[0]?.variables).toMatchObject({ release: '7', scope: { fiscalYear: 2024, county: { in: ['CJ'] } }, metric: 'TURNOVER', cohortMode: 'EACH_YEAR', fromYear: 2008, toYear: 2011 })
    expect(result.series?.yAxis.unit).toBe('RON')
  })

  it('leaves a series on a release the API no longer serves unavailable, and asks for no other release', async () => {
    api.refuse = true
    const result = await mapCompaniesSeriesToAnalyticsSeries(series())
    expect(result.series).toBeNull()
    expect(result.retryable).toBeUndefined()
    expect(result.warnings[0]?.message).toMatch(/Release 7 of the companies analysis is no longer available/u)
    expect(api.calls.map((call) => call.op)).toEqual(['CompanyAnalysisSeries'])
  })

  it('refuses monthly or quarterly periods: company statements are annual', async () => {
    const result = await mapCompaniesSeriesToAnalyticsSeries(series({ period: { type: 'MONTH', selection: { interval: { start: '2020-01', end: '2020-12' } } } }))
    expect(result.series).toBeNull()
    expect(api.calls).toEqual([])
  })

  it('reads the active release for a series not pinned yet', async () => {
    await mapCompaniesSeriesToAnalyticsSeries(series({ release: undefined }))
    expect(api.calls.map((call) => [call.op, call.variables.release])).toEqual([
      ['CompanyAnalysisRelease', undefined],
      ['CompanyAnalysisSeries', '9'],
    ])
  })
})
