/**
 * Active-filter accounting for the procurement search URL state — drives the
 * filter-trigger badge and the removable chip row (mirrors parliament's
 * `member-votes-filter.ts`). Pure and unit-tested.
 *
 * The free-text `q`, `grain`, `sort` and paging params are not "filters"
 * here: they have their own visible controls.
 */
import { t } from '@lingui/core/macro'
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import { recordKindLabel, sourceLabel, valueCategoryLabel } from './enum-labels'
import { statusLabel } from './status-meta'

/** Patch merged into the search state + committed to the URL. */
export type ProcurementFilterPatch = Partial<ProcurementSearchState>

export type ProcurementFilterChip = {
  readonly key: string
  readonly label: string
  readonly clear: ProcurementFilterPatch
}

function formatChipDate(iso: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
}

const RON_FORMAT = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 })

export function buildActiveFilterChips(
  search: ProcurementSearchState,
): readonly ProcurementFilterChip[] {
  const chips: ProcurementFilterChip[] = []

  if (search.authority_cui) {
    chips.push({
      key: 'authority',
      label: t`Authority: ${search.authority_cui}`,
      clear: { authority_cui: undefined },
    })
  }
  if (search.supplier_cui) {
    chips.push({
      key: 'supplier',
      label: t`Supplier: ${search.supplier_cui}`,
      clear: { supplier_cui: undefined },
    })
  }
  if (search.cpv) {
    chips.push({
      key: 'cpv',
      label: t`CPV: ${search.cpv}`,
      clear: { cpv: undefined },
    })
  } else if (search.cpv_division) {
    chips.push({
      key: 'cpv-division',
      label: t`CPV division: ${search.cpv_division}`,
      clear: { cpv_division: undefined },
    })
  }
  if (search.source) {
    chips.push({
      key: 'source',
      label: t`Source: ${sourceLabel(search.source)}`,
      clear: { source: undefined },
    })
  }
  if (search.status && search.status.length > 0) {
    const statuses = search.status.map(statusLabel).join(', ')
    chips.push({
      key: 'status',
      label: t`Status: ${statuses}`,
      clear: { status: undefined },
    })
  }
  if (search.value_state && search.value_state.length > 0) {
    const categories = search.value_state.map(valueCategoryLabel).join(', ')
    chips.push({
      key: 'value-state',
      label: t`Value quality: ${categories}`,
      clear: { value_state: undefined },
    })
  }
  if (search.record_kind && search.record_kind.length > 0) {
    const kinds = search.record_kind.map(recordKindLabel).join(', ')
    chips.push({
      key: 'record-kind',
      label: t`Record kind: ${kinds}`,
      clear: { record_kind: undefined },
    })
  }
  if (search.dateFrom || search.dateTo) {
    const from = search.dateFrom ? formatChipDate(search.dateFrom) : '…'
    const to = search.dateTo ? formatChipDate(search.dateTo) : '…'
    chips.push({
      key: 'period',
      label: t`Period: ${from} – ${to}`,
      clear: { dateFrom: undefined, dateTo: undefined },
    })
  } else if (search.year !== undefined) {
    chips.push({
      key: 'year',
      label: t`Year: ${search.year}`,
      clear: { year: undefined },
    })
  }
  if (search.valueMin !== undefined || search.valueMax !== undefined) {
    const min =
      search.valueMin !== undefined ? RON_FORMAT.format(search.valueMin) : '…'
    const max =
      search.valueMax !== undefined ? RON_FORMAT.format(search.valueMax) : '…'
    chips.push({
      key: 'value',
      label: t`Value (RON): ${min} – ${max}`,
      clear: { valueMin: undefined, valueMax: undefined },
    })
  }
  // `signal` is URL-reserved for Phase B wiring — never shown as an active
  // filter chip because it does not narrow search results yet.

  return chips
}

export function countActiveProcurementFilters(
  search: ProcurementSearchState,
): number {
  return buildActiveFilterChips(search).length
}

/** The patch `clearFilters` commits — keeps grain + sort + q, drops facets. */
export const CLEAR_ALL_FILTERS_PATCH: ProcurementFilterPatch = {
  authority_cui: undefined,
  supplier_cui: undefined,
  cpv: undefined,
  cpv_division: undefined,
  source: undefined,
  status: undefined,
  value_state: undefined,
  record_kind: undefined,
  year: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  valueMin: undefined,
  valueMax: undefined,
  signal: undefined,
}
