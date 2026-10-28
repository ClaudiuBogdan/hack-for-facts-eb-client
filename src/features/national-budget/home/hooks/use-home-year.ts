import { useCallback } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'

import { useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { reasonText } from '@/features/national-budget/analytics/lib/analytics-view'
import type { BudgetNationalCatalog } from '@/schemas/national-budget-api'
import { defaultYear, viewOfYear, yearViews, type YearView } from '../lib/home-data'
import { useUnfinishedYears } from './use-home-data'

const route = getRouteApi('/national-budget/')

/** The roots of the page's query keys: the national budget API's reads, the page's own, ANAF's. */
const NATIONAL_BUDGET_ROOTS = new Set(['national-budget-analytics', 'national-budget-home', 'national-budget-home-anaf'])

export type HomeYear = { readonly view: YearView; readonly views: readonly YearView[]; readonly setYear: (year: number) => void }

/** The page's year as shown: the address's year, or the default one when the bulletins don't finish it. */
export type ShownYear = HomeYear & {
  /** The years the bulletins don't finish, when they were read; empty when they weren't needed. */
  readonly unavailable: ReadonlyMap<number, string | null>
  /** Why the page shows another year than the address asks for; null when it shows that year. */
  readonly notice: string | null
}

/** The year the address asks for (`an`), as the route parsed it; none on the bare page. */
export function useAskedYear(): number | undefined {
  return route.useSearch({ select: (search) => search.an })
}

/**
 * The page's year, from its address (`an`), and the way to change it. The
 * default year stays out of the address; a change is a history entry, so
 * Back returns to the year before.
 */
export function useHomeYear(): HomeYear {
  const catalog = useNationalCatalog()
  const an = useAskedYear()
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

/**
 * Whether the page must know the years the bulletins don't finish before it
 * shows the year it read from the address. Only a full year other than the
 * default can be one the page won't show: the year in progress never is, and
 * the default is what it would show instead. So the bare page waits for the
 * catalog alone, not for the years' read behind the list.
 */
export function needsYearCheck(view: YearView, catalog: BudgetNationalCatalog): boolean {
  return !view.partial && view.year !== defaultYear(catalog)
}

/**
 * The year shown, given the years the bulletins don't finish. A year asked
 * for in the address that is one of them (the menus don't offer it) opens the
 * default year instead, and says why.
 */
export function shownYearOf(catalog: BudgetNationalCatalog, year: HomeYear, unavailable: ReadonlyMap<number, string | null>): ShownYear {
  const asked = year.view.year
  if (!unavailable.has(asked)) return { ...year, unavailable, notice: null }
  const shown = viewOfYear(catalog, undefined)
  return { ...year, view: shown, unavailable, notice: t`Pentru ${asked} buletinele nu au anul întreg (${reasonText(unavailable.get(asked) ?? null)}); arătăm ${shown.text}.` }
}

/**
 * The year the page shows. The years the bulletins don't finish are read
 * only when the address asks for a year that could be one (`needsYearCheck`):
 * the bare page doesn't wait for them.
 */
export function useShownYear(): ShownYear {
  const catalog = useNationalCatalog()
  const year = useHomeYear()
  return shownYearOf(catalog, year, useUnfinishedYears(year.views, needsYearCheck(year.view, catalog)))
}

/** The year shown, always checked against the years the bulletins don't finish: for the year menus, which list them. */
export function useCheckedYear(): ShownYear {
  const catalog = useNationalCatalog()
  const year = useHomeYear()
  return shownYearOf(catalog, year, useUnfinishedYears(year.views))
}
