import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, stateOf } from '../lib/company-analytics-url'
import { planBreakdown, planRecords, planSeries, planStats, resolveQuestion } from './company-analytics-plan'
import { releaseFixture } from './company-analytics.fixture'

/**
 * A question against a release's capabilities: its year and measure from
 * the release (FY2024 by default, every year from 2008 offered), what the
 * release cannot answer said before any read, and every read's key pinned
 * to the release it was resolved from.
 */

describe('resolveQuestion', () => {
  it('answers the bare page with the release’s defaults: FY2024, turnover, the companies listed by it', () => {
    const question = resolveQuestion(DEFAULT_STATE, releaseFixture())
    expect(question).toMatchObject({ release: '7', year: 2024, metric: 'TURNOVER', unit: 'RON', kind: 'FLOW', problems: [], sortMetric: 'TURNOVER', direction: 'DESC', cohortMode: 'EACH_YEAR' })
    expect(question.scope).toEqual({ fiscalYear: 2024 })
  })

  it('offers 2008, the first fiscal year the release holds', () => {
    const question = resolveQuestion(stateOf({ an: '2008', indicator: 'employees' }), releaseFixture())
    expect(question.problems).toEqual([])
    expect(question.unit).toBe('HEADCOUNT')
    // The figures band reads only what 2008 offers: net result starts in 2019.
    expect(question.figureMetrics).toEqual(['EMPLOYEES', 'TURNOVER'])
  })

  it('says what the release cannot answer instead of asking the API for it', () => {
    const release = releaseFixture()
    expect(resolveQuestion(stateOf({ an: '2030' }), release).problems).toEqual([{ kind: 'year', year: 2030 }])
    expect(resolveQuestion(stateOf({ an: '2010', indicator: 'net_result' }), release).problems).toEqual([{ kind: 'metric', metric: 'NET_RESULT' }])
    expect(resolveQuestion(stateOf({ an: '2010', interval: 'net_result:0~' }), release).problems).toEqual([{ kind: 'range', metric: 'NET_RESULT' }])
    const many = Array.from({ length: 501 }, (_, index) => String(index + 1)).join(',')
    expect(resolveQuestion(stateOf({ cui: many }), release).problems).toEqual([{ kind: 'limit', field: 'cui', max: 500 }])
    expect(planStats(resolveQuestion(stateOf({ an: '2030' }), release)).enabled).toBe(false)
  })

  it('follows the cohort selected in the year when the question filters the year’s statements', () => {
    expect(resolveQuestion(stateOf({ interval: 'turnover:10000000~' }), releaseFixture()).cohortMode).toBe('REFERENCE_YEAR')
    expect(resolveQuestion(stateOf({ interval: 'turnover:10000000~', cohorta: 'fiecare-an' }), releaseFixture()).cohortMode).toBe('EACH_YEAR')
  })

  it('pins every read’s key to the release, so one release’s answer never serves another', () => {
    const seven = resolveQuestion(DEFAULT_STATE, releaseFixture())
    const eight = resolveQuestion(DEFAULT_STATE, releaseFixture({ release: { releaseId: '8', publishedAt: null, active: true } }))
    for (const plan of [planStats, (q: typeof seven) => planBreakdown(q, 'COUNTY', 25), (q: typeof seven) => planSeries(q, releaseFixture()), (q: typeof seven) => planRecords(q, null)]) {
      expect(plan(seven).key).toContain('7')
      expect(plan(seven).key).not.toEqual(plan(eight).key)
    }
  })

  it('draws the series over every year of the release, gaps included', () => {
    const plan = planSeries(resolveQuestion(DEFAULT_STATE, releaseFixture()), releaseFixture())
    expect(plan.key.slice(-2)).toEqual([2008, 2025])
  })

  it('does not ask for the cohort of companies that did not file: the API refuses it', () => {
    const question = resolveQuestion(stateOf({ depunere: 'nu', cohorta: 'an-referinta' }), releaseFixture())
    expect(planSeries(question, releaseFixture()).enabled).toBe(false)
    expect(planSeries(resolveQuestion(stateOf({ depunere: 'nu' }), releaseFixture()), releaseFixture()).enabled).toBe(true)
  })
})
