import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'

export type NationalBudgetHomeSearch = { readonly an?: number }

/**
 * The page's one key, the year (`an=2024`): a whole number in a plausible
 * range, as the router parsed it or as text. Anything else is dropped and the
 * page opens on its default year; the rest of an address (`lang`) is the
 * site's.
 */
export function validateNationalBudgetHomeSearch(search: Record<string, unknown>): NationalBudgetHomeSearch {
  const an = typeof search.an === 'number' || typeof search.an === 'string' ? Number(search.an) : Number.NaN
  return Number.isInteger(an) && an >= 2000 && an <= 2100 ? { an } : {}
}

/**
 * `/national-budget`: the national budget for every reader — how big it is,
 * what it is spent on and by whom, where it comes from, how much is borrowed,
 * how the year in progress goes, the budgets it passes through and what the
 * law approved; one year at a time. Its questions open `/national-budget/analytics`.
 * Rendered on the server: the bands' suspense reads run there and reach the
 * browser through the router's query integration.
 *
 * No response is cached, by a CDN or by the browser: a render whose read
 * failed carries the band's error, and the API's snapshots move when a
 * bulletin or a law lands.
 */
export const Route = createFileRoute('/national-budget/')({
  ssr: true,
  validateSearch: validateNationalBudgetHomeSearch,
  // The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
  headers: () => ({ ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }),
  // In the request's own language. The bare page is indexed; a chosen year is a view of it.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    const bare = (match.search as NationalBudgetHomeSearch).an === undefined
    const title = translator._(msg`Bugetul național: de unde vin banii publici și pe ce se duc — Transparenta.eu`)
    const description = translator._(
      msg`Cât încasează și cât cheltuie statul român, pe ce, prin ce ministere și cât se împrumută, an de an din 2006. Date din buletinele de execuție ale Ministerului Finanțelor, execuția bugetară raportată la ANAF și legile bugetului.`,
    )
    const canonical = `${getSiteUrl()}/national-budget`
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
