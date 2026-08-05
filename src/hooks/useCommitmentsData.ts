/**
 * React Query hooks for Commitments Bugetare data
 *
 * All hooks are filter-based, using CommitmentsFilterInput.
 */

import { useQuery } from '@tanstack/react-query'
import {
  fetchCommitmentsSummary,
  fetchCommitmentsAggregated,
  fetchCommitmentsAggregatedAll,
  fetchCommitmentsAnalytics,
} from '@/lib/api/commitments'
import type {
  CommitmentsAggregatedInput,
  CommitmentsAnalyticsInput,
} from '@/lib/api/commitments'
import type { CommitmentsFilterInput } from '@/schemas/commitments'

const STALE_TIME = 5 * 60 * 1000 // 5 minutes

type HookOptions = { enabled?: boolean }

/**
 * Fetch commitments summary (union type: monthly/quarterly/annual)
 */
export function useCommitmentsSummary(
  filter: CommitmentsFilterInput,
  options?: HookOptions
) {
  return useQuery({
    queryKey: ['commitmentsSummary', filter],
    queryFn: () => fetchCommitmentsSummary(filter),
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? true,
  })
}

/**
 * Fetch aggregated commitments data by classification
 */
export function useCommitmentsAggregated(
  input: CommitmentsAggregatedInput,
  options?: HookOptions
) {
  return useQuery({
    queryKey: ['commitmentsAggregated', input],
    queryFn: () => fetchCommitmentsAggregated(input),
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? true,
  })
}

type AggregatedAllOptions = HookOptions & {
  pageSize?: number
  maxPages?: number
  maxItems?: number
}

/**
 * Fetch all paginated aggregated nodes (client-side pagination).
 * Use when downstream UI needs totals to reconcile (e.g. drilldowns).
 */
export function useCommitmentsAggregatedAll(
  input: CommitmentsAggregatedInput,
  options?: AggregatedAllOptions
) {
  const pageSize = options?.pageSize ?? 500
  const maxPages = options?.maxPages ?? 25
  const maxItems = options?.maxItems ?? 10_000

  return useQuery({
    queryKey: ['commitmentsAggregatedAll', input, pageSize, maxPages, maxItems],
    queryFn: () => fetchCommitmentsAggregatedAll({ input, pageSize, maxPages, maxItems }),
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? true,
  })
}

/**
 * Fetch analytics time-series data (multi-series)
 */
export function useCommitmentsAnalytics(
  inputs: CommitmentsAnalyticsInput[],
  options?: HookOptions
) {
  return useQuery({
    queryKey: ['commitmentsAnalytics', inputs],
    queryFn: () => fetchCommitmentsAnalytics(inputs),
    staleTime: STALE_TIME,
    enabled: (options?.enabled ?? true) && inputs.length > 0,
  })
}
