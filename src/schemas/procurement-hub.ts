/**
 * Unified procurement hub URL schema (product A2).
 *
 * One schema for `/procurement` overview + list layouts. Period soft-default
 * (E1), list-only facets preserved on overview (C1), geography honesty (B1).
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
  procurementRecordKindSchema,
  procurementSortSchema,
  procurementSourceSchema,
  procurementValueCategorySchema,
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

const optionalGeographyKey = z
  .preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1).max(64).optional(),
  )
  .catch(undefined)

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
    buyerRegion: optionalGeographyKey,
    buyerCounty: optionalGeographyKey,
    buyerSiruta: optionalGeographyKey,
    supplierRegion: optionalGeographyKey,
    supplierCounty: optionalGeographyKey,
    supplierSiruta: optionalGeographyKey,
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
 * API-honest leaderboard depth for Rankings (GraphQL topN capped at 100 —
 * ClickHouse analytics, dev 2026-07-22). Client pagination windows this payload;
 * server offset pagination is still a possible follow-up for deeper walks.
 */
export const PROCUREMENT_RANKINGS_TOP_N = 100 as const

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
 * with no award — see `PROCUREMENT_HUB_CAPABILITIES`.
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

export function cleanProcurementHubSearch(
  search: Partial<ProcurementHubState>,
): Partial<ProcurementHubState> {
  const cleaned: Partial<ProcurementHubState> = { ...search }
  delete (cleaned as { tab?: unknown }).tab

  const trimmedText: Array<keyof ProcurementHubState> = [
    'q',
    'authority_cui',
    'supplier_cui',
    'cpv',
    'cpv_division',
    'cpv_group',
    'cpv_class',
    'cpv_category',
    'county',
    'region',
    'from',
    'highlight',
    'dateFrom',
    'dateTo',
    'buyerRegion',
    'buyerCounty',
    'buyerSiruta',
    'supplierRegion',
    'supplierCounty',
    'supplierSiruta',
  ]
  for (const key of trimmedText) {
    const value = cleaned[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length === 0) {
        delete cleaned[key]
      } else {
        ;(cleaned as Record<string, unknown>)[key] = trimmed
      }
    }
  }

  if (cleaned.view === PROCUREMENT_HUB_DEFAULTS.view) delete cleaned.view
  if (cleaned.grain === PROCUREMENT_HUB_DEFAULTS.grain) delete cleaned.grain
  if (cleaned.vbasis === PROCUREMENT_HUB_DEFAULTS.vbasis) delete cleaned.vbasis
  if (cleaned.measure === PROCUREMENT_HUB_DEFAULTS.measure) delete cleaned.measure
  if (cleaned.mapGrain === PROCUREMENT_HUB_DEFAULTS.mapGrain) {
    delete cleaned.mapGrain
  }
  if (cleaned.mapParty === PROCUREMENT_HUB_DEFAULTS.mapParty) {
    delete cleaned.mapParty
  }
  if (cleaned.rankDim === PROCUREMENT_HUB_DEFAULTS.rankDim) delete cleaned.rankDim
  if (cleaned.cpvLevel === PROCUREMENT_HUB_DEFAULTS.cpvLevel) {
    delete cleaned.cpvLevel
  }
  if (cleaned.rankBy === PROCUREMENT_HUB_DEFAULTS.rankBy) delete cleaned.rankBy
  if (cleaned.rankPage === PROCUREMENT_HUB_DEFAULTS.rankPage) {
    delete cleaned.rankPage
  }
  if (cleaned.rankPageSize === PROCUREMENT_HUB_DEFAULTS.rankPageSize) {
    delete cleaned.rankPageSize
  }
  if (cleaned.sort === PROCUREMENT_HUB_DEFAULTS.sort) delete cleaned.sort
  if (cleaned.page === PROCUREMENT_HUB_DEFAULTS.page) delete cleaned.page
  if (cleaned.pageSize === PROCUREMENT_HUB_DEFAULTS.pageSize) {
    delete cleaned.pageSize
  }
  if (!cleaned.status?.length) delete cleaned.status
  if (!cleaned.value_state?.length) delete cleaned.value_state
  if (!cleaned.record_kind?.length) delete cleaned.record_kind
  if (cleaned.period !== 'all') delete cleaned.period

  return cleaned
}

