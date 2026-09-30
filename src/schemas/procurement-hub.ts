/**
 * The old procurement explorer's URL schema (product A2). The explorer is
 * gone (design.md §18.17); its links are still read, by this parser, so the
 * analytics page's redirects can ask their questions again
 * (`analytics-legacy.ts`), and the ranking cards still describe their scope
 * in its words. The scope scrub per analysis population serves the
 * institution scopes.
 *
 * @see docs/specs/procurement-shared-hub-scope-requirements.md
 */
import { z } from 'zod'
import {
  procurementGrainSchema,
  procurementStatusSchema,
  reviewSignalKindSchema,
  type ProcurementGrain,
  type ProcurementStatus,
  type ReviewSignalKind,
} from './procurement'
import {
  buildProcurementOverviewMonthScope,
  getCalendarYearBounds,
  getOlderCalendarYearOptions,
  getPreviousCalendarYearBounds,
  getRecentCalendarYearQuickOptions,
  matchesCalendarYearPeriod,
  normalizeProcurementMonthEnd,
  normalizeProcurementMonthStart,
  resolveProcurementOverviewPeriod,
  toProcurementLandingQueryFilters,
  type ProcurementLandingFilters,
  type ResolvedProcurementOverviewPeriod,
} from './procurement-overview'
import {
  PROCUREMENT_SEARCH_DEFAULTS,
  PROCUREMENT_VALUE_CATEGORIES,
  procurementQModeSchema,
  procurementRecordKindSchema,
  procurementSortSchema,
  procurementSourceSchema,
  procurementValueCategorySchema,
  type ProcurementQMode,
  type ProcurementRecordKindOption,
  type ProcurementSort,
  type ProcurementSource,
  type ProcurementValueCategory,
} from './procurement-search'

export {
  buildProcurementOverviewMonthScope,
  getCalendarYearBounds,
  getOlderCalendarYearOptions,
  getPreviousCalendarYearBounds,
  getRecentCalendarYearQuickOptions,
  matchesCalendarYearPeriod,
  normalizeProcurementMonthEnd,
  normalizeProcurementMonthStart,
  resolveProcurementOverviewPeriod,
  toProcurementLandingQueryFilters,
  PROCUREMENT_SEARCH_DEFAULTS,
  PROCUREMENT_VALUE_CATEGORIES,
  procurementSortSchema,
  procurementSourceSchema,
  procurementValueCategorySchema,
}
export type {
  ProcurementLandingFilters,
  ResolvedProcurementOverviewPeriod,
  ProcurementSort,
  ProcurementSource,
  ProcurementValueCategory,
}

const toOptionalString = (value: unknown): unknown => {
  if (value === undefined || value === null) return undefined
  if (Array.isArray(value)) return value.join(',')
  return String(value)
}

const optionalStringParam = z
  .preprocess(toOptionalString, z.string().optional())
  .catch(undefined)

/**
 * Territory URL params, validated to the SAME shapes the server accepts —
 * county codes are 1–2 uppercase letters, SIRUTA codes are ≤8 digits, region
 * labels are bounded text. A hand-edited link carrying `buyerCounty=Cluj`
 * normalizes away here instead of failing the whole list request server-side.
 */
const geographyKey = (pattern: RegExp) =>
  z
    .preprocess(
      (value) => (typeof value === 'string' ? value.trim() : value),
      z.string().regex(pattern).optional(),
    )
    .catch(undefined)

const COUNTY_CODE_RE = /^[A-Z]{1,2}$/
const SIRUTA_RE = /^\d{1,8}$/
const REGION_RE = /^[\p{L}\p{N} .'-]{1,64}$/u

const optionalRegionKey = geographyKey(REGION_RE)
const optionalCountyKey = geographyKey(COUNTY_CODE_RE)
const optionalSirutaKey = geographyKey(SIRUTA_RE)

const optionalIsoDateParam = z
  .preprocess(
    (value) => {
      const str = toOptionalString(value)
      return typeof str === 'string' ? str.trim() : str
    },
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  )
  .catch(undefined)

const optionalPeriodMode = z.enum(['all']).optional().catch(undefined)

const commaListStatus = z
  .preprocess(toOptionalString, z.string().optional())
  .transform((value) => {
    if (typeof value !== 'string') return undefined
    const parts = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length === 0) return undefined
    const valid = parts.filter((part): part is ProcurementStatus =>
      (procurementStatusSchema.options as readonly string[]).includes(part),
    )
    return valid.length > 0 ? valid : undefined
  })
  .catch(undefined)

