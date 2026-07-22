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
  ProcurementSearchState,
  ProcurementSort,
} from '@/schemas/procurement-search'
import { procurementQOrUndefined } from '../../lib/search-query'
import {
  buildDateRange,
  resolveDirectAcquisitionWindow,
  type DateRangeInput,
} from '../../lib/search-dates'
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
  authorityCui?: { eq: string }
  cpvDivision?: { eq: string }
  cpvCode?: { eq: string }
  sourceSystem?: { in: string[] }
  status?: { in: string[] }
  publicationDate?: DateRangeInput
  valueRon?: DecimalRangeInput
  valueState?: { in: string[] }
}

export interface ProcurementContractsFilterInput {
  q?: { contains: string }
  authorityCui?: { eq: string }
  supplierCui?: { eq: string }
  cpvDivision?: { eq: string }
  cpvCode?: { eq: string }
  sourceSystem?: { in: string[] }
  status?: { in: string[] }
  contractDate?: DateRangeInput
  valueRon?: DecimalRangeInput
  valueState?: { in: string[] }
}

export interface ProcurementDirectAcquisitionsFilterInput {
  q?: { contains: string }
  authorityCui?: { eq: string }
  supplierCui?: { eq: string }
  cpvDivision?: { eq: string }
  cpvCode?: { eq: string }
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
  modificationDate?: DateRangeInput
}

export interface ProcurementScopeFilterInput {
  authorityCui?: string
  supplierCui?: string
  cpvDivision?: string
  cpvCode?: string
  buyerCounty?: string
  buyerRegion?: string
  /**
   * TODO(API buyer_siruta scope): accept buyerSiruta on ProcurementAnalysisScopeInput
   * so UAT map drawer / hub filters can scope aggregates natively. Client already
   * sends this from ProcurementTerritoryDrawer (mapGrain=uat).
   */
  buyerSiruta?: string
  supplierCounty?: string
  supplierRegion?: string
  status?: string
  procedureType?: string
  grain?: 'procedure' | 'contract' | 'direct_acquisition'
  from?: string
  to?: string
  year?: number
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
 * CPV facets: `cpv` is an exact (usually 8-digit) code, `cpv_division` the
 * 2-digit division. When both are present the exact code wins (more specific).
 */
function applyCpv<T extends { cpvDivision?: { eq: string }; cpvCode?: { eq: string } }>(
  filter: T,
  search: ProcurementSearchState,
): void {
  const cpv = trimmedOrUndefined(search.cpv)
  const division = trimmedOrUndefined(search.cpv_division)
  if (cpv) {
    filter.cpvCode = { eq: cpv }
  } else if (division) {
    filter.cpvDivision = { eq: division }
  }
}

// NOTE: `county` / `region` are reserved URL params (buyer-territory filters
// the capability gate blocks) — they are parsed by the search schema but are
// NEVER forwarded to the server by any builder here.

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function buildProceduresFilter(
  search: ProcurementSearchState,
): ProcurementProceduresFilterInput {
  const filter: ProcurementProceduresFilterInput = {}
  const q = procurementQOrUndefined(search.q)
  if (q) filter.q = { contains: q }
  const authorityCui = trimmedOrUndefined(search.authority_cui)
  if (authorityCui) filter.authorityCui = { eq: authorityCui }
  applyCpv(filter, search)
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
  if (q) filter.q = { contains: q }
  const authorityCui = trimmedOrUndefined(search.authority_cui)
  if (authorityCui) filter.authorityCui = { eq: authorityCui }
  const supplierCui = trimmedOrUndefined(search.supplier_cui)
  if (supplierCui) filter.supplierCui = { eq: supplierCui }
  applyCpv(filter, search)
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
  if (q) filter.q = { contains: q }
  const authorityCui = trimmedOrUndefined(search.authority_cui)
  if (authorityCui) filter.authorityCui = { eq: authorityCui }
  const supplierCui = trimmedOrUndefined(search.supplier_cui)
  if (supplierCui) filter.supplierCui = { eq: supplierCui }
  applyCpv(filter, search)
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
  cpvCode?: string
  monthFrom?: string
  monthTo?: string
  buyerRegion?: string
  buyerCounty?: string
  buyerSiruta?: string
  supplierCounty?: string
  supplierRegion?: string
  grain?: ProcurementScopeFilterInput['grain']
  /** Single status token — analysis scope has no `in` operator. */
  status?: string
}): ProcurementScopeFilterInput {
  const filter: ProcurementScopeFilterInput = {}
  const authorityCui = trimmedOrUndefined(scope.authorityCui)
  if (authorityCui) filter.authorityCui = authorityCui
  const supplierCui = trimmedOrUndefined(scope.supplierCui)
  if (supplierCui) filter.supplierCui = supplierCui
  const cpvCode = trimmedOrUndefined(scope.cpvCode)
  const cpvDivision = trimmedOrUndefined(scope.cpvDivision)
  if (cpvCode) {
    filter.cpvCode = cpvCode
  } else if (cpvDivision) {
    filter.cpvDivision = cpvDivision
  }
  const monthFrom = trimmedOrUndefined(scope.monthFrom)
  if (monthFrom) filter.from = monthFrom
  const monthTo = trimmedOrUndefined(scope.monthTo)
  if (monthTo) filter.to = monthTo
  const buyerRegion = trimmedOrUndefined(scope.buyerRegion)
  if (buyerRegion) filter.buyerRegion = buyerRegion
  // TODO(API Wave-2 buyer_county rollup): serving must accept buyerCounty on
  // ProcurementAnalysisScopeInput (not approximate to parent region). Used by
  // ProcurementTerritoryDrawer when mapGrain=county and by hub buyerCounty.
  const buyerCounty = trimmedOrUndefined(scope.buyerCounty)
  if (buyerCounty) filter.buyerCounty = buyerCounty
  // TODO(API buyer_siruta scope): serving must accept buyerSiruta. Used by
  // ProcurementTerritoryDrawer when mapGrain=uat.
  const buyerSiruta = trimmedOrUndefined(scope.buyerSiruta)
  if (buyerSiruta) filter.buyerSiruta = buyerSiruta
  // Supplier geography: served by the ClickHouse analytics backend (dev,
  // 2026-07-22) — forwarded on the analysis scope; record lists still
  // exclude it (list geo remains a separate TODO).
  const supplierCounty = trimmedOrUndefined(scope.supplierCounty)
  if (supplierCounty) filter.supplierCounty = supplierCounty
  const supplierRegion = trimmedOrUndefined(scope.supplierRegion)
  if (supplierRegion) filter.supplierRegion = supplierRegion
  if (scope.grain) filter.grain = scope.grain
  const status = trimmedOrUndefined(scope.status)
  if (status) filter.status = status
  return filter
}
