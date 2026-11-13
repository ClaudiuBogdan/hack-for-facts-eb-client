import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import type { ReportPeriodInput } from '@/schemas/reporting'
import { entityDetailsQueryOptions } from './useEntityDetails'

vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }))

const metadata = {
  entity: {
    cui: '4305857',
    organization: { name: 'Cluj-Napoca' },
    territory: null,
    reference: null,
    budget: { presence: true, reportType: 'EXECUTION_DETAILED' },
  },
}
const summary = {
  summary: [2024, 2025].map((year) => ({
    year, month: null, quarter: null, mainCreditorCui: '111',
    totalIncome: String(year), totalExpense: '100', budgetBalance: String(year - 100),
  })),
}
const normalizedPoints = [{ periodLabel: '2025', amount: '10' }]
const normalizedSeries = {
  totalIncome: normalizedPoints,
  totalExpense: normalizedPoints,
  budgetBalance: normalizedPoints,
}

function yearRange(start: '2024' | '2025', end = start): ReportPeriodInput {
  return { type: 'YEAR', selection: { interval: { start, end } } }
}

const overview = {
  cui: '4305857',
  reportPeriod: yearRange('2025'),
  trendPeriod: yearRange('2024', '2025'),
}

beforeEach(() => vi.stubGlobal('window', undefined))

