import { useMemo } from 'react'
import type {
  AllowedAnswerClass,
  BlockedDimension,
  CapabilityGate,
  CoverageGrade,
  CoverageMetric,
} from '@/schemas/procurement'

/**
 * Pure hook over a `CapabilityGate` payload (no fetching). Features call it
 * to decide whether to render a value, hide a filter, or downgrade
 * spend→count. See `docs/design/procurement/features/coverage-data-as-of-layer.md`.
 */
export function useCapabilityGate(gate: CapabilityGate) {
  return useMemo(
    () => ({
      gate,
      isAllowed(answerClass: AllowedAnswerClass): boolean {
        return gate.allowed.includes(answerClass)
      },
      isBlocked(dimension: BlockedDimension): boolean {
        return gate.blocked.includes(dimension)
      },
      coverageOf(metric: CoverageMetric): CoverageGrade | undefined {
        return gate.coverage.find((c) => c.metric === metric)
      },
      meets(metric: CoverageMetric): boolean {
        return gate.coverage.find((c) => c.metric === metric)?.meetsThreshold ?? false
      },
      /**
       * Spend answers downgrade to count-ranked when amount coverage is
       * below threshold OR `spend_ranked_top_n` is not allowed.
       */
      canShowSpendRanked(): boolean {
        return (
          gate.allowed.includes('spend_ranked_top_n') &&
          (gate.coverage.find((c) => c.metric === 'amount')?.meetsThreshold ??
            false)
        )
      },
    }),
    [gate],
  )
}
