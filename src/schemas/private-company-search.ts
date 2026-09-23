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
 * stored. Verified 2026-07-22 against a production `DISTINCT legal_form` sweep
 * of `companies_v2.registrations`: exact casing confirmed; ordered by measured
 * count (SRL 2.66M … RA 700). Covers every form with ≥700 registrations except
 * placeholder/rare codes (`N/A`, `SC`, cooperative `OC*` variants); re-measure
 * before treating as exhaustive after a snapshot generation change.
 */
export const PRIVATE_COMPANY_LEGAL_FORM_OPTIONS = [
  'SRL',
  'PFA',
  'II',
  'PF',
  'AF',
  'IF',
  'SA',
  'SNC',
  'CA',
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
// County and CAEN groupings — companyCountyProfile
// ---------------------------------------------------------------------------

/** One row of a `companyCountyProfile`-style grouping. */
export type CompanyGroupSlice = {
  readonly key: string
  readonly label: string | null
  readonly count: number
}

/** `companyCountyProfile(groupBy:)` dimensions exposed by the server SDL. */
export type CompanyGroupByDim = 'COUNTY' | 'STATUS' | 'CAEN_DIVISION'

// ---------------------------------------------------------------------------
// Hub — /companies
// ---------------------------------------------------------------------------

/** What the county map is coloured by. */
export const COMPANY_HUB_MAP_INDICATORS = ['densitate', 'infiintari', 'cifra-de-afaceri'] as const
export type CompanyHubMapIndicator = (typeof COMPANY_HUB_MAP_INDICATORS)[number]

/** What the sectors are ranked by. */
export const COMPANY_HUB_SECTOR_METRICS = ['cifra-de-afaceri', 'salariati', 'firme'] as const
export type CompanyHubSectorMetric = (typeof COMPANY_HUB_SECTOR_METRICS)[number]

/** What the largest companies are ranked by. */
export const COMPANY_HUB_RANKINGS = ['cifra-de-afaceri', 'salariati'] as const
export type CompanyHubRanking = (typeof COMPANY_HUB_RANKINGS)[number]

/**
 * The hub's three choices, each in the URL so a view can be shared. A value
 * the hub does not know is dropped, and the default is never written.
 */
export const companyHubSearchSchema = z
  .object({
    indicator: z.enum(COMPANY_HUB_MAP_INDICATORS).optional().catch(undefined),
    domenii: z.enum(COMPANY_HUB_SECTOR_METRICS).optional().catch(undefined),
    clasament: z.enum(COMPANY_HUB_RANKINGS).optional().catch(undefined),
  })
  .catch({})

export type CompanyHubSearch = z.infer<typeof companyHubSearchSchema>

export function parseCompanyHubSearch(search: Record<string, unknown>): CompanyHubSearch {
  return companyHubSearchSchema.parse(search)
}
