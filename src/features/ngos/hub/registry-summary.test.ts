import { describe, expect, it } from 'vitest'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import { NGO_REGISTRY_SUMMARY as SUMMARY } from './registry-summary'

/**
 * The summary is generated (`scripts/summarize-ngo-registry.mjs`); these
 * hold every refresh to the arithmetic the page relies on, so a broken
 * capture fails here rather than as a wrong figure on `/ong-uri`.
 */
describe('NGO_REGISTRY_SUMMARY', () => {
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)

  it('covers each of the 42 counties once, with its residents', () => {
    expect(SUMMARY.counties.map((county) => county.code).sort()).toEqual(ROMANIA_COUNTIES.map((county) => county.code).sort())
    for (const county of SUMMARY.counties) {
      expect(county.residents).toBeGreaterThan(100_000)
      expect(county.source).toBe(county.source.toUpperCase())
    }
  })

  it('accounts for every entry by its status, once repeated rows are dropped', () => {
    expect(sum(Object.values(SUMMARY.status)) + SUMMARY.repeated).toBe(SUMMARY.entries)
  })

  it('splits the registered NGOs by legal form, and between the counties and no county', () => {
    expect(sum(Object.values(SUMMARY.categories))).toBe(SUMMARY.status.registered)
    expect(sum(SUMMARY.counties.map((county) => county.registered)) + SUMMARY.noCounty).toBe(SUMMARY.status.registered)
    expect(SUMMARY.publicUtility).toBeLessThan(SUMMARY.status.registered)
  })

  it('has one row per year from 2001 to the summary’s year, and the counties no more new entries than the country', () => {
    const years = SUMMARY.registrations.map((entry) => entry.year)
    expect(years[0]).toBe(2001)
    expect(years).toEqual(Array.from({ length: SUMMARY.year - 2000 }, (_, index) => 2001 + index))
    const latest = SUMMARY.registrations[SUMMARY.registrations.length - 1]?.count ?? 0
    expect(sum(SUMMARY.counties.map((county) => county.added))).toBeLessThanOrEqual(latest)
  })

  // A year's numbers keep arriving for a few weeks after it ends (243 of 2025's are dated 2026), so reaching past it is what lets the figure settle.
  it('reaches past the summary’s year', () => {
    expect(SUMMARY.lastRegistration > `${SUMMARY.year}-12-31`).toBe(true)
    expect(SUMMARY.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(sum(SUMMARY.registrations.map((entry) => entry.count))).toBeLessThanOrEqual(SUMMARY.entries - SUMMARY.repeated)
  })
})