afterEach(() => {
  vi.mocked(graphqlQuery).mockReset()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('entityDetailsQueryOptions', () => {
  it('uses the same query key for equivalent params with different field order', () => {
    const reportPeriod: ReportPeriodInput = {
      type: 'YEAR',
      selection: {
        interval: {
          start: '2025',
          end: '2025',
        },
      },
    }
    const trendPeriod: ReportPeriodInput = {
      type: 'YEAR',
      selection: {
        interval: {
          start: '2016',
          end: '2026',
        },
      },
    }

    const loaderParams = {
      cui: '4305857',
      reportPeriod,
      reportType: 'DETAILED' as const,
      mainCreditorCui: '1234567',
      normalization: 'total' as const,
      currency: 'RON' as const,
      inflation_adjusted: false,
      trendPeriod,
      show_period_growth: true,
    }

    const clientParams = {
      cui: '4305857',
      normalization: 'total' as const,
      currency: 'RON' as const,
      inflation_adjusted: false,
      show_period_growth: true,
      reportPeriod,
      reportType: 'DETAILED' as const,
      trendPeriod,
      mainCreditorCui: '1234567',
    }

    expect(entityDetailsQueryOptions(loaderParams).queryKey).toEqual(
      entityDetailsQueryOptions(clientParams).queryKey,
    )
  })

  it('uses the same query key when trendPeriod is omitted or matches reportPeriod', () => {
    const reportPeriod: ReportPeriodInput = {
      type: 'YEAR',
      selection: {
        interval: {
          start: '2025',
          end: '2025',
        },
      },
    }

    const implicitTrendPeriodParams = {
      cui: '4305857',
      normalization: 'total' as const,
      currency: 'RON' as const,
      inflation_adjusted: false,
      show_period_growth: false,
      reportPeriod,
      reportType: 'DETAILED' as const,
      mainCreditorCui: '1234567',
    }

    const explicitTrendPeriodParams = {
      ...implicitTrendPeriodParams,
      trendPeriod: reportPeriod,
    }

    expect(entityDetailsQueryOptions(implicitTrendPeriodParams).queryKey).toEqual(
      entityDetailsQueryOptions(explicitTrendPeriodParams).queryKey,
    )
  })

  it('hydrates separate sources and reuses the nominal series across years and creditor projections', async () => {
    vi.mocked(graphqlQuery).mockResolvedValueOnce(metadata).mockResolvedValueOnce(summary)
    const server = new QueryClient()
    const original = await server.fetchQuery(entityDetailsQueryOptions(overview))
    expect(original?.totalIncome).toBe(2025)
    const browser = new QueryClient()
    hydrate(browser, dehydrate(server))
    vi.stubGlobal('window', {})

    vi.mocked(graphqlQuery).mockResolvedValueOnce(metadata).mockResolvedValueOnce(normalizedSeries)
    const year = await browser.fetchQuery(entityDetailsQueryOptions({
      ...overview, reportPeriod: yearRange('2024'), mainCreditorCui: '111',
    }))
    const euro = await browser.fetchQuery(entityDetailsQueryOptions({ ...overview, currency: 'EUR' }))

    expect(year?.totalIncome).toBe(2024)
    expect(euro?.totalIncome).toBe(10)
    const calls = vi.mocked(graphqlQuery).mock.calls
    expect(calls.map((call) => call[2]?.operationName)).toEqual([
      'entity-metadata', 'entity-budget', 'entity-metadata', 'entity-budget',
    ])
    expect(calls[2]?.[1]).toEqual({ cui: overview.cui, populationYear: 2024 })
    expect(calls[3]?.[1]).toMatchObject({ currency: 'EUR', normalized: true })
  })

  it('expires a new projection when its reused source expires', async () => {
    vi.useFakeTimers()
    const start = Date.now()
    const client = new QueryClient()
    vi.mocked(graphqlQuery).mockResolvedValueOnce(metadata).mockResolvedValueOnce(summary)
    await client.fetchQuery(entityDetailsQueryOptions(overview))
    vi.setSystemTime(start + 4 * 60 * 1000)
    const query = entityDetailsQueryOptions({ ...overview, show_period_growth: true })
    await client.fetchQuery(query)
    expect(graphqlQuery).toHaveBeenCalledTimes(2)
    vi.setSystemTime(start + 5 * 60 * 1000)
    vi.mocked(graphqlQuery).mockResolvedValueOnce(metadata).mockResolvedValueOnce(summary)
    await client.fetchQuery(query)
    expect(graphqlQuery).toHaveBeenCalledTimes(4)
  })

  it('rechecks a missing entity when its metadata expires', async () => {
    vi.useFakeTimers()
    const start = Date.now()
    const client = new QueryClient()
    vi.mocked(graphqlQuery).mockResolvedValueOnce({ entity: null })
    expect(await client.fetchQuery(entityDetailsQueryOptions(overview))).toBeNull()

    vi.setSystemTime(start + 4 * 60 * 1000)
    const query = entityDetailsQueryOptions({ ...overview, currency: 'EUR' })
    expect(await client.fetchQuery(query)).toBeNull()
    expect(graphqlQuery).toHaveBeenCalledTimes(1)

    vi.setSystemTime(start + 5 * 60 * 1000)
    vi.mocked(graphqlQuery).mockResolvedValueOnce(metadata).mockResolvedValueOnce(normalizedSeries)
    expect(await client.fetchQuery(query)).toMatchObject({ totalIncome: 10 })
    expect(graphqlQuery).toHaveBeenCalledTimes(3)
  })

  it('shares in-flight browser reads across projections after one is cancelled', async () => {
    vi.stubGlobal('window', {})
    const client = new QueryClient()
    const query = entityDetailsQueryOptions(overview)
    const growthQuery = entityDetailsQueryOptions({ ...overview, show_period_growth: true })
    let resolveMetadata: (value: typeof metadata) => void = () => {}
    const pending = new Promise<typeof metadata>((resolve) => { resolveMetadata = resolve })
    vi.mocked(graphqlQuery).mockReturnValueOnce(pending).mockResolvedValueOnce(summary)

    const abandoned = client.fetchQuery(query).catch((error: unknown) => error)
    const kept = client.fetchQuery(growthQuery)
    expect(graphqlQuery).toHaveBeenCalledTimes(1)
    await client.cancelQueries({ queryKey: query.queryKey })
    expect(vi.mocked(graphqlQuery).mock.calls[0]?.[2]?.signal?.aborted).toBe(false)
    resolveMetadata(metadata)

    expect(await abandoned).toMatchObject({ message: 'CancelledError' })
    expect(await kept).toMatchObject({ totalIncome: 2025 })
    expect(graphqlQuery).toHaveBeenCalledTimes(2)
  })

  it('does not start a budget read or seed late metadata after SSR cancellation', async () => {
    const client = new QueryClient()
    const query = entityDetailsQueryOptions(overview)
    let resolveMetadata: (value: typeof metadata) => void = () => {}
    const pending = new Promise<typeof metadata>((resolve) => { resolveMetadata = resolve })
    vi.mocked(graphqlQuery).mockReturnValueOnce(pending)

    const fetch = client.fetchQuery(query)
    const rejection = fetch.catch((error: unknown) => error)
    await client.cancelQueries({ queryKey: query.queryKey })
    expect(vi.mocked(graphqlQuery).mock.calls[0]?.[2]?.signal?.aborted).toBe(true)
    resolveMetadata(metadata)
    expect(await rejection).toMatchObject({ name: 'Error', message: 'CancelledError' })
    // The mocked transport deliberately resolves even though its signal aborted.
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    expect(graphqlQuery).toHaveBeenCalledTimes(1)
    expect(dehydrate(client, { shouldDehydrateQuery: () => true }).queries.map(
      ({ queryKey }) => queryKey,
    )).toEqual([query.queryKey])
  })
})
