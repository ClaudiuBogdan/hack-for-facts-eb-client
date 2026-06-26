import { describe, expect, it } from 'vitest'
import {
  cleanProcurementSearch,
  parseProcurementSearch,
  PROCUREMENT_SEARCH_DEFAULTS,
  type ProcurementSearchState,
} from '@/schemas/procurement-search'

function validateAchizitiiCautareSearch(
  search: Record<string, unknown>,
): Partial<ProcurementSearchState> {
  const parsed = parseProcurementSearch(search)
  return cleanProcurementSearch(parsed)
}

describe('/achizitii/cautare route search validation', () => {
  it('normalizes and cleans search params through validateSearch', () => {
    const validated = validateAchizitiiCautareSearch({
      grain: 'contracts',
      q: '  spital  ',
      sort: 'date_desc',
      page: '1',
      pageSize: '25',
    })

    expect(validated).toEqual({
      q: 'spital',
    })
  })

  it('preserves non-default grains and reserved buyer-territory params', () => {
    const validated = validateAchizitiiCautareSearch({
      grain: 'procedures',
      region: 'cluj',
      county: ' Cluj ',
    })

    expect(validated).toMatchObject({
      grain: 'procedures',
      region: 'cluj',
      county: 'Cluj',
    })
  })

  it('drops invalid status values while keeping valid filters', () => {
    const parsed = parseProcurementSearch({
      status: 'awarded,not-a-status',
      authority_cui: '2939237',
    })
    const cleaned = cleanProcurementSearch(parsed)

    expect(cleaned).toMatchObject({
      authority_cui: '2939237',
      status: ['awarded'],
    })
    expect(cleaned.grain).toBeUndefined()
    expect(PROCUREMENT_SEARCH_DEFAULTS.grain).toBe('contracts')
  })
})
