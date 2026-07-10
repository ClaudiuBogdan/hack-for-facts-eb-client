import { describe, expect, it } from 'vitest'
import { searchTerritoriesMock } from './territory-search-api.mock'

describe('searchTerritoriesMock', () => {
  it('matches without diacritics in either direction', async () => {
    const result = await searchTerritoriesMock('targu mures')
    expect(result.rows.map((row) => row.name)).toContain('Municipiul Târgu Mureș')
  })

  it('matches a diacritic query against the fixture', async () => {
    const result = await searchTerritoriesMock('Brăila')
    expect(result.rows.some((row) => row.siruta === '44269')).toBe(true)
  })

  it('matches on a SIRUTA prefix', async () => {
    const result = await searchTerritoriesMock('549')
    expect(result.rows.map((row) => row.siruta)).toContain('54975')
  })

  it('returns county rows without a SIRUTA', async () => {
    const result = await searchTerritoriesMock('Cluj')
    const county = result.rows.find((row) => row.level === 'NUTS3')
    expect(county?.siruta).toBeNull()
  })

  it('reports no matches rather than throwing', async () => {
    const result = await searchTerritoriesMock('zzzznotaplace')
    expect(result.rows).toEqual([])
    expect(result.totalCount).toBe(0)
  })
})
