import { describe, expect, it } from 'vitest'
import { mapTerritorySearchRow } from './statistics-mappers'
import type { InsTerritoryNodeRaw } from './statistics-raw-schemas'

function lauNode(overrides: Partial<InsTerritoryNodeRaw>): InsTerritoryNodeRaw {
  return {
    code: '54975',
    siruta_code: '54975',
    name_ro: 'MUNICIPIUL CLUJ-NAPOCA',
    level: 'LAU',
    parent_code: 'CJ',
    parent_name_ro: 'Cluj',
    ...overrides,
  }
}

describe('mapTerritorySearchRow county resolution (A10)', () => {
  it('keeps an alphabetic NUTS3 parent as the county', () => {
    const row = mapTerritorySearchRow(lauNode({}))
    expect(row.countyCode).toBe('CJ')
    expect(row.countyName).toBe('Cluj')
  })

  it('uppercases and trims the county code', () => {
    const row = mapTerritorySearchRow(lauNode({ parent_code: ' cj ' }))
    expect(row.countyCode).toBe('CJ')
  })

  it('walks a Bucharest sector (numeric parent 179132) to county B, never NUTS3-typing the SIRUTA', () => {
    const row = mapTerritorySearchRow(
      lauNode({
        code: '179141',
        siruta_code: '179141',
        name_ro: 'Sectorul 1',
        parent_code: '179132',
        parent_name_ro: 'MUNICIPIUL BUCUREŞTI',
      }),
    )
    expect(row.countyCode).toBe('B')
    expect(row.countyName).toBe('București')
  })

  it('drops any other numeric parent instead of passing it as a county', () => {
    const row = mapTerritorySearchRow(lauNode({ parent_code: '12345' }))
    expect(row.countyCode).toBeNull()
    expect(row.countyName).toBeNull()
  })

  it('drops a NUTS2-shaped parent (letters + digits)', () => {
    const row = mapTerritorySearchRow(lauNode({ parent_code: 'RO32' }))
    expect(row.countyCode).toBeNull()
    expect(row.countyName).toBeNull()
  })

  it('never assigns a county to non-LAU rows', () => {
    const row = mapTerritorySearchRow({
      code: 'CJ',
      siruta_code: null,
      name_ro: 'Cluj',
      level: 'NUTS3',
      parent_code: 'RO11',
      parent_name_ro: 'Nord-Vest',
    })
    expect(row.countyCode).toBeNull()
    expect(row.countyName).toBeNull()
  })

  it('handles a missing parent', () => {
    const row = mapTerritorySearchRow(
      lauNode({ parent_code: null, parent_name_ro: null }),
    )
    expect(row.countyCode).toBeNull()
    expect(row.countyName).toBeNull()
  })
})
