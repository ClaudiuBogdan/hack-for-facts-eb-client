import { describe, expect, it } from 'vitest'
import { comparableRevenue, domainTotal, firstReleaseYears, leadingDomains, rankDomains, sizeClass } from './finance-figures'
import { financeFixture } from './test/finance-fixture'

const FINANCE = financeFixture()

describe('rankDomains', () => {
  it('ranks by organisations or by revenue, the catch-all code apart and never ranked', () => {
    expect(rankDomains(FINANCE, 'organizatii').ranked.map((domain) => domain.key)).toEqual(['sport', 'social', 'education', 'other', 'religion'])
    expect(rankDomains(FINANCE, 'venituri').ranked.map((domain) => domain.key)).toEqual(['education', 'social', 'sport', 'religion', 'other'])
    expect(rankDomains(FINANCE, 'organizatii').general).toMatchObject({ key: 'general', statements: 45 })
    expect(rankDomains(financeFixture({ domains: [] }), 'venituri')).toEqual({ ranked: [], general: null })
  })

  it('measures shares against the year’s statements or revenue', () => {
    expect(domainTotal(FINANCE, 'organizatii')).toBe(100)
    expect(domainTotal(FINANCE, 'venituri')).toBe(1_000_000_000)
  })
})

describe('leadingDomains', () => {
  it('names the domains with the most organisations and the most money, never the catch-all or the rest', () => {
    const { most, richest } = leadingDomains(FINANCE)
    expect(most?.key).toBe('sport')
    expect(richest?.key).toBe('education')
    expect(leadingDomains(financeFixture({ domains: [{ key: 'general', statements: 1, revenue: 1 }] }))).toEqual({ most: null, richest: null })
  })
})

describe('size classes', () => {
  it('finds a class, zero and negative revenue apart', () => {
    expect(sizeClass(FINANCE, 'over1m')?.statements).toBe(10)
    expect(sizeClass(FINANCE, 'none')).toMatchObject({ statements: 18, revenue: 0 })
    expect(sizeClass(FINANCE, 'negative')?.statements).toBe(2)
    expect(sizeClass(financeFixture({ sizes: [] }), 'none')).toBeNull()
  })
})

describe('vintages', () => {
  const year = (value: number, firstRelease: boolean) => ({ year: value, statements: 1, revenue: value, published: `${value + 1}-06-01`, firstRelease })

  it('compares a year with the one before only when both are first releases or both revisions', () => {
    expect(comparableRevenue(FINANCE)).toBeNull()
    expect(comparableRevenue(financeFixture({ years: [year(2024, true), year(2025, true)] }))).toBe(2024)
    expect(comparableRevenue(financeFixture({ years: [year(2024, false), year(2025, false)] }))).toBe(2024)
    expect(comparableRevenue(financeFixture({ years: [year(2025, true)] }))).toBeNull()
  })

  it('lists the years still at their first release', () => {
    expect(firstReleaseYears(FINANCE)).toEqual([2025])
  })
})
