import {
  justiceUnavailable,
  type CaseSearchResult,
  type CompanyLitigationResult,
  type CourtAnalyticsSearchState,
  type CourtCaseloadResult,
  type JudicialCaseDetail,
  type JusticeOverview,
  type JusticeUnavailableResult,
} from '@/schemas/justice'
import type { CaseSearchState } from '@/schemas/justice'

const JUSTICE_DATASET_ID = 'legal-judicial-cases'

export type JusticeLiveResult<T> = T | JusticeUnavailableResult

/**
 * Live adapter for the justice domain.
 *
 * The live backend is not connected yet (`apiReady: false` in the catalog).
 * Rather than silently serving mock data or throwing into the UI render path,
 * the live adapter returns typed `JusticeUnavailableResult` values so hooks
 * can branch on `result.status === 'unavailable'` and render an honest
 * "unavailable/gated" state.
 *
 * Every live function returns the typed-unavailable path while the adapter is
 * disconnected, so UI surfaces can degrade consistently.
 */

export async function fetchJusticeOverviewLive(): Promise<
  JusticeLiveResult<JusticeOverview>
> {
  return justiceUnavailable(
    JUSTICE_DATASET_ID,
    'Justice overview live API is not connected yet.',
  )
}

export async function fetchCourtCaseloadLive(
  _courtId: string,
  _search?: Partial<CourtAnalyticsSearchState>,
): Promise<JusticeLiveResult<CourtCaseloadResult | null>> {
  return justiceUnavailable(
    JUSTICE_DATASET_ID,
    'Court caseload live API is not connected yet.',
  )
}

export async function fetchJudicialCaseLive(
  _caseId: string,
): Promise<JusticeLiveResult<JudicialCaseDetail | null>> {
  return justiceUnavailable(
    JUSTICE_DATASET_ID,
    'Judicial case live API is not connected yet.',
  )
}

export async function fetchCaseSearchLive(
  _search: CaseSearchState,
): Promise<JusticeLiveResult<CaseSearchResult>> {
  return justiceUnavailable(
    JUSTICE_DATASET_ID,
    'Case search live API is not connected yet.',
  )
}

export async function fetchCompanyLitigationLive(input: {
  readonly cui: string
  readonly page?: number
  readonly pageSize?: number
}): Promise<JusticeLiveResult<CompanyLitigationResult>> {
  void input
  return justiceUnavailable(
    JUSTICE_DATASET_ID,
    'Company litigation live API is not connected yet.',
  )
}
