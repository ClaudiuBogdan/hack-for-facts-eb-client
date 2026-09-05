import { fetchBudgetDimensionNodes } from '@/lib/api/budget-dimensions'

import type { BudgetSectorApiNode, FundingSourceApiNode } from './national-budget-types'

const BUDGET_SECTORS_QUERY = /* GraphQL */ `
  query BudgetSectors($limit: Int, $offset: Int) {
    budgetSectors(limit: $limit, offset: $offset) {
      nodes {
        sector_id
        sector_description
      }
      pageInfo {
        totalCount
        hasNextPage
      }
    }
  }
`

const FUNDING_SOURCES_QUERY = /* GraphQL */ `
  query NationalBudgetFundingSources($limit: Int, $offset: Int) {
    fundingSources(limit: $limit, offset: $offset) {
      nodes {
        source_id
        source_description
      }
      pageInfo {
        totalCount
        hasNextPage
      }
    }
  }
`

export async function fetchBudgetSectors(signal?: AbortSignal): Promise<BudgetSectorApiNode[]> {
  return fetchBudgetDimensionNodes<BudgetSectorApiNode>(BUDGET_SECTORS_QUERY, 'budgetSectors', {}, signal)
}

export async function fetchFundingSources(signal?: AbortSignal): Promise<FundingSourceApiNode[]> {
  return fetchBudgetDimensionNodes<FundingSourceApiNode>(FUNDING_SOURCES_QUERY, 'fundingSources', {}, signal)
}
