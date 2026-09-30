import { describe, expect, it } from 'vitest'
import {
  categoryShares,
  perDay,
  registryCountyLayer,
  registryQuery,
  registrySearch,
  statusShares,
} from './registry-figures'
import { summaryFixture } from './test/summary-fixture'

const SUMMARY = summaryFixture()

describe('registryCountyLayer', () => {
  it('draws the registered NGOs per 10,000 residents, the country’s own rate counting the ones no county holds', () => {
    const layer = registryCountyLayer(SUMMARY, 'densitate')
    // A count at the capture (20 September 2026), not a figure of the population's year.
    expect(layer).toMatchObject({ code: 'ngo-registry-densitate', period: '2026', unit: 'other', unitLabel: null, missingCounties: [], national: 75 })
    expect(layer.values).toEqual([
      { code: 'CJ', name: 'Cluj', value: 100 },
      { code: 'DB', name: 'Dâmbovița', value: 50 },
      { code: 'AB', name: 'Alba', value: 50 },
    ])
  })

  it('draws the year’s new NGOs per 100,000 residents, over all of the year’s registrations', () => {
    const layer = registryCountyLayer(SUMMARY, 'noi')
    expect(layer.period).toBe('2025')
    expect(layer.national).toBe(100)
    expect(layer.values.map((county) => county.value)).toEqual([140, 75, 50])
  })

  it('counts each county’s registered NGOs as they are, with no national rate to stand them against', () => {
    const layer = registryCountyLayer(SUMMARY, 'total')
    expect(layer).toMatchObject({ code: 'ngo-registry-total', period: '2026', unit: 'count', missingCounties: [], national: null })
    expect(layer.values.map((county) => [county.code, county.value])).toEqual(SUMMARY.counties.map((county) => [county.code, county.registered]))
  })

  it('hatches a county with no population instead of drawing it as zero', () => {
    const counties = SUMMARY.counties.map((county) => (county.code === 'AB' ? { ...county, residents: 0 } : county))
    const layer = registryCountyLayer({ ...SUMMARY, counties }, 'densitate')
    expect(layer.values.map((county) => county.code)).toEqual(['CJ', 'DB'])
    expect(layer.missingCounties).toEqual(['AB'])
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
