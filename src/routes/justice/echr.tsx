import { createFileRoute } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
// No snapshot here: a route module is in the entry every page loads (`-justice-echr-entry.test.ts`).
import { ECHR_SEARCH_KEYS, isBareEchrSearch } from '@/features/justice/lib/echr-address'
import { buildEchrPageDescription, buildEchrPageTitle } from '@/features/justice/lib/justice-page-titles'
import { validatePageSearch } from '@/features/justice/lib/page-search'

/**
 * `/justice/echr` (design.md §17–18): the European Court of Human Rights'
 * judgments in cases against Romania, from a snapshot of the judicial API's
 * HUDOC rows. The page reads nothing, so it is cached publicly; the render
 * follows the locale and theme cookies, so a shared cache keys on the
 * cookie.
 */
export const Route = createFileRoute('/justice/echr')({
  // The year and the tab, for the page to read (`echrQuestionOf`) and drop what it does not know.
  validateSearch: validatePageSearch(ECHR_SEARCH_KEYS),
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 604800,
      vary: ['Accept-Encoding', 'Cookie'],
    }),
  // In the request's own language: the shared Lingui instance may hold another request's.
  // The bare page is the page; another year or tab is a reader's own, followed but not indexed, with no canonical to contradict it.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    const bare = isBareEchrSearch(match.search as Record<string, unknown>)
    const canonical = `${getSiteUrl()}/justice/echr`
    const title = buildEchrPageTitle(translator)
    const description = buildEchrPageDescription(translator)
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
