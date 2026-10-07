import { createFileRoute } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { JusticeAnalysisServerRead } from '@/features/justice/api/justice-analysis-ssr'
// No module that loads a snapshot: a route module is in the entry every page loads (`-justice-analytics-entry.test.ts`).
import { ANALYSIS_SEARCH_KEYS, type AnalysisSearchKey } from '@/features/justice/lib/analysis-codes'
import { buildAnalysisPageDescription, buildAnalysisPageTitle } from '@/features/justice/lib/justice-page-titles'

/**
 * The keys the page reads, each a string or the number the year travels
 * as; any other key is dropped. A key the router parsed as something else
 * (`judet=1`, an array) stays as text, for the question to drop it: the
 * address then is not the bare page, and is not indexed as one.
 */
function validateAnalysisSearch(search: Record<string, unknown>): Partial<Record<AnalysisSearchKey, string | number>> {
  const valid: Partial<Record<AnalysisSearchKey, string | number>> = {}
  for (const key of ANALYSIS_SEARCH_KEYS) {
    const value = search[key]
    if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) valid[key] = value
    else if (value !== undefined && value !== null) valid[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
  return valid
}

/**
 * `/justice/analytics` (design.md §15): one question about the courts'
 * cases — which courts, matters and stages, which year, grouped by what —
 * written in the address and answered on the page.
 *
 * The answer is read on the server (every read the question needs, each
 * kept ten minutes under a deadline — `justice-analysis-ssr.ts`) and seeds
 * the page's queries; on a client-side navigation the loader returns at once
 * and the page reads in the browser.
 */
export const Route = createFileRoute('/justice/analytics')({
  ssr: true,
  validateSearch: validateAnalysisSearch,
  // The page's keys; the server read takes the question they ask (`questionOf`), and shares each of its reads with every question that makes it.
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }): Promise<JusticeAnalysisServerRead> => {
    if (!shouldBlockLoaderForSsr()) return { seed: [], complete: true }
    const { readAnalysisForSsr } = await import('@/features/justice/api/justice-analysis-ssr')
    return readAnalysisForSsr(deps.search)
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
  // The bare page is the page; any other question is a reader's own, answered and shared but not indexed, with no canonical to contradict it.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    const bare = ANALYSIS_SEARCH_KEYS.every((key) => (match.search as Record<string, unknown>)[key] === undefined)
    const canonical = `${getSiteUrl()}/justice/analytics`
    const title = buildAnalysisPageTitle(translator)
    const description = buildAnalysisPageDescription(translator)
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
