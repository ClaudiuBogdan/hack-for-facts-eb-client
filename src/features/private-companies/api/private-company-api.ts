import type { PrivateCompanyProfile } from '@/schemas/private-company'
import type { CompanyMainActivityHistoryKind, CompanyMainActivityHistoryResult } from '@/schemas/private-company-main-activity'
import type { CompanyResolveRequest, CompanyResolveResult } from '@/schemas/private-company-search'
import { isPrivateCompanyMockEnabled } from '../lib/mock-mode'
import { assertRegistryScope } from './company-registry-errors'
import { fetchPrivateCompanyProfileMock } from './private-company-api.mock'
import { fetchCompanyMainActivityHistoryLive, fetchPrivateCompanyProfileLive, resolveCompaniesLive } from './private-company-api.live'
import { resolveCompaniesMock } from './private-company-search-api.mock'

export type { CompanyResolveHit, CompanyResolveResult } from '@/schemas/private-company-search'

/** `signal` lets a server read with a deadline stop the request it gives up on. */
export async function fetchPrivateCompanyProfile(
  cui: string,
  signal?: AbortSignal,
): Promise<PrivateCompanyProfile | null> {
  if (isPrivateCompanyMockEnabled()) {
    return fetchPrivateCompanyProfileMock(cui)
  }
  return fetchPrivateCompanyProfileLive(cui, signal)
}

/**
 * A page of the ANAF-assumed main activity's history. The mock profiles carry
 * no main activity, so mock mode serves no history (`unsupported`: nothing
 * shown), never an invented one.
 */
export async function fetchCompanyMainActivityHistory(
  request: { readonly cui: string; readonly kind: CompanyMainActivityHistoryKind; readonly after: string | null; readonly scopeKey: string },
  signal?: AbortSignal,
): Promise<CompanyMainActivityHistoryResult> {
  if (isPrivateCompanyMockEnabled()) return { status: 'unsupported' }
  return fetchCompanyMainActivityHistoryLive(request, signal)
}

/**
 * `companyResolveResult`, live or over the fixtures, accepted only as the
 * request's own answer (`acceptCompanyResolveResult`). A failed read rejects
 * — a registry refusal classified (`CompanyRegistryScopeMovedError`, …), any
 * other failure as it came, a cancellation as an abort — and never resolves
 * to an empty answer.
 */
export async function resolveCompanies(request: CompanyResolveRequest, signal?: AbortSignal): Promise<CompanyResolveResult> {
  const result = isPrivateCompanyMockEnabled() ? await resolveCompaniesMock(request) : await resolveCompaniesLive(request, signal)
  return acceptCompanyResolveResult(result, request)
}

/**
 * Whether an answer may be used — before anything shows or caches it. NAME
 * and REGNUM: it carries its registry scope, envelope and key agreeing, and
 * that scope is the one the request sent; zero hits included (an empty answer
 * under another scope is not this scope's "no match"). Another scope is
 * `CompanyRegistryScopeMovedError`; an answer without its scope is a failure.
 * CAEN and COUNTY: catalogs, answered with no scope — one carrying a registry
 * would claim an ONRC provenance the catalog does not have, and is refused.
 * Every hit is of the requested dimension.
 */
export function acceptCompanyResolveResult(result: CompanyResolveResult, request: CompanyResolveRequest): CompanyResolveResult {
  if (result.hits.some((hit) => hit.dim !== request.dim)) throw new Error(`companyResolveResult answered hits of another dimension than ${request.dim}`)
  if ('registryScope' in request) {
    if (result.registry === null || result.scopeKey === null || result.registry.scopeKey !== result.scopeKey) {
      throw new Error(`companyResolveResult answered ${request.dim} without its registry scope`)
    }
    assertRegistryScope(result.scopeKey, request.registryScope)
    return result
  }
  if (result.registry !== null || result.scopeKey !== null) throw new Error(`companyResolveResult answered the ${request.dim} catalog with a registry scope`)
  return result
}
