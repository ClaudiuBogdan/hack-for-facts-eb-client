import { createFileRoute } from '@tanstack/react-router'
import { buildNgoHubHead } from '@/features/ngos/hub/ngo-hub-head'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { parseNgoLandingSearch } from '@/schemas/ngos'

/**
 * `/ong-uri` reads no API: its figures are the registry summary kept in the
 * client, so the page renders on the server at once and caches like a static
 * page. Only the hero's search talks to the API, on typing.
 *
 * The summary is imported by the loader rather than by this file, so it
 * travels with this page and stays out of the entry bundle every other page
 * downloads.
 */
export const Route = createFileRoute('/ong-uri/')({
  validateSearch: parseNgoLandingSearch,
  loader: async () => ({ summary: (await import('@/features/ngos/hub/registry-summary')).NGO_REGISTRY_SUMMARY }),
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 86_400,
    }),
  head: ({ loaderData }) => (loaderData ? buildNgoHubHead(loaderData.summary) : {}),
})
