/**
 * Hub active-filter chips — period always, geo with B1 suffixes, list-only (C1),
 * rankings unsupported facets (not applied to rankings).
 */
import { t } from '@lingui/core/macro'
import {
  PROCUREMENT_HUB_DEFAULTS,
  rankingStatusFromHubState,
  type ProcurementHubState,
  type ResolvedProcurementOverviewPeriod,
} from '@/schemas/procurement-hub'
import { sourceLabel, valueCategoryLabel } from './enum-labels'
import { statusLabel } from './status-meta'

export type HubFilterChipKind =
  | 'applied'
  | 'list-only'
  | 'not-on-list'
  | 'not-on-rankings'

export type HubFilterChip = {
  readonly key: string
  readonly prefix: string
  readonly value: string
  readonly kind: HubFilterChipKind
  readonly clear: Partial<ProcurementHubState>
}

function formatMonth(value: string, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

const RON_FORMAT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })

function measureLabel(measure: ProcurementHubState['measure']): string {
  return measure === 'value_awarded' ? t`Awarded value` : t`Record count`
}

/**
 * Facets that rankings can honor via analysis scope (parties / CPV / single status).
 * Unsupported facets stay inactive on Rankings.
 */
function rankingScopeFacetKind(
  state: ProcurementHubState,
  facet: 'scope' | 'unsupported' | 'status',
): HubFilterChipKind {
  if (state.view === 'list') return 'applied'
  if (state.view === 'rankings') {
    if (facet === 'unsupported') return 'not-on-rankings'
    if (facet === 'status' && !rankingStatusFromHubState(state)) {
      return 'not-on-rankings'
    }
    return 'applied'
  }
  return 'list-only'
}

export function buildHubActiveFilterChips(
  state: ProcurementHubState,
  period: ResolvedProcurementOverviewPeriod,
  locale = 'en',
): readonly HubFilterChip[] {
  const chips: HubFilterChip[] = []
  const geoAppliedOnView =
    state.view === 'overview' || state.view === 'rankings'

  if (period.isAllTime) {
    chips.push({
      key: 'period',
      prefix: t`Period`,
      value: t`All time`,
      kind: 'applied',
      clear: {
        period: undefined,
        dateFrom: undefined,
        dateTo: undefined,
      },
    })
  } else {
    const from = period.dateFrom
      ? formatMonth(period.dateFrom, locale)
      : t`First available month`
    const to = period.dateTo
      ? formatMonth(period.dateTo, locale)
      : t`Latest available month`
    chips.push({
      key: 'period',
      prefix: t`Period`,
      value: `${from} – ${to}`,
      kind: 'applied',
      clear: {
        period: 'all',
        dateFrom: undefined,
        dateTo: undefined,
      },
    })
  }

  chips.push({
    key: 'measure',
    prefix: t`Metric`,
    value: measureLabel(state.measure),
    // Rankings are count-sorted; measure does not change the leaderboard query.
    kind: state.view === 'rankings' ? 'not-on-rankings' : 'applied',
    clear: { measure: PROCUREMENT_HUB_DEFAULTS.measure },
  })

  // mapGrain is map-tab chrome only — never a global active-filter chip.

  if (state.buyerSiruta) {
    chips.push({
      key: 'buyer-siruta',
      prefix: t`Public institution`,
      value: t`UAT ${state.buyerSiruta}`,
      kind: geoAppliedOnView ? 'applied' : 'not-on-list',
      clear: {
        buyerSiruta: undefined,
        buyerCounty: undefined,
        buyerRegion: undefined,
      },
    })
  } else if (state.buyerCounty) {
    chips.push({
      key: 'buyer-county',
      prefix: t`Public institution`,
      value: t`County ${state.buyerCounty}`,
      kind: geoAppliedOnView ? 'applied' : 'not-on-list',
      clear: {
        buyerCounty: undefined,
        buyerRegion: undefined,
        buyerSiruta: undefined,
      },
    })
  } else if (state.buyerRegion) {
    chips.push({
      key: 'buyer-region',
      prefix: t`Public institution`,
      value: state.buyerRegion,
      kind: geoAppliedOnView ? 'applied' : 'not-on-list',
      clear: {
        buyerRegion: undefined,
        buyerCounty: undefined,
        buyerSiruta: undefined,
      },
    })
  }

  if (state.supplierCounty || state.supplierRegion) {
    chips.push({
      key: 'supplier-geo',
      prefix: t`Supplier location`,
      value: state.supplierCounty ?? state.supplierRegion ?? '',
      // Supplier geo is applied to overview/rankings analytics (ClickHouse
      // dev backend, 2026-07-22); record lists still exclude it.
      kind: geoAppliedOnView ? 'applied' : 'not-on-list',
      clear: { supplierCounty: undefined, supplierRegion: undefined },
    })
  }

  if (state.q) {
    chips.push({
      key: 'q',
      prefix: t`Query`,
      value: state.q,
      kind: rankingScopeFacetKind(state, 'unsupported'),
      clear: { q: undefined },
    })
  }
  if (state.authority_cui) {
    chips.push({
      key: 'authority',
      prefix: t`Authority`,
      value: state.authority_cui,
      kind: rankingScopeFacetKind(state, 'scope'),
      clear: { authority_cui: undefined },
    })
  }
  if (state.supplier_cui) {
    chips.push({
      key: 'supplier',
      prefix: t`Supplier`,
      value: state.supplier_cui,
      kind: rankingScopeFacetKind(state, 'scope'),
      clear: { supplier_cui: undefined },
    })
  }
  if (state.cpv) {
    chips.push({
      key: 'cpv',
      prefix: t`CPV`,
      value: state.cpv,
      kind: rankingScopeFacetKind(state, 'scope'),
      clear: { cpv: undefined },
    })
  } else if (state.cpv_division) {
    chips.push({
      key: 'cpv-division',
      prefix: t`CPV division`,
      value: state.cpv_division,
      kind: rankingScopeFacetKind(state, 'scope'),
      clear: { cpv_division: undefined },
    })
  }
  if (state.source) {
    chips.push({
      key: 'source',
      prefix: t`Source`,
      value: sourceLabel(state.source),
      kind: rankingScopeFacetKind(state, 'unsupported'),
      clear: { source: undefined },
    })
  }
  if (state.status && state.status.length > 0) {
    chips.push({
      key: 'status',
      prefix: t`Status`,
      value: state.status.map(statusLabel).join(', '),
      kind: rankingScopeFacetKind(state, 'status'),
      clear: { status: undefined },
    })
  }
  if (state.value_state && state.value_state.length > 0) {
    chips.push({
      key: 'value-state',
      prefix: t`Value quality`,
      value: state.value_state.map(valueCategoryLabel).join(', '),
      kind: rankingScopeFacetKind(state, 'unsupported'),
      clear: { value_state: undefined },
    })
  }
  if (state.valueMin !== undefined || state.valueMax !== undefined) {
    const min =
      state.valueMin !== undefined ? RON_FORMAT.format(state.valueMin) : '…'
    const max =
      state.valueMax !== undefined ? RON_FORMAT.format(state.valueMax) : '…'
    chips.push({
      key: 'value',
      prefix: t`Value (RON)`,
      value: `${min} – ${max}`,
      kind: rankingScopeFacetKind(state, 'unsupported'),
      clear: { valueMin: undefined, valueMax: undefined },
    })
  }

  return chips
}
