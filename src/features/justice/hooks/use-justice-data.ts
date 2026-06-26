import { useQuery } from '@tanstack/react-query'
import {
  fetchCaseSearch,
  fetchCompanyLitigation,
  fetchCourtCaseload,
  fetchJudicialCase,
  fetchJusticeOverview,
  isJusticeUnavailable,
  type CompanyLitigationInput,
} from '../api/justice-api'
import type {
  CaseSearchState,
  CourtAnalyticsSearchState,
  JusticeUnavailableResult,
} from '@/schemas/justice'

// ---------------------------------------------------------------------------
// Query key helpers (stable, serializable)
// ---------------------------------------------------------------------------

export const justiceQueryKeys = {
  overview: () => ['justice', 'overview'] as const,
  courtCaseload: (
    courtId: string,
    search?: Partial<CourtAnalyticsSearchState>,
  ) => ['justice', 'court-caseload', courtId, search ?? {}] as const,
  judicialCase: (caseId: string) =>
    ['justice', 'judicial-case', caseId] as const,
  caseSearch: (search: CaseSearchState) => {
    const { from: _from, ...querySearch } = search
    return ['justice', 'case-search', querySearch] as const
  },
  companyLitigation: (input: CompanyLitigationInput) =>
    ['justice', 'company-litigation', input.cui, input.page ?? 1, input.pageSize ?? 25] as const,
} as const

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useJusticeOverview() {
  return useQuery({
    queryKey: justiceQueryKeys.overview(),
    queryFn: fetchJusticeOverview,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCourtCaseload(
  courtId: string,
  search?: Partial<CourtAnalyticsSearchState>,
) {
  return useQuery({
    queryKey: justiceQueryKeys.courtCaseload(courtId, search),
    queryFn: () => fetchCourtCaseload(courtId, search),
    enabled: courtId.length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useJudicialCase(caseId: string) {
  return useQuery({
    queryKey: justiceQueryKeys.judicialCase(caseId),
    queryFn: () => fetchJudicialCase(caseId),
    enabled: caseId.length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCaseSearch(search: CaseSearchState) {
  return useQuery({
    queryKey: justiceQueryKeys.caseSearch(search),
    queryFn: () => fetchCaseSearch(search),
    staleTime: 60 * 1000,
  })
}

export function useCompanyLitigation(input: CompanyLitigationInput) {
  return useQuery({
    queryKey: justiceQueryKeys.companyLitigation(input),
    queryFn: () => fetchCompanyLitigation(input),
    enabled: input.cui.length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Narrows a justice API result to the populated payload, excluding the typed
 * `unavailable` envelope. Useful for selectors / guards that only want `T`.
 */
export function unwrapJusticeResult<T>(value: T | unknown): T | undefined {
  if (value === null || value === undefined) {
    return value as T | undefined
  }
  if (isJusticeUnavailable(value)) {
    return undefined
  }
  return value as T
}

export type JusticeQueryOutcome<T> =
  | { readonly kind: 'populated'; readonly data: T }
  | { readonly kind: 'notFound' }
  | {
      readonly kind: 'unavailable'
      readonly unavailable: JusticeUnavailableResult
    }

/**
 * Keeps route/page code from conflating live-unavailable, not-found, and
 * populated payloads. `null` is reserved for not-found, while the live adapter
 * uses the typed unavailable envelope.
 */
export function getJusticeQueryOutcome<T>(
  value: T | JusticeUnavailableResult | null | undefined,
): JusticeQueryOutcome<T> | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return { kind: 'notFound' }
  }
  if (isJusticeUnavailable(value)) {
    return { kind: 'unavailable', unavailable: value }
  }
  return { kind: 'populated', data: value }
}
