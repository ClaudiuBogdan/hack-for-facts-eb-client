import { describe, expect, it } from 'vitest'
import {
  buildDerivedRows,
  computeDerived,
  DERIVED_INDICATORS,
  DERIVED_READS,
  derivedReadKey,
  derivedYear,
  formatDerived,
  isTownName,
  missingContext,
  type DerivedScopeData,
  type TerritoryDerivedData,
} from './territory-derived'

const def = (id: string) => DERIVED_INDICATORS.find((d) => d.id === id)!
const keyOf = (code: string) => derivedReadKey(DERIVED_READS.find((r) => r.code === code)!)

/** A scope from `{ CODE: { year: value } }`; a year left out is an absent cell. */
function scope(
  cells: Record<string, Record<number, number | null>>,
  flags: Record<string, Record<number, string>> = {},
): DerivedScopeData {
  const byKey = <T,>(entries: Record<string, Record<number, T>>) =>
    new Map(
      Object.entries(entries).map(([code, years]) => [
        keyOf(code),
        new Map(Object.entries(years).map(([year, value]) => [Number(year), value])),
      ]),
    )
  return { series: byKey(cells), flags: byKey(flags) }
}

const population = {
  POP108D: { 2023: 164_000, 2024: 162_200, 2025: 160_600 },
  POP107D: { 2023: 164_491, 2024: 163_012, 2025: 161_347, 2026: 160_228 },
}

describe('computeDerived', () => {
  it('reads births over three years as Σ events / Σ mid-year populations, per 1,000 a year', () => {
    const data = scope({ ...population, POP201D: { 2023: 1_000, 2024: 950, 2025: 911 } })
    const result = computeDerived(def('nascuti'), data, 2025)
    expect(result.pooled).toBe(true)
    expect(result.years).toEqual([2023, 2025])
    expect(result.value).toBeCloseTo((2_861 / 486_800) * 1000, 10)
    expect(result.parts).toEqual([2_861])
    expect(result.denominatorValue).toBe(486_800)
  })

  it('flags 3–19 events and withholds a rate under 3, showing the counts', () => {
    const small = computeDerived(def('decese'), scope({ ...population, POP206D: { 2023: 4, 2024: 5, 2025: 6 } }), 2025)
    expect(small.small).toBe(true)
    expect(small.value).not.toBeNull()
    const tiny = computeDerived(def('decese'), scope({ ...population, POP206D: { 2023: 1, 2024: 0, 2025: 1 } }), 2025)
    expect(tiny.value).toBeNull()
    expect(tiny.missing).toBe('prea puține evenimente pentru comparație')
    expect(tiny.events).toBe(2)
  })

  it('screens the domicile balance on arrivals plus departures, not on the balance', () => {
    const data = scope({
      ...population,
      POP307A: { 2023: 500, 2024: 500, 2025: 500 },
      POP308A: { 2023: 500, 2024: 500, 2025: 500 },
    })
    const result = computeDerived(def('sold-domiciliu'), data, 2025)
    expect(result.value).toBe(0)
    expect(result.small).toBe(false)
    expect(result.events).toBe(3_000)
  })

  it('reads an absent births cell as zero — the table never publishes one — and says so', () => {
    const data = scope({ ...population, POP201D: { 2023: 12, 2025: 10 } })
    const result = computeDerived(def('nascuti'), data, 2025)
    expect(result.value).not.toBeNull()
    expect(result.imputedYears).toBe(1)
    expect(result.parts).toEqual([22])
  })

  it('counts the years with a zero read in, not the cells: a balance has two a year', () => {
    const data = scope({ ...population, POP307A: { 2025: 40 }, POP308A: { 2025: 30 } })
    expect(computeDerived(def('sold-domiciliu'), data, 2025).imputedYears).toBe(2)
  })

  it('withholds a negative stock INS published — no measurement — but keeps a negative balance', () => {
    const data = scope({ ...population, LOC103B: { 2025: -82 } })
    const result = computeDerived(def('suprafata'), data, 2025)
    expect(result.value).toBeNull()
    expect(result.missing).toBe('valoare INS negativă, nefolosită')
    const outflow = scope({
      ...population,
      POP307A: { 2023: 100, 2024: 100, 2025: 100 },
      POP308A: { 2023: 400, 2024: 400, 2025: 400 },
    })
    expect(computeDerived(def('sold-domiciliu'), outflow, 2025).value).toBeLessThan(0)
  })

  it('carries the flags INS put on its inputs, each once, the population’s included', () => {
    const data = scope(
      { ...population, POP201D: { 2023: 1_000, 2024: 950, 2025: 911 } },
      { POP201D: { 2025: 'p' }, POP108D: { 2024: 'e', 2025: 'p' } },
    )
    expect(computeDerived(def('nascuti'), data, 2025).flags).toEqual(['e', 'p'])
  })

  it('reads a county’s or Romania’s absent cell as missing: only a locality’s can mean zero', () => {
    const data = scope({ ...population, POP201D: { 2023: 1_000, 2025: 911 } })
    expect(computeDerived(def('nascuti'), data, 2025, 3, 'place').value).not.toBeNull()
    expect(computeDerived(def('nascuti'), data, 2025, 3, 'county').value).toBeNull()
    expect(computeDerived(def('apa'), scope({ ...population }), 2024, 3, 'country').missing).toBe('date lipsă')
  })

  it('keeps a cell published without a value missing, never zero', () => {
    const data = scope({ ...population, POP201D: { 2023: 12, 2024: null, 2025: 10 } })
    const result = computeDerived(def('nascuti'), data, 2025)
    expect(result.value).toBeNull()
    expect(result.missing).toBe('date lipsă în cel puțin un an din cei trei')
  })

  it('says a place with no water cell has no public network reported', () => {
    const result = computeDerived(def('apa'), scope({ ...population }), 2024)
    expect(result.missing).toBe('fără rețea publică raportată')
  })

  it('divides a daily water rate by the days of that year: 2024 had 366', () => {
    const data = scope({ ...population, GOS108A: { 2024: 6_309 } })
    const result = computeDerived(def('apa'), data, 2024)
    expect(result.value).toBeCloseTo((6_309 * 1_000_000) / 366 / 162_200, 10)
  })

  it('divides a year-end stock by the population on 1 January of the next year', () => {
    const data = scope({ ...population, LOC101B: { 2025: 70_803 } })
    const result = computeDerived(def('locuinte'), data, 2025)
    expect(result.value).toBeCloseTo((70_803 / 160_228) * 1000, 10)
    expect(result.pooled).toBe(false)
  })

  it('reads a single year when the window is one year', () => {
    const data = scope({ ...population, POP201D: { 2023: 1_000, 2024: 950, 2025: 911 } })
    expect(computeDerived(def('nascuti'), data, 2025, 1).value).toBeCloseTo((911 / 160_600) * 1000, 10)
  })
})

