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
  procurementSortSchema,
  procurementSourceSchema,
  procurementValueCategorySchema,
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

/** CPV leaderboard grain — division default + code toggle. */
export const procurementCpvLevelSchema = z.enum(['division', 'code'])
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
    source: procurementSourceSchema.optional().catch(undefined),
    status: commaListStatus.optional(),
    value_state: commaListValueCategory.optional(),
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
  source?: ProcurementSource
  status?: ProcurementStatus[]
  value_state?: ProcurementValueCategory[]
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

/** Keys that apply to list queries but not overview aggregates (C1). */
export const PROCUREMENT_HUB_LIST_ONLY_KEYS = [
  'q',
  'authority_cui',
  'supplier_cui',
  'cpv',
  'cpv_division',
  'source',
  'status',
  'value_state',
  'valueMin',
  'valueMax',
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
 * TODO(Search geography API): buyer/supplier territory is not an authoritative
 * list filter yet. Keep in URL for round-trip; do not send to GraphQL list
 * filters (product B1).
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
  return {
    ...rest,
    view: search.view ?? viewFromTab ?? PROCUREMENT_HUB_DEFAULTS.view,
    grain: search.grain ?? PROCUREMENT_HUB_DEFAULTS.grain,
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

  const withDates: ProcurementHubSearch = {
    ...parsed,
    ...(normalizedFrom ? { dateFrom: normalizedFrom } : { dateFrom: undefined }),
    ...(normalizedTo ? { dateTo: normalizedTo } : { dateTo: undefined }),
    ...(parsed.period === 'all' ? { period: 'all' as const } : {}),
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
 * List/search API state from hub — period resolved into dates; geography
 * intentionally omitted (B1 / TODO Search geography API).
 */
export function hubStateToListSearchState(
  state: ProcurementHubState,
  now?: Date,
): import('./procurement-search').ProcurementSearchState {
  const resolved = resolveProcurementOverviewPeriod(state, now)
  return {
    grain: state.grain,
    q: state.q,
    authority_cui: state.authority_cui,
    supplier_cui: state.supplier_cui,
    cpv: state.cpv,
    cpv_division: state.cpv_division,
    source: state.source,
    status: state.status,
    value_state: state.value_state,
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
 * Shared aggregate/leaderboard scope from hub state (period, grain, geo,
 * parties, CPV, single status). Unsupported list facets stay out.
 */
export function hubStateToRankingScopeInput(
  state: ProcurementHubState,
  now?: Date,
): {
  readonly authorityCui?: string
  readonly supplierCui?: string
  readonly cpvDivision?: string
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
    buyerRegion: state.buyerRegion,
    buyerCounty: state.buyerCounty,
    buyerSiruta: state.buyerSiruta,
    supplierCounty: state.supplierCounty,
    supplierRegion: state.supplierRegion,
    supplierSiruta: state.supplierSiruta,
    grain,
    status: rankingStatusFromHubState(state),
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

export type HubCapabilityStatus = 'live' | 'todo' | 'preview'

export type HubCapabilityRow = {
  readonly id: string
  readonly label: string
  readonly overview: HubCapabilityStatus
  readonly list: HubCapabilityStatus
  readonly note?: string
}

/**
 * Developer matrix for F3 panel. Update when APIs land.
 * TODO(shared filter sheet): rows stay until matrix is fully green.
 */
export const PROCUREMENT_HUB_CAPABILITY_MATRIX: readonly HubCapabilityRow[] = [
  {
    id: 'period',
    label: 'Period',
    overview: 'live',
    list: 'live',
  },
  {
    id: 'grain',
    label: 'Grain',
    overview: 'live',
    list: 'live',
  },
  {
    id: 'buyer-geo',
    label: 'Buyer geography',
    overview: 'live',
    list: 'todo',
    note: 'TODO(Search geography API): not applied to record list',
  },
  {
    id: 'supplier-geo',
    label: 'Supplier geography',
    overview: 'live',
    list: 'todo',
    note: 'Overview/rankings scope supplier region+county (ClickHouse); TODO(list filter)',
  },
  {
    id: 'parties-cpv-value',
    label: 'Parties / CPV / value facets',
    overview: 'preview',
    list: 'live',
    note: 'List-only on overview (C1 inactive chips)',
  },
  {
    id: 'buyer-map',
    label: 'Buyer geography map',
    overview: 'preview',
    list: 'todo',
    note: 'Region+county paint live (ClickHouse); UAT paint blocked on geometry layer',
  },
  {
    id: 'rankings',
    label: 'Rankings leaderboard',
    overview: 'live',
    list: 'live',
    note: 'view=rankings; top-100 + count/value sort (ClickHouse); client pagination',
  },
  {
    id: 'q-aggregates',
    label: 'Text query on aggregates',
    overview: 'todo',
    list: 'live',
    note: 'TODO(API): q does not scope overview yet',
  },
  {
    id: 'shared-sheet',
    label: 'Shared filter sheet',
    overview: 'live',
    list: 'live',
    note: 'D3 — unfinished controls marked Preview',
  },
]

export function isProcurementHubDevPanelEnabled(): boolean {
  if (import.meta.env.DEV) return true
  return import.meta.env.VITE_PROCUREMENT_DEV_PANEL === 'true'
}

export type ReviewSignalKindValue = ReviewSignalKind
