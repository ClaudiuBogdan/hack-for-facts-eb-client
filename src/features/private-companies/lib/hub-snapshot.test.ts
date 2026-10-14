import { describe, expect, it } from 'vitest'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import { CompanyAnalysisActivityZ } from '@/schemas/company-analytics'
import { COMPANY_HUB_ACTIVITIES as ACTIVITIES } from './hub-activities'
import { COMPANY_HUB_SNAPSHOT as SNAPSHOT } from './hub-snapshot'

/**
 * The snapshot is generated, never edited by hand; these hold a regenerated
 * one to the shape the page reads, and its parts to each other. A figure that
 * stops reconciling with its total is a broken read, not a rounding choice.
 */
describe('companies hub snapshot', () => {
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)

  it('holds every county once, with a population', () => {
    expect(SNAPSHOT.counties.map((county) => county.code).sort()).toEqual(ROMANIA_COUNTIES.map((county) => county.code).sort())
    expect(SNAPSHOT.counties.every((county) => county.population > 0)).toBe(true)
  })

  it('adds the counties up to the country, give or take the companies with no county', () => {
    expect(sum(SNAPSHOT.counties.map((county) => county.population))).toBe(SNAPSHOT.national.population)
    const placed = sum(SNAPSHOT.counties.map((county) => county.activeFirms))
    expect(placed).toBeLessThanOrEqual(SNAPSHOT.national.activeFirms)
    // 593 companies in business had no county on 23 September 2026.
    expect(SNAPSHOT.national.activeFirms - placed).toBeLessThan(1_000)
    expect(sum(SNAPSHOT.counties.map((county) => county.newFirms))).toBeLessThanOrEqual(SNAPSHOT.national.newFirms)
    expect(sum(SNAPSHOT.counties.map((county) => county.turnover))).toBeLessThanOrEqual(SNAPSHOT.national.turnover)
  })

  it('ranks ten companies per measure, highest first, each a served CUI', () => {
    for (const leaders of [SNAPSHOT.leaders.turnover, SNAPSHOT.leaders.employees]) {
      expect(leaders).toHaveLength(10)
      expect(leaders.every((leader) => /^\d{1,10}$/.test(leader.cui))).toBe(true)
      const values = leaders.map((leader) => leader.value)
      expect(values).toEqual([...values].sort((a, b) => b - a))
    }
  })

  it('names each leader by the release’s derived selection, as the API serves it, or by none', () => {
    const leaders = [...SNAPSHOT.leaders.turnover, ...SNAPSHOT.leaders.employees]
    for (const leader of leaders) {
      if (leader.activity === null) continue
      expect(CompanyAnalysisActivityZ.parse(leader.activity)).toEqual(leader.activity)
      expect(leader.activity.derived).toBe(true)
      expect(leader.activity.basis).not.toBeNull()
    }
  })

  it('keeps an impossible headcount out of the employer ranking', () => {
    // The largest real employer reports 23,666; the read drops counts over 50,000.
    expect(Math.max(...SNAPSHOT.leaders.employees.map((leader) => leader.value))).toBeLessThan(50_000)
  })

  it('splits the statements into the five size classes, smallest first', () => {
    expect(SNAPSHOT.sizeClasses.map((row) => row.key)).toEqual(['0', '1-9', '10-49', '50-249', '250+'])
    // Only statements with a headcount have a size, so the classes may hold fewer than all of them.
    expect(sum(SNAPSHOT.sizeClasses.map((row) => row.firms))).toBeLessThanOrEqual(SNAPSHOT.national.statements)
    expect(sum(SNAPSHOT.sizeClasses.map((row) => row.turnover))).toBeLessThanOrEqual(SNAPSHOT.national.turnover)
    expect(sum(SNAPSHOT.sizeClasses.map((row) => row.employees))).toBe(SNAPSHOT.national.employees)
  })

  it('counts registrations for every year up to the snapshot’s, never more still in business than founded', () => {
    const years = SNAPSHOT.registrations.map((entry) => entry.year)
    expect(years[years.length - 1]).toBe(SNAPSHOT.fiscalYear)
    expect(years).toEqual(Array.from({ length: years.length }, (_, index) => (years[0] ?? 0) + index))
    expect(SNAPSHOT.registrations.every((entry) => entry.active <= entry.registered)).toBe(true)
    expect(SNAPSHOT.registrations[SNAPSHOT.registrations.length - 1]?.registered).toBe(SNAPSHOT.national.newFirms)
  })

  it('runs the release’s years without a gap to the fiscal year, each measure reported by at most its filers', () => {
    const years = SNAPSHOT.years.map((entry) => entry.year)
    expect(years[years.length - 1]).toBe(SNAPSHOT.fiscalYear)
    expect(years.every((value, index) => index === 0 || value === (years[index - 1] ?? 0) + 1)).toBe(true)
    for (const entry of SNAPSHOT.years) {
      for (const measure of [entry.turnover, entry.netResult, entry.employees]) expect(measure.reported).toBeLessThanOrEqual(entry.filers)
    }
    expect(SNAPSHOT.yearsSource.releaseId).toMatch(/^\d+$/)
  })

  it('holds each year’s measure as a finite sum or a gap with its reason, never both or neither', () => {
    for (const entry of SNAPSHOT.years) {
      for (const measure of [entry.turnover, entry.netResult, entry.employees]) {
        if (measure.sum === null) expect(measure.gap).not.toBeNull()
        else {
          expect(Number.isFinite(measure.sum)).toBe(true)
          expect(measure.gap).toBeNull()
        }
      }
    }
  })

  it('keeps an impossible headcount out of the years', () => {
    const last = SNAPSHOT.years[SNAPSHOT.years.length - 1]
    // The release counts fewer companies (legal persons, one ONRC edition) than the year's raw figures: never more
    // employees — an unfiltered 2025, with its 122,690-employee keying error, would be.
    expect(last?.employees.sum ?? Infinity).toBeLessThanOrEqual(SNAPSHOT.national.employees)
    // The country's headcount moves by a few percent a year: an unfiltered 2011, 1.3 million up and back, would not.
    const sums = SNAPSHOT.years.map((entry) => entry.employees.sum ?? 0)
    sums.forEach((sum, index) => {
      const before = sums[index - 1]
      const after = sums[index + 1]
      if (before === undefined || after === undefined) return
      expect(Math.abs(sum - (before + after) / 2) / ((before + after) / 2)).toBeLessThan(0.2)
    })
  })
})

