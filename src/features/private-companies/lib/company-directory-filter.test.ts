import { describe, expect, it } from 'vitest'
import {
  buildCompanyDirectoryChips,
  clearCompanyDirectoryFilters,
  countActiveCompanyDirectoryFilters,
} from './company-directory-filter'

describe('countActiveCompanyDirectoryFilters', () => {
  it('is zero when only q and sort are set — neither is a filter', () => {
    expect(countActiveCompanyDirectoryFilters({ q: 'dedeman', sort: 'name' })).toBe(0)
  })

  it('counts every selected value of a multi-select', () => {
    expect(
      countActiveCompanyDirectoryFilters({ county: ['CLUJ', 'IAŞI'], status: ['1048'] }),
    ).toBe(3)
  })

  it('counts a date range as one filter even with both bounds', () => {
    expect(
      countActiveCompanyDirectoryFilters({ regFrom: '2020-01-01', regTo: '2024-12-31' }),
    ).toBe(1)
    expect(countActiveCompanyDirectoryFilters({ regFrom: '2020-01-01' })).toBe(1)
  })

  it('counts each fiscal switch, including when set to false', () => {
    expect(countActiveCompanyDirectoryFilters({ vat: false, inactive: true })).toBe(2)
  })

  it('ignores a whitespace-only CAEN', () => {
    expect(countActiveCompanyDirectoryFilters({ caen: '  ' })).toBe(0)
  })
})

describe('buildCompanyDirectoryChips', () => {
  it('emits one chip per value and removes only that value', () => {
    const chips = buildCompanyDirectoryChips({ county: ['CLUJ', 'IAŞI', 'DOLJ'] })
    expect(chips.map((chip) => chip.label)).toEqual(['CLUJ', 'IAŞI', 'DOLJ'])
    expect(chips[1].patch).toEqual({ county: ['CLUJ', 'DOLJ'] })
  })

  it('collapses the last value of a facet to undefined so the param leaves the URL', () => {
    const [chip] = buildCompanyDirectoryChips({ status: ['1048'] })
    expect(chip.patch).toEqual({ status: undefined })
  })

  it('labels a status chip with its ONRC registry wording', () => {
    const [chip] = buildCompanyDirectoryChips({ status: ['1107'] })
    expect(chip.label).toBe('insolvență')
  })

  it('falls back to the raw code for an unknown status', () => {
    const [chip] = buildCompanyDirectoryChips({ status: ['9999'] })
    expect(chip.label).toBe('9999')
  })

  it('renders the date range as a single chip that clears both bounds', () => {
    const chips = buildCompanyDirectoryChips({
      regFrom: '2020-01-01',
      regTo: '2024-12-31',
    })
    expect(chips).toHaveLength(1)
    expect(chips[0].label).toBe('Înregistrare 2020-01-01 – 2024-12-31')
    expect(chips[0].patch).toEqual({ regFrom: undefined, regTo: undefined })
  })

  it('distinguishes the true and false forms of each fiscal switch', () => {
    expect(buildCompanyDirectoryChips({ vat: true })[0].label).toBe('Plătitor TVA')
    expect(buildCompanyDirectoryChips({ vat: false })[0].label).toBe('Neplătitor TVA')
    expect(buildCompanyDirectoryChips({ inactive: true })[0].label).toBe(
      'Declarat inactiv fiscal',
    )
  })

  it('emits nothing for q and sort', () => {
    expect(buildCompanyDirectoryChips({ q: 'dedeman', sort: 'cui' })).toEqual([])
  })
})

describe('clearCompanyDirectoryFilters', () => {
  it('keeps q and sort, drops every facet', () => {
    expect(
      clearCompanyDirectoryFilters({
        q: 'dedeman',
        sort: 'name',
        county: ['CLUJ'],
        status: ['1048'],
        caen: '47',
        vat: true,
        regFrom: '2020-01-01',
      }),
    ).toEqual({ q: 'dedeman', sort: 'name' })
  })
})
