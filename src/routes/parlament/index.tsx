import { createFileRoute, redirect } from '@tanstack/react-router'
import { ParliamentSearchSchema } from '@/schemas/parliament-search'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'

export interface ParliamentLoaderData {
  /** False when one of the hub's server reads failed: that render is served once, not cached. */
  readonly complete: boolean
}

/**
 * `/parlament` — the hub (`?tab=prezentare`, the default) and the list tabs.
 *
 * The hub's first screen is read on the server, under the keys its hooks use,
 * so the HTML carries the votes, bills, agenda and groups and the browser
 * makes none of those reads after hydration (`parliament-hub-ssr.ts`). In the
 * browser the loader starts the same reads and returns at once. The list tabs
 * read in the browser, as before.
 */
export const Route = createFileRoute('/parlament/')({
  ssr: true,
  validateSearch: ParliamentSearchSchema,
  beforeLoad: ({ search }) => {
    if (search.tab === 'membri') {
      throw redirect({
        to: '/parlament',
        search: {
          ...search,
          tab: 'grupuri',
        },
        replace: true,
      })
    }
  },
  loaderDeps: ({ search }) => ({ tab: search.tab }),
  loader: async ({ context, deps }): Promise<ParliamentLoaderData> => {
    if ((deps.tab ?? 'prezentare') !== 'prezentare') return { complete: true }
    const hub = await import('@/features/parliament/api/parliament-hub-ssr')
    if (!shouldBlockLoaderForSsr()) {
      hub.prefetchParliamentHub(context.queryClient)
      return { complete: true }
    }
    return hub.seedParliamentHubForSsr(context.queryClient)
  },
  // A render with a failed read is not worth caching for everyone: it is
  // served once and the next request reads again.
  headers: ({ loaderData }) =>
    loaderData?.complete === false
      ? // The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
        { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 600,
          staleWhileRevalidateSeconds: 3600,
        }),
})
