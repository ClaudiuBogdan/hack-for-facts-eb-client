import { z } from 'zod'
import { parseArraySearchParam } from './public-investments'
import type { CompanyRegistryBasis, CompanyRegistryCuiState, CompanyRegistryEnvelope } from './private-company-registry'

export type { CompanyGroupByDim } from './private-company-hub'

/**
 * URL state for the /companies/search directory page. TanStack Router
 * JSON-parses search params, so `?q=14399840` can arrive as a number — coerce
 * to string. Multi-value filters accept a scalar (`?county=CLUJ`, the pre-rework
 * deep-link form), a repeated param, a comma list or a JSON array. Filters map
 * onto the GraphQL `companies(filter, q, sort, first, after)` query (see
 * `api/graphql/company-filters.ts`).
 *
 * The registry filters (county, status, caen, onrcCaen, legal form, recorded
 * date) are answered by the API from ONE pinned ONRC edition, on the SAME
 * resolved identifier; the fiscal switches are ANAF's, independent of it. A
 * filter the registry cannot answer now stays in the URL and the page says
 * so — it is never dropped or answered as empty.
 */
const stringArrayParam = z
  .preprocess((value) => parseArraySearchParam(value), z.array(z.string()).optional())
  .catch(undefined)

/**
 * Exact CAEN selectors (`rev2:6201`), normalised to lower case. A value that
 * is not one stays as given: the page names it invalid instead of dropping it.
 */
const caenSelectorParam = z
  .preprocess(
    (value) => parseArraySearchParam(value),
    z
      .array(z.string())
      .transform((values) => values.map((value) => (/^rev[0-3]:\d{4}$/iu.test(value.trim()) ? value.trim().toLowerCase() : value.trim())))
      .optional(),
  )
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
  /** Broad: the digits in ANY revision of the current edition's observations (a prefix below 4 digits). */
  caen: z.coerce.string().optional().catch(undefined),
  /** Exact: one code in one revision, `rev0`…`rev3`. */
  onrcCaen: caenSelectorParam,
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

  for (const key of ['county', 'status', 'onrcCaen', 'legalForm'] as const) {
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
  readonly onrcCaen?: readonly string[]
  readonly legalForm?: readonly string[]
  readonly regFrom?: string
  readonly regTo?: string
  readonly vat?: boolean
  readonly inactive?: boolean
  readonly sort?: PrivateCompanySortValue
  readonly pageSize: number
  readonly cursor?: string | null
  /** The registry scope the read is bound to: an answer under another is refused, never kept. */
  readonly scopeKey: string
  readonly signal?: AbortSignal
}

/**
 * A selectable county: its code (what the URL and the API filter carry), its
 * canonical name, and how many companies with an „în funcțiune" observation
 * have it as their county consensus in the pinned edition.
 */
export type PrivateCompanyCountyFacet = {
  readonly code: string
  readonly name: string
  readonly count: number
}

/**
 * Status-code options for the directory status filter. The status filter
 * matches ANY public original observation of the code on a resolved
 * identifier of the pinned edition (`1048` also beside a conflicting code).
 * The labels are this application's presentation nomenclature for the codes,
 * not labels ONRC publishes, and are deliberately left untranslated.
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

/**
 * One result page from the GraphQL `companies` connection, bound to ONE
 * registry scope (`registry`): rows, cursor and total all belong to it.
 */
export type PrivateCompanySearchResultPage = {
  readonly items: ReadonlyArray<{
    readonly cui: string
    readonly name: string
    /** Whose name: the pinned edition's qualified one, or the platform directory's. */
    readonly nameSource: 'onrc_edition' | 'core_organization'
    readonly legalForm: string | null
    /** The edition's complete status consensus; null without one (see `statusBasis`). */
    readonly status: { code: string; label: string } | null
    readonly county: string | null
    readonly vatPayer: boolean | null
    readonly declaredFiscallyInactive: boolean | null
    /** The civil date ONRC recorded; never a founding date. */
    readonly registrationDate: string | null
    readonly registryCuiState: CompanyRegistryCuiState
    /** Any public original 1048; null outside the edition. */
    readonly hasActiveObservation: boolean | null
    readonly statusBasis: CompanyRegistryBasis | null
    readonly countyBasis: CompanyRegistryBasis | null
    readonly recordedDateBasis: CompanyRegistryBasis | null
  }>
  readonly nextCursor: string | null
  readonly totalCount: number | null
  readonly totalEstimated: boolean
  readonly registry: CompanyRegistryEnvelope
}