const commaListValueCategory = z
  .preprocess(toOptionalString, z.string().optional())
  .transform((value) => {
    if (typeof value !== 'string') return undefined
    const parts = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length === 0) return undefined
    const valid = parts.filter((part): part is ProcurementValueCategory =>
      (procurementValueCategorySchema.options as readonly string[]).includes(
        part,
      ),
    )
    return valid.length > 0 ? valid : undefined
  })
  .catch(undefined)

/** Comma-list of record-kind options (unknown tokens normalize away). */
const commaListRecordKind = z
  .preprocess(toOptionalString, z.string().optional())
  .transform((value) => {
    if (typeof value !== 'string') return undefined
    const parts = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length === 0) return undefined
    const valid = parts.filter((part): part is ProcurementRecordKindOption =>
      (procurementRecordKindSchema.options as readonly string[]).includes(part),
    )
    return valid.length > 0 ? valid : undefined
  })
  .catch(undefined)

/**
 * CPV hierarchy URL params: canonical 8-digit level codes with trailing zeros
 * and a non-zero level digit (group XXY00000, class XXXY0000, category
 * XXXXY000) — the exact server scope contract. Malformed values normalize away.
 */
const optionalCpvLevelCode = (re: RegExp) =>
  z
    .preprocess(
      (value) => (typeof value === 'string' ? value.trim() : toOptionalString(value)),
      z.string().regex(re).optional(),
    )
    .catch(undefined)

const CPV_GROUP_RE = /^\d{2}[1-9]0{5}$/
const CPV_CLASS_RE = /^\d{3}[1-9]0{4}$/
const CPV_CATEGORY_RE = /^\d{4}[1-9]0{3}$/

/** Hub layout: aggregates, leaderboard, or paginated records (A2 / F2). */
export const procurementHubViewSchema = z.enum([
  'overview',
  'list',
  'rankings',
])
export type ProcurementHubView = z.infer<typeof procurementHubViewSchema>

/** Rankings sub-tab dimension. */
export const procurementRankDimSchema = z.enum(['buyer', 'supplier', 'cpv'])
export type ProcurementRankDim = z.infer<typeof procurementRankDimSchema>

/**
 * CPV leaderboard level — the full official hierarchy (division 2 digits →
 * group 3 → class 4 → category 5 → full 8-digit code). Level buckets key on
 * canonical 8-digit codes with trailing zeros (server, 2026-07-24).
 */
export const procurementCpvLevelSchema = z.enum([
  'division',
  'group',
  'class',
  'category',
  'code',
])
export type ProcurementCpvLevel = z.infer<typeof procurementCpvLevelSchema>

/** Rankings sort basis — records (default) or awarded value (spend-gated server-side). */
export const procurementRankBySchema = z.enum(['count', 'value'])
export type ProcurementRankBy = z.infer<typeof procurementRankBySchema>

export const PROCUREMENT_RANK_PAGE_SIZES = [10, 25, 50] as const
export type ProcurementRankPageSize =
  (typeof PROCUREMENT_RANK_PAGE_SIZES)[number]

/** Shared display metric across Overview and List. */
export const procurementHubMeasureSchema = z.enum([
  'record_count',
  'value_awarded',
])
export type ProcurementHubMeasure = z.infer<typeof procurementHubMeasureSchema>

/**
 * Value logic (vbasis) — which money concept the analytics serve. The contracts
 * model carries several legitimate money figures per record; each option maps
 * to a server (grain, measure) pair and they are NEVER interchangeable:
 *
 *  - `awarded` (default): accepted awarded value — what was signed.
 *  - `estimated`: published estimated value — what was budgeted (its own
 *    coverage verdict per grain; contracts abstain by design).
 *  - `ceiling`: framework-agreement ceilings — the MAXIMUM committed under the
 *    umbrellas, not spend (parent `framework` population; rankings withheld).
 *  - `calloff`: subsequent contracts — execution under frameworks (its own
 *    `calloff` population; never summed with contract awards).
 *  - `mod_adjusted`: modification-adjusted value — final value after verified
 *    amendment chains (contracts grain only).
 */
