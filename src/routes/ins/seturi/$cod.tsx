import { createFileRoute, redirect } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import {
  fetchDatasetSeries,
  fetchDatasetTier0,
} from '@/features/statistics/api/dataset-detail-api'
import { detailScopeKey } from '@/features/statistics/lib/dataset-selection'
import {
  detailBootstrapEntity,
  resolveDetailSelection,
} from '@/features/statistics/lib/source-selection'
import { getDatasetDataStatus } from '@/features/statistics/lib/dataset-status'
import { insLoaderSignal } from '@/features/statistics/lib/ssr-deadline'
import { isAbortError, isGraphQLTimeout } from '@/lib/graphql/graphql-client'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { createLogger } from '@/lib/logger'
import { parseStatisticsDatasetDetailSearch } from '@/schemas/statistics'
import type {
  StatisticsDatasetSeries,
  StatisticsDatasetTier0,
} from '@/schemas/statistics'

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
  readonly tier0: StatisticsDatasetTier0 | null
  readonly series: StatisticsDatasetSeries | null
  readonly scopeKey: string
  /** A read threw: the page renders its retry, and that render is not cached. */
  readonly failed: boolean
}

/** Shared source selection governs both SSR reads and client hydration. */
export const Route = createFileRoute('/ins/seturi/$cod')({
  validateSearch: parseStatisticsDatasetDetailSearch,
  // Canonical uppercase codes: insDataset(code:) is exact-match, and one URL
  // per dataset beats two cache entries. The selection travels with it — a
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
    params,
    deps,
    abortController,
  }): Promise<StatisticsDatasetDetailLoaderData> => {
    // insDataset(code:) is exact-match, no trim, no uppercase — normalize once.
    const code = params.cod.trim().toUpperCase()
    const scopeKey = detailScopeKey(deps)
    // One deadline for both reads on the server; past it the page serves
    // its retry, uncached, and the browser reads without one.
    const signal = insLoaderSignal(abortController.signal)

    let tier0: StatisticsDatasetTier0
    try {
      const entity = detailBootstrapEntity(deps)
      tier0 = await fetchDatasetTier0({
        code,
        entity,
        signal,
      })
    } catch (error) {
      loaderFailure(error, code, 'tier0')
      return { tier0: null, series: null, scopeKey, failed: true }
    }

    if (!tier0.dataset) return { tier0, series: null, scopeKey, failed: false }
    if (getDatasetDataStatus(tier0.dataset) === 'catalog-only') {
      return { tier0, series: null, scopeKey, failed: false }
    }

    const selection = resolveDetailSelection({
      search: deps,
      dataset: tier0.dataset,
      latest: tier0.latest,
    })
    if (selection.filter === null) return { tier0, series: null, scopeKey, failed: false }

    try {
      const series = await fetchDatasetSeries({
        code,
        filter: selection.filter,
        inspection: !selection.canDerive,
        contextCode: tier0.dataset.context_code ?? null,
        signal,
      })
      return { tier0, series, scopeKey, failed: false }
    } catch (error) {
      loaderFailure(error, code, 'series')
      return { tier0, series: null, scopeKey, failed: true }
    }
  },
  // A render after a failed read is served once, and the next request reads
  // again — as on the hub.
  headers: ({ loaderData }) =>
    !loaderData || loaderData.failed
      ? createNoStoreHeaders()
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 600,
          staleWhileRevalidateSeconds: 3600,
        }),
  head: ({ loaderData }) => {
    const dataset = (
      loaderData as StatisticsDatasetDetailLoaderData | undefined
    )?.tier0?.dataset
    if (!dataset) {
      return { meta: [{ title: `${t`Set de date INS`} — Transparenta.eu` }] }
    }
    const description =
      dataset.definition_ro?.slice(0, 180) ??
      t`Serie de date INS Tempo cu valori pe teritorii și perioade.`
    return {
      meta: [
        {
          title: `${dataset.name_ro ?? dataset.code} (${dataset.code}) — Transparenta.eu`,
        },
        { name: 'description', content: description },
      ],
    }
  },
})
