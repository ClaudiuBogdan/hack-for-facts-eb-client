/**
 * Build GraphQL filter-input objects from the UI's `ProcurementSearchState`.
 *
 * Pure functions (search state in, filter object out) so they are
 * unit-testable without a network — mirrors parliament's `buildVotesFilter`
 * convention: empty/`all` selections are dropped (omitted keys = no
 * constraint), and no raw/unknown token is ever forwarded to the server.
 *
 * The GraphQL contract lives in docs/design/procurement/graphql-api-spec.md;
 * per-grain vocabularies come from docs/procurement-prod-schema-reference.md.
 */
import type { ProcurementStatus } from '@/schemas/procurement'
import type {
  ProcurementQMode,
  ProcurementSearchState,
  ProcurementSort,
} from '@/schemas/procurement-search'
import { procurementQOrUndefined } from '../../lib/search-query'
import {
  buildDateRange,
  resolveDirectAcquisitionWindow,
  type DateRangeInput,
} from '../../lib/search-dates'
import { expandRecordKinds } from '../../lib/record-kind'
import { expandValueCategories } from '../../lib/value-category'

// ---------------------------------------------------------------------------
// Operator-input shapes (mirror the SDL)
// ---------------------------------------------------------------------------

export type { DateRangeInput }

export interface DecimalRangeInput {
  gte?: string
  lte?: string
}

export interface ProcurementProceduresFilterInput {
  q?: { contains: string }
  /** How `q` is read; engine-served grains only. */
  qMode?: ProcurementQMode
  authorityCui?: { eq: string }
  cpvDivision?: { eq: string }
  cpvCode?: { eq: string }
  cpvGroup?: { eq: string }
  cpvClass?: { eq: string }
  cpvCategory?: { eq: string }
  buyerRegion?: { eq: string }
  buyerCounty?: { eq: string }
  buyerSiruta?: { eq: string }
  sourceSystem?: { in: string[] }
  status?: { in: string[] }
  publicationDate?: DateRangeInput
  valueRon?: DecimalRangeInput
  valueState?: { in: string[] }
}

export interface ProcurementContractsFilterInput {
  q?: { contains: string }
  /** How `q` is read; engine-served grains only. */
  qMode?: ProcurementQMode
  authorityCui?: { eq: string }
  supplierCui?: { eq: string }
  cpvDivision?: { eq: string }
  cpvCode?: { eq: string }
  cpvGroup?: { eq: string }
  cpvClass?: { eq: string }
  cpvCategory?: { eq: string }
  buyerRegion?: { eq: string }
  buyerCounty?: { eq: string }
  buyerSiruta?: { eq: string }
  supplierRegion?: { eq: string }
  supplierCounty?: { eq: string }
  supplierSiruta?: { eq: string }
  sourceSystem?: { in: string[] }
  status?: { in: string[] }
  contractDate?: DateRangeInput
  valueRon?: DecimalRangeInput
  valueState?: { in: string[] }
  recordKind?: { in: string[] }
}

export interface ProcurementDirectAcquisitionsFilterInput {
  q?: { contains: string }
  /** How `q` is read; engine-served grains only. */
  qMode?: ProcurementQMode
  authorityCui?: { eq: string }
  supplierCui?: { eq: string }
  cpvDivision?: { eq: string }
  cpvCode?: { eq: string }
  cpvGroup?: { eq: string }
  cpvClass?: { eq: string }
  cpvCategory?: { eq: string }
  buyerRegion?: { eq: string }
  buyerCounty?: { eq: string }
  buyerSiruta?: { eq: string }
  supplierRegion?: { eq: string }
  supplierCounty?: { eq: string }
  supplierSiruta?: { eq: string }
  sourceSystem?: { in: string[] }
  status?: { in: string[] }
  publicationDate?: DateRangeInput
  valueRon?: DecimalRangeInput
  valueState?: { in: string[] }
}

export interface ProcurementModificationsFilterInput {
  q?: { contains: string }
  authorityCui?: { eq: string }
  supplierCui?: { eq: string }
  /** An amendment inherits its contract's buyer, so it carries buyer territory. */
  buyerRegion?: { eq: string }
  buyerCounty?: { eq: string }
  buyerSiruta?: { eq: string }
  modificationDate?: DateRangeInput
}

