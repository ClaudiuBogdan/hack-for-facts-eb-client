import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { SEARCH_KEYS, type AdvancedState } from '@/features/national-budget/analytics/lib/analytics-state'

export type NationalBudgetAnalyticsSearch = Partial<Record<keyof AdvancedState, string | number | boolean>>

/**
 * The keys the page reads, each as the router parsed it (a year travels as a
 * number, `cumulat=false` as a boolean); the rest of an address (`lang`) is
 * left to the site. A value the router parsed as something else stays as
 * text: the page reads what it can and falls back to its default for the
 * rest (`parseAdvanced`).
 */
export function validateNationalBudgetAnalyticsSearch(search: Record<string, unknown>): NationalBudgetAnalyticsSearch {
  const valid: Record<string, string | number | boolean> = {}
  for (const key of SEARCH_KEYS) {
    const value = search[key]
    if (typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) valid[key] = value
    else if (value !== undefined && value !== null) valid[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
  return valid
}

/**
 * `/national-budget/analytics`: the national budget's analysis page — the MF
 * bulletins' execution by line, by budget and in time, and the budget laws
 * by fund, chapter and ministry — one question written in the address and
 * answered on the page. Rendered on the server: the page's suspense reads run
 * there and reach the browser through the router's query integration, so a
 * document carries its numbers and the browser doesn't read them again.
 *
 * No response is cached, by a CDN or by the browser: a render whose read
 * failed carries the page's error, and the API's snapshots move when a
 * bulletin or a law lands; every request reads afresh.
 */
export const Route = createFileRoute('/national-budget/analytics')({
  ssr: true,
  validateSearch: validateNationalBudgetAnalyticsSearch,
  // The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
  headers: () => ({ ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }),
  // In the request's own language. The bare page is indexed; a reader's own question is answered, not indexed.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    const bare = Object.keys(match.search as Record<string, unknown>).filter((key) => (SEARCH_KEYS as readonly string[]).includes(key)).length === 0
    const title = translator._(msg`Bugetul național: execuția și legile bugetului, pe rânduri, bugete și ani — Transparenta.eu`)
    const description = translator._(
      msg`Cât a cheltuit și cât a încasat statul, lună de lună, din 2006, pe categorii și pe bugete, și ce aprobă legile bugetului, pe fonduri, capitole și ministere. Date din buletinele de execuție și legile bugetului ale Ministerului Finanțelor.`,
    )
    const canonical = `${getSiteUrl()}/national-budget/analytics`
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...(bare ? [] : [{ name: 'robots', content: 'noindex, follow' }]),
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        ...(bare ? [{ property: 'og:url', content: canonical }] : []),
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: bare ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
})