export const procurementValueBasisSchema = z.enum([
  'awarded',
  'estimated',
  'ceiling',
  'calloff',
  'mod_adjusted',
])
export type ProcurementValueBasis = z.infer<typeof procurementValueBasisSchema>

/**
 * Map choropleth geography level. Region + county paint live; UAT stays preview
 * until a UAT geometry layer ships. Kept in URL as Overview-map chrome only
 * (not a global filter chip / sheet control).
 */
export const procurementHubMapGrainSchema = z.enum(['region', 'county', 'uat'])
export type ProcurementHubMapGrain = z.infer<
  typeof procurementHubMapGrainSchema
>

/** Which party geography the map choropleth paints (URL chrome, like mapGrain). */
export const procurementHubMapPartySchema = z.enum(['buyer', 'supplier'])
export type ProcurementHubMapParty = z.infer<
  typeof procurementHubMapPartySchema
>

/**
 * Hub grains used in the analysis toggle + list. Procedures/modifications remain
 * list-capable via grain but overview analytics focus on contracts/DA.
 */
export const procurementHubGrainSchema = z.enum([
  'contracts',
  'direct_acquisitions',
  'procedures',
  'modifications',
])

export const procurementHubSearchSchema = z
  .object({
    // Legacy `view=map` bookmarks normalize to Overview (map lives on Overview).
    view: z
      .preprocess(
        (value) => (value === 'map' ? 'overview' : value),
        procurementHubViewSchema.optional(),
      )
      .catch(undefined),
    vbasis: procurementValueBasisSchema.optional().catch(undefined),
    // Legacy tab param → normalized in parse
    tab: z.enum(['overview', 'search']).optional().catch(undefined),
    grain: procurementGrainSchema.optional().catch(undefined),
    measure: procurementHubMeasureSchema.optional().catch(undefined),
    mapGrain: procurementHubMapGrainSchema.optional().catch(undefined),
    mapParty: procurementHubMapPartySchema.optional().catch(undefined),
    rankDim: procurementRankDimSchema.optional().catch(undefined),
    cpvLevel: procurementCpvLevelSchema.optional().catch(undefined),
    rankBy: procurementRankBySchema.optional().catch(undefined),
    rankPage: z.coerce.number().int().min(1).optional().catch(undefined),
    rankPageSize: z
      .preprocess((value) => {
        const num =
          typeof value === 'string' || typeof value === 'number'
            ? Number(value)
            : undefined
        if (
          typeof num === 'number' &&
          Number.isInteger(num) &&
          (PROCUREMENT_RANK_PAGE_SIZES as readonly number[]).includes(num)
        ) {
          return num as ProcurementRankPageSize
        }
        return undefined
      }, z.custom<ProcurementRankPageSize>().optional())
      .catch(undefined),
    q: optionalStringParam,
    qmode: procurementQModeSchema.optional().catch(undefined),
    authority_cui: optionalStringParam,
    supplier_cui: optionalStringParam,
    cpv: optionalStringParam,
    cpv_division: optionalStringParam,
    cpv_group: optionalCpvLevelCode(CPV_GROUP_RE),
    cpv_class: optionalCpvLevelCode(CPV_CLASS_RE),
    cpv_category: optionalCpvLevelCode(CPV_CATEGORY_RE),
    source: procurementSourceSchema.optional().catch(undefined),
    status: commaListStatus.optional(),
    value_state: commaListValueCategory.optional(),
    record_kind: commaListRecordKind.optional(),
    county: optionalStringParam,
    region: optionalStringParam,
    year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
    dateFrom: optionalIsoDateParam,
    dateTo: optionalIsoDateParam,
    period: optionalPeriodMode,
    buyerRegion: optionalRegionKey,
    buyerCounty: optionalCountyKey,
    buyerSiruta: optionalSirutaKey,
    supplierRegion: optionalRegionKey,
    supplierCounty: optionalCountyKey,
    supplierSiruta: optionalSirutaKey,
    valueMin: z.coerce.number().nonnegative().optional().catch(undefined),
    valueMax: z.coerce.number().nonnegative().optional().catch(undefined),
    signal: reviewSignalKindSchema.optional().catch(undefined),
    sort: procurementSortSchema.optional().catch(undefined),
    page: z.coerce.number().int().min(1).optional().catch(undefined),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .catch(undefined),
    from: optionalStringParam,
    highlight: optionalStringParam,
  })

