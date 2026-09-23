import { createFileRoute, notFound } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { fetchStatisticsTerritoryHub } from '@/features/statistics/api/statistics-api'
import { prefetchStatisticsTerritoryHub } from '@/features/statistics/hooks/use-statistics'
import { comparisonPlaceName } from '@/features/statistics/lib/comparison-format'
import { insPageMeta } from '@/features/statistics/lib/ins-head'
import { insLoaderSignal } from '@/features/statistics/lib/ssr-deadline'
import { isAbortError, isGraphQLTimeout } from '@/lib/graphql/graphql-client'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { createLogger } from '@/lib/logger'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { parseStatisticsTerritoryHubSearch } from '@/schemas/statistics'
import type { StatisticsTerritoryHubResult } from '@/schemas/statistics'

const logger = createLogger('ins-territory-route')

const SIRUTA_SHAPE = /^\d{1,6}$/

export type StatisticsTerritoryLoaderData = {
  /** Present on the server render only; the page's own query supplies it in the browser. */
  readonly hub?: StatisticsTerritoryHubResult
  /** The read threw: the page renders its retry, and that render is not cached. */
  readonly failed: boolean
}

/**
 * Awaited on the SSR path only, so a shared link previews as the place and
 * a crawler indexes its figures rather than a skeleton; an unknown or
 * malformed SIRUTA is a 404, not a cached 200. In the browser the read is
 * started under the page's own key and the page draws its skeleton.
 */
export const Route = createFileRoute('/ins/teritorii/$siruta')({
  validateSearch: parseStatisticsTerritoryHubSearch,
  loader: async ({ context, params, abortController }): Promise<StatisticsTerritoryLoaderData> => {
    const siruta = params.siruta.trim()
    if (!shouldBlockLoaderForSsr()) {
      if (SIRUTA_SHAPE.test(siruta))
        void prefetchStatisticsTerritoryHub(context.queryClient, siruta).catch(() => undefined)
      return { failed: false }
    }
    // A malformed code never costs a request, on either side.
    if (!SIRUTA_SHAPE.test(siruta)) throw notFound()

    // Fetched directly, not through the query client: seeding the server
    // cache dehydrates the server's `dataUpdatedAt`, which would make every
    // CDN hit refetch on mount.
    let hub: StatisticsTerritoryHubResult | null
    try {
      hub = await fetchStatisticsTerritoryHub(siruta, insLoaderSignal(abortController.signal))
    } catch (error) {
      if (isAbortError(error)) throw error
      if (!isGraphQLTimeout(error)) logger.error('Territory loader failed', { siruta, error })
      return { failed: true }
    }
    if (hub === null) throw notFound()
    return { hub, failed: false }
  },
  // A render after a failed read is served once, and the next request reads
  // again — as on the hub.
  headers: ({ loaderData }) =>
    // The county and national references are part of the page: a render
    // without them is a failed read too, not one to serve for ten minutes.
    !loaderData || loaderData.failed || loaderData.hub === undefined || loaderData.hub.benchmarksUnavailable
      ? createNoStoreHeaders()
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 600,
          staleWhileRevalidateSeconds: 3600,
          // The document is rendered in the language the locale cookie names.
          vary: ['Accept-Encoding', 'Cookie'],
        }),
  head: ({ loaderData }) => {
    const hub = (loaderData as StatisticsTerritoryLoaderData | undefined)?.hub
    const place = hub?.identity.name ? comparisonPlaceName(hub.identity.name) : null
    if (!place) {
      // A client-side navigation, where the place is still in flight — a
      // placeholder the page corrects once its query lands.
      return { meta: insPageMeta({ title: `${t`Statistici teritoriu`} — Transparenta.eu` }) }
    }
    const where = hub?.identity.countyName ? `${place.name}, ${hub.identity.countyName}` : place.name
    return {
      meta: insPageMeta({
        title: `${place.name} · ${t`Statistici INS`} — Transparenta.eu`,
        description: t`Indicatorii INS Tempo pentru ${where}: populație, salariați, șomaj, locuințe și seriile lor istorice, lângă județ și țară.`,
      }),
    }
  },
})
