import { describe, expect, it } from 'vitest'
import { chartUrlStateSchema } from '@/components/charts/page-schema'
import { CopiedSeriesSchema } from '@/schemas/charts'
import { buildCompaniesAnalyticsChartState } from './chart-links'

/**
 * The analysis page's „build a chart": the question as one pinned company
 * series, whose first fiscal year (2008) survives the chart's address, a
 * saved copy and a pasted one — the builder's 2016 default does not cut it.
 */

const OPTIONS = {
  title: 'Cifra de afaceri în județul Cluj, pe ani fiscali',
  label: 'Cifra de afaceri în județul Cluj',
  releaseId: '7',
  metric: 'TURNOVER' as const,
  scope: { county: { in: ['CJ'] }, financialRanges: [{ metric: 'TURNOVER' as const, min: '10000000.50' }] },
  referenceYear: 2024,
  cohortMode: 'REFERENCE_YEAR' as const,
  fromYear: 2008,
  toYear: 2025,
  now: '2026-10-02T12:00:00.000Z',
}

describe('buildCompaniesAnalyticsChartState', () => {
  it('pins the release and keeps the whole question on the series', () => {
    const { chart } = buildCompaniesAnalyticsChartState(OPTIONS)
    expect(chart.series).toHaveLength(1)
    expect(chart.series[0]).toMatchObject({
      type: 'companies-analytics',
      metric: 'TURNOVER',
      scope: OPTIONS.scope,
      referenceYear: 2024,
      cohortMode: 'REFERENCE_YEAR',
      dimensionBasis: 'release-snapshot',
      release: { id: '7', policy: 'pinned' },
      period: { type: 'YEAR', selection: { interval: { start: '2008', end: '2025' } } },
    })
    expect(chart.config.chartType).toBe('line')
  })

  it('keeps 2008 through the chart’s address, as the router parses it back', () => {
    const state = buildCompaniesAnalyticsChartState(OPTIONS)
    const parsed = chartUrlStateSchema.parse(JSON.parse(JSON.stringify(state)))
    expect(parsed.chart.config.yearRange).toEqual({ start: 2008, end: 2025 })
    expect(parsed.chart.series[0]).toMatchObject({ period: { selection: { interval: { start: '2008' } } }, release: { id: '7' } })
    expect(parsed).toEqual(state)
  })

  it('survives a copy and paste between charts', () => {
    const { chart } = buildCompaniesAnalyticsChartState(OPTIONS)
    const copied = CopiedSeriesSchema.parse(JSON.parse(JSON.stringify({ type: 'chart-series-copy', payload: chart.series })))
    expect(copied.payload[0]).toEqual(chart.series[0])
  })

  it('is the same link for the same question', () => {
    expect(buildCompaniesAnalyticsChartState(OPTIONS).chart.id).toBe(buildCompaniesAnalyticsChartState(OPTIONS).chart.id)
    expect(buildCompaniesAnalyticsChartState({ ...OPTIONS, releaseId: '8' }).chart.id).not.toBe(buildCompaniesAnalyticsChartState(OPTIONS).chart.id)
  })

  it('refuses a release pin that is not a release id', () => {
    const state = JSON.parse(JSON.stringify(buildCompaniesAnalyticsChartState(OPTIONS))) as { chart: { series: { release: { id: string } }[] } }
    state.chart.series[0]!.release.id = '7; drop'
    expect(chartUrlStateSchema.safeParse(state).success).toBe(false)
  })
})