export type ProcurementHubSearch = z.output<typeof procurementHubSearchSchema>

export type ProcurementHubState = {
  view: ProcurementHubView
  grain: ProcurementGrain
  vbasis: ProcurementValueBasis
  measure: ProcurementHubMeasure
  mapGrain: ProcurementHubMapGrain
  mapParty: ProcurementHubMapParty
  rankDim: ProcurementRankDim
  cpvLevel: ProcurementCpvLevel
  rankBy: ProcurementRankBy
  rankPage: number
  rankPageSize: ProcurementRankPageSize
  sort: ProcurementSort
  page: number
  pageSize: number
  q?: string
  qmode?: ProcurementQMode
  authority_cui?: string
  supplier_cui?: string
  cpv?: string
  cpv_division?: string
  cpv_group?: string
  cpv_class?: string
  cpv_category?: string
  source?: ProcurementSource
  status?: ProcurementStatus[]
  value_state?: ProcurementValueCategory[]
  record_kind?: ProcurementRecordKindOption[]
  county?: string
  region?: string
  year?: number
  dateFrom?: string
  dateTo?: string
  period?: 'all'
    buyerRegion?: string
    buyerCounty?: string
    buyerSiruta?: string
    supplierRegion?: string
    supplierCounty?: string
    supplierSiruta?: string
    valueMin?: number
    valueMax?: number
    signal?: ReviewSignalKind
    from?: string
    highlight?: string
  }

export const PROCUREMENT_HUB_DEFAULTS = {
  view: 'overview' as const,
  grain: PROCUREMENT_SEARCH_DEFAULTS.grain,
  vbasis: 'awarded' as const,
  measure: 'value_awarded' as const,
  mapGrain: 'region' as const,
  mapParty: 'buyer' as const,
  rankDim: 'buyer' as const,
  cpvLevel: 'division' as const,
  rankBy: 'value' as const,
  rankPage: 1 as const,
  rankPageSize: 10 as const,
  sort: PROCUREMENT_SEARCH_DEFAULTS.sort,
  page: PROCUREMENT_SEARCH_DEFAULTS.page,
  pageSize: PROCUREMENT_SEARCH_DEFAULTS.pageSize,
} as const

/**
 * Keys that apply to list queries but not overview aggregates (C1).
 * 2026-07-24: `q` / `valueMin` / `valueMax` moved OUT of this set — they now
 * scope aggregates as server row filters; record_kind + CPV hierarchy levels
 * scope rankings (single-bucket rejection keeps them off landing facets).
 */
export const PROCUREMENT_HUB_LIST_ONLY_KEYS = [
  'authority_cui',
  'supplier_cui',
  'cpv',
  'cpv_division',
  'source',
  'status',
  'value_state',
  'sort',
  'page',
  'pageSize',
  'signal',
  'year',
  'county',
  'region',
  'from',
  'highlight',
] as const

/**
 * Party-territory keys, buyer side then supplier side. Authoritative on BOTH
 * surfaces since the search engine took over the record list (2026-07-25):
 * aggregates resolve them in ClickHouse, the list in OpenSearch, from the same
 * territory resolution. Supplier territory is structurally absent on grains
 * with no award.
 */
export const PROCUREMENT_HUB_GEO_KEYS = [
  'buyerRegion',
  'buyerCounty',
  'buyerSiruta',
  'supplierRegion',
  'supplierCounty',
  'supplierSiruta',
] as const

