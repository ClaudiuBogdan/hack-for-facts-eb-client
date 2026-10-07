import { createFileRoute, redirect } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

/** The explorer's own choices: a link carrying one asks for the explorer (a county, a locality, a classification), not for the national budget. */
const EXPLORER_KEYS = ['view', 'primary', 'depth', 'transferFilter', 'search', 'filter', 'treemapPrimary', 'treemapPath'] as const

/**
 * Where a bare `/budget-explorer` goes now: the national budget's own page,
 * `/national-budget`. The explorer was the site's „Buget național" until the
 * citizens' page replaced it (October 2026); a link that names only a year
 * (`?year=2024`) reads that year there (`an`), and the old revenue switch
 * (`accountCategory`) is dropped. The site's own keys (`lang`) go along. A
 * link with any explorer choice stays here: the statistics pages, the
 * learning modules and the AI route guide link the explorer with filters.
 * Null: stay.
 */
export function nationalBudgetRedirectSearch(search: Record<string, unknown>): Record<string, unknown> | null {
  if (EXPLORER_KEYS.some((key) => search[key] !== undefined)) return null
  const { year, accountCategory: _accountCategory, ...rest } = search
  const an = Number(year)
  return Number.isInteger(an) && an >= 2006 && an <= 2100 ? { ...rest, an } : rest
}

export const Route = createFileRoute('/budget-explorer')({
  beforeLoad: ({ search }) => {
    const next = nationalBudgetRedirectSearch(search as Record<string, unknown>)
    if (next) throw redirect({ to: '/national-budget', search: next as never, replace: true, statusCode: 301 })
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 86400,
    }),
})
