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
})
