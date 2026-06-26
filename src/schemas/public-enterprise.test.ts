import { describe, expect, it } from 'vitest'
import {
  hasPublicEnterpriseListingFilters,
  parsePublicEnterpriseProfileSearch,
  parsePublicEnterpriseSearch,
} from './public-enterprise'

describe('parsePublicEnterpriseSearch', () => {
  it('keeps the no-query landing state inactive', () => {
    const parsed = parsePublicEnterpriseSearch({})
    expect(parsed.sort).toBeUndefined()
    expect(parsed.page).toBeUndefined()
    expect(parsed.pageSize).toBeUndefined()
    expect(hasPublicEnterpriseListingFilters(parsed)).toBe(false)
  })

  it('treats active filters as listing state', () => {
    expect(hasPublicEnterpriseListingFilters({ q: 'apa' })).toBe(true)
    expect(hasPublicEnterpriseListingFilters({ listed: 'true' })).toBe(true)
    expect(hasPublicEnterpriseListingFilters({ status: 'functiune' })).toBe(true)
  })

  it('treats non-default sort and pagination as listing state', () => {
    expect(hasPublicEnterpriseListingFilters({ sort: 'cui' })).toBe(true)
    expect(hasPublicEnterpriseListingFilters({ page: '2' })).toBe(true)
    expect(hasPublicEnterpriseListingFilters({ pageSize: '50' })).toBe(true)
  })

  it('drops malformed values without throwing', () => {
    const parsed = parsePublicEnterpriseSearch({
      listed: 'maybe',
      status: 'not-a-status',
      page: '-1',
      pageSize: 'oops',
      sort: 'unknown',
    })
    expect(parsed.listed).toBeUndefined()
    expect(parsed.status).toEqual([])
    expect(parsed.page).toBe(1)
    expect(parsed.pageSize).toBe(20)
    expect(parsed.sort).toBe('legalName')
  })
})

describe('parsePublicEnterpriseProfileSearch', () => {
  it('keeps all profile tab ids deep-linkable', () => {
    expect(parsePublicEnterpriseProfileSearch({ tab: 'sanctiuni' }).tab).toBe(
      'sanctiuni',
    )
    expect(parsePublicEnterpriseProfileSearch({ tab: 'ajutor-de-stat' }).tab).toBe(
      'ajutor-de-stat',
    )
  })

  it('falls back safely for malformed profile params', () => {
    const parsed = parsePublicEnterpriseProfileSearch({
      tab: 'bad',
      sheet: 'bad',
      view: 'bad',
      years: 'not-a-year',
    })
    expect(parsed.tab).toBe('profil')
    expect(parsed.sheet).toBe('all')
    expect(parsed.view).toBe('both')
    expect(parsed.years).toBeUndefined()
  })
})
