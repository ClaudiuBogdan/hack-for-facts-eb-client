/**
 * Public Investments — TanStack Query hooks.
 *
 * Wraps the feature API with stable query keys. The API returns a
 * discriminated `available | blocked` result; hooks surface that as `data`
 * (never throw) so pages can render the blocked state when mock mode is off.
 */

import { useQuery } from '@tanstack/react-query'
import type {
  PublicInvestmentsLandingSearchState,
  PublicInvestmentsObjectiveSearchState,
  PublicInvestmentsSearchState,
  PublicInvestmentsTerritorySearchState,
  PaymentSort,
  SortOrder,
} from '@/schemas/public-investments'
import {
  getEvidenceDetail,
  getLandingData,
  getObjectiveBundle,
  getPaymentsLedgerData,
  getTerritoryData,
  searchObjectives,
} from '../api/public-investments-api'
import type {
  DataResult,
  EvidenceDetail,
  LandingData,
  ObjectiveDetailBundle,
  ObjectiveSearchResult,
  PaymentsLedgerData,
  TerritoryData,
  DataAvailabilityStatus,
} from '../lib/types'

// Stable query keys per surface so cache stays consistent across mount points.
export const publicInvestmentsQueryKeys = {
  all: ['public-investments'] as const,
  landing: () => [...publicInvestmentsQueryKeys.all, 'landing'] as const,
  search: (search: Partial<PublicInvestmentsSearchState>) =>
    [...publicInvestmentsQueryKeys.all, 'search', search] as const,
  objective: (objectiveId: string) =>
    [...publicInvestmentsQueryKeys.all, 'objective', objectiveId] as const,
  paymentsLedger: (
    objectiveId: string,
    paySort: PaymentSort,
    payOrder: SortOrder,
  ) =>
    [
      ...publicInvestmentsQueryKeys.all,
      'payments-ledger',
      objectiveId,
      paySort,
      payOrder,
    ] as const,
  territory: (scope: 'locality' | 'county', code: string) =>
    [...publicInvestmentsQueryKeys.all, 'territory', scope, code] as const,
  territoryFiltered: (
    scope: 'locality' | 'county',
    code: string,
    search: Partial<PublicInvestmentsTerritorySearchState>,
  ) =>
    [...publicInvestmentsQueryKeys.all, 'territory', scope, code, search] as const,
  evidence: (sourceRowKey: string, objectiveId?: string) =>
    [...publicInvestmentsQueryKeys.all, 'evidence', sourceRowKey, objectiveId ?? null] as const,
} as const

/**
 * Select helper: unwrap the discriminated result into a stable shape for
 * consumers — `{ data, isBlocked, blockedReason }` — without ever throwing.
 */
function selectResult<TData>(result: DataResult<TData> | undefined) {
  if (!result) {
    return {
      data: undefined,
      isBlocked: false,
      blockedReason: undefined,
      blockedMessageKey: undefined,
      blockedMessageParams: undefined,
    }
  }
  if (result.kind === 'available') {
    return {
      data: result.data,
      isBlocked: false,
      blockedReason: undefined,
      blockedMessageKey: undefined,
      blockedMessageParams: undefined,
    }
  }
  return {
    data: undefined,
    isBlocked: true,
    blockedReason: result.reason,
    blockedMessageKey: result.messageKey,
    blockedMessageParams: result.messageParams,
  }
}

function hasTotal(value: unknown): value is { readonly total: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'total' in value &&
    typeof (value as { readonly total?: unknown }).total === 'number'
  )
}

function hasRows(value: unknown): value is { readonly rows: readonly unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'rows' in value &&
    Array.isArray((value as { readonly rows?: unknown }).rows)
  )
}

function hasMapPoints(value: unknown): value is { readonly mapPoints: readonly unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'mapPoints' in value &&
    Array.isArray((value as { readonly mapPoints?: unknown }).mapPoints)
  )
}

function hasObjectives(value: unknown): value is { readonly objectives: readonly unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'objectives' in value &&
    Array.isArray((value as { readonly objectives?: unknown }).objectives)
  )
}

function hasPayments(value: unknown): value is { readonly payments: readonly unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'payments' in value &&
    Array.isArray((value as { readonly payments?: unknown }).payments)
  )
}

function deriveIsEmpty(value: unknown): boolean {
  if (!value) return false
  if (hasTotal(value)) return value.total === 0
  if (hasRows(value)) return value.rows.length === 0
  if (hasObjectives(value)) return value.objectives.length === 0
  if (hasPayments(value)) return value.payments.length === 0
  if (hasMapPoints(value)) return value.mapPoints.length === 0
  return false
}

export type PublicInvestmentsQueryResult<TData> = {
  readonly data: TData | undefined
  readonly isBlocked: boolean
  readonly blockedReason: DataAvailabilityStatus | undefined
  readonly blockedMessageKey: string | undefined
  readonly blockedMessageParams: Readonly<Record<string, string | number>> | undefined
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isPlaceholderData: boolean
  readonly isStale: boolean
  readonly isEmpty: boolean
  readonly isError: boolean
  readonly error: Error | null
}

