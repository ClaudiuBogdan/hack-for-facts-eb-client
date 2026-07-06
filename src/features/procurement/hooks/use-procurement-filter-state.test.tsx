import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { withProcurementSearchDefaults } from '@/schemas/procurement-search'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

import { useProcurementFilterState } from './use-procurement-filter-state'

function lastNavigation() {
  const calls = navigateMock.mock.calls
  return calls[calls.length - 1]?.[0] as {
    search: Record<string, unknown>
    replace: boolean
    resetScroll: boolean
  }
}

beforeEach(() => {
  navigateMock.mockReset()
})

describe('useProcurementFilterState', () => {
  it('every filter writer resets to page 1', () => {
    const search = withProcurementSearchDefaults({ page: 7, q: 'apa' })
    const { result } = renderHook(() => useProcurementFilterState(search))

    act(() => result.current.setStatuses(['awarded']))
    expect(lastNavigation().search.page).toBeUndefined() // page 1 = default, stripped
    expect(lastNavigation().search.status).toEqual(['awarded'])

    act(() => result.current.setSource('seap'))
    expect(lastNavigation().search.page).toBeUndefined()

    act(() => result.current.setValueRange(100, undefined))
    expect(lastNavigation().search.page).toBeUndefined()
  })

  it('setPage keeps filters and resets scroll', () => {
    const search = withProcurementSearchDefaults({ status: ['awarded'] })
    const { result } = renderHook(() => useProcurementFilterState(search))

    act(() => result.current.setPage(3))
    const nav = lastNavigation()
    expect(nav.search.page).toBe(3)
    expect(nav.search.status).toEqual(['awarded'])
    expect(nav.resetScroll).toBe(true)
    expect(nav.replace).toBe(true)
  })

  it('grain switch clears the status facet and supplier for procedures', () => {
    const search = withProcurementSearchDefaults({
      grain: 'contracts',
      status: ['awarded'],
      supplier_cui: '99',
    })
    const { result } = renderHook(() => useProcurementFilterState(search))

    act(() => result.current.setGrain('procedures'))
    const nav = lastNavigation()
    expect(nav.search.grain).toBe('procedures')
    expect(nav.search.status).toBeUndefined()
    expect(nav.search.supplier_cui).toBeUndefined()
  })

  it('setDates clears the coarse year facet', () => {
    const search = withProcurementSearchDefaults({ year: 2024 })
    const { result } = renderHook(() => useProcurementFilterState(search))

    act(() => result.current.setDates('2024-02-01', undefined))
    const nav = lastNavigation()
    expect(nav.search.dateFrom).toBe('2024-02-01')
    expect(nav.search.year).toBeUndefined()
  })

  it('setCpv routes 2-digit inputs to the division facet', () => {
    const search = withProcurementSearchDefaults({})
    const { result } = renderHook(() => useProcurementFilterState(search))

    act(() => result.current.setCpv('45'))
    expect(lastNavigation().search.cpv_division).toBe('45')

    act(() => result.current.setCpv('45453000'))
    const nav = lastNavigation()
    expect(nav.search.cpv).toBe('45453000')
    expect(nav.search.cpv_division).toBeUndefined()
  })

  it('clearFilters keeps grain, sort and q', () => {
    const search = withProcurementSearchDefaults({
      grain: 'procedures',
      sort: 'value_desc',
      q: 'spital',
      status: ['published'],
      authority_cui: '1',
      signal: 'same_day',
    })
    const { result } = renderHook(() => useProcurementFilterState(search))

    act(() => result.current.clearFilters())
    const nav = lastNavigation()
    expect(nav.search.grain).toBe('procedures')
    expect(nav.search.sort).toBe('value_desc')
    expect(nav.search.q).toBe('spital')
    expect(nav.search.status).toBeUndefined()
    expect(nav.search.authority_cui).toBeUndefined()
    expect(nav.search.signal).toBeUndefined()
  })
})