/** Landing/analytics filters from hub state (period resolved). */
export function hubStateToLandingFilters(
  state: ProcurementHubState,
  now?: Date,
): ProcurementLandingFilters {
  return toProcurementLandingQueryFilters(
    {
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
      period: state.period,
      buyerRegion: state.buyerRegion,
      buyerCounty: state.buyerCounty,
      buyerSiruta: state.buyerSiruta,
      supplierRegion: state.supplierRegion,
      supplierCounty: state.supplierCounty,
      supplierSiruta: state.supplierSiruta,
      // Row filters scope aggregates too (q-on-aggregates + value bounds).
      q: state.q,
      valueMin: state.valueMin,
      valueMax: state.valueMax,
      // Party / CPV scopes reach landing too (C1 closed 2026-07-24); the
      // landing fetch skips each facet dimension the scope fixes.
      authorityCui: state.authority_cui,
      supplierCui: state.supplier_cui,
      cpvDivision: state.cpv_division,
      cpvGroup: state.cpv_group,
      cpvClass: state.cpv_class,
      cpvCategory: state.cpv_category,
      cpvCode: state.cpv,
      rankBy: state.measure === 'value_awarded' ? 'value' : 'count',
    },
    now,
  )
}

/**
 * Map territory drawer scope: same resolved hub filters as Overview/map
 * (period, measure→rankBy, supplier geo), with **buyer** geo replaced by the
 * clicked territory so sidebar cards match the original buyer-map panel.
 *
 * `mapParty` only affects map paint — not this drawer query. Apply still sets
 * buyer location filters (supplier location stays on the filter sheet).
 *
 * `mapGrain` here is the **selection** grain (from paint mode), not the
 * toolbar chrome — county paint under region toolbar must scope to county.
 *
 * Grain is intentionally omitted from the aggregates scope — `mapLanding`
 * requires procedure + contract + DA blocks; grain selection stays client-side.
 */
export function hubStateToTerritoryLandingFilters(
  state: ProcurementHubState,
  mapGrain: ProcurementHubMapGrain,
  territoryId: string | undefined,
  now?: Date,
): ProcurementLandingFilters {
  const base = hubStateToLandingFilters(state, now)
  const shared: ProcurementLandingFilters = {
    ...(base.dateFrom ? { dateFrom: base.dateFrom } : {}),
    ...(base.dateTo ? { dateTo: base.dateTo } : {}),
    ...(base.period ? { period: base.period } : {}),
    ...(base.rankBy ? { rankBy: base.rankBy } : {}),
    ...(base.supplierRegion ? { supplierRegion: base.supplierRegion } : {}),
    ...(base.supplierCounty ? { supplierCounty: base.supplierCounty } : {}),
    ...(base.supplierSiruta ? { supplierSiruta: base.supplierSiruta } : {}),
    ...(base.q ? { q: base.q } : {}),
    ...(base.valueMin !== undefined ? { valueMin: base.valueMin } : {}),
    ...(base.valueMax !== undefined ? { valueMax: base.valueMax } : {}),
    ...(base.authorityCui ? { authorityCui: base.authorityCui } : {}),
    ...(base.supplierCui ? { supplierCui: base.supplierCui } : {}),
    ...(base.cpvDivision ? { cpvDivision: base.cpvDivision } : {}),
    ...(base.cpvGroup ? { cpvGroup: base.cpvGroup } : {}),
    ...(base.cpvClass ? { cpvClass: base.cpvClass } : {}),
    ...(base.cpvCategory ? { cpvCategory: base.cpvCategory } : {}),
    ...(base.cpvCode ? { cpvCode: base.cpvCode } : {}),
  }
  if (!territoryId) {
    return {
      ...shared,
      ...(base.buyerRegion ? { buyerRegion: base.buyerRegion } : {}),
      ...(base.buyerCounty ? { buyerCounty: base.buyerCounty } : {}),
      ...(base.buyerSiruta ? { buyerSiruta: base.buyerSiruta } : {}),
    }
  }
  if (mapGrain === 'county') {
    return { ...shared, buyerCounty: territoryId }
  }
  if (mapGrain === 'uat') {
    return { ...shared, buyerSiruta: territoryId }
  }
  return { ...shared, buyerRegion: territoryId }
}

/**
 * List/search API state from hub — period resolved into dates, geography and
 * the CPV hierarchy carried through (the search engine serves them on the
 * record list since 2026-07-25).
 *
 * Keys the active grain cannot honor are dropped HERE, from the same registry
 * that drives the disclosure, so the request and the explanation can never
 * disagree (`listCapabilityDrops` returns what was dropped and why).
 */
