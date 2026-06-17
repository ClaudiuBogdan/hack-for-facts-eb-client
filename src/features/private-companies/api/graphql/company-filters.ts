/**
 * Maps the /companies directory URL state onto the GraphQL `CompaniesFilter`
 * input. Each filter is a small object with `eq` / `in` / `prefix` operators
 * (see the server SDL). Returns `undefined` when no filters are active so the
 * query omits the `filter` argument entirely.
 */
import type { PrivateCompanySearchQuery } from '@/schemas/private-company-search'

export type CompaniesFilterInput = {
  county?: { eq: string }
  status?: { eq: string }
  caenCode?: { prefix?: string; eq?: string }
}

/**
 * CAEN codes are 4 digits at the class level (e.g. 4752). Any partial input —
 * division (47), group (475), etc. — is a prefix; only a full 4-digit code is
 * matched exactly. A 3-digit `eq` matches nothing (no code is exactly 3 digits),
 * so partials MUST go through `prefix`.
 */
function buildCaenFilter(caen: string): CompaniesFilterInput['caenCode'] | undefined {
  const trimmed = caen.trim()
  if (trimmed.length === 0) return undefined
  if (!/^\d{1,4}$/.test(trimmed)) return undefined
  return trimmed.length < 4 ? { prefix: trimmed } : { eq: trimmed }
}

export function buildCompaniesFilter(
  query: PrivateCompanySearchQuery,
): CompaniesFilterInput | undefined {
  const filter: CompaniesFilterInput = {}

  if (query.county && query.county.trim().length > 0) {
    filter.county = { eq: query.county.trim() }
  }
  if (query.status && query.status.trim().length > 0) {
    filter.status = { eq: query.status.trim() }
  }
  if (query.caen) {
    const caen = buildCaenFilter(query.caen)
    if (caen) filter.caenCode = caen
  }

  return Object.keys(filter).length > 0 ? filter : undefined
}
