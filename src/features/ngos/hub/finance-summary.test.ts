import { describe, expect, it } from 'vitest'
import { NGO_FINANCE_SUMMARY as FINANCE } from './finance-summary'

/**
 * The summary is generated (`scripts/summarize-ngo-finances.mjs`); these
 * hold every refresh to the arithmetic the page relies on, so a broken read
 * fails here rather than as a wrong figure on `/ngos`.
 */
describe('NGO_FINANCE_SUMMARY', () => {
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)

  it('splits the year’s revenue into its three sources exactly', () => {
    expect(FINANCE.sources.nonProfit + FINANCE.sources.economic + FINANCE.sources.special).toBe(FINANCE.revenue)
  })

  it('accounts for every statement and every leu by revenue class and by domain', () => {
    expect(sum(FINANCE.sizes.map((size) => size.statements))).toBe(FINANCE.statements)
    expect(sum(FINANCE.sizes.map((size) => size.revenue))).toBe(FINANCE.revenue)
    expect(sum(FINANCE.domains.map((domain) => domain.statements))).toBe(FINANCE.statements)
    expect(sum(FINANCE.domains.map((domain) => domain.revenue))).toBe(FINANCE.revenue)
    // No revenue, a negative one, or a blank one (unknown, never counted as none).
    const without = FINANCE.sizes.filter((size) => size.key === 'none' || size.key === 'negative' || size.key === 'unknown').reduce((total, size) => total + size.statements, 0)
    expect(FINANCE.statements - without).toBe(FINANCE.withRevenue)
    expect(FINANCE.sizes.find((size) => size.key === 'none')?.revenue).toBe(0)
    expect(FINANCE.sizes.find((size) => size.key === 'unknown')?.revenue ?? 0).toBe(0)
    expect(FINANCE.sizes.find((size) => size.key === 'negative')?.revenue ?? 0).toBeLessThanOrEqual(0)
  })

  it('has one row per year, in order, ending with the summary’s year and its totals, each saying its vintage', () => {
    const years = FINANCE.years.map((point) => point.year)
    expect(years).toEqual(Array.from({ length: years.length }, (_, index) => years[0]! + index))
    expect(FINANCE.years[FINANCE.years.length - 1]).toMatchObject({
      year: FINANCE.year,
      statements: FINANCE.statements,
      revenue: FINANCE.revenue,
      published: FINANCE.source.published,
    })
    for (const point of FINANCE.years) {
      // A file is published after its year ends; a first release within the year after.
      expect(point.published > `${point.year}-12-31`).toBe(true)
      expect(point.firstRelease).toBe(point.published < `${point.year + 2}-01-01`)
    }
  })

  it('ranks the leaders by revenue, each within the year’s total and named', () => {
    expect(FINANCE.leaders.length).toBeGreaterThanOrEqual(10)
    const revenues = FINANCE.leaders.map((leader) => leader.revenue)
    expect(revenues).toEqual([...revenues].sort((a, b) => b - a))
    expect(new Set(FINANCE.leaders.map((leader) => leader.cui)).size).toBe(FINANCE.leaders.length)
    for (const leader of FINANCE.leaders) {
      expect(leader.name.trim()).not.toBe('')
      expect(leader.revenue).toBeLessThan(FINANCE.revenue)
    }
  })

  it('leaves out only statements above 1 bn lei, and names them', () => {
    for (const statement of FINANCE.excluded) expect(statement.revenue).toBeGreaterThan(1_000_000_000)
  })
})
