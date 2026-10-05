import { describe, expect, it } from 'vitest'

import type { ApprovedTotalCell, ApprovedTotals, AuthorityDetail, AuthorityList } from '@/schemas/national-budget-page'
import { nationalBudgetMockAdapter as adapter } from './national-budget-page-api.mock'
import { nationalBudgetLiveAdapter } from './national-budget-page-api'

function ok<T extends { status: string }>(value: T | { status: 'unavailable' }): T {
  if (value.status !== 'ok') throw new Error(`expected ok, got ${JSON.stringify(value)}`)
  return value as T
}

function amount(cell: ApprovedTotalCell): string | null {
  if (cell.status !== 'ok') return null
  return cell.origin === 'real_sample' ? cell.line.amountThousandLei : cell.amountThousandLei
}

describe('catalog', () => {
  it('indexes 241 selected releases, January 2006 to July 2026, with the six published gaps', async () => {
    const catalog = await adapter.getCatalog()
    if (catalog.status === 'unavailable') throw new Error('unavailable')
    const selected = catalog.releases.filter((release) => release.status === 'selected')
    expect(selected).toHaveLength(241)
    expect(catalog.releases[0].periodEnd).toBe('2006-01-31')
    expect(catalog.releases.slice(-1)[0]?.periodEnd).toBe('2026-07-31')
    expect(catalog.releases.filter((release) => release.status === 'gap').map((release) => release.periodEnd.slice(0, 7))).toEqual([
      '2008-12',
      '2012-09',
      '2012-11',
      '2019-07',
      '2024-01',
      '2025-05',
    ])
  })

  it('lists the seven reviewed editions and the draft separately', async () => {
    const catalog = await adapter.getCatalog()
    if (catalog.status === 'unavailable') throw new Error('unavailable')
    expect(catalog.editions.filter((edition) => edition.review === 'reviewed').map((edition) => edition.budgetYear)).toEqual([
      2019, 2020, 2021, 2022, 2023, 2024, 2025,
    ])
    expect(catalog.editions.find((edition) => edition.key === '2026-draft')).toMatchObject({ status: 'draft', review: 'unreviewed' })
  })
})

describe('approved totals', () => {
  it('reads each 2025 budget from its explicit descriptor, matching the printed unit witnesses', async () => {
    const totals = ok<ApprovedTotals>(await adapter.getApprovedTotals({ edition: '2025', targetYear: 2025, creditType: 'budget_credits' }))
    const byFund = Object.fromEntries(totals.funds.map((fund) => [fund.fund, fund]))
    // Revenue totals equal the law PDF tokens pinned in approved-profiles.ts (357.353.033 …).
    expect(amount(byFund.state_budget.revenue)).toBe('357353033')
    expect(amount(byFund.state_social_insurance.revenue)).toBe('155110881')
    expect(amount(byFund.health_insurance.revenue)).toBe('77220381')
    expect(amount(byFund.unemployment_insurance.revenue)).toBe('2857392')
    expect(amount(byFund.state_budget.credits)).toBe('499582980')
  })

  it('keeps forecasts per edition: the 2024 law’s estimate for 2025 is not the 2025 law’s approval', async () => {
    const forecast = ok<ApprovedTotals>(await adapter.getApprovedTotals({ edition: '2024', targetYear: 2025, creditType: 'budget_credits' }))
    const state = forecast.funds.find((fund) => fund.fund === 'state_budget')
    expect(state?.credits.status).toBe('ok')
    if (state?.credits.status === 'ok' && state.credits.origin === 'real_sample') {
      expect(state.credits.line.measure).toBe('forecast')
      expect(state.credits.line.budgetYear).toBe(2024)
      expect(state.credits.line.amountThousandLei).not.toBe('499582980')
    }
  })

  it('answers not_in_sample for commitment credits the sample lacks, never zero', async () => {
    const totals = ok<ApprovedTotals>(await adapter.getApprovedTotals({ edition: '2025', targetYear: 2025, creditType: 'commitment_credits' }))
    expect(totals.funds.find((fund) => fund.fund === 'state_budget')?.credits).toEqual({ status: 'unavailable', reason: 'not_in_sample' })
  })

  it('serves the draft’s state credits only, and no revenue', async () => {
    const totals = ok<ApprovedTotals>(await adapter.getApprovedTotals({ edition: '2026-draft', targetYear: 2026, creditType: 'budget_credits' }))
    const state = totals.funds.find((fund) => fund.fund === 'state_budget')
    expect(amount(state!.credits)).toBe('527413262')
    expect(state?.revenue).toEqual({ status: 'unavailable', reason: 'not_extracted' })
    expect(totals.funds.find((fund) => fund.fund === 'health_insurance')?.credits.status).toBe('unavailable')
  })

  it('refuses a target year outside the edition', async () => {
    expect(await adapter.getApprovedTotals({ edition: '2025', targetYear: 2030, creditType: 'budget_credits' })).toEqual({
      status: 'unavailable',
      reason: 'not_in_edition',
    })
  })
})

describe('approved series', () => {
  it('has one point per edition and target year, the approved year first', async () => {
    const series = await adapter.getApprovedSeries({ fund: 'state_budget', line: 'credits', creditType: 'budget_credits' })
    if (series.status !== 'ok') throw new Error('unavailable')
    // 7 reviewed editions × 4 years + the draft's 4 years.
    expect(series.points).toHaveLength(32)
    const for2025 = series.points.filter((point) => point.measureYear === 2025)
    expect(for2025.map((point) => [point.edition, point.kind])).toEqual([
      ['2022', 'forecast'],
      ['2023', 'forecast'],
      ['2024', 'forecast'],
      ['2025', 'approved'],
    ])
  })
})

