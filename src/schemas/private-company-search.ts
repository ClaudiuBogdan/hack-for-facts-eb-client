import { z } from 'zod'
import { parseArraySearchParam } from './public-investments'

/**
 * URL state for the /companies/search directory page. TanStack Router
 * JSON-parses search params, so `?q=14399840` can arrive as a number — coerce
 * to string. Multi-value filters accept a scalar (`?county=CLUJ`, the pre-rework
 * deep-link form), a repeated param, a comma list or a JSON array. Filters map
 * onto the GraphQL `companies(filter, q, sort, first, after)` query (see
 * `api/graphql/company-filters.ts`).
 */
const stringArrayParam = z
  .preprocess((value) => parseArraySearchParam(value), z.array(z.string()).optional())
  .catch(undefined)

/** `?vat=true` arrives as a boolean; the raw string form must parse too. */
const booleanParam = z
  .preprocess((value) => {
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
    return undefined
  }, z.boolean().optional())
  .catch(undefined)

/** ISO `YYYY-MM-DD`; anything else is dropped rather than thrown. */
const isoDateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined)

export const PRIVATE_COMPANY_SORT_VALUES = [
  'name',
  'registration-date',
  'cui',
] as const

export type PrivateCompanySortValue = (typeof PRIVATE_COMPANY_SORT_VALUES)[number]

export const privateCompanyDirectorySearchSchema = z.object({
  q: z.coerce.string().optional().catch(undefined),
  county: stringArrayParam,
  status: stringArrayParam,
  caen: z.coerce.string().optional().catch(undefined),
  legalForm: stringArrayParam,
  regFrom: isoDateParam,
  regTo: isoDateParam,
  vat: booleanParam,
  inactive: booleanParam,
  sort: z.enum(PRIVATE_COMPANY_SORT_VALUES).optional().catch(undefined),
})

export type PrivateCompanyDirectorySearchState = z.infer<
  typeof privateCompanyDirectorySearchSchema
>

export function parsePrivateCompanyDirectorySearch(
  search: Record<string, unknown>,
): PrivateCompanyDirectorySearchState {
  return privateCompanyDirectorySearchSchema.parse(search)
}

/**
 * Drop empty strings, empty arrays and `undefined` so the URL never carries a
 * param that means nothing. Mirrors `cleanProcurementSearch`.
 */
export function cleanPrivateCompanyDirectorySearch(
  search: PrivateCompanyDirectorySearchState,
): Partial<PrivateCompanyDirectorySearchState> {
  const cleaned: Record<string, unknown> = { ...search }

  for (const key of ['q', 'caen', 'regFrom', 'regTo'] as const) {
    const value = cleaned[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length === 0) delete cleaned[key]
      else cleaned[key] = trimmed
    }
  }

  for (const key of ['county', 'status', 'legalForm'] as const) {
    const value = cleaned[key]
    if (Array.isArray(value) && value.length === 0) delete cleaned[key]
  }

  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === undefined) delete cleaned[key]
  }

  return cleaned as Partial<PrivateCompanyDirectorySearchState>
}

/**
 * Internal query passed to the API adapters. `pageSize`/`cursor` drive the
 * GraphQL connection; the URL only carries the user-facing filters.
 */
export type PrivateCompanySearchQuery = {
  readonly q?: string
  readonly county?: readonly string[]
  readonly status?: readonly string[]
  readonly caen?: string
  readonly legalForm?: readonly string[]
  readonly regFrom?: string
  readonly regTo?: string
  readonly vat?: boolean
  readonly inactive?: boolean
  readonly sort?: PrivateCompanySortValue
  readonly pageSize: number
  readonly cursor?: string | null
  readonly signal?: AbortSignal
}

/** A selectable county facet (display name + active-company count). */
export type PrivateCompanyCountyFacet = {
  readonly name: string
  readonly count: number
}

/**
 * Status-code options for the directory status filter, by descending company
 * count in prod (`companies.registrations.status_code`). Codes verified against
 * the production DB on 2026-06-17. Labels are ONRC registry vocabulary and are
 * deliberately left untranslated.
 */
export const PRIVATE_COMPANY_STATUS_OPTIONS = [
  { code: '1084', label: 'radiată' },
  { code: '1048', label: 'funcțiune' },
  { code: '1074', label: 'întrerupere temporară de activitate' },
  { code: '1049', label: 'dizolvare' },
  { code: '1052', label: 'lichidare' },
  { code: '1070', label: 'faliment' },
  { code: '1107', label: 'insolvență' },
] as const

/**
 * Legal-form options for the directory filter — the ONRC `legalForm` strings as
 * stored. NOT verified against a production `DISTINCT legal_form` sweep; a live
 * pass should confirm the exact casing before these are trusted as an
 * exhaustive list.
 */
export const PRIVATE_COMPANY_LEGAL_FORM_OPTIONS = [
  'SRL',
  'SA',
  'PFA',
  'II',
  'IF',
  'SNC',
  'SCS',
  'RA',
] as const

/** One result page from the GraphQL `companies` connection. */
export type PrivateCompanySearchResultPage = {
  readonly items: ReadonlyArray<{
    readonly cui: string
    readonly name: string
    readonly legalForm: string | null
    readonly status: { code: string; label: string } | null
    readonly county: string | null
    readonly vatPayer: boolean | null
    readonly declaredFiscallyInactive: boolean | null
    readonly registrationDate: string | null
  }>
  readonly nextCursor: string | null
  readonly totalCount: number | null
  readonly totalEstimated: boolean
}

// ---------------------------------------------------------------------------
// Hub stats — companyHubStats
// ---------------------------------------------------------------------------

/** One row of a `companyCountyProfile`-style grouping. */
export type CompanyGroupSlice = {
  readonly key: string
  readonly label: string | null
  readonly count: number
}

/**
 * How much of the ranked population could be placed on a territory. `topCounties`
 * ranks only the matched share, so the bars do not sum to `activeCompanies` —
 * `territoryUnmatched` is the mass that is missing, and the UI must say so.
 */
export type CompanyCoverage = {
  readonly territoryMatched: number | null
  readonly territoryUnmatched: number | null
  readonly note: string
}

/**
 * Aggregate powering the /companies hub, from the cached server-side
 * `companyHubStats` query (6h TTL). Assembling it client-side from three cold
 * `companyCountyProfile` calls is not an option — that is ~30s of scans.
 *
 * `topCounties` is the top 10 ACTIVE counties with the `(none)` bucket removed;
 * `caenDivisions` is ACTIVE only, keyed by 2-digit division, with the empty-CAEN
 * bucket removed. Both therefore under-count on purpose.
 */
export type CompanyHubStats = {
  readonly totalCompanies: number
  readonly activeCompanies: number
  readonly statusMix: ReadonlyArray<CompanyGroupSlice>
  readonly topCounties: ReadonlyArray<CompanyGroupSlice>
  readonly caenDivisions: ReadonlyArray<CompanyGroupSlice>
  readonly coverage: CompanyCoverage
  readonly computedAt: string
}

/** `companyCountyProfile(groupBy:)` dimensions exposed by the server SDL. */
export type CompanyGroupByDim = 'COUNTY' | 'STATUS' | 'CAEN_DIVISION'
