import { describe, expect, it } from 'vitest'
import {
  cleanPrivateCompanyDirectorySearch,
  parsePrivateCompanyDirectorySearch,
} from './private-company-search'

describe('parsePrivateCompanyDirectorySearch', () => {
  it('coerces a numeric ?q= (TanStack Router JSON-parses it) back to a string', () => {
    expect(parsePrivateCompanyDirectorySearch({ q: 14399840 }).q).toBe('14399840')
  })

  it('keeps old scalar deep links working by widening them to arrays', () => {
    const parsed = parsePrivateCompanyDirectorySearch({
      county: 'CLUJ',
      status: 1048,
      legalForm: 'SRL',
    })
    expect(parsed.county).toEqual(['CLUJ'])
    expect(parsed.status).toEqual(['1048'])
    expect(parsed.legalForm).toEqual(['SRL'])
  })

  it('accepts repeated, comma-separated and JSON-array forms', () => {
    expect(parsePrivateCompanyDirectorySearch({ county: ['CLUJ', 'IAŞI'] }).county).toEqual([
      'CLUJ',
      'IAŞI',
    ])
    expect(parsePrivateCompanyDirectorySearch({ status: '1070,1107' }).status).toEqual([
      '1070',
      '1107',
    ])
    expect(
      parsePrivateCompanyDirectorySearch({ legalForm: '["SRL","SA"]' }).legalForm,
    ).toEqual(['SRL', 'SA'])
  })

  it('parses booleans from both the boolean and the raw string form', () => {
    expect(parsePrivateCompanyDirectorySearch({ vat: true }).vat).toBe(true)
    expect(parsePrivateCompanyDirectorySearch({ inactive: 'false' }).inactive).toBe(false)
  })

  it('drops junk instead of throwing', () => {
    const parsed = parsePrivateCompanyDirectorySearch({
      sort: 'not-a-sort',
      vat: 'maybe',
      regFrom: '15 martie',
      county: [],
    })
    expect(parsed.sort).toBeUndefined()
    expect(parsed.vat).toBeUndefined()
    expect(parsed.regFrom).toBeUndefined()
    expect(parsed.county).toBeUndefined()
  })

  it('accepts a well-formed ISO registration-date range', () => {
    const parsed = parsePrivateCompanyDirectorySearch({
      regFrom: '2020-01-01',
      regTo: '2024-12-31',
      sort: 'registration-date',
    })
    expect(parsed.regFrom).toBe('2020-01-01')
    expect(parsed.regTo).toBe('2024-12-31')
    expect(parsed.sort).toBe('registration-date')
  })
})

describe('cleanPrivateCompanyDirectorySearch', () => {
  it('strips undefined, empty strings and empty arrays', () => {
    const cleaned = cleanPrivateCompanyDirectorySearch({
      q: '   ',
      caen: undefined,
      county: [],
      status: ['1048'],
      legalForm: undefined,
      regFrom: undefined,
      regTo: undefined,
      vat: undefined,
      inactive: undefined,
      sort: undefined,
    })
    expect(cleaned).toEqual({ status: ['1048'] })
  })

  it('trims retained text values', () => {
    const cleaned = cleanPrivateCompanyDirectorySearch({
      q: '  dedeman ',
      caen: ' 4752 ',
    })
    expect(cleaned).toEqual({ q: 'dedeman', caen: '4752' })
  })

  it('keeps `false` — it is a meaningful fiscal filter, not an empty value', () => {
    expect(cleanPrivateCompanyDirectorySearch({ vat: false })).toEqual({ vat: false })
  })
})
