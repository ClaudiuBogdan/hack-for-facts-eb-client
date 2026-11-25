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
 * `/national-budget`: the national budget at one person's scale — where the
 * money comes from and what it goes on, the budgets it passes through, what
 * the state budget pays and through whom, how much is borrowed year by year
 * and how the year in progress goes; one year at a time. Its questions open `/national-budget/analytics`.
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
  // The layout's cache headers merge key by key: a CDN directive of its own would outlive this one. Private: the
  // render reads the reader's cookies (language, currency, theme), so no shared cache may keep it (CACHE-001).
  headers: () => ({ ...createNoStoreHeaders(), 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' }),
  // In the request's own language. The bare page is indexed; a chosen year is a view of it.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    const an = (match.search as NationalBudgetHomeSearch).an
    const bare = an === undefined
    const title = translator._(msg`Bugetul național: de unde vin banii publici și pe ce se duc — Transparenta.eu`)
    const description = translator._(
      msg`Cât cheltuie statul român pentru fiecare locuitor, pe ce și din ce bani, prin ce bugete trec banii, cât e deficitul an de an din 2006 și cum merge anul în curs. Date din buletinele de execuție ale Ministerului Finanțelor, execuția bugetului de stat raportată la ANAF și populația după INS.`,
    )
    const canonical = `${getSiteUrl()}/national-budget`
    // The share card for the year and language shown (server-made, `/national-budget/share-image.png`).
    const locale = match.context.locale === 'en' ? 'en' : 'ro'
    const image = `${getSiteUrl()}/national-budget/share-image.png?${an === undefined ? '' : `an=${an}&`}lang=${locale}`
    const imageAlt = translator._(msg`Partea fiecărui locuitor din cheltuielile publice ale anului`)
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...(bare ? [] : [{ name: 'robots', content: 'noindex, follow' }]),
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        ...(bare ? [{ property: 'og:url', content: canonical }] : []),
        { property: 'og:image', content: image },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: imageAlt },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: image },
        { name: 'twitter:image:alt', content: imageAlt },
      ],
      links: bare ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
})
