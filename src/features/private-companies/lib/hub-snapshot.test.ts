import { describe, expect, it } from 'vitest'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import { caenDivision } from './caen-divisions'
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

  it('keeps an impossible headcount out of the employer ranking', () => {
    // The largest real employer reports 23,666; the read drops counts over 50,000.
    expect(Math.max(...SNAPSHOT.leaders.employees.map((leader) => leader.value))).toBeLessThan(50_000)
  })

  it('names every sector from the nomenclature, and sorts them by turnover', () => {
    expect(SNAPSHOT.sectors.every((sector) => caenDivision(sector.division) !== undefined)).toBe(true)
    const turnover = SNAPSHOT.sectors.map((sector) => sector.turnover)
    expect(turnover).toEqual([...turnover].sort((a, b) => b - a))
    expect(sum(turnover)).toBeLessThanOrEqual(SNAPSHOT.national.turnover)
    expect(sum(SNAPSHOT.sectors.map((sector) => sector.activeFirms))).toBeLessThanOrEqual(SNAPSHOT.national.activeFirms)
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

  it('sorts the new companies’ sectors by count, within the year’s total, each named from the nomenclature', () => {
    expect(SNAPSHOT.newFirmsBySector.every((entry) => caenDivision(entry.division) !== undefined)).toBe(true)
    const counts = SNAPSHOT.newFirmsBySector.map((entry) => entry.firms)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
    expect(sum(counts)).toBeLessThanOrEqual(SNAPSHOT.national.newFirms)
  })
})
