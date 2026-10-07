import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { parseJusticeHubSearch } from '@/schemas/judicial'
import { buildJusticeHubTitle } from '@/features/justice/lib/justice-page-titles'

/**
 * `/justice` — the court portal's front door. Its figures are the snapshot
 * the judicial API served when the capture of portal.just.ro stopped
 * (`hub-snapshot.ts`), so the page reads nothing and is cached publicly; the
 * render follows the locale and theme cookies, so a shared cache keys on the
 * cookie.
 */
export const Route = createFileRoute('/justice/')({
  validateSearch: parseJusticeHubSearch,
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 604800,
      vary: ['Accept-Encoding', 'Cookie'],
    }),
  // In the request's own language: the shared Lingui instance may hold another request's.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    const title = buildJusticeHubTitle()
    const description = translator._(
      msg`Dosarele de pe portalul instanțelor din România: ce se judecă, la ce instanțe, pe ce treaptă și în ce județ, cu hotărârile CEDO și deciziile CCR și CNSC. Persoanele nu sunt numite.`,
    )
    const canonical = `${getSiteUrl()}/justice`
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonical },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [{ rel: 'canonical', href: canonical }],
    }
  },
})
