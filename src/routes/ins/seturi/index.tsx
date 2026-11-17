import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { insPageMeta } from '@/features/statistics/lib/ins-head'
import { isAbortError, isGraphQLTimeout } from '@/lib/graphql/graphql-client'
import { createLogger } from '@/lib/logger'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { parseStatisticsDatasetExplorerSearch } from '@/schemas/statistics-search'
import type { StatisticsDatasetPage } from '@/schemas/statistics'

const logger = createLogger('ins-catalog-route')

export type StatisticsDatasetExplorerLoaderData = {
  /** Present on the server render only; the page's own query supplies it in the browser. */
  readonly page?: StatisticsDatasetPage
  /** The catalog page the read was for: a seed is used only under the same key. */
  readonly pageKey: string
}

/**
 * The catalog page the address names is read on the server, so a shared
 * link and a crawler get the rows rather than a skeleton and a client
 * round-trip; in the browser the read starts under the page's own key and
 * the loader returns at once, so a refine never freezes the list. The INS
 * domain tree seeds the rail and names the active theme chip; prefetched
 * rather than awaited, since the rail falls back to the eight known
 * domains either way.
 */
export const Route = createFileRoute('/ins/seturi/')({
  validateSearch: parseStatisticsDatasetExplorerSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, abortController }): Promise<StatisticsDatasetExplorerLoaderData> => {
    // Imported here, not at the top: the route tree must not carry the feature's API (docs/route-contracts.md).
    const [{ fetchDatasetPage }, { datasetExplorerQueryOptions, explorerPageKey }, { statisticsContextTreeQueryOptions }, { insLoaderSignal }] = await Promise.all([
      import('@/features/statistics/api/dataset-explorer-api'),
      import('@/features/statistics/hooks/use-dataset-explorer'),
      import('@/features/statistics/hooks/use-statistics'),
      import('@/features/statistics/lib/ssr-deadline'),
    ])
    void context.queryClient.prefetchQuery(statisticsContextTreeQueryOptions()).catch(() => undefined)
    const pageKey = explorerPageKey(deps)
    if (!shouldBlockLoaderForSsr()) {
      void context.queryClient.prefetchQuery(datasetExplorerQueryOptions(deps)).catch(() => undefined)
      return { pageKey }
    }
    // Fetched directly, not through the query client: the SSR integration
    // dehydrates every query the server created, a failed one included, so a
    // read that failed here would reach the browser as that query's error
    // rather than as a page whose own query reads again.
    try {
      return { page: await fetchDatasetPage(deps, {}, insLoaderSignal(abortController.signal)), pageKey }
    } catch (error) {
      if (isAbortError(error)) throw error
      if (!isGraphQLTimeout(error)) logger.error('Dataset catalog loader failed', { search: deps, error })
      // The page's own query reads again and draws its retry.
      return { pageKey }
    }
  },
  head: () => ({
    meta: insPageMeta({
      title: `${t`Seturi de date INS`} — Transparenta.eu`,
      description: t`Catalogul INS Tempo, pe domenii, periodicitate și acoperire teritorială. Fiecare set deschide seria lui.`,
    }),
  }),
})
