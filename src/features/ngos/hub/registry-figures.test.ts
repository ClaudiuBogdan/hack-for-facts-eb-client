import { describe, expect, it } from 'vitest'
import {
  categoryShares,
  countyLayer,
  densityOf,
  nationalDensity,
  perDay,
  rankCounties,
  registryQuery,
  registrySearch,
  statusShares,
} from './registry-figures'
import { summaryFixture } from './test/summary-fixture'

const SUMMARY = summaryFixture()

describe('densities', () => {
  it('counts registered NGOs per 10,000 residents, to one decimal', () => {
    expect(densityOf(500, 50_000)).toBe(100)
    expect(densityOf(200, 30_000)).toBe(66.7)
    expect(densityOf(10, 0)).toBe(0)
  })

  it('divides every registered NGO, those with no county included, by the country', () => {
    expect(nationalDensity(SUMMARY)).toBe(75)
  })
})

describe('countyLayer', () => {
  it('draws the density as a rate against the country, with the registered NGOs no county holds', () => {
    const layer = countyLayer(SUMMARY, 'densitate')
    expect(layer).toMatchObject({ kind: 'rate', national: 75, digits: 1, unplaced: 50 })
    expect(layer.values).toEqual([
      { code: 'CJ', source: 'CLUJ', value: 100 },
      { code: 'DB', source: 'DÂMBOVITA', value: 50 },
      { code: 'AB', source: 'ALBA', value: 50 },
    ])
  })

  it('draws the registered NGOs as counts out of the national total', () => {
    expect(countyLayer(SUMMARY, 'total')).toMatchObject({ kind: 'count', national: 900, digits: 0, unplaced: 50 })
  })

  it('draws the year’s new NGOs out of that year’s registrations, the unplaced ones being the difference', () => {
    const layer = countyLayer(SUMMARY, 'noi')
    expect(layer).toMatchObject({ kind: 'count', national: 120, unplaced: 5 })
    expect(layer.values.map((county) => county.value)).toEqual([70, 30, 15])
  })
})

describe('rankCounties', () => {
  it('ranks highest first and breaks a tie by name', () => {
    const names: Record<string, string> = { CJ: 'Cluj', DB: 'Dâmbovița', AB: 'Alba' }
    const ranked = rankCounties(countyLayer(SUMMARY, 'densitate').values, (code) => names[code] ?? code)
    expect(ranked.map((county) => county.code)).toEqual(['CJ', 'AB', 'DB'])
  })
})

describe('perDay', () => {
  it('spreads a year’s registrations over its days, a leap year included', () => {
    expect(perDay(5_040, 2025)).toBe(13.8)
    expect(perDay(366, 2024)).toBe(1)
  })
})

describe('shares', () => {
  it('lists the legal forms largest first, as shares of the registered NGOs', () => {
    const rows = categoryShares(SUMMARY)
    expect(rows.map((row) => row.key)).toEqual(['association', 'foundation', 'federation', 'religious_association', 'foreign_legal_person'])
    expect(rows[0]?.share).toBeCloseTo(0.8667, 4)
  })

  it('lists the statuses in the order the law runs them, summing to every entry', () => {
    const rows = statusShares(SUMMARY)
    expect(rows.map((row) => row.key)).toEqual(['registered', 'dissolved', 'inLiquidation', 'deregistered'])
    expect(rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 10)
  })
})

describe('registry links', () => {
  it('fills every filter the registry route keeps in its URL', () => {
    expect(registrySearch({ county: 'CLUJ', status: 'Inregistrat' })).toEqual({
      q: '',
      county: 'CLUJ',
      category: '',
      status: 'Inregistrat',
      registryNumber: '',
      publicUtility: '',
      after: '',
    })
  })

  it('looks a registry number up exactly and anything else up by name', () => {
    expect(registryQuery(' 3446 / a / 2026 ')).toEqual({ q: '', registryNumber: '3446/A/2026' })
    expect(registryQuery('  salvati   copiii ')).toEqual({ q: 'salvati copiii', registryNumber: '' })
    expect(registryQuery('Asociatia 2026')).toEqual({ q: 'Asociatia 2026', registryNumber: '' })
  })
})
