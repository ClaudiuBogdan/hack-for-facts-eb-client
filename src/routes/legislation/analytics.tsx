import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { LegalAnalyticsArgs } from '@/schemas/legal-analytics'

type SsrRead = readonly ['head' | 'summary' | 'breakdown' | 'series' | 'grid', LegalAnalyticsArgs]

export type LegislationAnalyticsRouteLoaderData = {
  /** Server render only: `false` when an aggregate read failed (or no layer is published) and the browser reads it. */
  readonly seeded?: boolean
  /** Server render only: an analytics read was refused with 503 (no layer published yet): render the panel. */
  readonly analyticsUnavailable?: boolean
}

/**
 * The analysis page renders its question's aggregate answers on the server: the head, the summary and the chart
 * the question asks for (a ranking's breakdown, a series or a grid, `chartRead`), all started together and read
 * from the analytics memo kept in the server process (`legal-analytics-ssr.ts`), then hydrated into the browser's
 * cache. The acts list is read in the browser (the API
 * serves it `no-store`). A failed or refused read (503 before the first layer is published) is left out of the
 * cache, the page reads it in the browser, and the render goes out `no-store`. The feature's modules are imported
 * inside the loader, so this file (which every page's route tree carries) stays thin.
 */
export const Route = createFileRoute('/legislation/analytics')({
  loaderDeps: ({ search }) => ({ search: search as Record<string, unknown> }),
  loader: async ({ context, deps }): Promise<LegislationAnalyticsRouteLoaderData> => {
    const [{ legalAnalyticsQueryOptions }, question] = await Promise.all([
      import('@/features/legal/hooks/use-legislation-analytics'),
      import('@/features/legal/lib/analytics-question'),
    ])
    const q = question.readQuestion(deps.search)
    const base = question.filterArgs(q)
    const reads: SsrRead[] = [
      ['head', {}],
      ['summary', base],
    ]
    const chart = question.chartRead(q)
    if (chart) reads.push(chart)
    if (!shouldBlockLoaderForSsr()) {
      for (const [view, args] of reads) {
        void context.queryClient.prefetchQuery(legalAnalyticsQueryOptions(view, args)).catch(() => undefined)
      }
      return {}
    }
    const { readLegalAnalyticsForSsr } = await import('@/features/legal/api/legal-analytics-ssr')
    const results = await Promise.allSettled(
      reads.map(([view, args]) =>
        context.queryClient.ensureQueryData({
          ...legalAnalyticsQueryOptions(view, args),
          queryFn: () => readLegalAnalyticsForSsr(view, args),
          retry: false,
        }),
      ),
    )
    let seeded = true
    let analyticsUnavailable = false
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') return
      seeded = false
      // a 503 (no layer published yet, or busy): the page renders the calm panel on the server
      if ((r.reason as { kind?: unknown } | null)?.kind === 'unavailable') analyticsUnavailable = true
      const [view, args] = reads[j] ?? (['head', {}] as const)
      context.queryClient.removeQueries({ queryKey: legalAnalyticsQueryOptions(view, args).queryKey, exact: true })
    })
    return { seeded, analyticsUnavailable }
  },
  // Public only for a render proven whole: the match succeeded and every server read answered. Anything else
  // (no loader data, a failed loader or component, a refused read) goes out `no-store`.
  headers: ({ loaderData, match }) =>
    match?.status !== 'success' || loaderData?.seeded !== true
      ? createNoStoreHeaders()
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 300,
          staleWhileRevalidateSeconds: 600,
        }),
  head: () => ({
    meta: [
      { title: `${t`Analiza legislației`} — Transparenta.eu` },
      {
        name: 'description',
        content: t`Legile României numărate: ce fac actele, cine le emite, cum se schimbă și cum se leagă între ele.`,
      },
    ],
  }),
})