describe('derivedYear', () => {
  const country = scope({ ...population, POP201D: { 2023: 180_000, 2024: 170_000, 2025: 160_000 } })

  it('takes the latest year Romania has in full over the window', () => {
    expect(derivedYear(def('nascuti'), country, { lastYear: 2027 })).toBe(2025)
  })

  it('takes the year the reader chose, when Romania has it, and none otherwise', () => {
    expect(derivedYear(def('nascuti'), country, { lastYear: 2027, year: 2025 })).toBe(2025)
    expect(derivedYear(def('nascuti'), country, { lastYear: 2027, year: 2019 })).toBeNull()
  })

  it('never takes a year INS has not released: Romania’s absent births are unpublished, not zero', () => {
    const unreleased = scope({ ...population, POP108D: { 2022: 1_000, ...population.POP108D }, POP201D: { 2022: 10, 2023: 10, 2024: 10 } })
    expect(derivedYear(def('nascuti'), unreleased, { lastYear: 2027 })).toBe(2024)
  })

  it('refuses a window with a hole: a missing mid-year population is no figure', () => {
    const holed = scope({ POP108D: { 2023: 1, 2025: 1 }, POP201D: { 2023: 10, 2024: 10, 2025: 10 } })
    expect(derivedYear(def('nascuti'), holed, { lastYear: 2025 })).toBeNull()
  })
})