export function hubStateToListSearchState(
  state: ProcurementHubState,
  now?: Date,
): import('./procurement-search').ProcurementSearchState {
  const resolved = resolveProcurementOverviewPeriod(state, now)
  const dropped = new Set<string>(listCapabilityDrops(state).map((drop) => drop.key))
  const keep = <T>(key: keyof ProcurementHubState, value: T): T | undefined =>
    dropped.has(key) ? undefined : value
  return {
    grain: state.grain,
    q: state.q,
    authority_cui: state.authority_cui,
    supplier_cui: keep('supplier_cui', state.supplier_cui),
    cpv: state.cpv,
    cpv_division: state.cpv_division,
    cpv_group: state.cpv_group,
    cpv_class: state.cpv_class,
    cpv_category: state.cpv_category,
    source: state.source,
    status: state.status,
    value_state: state.value_state,
    record_kind: state.record_kind,
    year: state.year,
    dateFrom: resolved.isAllTime ? undefined : resolved.dateFrom,
    dateTo: resolved.isAllTime ? undefined : resolved.dateTo,
    valueMin: state.valueMin,
    valueMax: state.valueMax,
    signal: state.signal,
    sort: state.sort,
    page: state.page,
    pageSize: state.pageSize,
    from: state.from,
    highlight: state.highlight,
    buyerRegion: keep('buyerRegion', state.buyerRegion),
    buyerCounty: keep('buyerCounty', state.buyerCounty),
    buyerSiruta: keep('buyerSiruta', state.buyerSiruta),
    supplierRegion: keep('supplierRegion', state.supplierRegion),
    supplierCounty: keep('supplierCounty', state.supplierCounty),
    supplierSiruta: keep('supplierSiruta', state.supplierSiruta),
    // county/region legacy ignored for list
  }
}

/**
 * Analysis scope accepts a single status string. Rankings apply status only
 * when exactly one token is selected.
 */
export function rankingStatusFromHubState(
  state: ProcurementHubState,
): string | undefined {
  return state.status?.length === 1 ? state.status[0] : undefined
}

/**
 * Analysis scope accepts a single recordKind. Applied when exactly one UI
 * token is selected AND the hub grain carries the dimension: contracts
 * natively, modifications via the linked contract's record kind — the server
 * rejects recordKind on the other grains by design (the per-population scrub
 * drops it there).
 */
export function rankingRecordKindFromHubState(
  state: ProcurementHubState,
): 'contract_award' | 'framework_agreement' | undefined {
  if (state.grain !== 'contracts' && state.grain !== 'modifications') {
    return undefined
  }
  if (state.record_kind?.length !== 1) return undefined
  return state.record_kind[0] === 'purchases'
    ? 'contract_award'
    : 'framework_agreement'
}

/**
 * Shared aggregate/leaderboard scope from hub state (period, grain, geo,
 * parties, CPV hierarchy, single status, record kind, q + value bounds).
 * Unsupported list facets stay out.
 */
export function hubStateToRankingScopeInput(
  state: ProcurementHubState,
  now?: Date,
): {
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
} {
  const landing = hubStateToLandingFilters(state, now)
  const monthScope = buildProcurementOverviewMonthScope(landing)
  const grain =
    state.grain === 'contracts'
      ? ('contract' as const)
      : state.grain === 'direct_acquisitions'
        ? ('direct_acquisition' as const)
        : state.grain === 'procedures'
          ? ('procedure' as const)
          : undefined
  return {
    ...monthScope,
    authorityCui: state.authority_cui,
    supplierCui: state.supplier_cui,
    cpvCode: state.cpv,
    cpvDivision: state.cpv_division,
    cpvGroup: state.cpv_group,
    cpvClass: state.cpv_class,
    cpvCategory: state.cpv_category,
    buyerRegion: state.buyerRegion,
    buyerCounty: state.buyerCounty,
    buyerSiruta: state.buyerSiruta,
    supplierCounty: state.supplierCounty,
    supplierRegion: state.supplierRegion,
    supplierSiruta: state.supplierSiruta,
    grain,
    status: rankingStatusFromHubState(state),
    recordKind: rankingRecordKindFromHubState(state),
    q: state.q,
    valueMin: state.valueMin,
    valueMax: state.valueMax,
  }
}

export function hubGrainToAnalysisGrain(
  grain: ProcurementGrain,
): 'contract' | 'direct_acquisition' {
  return grain === 'contracts' ? 'contract' : 'direct_acquisition'
}

export function analysisGrainToHubGrain(
  grain: 'contract' | 'direct_acquisition',
): 'contracts' | 'direct_acquisitions' {
  return grain === 'contract' ? 'contracts' : 'direct_acquisitions'
}