export interface ProcurementScopeFilterInput {
  authorityCui?: string
  supplierCui?: string
  cpvDivision?: string
  /** Canonical 8-digit CPV level codes (group/class/category, 2026-07-24). */
  cpvGroup?: string
  cpvClass?: string
  cpvCategory?: string
  cpvCode?: string
  buyerCounty?: string
  buyerRegion?: string
  /** Served by the ClickHouse analytics backend (dev, 2026-07-22). */
  buyerSiruta?: string
  supplierCounty?: string
  supplierRegion?: string
  /** Supplier registered-office UAT (ClickHouse facts). */
  supplierSiruta?: string
  status?: string
  procedureType?: string
  /** Contract grain only (modifications expose the linked contract's kind). */
  recordKind?: string
  /** framework / calloff / modification are explicit-only populations (v1.1). */
  grain?:
    | 'procedure'
    | 'contract'
    | 'direct_acquisition'
    | 'framework'
    | 'calloff'
    | 'modification'
  from?: string
  to?: string
  year?: number
  /** Row filters — free-text title q + awarded-value bounds (RON). */
  q?: string
  valueMin?: number
  valueMax?: number
}

// ---------------------------------------------------------------------------
// Vocabulary maps (per-grain source systems + statuses)
// ---------------------------------------------------------------------------

export type FlowGrainKey = 'procedures' | 'contracts' | 'direct_acquisitions'

/**
 * The coarse UI `source` facet expands to the grain's prod source-system
 * tokens. Tokens invalid for a grain are never sent (the DB would simply
 * return nothing, but the omission keeps the query honest and index-friendly).
 */
const SOURCE_SYSTEMS_BY_GRAIN: Readonly<
  Record<FlowGrainKey, Readonly<Record<'seap' | 'elicitatie', readonly string[]>>>
> = {
  procedures: {
    seap: ['seap_notice'],
    elicitatie: ['elicitatie'],
  },
  contracts: {
    seap: ['seap_contracts'],
    elicitatie: ['elicitatie_ca_award'],
  },
  direct_acquisitions: {
    seap: ['seap_da', 'seap_dan'],
    elicitatie: ['elicitatie_da'],
  },
}

/**
 * Per-grain status vocabulary — statuses outside the grain's vocabulary are
 * dropped rather than forwarded (a multi-grain URL like
 * `?status=awarded,finalized` keeps only the tokens each grain understands).
 */
const STATUSES_BY_GRAIN: Readonly<Record<FlowGrainKey, readonly ProcurementStatus[]>> = {
  procedures: [
    'published',
    'in_evaluation',
    'awarded',
    'cancelled',
    'suspended',
    'unknown',
  ],
  contracts: ['awarded', 'in_progress', 'closed', 'cancelled', 'unknown'],
  direct_acquisitions: [
    'offered',
    'awarded',
    'finalized',
    'cancelled',
    'unknown',
  ],
}

/**
 * Statuses omitted from an *unfiltered* grain listing. Selecting the status
 * explicitly still returns them — this is a default, not a suppression; the
 * records stay in the DB, in the API and reachable by direct link.
 *
 * Only DAs have one. On e-licitatie a direct acquisition ends in one of five
 * terminal states, and four of them (`Conditii refuzate`, `Conditii
 * neacceptate la termen`, `Oferta refuzata`, `Oferta neacceptata in termen`)
 * mean the purchase did NOT happen — 1,006,114 canonical rows carrying
 * 262.32B RON of non-spend, measured 2026-07-21. They are legitimate public
 * records of a refused offer, but listing them beside concluded purchases
 * reads as if the money moved. The data layer already excludes `cancelled`
 * from flows, rollups and analysis facts; this aligns the record list with
 * those aggregates.
 *
 * Deliberately NOT applied to procedures/contracts: a cancelled tender is
 * itself newsworthy and belongs in the default list.
 */
const DEFAULT_HIDDEN_STATUSES_BY_GRAIN: Readonly<
  Record<FlowGrainKey, readonly ProcurementStatus[]>
