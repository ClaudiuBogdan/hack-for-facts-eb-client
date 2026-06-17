import { describe, expect, it } from 'vitest'
import type { PrivateCompanySearchQuery } from '@/schemas/private-company-search'
import { buildCompaniesFilter } from './company-filters'

const base: PrivateCompanySearchQuery = { pageSize: 25 }

describe('buildCompaniesFilter', () => {
  it('returns undefined when no filters are active', () => {
    expect(buildCompaniesFilter(base)).toBeUndefined()
  })

  it('maps county and status to eq operators (display-name county)', () => {
    expect(
      buildCompaniesFilter({ ...base, county: 'Bacău', status: '1048' }),
    ).toEqual({ county: { eq: 'Bacău' }, status: { eq: '1048' } })
  })

  it('treats a full 4-digit CAEN as an exact match', () => {
    expect(buildCompaniesFilter({ ...base, caen: '4752' })).toEqual({
      caenCode: { eq: '4752' },
    })
  })

  it('treats partial CAEN (1-3 digit division/group) as a prefix', () => {
    // 3-digit eq would match nothing — must be a prefix.
    expect(buildCompaniesFilter({ ...base, caen: '475' })).toEqual({
      caenCode: { prefix: '475' },
    })
    expect(buildCompaniesFilter({ ...base, caen: '47' })).toEqual({
      caenCode: { prefix: '47' },
    })
  })

  it('drops non-numeric / over-long CAEN input', () => {
    expect(buildCompaniesFilter({ ...base, caen: 'abc' })).toBeUndefined()
    expect(buildCompaniesFilter({ ...base, caen: '47521' })).toBeUndefined()
  })

  it('ignores blank/whitespace filter values', () => {
    expect(
      buildCompaniesFilter({ ...base, county: '  ', status: '', caen: '' }),
    ).toBeUndefined()
  })
})
