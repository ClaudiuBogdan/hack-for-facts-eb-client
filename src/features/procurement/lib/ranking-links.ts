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
  if (options.cpvLevel === 'code') {
    return cleanProcurementHubSearch({
      ...base,
      cpv: key,
      cpv_division: undefined,
    })
  }
  return cleanProcurementHubSearch({
    ...base,
    cpv_division: key,
    cpv: undefined,
  })
}