// ---------------------------------------------------------------------------
// Value-basis plan (design v1.1) — the single derivation from (vbasis, grain)
// to the server population + measure + capability surface. Every view reads
// THIS instead of re-deriving rules, so the UI and the queries cannot drift.
// ---------------------------------------------------------------------------

export type ProcurementServerAnalysisGrain =
  | 'procedure'
  | 'contract'
  | 'direct_acquisition'
  | 'framework'
  | 'calloff'
  | 'modification'

export type ProcurementBasisValueMeasure =
  | 'valueAwardedSum'
  | 'valueEstimatedSum'
  | 'valueCeilingSum'
  | 'valueModAdjustedSum'

export type ProcurementValueBasisPlan = {
  readonly vbasis: ProcurementValueBasis
  /** The server population the analytics run on. */
  readonly analysisGrain: ProcurementServerAnalysisGrain
  /** Value measure for tiles + value series; null = counts-only population. */
  readonly valueMeasure: ProcurementBasisValueMeasure | null
  /** True only for the default state — the untouched awarded landing pipeline. */
  readonly usesLandingPipeline: boolean
  /**
   * Breakdown surface (rankings cards, leaderboards, map paint):
   *  - `anchor`: available; buckets carry the population's ANCHOR money
   *    (awarded for core grains, the call-off value for call-offs);
   *  - `counts-only`: available but with no money column (modifications);
   *  - `withheld`: not served (framework ceilings until repeat-cluster keys).
   */
  readonly breakdowns: 'anchor' | 'counts-only' | 'withheld'
  /** Supplier dimension exists (procedures + frameworks have none). */
  readonly supplierDimension: boolean
  /** CPV leaderboard levels beyond division (call-offs/mods carry division only). */
  readonly cpvBeyondDivision: boolean
  /** Concentration payload (distinct suppliers) is answerable. */
  readonly concentration: boolean
  /** Grain choices the overview/rankings toggle offers (empty = fixed). */
  readonly grainOptions: readonly ProcurementGrain[]
}

/** Hub grain → core server grain, with the legacy procedures→DA coercion off. */
function coreAnalysisGrain(
  grain: ProcurementGrain,
): 'procedure' | 'contract' | 'direct_acquisition' {
  if (grain === 'procedures') return 'procedure'
  return grain === 'contracts' ? 'contract' : 'direct_acquisition'
}

export function resolveProcurementValueBasisPlan(
  state: Pick<ProcurementHubState, 'vbasis' | 'grain'>,
): ProcurementValueBasisPlan {
  const vbasis = state.vbasis
  if (vbasis === 'ceiling') {
    return {
      vbasis,
      analysisGrain: 'framework',
      valueMeasure: 'valueCeilingSum',
      usesLandingPipeline: false,
      breakdowns: 'withheld',
      supplierDimension: false,
      cpvBeyondDivision: true,
      concentration: false,
      grainOptions: [],
    }
  }
  if (vbasis === 'calloff') {
    return {
      vbasis,
      analysisGrain: 'calloff',
      valueMeasure: 'valueAwardedSum',
      usesLandingPipeline: false,
      breakdowns: 'anchor',
      supplierDimension: true,
      cpvBeyondDivision: false,
      concentration: true,
      grainOptions: [],
    }
  }
  if (vbasis === 'mod_adjusted') {
    return {
      vbasis,
      analysisGrain: 'contract',
      valueMeasure: 'valueModAdjustedSum',
      usesLandingPipeline: false,
      breakdowns: 'anchor',
      supplierDimension: true,
      cpvBeyondDivision: true,
      concentration: true,
      grainOptions: ['contracts'],
    }
  }
  if (vbasis === 'estimated') {
    const analysisGrain = coreAnalysisGrain(
      state.grain === 'modifications' ? 'contracts' : state.grain,
    )
    return {
      vbasis,
      analysisGrain,
      valueMeasure: 'valueEstimatedSum',
      usesLandingPipeline: false,
      breakdowns: 'anchor',
      supplierDimension: analysisGrain !== 'procedure',
      cpvBeyondDivision: true,
      concentration: analysisGrain !== 'procedure',
      grainOptions: ['contracts', 'direct_acquisitions', 'procedures'],
    }
  }
  // awarded — the default pipeline, plus the counts-only modifications
  // population when that grain is selected.
  if (state.grain === 'modifications') {
    return {
      vbasis,
      analysisGrain: 'modification',
      valueMeasure: null,
      usesLandingPipeline: false,
      breakdowns: 'counts-only',
      supplierDimension: true,
      cpvBeyondDivision: false,
      concentration: false,
      grainOptions: ['contracts', 'direct_acquisitions', 'modifications'],
    }
  }
  return {
    vbasis,
    analysisGrain: coreAnalysisGrain(
      state.grain === 'procedures' ? 'direct_acquisitions' : state.grain,
    ),
    valueMeasure: 'valueAwardedSum',
    usesLandingPipeline: true,
    breakdowns: 'anchor',
    supplierDimension: true,
    cpvBeyondDivision: true,
    concentration: true,
    grainOptions: ['contracts', 'direct_acquisitions', 'modifications'],
  }
}

