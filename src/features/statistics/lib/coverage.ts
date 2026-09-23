import { t } from '@lingui/core/macro'
import type { StatisticsCoverageSummary } from '@/schemas/statistics'

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
