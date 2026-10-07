import { createFileRoute } from '@tanstack/react-router'
import { PublicEnterpriseHubPending } from '@/features/public-enterprises/components/hub/hub-pending'
import { buildPublicEnterpriseHubHead, publicEnterpriseHubSeoFigures } from '@/features/public-enterprises/lib/hub-head'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { parsePublicEnterpriseHubSearch } from '@/schemas/public-enterprises'

/**
 * `/public-enterprises` reads no API: its figures are the snapshot the
 * generator keeps in the client (the API serves no aggregate yet), so the
 * page renders in full on the server and caches publicly. Only the hero's
 * search talks to the API, on typing.
 *
 * The page's chunk imports the snapshot; the loader imports it only for the
 * few figures the head quotes, so it stays out of the entry bundle and out of
 * the hydration payload. On a client navigation the page's head shows while
 * its chunk loads (`PublicEnterpriseHubPending`). The render follows the
 * locale and theme cookies, so a shared cache keys on the cookie, as `/ngos`
 * does.
 */
export const Route = createFileRoute('/public-enterprises/')({
  validateSearch: parsePublicEnterpriseHubSearch,
  pendingComponent: PublicEnterpriseHubPending,
  loader: async () => {
    const { PUBLIC_ENTERPRISE_HUB_SNAPSHOT } = await import('@/features/public-enterprises/lib/hub-snapshot')
    return { seo: publicEnterpriseHubSeoFigures(PUBLIC_ENTERPRISE_HUB_SNAPSHOT) }
  },
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 86_400,
      vary: ['Accept-Encoding', 'Cookie'],
    }),
  head: ({ loaderData, match }) => (loaderData ? buildPublicEnterpriseHubHead(loaderData.seo, match.context.locale) : {}),
})
