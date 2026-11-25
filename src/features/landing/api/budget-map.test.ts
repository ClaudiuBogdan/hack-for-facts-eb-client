import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroupedSeriesDataRequest } from '@/lib/map-series/interfaces'
import type { SeriesConfiguration } from '@/schemas/charts'

const fetchGroupedSeriesData = vi.fn()
vi.mock('@/lib/api/map-series', () => ({ fetchGroupedSeriesData: (request: GroupedSeriesDataRequest) => fetchGroupedSeriesData(request) }))

const { fetchBudgetFigures } = await import('./budget-map')

describe('the budget map request', () => {
  beforeEach(() => {
    fetchGroupedSeriesData.mockReset()
    fetchGroupedSeriesData.mockResolvedValue({ payload: { data: 'siruta_code,income,expenses\n54975,10,8\n' }, warnings: [] })
  })

  it('asks for the reported receipts and payments, with no exclusions on either series', async () => {
    const figures = await fetchBudgetFigures('2025')
    expect(figures.byUat.get('54975')).toEqual({ income: 10, expenses: 8 })

    const request = fetchGroupedSeriesData.mock.calls[0]![0] as GroupedSeriesDataRequest
    expect(request.granularity).toBe('UAT')
    const sent = request.series as SeriesConfiguration[]
    expect(sent.map((series) => [series.id, series.filter.account_category])).toEqual([
      ['income', 'vn'],
      ['expenses', 'ch'],
    ])
    for (const series of sent) {
      // The entity page shows the reported execution; the analytics defaults (`withDefaultExcludes`) would drop transfers.
      expect(series.filter.exclude).toBeUndefined()
      expect(series.filter).toMatchObject({
        report_period: { type: 'YEAR', selection: { interval: { start: '2025', end: '2025' } } },
        report_type: 'Executie bugetara agregata la nivel de ordonator principal',
        is_territorial_executive: true,
        normalization: 'total',
        currency: 'RON',
        inflation_adjusted: false,
      })
    }
  })

  it('sends the landing\'s request when no count or level is named', async () => {
    await fetchBudgetFigures('2025')
    await fetchBudgetFigures('2025', { normalization: 'total', granularity: 'UAT' })
    // The server caches by the whole request: the map page's totals per primărie must be the landing's.
    expect(fetchGroupedSeriesData.mock.calls[1]![0]).toEqual(fetchGroupedSeriesData.mock.calls[0]![0])
  })

  it('asks per inhabitant and per county when told to, still with no exclusions', async () => {
    await fetchBudgetFigures('2019', { normalization: 'per_capita', granularity: 'County' })
    const request = fetchGroupedSeriesData.mock.calls[0]![0] as GroupedSeriesDataRequest
    expect(request.granularity).toBe('County')
    const sent = request.series as SeriesConfiguration[]
    expect(sent.map((series) => [series.id, series.filter.account_category])).toEqual([
      ['income', 'vn'],
      ['expenses', 'ch'],
    ])
    for (const series of sent) {
      expect(series.filter.exclude).toBeUndefined()
      expect(series.filter).toMatchObject({
        report_period: { type: 'YEAR', selection: { interval: { start: '2019', end: '2019' } } },
        report_type: 'Executie bugetara agregata la nivel de ordonator principal',
        is_territorial_executive: true,
        normalization: 'per_capita',
        currency: 'RON',
        inflation_adjusted: false,
      })
    }
  })

  it('reads a county level answer by county code', async () => {
    fetchGroupedSeriesData.mockResolvedValue({ payload: { data: 'siruta_code,income,expenses\nCJ,9632.5,9552.25\nB,,\n' }, warnings: [] })
    const figures = await fetchBudgetFigures('2025', { normalization: 'per_capita', granularity: 'County' })
    expect(figures.byUat.get('CJ')).toEqual({ income: 9632.5, expenses: 9552.25 })
    expect(figures.byUat.get('B')).toEqual({ income: null, expenses: null })
    expect(figures.outsideMap).toBe(0)
  })
})
