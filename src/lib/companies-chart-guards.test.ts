import { describe, expect, it } from 'vitest'
import { ChartSchema, type AnalyticsSeries, type Chart } from '@/schemas/charts'
import { getCompleteOperandSeriesIds } from './chart-calculation-utils'
import { companiesAggregateProblem, companiesChartProblems, getCompaniesDependentSeriesIds, nonAnnualSeries } from './companies-chart-guards'

/**
 * What a chart may do with company figures, enforced at draw time: a saved
 * or shared address reaches the renderer without passing through the editor.
 */

function chart(series: unknown[], chartType: Chart['config']['chartType'] = 'line'): Chart {
  return ChartSchema.parse({ id: 'c', title: 't', config: { chartType }, series })
}

const companies = { id: 'co', type: 'companies-analytics', label: 'Turnover', metric: 'TURNOVER', release: { id: '7', policy: 'pinned' } }
const budgetYearly = { id: 'b', type: 'line-items-aggregated-yearly', label: 'Budget', filter: { report_period: { type: 'YEAR', selection: { interval: { start: '2016', end: '2025' } } }, account_category: 'ch' } }
const budgetMonthly = { ...budgetYearly, id: 'm', filter: { ...budgetYearly.filter, report_period: { type: 'MONTH', selection: { interval: { start: '2024-01', end: '2024-12' } } } } }
const ratio = { id: 'r', type: 'aggregated-series-calculation', label: 'Ratio', calculation: { op: 'divide', args: ['co', 'b'] } }
const ofRatio = { id: 'rr', type: 'aggregated-series-calculation', label: 'Ratio x2', calculation: { op: 'multiply', args: ['r', 2] } }

describe('companies chart guards', () => {
  it('counts every calculation that depends on a company series, at any depth, as a company figure — and as a complete-operand one', () => {
    const series = chart([companies, budgetYearly, ratio, ofRatio]).series
    expect([...getCompaniesDependentSeriesIds(series)].sort()).toEqual(['co', 'r', 'rr'])
    expect([...getCompleteOperandSeriesIds(series)].sort()).toEqual(['co', 'r', 'rr'])
  })

  it('draws company figures beside annual series', () => {
    expect(companiesChartProblems(chart([companies, budgetYearly]))).toEqual({ blocked: new Set(), warnings: [] })
  })

  it('refuses to mix them with a monthly series — by its saved period, or by what it read', () => {
    const mixed = chart([companies, budgetMonthly, ratio])
    const problems = companiesChartProblems(mixed)
    expect([...problems.blocked].sort()).toEqual(['co', 'r'])
    expect(problems.warnings[0]?.message).toMatch(/annual/u)
    expect(nonAnnualSeries(mixed).map((series) => series.id)).toEqual(['m'])
    // A source whose saved period says nothing (a static dataset) is known by its x-axis once read.
    const staticMonthly = chart([companies, { id: 's', type: 'static-series', label: 'Static', seriesId: 'x' }])
    const read = new Map<string, AnalyticsSeries>([['s', { seriesId: 's', xAxis: { name: 'Period', type: 'STRING', unit: 'month' }, yAxis: { name: 'v', type: 'FLOAT', unit: 'RON' }, data: [] }]])
    expect([...companiesChartProblems(staticMonthly, read).blocked]).toEqual(['co'])
  })

  it('ignores a disabled monthly series', () => {
    expect(companiesChartProblems(chart([companies, { ...budgetMonthly, enabled: false }])).blocked.size).toBe(0)
  })

  it('knows an enabled calculation over a disabled monthly source as monthly — by the source’s saved period, or by what the calculation computed', () => {
    const derived = { id: 'd', type: 'aggregated-series-calculation', label: 'Monthly ×2', calculation: { op: 'multiply', args: ['m', 2] } }
    const ofDerived = { id: 'dd', type: 'aggregated-series-calculation', label: 'Monthly ×4', calculation: { op: 'multiply', args: ['d', 2] }, enabled: true }
    const mixed = chart([companies, { ...budgetMonthly, enabled: false }, { ...derived, enabled: false }, ofDerived])
    // At any depth, through a disabled calculation too.
    expect(nonAnnualSeries(mixed).map((series) => series.id)).toEqual(['dd'])
    expect([...companiesChartProblems(mixed).blocked]).toEqual(['co'])
    // A source whose saved period says nothing: the calculation's computed x-axis says it.
    const staticSource = { id: 's', type: 'static-series', label: 'Static', seriesId: 'x', enabled: false }
    const overStatic = chart([companies, staticSource, { ...derived, calculation: { op: 'multiply', args: ['s', 2] } }])
    const computed = new Map<string, AnalyticsSeries>([['d', { seriesId: 'd', xAxis: { name: 'Period', type: 'STRING', unit: 'month' }, yAxis: { name: 'v', type: 'FLOAT', unit: '' }, data: [] }]])
    expect(companiesChartProblems(overStatic).blocked.size).toBe(0)
    expect([...companiesChartProblems(overStatic, computed).blocked]).toEqual(['co'])
  })

  it('draws company figures only as line or bar trends, or a single-year bar comparison', () => {
    expect(companiesChartProblems(chart([companies], 'bar')).blocked.size).toBe(0)
    expect(companiesChartProblems(chart([companies], 'bar-aggr')).blocked.size).toBe(0)
    for (const type of ['area', 'pie-aggr', 'treemap-aggr', 'sankey-aggr'] as const) {
      expect(companiesChartProblems(chart([companies], type)).blocked.has('co')).toBe(true)
    }
  })

  it('compares a company figure for one year only: no sum of years of balances, headcounts or counts', () => {
    expect(companiesAggregateProblem('co', ['2024'])).toBeNull()
    expect(companiesAggregateProblem('co', [])).toBeNull()
    expect(companiesAggregateProblem('co', ['2023', '2024'])?.type).toBe('invalid_aggregated_value')
  })
})
