import type {
  CaseSearchResult,
  CaseSearchState,
  CompanyLitigationResult,
  CourtAnalyticsSearchState,
  CourtCaseloadResult,
  JudicialCaseDetail,
  JusticeOverview,
  JusticeUnavailableResult,
} from '@/schemas/justice'
import { isJusticeMockEnabled } from '../lib/mock-mode'
import {
  fetchCaseSearchMock,
  fetchCompanyLitigationMock,
  fetchCourtCaseloadMock,
  fetchJudicialCaseMock,
  fetchJusticeOverviewMock,
} from './justice-api.mock'
import {
  fetchCaseSearchLive,
  fetchCompanyLitigationLive,
  fetchCourtCaseloadLive,
  fetchJudicialCaseLive,
  fetchJusticeOverviewLive,
} from './justice-api.live'

/**
 * Public justice API.
 *
 * Mock-first: when mock mode is enabled (global `VITE_USE_MOCK_DATA` or scoped
 * `VITE_MOCK_DATASETS=legal-judicial-cases`) the mock adapters run and return
 * schema-validated data.
 *
 * Live mode: when mock mode is disabled, the live adapters run. Because the
 * live backend is not connected yet, they return typed
 * `JusticeUnavailableResult` (`{ status: 'unavailable', ... }`) instead of
 * silently serving mock data or throwing into the render path. Hooks branch
 * on `result.status === 'unavailable'` to render an honest state.
 *
 * The unified return type is `T | JusticeUnavailableResult` (mock returns `T`,
 * live returns `T | JusticeUnavailableResult`). `null` is preserved for
 * "not found" semantics distinct from "unavailable".
 */
export type JusticeApiResult<T> = T | JusticeUnavailableResult

const isUnavailable = (value: unknown): value is JusticeUnavailableResult =>
  typeof value === 'object' &&
  value !== null &&
  (value as { status?: unknown }).status === 'unavailable'

export function isJusticeUnavailable(
  value: unknown,
): value is JusticeUnavailableResult {
  return isUnavailable(value)
}

export async function fetchJusticeOverview(): Promise<
  JusticeApiResult<JusticeOverview>
> {
  if (isJusticeMockEnabled()) {
    return fetchJusticeOverviewMock()
  }
  return fetchJusticeOverviewLive()
}

export async function fetchCourtCaseload(
  courtId: string,
  search?: Partial<CourtAnalyticsSearchState>,
): Promise<JusticeApiResult<CourtCaseloadResult | null>> {
  if (isJusticeMockEnabled()) {
    return fetchCourtCaseloadMock(courtId, search)
  }
  return fetchCourtCaseloadLive(courtId, search)
}

export async function fetchJudicialCase(
  caseId: string,
): Promise<JusticeApiResult<JudicialCaseDetail | null>> {
  if (isJusticeMockEnabled()) {
    return fetchJudicialCaseMock(caseId)
  }
  return fetchJudicialCaseLive(caseId)
}

export async function fetchCaseSearch(
  search: CaseSearchState,
): Promise<JusticeApiResult<CaseSearchResult>> {
  if (isJusticeMockEnabled()) {
    return fetchCaseSearchMock(search)
  }
  return fetchCaseSearchLive(search)
}

export type CompanyLitigationInput = {
  readonly cui: string
  readonly page?: number
  readonly pageSize?: number
}

export async function fetchCompanyLitigation(
  input: CompanyLitigationInput,
): Promise<JusticeApiResult<CompanyLitigationResult>> {
  if (isJusticeMockEnabled()) {
    return fetchCompanyLitigationMock(input)
  }
  return fetchCompanyLitigationLive(input)
}
