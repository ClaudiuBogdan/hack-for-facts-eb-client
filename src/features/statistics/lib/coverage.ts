import { t } from '@lingui/core/macro'
import type { InsDataset } from '@/schemas/ins'
import type { StatisticsCoverageSummary } from '@/schemas/statistics'
import { isDatasetAvailable } from './dataset-status'

/**
 * Centralized coverage fallback constants used by mock fixtures and by the
 * live adapter when the catalog request is unavailable.
 *
 * Source: `docs/ux-research/statistics.md` §5 — "1,898 datasets have full
 * catalog metadata ... but only **27 'priority' datasets** have loaded
 * observations (`fact_load_status = 'full'`). The remaining ~1,871 datasets
 * are `metadata_only` / `PENDING`."
 *
 * These are documentation-grounded defaults for the mock surface, NOT live
 * counts. Live counts are always derived from `getInsDatasetsCatalog`
 * `pageInfo.totalCount` + per-dataset `sync_status` in
 * {@link buildCoverageFromCatalog}.
 */
export const STATISTICS_DOCS_FALLBACK_AVAILABLE_DATASETS = 27 as const
export const STATISTICS_DOCS_FALLBACK_TOTAL_DATASETS = 1898 as const

/** Coverage summary built from the docs-grounded fallback constants. */
export function buildDocsFallbackCoverage(): StatisticsCoverageSummary {
  return {
    availableDatasetCount: STATISTICS_DOCS_FALLBACK_AVAILABLE_DATASETS,
    totalDatasetCount: STATISTICS_DOCS_FALLBACK_TOTAL_DATASETS,
    catalogOnlyDatasetCount:
      STATISTICS_DOCS_FALLBACK_TOTAL_DATASETS -
      STATISTICS_DOCS_FALLBACK_AVAILABLE_DATASETS,
    partial: false,
  }
}

/**
 * Builds a live coverage summary from a catalog page of `InsDataset` nodes.
 *
 * `totalCount` comes from the connection `pageInfo.totalCount`; available vs.
 * catalog-only is derived from each dataset's `sync_status` via
 * {@link isDatasetAvailable}. `partial` is true when the page was truncated
 * (hasNextPage) so callers can show a "showing first N" caveat.
 */
export function buildCoverageFromCatalog(params: {
  readonly datasets: readonly InsDataset[]
  readonly totalCount: number
  readonly hasNextPage: boolean
}): StatisticsCoverageSummary {
  const { datasets, totalCount, hasNextPage } = params
  const safeTotal = Math.max(totalCount, datasets.length)

  let available = 0
  for (const dataset of datasets) {
    if (isDatasetAvailable(dataset)) {
      available += 1
    }
  }

  return {
    availableDatasetCount: available,
    totalDatasetCount: safeTotal,
    catalogOnlyDatasetCount: Math.max(safeTotal - available, 0),
    partial: hasNextPage || datasets.length < safeTotal,
  }
}

/**
 * Human-readable ribbon text for the coverage summary.
 *
 * When the counts are PARTIAL (built from a truncated catalog page) no ratio
 * is printed — "200 din 1.898" out of a clamped page is a fabricated
 * fraction, not a measurement.
 *
 * Examples:
 * - "27 din 1.898 seturi cu date disponibile"
 * - "27 seturi cu date disponibile (listă parțială)"
 */
export function buildCoverageRibbonText(
  coverage: StatisticsCoverageSummary,
  options?: { readonly partialSuffix?: string },
): string {
  const available = coverage.availableDatasetCount.toLocaleString('ro-RO')
  const total = coverage.totalDatasetCount.toLocaleString('ro-RO')

  if (coverage.partial) {
    const suffix = options?.partialSuffix ?? t`(listă parțială)`
    return `${t`${available} seturi cu date disponibile`} ${suffix}`
  }

  return t`${available} din ${total} seturi cu date disponibile`
}
