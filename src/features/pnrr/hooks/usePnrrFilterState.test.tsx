import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePnrrFilterState } from './usePnrrFilterState'

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  location: {
    pathname: '/pnrr',
    searchStr: '',
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => routerMocks.navigate,
  useSearch: () => ({
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
    includeNational: false,
  }),
  useLocation: () => routerMocks.location,
}))

describe('usePnrrFilterState', () => {
  beforeEach(() => {
    routerMocks.navigate.mockReset()
    routerMocks.location.pathname = '/pnrr'
    routerMocks.location.searchStr = ''
  })

  it('does not canonicalize search params after leaving the PNRR route', async () => {
    routerMocks.location.pathname = '/cookies'
    routerMocks.location.searchStr =
      '?redirect=%2Fpnrr%3Fview%3Dbeneficiaries'

    renderHook(() => usePnrrFilterState())

    await waitFor(() => {
      expect(routerMocks.navigate).not.toHaveBeenCalled()
    })
  })

  it('canonicalizes non-canonical search params on the PNRR route', async () => {
    routerMocks.location.searchStr = '?view=beneficiaries&unknown=value'

    renderHook(() => usePnrrFilterState())

    await waitFor(() => {
      expect(routerMocks.navigate).toHaveBeenCalledWith({
        search: { view: 'beneficiaries' },
        replace: true,
        resetScroll: false,
      })
    })
  })
})
