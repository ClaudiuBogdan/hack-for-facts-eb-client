import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'

export type LegislationRouteLoaderData = {
  /** Server render only: `false` when the gazette band's read failed and the browser reads it. */
  readonly seeded?: boolean
}

/**
 * The front door reads only its gazette band (the citation ranking is the
 * analytics tab's), through the page's query. On the server the loader fills
 * that query from the read kept in the server process
 * (`legal-front-door-ssr.ts`), and the router hydrates it into the browser's
 * cache. A failed server read is left out of the cache: the page reads it in
 * the browser, and the render goes out `no-store`. On a client-side
 * navigation the loader starts the query's read and returns at once, so the
 * page frame paints and the band fills in; a read the cache already holds is
 * not made again. The feature's modules are imported inside the loader, so
 * this file (which every page's route tree carries) stays thin.
 */
export const Route = createFileRoute('/legislation/')({
  loader: async ({ context }): Promise<LegislationRouteLoaderData> => {
    const { legislationFrontDoorQueryOptions } = await import('@/features/legal/hooks/use-legislation')
    const options = legislationFrontDoorQueryOptions()
    if (!shouldBlockLoaderForSsr()) {
      void context.queryClient.prefetchQuery(options).catch(() => undefined)
      return {}
    }
    const { readLegislationFrontDoorForSsr } = await import('@/features/legal/api/legal-front-door-ssr')
    try {
      await context.queryClient.ensureQueryData({ ...options, queryFn: () => readLegislationFrontDoorForSsr(), retry: false })
      return { seeded: true }
    } catch {
      // Not dehydrated as a failure: the browser's query reads it afresh.
      context.queryClient.removeQueries({ queryKey: options.queryKey, exact: true })
      return { seeded: false }
    }
  },
  headers: ({ loaderData }) =>
    loaderData?.seeded === false
      ? createNoStoreHeaders()
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 600,
          staleWhileRevalidateSeconds: 3600,
        }),
  head: () => ({
    meta: [
      { title: `${t`Legislația României`} — Transparenta.eu` },
      {
        name: 'description',
        content: t`Legi, ordonanțe și hotărâri din Portal Legislativ, cu statutul lor și dovada publicării în Monitorul Oficial.`,
      },
    ],
  }),
})
