import { describe, expect, it } from 'vitest'
import { withProcurementSearchDefaults } from '@/schemas/procurement-search'
import {
  buildActiveFilterChips,
  CLEAR_ALL_FILTERS_PATCH,
  countActiveProcurementFilters,
} from './filter-meta'

describe('procurement filter meta', () => {
  it('counts zero for a default search (q/grain/sort/paging are not filters)', () => {
    expect(
      countActiveProcurementFilters(
        withProcurementSearchDefaults({ q: 'spital', page: 3 }),
      ),
    ).toBe(0)
  })

  it('builds one chip per facet with a clearing patch', () => {
    const chips = buildActiveFilterChips(
      withProcurementSearchDefaults({
        authority_cui: '123',
        status: ['awarded', 'cancelled'],
        source: 'seap',
        signal: 'same_day',
        valueMin: 1000,
      }),
    )
    expect(chips).toHaveLength(5)
    const statusChip = chips.find((chip) => chip.key === 'status')
    expect(statusChip?.clear).toEqual({ status: undefined })
  })

  it('merges dateFrom/dateTo into a single period chip that wins over year', () => {
    const chips = buildActiveFilterChips(
      withProcurementSearchDefaults({
        year: 2024,
        dateFrom: '2024-01-01',
        dateTo: '2024-06-30',
      }),
    )
    expect(chips.map((chip) => chip.key)).toEqual(['period'])
  })

  it('CLEAR_ALL_FILTERS_PATCH resets every chip-able facet', () => {
    const active = withProcurementSearchDefaults({
      authority_cui: '1',
      supplier_cui: '2',
      cpv: '45453000',
      source: 'seap',
      status: ['awarded'],
      year: 2024,
      valueMin: 1,
      valueMax: 2,
      signal: 'same_day',
    })
    const cleared = withProcurementSearchDefaults({
      ...active,
      ...CLEAR_ALL_FILTERS_PATCH,
    })
    expect(countActiveProcurementFilters(cleared)).toBe(0)
  })
})
