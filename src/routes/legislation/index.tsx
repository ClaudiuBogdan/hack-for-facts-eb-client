import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'

export type LegislationRouteLoaderData = {
  /** Server render only: `false` when the gazette band's or an analytics read failed and the browser reads it. */
  readonly seeded?: boolean
  /** Server render only: an analytics read was refused with 503 (no layer published yet): render the panel. */
  readonly analyticsUnavailable?: boolean
}

/** The front door's aggregate analytics reads, rendered on the server (the acts board is read in the browser). */
const ANALYTICS_READS = [
  ['head', {}],
  ['summary', {}],
  ['series', { lens: 'felul' }],
] as const

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
    const [{ legislationFrontDoorQueryOptions }, { legalAnalyticsQueryOptions }] = await Promise.all([
      import('@/features/legal/hooks/use-legislation'),
      import('@/features/legal/hooks/use-legislation-analytics'),
    ])
    const options = legislationFrontDoorQueryOptions()
    if (!shouldBlockLoaderForSsr()) {
      void context.queryClient.prefetchQuery(options).catch(() => undefined)
      for (const [view, args] of ANALYTICS_READS) {
        void context.queryClient.prefetchQuery(legalAnalyticsQueryOptions(view, args)).catch(() => undefined)
      }
      return {}
    }
    const [{ readLegislationFrontDoorForSsr }, { readLegalAnalyticsForSsr }] = await Promise.all([
      import('@/features/legal/api/legal-front-door-ssr'),
      import('@/features/legal/api/legal-analytics-ssr'),
    ])
    let seeded = true
    let analyticsUnavailable = false
    try {
      await context.queryClient.ensureQueryData({ ...options, queryFn: () => readLegislationFrontDoorForSsr(), retry: false })
    } catch {
      // Not dehydrated as a failure: the browser's query reads it afresh.
      context.queryClient.removeQueries({ queryKey: options.queryKey, exact: true })
      seeded = false
    }
    // The analytics bands degrade on their own: a refused read (no layer published yet) is read in the browser.
    const results = await Promise.allSettled(
      ANALYTICS_READS.map(([view, args]) =>
        context.queryClient.ensureQueryData({
          ...legalAnalyticsQueryOptions(view, args),
          queryFn: () => readLegalAnalyticsForSsr(view, args),
          retry: false,
        }),
      ),
    )
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') return
      seeded = false
      // a 503 (no layer published yet, or busy): the page renders the calm panel on the server
      if ((r.reason as { kind?: unknown } | null)?.kind === 'unavailable') analyticsUnavailable = true
      const [view, args] = ANALYTICS_READS[j] ?? ANALYTICS_READS[0]
      context.queryClient.removeQueries({ queryKey: legalAnalyticsQueryOptions(view, args).queryKey, exact: true })
    })
    return { seeded, analyticsUnavailable }
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
