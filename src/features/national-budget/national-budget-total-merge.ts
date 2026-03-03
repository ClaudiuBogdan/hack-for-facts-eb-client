import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'
import type { AnalyticsFilterType } from '@/schemas/charts'

import type { NationalBudgetTransferFilter } from './national-budget-types'

type BuildTotalBudgetLineItemsFilterOptions = {
  baseFilter: AnalyticsFilterType
  sectionLineItemsFilters: AnalyticsFilterType[]
  transferFilter: NationalBudgetTransferFilter
}

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined
}

function sanitizeBaseExclude(exclude: AnalyticsFilterType['exclude'] | undefined): AnalyticsFilterType['exclude'] {
  if (!exclude) return undefined

  const {
    functional_codes: _functionalCodes,
    functional_prefixes: _functionalPrefixes,
    economic_codes: _economicCodes,
    economic_prefixes: _economicPrefixes,
    funding_source_ids: _fundingSourceIds,
    budget_sector_ids: _budgetSectorIds,
    ...rest
  } = exclude

  const hasAnyValue = Object.values(rest).some(hasValue)
  return hasAnyValue ? rest : undefined
}

function toUniqueSortedArray(values: Set<string>): string[] | undefined {
  if (values.size === 0) return undefined
  return Array.from(values).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
}

export function mergeNationalBudgetSectionNodes(sectionNodes: AggregatedNode[][]): AggregatedNode[] {
  const nodeByCompositeKey = new Map<string, AggregatedNode>()

  for (const nodes of sectionNodes) {
    for (const node of nodes) {
      const compositeKey = [node.fn_c ?? '', node.ec_c ?? '', node.fn_n ?? '', node.ec_n ?? ''].join('||')
      const existing = nodeByCompositeKey.get(compositeKey)
      if (!existing) {
        nodeByCompositeKey.set(compositeKey, {
          ...node,
          amount: node.amount ?? 0,
          count: node.count ?? 0,
        })
        continue
      }

      existing.amount = (existing.amount ?? 0) + (node.amount ?? 0)
      existing.count = (existing.count ?? 0) + (node.count ?? 0)
    }
  }

  return Array.from(nodeByCompositeKey.values())
}

export function buildTotalBudgetLineItemsFilter({
  baseFilter,
  sectionLineItemsFilters,
  transferFilter,
}: BuildTotalBudgetLineItemsFilterOptions): AnalyticsFilterType {
  const budgetSectorIds = new Set<string>()
  const fundingSourceIds = new Set<string>()
  let hasUnconstrainedFundingSources = false
  const excludeEconomicPrefixes = new Set<string>()
  const excludeFunctionalPrefixes = new Set<string>()

  for (const sectionFilter of sectionLineItemsFilters) {
    for (const sectorId of sectionFilter.budget_sector_ids ?? []) {
      if (sectorId) budgetSectorIds.add(sectorId)
    }
    const sectionFundingSourceIds = sectionFilter.funding_source_ids
    if (sectionFundingSourceIds === undefined) {
      hasUnconstrainedFundingSources = true
    } else {
      for (const sourceId of sectionFundingSourceIds) {
        if (sourceId) fundingSourceIds.add(sourceId)
      }
    }
    if (transferFilter === 'no-transfers') {
      for (const code of sectionFilter.exclude?.economic_prefixes ?? []) {
        if (code) excludeEconomicPrefixes.add(code)
      }
      for (const code of sectionFilter.exclude?.functional_prefixes ?? []) {
        if (code) excludeFunctionalPrefixes.add(code)
      }
    }
  }

  const normalizedExclude = {
    ...(sanitizeBaseExclude(baseFilter.exclude) ?? {}),
    economic_prefixes: toUniqueSortedArray(excludeEconomicPrefixes),
    functional_prefixes: toUniqueSortedArray(excludeFunctionalPrefixes),
  }
  const hasExcludeValues = Object.values(normalizedExclude).some(hasValue)

  return {
    ...baseFilter,
    budget_sector_ids: toUniqueSortedArray(budgetSectorIds),
    funding_source_ids: hasUnconstrainedFundingSources
      ? undefined
      : toUniqueSortedArray(fundingSourceIds),
    functional_codes: undefined,
    functional_prefixes: undefined,
    economic_codes: undefined,
    economic_prefixes: undefined,
    exclude: hasExcludeValues ? normalizedExclude : undefined,
  }
}
