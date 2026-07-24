/**
 * Deep-links from Rankings rows → List with the row dimension + current scope.
 */
import {
  cleanProcurementHubSearch,
  type ProcurementCpvLevel,
  type ProcurementHubState,
  type ProcurementRankDim,
} from '@/schemas/procurement-hub'

/**
 * Build a List URL patch that keeps shared hub scope and pins the ranked
 * dimension (CUI / CPV) as a list facet.
 */
export function rankingRowViewRecordsSearch(options: {
  readonly hubState: ProcurementHubState
  readonly rankDim: ProcurementRankDim
  readonly cpvLevel: ProcurementCpvLevel
  readonly rowKey: string | null
}): Partial<ProcurementHubState> | null {
  const key = options.rowKey?.trim()
  if (!key) return null

  const base: Partial<ProcurementHubState> = {
    ...options.hubState,
    view: 'list',
    page: 1,
  }

  if (options.rankDim === 'buyer') {
    return cleanProcurementHubSearch({
      ...base,
      authority_cui: key,
    })
  }
  if (options.rankDim === 'supplier') {
    return cleanProcurementHubSearch({
      ...base,
      supplier_cui: key,
    })
  }
  const cpvClear: Partial<ProcurementHubState> = {
    cpv: undefined,
    cpv_division: undefined,
    cpv_group: undefined,
    cpv_class: undefined,
    cpv_category: undefined,
  }
  if (options.cpvLevel === 'code') {
    return cleanProcurementHubSearch({ ...base, ...cpvClear, cpv: key })
  }
  // Intermediate levels key on canonical 8-digit codes. The list view has no
  // prefix filter yet, so these deep-links land on the hub with the level
  // filter set (aggregates scope it; the list ignores it — same honesty rule
  // as the geo keys).
  if (options.cpvLevel === 'group') {
    return cleanProcurementHubSearch({ ...base, ...cpvClear, cpv_group: key })
  }
  if (options.cpvLevel === 'class') {
    return cleanProcurementHubSearch({ ...base, ...cpvClear, cpv_class: key })
  }
  if (options.cpvLevel === 'category') {
    return cleanProcurementHubSearch({ ...base, ...cpvClear, cpv_category: key })
  }
  return cleanProcurementHubSearch({ ...base, ...cpvClear, cpv_division: key })
}
