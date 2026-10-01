import { createFileRoute, redirect } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { ProcurementAnalyticsServerRead } from '@/features/procurement/api/procurement-analytics-ssr'
import { analyticsRedirectSearch, isExplorerSearch } from '@/features/procurement/lib/analytics-legacy'
import { categoryLandingOf, landingDescription, landingName, landingTitle, pageTitle } from '@/features/procurement/lib/analytics-head'
import { analyticsSearchOf, SEARCH_KEYS, type AnalyticsUrlSearch } from '@/features/procurement/lib/analytics-model'

/**
 * The keys the page reads, each a string or the number a digits-only value
 * travels as; any other is left to its own route. A page key the router
 * parsed as something else (`cpv=true`, `cpv=45&cpv=33`) stays as text, for
 * the page to say it could not read it: dropped, the address would read as
 * the bare page or a landing, and be indexed as one.
 */
function validateAnalyticsSearch(search: Record<string, unknown>): AnalyticsUrlSearch {
  const valid: Record<string, string | number> = {}
  for (const key of SEARCH_KEYS) {
    const value = search[key]
    if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) valid[key] = value
    else if (value !== undefined && value !== null) valid[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
  return valid
}

/**
 * `/procurement/analytics` (design.md §18): one question about public
 * procurement — what records, which period, which filters, grouped by what —
 * written in the address and answered on the page. It replaced the explorer
 * at `/procurement/search`; a link that still carries an explorer question
 * (here, when this path redirected to the explorer, or there) is answered
 * with the same question in this page's words.
 *
 * The answer is read on the server (the cutoff, then the figures, the
 * ranking or the series or the records, the years and the names, kept ten
 * minutes per question under a deadline — see `procurement-analytics-ssr.ts`)
 * and seeds the page's queries; on a client-side navigation the loader
 * returns at once and the page reads in the browser.
 */
export const Route = createFileRoute('/procurement/analytics')({
  ssr: true,
  validateSearch: validateAnalyticsSearch,
  beforeLoad: ({ location }) => {
    const raw = location.search as Record<string, unknown>
    if (isExplorerSearch(raw)) throw redirect({ to: '/procurement/analytics', search: analyticsRedirectSearch(raw), replace: true, statusCode: 301 })
  },
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }): Promise<ProcurementAnalyticsServerRead> => {
    if (!shouldBlockLoaderForSsr()) return { seed: [], complete: true }
    const { readProcurementAnalyticsForSsr } = await import('@/features/procurement/api/procurement-analytics-ssr')
    return readProcurementAnalyticsForSsr(deps.search)
  },
  // A render with a failed read is served once and read again, never cached for everyone. The document follows the locale and theme cookies.
  headers: ({ loaderData }) =>
    !loaderData?.complete
      ? // The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
        { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 600,
          staleWhileRevalidateSeconds: 3600,
          vary: ['Accept-Encoding', 'Cookie'],
        }),
  // In the request's own language: the shared Lingui instance may hold another request's by the time a head that waited on its loader runs.
  // A named category alone is a landing with its own title and address; the bare page is the page; any other question — a
  // code that names no category among them — is a reader's own, answered but not indexed (design.md §19). No canonical or
  // og:url elsewhere for those: with noindex it would contradict it, and a shared question's preview would be the bare page's.
  head: ({ match, loaderData }) => {
    const locale = match.context.locale
    const translator = translatorFor(locale)
    const search = analyticsSearchOf(match.search as Record<string, unknown>)
    const landing = categoryLandingOf(search)
    const bare = Object.keys(search).length === 0
    const name = landing ? landingName(landing.code, locale, loaderData?.landingName) : null
    const canonical = landing ? `${getSiteUrl()}/procurement/analytics?${landing.search}` : `${getSiteUrl()}/procurement/analytics`
    const title = landing ? landingTitle(translator, landing, name) : pageTitle(translator)
    const description = landing
      ? landingDescription(translator, landing, name)
      : translator._(msg`Câte achiziții, contracte și acorduri-cadru, pentru câți lei, la ce instituții, firme, categorii și locuri: întreabă și compară, din SEAP, din 2019.`)
    const indexed = (landing !== null && name !== null) || bare
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...(indexed ? [] : [{ name: 'robots', content: 'noindex, follow' }]),
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        ...(indexed ? [{ property: 'og:url', content: canonical }] : []),
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: indexed ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
})
