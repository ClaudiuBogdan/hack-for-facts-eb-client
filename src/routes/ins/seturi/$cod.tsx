import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { fetchDatasetTier0 } from '@/features/statistics/api/dataset-detail-api'
import {
  datasetTier0Reads,
  prefetchDatasetDetail,
} from '@/features/statistics/hooks/use-dataset-detail'
import { detailScopeKey } from '@/features/statistics/lib/dataset-selection'
import { getDatasetDataStatus } from '@/features/statistics/lib/dataset-status'
import {
  resolveDatasetSeries,
  type ResolvedDatasetSeries,
} from '@/features/statistics/lib/detail-series-resolution'
import { insPageMeta } from '@/features/statistics/lib/ins-head'
import { publishedTextExcerpt } from '@/features/statistics/lib/published-text'
import { detailBootstrapEntity } from '@/features/statistics/lib/source-selection'
import { insLoaderSignal } from '@/features/statistics/lib/ssr-deadline'
import { isAbortError, isGraphQLTimeout } from '@/lib/graphql/graphql-client'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { createLogger } from '@/lib/logger'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { InsDatasetDetails } from '@/schemas/ins'
import { parseStatisticsDatasetDetailSearch } from '@/schemas/statistics'
import type { StatisticsDatasetTier0 } from '@/schemas/statistics'

const logger = createLogger('ins-dataset-route')

/**
 * A read the loader could not complete. The caller's own abort — a
 * navigation that superseded this one — travels on for the router to
 * handle; a read past its deadline was already logged by the client.
 */
function loaderFailure(error: unknown, code: string, stage: 'tier0' | 'series'): void {
  if (isAbortError(error)) throw error
  if (!isGraphQLTimeout(error)) logger.error('Dataset detail loader failed', { code, stage, error })
}

export type StatisticsDatasetDetailLoaderData = {
  /** Present on the server render only; the page's own query supplies it in the browser. */
  readonly tier0?: StatisticsDatasetTier0
  /** Present on the server render of a dataset with data; absent for a catalog-only one. */
  readonly series?: ResolvedDatasetSeries
  /**
   * On a client-side navigation, the dataset as an earlier read of it holds
   * it — for the document head alone, never as a seed: a scope change
   * re-runs the loader, and the head would otherwise fall back to its
   * placeholder title on a page that already knows its name.
   */
  readonly headDataset?: InsDatasetDetails
  readonly scopeKey: string
  /** A read threw: the page renders its retry, and that render is not cached. */
  readonly failed: boolean
}

/**
 * Awaited on the SSR path only, so crawlers and shared caches get a document
 * that already shows the series. In the browser the same await kept the
 * previous page on screen with nothing moving for every scope change; the
 * client path starts the reads under the page's own keys and returns at
 * once, and the page's queries draw their skeletons and retries.
 */
export const Route = createFileRoute('/ins/seturi/$cod')({
  validateSearch: parseStatisticsDatasetDetailSearch,
  // Canonical uppercase codes: the API resolves either case, and one URL per
  // dataset beats two cache entries. The selection travels with it — a
  // redirect without `search` lands on the empty one.
  beforeLoad: ({ params, search }) => {
    const canonical = params.cod.trim().toUpperCase()
    if (params.cod !== canonical) {
      throw redirect({
        to: '/ins/seturi/$cod',
        params: { cod: canonical },
        search,
        replace: true,
      })
    }
  },
  // frecventa is DELIBERATELY absent: cadence switches are a client-side view
  // over the fetched series and must not re-run the loader.
  loaderDeps: ({ search }) => ({
    teritoriu: search.teritoriu,
    clasificari: search.clasificari,
    unitate: search.unitate,
  }),
  loader: async ({
    context,
    params,
    deps,
    abortController,
  }): Promise<StatisticsDatasetDetailLoaderData> => {
    // The same canonical form as the redirect above, for a loader run it did not precede.
    const code = params.cod.trim().toUpperCase()
    const scopeKey = detailScopeKey(deps)

    if (!shouldBlockLoaderForSsr()) {
      // Not awaited, and not reported: the page's queries own the verdict.
      void prefetchDatasetDetail(context.queryClient, { code, search: deps }).catch(
        () => undefined,
      )
      const known = datasetTier0Reads(context.queryClient, code).find((read) => read.dataset)?.dataset
      return { scopeKey, failed: false, ...(known ? { headDataset: known } : {}) }
    }

    // Fetched directly, not through the query client: seeding the server
    // cache dehydrates the server's `dataUpdatedAt`, which would make every
    // CDN hit refetch on mount. One deadline for the reads; past it the page
    // serves its retry, uncached, and the browser reads without one.
    const signal = insLoaderSignal(abortController.signal)

    let tier0: StatisticsDatasetTier0
    try {
      tier0 = await fetchDatasetTier0({ code, entity: detailBootstrapEntity(deps), signal })
    } catch (error) {
      loaderFailure(error, code, 'tier0')
      return { scopeKey, failed: true }
    }

    if (!tier0.dataset) throw notFound()
    if (getDatasetDataStatus(tier0.dataset) === 'catalog-only') {
      return { tier0, scopeKey, failed: false }
    }

    try {
      const series = await resolveDatasetSeries({
        code,
        search: deps,
        dataset: tier0.dataset,
        latest: tier0.latest,
        signal,
      })
      // A matrix whose published structure fails the source layout is not a
      // bad address; the server hears about it here, where the read is.
      if (series.issues.includes('descriptor'))
        logger.warn('INS dataset fails the source layout schema', { code })
      return { tier0, series, scopeKey, failed: false }
    } catch (error) {
      loaderFailure(error, code, 'series')
      return { tier0, scopeKey, failed: true }
    }
  },
  // A render after a failed read, or one with nothing to show for the
  // address, is served once; the next request reads again — as on the hub.
  headers: ({ loaderData }) =>
    !loaderData ||
    loaderData.failed ||
    loaderData.tier0 === undefined ||
    (loaderData.series !== undefined && loaderData.series.series === null)
      ? createNoStoreHeaders()
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 600,
          staleWhileRevalidateSeconds: 3600,
          // The document is rendered in the language the locale cookie names.
          vary: ['Accept-Encoding', 'Cookie'],
        }),
  head: ({ loaderData }) => {
    const data = loaderData as StatisticsDatasetDetailLoaderData | undefined
    const dataset = data?.tier0?.dataset ?? data?.headDataset
    if (!dataset) {
      // Reached on a client-side navigation, where the dataset is still in
      // flight — a placeholder, not "not found"; the page corrects the tab
      // title once its query lands. The server path always has the dataset.
      return { meta: insPageMeta({ title: `${t`Set de date INS`} — Transparenta.eu` }) }
    }
    // Words only: TEMPO ships anchors inside a few definitions, and a
    // description cut mid-tag is markup in a search snippet.
    const description =
      (dataset.definition_ro ? publishedTextExcerpt(dataset.definition_ro) : '') ||
      t`Serie de date INS Tempo cu valori pe teritorii și perioade.`
    return {
      meta: insPageMeta({
        title: `${dataset.name_ro ?? dataset.code} (${dataset.code}) — Transparenta.eu`,
        description,
      }),
    }
  },
})
