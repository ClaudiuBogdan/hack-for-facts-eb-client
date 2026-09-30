import { describe, expect, it } from 'vitest'
import {
  amountOf,
  displayNgoName,
  formatExact,
  isInferred,
  keyFigures,
  latestStatement,
  parseLabel,
  placeOf,
  resultOf,
  statementRows,
  statusOf,
  yearSeries,
} from './model'
import { FUNKY, FUNKY_STATEMENTS } from './test/fixtures'

const statementOf = (year: number) => FUNKY_STATEMENTS.find((statement) => statement.fiscalYear === year)!

describe('the words', () => {
  it('names an NGO as people write it, the registry’s capitals and lost diacritics mended', () => {
    expect(displayNgoName('ASOCIATIA BANCA PENTRU ALIMENTE')).toBe('Asociația Banca pentru Alimente')
    expect(displayNgoName('FUNKY CITIZENS')).toBe('Funky Citizens')
  })

  it('places it by town and county, the county alone where the town is its name', () => {
    expect(placeOf(FUNKY)).toBe('Sectorul 3, București')
    expect(placeOf({ county: 'BUCURESTI', locality: 'BUCURESTI' })).toBe('București')
    expect(placeOf({ county: null, locality: null })).toBeNull()
  })

  it('reads the registry status and says which CUI links are only inferred', () => {
    expect(statusOf({ sourceRegistryStatus: 'Radiat' })).toBe('deregistered')
    expect(statusOf({ sourceRegistryStatus: 'something new' })).toBe('unknown')
    expect(isInferred('registry_cui')).toBe(false)
    expect(isInferred('fiscal_exact_name_county')).toBe(true)
  })
})

describe('the money', () => {
  it('keeps a blank cell blank and a zero a zero, and draws only safe integers', () => {
    expect(amountOf(null)).toEqual({ raw: null, value: null })
    expect(amountOf('0')).toEqual({ raw: '0', value: 0 })
    expect(amountOf('12.5')).toEqual({ raw: null, value: null })
    expect(amountOf('90071992547409930')).toEqual({ raw: '90071992547409930', value: null })
  })

  it('groups an exact figure without a float, so nothing is rounded', () => {
    expect(formatExact('90071992547409930', 'ro')).toBe('90.071.992.547.409.930')
    expect(formatExact('-004539948', 'en')).toBe('−4,539,948')
  })
})

describe('the statement', () => {
  it('reads a label’s column from its suffix and never its stale year', () => {
    expect(parseLabel('Venituri totale - prevederi anuale')).toEqual({ base: 'Venituri totale', column: 'planned' })
    expect(parseLabel('Venituri totale  -  la 31.12.2024')).toEqual({ base: 'Venituri totale', column: 'actual' })
    expect(parseLabel('Casa si conturi la banci')).toEqual({ base: 'Casa si conturi la banci', column: null })
  })

  it('pairs each planned row with its actual one, and keeps the balance to one column', () => {
    const rows = statementRows(statementOf(2024))
    const revenue = rows.find((row) => /^venituri totale$/iu.test(row.base.replace(/^[A-Z]\.\s*/u, '')))!
    expect(revenue.kind).toBe('result')
    expect(revenue.codes).toHaveLength(2)
    const cash = rows.find((row) => /^casa/iu.test(row.base))!
    expect(cash).toMatchObject({ kind: 'balance', planned: null })
  })

  it('finds the page’s figures by their labels, and a year’s result from its surplus or deficit', () => {
    const figures = keyFigures(statementOf(2024))
    expect(figures.revenue?.value).toBeGreaterThan(0)
    expect(figures.expenses?.value).toBeGreaterThan(0)
    const result = resultOf(statementOf(2024))
    expect(result).not.toBeNull()
    expect(Math.sign(result!)).toBe(figures.surplus?.value ? 1 : -1)
  })
})

describe('the result', () => {
  it('is zero only where both rows report zero; a zero beside a blank cell says nothing', () => {
    const statement = (surplus: string | null, deficit: string | null) => ({
      fiscalYear: 2024,
      sourceUrl: 'https://data.gov.ro/a',
      dictionaryUrl: 'https://data.gov.ro/b',
      indicators: [
        { code: 'I40', label: 'Excedent/profit - la 31.12.2024', value: surplus },
        { code: 'I41', label: 'Deficit/pierdere - la 31.12.2024', value: deficit },
      ],
    })
    expect(resultOf(statement('0', '0'))).toBe(0)
    expect(resultOf(statement('0', null))).toBeNull()
    expect(resultOf(statement('1500', null))).toBe(1500)
    expect(resultOf(statement(null, '200'))).toBe(-200)
  })
})

describe('the years', () => {
  it('keeps a missing year as a gap, not a zero', () => {
    const series = yearSeries(FUNKY_STATEMENTS)
    expect(series.map((point) => point.year)).toEqual([2021, 2022, 2023, 2024])
    expect(series[1]).toEqual({ year: 2022, statement: null, revenue: null, expenses: null })
    expect(latestStatement(FUNKY_STATEMENTS)?.fiscalYear).toBe(2024)
    expect(yearSeries([])).toEqual([])
  })
})
