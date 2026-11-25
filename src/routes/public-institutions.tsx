import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { readUserCurrencyPreference, readUserInflationAdjustedPreference } from '@/lib/user-preferences'

/** The address keys the page reads: the old /entity-analytics page's, so its links carry over. */
const ADDRESS_KEYS = ['view', 'sortBy', 'sortOrder', 'page', 'pageSize', 'filter', 'treemapPrimary', 'treemapDepth', 'treemapPath', 'transferFilter']

/**
 * `/public-institutions`: public institutions ranked by their expenses or
 * income, with what the money was for under the ranking (the old page,
 * `/entity-analytics`, stays for its links and its full filter panel).
 *
 * The server reads the ranking and the selection's figures for the HTML, in
 * the reader's currency and inflation setting read from their cookies; on a
 * client-side navigation the loader starts the reads and the page shows as
 * they arrive. The page renders from cookies, so no response is kept by a
 * browser or a CDN (CACHE-001).
 */
export const Route = createFileRoute('/public-institutions')({
  headers: () => ({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' }),
  beforeLoad: async () => {
    const [currency, inflationAdjusted] = await Promise.all([readUserCurrencyPreference(), readUserInflationAdjustedPreference()])
    return { publicInstitutionsPreferences: { currency, inflationAdjusted } }
  },
  loaderDeps: ({ search }) => ({ search: search as Record<string, unknown> }),
  loader: async ({ context, deps }) => {
    const { prefetchPublicInstitutions } = await import('@/features/public-institutions/api/public-institutions-prefetch')
    const reads = prefetchPublicInstitutions(context.queryClient, deps.search, context.publicInstitutionsPreferences)
    // The server sends the rows and the figures in the HTML; the browser does not wait.
    if (shouldBlockLoaderForSsr()) await reads
  },
  // In the request's own language. The bare page is indexed; a reader's own selection is answered, not indexed.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    const bare = !Object.keys(match.search as Record<string, unknown>).some((key) => ADDRESS_KEYS.includes(key))
    const title = translator._(msg`Instituții publice: cheltuieli și venituri, instituție cu instituție — Transparenta.eu`)
    const description = translator._(msg`Primăriile, consiliile județene, ministerele, școlile și spitalele, după cheltuieli și venituri, în total sau pe locuitor, an de an, din execuțiile bugetare publicate de ANAF.`)
    const canonical = `${getSiteUrl()}/public-institutions`
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
