/**
 * The national budget's live reads as TanStack queries. The catalog comes
 * first: its two lane snapshots key every data read and travel with it as
 * `expectedSnapshot`, so one view never mixes two loads of a lane. When a
 * lane moves under a read (`SNAPSHOT_CHANGED`), the catalog is read again and
 * the view's reads follow it under new keys. A refused input or a moved lane
 * is never retried as is.
 */
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery, type QueryClient } from '@tanstack/react-query'

import type { BudgetSeriesBasis, PeriodType } from '@/schemas/national-budget-api'
import {
  NationalBudgetApiError,
  fetchApprovedRecords,
  fetchApprovedSeries,
  fetchApprovedTotals,
  fetchExecutionGrid,
  fetchNationalCatalog,
  fetchObservations,
  fetchSeriesEvidence,
  isRetryable,
  type ApprovedRecordsInput,
  type ApprovedSeriesInput,
  type ApprovedTotalsInput,
  type ExecutionGridInput,
  type ObservationsInput,
} from '../api/national-budget-api'

const ROOT = 'national-budget-analytics'
/** A lane changes when a load lands (days apart); five minutes keeps a session's views on one read. */
const STALE = 5 * 60_000

const retry = (count: number, error: unknown) => count < 1 && isRetryable(error)

export const nationalCatalogKey = [ROOT, 'catalog'] as const

export function nationalCatalogOptions() {
  return queryOptions({ queryKey: nationalCatalogKey, queryFn: ({ signal }) => fetchNationalCatalog(signal), staleTime: STALE, retry })
}

export function useNationalCatalog() {
  return useSuspenseQuery(nationalCatalogOptions()).data
}

/** A data read that, when its lane moved, sends the catalog to be read again before it fails. */
function guarded<T>(client: QueryClient, read: () => Promise<T>): Promise<T> {
  return read().catch((error: unknown) => {
    if (error instanceof NationalBudgetApiError && error.kind === 'snapshot_changed') void client.invalidateQueries({ queryKey: nationalCatalogKey })
    throw error
  })
}

export function executionGridOptions(client: QueryClient, snapshot: string, input: ExecutionGridInput) {
  return queryOptions({
    queryKey: [ROOT, 'grid', snapshot, input] as const,
    queryFn: ({ signal }) => guarded(client, () => fetchExecutionGrid(input, snapshot, signal)),
    staleTime: STALE,
    retry,
  })
}

export function observationsOptions(client: QueryClient, snapshot: string, input: ObservationsInput) {
  return queryOptions({
    queryKey: [ROOT, 'observations', snapshot, input] as const,
    queryFn: ({ signal }) => guarded(client, () => fetchObservations(input, snapshot, signal)),
    staleTime: STALE,
    retry,
  })
}

export function approvedTotalsOptions(client: QueryClient, snapshot: string, input: ApprovedTotalsInput) {
  return queryOptions({
    queryKey: [ROOT, 'totals', snapshot, input] as const,
    queryFn: ({ signal }) => guarded(client, () => fetchApprovedTotals(input, snapshot, signal)),
    staleTime: STALE,
    retry,
  })
}

export function approvedSeriesOptions(client: QueryClient, snapshot: string, input: ApprovedSeriesInput) {
  return queryOptions({
    queryKey: [ROOT, 'approved-series', snapshot, input] as const,
    queryFn: ({ signal }) => guarded(client, () => fetchApprovedSeries(input, snapshot, signal)),
    staleTime: STALE,
    retry,
  })
}

export function approvedRecordsOptions(client: QueryClient, snapshot: string, input: ApprovedRecordsInput) {
  return queryOptions({
    queryKey: [ROOT, 'records', snapshot, input] as const,
    queryFn: ({ signal }) => guarded(client, () => fetchApprovedRecords(input, snapshot, signal)),
    staleTime: STALE,
    retry,
  })
}

/** The lane snapshots of the catalog, for the reads below. */
function useSnapshots() {
  return useNationalCatalog().snapshots
}

export function useExecutionGrid(input: ExecutionGridInput) {
  const client = useQueryClient()
  return useSuspenseQuery(executionGridOptions(client, useSnapshots().execution, input)).data
}

export function useApprovedTotals(input: ApprovedTotalsInput) {
  const client = useQueryClient()
  return useSuspenseQuery(approvedTotalsOptions(client, useSnapshots().approved, input)).data
}

export function useApprovedSeries(input: ApprovedSeriesInput) {
  const client = useQueryClient()
  return useSuspenseQuery(approvedSeriesOptions(client, useSnapshots().approved, input)).data
}

export function useApprovedRecords(input: ApprovedRecordsInput) {
  const client = useQueryClient()
  return useSuspenseQuery(approvedRecordsOptions(client, useSnapshots().approved, input)).data
}

/** One value's evidence, read when its popover opens (not during the page's render). */
export function useSeriesEvidence(
  input: { readonly itemId: string; readonly basis: BudgetSeriesBasis; readonly type: PeriodType; readonly date: string },
  enabled: boolean,
) {
  const client = useQueryClient()
  const snapshot = useSnapshots().execution
  return useQuery({
    queryKey: [ROOT, 'evidence', snapshot, input] as const,
    queryFn: ({ signal }) => guarded(client, () => fetchSeriesEvidence(input, snapshot, signal)),
    staleTime: STALE,
    retry,
    enabled,
  })
}
