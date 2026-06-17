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
 * CAEN codes are 4 digits (e.g. 4752). A 1-2 digit input is treated as a
 * division prefix (47 → 47xx); a full 3-4 digit code is matched exactly.
 */
function buildCaenFilter(caen: string): CompaniesFilterInput['caenCode'] | undefined {
  const trimmed = caen.trim()
  if (trimmed.length === 0) return undefined
  if (!/^\d{1,4}$/.test(trimmed)) return undefined
  return trimmed.length <= 2 ? { prefix: trimmed } : { eq: trimmed }
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