// ---------------------------------------------------------------------------
// Resolve — companyResolveResult(dim, q, limit, registryScope)
// ---------------------------------------------------------------------------

/**
 * What a resolve answers. NAME (company names) and REGNUM (registration
 * identifiers) are read under ONE registry scope — the page's own, sent as
 * `registryScope` and checked on the answer, zero hits included. CAEN and
 * COUNTY are catalogs independent of the ONRC publication: no scope is sent
 * or answered, and their labels carry no ONRC provenance.
 */
export type CompanyResolveScopedDim = 'NAME' | 'REGNUM'
export type CompanyResolveCatalogDim = 'CAEN' | 'COUNTY'
export type CompanyResolveDim = CompanyResolveScopedDim | CompanyResolveCatalogDim

/**
 * Whose words a hit's label is: the pinned edition's qualified name, the
 * platform directory's name, the current database CAEN catalog, the territory
 * hub's county name. Null when the source labelled nothing (a CAEN row
 * without a catalog label shows its own key) or named an attribution this
 * client does not know — never another one guessed.
 */
export const COMPANY_RESOLVE_LABEL_SOURCES = ['onrc_edition', 'core_organization', 'current_db_catalog', 'territory_hub'] as const
export type CompanyResolveLabelSource = (typeof COMPANY_RESOLVE_LABEL_SOURCES)[number]

export type CompanyResolveHit = {
  readonly dim: CompanyResolveDim
  readonly cui: string | null
  readonly label: string
  readonly value: string
  readonly confidence: number | null
  /** A CAEN row's OWN revision, exactly as served; null for the other dimensions. */
  readonly revision: string | null
  /** A CAEN row's `<revision>:<code>`, exactly as served; null for the other dimensions. */
  readonly key: string | null
  readonly labelSource: CompanyResolveLabelSource | null
}

export type CompanyResolveRequest =
  | {
      readonly dim: CompanyResolveScopedDim
      readonly q: string
      readonly limit?: number
      /** The registry scope the page accepted: an answer under any other is refused, never kept. */
      readonly registryScope: string
    }
  | { readonly dim: CompanyResolveCatalogDim; readonly q: string; readonly limit?: number }

/**
 * One resolve answer. `hits: []` with `degraded: false` is a genuine no
 * match; `degraded: true` means the search engine was down and a capped
 * fallback answered (NAME only) — never a synonym for zero hits. A failed
 * read is neither: it is an error, never an empty answer.
 */
export type CompanyResolveResult = {
  readonly hits: readonly CompanyResolveHit[]
  readonly degraded: boolean
  /** More than one hit. */
  readonly ambiguous: boolean
  /** NAME/REGNUM: the scope the hits were read under, the request's own; null for the CAEN/COUNTY catalogs. */
  readonly registry: CompanyRegistryEnvelope | null
  readonly scopeKey: string | null
}

// ---------------------------------------------------------------------------
// Hub — /companies
// ---------------------------------------------------------------------------

/**
 * What the county map is coloured by: reported turnover, the average
 * headcount, or the companies with a financial statement for the year. The
 * retired layers (companies per 1,000 residents, companies founded in the
 * year) have no source in the analytics release; an old link that names one
 * opens the default layer.
 */
export const COMPANY_HUB_MAP_INDICATORS = ['cifra-de-afaceri', 'salariati', 'firme'] as const
export type CompanyHubMapIndicator = (typeof COMPANY_HUB_MAP_INDICATORS)[number]

/** What the main activities are ranked by. */
export const COMPANY_HUB_SECTOR_METRICS = ['cifra-de-afaceri', 'salariati', 'firme'] as const
export type CompanyHubSectorMetric = (typeof COMPANY_HUB_SECTOR_METRICS)[number]

/** What the largest companies are ranked by. */
export const COMPANY_HUB_RANKINGS = ['cifra-de-afaceri', 'salariati'] as const
export type CompanyHubRanking = (typeof COMPANY_HUB_RANKINGS)[number]

/**
 * The hub's three choices (map layer, activity measure, ranking), each a
 * measure of the analytics release's default fiscal year. A value the hub
 * does not know — a retired layer included — is dropped, so an old shared
 * link opens the hub on its defaults instead of failing.
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
