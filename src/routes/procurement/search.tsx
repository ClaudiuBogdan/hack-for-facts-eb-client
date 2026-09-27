import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import {
  cleanProcurementHubSearch,
  parseProcurementHubSearch,
} from '@/schemas/procurement-hub'

/**
 * `/procurement/search` — the explorer: the overview with the buyer map, the
 * record list and the rankings, on one URL schema. It was `/procurement`
 * until the front door took that address; old links carrying an explorer
 * choice are redirected here by the front door's route.
 */
export const Route = createFileRoute('/procurement/search')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = parseProcurementHubSearch(search)
    return cleanProcurementHubSearch(parsed)
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
      // The document follows the locale and theme cookies.
      vary: ['Accept-Encoding', 'Cookie'],
    }),
  // In the request's own language, not the shared Lingui instance's.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    const canonical = `${getSiteUrl()}/procurement/search`
    const title = `${translator._(msg`Explorează achizițiile publice`)} — Transparenta.eu`
    const description = translator._(
      msg`Caută contracte, achiziții directe și proceduri din SEAP și compară instituțiile, firmele și categoriile, cu filtre pe perioadă, județ și valoare.`,
    )
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
