/**
 * Hub active-filter chips — period always, geo with B1 suffixes, list-only (C1).
 */
import { t } from '@lingui/core/macro'
import type {
  ProcurementHubState,
  ResolvedProcurementOverviewPeriod,
} from '@/schemas/procurement-hub'
import { sourceLabel, valueCategoryLabel } from './enum-labels'
import { statusLabel } from './status-meta'

export type HubFilterChipKind = 'applied' | 'list-only' | 'not-on-list'

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

export function buildHubActiveFilterChips(
  state: ProcurementHubState,
  period: ResolvedProcurementOverviewPeriod,
  locale = 'en',
): readonly HubFilterChip[] {
  const chips: HubFilterChip[] = []
  const onOverview = state.view === 'overview'

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

  if (state.buyerCounty) {
    chips.push({
      key: 'buyer-county',
      prefix: t`Public institution`,
      value: t`County ${state.buyerCounty}`,
      kind: onOverview ? 'applied' : 'not-on-list',
      clear: { buyerCounty: undefined, buyerRegion: undefined },
    })
  } else if (state.buyerRegion) {
    chips.push({
      key: 'buyer-region',
      prefix: t`Public institution`,
      value: state.buyerRegion,
      kind: onOverview ? 'applied' : 'not-on-list',
      clear: { buyerRegion: undefined, buyerCounty: undefined },
    })
  }

  if (state.supplierCounty || state.supplierRegion) {
    chips.push({
      key: 'supplier-geo',
      prefix: t`Supplier location`,
      value: state.supplierCounty ?? state.supplierRegion ?? '',
      kind: 'not-on-list',
      clear: { supplierCounty: undefined, supplierRegion: undefined },
    })
  }

  if (state.q) {
    chips.push({
      key: 'q',
      prefix: t`Query`,
      value: state.q,
      kind: onOverview ? 'list-only' : 'applied',
      clear: { q: undefined },
    })
  }
  if (state.authority_cui) {
    chips.push({
      key: 'authority',
      prefix: t`Authority`,
      value: state.authority_cui,
      kind: onOverview ? 'list-only' : 'applied',
      clear: { authority_cui: undefined },
    })
  }
  if (state.supplier_cui) {
    chips.push({
      key: 'supplier',
      prefix: t`Supplier`,
      value: state.supplier_cui,
      kind: onOverview ? 'list-only' : 'applied',
      clear: { supplier_cui: undefined },
    })
  }
  if (state.cpv) {
    chips.push({
      key: 'cpv',
      prefix: t`CPV`,
      value: state.cpv,
      kind: onOverview ? 'list-only' : 'applied',
      clear: { cpv: undefined },
    })
  } else if (state.cpv_division) {
    chips.push({
      key: 'cpv-division',
      prefix: t`CPV division`,
      value: state.cpv_division,
      kind: onOverview ? 'list-only' : 'applied',
      clear: { cpv_division: undefined },
    })
  }
  if (state.source) {
    chips.push({
      key: 'source',
      prefix: t`Source`,
      value: sourceLabel(state.source),
      kind: onOverview ? 'list-only' : 'applied',
      clear: { source: undefined },
    })
  }
  if (state.status && state.status.length > 0) {
    chips.push({
      key: 'status',
      prefix: t`Status`,
      value: state.status.map(statusLabel).join(', '),
      kind: onOverview ? 'list-only' : 'applied',
      clear: { status: undefined },
    })
  }
  if (state.value_state && state.value_state.length > 0) {
    chips.push({
      key: 'value-state',
      prefix: t`Value quality`,
      value: state.value_state.map(valueCategoryLabel).join(', '),
      kind: onOverview ? 'list-only' : 'applied',
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
      kind: onOverview ? 'list-only' : 'applied',
      clear: { valueMin: undefined, valueMax: undefined },
    })
  }

  return chips
}
