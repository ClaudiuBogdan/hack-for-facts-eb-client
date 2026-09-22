import { t } from '@lingui/core/macro'
import type { StatisticsCoverageSummary } from '@/schemas/statistics'

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
 * counts; live counts come from the catalog's own `pageInfo.totalCount`.
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
