import { describe, expect, it } from 'vitest'
import type { PrivateCompanySearchQuery } from '@/schemas/private-company-search'
import { buildCompaniesFilter } from './company-filters'

const base: PrivateCompanySearchQuery = { pageSize: 25 }

describe('buildCompaniesFilter', () => {
  it('returns undefined when no filters are active', () => {
    expect(buildCompaniesFilter(base)).toBeUndefined()
  })

  it('maps a single county/status value to eq (display-name county)', () => {
    expect(
      buildCompaniesFilter({ ...base, county: ['Bacău'], status: ['1048'] }),
    ).toEqual({ county: { eq: 'Bacău' }, status: { eq: '1048' } })
  })

  it('switches to `in` once a facet holds more than one value', () => {
    expect(
      buildCompaniesFilter({ ...base, county: ['CLUJ', 'IAŞI'], status: ['1070', '1107'] }),
    ).toEqual({
      county: { in: ['CLUJ', 'IAŞI'] },
      status: { in: ['1070', '1107'] },
    })
  })

  it('de-duplicates a facet before choosing eq vs in', () => {
    expect(buildCompaniesFilter({ ...base, county: ['CLUJ', 'CLUJ'] })).toEqual({
      county: { eq: 'CLUJ' },
    })
  })

  it('maps legalForm the same way', () => {
    expect(buildCompaniesFilter({ ...base, legalForm: ['SRL'] })).toEqual({
      legalForm: { eq: 'SRL' },
    })
    expect(buildCompaniesFilter({ ...base, legalForm: ['SRL', 'SA'] })).toEqual({
      legalForm: { in: ['SRL', 'SA'] },
    })
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

  it('serializes the registration-date range as between { from, to }', () => {
    expect(
      buildCompaniesFilter({ ...base, regFrom: '2020-01-01', regTo: '2024-12-31' }),
    ).toEqual({
      registrationDate: { between: { from: '2020-01-01', to: '2024-12-31' } },
    })
  })

  it('allows a half-open registration-date range', () => {
    expect(buildCompaniesFilter({ ...base, regFrom: '2024-01-01' })).toEqual({
      registrationDate: { between: { from: '2024-01-01' } },
    })
    expect(buildCompaniesFilter({ ...base, regTo: '1999-12-31' })).toEqual({
      registrationDate: { between: { to: '1999-12-31' } },
    })
  })

  it('maps the fiscal switches, including their false form', () => {
    expect(buildCompaniesFilter({ ...base, vat: true, inactive: false })).toEqual({
      vatPayer: { eq: true },
      declaredFiscallyInactive: { eq: false },
    })
  })

  it('ignores blank/whitespace filter values', () => {
    expect(
      buildCompaniesFilter({ ...base, county: ['  '], status: [], caen: '' }),
    ).toBeUndefined()
  })
})
