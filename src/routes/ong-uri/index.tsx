import { createFileRoute } from '@tanstack/react-router'
import { buildNgoHubHead, ngoHubSeoFigures } from '@/features/ngos/hub/ngo-hub-head'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { parseNgoLandingSearch } from '@/schemas/ngos'

/**
 * `/ong-uri` reads no API: its figures are the registry and finance
 * summaries kept in the client, so the page renders in full on the server
 * and caches publicly. Only the hero's search talks to the API, on typing.
 *
 * The page's chunk imports the summaries; the loader imports them only for
 * the few figures the head quotes, so they stay out of the entry bundle and
 * out of the hydration payload. The render follows the locale and theme
 * cookies, so a shared cache keys on the cookie, as `/companies` does.
 */
export const Route = createFileRoute('/ong-uri/')({
  validateSearch: parseNgoLandingSearch,
  loader: async () => {
    const [registry, finance] = await Promise.all([import('@/features/ngos/hub/registry-summary'), import('@/features/ngos/hub/finance-summary')])
    return { seo: ngoHubSeoFigures(registry.NGO_REGISTRY_SUMMARY, finance.NGO_FINANCE_SUMMARY) }
  },
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 86_400,
      vary: ['Accept-Encoding', 'Cookie'],
    }),
  head: ({ loaderData, match }) => (loaderData ? buildNgoHubHead(loaderData.seo, match.context.locale) : {}),
})
