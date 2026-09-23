import { describe, expect, it } from 'vitest'
import {
  fetchPrivateCompanyCountiesMock,
  fetchPrivateCompanySearchMock,
} from './private-company-search-api.mock'

const base = { pageSize: 25 } as const

async function names(query: Parameters<typeof fetchPrivateCompanySearchMock>[0]) {
  const page = await fetchPrivateCompanySearchMock(query)
  return page.items.map((item) => item.name)
}

describe('fetchPrivateCompanySearchMock', () => {
  it('returns every fixture when unfiltered', async () => {
    const page = await fetchPrivateCompanySearchMock(base)
    expect(page.items.length).toBeGreaterThanOrEqual(7)
    expect(page.totalEstimated).toBe(false)
  })

  it('ORs within a facet and ANDs across facets', async () => {
    expect(await names({ ...base, county: ['CLUJ'] })).toEqual([
      'EXEMPLU REGISTRU CULTURAL',
      'POPA IOANA PFA',
    ])
    expect(await names({ ...base, county: ['CLUJ'], legalForm: ['PFA'] })).toEqual([
      'POPA IOANA PFA',
    ])
    expect((await names({ ...base, status: ['1070', '1107'] })).sort()).toEqual([
      'CONSTRUCT BRASOV SA',
      'TRANSPORT OLTENIA SNC',
    ])
  })

  it('matches a county the way the server does, whatever its spelling', async () => {
    // The hub links counties as the registry facet spells them (`Bucureşti`,
    // `Cluj`); the fixtures carry `MUNICIPIUL BUCUREŞTI` and `CLUJ`.
    expect(await names({ ...base, county: ['Cluj'] })).toEqual(await names({ ...base, county: ['CLUJ'] }))
    expect(await names({ ...base, county: ['Bucureşti'] })).toHaveLength(1)
    expect(await names({ ...base, county: ['București'] })).toEqual(await names({ ...base, county: ['Bucureşti'] }))
    // A part of a name is not a county: the server compares whole names.
    expect(await names({ ...base, county: ['Clu'] })).toEqual([])
  })

  it('matches CAEN by prefix below four digits and exactly at four', async () => {
    // Unsorted results follow fixture order, which is ascending numeric CUI.
    expect(await names({ ...base, caen: '47' })).toEqual([
      'MAGAZINUL VECHI SRL',
      'DANTE INTERNATIONAL SA',
    ])
    expect(await names({ ...base, caen: '4711' })).toEqual(['MAGAZINUL VECHI SRL'])
  })

  it('applies the inclusive registration-date range', async () => {
    expect(await names({ ...base, regFrom: '2021-01-01' })).toEqual(['POPA IOANA PFA'])
    expect(await names({ ...base, regTo: '1990-01-10' })).toEqual([
      'EXEMPLU REGISTRU CULTURAL',
    ])
  })

  it('applies the fiscal switches', async () => {
    expect(await names({ ...base, inactive: true })).toEqual([
      'MAGAZINUL VECHI SRL',
      'TRANSPORT OLTENIA SNC',
    ])
    expect(await names({ ...base, vat: false, inactive: false })).toEqual([
      'POPA IOANA PFA',
    ])
  })

  it('matches q against the name and the exact CUI', async () => {
    expect(await names({ ...base, q: 'dante' })).toEqual(['DANTE INTERNATIONAL SA'])
    expect(await names({ ...base, q: '14399840' })).toEqual(['DANTE INTERNATIONAL SA'])
  })

  it('sorts by name, CUI and registration date (newest first)', async () => {
    const byName = await names({ ...base, county: ['CLUJ'], sort: 'name' })
    expect(byName).toEqual(['EXEMPLU REGISTRU CULTURAL', 'POPA IOANA PFA'])

    const byDate = await names({ ...base, sort: 'registration-date' })
    expect(byDate[0]).toBe('POPA IOANA PFA')

    const byCui = await names({ ...base, sort: 'cui' })
    expect(byCui[0]).toBe('ANTIBIOTICE SA')
  })
})

describe('fetchPrivateCompanyCountiesMock', () => {
  it('counts companies per county, sorted by Romanian collation', async () => {
    const counties = await fetchPrivateCompanyCountiesMock()
    expect(counties.find((county) => county.name === 'CLUJ')?.count).toBe(2)
    expect(counties.map((county) => county.name)).toEqual(
      [...counties.map((county) => county.name)].sort((a, b) => a.localeCompare(b, 'ro')),
    )
  })
})
