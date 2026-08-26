import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import {
  fetchDatasetSeries,
  fetchDatasetTier0,
} from '@/features/statistics/api/dataset-detail-api'
import {
  buildEffectiveScope,
  buildSeriesFilter,
  detailScopeKey,
  NATIONAL_ENTITY,
  parseTerritoryPin,
  territoryPinToEntity,
} from '@/features/statistics/lib/dataset-selection'
import { getDatasetDataStatus } from '@/features/statistics/lib/dataset-status'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { parseStatisticsDatasetDetailSearch } from '@/schemas/statistics'
import type {
  StatisticsDatasetSeries,
  StatisticsDatasetTier0,
} from '@/schemas/statistics'

export type StatisticsDatasetDetailLoaderData = {
  readonly tier0: StatisticsDatasetTier0 | null
  readonly series: StatisticsDatasetSeries | null
  readonly scopeKey: string
}

/**
 * Tier-0 loader — at most TWO POSTs, sequential because POST B's filter is
 * derived from POST A's resolution:
 *
 *   A. dataset metadata + server-resolved latest value for the entity
 *      (national by default, the URL's territory pin otherwise);
 *   B. the resolved series + the related-datasets probe, SKIPPED when the
 *      dataset is missing, catalog-only, or resolution answered NO_DATA with
 *      nothing pinned (the scope-prompt path — there is no cell to fetch).
 *
 * Failures degrade to nulls: SSR always answers, the client queries retry.
 */
export const Route = createFileRoute('/statistici/seturi/$cod')({
  validateSearch: parseStatisticsDatasetDetailSearch,
  loaderDeps: ({ search }) => ({
    teritoriu: search.teritoriu,
    clasificari: search.clasificari,
    unitate: search.unitate,
    frecventa: search.frecventa,
  }),
  loader: async ({ params, deps, abortController }): Promise<StatisticsDatasetDetailLoaderData> => {
    // insDataset(code:) is exact-match, no trim, no uppercase — normalize once.
    const code = params.cod.trim().toUpperCase()
    const scopeKey = detailScopeKey(deps)

    let tier0: StatisticsDatasetTier0
    try {
      const entity =
        territoryPinToEntity(parseTerritoryPin(deps.teritoriu)) ?? NATIONAL_ENTITY
      tier0 = await fetchDatasetTier0({
        code,
        entity,
        signal: abortController.signal,
      })
    } catch {
      return { tier0: null, series: null, scopeKey }
    }

    if (!tier0.dataset) return { tier0, series: null, scopeKey }
    if (getDatasetDataStatus(tier0.dataset) === 'catalog-only') {
      return { tier0, series: null, scopeKey }
    }

    const scope = buildEffectiveScope({ search: deps, latest: tier0.latest })
    const noData = !tier0.latest || tier0.latest.matchStrategy === 'NO_DATA'
    if (noData && scope.classifications.size === 0) {
      return { tier0, series: null, scopeKey }
    }

    try {
      const series = await fetchDatasetSeries({
        code,
        filter: buildSeriesFilter(scope),
        contextCode: tier0.dataset.context_code ?? null,
        signal: abortController.signal,
      })
      return { tier0, series, scopeKey }
    } catch {
      return { tier0, series: null, scopeKey }
    }
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: ({ loaderData }) => {
    const dataset = (loaderData as StatisticsDatasetDetailLoaderData | undefined)
      ?.tier0?.dataset
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