describe('buildDerivedRows', () => {
  const full = scope({
    ...population,
    POP201D: { 2023: 1_000, 2024: 950, 2025: 911 },
    GOS103A: { 2024: 237 },
    TUR102C: { 2025: 6_000 },
  })
  const data: TerritoryDerivedData = { place: full, county: full, country: full }

  it('fixes the year from Romania, then reads the place at that year — a missing cell does not fall back', () => {
    const withJobs = scope({ ...population, FOM104D: { 2023: 88_000, 2024: 90_050 } })
    const place = scope({ ...population, FOM104D: { 2022: 86_000, 2023: 88_000 } })
    const rows = buildDerivedRows({ place, county: withJobs, country: withJobs }, { town: true, lastYear: 2027 })
    const jobs = rows.find((row) => row.def.id === 'salariati')!
    expect(jobs.year).toBe(2024)
    expect(jobs.results.place?.value).toBeNull()
    expect(jobs.results.place?.missing).toBe('date lipsă')
  })

  it('keeps towns-only indicators for towns, and gives green space no county or national reference', () => {
    const town = buildDerivedRows(data, { town: true, lastYear: 2027 })
    const green = town.find((row) => row.def.id === 'spatii-verzi')!
    expect(green.results.county).toBeNull()
    expect(green.results.country).toBeNull()
    expect(buildDerivedRows(data, { town: false, lastYear: 2027 }).some((row) => row.def.id === 'spatii-verzi')).toBe(false)
  })

  it('says why a chosen year has no figure, rather than a bare dash', () => {
    const rows = buildDerivedRows(data, { town: true, year: 2031, lastYear: 2027 })
    const births = rows.find((row) => row.def.id === 'nascuti')!
    expect(births.year).toBeNull()
    expect(births.missing).toBe('fără date INS pentru 2031')
  })

  it('leaves the county out where it is no reference — the capital’s county is the city itself', () => {
    const births = buildDerivedRows(data, { town: true, lastYear: 2027, county: false }).find(
      (row) => row.def.id === 'nascuti',
    )!
    expect(births.results.county).toBeNull()
    expect(births.history.county).toEqual([])
    expect(births.results.country?.value).not.toBeNull()
  })

  it('shows tourism only where the place has it, and names what is missing once', () => {
    const place = scope({ ...population })
    const rows = buildDerivedRows({ ...data, place }, { town: false, lastYear: 2027 })
    expect(rows.some((row) => row.def.id === 'locuri-cazare')).toBe(false)
    expect(missingContext(rows).map((d) => d.id)).toContain('locuri-cazare')
    // A year INS has not published says nothing about the place's tourism.
    const unpublished = buildDerivedRows({ ...data, place }, { town: false, year: 2031, lastYear: 2027 })
    expect(missingContext(unpublished)).toEqual([])
  })

  it('gives a window figure its last year alone, for the receipt', () => {
    const births = buildDerivedRows(data, { town: true, lastYear: 2027 }).find((row) => row.def.id === 'nascuti')!
    expect(births.lastYear?.place?.value).toBeCloseTo((911 / 160_600) * 1000, 10)
  })

  it('flags the last year alone on its own events: a window of 25 can hide a year of 5', () => {
    const few = scope({ ...population, POP201D: { 2023: 10, 2024: 10, 2025: 5 } })
    const births = buildDerivedRows({ place: few, county: full, country: full }, { town: true, lastYear: 2027 }).find(
      (row) => row.def.id === 'nascuti',
    )!
    expect(births.results.place?.small).toBe(false)
    expect(births.lastYear?.place?.small).toBe(true)
  })
})

describe('formatting and kinds', () => {
  it('signs a balance with a true minus and one decimal', () => {
    expect(formatDerived(-5.54, { signed: true })).toMatch(/^−5[.,]5$/)
    expect(formatDerived(1.26, { signed: true })).toMatch(/^\+1[.,]3$/)
    expect(formatDerived(null)).toBe('—')
  })

  it('tells a town from a commune by the name INS gives it', () => {
    expect(isTownName('MUNICIPIUL SIBIU')).toBe(true)
    expect(isTownName('ORAS AGNITA')).toBe(true)
    expect(isTownName('FLORESTI')).toBe(false)
    expect(isTownName(null)).toBe(false)
  })
})
