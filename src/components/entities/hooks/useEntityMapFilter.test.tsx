import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useEntityMapFilter } from './useEntityMapFilter'

const navigateMock = vi.fn()
let searchMock: Record<string, unknown>

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useSearch: () => searchMock,
}))

describe('useEntityMapFilter', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    searchMock = {}
  })

  it('patches missing map currency once without mutating search filters', async () => {
    const initialMapFilters = {
      account_category: 'ch',
      normalization: 'total',
    }
    searchMock = {
      mapFilters: initialMapFilters,
    }

    const { rerender, result } = renderHook(() =>
      useEntityMapFilter({ year: 2025, currency: 'RON' }),
    )

    expect(result.current.mapFilters).toMatchObject({
      account_category: 'ch',
      normalization: 'total',
      report_period: {
        type: 'YEAR',
        selection: { dates: ['2025'] },
      },
      report_type: 'Executie bugetara agregata la nivel de ordonator principal',
    })
    expect(initialMapFilters).toEqual({
      account_category: 'ch',
      normalization: 'total',
    })

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1))

    const navigateOptions = navigateMock.mock.calls[0][0]
    const nextSearch = navigateOptions.search(searchMock)
    expect(nextSearch).toMatchObject({
      mapFilters: {
        account_category: 'ch',
        normalization: 'total',
        currency: 'RON',
      },
    })

    searchMock = nextSearch
    rerender()

    expect(navigateMock).toHaveBeenCalledTimes(1)
  })
})