/**
 * Scope fields each value-basis population carries (server design v1.1) — a
 * field outside the set would REJECT the whole analysis query, so the builders
 * scrub it and the UI discloses the drop (never silently sent, never silently
 * kept). Core grains pass through untouched except procedures (no supplier).
 */
type BasisScopeInput = ReturnType<typeof hubStateToRankingScopeInput>

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

// ---------------------------------------------------------------------------
// Capability registry — ONE source for what each surface can honor.
//
// Everything downstream reads this: the query builders scrub with it, the UI
// discloses from it, and the developer matrix renders it. A capability that is
// "live" here but unwired there is the drift this registry exists to prevent.
// ---------------------------------------------------------------------------

/** `na` = structurally not applicable, not unfinished work. */
export type HubCapabilityStatus = 'live' | 'todo' | 'preview' | 'na'

export type HubCapabilityRow = {
  readonly id: string
  readonly label: string
  readonly overview: HubCapabilityStatus
  readonly list: HubCapabilityStatus
  readonly note?: string
}

export type HubCapability = HubCapabilityRow & {
  /** Hub state keys this capability carries. */
  readonly keys: readonly (keyof ProcurementHubState)[]
  /**
   * Grains whose RECORDS do not carry this dimension at all. The list drops
   * these keys there — and says so — instead of sending a filter the server
   * would reject or ignore.
   */
  readonly listUnsupportedGrains?: readonly ProcurementGrain[]
  /** Shown to the reader when the drop happens. */
  readonly dropReason?: string
}

/** A filter the active grain cannot honor on the record list. */
export type HubCapabilityDrop = {
  readonly key: keyof ProcurementHubState
  readonly capabilityId: string
  readonly label: string
  readonly reason: string
}

/**
 * Can the record list honor this capability for this grain? Drives control
 * state in the filter sheet (the reader is told BEFORE choosing), while
 * `listCapabilityDrops` explains an already-chosen filter that had to go.
 */
export function isListCapabilityAvailable(
  capabilityId: string,
  grain: ProcurementGrain,
): boolean {
  const capability = PROCUREMENT_HUB_CAPABILITIES.find((c) => c.id === capabilityId)
  if (capability === undefined) return false
  if (capability.list !== 'live') return false
  return !capability.listUnsupportedGrains?.includes(grain)
}

/**
 * Which of the current filters the record list must drop for this grain.
 * Used by `hubStateToListSearchState` (to scrub) and by the UI (to disclose) —
 * the same call, so a dropped filter is always an explained one.
 */
export function listCapabilityDrops(
  state: ProcurementHubState,
): readonly HubCapabilityDrop[] {
  const drops: HubCapabilityDrop[] = []
  for (const capability of PROCUREMENT_HUB_CAPABILITIES) {
    if (!capability.listUnsupportedGrains?.includes(state.grain)) continue
    for (const key of capability.keys) {
      if (state[key] === undefined) continue
      drops.push({
        key,
        capabilityId: capability.id,
        label: capability.label,
        reason: capability.dropReason ?? `not available on this record type`,
      })
    }
  }
  return drops
}

/**
 * The registry. `PROCUREMENT_HUB_CAPABILITY_MATRIX` below is a projection of
 * it — the developer panel cannot show a status the builders do not use.
 */