export function useLandingData(): PublicInvestmentsQueryResult<LandingData> {
  const query = useQuery({
    queryKey: publicInvestmentsQueryKeys.landing(),
    queryFn: () => getLandingData(),
    staleTime: Infinity,
  })

  const selected = selectResult(query.data)

  return {
    data: selected.data,
    isBlocked: selected.isBlocked,
    blockedReason: selected.blockedReason,
    blockedMessageKey: selected.blockedMessageKey,
    blockedMessageParams: selected.blockedMessageParams,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isStale: query.isStale,
    isEmpty: deriveIsEmpty(selected.data),
    isError: query.isError,
    error: query.error,
  }
}

export function useObjectiveSearch(
  search: Partial<PublicInvestmentsSearchState>,
): PublicInvestmentsQueryResult<ObjectiveSearchResult> {
  const query = useQuery({
    queryKey: publicInvestmentsQueryKeys.search(search),
    queryFn: () => searchObjectives(search),
    staleTime: Infinity,
    placeholderData: (previous) => previous,
  })

  const selected = selectResult(query.data)

  return {
    data: selected.data,
    isBlocked: selected.isBlocked,
    blockedReason: selected.blockedReason,
    blockedMessageKey: selected.blockedMessageKey,
    blockedMessageParams: selected.blockedMessageParams,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isStale: query.isStale,
    isEmpty: deriveIsEmpty(selected.data),
    isError: query.isError,
    error: query.error,
  }
}

export function useObjectiveBundle(
  objectiveId: string,
): PublicInvestmentsQueryResult<ObjectiveDetailBundle> {
  const query = useQuery({
    queryKey: publicInvestmentsQueryKeys.objective(objectiveId),
    queryFn: () => getObjectiveBundle(objectiveId),
    enabled: Boolean(objectiveId),
    staleTime: Infinity,
  })

  const selected = selectResult(query.data)

  return {
    data: selected.data,
    isBlocked: selected.isBlocked,
    blockedReason: selected.blockedReason,
    blockedMessageKey: selected.blockedMessageKey,
    blockedMessageParams: selected.blockedMessageParams,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isStale: query.isStale,
    isEmpty: deriveIsEmpty(selected.data),
    isError: query.isError,
    error: query.error,
  }
}

export function usePaymentsLedgerData(
  objectiveId: string,
  paySort: PaymentSort = 'date',
  payOrder: SortOrder = 'asc',
): PublicInvestmentsQueryResult<PaymentsLedgerData> {
  const query = useQuery({
    queryKey: publicInvestmentsQueryKeys.paymentsLedger(
      objectiveId,
      paySort,
      payOrder,
    ),
    queryFn: () => getPaymentsLedgerData(objectiveId, paySort, payOrder),
    enabled: Boolean(objectiveId),
    staleTime: Infinity,
  })

  const selected = selectResult(query.data)

  return {
    data: selected.data,
    isBlocked: selected.isBlocked,
    blockedReason: selected.blockedReason,
    blockedMessageKey: selected.blockedMessageKey,
    blockedMessageParams: selected.blockedMessageParams,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isStale: query.isStale,
    isEmpty: deriveIsEmpty(selected.data),
    isError: query.isError,
    error: query.error,
  }
}

export function useTerritoryData(
  scope: 'locality' | 'county',
  code: string,
  search: Partial<PublicInvestmentsTerritorySearchState> = {},
): PublicInvestmentsQueryResult<TerritoryData> {
  const query = useQuery({
    queryKey: publicInvestmentsQueryKeys.territoryFiltered(scope, code, search),
    queryFn: () => getTerritoryData(scope, code, search),
    enabled: Boolean(code),
    staleTime: Infinity,
  })

  const selected = selectResult(query.data)

  return {
    data: selected.data,
    isBlocked: selected.isBlocked,
    blockedReason: selected.blockedReason,
    blockedMessageKey: selected.blockedMessageKey,
    blockedMessageParams: selected.blockedMessageParams,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isStale: query.isStale,
    isEmpty: deriveIsEmpty(selected.data),
    isError: query.isError,
    error: query.error,
  }
}

export function useEvidenceDetail(
  sourceRowKey: string | null | undefined,
  objectiveId?: string,
): PublicInvestmentsQueryResult<EvidenceDetail> {
  const query = useQuery({
    queryKey: publicInvestmentsQueryKeys.evidence(sourceRowKey ?? '', objectiveId),
    queryFn: () => getEvidenceDetail(sourceRowKey ?? '', objectiveId),
    enabled: Boolean(sourceRowKey),
    staleTime: Infinity,
  })

  const selected = selectResult(query.data)

  return {
    data: selected.data,
    isBlocked: selected.isBlocked,
    blockedReason: selected.blockedReason,
    blockedMessageKey: selected.blockedMessageKey,
    blockedMessageParams: selected.blockedMessageParams,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isStale: query.isStale,
    isEmpty: deriveIsEmpty(selected.data),
    isError: query.isError,
    error: query.error,
  }
}

// Re-export the search-state types consumers pair with these hooks.
export type {
  PublicInvestmentsLandingSearchState,
  PublicInvestmentsObjectiveSearchState,
  PublicInvestmentsSearchState,
  PublicInvestmentsTerritorySearchState,
}