> = {
  procedures: [],
  contracts: [],
  direct_acquisitions: ['cancelled'],
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/** UI numeric value bounds → RON decimal strings for the server. */
function buildValueRange(search: ProcurementSearchState): DecimalRangeInput | undefined {
  const range: DecimalRangeInput = {}
  if (search.valueMin !== undefined) range.gte = search.valueMin.toFixed(2)
  if (search.valueMax !== undefined) range.lte = search.valueMax.toFixed(2)
  return range.gte || range.lte ? range : undefined
}

function buildSourceSystems(
  search: ProcurementSearchState,
  grain: FlowGrainKey,
): string[] | undefined {
  if (!search.source) return undefined
  const systems = SOURCE_SYSTEMS_BY_GRAIN[grain][search.source]
  return systems.length > 0 ? [...systems] : undefined
}

/**
 * Resolve the status constraint for a grain, together with what that constraint
 * silently hides. ONE function on purpose: the query and its disclosure must
 * never disagree, and two copies of the same guard is exactly how they drift.
 *
 * Note the ordering — validation happens BEFORE the "did the user choose?"
 * test. `procurementStatusSchema` is the union across all three grains, so a
 * hand-edited or stale URL can carry a status that is syntactically valid but
 * meaningless here (`?grain=direct_acquisitions&status=in_progress`). Treating
 * that as an explicit choice would filter it to an empty list and fall through
 * to *no constraint at all*, handing back every refused DA with no notice. An
 * empty-after-validation selection is not a choice; it takes the default.
 */
function resolveStatuses(
  search: ProcurementSearchState,
  grain: FlowGrainKey,
): {
  readonly applied: string[] | undefined
  readonly hiddenByDefault: readonly ProcurementStatus[]
} {
  const vocabulary = STATUSES_BY_GRAIN[grain]
  const chosen = (search.status ?? []).filter((status) =>
    vocabulary.includes(status),
  )
  // A real selection is authoritative — including one that asks for a
  // default-hidden status, which is how the user opts back in.
  if (chosen.length > 0) return { applied: chosen, hiddenByDefault: [] }

  const hidden = DEFAULT_HIDDEN_STATUSES_BY_GRAIN[grain]
  if (hidden.length === 0) return { applied: undefined, hiddenByDefault: [] }
  // The server has no `notIn` op on `status`, so the exclusion is sent as its
  // complement — the grain's vocabulary minus the hidden tokens.
  return {
    applied: vocabulary.filter((status) => !hidden.includes(status)),
    hiddenByDefault: hidden,
  }
}

function buildStatuses(
  search: ProcurementSearchState,
  grain: FlowGrainKey,
): string[] | undefined {
  return resolveStatuses(search, grain).applied
}

/**
 * The statuses this search is silently dropping, for disclosure in the UI.
 * A hidden slice the reader cannot see is a silent cap —
 * `ProcurementDaWindowNotice` surfaces this.
 */
export function statusesHiddenByDefault(
  search: ProcurementSearchState,
  grain: FlowGrainKey,
): readonly ProcurementStatus[] {
  return resolveStatuses(search, grain).hiddenByDefault
}

/**
 * The default-hidden statuses the user has explicitly asked back in. Non-empty
 * only on the opt-in path, which needs its own disclosure: the server's
 * aggregates (flows, rollups, analysis facts) exclude `cancelled` at the data
 * layer, so a list that includes refused DAs cannot be reconciled with the
 * totals and charts around it. Saying so is the difference between a reader
 * seeing 262B of refusals and a reader believing it was spent.
 */
export function statusesIncludedByRequest(
  search: ProcurementSearchState,
  grain: FlowGrainKey,
): readonly ProcurementStatus[] {
  const { applied, hiddenByDefault } = resolveStatuses(search, grain)
  if (applied === undefined || hiddenByDefault.length > 0) return []
  return DEFAULT_HIDDEN_STATUSES_BY_GRAIN[grain].filter((status) =>
    applied.includes(status),
  )
}

function trimmedOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * CPV facets — the FINEST provided level wins and exactly one field is sent:
 * exact code > category > class > group > division. Mirrors `buildScopeFilter`
 * so the record list and the aggregates scope to the same rows; the server
 * compiles a level code to a `cpv_code` prefix at that level's digit length.
 */
function applyCpv<
  T extends {
    cpvDivision?: { eq: string }
    cpvCode?: { eq: string }
    cpvGroup?: { eq: string }
    cpvClass?: { eq: string }
    cpvCategory?: { eq: string }
  },
>(filter: T, search: ProcurementSearchState): void {
  const cpv = trimmedOrUndefined(search.cpv)
  const category = trimmedOrUndefined(search.cpv_category)
  const cpvClass = trimmedOrUndefined(search.cpv_class)
  const group = trimmedOrUndefined(search.cpv_group)
  const division = trimmedOrUndefined(search.cpv_division)
  if (cpv) {
    filter.cpvCode = { eq: cpv }
  } else if (category) {
    filter.cpvCategory = { eq: category }
  } else if (cpvClass) {
    filter.cpvClass = { eq: cpvClass }
  } else if (group) {
    filter.cpvGroup = { eq: group }
  } else if (division) {
    filter.cpvDivision = { eq: division }
  }
}

/**
 * Party geography. Each side sends its FINEST level only — the levels nest, so
 * sending both a county and its region would be redundant, and sending a
 * contradictory pair would silently return nothing.
 *
 * `supplier: false` (procedures) omits the supplier side entirely: a procedure
 * predates its award and the server REJECTS supplier geography there. The hub
 * capability registry keeps the control off that grain, so this is a guard,
 * not the disclosure path.
 */
function applyGeography<
  T extends {
    buyerRegion?: { eq: string }
    buyerCounty?: { eq: string }
    buyerSiruta?: { eq: string }
    supplierRegion?: { eq: string }
    supplierCounty?: { eq: string }
    supplierSiruta?: { eq: string }
  },
>(filter: T, search: ProcurementSearchState, options: { supplier: boolean }): void {
  const buyerSiruta = trimmedOrUndefined(search.buyerSiruta)
  const buyerCounty = trimmedOrUndefined(search.buyerCounty)
  const buyerRegion = trimmedOrUndefined(search.buyerRegion)
  if (buyerSiruta) {
    filter.buyerSiruta = { eq: buyerSiruta }
  } else if (buyerCounty) {
    filter.buyerCounty = { eq: buyerCounty }
  } else if (buyerRegion) {
    filter.buyerRegion = { eq: buyerRegion }
  }
  if (!options.supplier) return
  const supplierSiruta = trimmedOrUndefined(search.supplierSiruta)
  const supplierCounty = trimmedOrUndefined(search.supplierCounty)
  const supplierRegion = trimmedOrUndefined(search.supplierRegion)
  if (supplierSiruta) {
    filter.supplierSiruta = { eq: supplierSiruta }
  } else if (supplierCounty) {
    filter.supplierCounty = { eq: supplierCounty }
  } else if (supplierRegion) {
    filter.supplierRegion = { eq: supplierRegion }
  }
}

// NOTE: `county` / `region` are LEGACY reserved URL params (the pre-hub
// buyer-territory attempt). Territory now travels as `buyerRegion` /
// `buyerCounty` / `buyerSiruta`; the legacy pair is still parsed so old deep
// links do not error, and is never forwarded.

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function buildProceduresFilter(
  search: ProcurementSearchState,
): ProcurementProceduresFilterInput {
  const filter: ProcurementProceduresFilterInput = {}
  const q = procurementQOrUndefined(search.q)
  if (q) {
    filter.q = { contains: q }
    if (search.qmode !== undefined) filter.qMode = search.qmode
  }
  const authorityCui = trimmedOrUndefined(search.authority_cui)
  if (authorityCui) filter.authorityCui = { eq: authorityCui }
  applyCpv(filter, search)
  applyGeography(filter, search, { supplier: false })
  const sourceSystem = buildSourceSystems(search, 'procedures')
  if (sourceSystem) filter.sourceSystem = { in: sourceSystem }
  const status = buildStatuses(search, 'procedures')
  if (status) filter.status = { in: status }
  const dates = buildDateRange(search)
  if (dates) filter.publicationDate = dates
  const value = buildValueRange(search)
  if (value) filter.valueRon = value
  const valueState = expandValueCategories(search.value_state ?? [])
  if (valueState) filter.valueState = { in: valueState }
  return filter
}

export function buildContractsFilter(
  search: ProcurementSearchState,
): ProcurementContractsFilterInput {
  const filter: ProcurementContractsFilterInput = {}
  const q = procurementQOrUndefined(search.q)
  if (q) {
    filter.q = { contains: q }
    if (search.qmode !== undefined) filter.qMode = search.qmode
  }
  const authorityCui = trimmedOrUndefined(search.authority_cui)
  if (authorityCui) filter.authorityCui = { eq: authorityCui }
  const supplierCui = trimmedOrUndefined(search.supplier_cui)
  if (supplierCui) filter.supplierCui = { eq: supplierCui }
  applyCpv(filter, search)
  applyGeography(filter, search, { supplier: true })
  const sourceSystem = buildSourceSystems(search, 'contracts')
  if (sourceSystem) filter.sourceSystem = { in: sourceSystem }
  const status = buildStatuses(search, 'contracts')
  if (status) filter.status = { in: status }
  const dates = buildDateRange(search)
  if (dates) filter.contractDate = dates
  const value = buildValueRange(search)
  if (value) filter.valueRon = value
  const valueState = expandValueCategories(search.value_state ?? [])
  if (valueState) filter.valueState = { in: valueState }
  // Record kind is a contracts-only server filter (frameworks vs purchases).
  const recordKind = expandRecordKinds(search.record_kind ?? [])
  if (recordKind) filter.recordKind = { in: recordKind }
  return filter
}

/**
 * DAs are the one grain the server refuses to search unbounded: without a party
 * CUI it demands a fully-bounded ≤ 366-day date window, so the builder
 * always sends one (see `lib/search-dates.ts`). The UI discloses the applied
 * window via `resolveDirectAcquisitionWindow().adjustment`.
 */
export function buildDirectAcquisitionsFilter(
  search: ProcurementSearchState,
): ProcurementDirectAcquisitionsFilterInput {
  const filter: ProcurementDirectAcquisitionsFilterInput = {}
  const q = procurementQOrUndefined(search.q)
  if (q) {
    filter.q = { contains: q }
    if (search.qmode !== undefined) filter.qMode = search.qmode
  }
  const authorityCui = trimmedOrUndefined(search.authority_cui)
  if (authorityCui) filter.authorityCui = { eq: authorityCui }
  const supplierCui = trimmedOrUndefined(search.supplier_cui)
  if (supplierCui) filter.supplierCui = { eq: supplierCui }
  applyCpv(filter, search)
  applyGeography(filter, search, { supplier: true })
  const sourceSystem = buildSourceSystems(search, 'direct_acquisitions')
  if (sourceSystem) filter.sourceSystem = { in: sourceSystem }
  const status = buildStatuses(search, 'direct_acquisitions')
  if (status) filter.status = { in: status }
  const dates = resolveDirectAcquisitionWindow(search).range
  if (dates) filter.publicationDate = dates
  const value = buildValueRange(search)
  if (value) filter.valueRon = value
  const valueState = expandValueCategories(search.value_state ?? [])
  if (valueState) filter.valueState = { in: valueState }
  return filter
}

/**
 * Modifications have no status/source/CPV columns — only party, date and the
 * linked flag are filterable (value bounds intentionally not supported: the
 * meaningful figure is the delta and the server has no delta-range filter).
 */
export function buildModificationsFilter(
  search: ProcurementSearchState,
): ProcurementModificationsFilterInput {
  const filter: ProcurementModificationsFilterInput = {}
  const q = procurementQOrUndefined(search.q)
  if (q) filter.q = { contains: q }
  const authorityCui = trimmedOrUndefined(search.authority_cui)
  if (authorityCui) filter.authorityCui = { eq: authorityCui }
  const supplierCui = trimmedOrUndefined(search.supplier_cui)
  if (supplierCui) filter.supplierCui = { eq: supplierCui }
  // Buyer territory only: the supplier side needs the search index, which this
  // grain has no part of.
  applyGeography(filter, search, { supplier: false })
  const dates = buildDateRange(search)
  if (dates) filter.modificationDate = dates
  return filter
}

export function buildProcurementSort(
  search: ProcurementSearchState,
): ProcurementSort {
  switch (search.sort) {
    case 'date_asc':
    case 'value_desc':
    case 'value_asc':
      return search.sort
    // BM25, and only ever with a query to rank against — the hub scrubs it back
    // to the default otherwise. Listing it here is what stops "Best match" from
    // falling through to the default and quietly serving newest-first.
    // The VALIDATED query, not raw truthiness: a two-character `q` is dropped
    // from the filter, so `search.q` is truthy while the request carries no
    // query at all — and the server rejects relevance without one.
    case 'relevance':
      return procurementQOrUndefined(search.q) !== undefined ? 'relevance' : 'date_desc'
    case 'date_desc':
    default:
      return 'date_desc'
  }
}

/** Scope filter for the shared aggregate queries (landing/CPV/supplier/map drawer). */
export function buildScopeFilter(scope: {
  authorityCui?: string
  supplierCui?: string
  cpvDivision?: string
  cpvGroup?: string
  cpvClass?: string
  cpvCategory?: string
  cpvCode?: string
  monthFrom?: string
  monthTo?: string
  buyerRegion?: string
  buyerCounty?: string
  buyerSiruta?: string
  supplierCounty?: string
  supplierRegion?: string
  supplierSiruta?: string
  grain?: ProcurementScopeFilterInput['grain']
  /** Single status token — analysis scope has no `in` operator. */
  status?: string
  /** Single record-kind token (contract grain only). */
  recordKind?: string
  q?: string
  valueMin?: number
  valueMax?: number
}): ProcurementScopeFilterInput {
  const filter: ProcurementScopeFilterInput = {}
  const authorityCui = trimmedOrUndefined(scope.authorityCui)
  if (authorityCui) filter.authorityCui = authorityCui
  const supplierCui = trimmedOrUndefined(scope.supplierCui)
  if (supplierCui) filter.supplierCui = supplierCui
  // CPV hierarchy: the FINEST provided level wins; the server enforces
  // at-most-one-level, so exactly one field is ever emitted.
  const cpvCode = trimmedOrUndefined(scope.cpvCode)
  const cpvCategory = trimmedOrUndefined(scope.cpvCategory)
  const cpvClass = trimmedOrUndefined(scope.cpvClass)
  const cpvGroup = trimmedOrUndefined(scope.cpvGroup)
  const cpvDivision = trimmedOrUndefined(scope.cpvDivision)
  if (cpvCode) {
    filter.cpvCode = cpvCode
  } else if (cpvCategory) {
    filter.cpvCategory = cpvCategory
  } else if (cpvClass) {
    filter.cpvClass = cpvClass
  } else if (cpvGroup) {
    filter.cpvGroup = cpvGroup
  } else if (cpvDivision) {
    filter.cpvDivision = cpvDivision
  }
  const monthFrom = trimmedOrUndefined(scope.monthFrom)
  if (monthFrom) filter.from = monthFrom
  const monthTo = trimmedOrUndefined(scope.monthTo)
  if (monthTo) filter.to = monthTo
  const buyerRegion = trimmedOrUndefined(scope.buyerRegion)
  if (buyerRegion) filter.buyerRegion = buyerRegion
  // buyerCounty / buyerSiruta: served natively by the ClickHouse analytics
  // backend (dev, 2026-07-22) — no region approximation.
  const buyerCounty = trimmedOrUndefined(scope.buyerCounty)
  if (buyerCounty) filter.buyerCounty = buyerCounty
  const buyerSiruta = trimmedOrUndefined(scope.buyerSiruta)
  if (buyerSiruta) filter.buyerSiruta = buyerSiruta
  // Supplier geography: served by the ClickHouse analytics backend on the
  // analysis scope, and by the search engine on the record list (2026-07-25)
  // — both resolve it from the same registered-office territory resolution.
  const supplierCounty = trimmedOrUndefined(scope.supplierCounty)
  if (supplierCounty) filter.supplierCounty = supplierCounty
  const supplierRegion = trimmedOrUndefined(scope.supplierRegion)
  if (supplierRegion) filter.supplierRegion = supplierRegion
  const supplierSiruta = trimmedOrUndefined(scope.supplierSiruta)
  if (supplierSiruta) filter.supplierSiruta = supplierSiruta
  if (scope.grain) filter.grain = scope.grain
  const status = trimmedOrUndefined(scope.status)
  if (status) filter.status = status
  const recordKind = trimmedOrUndefined(scope.recordKind)
  if (recordKind) filter.recordKind = recordKind
  // Row filters (2026-07-24): q + value bounds reshape every aggregate figure;
  // the server surfaces matching caveats in the answer envelope. Bounds are
  // normalized to whole bani (server rejects sub-bani decimals) and an
  // inverted range is omitted entirely (mid-edit state; an impossible range
  // must not fail whole analytics views with the named rejection).
  const q = trimmedOrUndefined(scope.q)
  if (q && q.length >= 3) filter.q = q
  const toBaniExact = (value: number | undefined): number | undefined => {
    if (value === undefined || !Number.isFinite(value) || value < 0) return undefined
    return Math.round(value * 100) / 100
  }
  const valueMin = toBaniExact(scope.valueMin)
  const valueMax = toBaniExact(scope.valueMax)
  if (valueMin === undefined || valueMax === undefined || valueMin <= valueMax) {
    if (valueMin !== undefined) filter.valueMin = valueMin
    if (valueMax !== undefined) filter.valueMax = valueMax
  }
  return filter
}