export function withProcurementHubDefaults(
  search: ProcurementHubSearch,
): ProcurementHubState {
  const viewFromTab =
    search.tab === 'search'
      ? 'list'
      : search.tab === 'overview'
        ? 'overview'
        : undefined

  const { tab: _tab, ...rest } = search

  // Value-logic normalization (design v1.1): mod-adjusted exists only on the
  // contracts grain; the modifications population is counts-only and carries
  // no alternative value logic — an incompatible pair falls back on the grain.
  const vbasis = search.vbasis ?? PROCUREMENT_HUB_DEFAULTS.vbasis
  const grain = search.grain ?? PROCUREMENT_HUB_DEFAULTS.grain
  const normalized: { vbasis: ProcurementValueBasis; grain: ProcurementGrain } =
    vbasis === 'mod_adjusted'
      ? { vbasis, grain: 'contracts' }
      : grain === 'modifications' && vbasis !== 'awarded'
        ? { vbasis: 'awarded', grain }
        : { vbasis, grain }

  return {
    ...rest,
    view: search.view ?? viewFromTab ?? PROCUREMENT_HUB_DEFAULTS.view,
    grain: normalized.grain,
    vbasis: normalized.vbasis,
    measure: search.measure ?? PROCUREMENT_HUB_DEFAULTS.measure,
    mapGrain: search.mapGrain ?? PROCUREMENT_HUB_DEFAULTS.mapGrain,
    mapParty: search.mapParty ?? PROCUREMENT_HUB_DEFAULTS.mapParty,
    rankDim: search.rankDim ?? PROCUREMENT_HUB_DEFAULTS.rankDim,
    cpvLevel: search.cpvLevel ?? PROCUREMENT_HUB_DEFAULTS.cpvLevel,
    rankBy: search.rankBy ?? PROCUREMENT_HUB_DEFAULTS.rankBy,
    rankPage: search.rankPage ?? PROCUREMENT_HUB_DEFAULTS.rankPage,
    rankPageSize: search.rankPageSize ?? PROCUREMENT_HUB_DEFAULTS.rankPageSize,
    sort: search.sort ?? PROCUREMENT_HUB_DEFAULTS.sort,
    page: search.page ?? PROCUREMENT_HUB_DEFAULTS.page,
    pageSize: search.pageSize ?? PROCUREMENT_HUB_DEFAULTS.pageSize,
  }
}

export function parseProcurementHubSearch(
  input: unknown,
): ProcurementHubState {
  const parsed = procurementHubSearchSchema.parse(input ?? {})
  const normalizedFrom = normalizeProcurementMonthStart(parsed.dateFrom)
  const normalizedTo = normalizeProcurementMonthEnd(parsed.dateTo)

  // Finest buyer geo wins: SIRUTA > county > region.
  const buyerGeo = parsed.buyerSiruta
    ? {
        buyerSiruta: parsed.buyerSiruta,
        buyerCounty: undefined,
        buyerRegion: undefined,
      }
    : parsed.buyerCounty
      ? {
          buyerCounty: parsed.buyerCounty,
          buyerRegion: undefined,
          buyerSiruta: undefined,
        }
      : parsed.buyerRegion
        ? {
            buyerRegion: parsed.buyerRegion,
            buyerCounty: undefined,
            buyerSiruta: undefined,
          }
        : {
            buyerRegion: undefined,
            buyerCounty: undefined,
            buyerSiruta: undefined,
          }

  // Finest CPV level wins; coarser fields are dropped so a cleared chip does
  // not resurrect a hidden coarser filter from the URL.
  const cpvLevels: Partial<ProcurementHubSearch> = parsed.cpv
    ? {
        cpv: parsed.cpv,
        cpv_category: undefined,
        cpv_class: undefined,
        cpv_group: undefined,
        cpv_division: undefined,
      }
    : parsed.cpv_category
      ? { cpv_category: parsed.cpv_category, cpv_class: undefined, cpv_group: undefined, cpv_division: undefined }
      : parsed.cpv_class
        ? { cpv_class: parsed.cpv_class, cpv_group: undefined, cpv_division: undefined }
        : parsed.cpv_group
          ? { cpv_group: parsed.cpv_group, cpv_division: undefined }
          : {}

  const withDates: ProcurementHubSearch = {
    ...parsed,
    ...(normalizedFrom ? { dateFrom: normalizedFrom } : { dateFrom: undefined }),
    ...(normalizedTo ? { dateTo: normalizedTo } : { dateTo: undefined }),
    ...(parsed.period === 'all' ? { period: 'all' as const } : {}),
    ...cpvLevels,
    ...buyerGeo,
    ...(parsed.supplierSiruta
      ? {
          supplierSiruta: parsed.supplierSiruta,
          supplierCounty: undefined,
          supplierRegion: undefined,
        }
      : parsed.supplierCounty
        ? {
            supplierCounty: parsed.supplierCounty,
            supplierRegion: undefined,
            supplierSiruta: undefined,
          }
        : parsed.supplierRegion
          ? {
              supplierRegion: parsed.supplierRegion,
              supplierCounty: undefined,
              supplierSiruta: undefined,
            }
          : {}),
  }

  return withProcurementHubDefaults(withDates)
}