describe('authorities', () => {
  it('keeps the real 2025 row apart from the synthetic scenario, and the scenario adds up to the real total', async () => {
    for (const targetYear of [2025, 2026, 2027, 2028]) {
      const list = ok<AuthorityList>(await adapter.getAuthorities({ edition: '2025', targetYear, creditType: 'budget_credits' }))
      const real = list.rows.filter((row) => row.origin === 'real_sample')
      expect(real.map((row) => row.code)).toEqual(['01'])
      expect(list.rows.filter((row) => row.origin === 'synthetic_demo').every((row) => row.code?.startsWith('D'))).toBe(true)
      const sum = list.rows.reduce((acc, row) => acc + Number(row.amountThousandLei), 0)
      expect(sum).toBe(Number(list.totalThousandLei))
    }
  })

  it('serves the draft’s 55 authorities with no codes and no commitment credits', async () => {
    const list = ok<AuthorityList>(await adapter.getAuthorities({ edition: '2026-draft', targetYear: 2026, creditType: 'budget_credits' }))
    expect(list.rows).toHaveLength(55)
    expect(list.rows.every((row) => row.code === null && row.origin === 'draft_static')).toBe(true)
    expect(await adapter.getAuthorities({ edition: '2026-draft', targetYear: 2026, creditType: 'commitment_credits' })).toEqual({
      status: 'unavailable',
      reason: 'not_extracted',
    })
  })

  it('answers not_in_sample for editions without an authority list in the sample', async () => {
    expect(await adapter.getAuthorities({ edition: '2023', targetYear: 2023, creditType: 'budget_credits' })).toEqual({
      status: 'unavailable',
      reason: 'not_in_sample',
    })
  })

  it('marks the real authority detail incomplete (the sample is the annex’s first records)', async () => {
    const detail = ok<AuthorityDetail>(
      await adapter.getAuthorityDetail({ edition: '2025', targetYear: 2025, creditType: 'budget_credits', authorityKey: 'cod-01' }),
    )
    expect(detail.complete).toBe(false)
    expect(detail.lines[0]).toMatchObject({ level: 0, code: '5001', origin: 'real_sample' })
    expect(detail.lines.every((line) => line.provenance !== null)).toBe(true)
  })

  it('splits a synthetic authority exactly, groups equal to their titles', async () => {
    const list = ok<AuthorityList>(await adapter.getAuthorities({ edition: '2025', targetYear: 2025, creditType: 'budget_credits' }))
    const demo = list.rows.find((row) => row.origin === 'synthetic_demo')!
    const detail = ok<AuthorityDetail>(
      await adapter.getAuthorityDetail({ edition: '2025', targetYear: 2025, creditType: 'budget_credits', authorityKey: demo.key }),
    )
    const value = (code: string) => Number(detail.lines.find((line) => line.code === code)?.amountThousandLei)
    const titles = detail.lines.filter((line) => line.level === 2).reduce((acc, line) => acc + Number(line.amountThousandLei), 0)
    expect(titles).toBe(Number(demo.amountThousandLei))
    expect(value('01') + value('70')).toBe(Number(demo.amountThousandLei))
  })
})

describe('execution releases', () => {
  it('serves the sample releases and names the gap of a held month', async () => {
    const december = await adapter.getExecutionRelease({ month: '2025-12' })
    expect(december.status).toBe('ok')
    if (december.status === 'ok') {
      expect(december.sourceUrl).toContain('bgc31122025.xlsx')
      expect(new Set(december.facts.map((fact) => fact.component))).toEqual(new Set(['state_budget', 'general_consolidated_budget']))
    }
    expect(await adapter.getExecutionRelease({ month: '2025-05' })).toEqual({
      status: 'gap',
      periodEnd: '2025-05-31',
      reason: 'incompatible_source',
    })
  })

  it('answers not_in_sample for a selected month the sample does not carry', async () => {
    expect(await adapter.getExecutionRelease({ month: '2025-07' })).toEqual({ status: 'unavailable', reason: 'not_in_sample' })
  })
})

describe('ANAF lane', () => {
  it('ranks the principal authorities so that every year adds up to its total', async () => {
    const anaf = await adapter.getAnafStateBudget()
    if (anaf.status !== 'ok') throw new Error('unavailable')
    expect(anaf.lastMonth).toMatch(/^\d{4}-\d{2}$/)
    for (const point of anaf.years) {
      const rows = anaf.authorities[String(point.year)]?.rows ?? []
      const sum = rows.reduce((acc, row) => acc + Number(row.lei), 0)
      expect(Math.abs(sum - Number(point.lei)), String(point.year)).toBeLessThan(1)
    }
  })

  it('agrees with the MF bulletin on the 2025 state budget, though the page keeps them apart', async () => {
    const anaf = await adapter.getAnafStateBudget()
    const december = await adapter.getExecutionRelease({ month: '2025-12' })
    if (anaf.status !== 'ok' || december.status !== 'ok') throw new Error('unavailable')
    const mf = december.facts.find((fact) => fact.component === 'state_budget' && fact.lineItem === 'cheltuieli totale' && fact.measure === 'amount')
    const anaf2025 = Number(anaf.years.find((point) => point.year === 2025)?.lei)
    expect(Math.abs(anaf2025 - Number(mf?.value)) / anaf2025).toBeLessThan(0.001)
  })
})

describe('live adapter', () => {
  it('says the API is pending instead of serving anything', async () => {
    expect(await nationalBudgetLiveAdapter.getCatalog()).toEqual({ status: 'unavailable', reason: 'api_pending' })
    expect(await nationalBudgetLiveAdapter.getExecutionRelease({ month: '2026-07' })).toEqual({ status: 'unavailable', reason: 'api_pending' })
  })
})
