import { useMemo } from 'react'
import type { CapabilityGate } from '@/schemas/procurement'

/**
 * Pure hook over a `CapabilityGate` payload (no fetching). Features call it to
 * decide whether to render a value, hide a filter, or downgrade spend→count.
 * Mirrors the prod gate: per-grain coverage rates + boolean `*Allowed` flags +
 * a `blockers` list (see docs/procurement-prod-schema-reference.md §6).
 */
export function useCapabilityGate(gate: CapabilityGate) {
  return useMemo(
    () => ({
      gate,
      /** Whether deterministic filter answers are allowed for this grain. */
      canFilter(): boolean {
        return gate.filterAnswersAllowed
      },
      /** Spend/top-N-by-value is only authoritative when the gate allows it. */
      canShowSpendRanked(): boolean {
        return gate.spendRankingsAllowed
      },
      /** Supplier-region filtering is blocked in v1. */
      isSupplierRegionBlocked(): boolean {
        return !gate.supplierRegionFiltersAllowed
      },
      blockers: gate.blockers,
    }),
    [gate],
  )
}
