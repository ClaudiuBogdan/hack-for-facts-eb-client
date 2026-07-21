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

type FlowGrainKey = 'procedures' | 'contracts' | 'direct_acquisitions'

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

function buildStatuses(
  search: ProcurementSearchState,
  grain: FlowGrainKey,
): string[] | undefined {
  if (!search.status || search.status.length === 0) return undefined
  const vocabulary = STATUSES_BY_GRAIN[grain]
  const valid = search.status.filter((status) => vocabulary.includes(status))
  return valid.length > 0 ? valid : undefined
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
  grain?: ProcurementScopeFilterInput['grain']
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
  if (scope.grain) filter.grain = scope.grain
  return filter
}
