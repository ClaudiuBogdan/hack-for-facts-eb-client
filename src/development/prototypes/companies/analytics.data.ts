import { useNavigate, useSearch } from '@tanstack/react-router'
import type { CompanyAnalyticsAddress } from '@/features/private-companies/hooks/use-company-analytics'
import { urlSearchOf, type CompanyAnalyticsState } from '@/features/private-companies/lib/company-analytics-url'

/**
 * The prototype's address for the promoted page's data
 * (`useCompanyAnalyticsPage`): the question read from the harness's own
 * address and asked again in place, the harness's keys (`v`, `layout`) and
 * the site's language (`lang`) kept on every move. The page itself is the
 * feature's (`CompanyAnalyticsView`), so the prototype shows what is live.
 */

/** The harness's own keys and the site's language, kept on every move. */
const KEPT = ['v', 'layout', 'lang'] as const

function searchFor(next: CompanyAnalyticsState) {
  return (previous: Record<string, unknown>) => ({
    ...Object.fromEntries(KEPT.filter((key) => previous[key] !== undefined).map((key) => [key, previous[key]])),
    ...urlSearchOf(next),
  })
}

export function usePrototypeAddress(): CompanyAnalyticsAddress {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  return {
    search,
    go: (next) => navigate({ to: '.', search: searchFor(next), resetScroll: false }),
    link: (next) => ({ to: '.', search: searchFor(next), resetScroll: false }),
  }
}