export const PROCUREMENT_HUB_CAPABILITIES: readonly HubCapability[] = [
  {
    id: 'period',
    label: 'Period',
    overview: 'live',
    list: 'live',
    keys: ['dateFrom', 'dateTo', 'period', 'year'],
  },
  {
    id: 'grain',
    label: 'Grain',
    overview: 'live',
    list: 'live',
    keys: ['grain'],
  },
  {
    id: 'buyer-geo',
    label: 'Buyer geography',
    overview: 'live',
    list: 'live',
    note: 'Region/county/UAT on aggregates (ClickHouse) and on the record list (search engine, 2026-07-25)',
    keys: ['buyerRegion', 'buyerCounty', 'buyerSiruta'],
    listUnsupportedGrains: ['modifications'],
    dropReason:
      'contract modifications are not in the search index — territory does not filter this list',
  },
  {
    id: 'supplier-geo',
    label: 'Supplier geography',
    overview: 'live',
    list: 'live',
    note: "Registered office of the awarded company; absent on procedures (a procedure predates its award)",
    keys: ['supplierRegion', 'supplierCounty', 'supplierSiruta'],
    listUnsupportedGrains: ['procedures', 'modifications'],
    dropReason: 'these records carry no awarded supplier, so supplier territory cannot apply',
  },
  {
    id: 'parties-cpv-value',
    label: 'Parties / CPV / value facets',
    overview: 'live',
    list: 'live',
    note: 'Parties/CPV/value bounds scope overview cards + map + rankings (C1 closed 2026-07-24; scope-fixed cards hide); CPV group/class/category reach the list too (2026-07-25); value QUALITY stays list-only',
    keys: ['authority_cui', 'cpv', 'cpv_division', 'cpv_group', 'cpv_class', 'cpv_category'],
  },
  {
    id: 'supplier-party',
    label: 'Supplier filter',
    overview: 'live',
    list: 'live',
    keys: ['supplier_cui'],
    listUnsupportedGrains: ['procedures'],
    dropReason: 'a procedure predates its award and names no supplier',
  },
  {
    id: 'buyer-map',
    label: 'Buyer geography map',
    overview: 'live',
    list: 'live',
    note: 'Region+county+UAT paint (ClickHouse); the clicked territory now filters the record list too',
    keys: [],
  },
  {
    id: 'list-facets',
    label: 'Result-set facet counts',
    overview: 'na',
    list: 'live',
    note: 'Counts of the CURRENT result set per filter option (search engine aggregations) — never authoritative analytics',
    keys: [],
  },
  {
    id: 'list-freshness',
    label: 'List freshness disclosure',
    overview: 'na',
    list: 'live',
    note: 'Engine-served pages carry the index build stamp; the reader sees "as of"',
    keys: [],
  },
  {
    id: 'rankings',
    label: 'Rankings leaderboard',
    overview: 'live',
    list: 'live',
    note: 'view=rankings; top-100 + count/value sort (ClickHouse); CPV division→group→class→category→code levels; client pagination',
    keys: ['rankDim', 'cpvLevel', 'rankBy', 'rankPage', 'rankPageSize'],
  },
  {
    id: 'q-aggregates',
    label: 'Text query on aggregates',
    overview: 'live',
    list: 'live',
    note: 'q scopes overview + rankings as a title row filter (server 2026-07-24); on the list it is full-text relevance search (Romanian analyzer)',
    keys: ['q'],
  },
  {
    id: 'shared-sheet',
    label: 'Shared filter sheet',
    overview: 'live',
    list: 'live',
    note: 'One registry drives the sheet, the queries and this matrix',
    keys: [],
  },
  {
    id: 'value-basis',
    label: 'Value logic (vbasis)',
    overview: 'live',
    list: 'na',
    note: 'awarded | estimated | ceiling (stats+series only; rankings withheld) | calloff (own population) | mod_adjusted (contracts). List records keep their own values — vbasis is analytics-only, by design.',
    keys: ['vbasis'],
  },
  {
    id: 'modifications-analytics',
    label: 'Modifications analytics (counts-only)',
    overview: 'live',
    list: 'live',
    note: 'grain=modifications: counts + breakdowns, no money (raw deltas are quality-relabeled); ~48.5% undated disclosed by the server envelope.',
    keys: [],
  },
]

/**
 * The developer matrix (F3 panel) — a projection of the registry above, so a
 * row can never claim a capability the builders do not actually apply.
 */
export const PROCUREMENT_HUB_CAPABILITY_MATRIX: readonly HubCapabilityRow[] =
  PROCUREMENT_HUB_CAPABILITIES.map(({ id, label, overview, list, note }) => ({
    id,
    label,
    overview,
    list,
    ...(note !== undefined && { note }),
  }))

export function isProcurementHubDevPanelEnabled(): boolean {
  if (import.meta.env.DEV) return true
  return import.meta.env.VITE_PROCUREMENT_DEV_PANEL === 'true'
}

export type ReviewSignalKindValue = ReviewSignalKind
