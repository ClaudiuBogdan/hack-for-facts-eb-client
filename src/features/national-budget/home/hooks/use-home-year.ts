import { useCallback } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'

import { useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { defaultYear, viewOfYear, yearViews, type YearView } from '../lib/home-data'

const route = getRouteApi('/national-budget/')

/** The roots of the page's query keys: the national budget API's reads, the page's own, ANAF's. */
const NATIONAL_BUDGET_ROOTS = new Set(['national-budget-analytics', 'national-budget-home', 'national-budget-home-anaf'])

/**
 * The page's year, from its address (`an`), and the way to change it. The
 * default year stays out of the address; a change is a history entry, so
 * Back returns to the year before.
 */
export function useHomeYear(): { readonly view: YearView; readonly views: readonly YearView[]; readonly setYear: (year: number) => void } {
  const catalog = useNationalCatalog()
  const an = route.useSearch({ select: (search) => search.an })
  const navigate = useNavigate({ from: '/national-budget/' })
  const client = useQueryClient()
  const fallback = defaultYear(catalog)
  const setYear = useCallback(
    (year: number) => {
      // A read that failed is read afresh when its year is shown again, not answered with its old error.
      client.removeQueries({ predicate: (query) => query.state.status === 'error' && NATIONAL_BUDGET_ROOTS.has(String(query.queryKey[0])) })
      void navigate({ search: (previous) => ({ ...previous, an: year === fallback ? undefined : year }), resetScroll: false })
    },
    [client, navigate, fallback],
  )
  return { view: viewOfYear(catalog, an), views: yearViews(catalog), setYear }
}
