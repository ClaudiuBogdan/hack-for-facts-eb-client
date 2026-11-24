import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { LegalAnalyticsArgs } from '@/schemas/legal-analytics'

type SsrRead = readonly ['head' | 'summary' | 'breakdown', LegalAnalyticsArgs]

export type LegislationAnalyticsRouteLoaderData = {
  /** Server render only: `false` when an aggregate read failed (or no layer is published) and the browser reads it. */
  readonly seeded?: boolean
}

/**
 * The analysis page renders its question's aggregate answers on the server: the head, the summary and, for a
 * ranking, the breakdown of its lens, read from the analytics memo kept in the server process
 * (`legal-analytics-ssr.ts`) and hydrated into the browser's cache. The acts list is read in the browser (the API
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
    if (question.isDataLens(q.vedere) && q.forma === 'clasament') {
      const lens = question.apiLens(q.vedere, q.vedere === 'felul' && q.fin)
      reads.push(['breakdown', { ...base, lens, ...(q.vedere === 'emitent' && { limit: 50 }) }])
    }
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
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') return
      seeded = false
      const [view, args] = reads[j] ?? (['head', {}] as const)
      context.queryClient.removeQueries({ queryKey: legalAnalyticsQueryOptions(view, args).queryKey, exact: true })
    })
    return { seeded }
  },
  headers: ({ loaderData }) =>
    loaderData?.seeded === false
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
