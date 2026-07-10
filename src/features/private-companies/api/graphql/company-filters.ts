/**
 * Maps the /companies/search directory URL state onto the GraphQL
 * `CompaniesFilter` input. Each filter is a small object with `eq` / `in` /
 * `prefix` / `between` operators (see the server SDL). Returns `undefined` when
 * no filters are active so the query omits the `filter` argument entirely.
 */
import type { PrivateCompanySearchQuery } from '@/schemas/private-company-search'

/** `between` serializes as `{ from, to }` in the server's filter kernel. */
export type DateRangeFilter = { between: { from?: string; to?: string } }

export type CompaniesFilterInput = {
  county?: { eq?: string; in?: string[] }
  status?: { eq?: string; in?: string[] }
  caenCode?: { prefix?: string; eq?: string }
  legalForm?: { eq?: string; in?: string[] }
  registrationDate?: DateRangeFilter
  vatPayer?: { eq: boolean }
  declaredFiscallyInactive?: { eq: boolean }
}

/**
 * A single selected value uses `eq`; two or more use `in`. Both are supported by
 * the server, but `eq` keeps the common single-select case's query plan — and
 * its cache key — narrow.
 */
function buildSetFilter(
  values: readonly string[] | undefined,
): { eq?: string; in?: string[] } | undefined {
  if (!values) return undefined
  const cleaned = [...new Set(values.map((value) => value.trim()).filter(Boolean))]
  if (cleaned.length === 0) return undefined
  return cleaned.length === 1 ? { eq: cleaned[0] } : { in: cleaned }
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

function buildRegistrationDateFilter(
  from: string | undefined,
  to: string | undefined,
): DateRangeFilter | undefined {
  const between: { from?: string; to?: string } = {}
  if (from && from.trim().length > 0) between.from = from.trim()
  if (to && to.trim().length > 0) between.to = to.trim()
  return Object.keys(between).length > 0 ? { between } : undefined
}

export function buildCompaniesFilter(
  query: PrivateCompanySearchQuery,
): CompaniesFilterInput | undefined {
  const filter: CompaniesFilterInput = {}

  const county = buildSetFilter(query.county)
  if (county) filter.county = county

  const status = buildSetFilter(query.status)
  if (status) filter.status = status

  const legalForm = buildSetFilter(query.legalForm)
  if (legalForm) filter.legalForm = legalForm

  if (query.caen) {
    const caen = buildCaenFilter(query.caen)
    if (caen) filter.caenCode = caen
  }

  const registrationDate = buildRegistrationDateFilter(query.regFrom, query.regTo)
  if (registrationDate) filter.registrationDate = registrationDate

  if (typeof query.vat === 'boolean') filter.vatPayer = { eq: query.vat }
  if (typeof query.inactive === 'boolean') {
    filter.declaredFiscallyInactive = { eq: query.inactive }
  }

  return Object.keys(filter).length > 0 ? filter : undefined
}
