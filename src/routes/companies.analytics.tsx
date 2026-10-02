import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { CompanyAnalyticsServerRead } from '@/features/private-companies/api/company-analytics-ssr'
import { SEARCH_KEYS, type CompanyAnalyticsUrlSearch } from '@/features/private-companies/lib/company-analytics-url'

/**
 * The keys the page reads, each a string or the number a digits-only value
 * travels as; the rest of an address (`lang`) is left to the site. A page key
 * the router parsed as something else stays as text, for the page to say it
 * could not read it.
 */
function validateCompanyAnalyticsSearch(search: Record<string, unknown>): CompanyAnalyticsUrlSearch {
  const valid: Record<string, string | number> = {}
  for (const key of SEARCH_KEYS) {
    const value = search[key]
    if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) valid[key] = value
    else if (value !== undefined && value !== null) valid[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
  return valid
}

/**
 * `/companies/analytics`: one question about companies' annual statements,
 * written in the address and answered on the page. The answer is read on the
 * server — the release (the pinned one, or the active one), then the figures
 * and the open panel, pinned to it — and seeds the page's queries; on a
 * client-side navigation the loader returns at once and the page reads in the
 * browser.
 *
 * No response of this route is ever cached, by a CDN or by the browser,
 * however complete: a release withdrawn from publication must stop reaching
 * readers at the next request, and only the API's fresh checks know when it
 * has been. Every render reads the API afresh (`company-analytics-ssr.ts`).
 */
export const Route = createFileRoute('/companies/analytics')({
  ssr: true,
  validateSearch: validateCompanyAnalyticsSearch,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }): Promise<CompanyAnalyticsServerRead> => {
    if (!shouldBlockLoaderForSsr()) return { seed: [], complete: true }
    const { readCompanyAnalyticsForSsr } = await import('@/features/private-companies/api/company-analytics-ssr')
    return readCompanyAnalyticsForSsr(deps.search)
  },
  // The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
  headers: () => ({ ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }),
  // In the request's own language. The bare page is indexed; a reader's own question is answered, not indexed.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    const bare = Object.keys(match.search as Record<string, unknown>).filter((key) => (SEARCH_KEYS as readonly string[]).includes(key)).length === 0
    const title = translator._(msg`Analiza firmelor: cifra de afaceri, profitul și salariații, pe județe și ani — Transparenta.eu`)
    const description = translator._(
      msg`Câte firme, câte au depus bilanț și cât au raportat — cifra de afaceri, rezultatul net, salariații — pe județe, activități, forme juridice și ani fiscali, din 2008. Date ONRC, ANAF și Ministerul Finanțelor.`,
    )
    const canonical = `${getSiteUrl()}/companies/analytics`
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
