import { graphqlRequest } from '@/lib/api/graphql'

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

export async function fetchBudgetSectors(): Promise<BudgetSectorApiNode[]> {
  const data = await graphqlRequest<{
    budgetSectors: {
      nodes: BudgetSectorApiNode[]
      pageInfo: {
        totalCount: number
        hasNextPage: boolean
      }
    }
  }>(BUDGET_SECTORS_QUERY, {
    limit: 100,
    offset: 0,
  })

  return data.budgetSectors.nodes
}

export async function fetchFundingSources(): Promise<FundingSourceApiNode[]> {
  const data = await graphqlRequest<{
    fundingSources: {
      nodes: FundingSourceApiNode[]
      pageInfo: {
        totalCount: number
        hasNextPage: boolean
      }
    }
  }>(FUNDING_SOURCES_QUERY, {
    limit: 200,
    offset: 0,
  })

  return data.fundingSources.nodes
}
