import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PnrrProjectSearchInput } from './PnrrProjectSearchInput'

function makeFilterState(
  search: Partial<ReturnType<typeof usePnrrFilterState>['search']> = {},
  overrides: Partial<ReturnType<typeof usePnrrFilterState>> = {},
): ReturnType<typeof usePnrrFilterState> {
  return {
    search: {
      view: 'overview',
      page: 1,
      pageSize: 25,
      sortBy: 'value',
      sortOrder: 'desc',
      beneficiarySortBy: 'value',
      beneficiarySortOrder: 'desc',
      beneficiaryPage: 1,
      onlyAnomalies: false,
      excludeMicro: false,
      granularity: 'county',
      includeNational: true,
      ...search,
    },
    setView: vi.fn(),
    showBeneficiaryProjects: vi.fn(),
    showUatView: vi.fn(),
    setSearch: vi.fn(),
    setBeneficiarySearch: vi.fn(),
    setBeneficiaryCui: vi.fn(),
    setUatFilter: vi.fn(),
    setUatFilters: vi.fn(),
    setComponents: vi.fn(),
    setCounties: vi.fn(),
    setFundingSources: vi.fn(),
    setMeasures: vi.fn(),
    setCris: vi.fn(),
    setProgressCategories: vi.fn(),
    setOnlyAnomalies: vi.fn(),
    setExcludeMicro: vi.fn(),
    setAnomalyTypes: vi.fn(),
    setDataQualitySignalTypes: vi.fn(),
    setGranularity: vi.fn(),
    setEntityTypes: vi.fn(),
    setBeneficiaryTypes: vi.fn(),
    setIncludeNational: vi.fn(),
    setCurrency: vi.fn(),
    setSorting: vi.fn(),
    setBeneficiarySorting: vi.fn(),
    setPagination: vi.fn(),
    setBeneficiaryPagination: vi.fn(),
    setMapView: vi.fn(),
    openProjectPanel: vi.fn(),
    openBeneficiaryPanel: vi.fn(),
    openMapCountyPanel: vi.fn(),
    openMapUatPanel: vi.fn(),
    openAnomalyInfoPanel: vi.fn(),
    closePanel: vi.fn(),
    closeProjectPanel: vi.fn(),
    clearFilters: vi.fn(),
    ...overrides,
  }
}

describe('PnrrProjectSearchInput', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces long project searches into URL state', () => {
    vi.useFakeTimers()
    const setSearch = vi.fn()
    const filterState = makeFilterState({}, { setSearch })
    const longSearch =
      'Modernizare infrastructură educațională beneficiar comuna foarte lungă'

    render(<PnrrProjectSearchInput filterState={filterState} />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Project search' }),
      {
        target: { value: longSearch },
      },
    )

    expect(setSearch).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(setSearch).toHaveBeenCalledWith(longSearch)
  })

  it('clears project search state from the clear button', () => {
    const setSearch = vi.fn()
    const filterState = makeFilterState(
      { search: 'autostrada' },
      { setSearch },
    )

    render(<PnrrProjectSearchInput filterState={filterState} />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(setSearch).toHaveBeenCalledWith(undefined)
  })
})
