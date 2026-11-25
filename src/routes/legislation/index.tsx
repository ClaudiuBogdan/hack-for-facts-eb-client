import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'

export type LegislationRouteLoaderData = {
  /** Server render only: `false` when an analytics read failed and the browser reads it. */
  readonly seeded?: boolean
  /** Server render only: an analytics read was refused with 503 (no layer published yet): render the panel. */
  readonly analyticsUnavailable?: boolean
}

/**
 * The hub's aggregate analytics answers (its figures, the Felul and issuers bands, the years chart:
 * `LEGAL_HUB_SERVER_READS`) are rendered on the server: the loader starts them together, fills the page's
 * queries from the reads kept in the server process (`legal-analytics-ssr.ts`), and the router hydrates them
 * into the browser's cache. Nothing that names an act is read here: the page goes out publicly cached, and the
 * leading acts, the links, the changes and the gazette band are read in the browser. A failed server read is
 * left out of the cache: the page reads it in the browser, and the render goes out `no-store`. On a client-side
 * navigation the loader starts the reads and returns at once, so the page frame paints and the bands fill in; a
 * read the cache already holds is not made again. The feature's modules are imported inside the loader, so
 * this file (which every page's route tree carries) stays thin.
 */
export const Route = createFileRoute('/legislation/')({
  loader: async ({ context }): Promise<LegislationRouteLoaderData> => {
    const [{ LEGAL_HUB_SERVER_READS }, { legalAnalyticsQueryOptions }] = await Promise.all([
      import('@/features/legal/components/hub/legislation-hub-lib'),
      import('@/features/legal/hooks/use-legislation-analytics'),
    ])
    if (!shouldBlockLoaderForSsr()) {
      for (const [view, args] of LEGAL_HUB_SERVER_READS) {
        void context.queryClient.prefetchQuery(legalAnalyticsQueryOptions(view, args)).catch(() => undefined)
      }
      return {}
    }
    const { readLegalAnalyticsForSsr } = await import('@/features/legal/api/legal-analytics-ssr')
    let seeded = true
    let analyticsUnavailable = false
    // The bands degrade on their own: a refused read (no layer published yet) is read in the browser.
    const results = await Promise.allSettled(
      LEGAL_HUB_SERVER_READS.map(([view, args]) =>
        context.queryClient.ensureQueryData({
          ...legalAnalyticsQueryOptions(view, args),
          queryFn: () => readLegalAnalyticsForSsr(view, args),
          retry: false,
        }),
      ),
    )
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') return
      seeded = false
      // a 503 (no layer published yet, or busy): the page says so calmly, on the server too
      if ((result.reason as { kind?: unknown } | null)?.kind === 'unavailable') analyticsUnavailable = true
      const read = LEGAL_HUB_SERVER_READS[index]
      // Not dehydrated as a failure: the browser's query reads it afresh.
      if (read) context.queryClient.removeQueries({ queryKey: legalAnalyticsQueryOptions(read[0], read[1]).queryKey, exact: true })
    })
    return { seeded, analyticsUnavailable }
  },
  // Public only for a render proven whole: the match succeeded and every server read answered. Anything else
  // (no loader data, a failed loader or component, a refused read) goes out `no-store`.
  headers: ({ loaderData, match }) =>
    match?.status !== 'success' || loaderData?.seeded !== true
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
        content: t`Legi, ordonanțe și hotărâri din Portalul Legislativ: textul lor, cine le emite și cum se schimbă.`,
      },
    ],
  }),
})