/**
 * The „Pe domenii" rankings, read from the public API (`hub-activities.ts`):
 * the analysis's derived activity selection, each exact (source, code,
 * revision) its own group — never an ANAF code read into a division.
 */
describe('companies hub activity rankings', () => {
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)
  const rankings = [ACTIVITIES.turnover, ACTIVITIES.employees, ACTIVITIES.activeFirms]

  it('reads the same release and year as the hub’s years', () => {
    expect(ACTIVITIES.source.releaseId).toBe(SNAPSHOT.yearsSource.releaseId)
    expect(ACTIVITIES.source.fiscalYear).toBe(SNAPSHOT.fiscalYear)
    expect(ACTIVITIES.source.onrcPublished).toBe(SNAPSHOT.yearsSource.onrcPublished)
  })

  it('adds its rows, the rest and the unselected companies up to the API’s own totals', () => {
    for (const ranking of rankings) {
      const parts = (pick: (entry: { readonly value: number | null; readonly companies: number }) => number | null) =>
        sum(ranking.rows.map((row) => pick(row) ?? 0)) + (pick(ranking.other) ?? 0) + sum(ranking.unclassified.map((entry) => pick(entry) ?? 0))
      expect(parts((entry) => entry.value)).toBeCloseTo(ranking.total, 0)
      expect(parts((entry) => entry.companies)).toBe(ranking.companies)
      expect(ranking.other.groups).toBe(ranking.groupCount - ranking.rows.length)
    }
    // The qualified turnover is its own population, not the raw sum of every statement read.
    expect(ACTIVITIES.turnover.total).toBe(2_780_302_718_022)
    expect(ACTIVITIES.turnover.total).not.toBe(SNAPSHOT.national.turnover)
    // The same headcounts the years count: the release's, within the hub's ceiling.
    expect(ACTIVITIES.employees.total).toBe(SNAPSHOT.years[SNAPSHOT.years.length - 1]?.employees.sum)
  })

  it('keys every row by its exact source, code and revision, and never mixes two revisions in one row', () => {
    for (const ranking of rankings) {
      for (const row of ranking.rows) {
        expect(row.key).toBe(row.source === 'ONRC' ? `onrc:${row.revision}:${row.code}` : `anaf:${row.code}`)
        // ANAF publishes no revision; ONRC's class carries its own.
        if (row.source === 'ANAF') expect(row.revision).toBeNull()
        else expect(row.revision).toMatch(/^rev[0-3]$/u)
      }
      const values = ranking.rows.map((row) => row.value)
      expect(values).toEqual([...values].sort((a, b) => b - a))
    }
    // The same digits in two revisions stay two rows (Rev.2 and Rev.3 4941 among the employers).
    const keys = ACTIVITIES.employees.rows.map((row) => row.key)
    expect(keys).toContain('onrc:rev2:4941')
    expect(keys).toContain('onrc:rev3:4941')
  })

  it('keeps the companies with no selected activity apart, by why — several ONRC classes above all', () => {
    for (const ranking of rankings) {
      expect(ranking.unclassified.map((entry) => entry.basis).every((basis) => ['ONRC_MULTIPLE_CLASSES', 'ANAF_FISCAL_UNCATALOGUED', 'NO_QUALIFIED_SELECTION'].includes(basis))).toBe(true)
    }
    expect(ACTIVITIES.turnover.unclassified.find((entry) => entry.basis === 'ONRC_MULTIPLE_CLASSES')?.value).toBe(588_488_630_433)
  })
})
