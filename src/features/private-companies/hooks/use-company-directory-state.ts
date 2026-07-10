import { useCallback } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  cleanPrivateCompanyDirectorySearch,
  type PrivateCompanyDirectorySearchState,
  type PrivateCompanySortValue,
} from '@/schemas/private-company-search'
import type { CompanyDirectoryFilterPatch } from '../lib/company-directory-filter'
import { clearCompanyDirectoryFilters } from '../lib/company-directory-filter'

/**
 * URL-as-state for /companies/search, scoped down from `usePnrrFilterState`.
 * Every mutation is a patch merged into the current search, cleaned, and pushed
 * with `replace` so filter fiddling does not fill the back stack, and with
 * `resetScroll: false` so the result list stays where the user left it.
 */
export function useCompanyDirectoryState() {
  const search = useSearch({ from: '/companies/search' })
  const navigate = useNavigate({ from: '/companies/search' })

  const updateSearch = useCallback(
    (patch: CompanyDirectoryFilterPatch) => {
      void navigate({
        search: (prev: PrivateCompanyDirectorySearchState) =>
          cleanPrivateCompanyDirectorySearch({ ...prev, ...patch }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate],
  )

  const setQ = useCallback(
    (q: string | undefined) => updateSearch({ q }),
    [updateSearch],
  )

  const setSort = useCallback(
    (sort: PrivateCompanySortValue | undefined) => updateSearch({ sort }),
    [updateSearch],
  )

  const applyFilterPatch = useCallback(
    (patch: CompanyDirectoryFilterPatch) => updateSearch(patch),
    [updateSearch],
  )

  const clearFilters = useCallback(() => {
    void navigate({
      search: (prev: PrivateCompanyDirectorySearchState) =>
        cleanPrivateCompanyDirectorySearch(clearCompanyDirectoryFilters(prev)),
      replace: true,
      resetScroll: false,
    })
  }, [navigate])

  return { search, updateSearch, setQ, setSort, applyFilterPatch, clearFilters }
}