// ---------------------------------------------------------------------------
// Scope per analysis population (server design v1.1) — what each population
// can be filtered on, for the institution scopes (`institution-scopes.ts`).
// ---------------------------------------------------------------------------

export type ProcurementServerAnalysisGrain =
  | 'procedure'
  | 'contract'
  | 'direct_acquisition'
  | 'framework'
  | 'calloff'
  | 'modification'

/**
 * Scope fields each analysis population carries (server design v1.1) — a
 * field outside the set would REJECT the whole analysis query, so it is
 * scrubbed and the drop reported (never silently sent, never silently kept).
 * Core grains pass through untouched except procedures (no supplier).
 */
type BasisScopeInput = {
  readonly authorityCui?: string
  readonly supplierCui?: string
  readonly cpvDivision?: string
  readonly cpvGroup?: string
  readonly cpvClass?: string
  readonly cpvCategory?: string
  readonly cpvCode?: string
  readonly monthFrom?: string
  readonly monthTo?: string
  readonly buyerRegion?: string
  readonly buyerCounty?: string
  readonly buyerSiruta?: string
  readonly supplierCounty?: string
  readonly supplierRegion?: string
  readonly supplierSiruta?: string
  readonly grain?: 'procedure' | 'contract' | 'direct_acquisition'
  readonly status?: string
  readonly recordKind?: string
  readonly q?: string
  readonly valueMin?: number
  readonly valueMax?: number
}

export type BasisScrubbedScope = {
  readonly scope: BasisScopeInput
  /** Hub state keys whose filters were dropped for this population. */
  readonly dropped: readonly (keyof ProcurementHubState)[]
}

export function scrubScopeForAnalysisGrain<
  T extends Partial<BasisScopeInput>,
>(
  scope: T,
  analysisGrain: ProcurementServerAnalysisGrain,
): { readonly scope: T; readonly dropped: readonly (keyof ProcurementHubState)[] } {
  const next: Record<string, unknown> = { ...scope }
  const dropped: (keyof ProcurementHubState)[] = []
  const drop = (
    scopeKey: keyof BasisScopeInput,
    stateKey: keyof ProcurementHubState,
  ) => {
    if (next[scopeKey] !== undefined) {
      delete next[scopeKey]
      dropped.push(stateKey)
    }
  }

  if (
    analysisGrain === 'framework' ||
    analysisGrain === 'calloff' ||
    analysisGrain === 'modification'
  ) {
    // No title column on any value-basis population.
    drop('q', 'q')
    // Analysis-scope status/procedure-type are core-grain columns.
    drop('status', 'status')
  }
  if (analysisGrain === 'framework') {
    drop('supplierCui', 'supplier_cui')
    drop('supplierRegion', 'supplierRegion')
    drop('supplierCounty', 'supplierCounty')
    drop('supplierSiruta', 'supplierSiruta')
    drop('recordKind', 'record_kind')
  }
  if (analysisGrain === 'calloff' || analysisGrain === 'modification') {
    // Only a validated CPV division exists on these rows.
    drop('cpvGroup', 'cpv_group')
    drop('cpvClass', 'cpv_class')
    drop('cpvCategory', 'cpv_category')
    drop('cpvCode', 'cpv')
    // Supplier geography has no published coverage row yet (supplierCui stays).
    drop('supplierRegion', 'supplierRegion')
    drop('supplierCounty', 'supplierCounty')
    drop('supplierSiruta', 'supplierSiruta')
  }
  if (analysisGrain === 'calloff') {
    drop('recordKind', 'record_kind')
  }
  if (analysisGrain === 'modification') {
    // Counts-only: raw amendment deltas are not servable money.
    drop('valueMin', 'valueMin')
    drop('valueMax', 'valueMax')
  }
  if (analysisGrain === 'procedure') {
    // A procedure predates its award — no supplier columns.
    drop('supplierCui', 'supplier_cui')
    drop('supplierRegion', 'supplierRegion')
    drop('supplierCounty', 'supplierCounty')
    drop('supplierSiruta', 'supplierSiruta')
    drop('recordKind', 'record_kind')
  }

  return { scope: next as T, dropped }
}

export type ReviewSignalKindValue = ReviewSignalKind
