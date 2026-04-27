/**
 * Commitments Bugetare GraphQL API
 *
 * Real API functions replacing the mock data layer.
 * Follows the pattern from src/lib/api/entity-analytics.ts.
 */

import { graphqlRequest } from './graphql'
import type {
  CommitmentsFilterInput,
  CommitmentsSummaryResult,
  CommitmentsLineItem,
  CommitmentsAggregatedItem,
  CommitmentsAnalyticsSeries,
  CommitmentsMetric,
  CommitmentExecutionComparison,
  Connection,
} from '@/schemas/commitments'
import type { ReportPeriodInput } from '@/schemas/reporting'

// ─────────────────────────────────────────────────────────────────
// GraphQL Queries
// ─────────────────────────────────────────────────────────────────

const COMMITMENTS_SUMMARY_QUERY = /* GraphQL */ `
  query CommitmentsSummary($filter: CommitmentsFilterInput!, $limit: Int, $offset: Int) {
    commitmentsSummary(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        __typename
        ... on CommitmentsMonthlySummary {
          year
          month
          entity_cui
          entity_name
          report_type
          credite_angajament
          plati_trezor
          plati_non_trezor
          receptii_totale
          receptii_neplatite_change
          total_plati
        }
        ... on CommitmentsQuarterlySummary {
          year
          quarter
          entity_cui
          entity_name
          report_type
          credite_angajament
          limita_credit_angajament
          credite_bugetare
          credite_angajament_initiale
          credite_bugetare_initiale
          credite_angajament_definitive
          credite_bugetare_definitive
          credite_angajament_disponibile
          credite_bugetare_disponibile
          receptii_totale
          plati_trezor
          plati_non_trezor
          receptii_neplatite
          total_plati
          execution_rate
          commitment_rate
        }
        ... on CommitmentsAnnualSummary {
          year
          entity_cui
          entity_name
          report_type
          credite_angajament
          limita_credit_angajament
          credite_bugetare
          credite_angajament_initiale
          credite_bugetare_initiale
          credite_angajament_definitive
          credite_bugetare_definitive
          credite_angajament_disponibile
          credite_bugetare_disponibile
          receptii_totale
          plati_trezor
          plati_non_trezor
          receptii_neplatite
          total_plati
          execution_rate
          commitment_rate
        }
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`

const COMMITMENTS_LINE_ITEMS_QUERY = /* GraphQL */ `
  query CommitmentsLineItems($filter: CommitmentsFilterInput!, $limit: Int, $offset: Int) {
    commitmentsLineItems(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        id
        year
        month
        report_type
        entity_cui
        entity_name
        budget_sector_id
        budget_sector_name
        funding_source_id
        funding_source_name
        functional_code
        functional_name
        economic_code
        economic_name
        credite_angajament
        limita_credit_angajament
        credite_bugetare
        credite_angajament_initiale
        credite_bugetare_initiale
        credite_angajament_definitive
        credite_bugetare_definitive
        credite_angajament_disponibile
        credite_bugetare_disponibile
        receptii_totale
        plati_trezor
        plati_non_trezor
        receptii_neplatite
        monthly_plati_trezor
        monthly_plati_non_trezor
        monthly_receptii_totale
        monthly_receptii_neplatite_change
        monthly_credite_angajament
        is_quarterly
        quarter
        is_yearly
        anomaly
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`

const COMMITMENTS_AGGREGATED_QUERY = /* GraphQL */ `
  query CommitmentsAggregated($input: CommitmentsAggregatedInput!) {
    commitmentsAggregated(input: $input) {
      nodes {
        functional_code
        functional_name
        economic_code
        economic_name
        amount
        count
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`

const COMMITMENTS_ANALYTICS_QUERY = /* GraphQL */ `
  query CommitmentsAnalytics($inputs: [CommitmentsAnalyticsInput!]!) {
    commitmentsAnalytics(inputs: $inputs) {
      seriesId
      metric
      xAxis { name type unit }
      yAxis { name type unit }
      data { x y growth_percent }
    }
  }
`

const COMMITMENT_VS_EXECUTION_QUERY = /* GraphQL */ `
  query CommitmentVsExecution($input: CommitmentExecutionComparisonInput!) {
    commitmentVsExecution(input: $input) {
      frequency
      data {
        period
        commitment_value
        execution_value
        difference
        difference_percent
        commitment_growth_percent
        execution_growth_percent
        difference_growth_percent
      }
      total_commitment
      total_execution
      total_difference
      overall_difference_percent
      matched_count
      unmatched_commitment_count
      unmatched_execution_count
    }
  }
`

// ─────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────

export async function fetchCommitmentsSummary(
  filter: CommitmentsFilterInput,
  limit = 50,
  offset = 0
): Promise<Connection<CommitmentsSummaryResult>> {
  const data = await graphqlRequest<{
    commitmentsSummary: Connection<CommitmentsSummaryResult>
  }>(COMMITMENTS_SUMMARY_QUERY, { filter, limit, offset })
  return data.commitmentsSummary
}

export async function fetchCommitmentsLineItems(
  filter: CommitmentsFilterInput,
  limit = 50,
  offset = 0
): Promise<Connection<CommitmentsLineItem>> {
  const data = await graphqlRequest<{
    commitmentsLineItems: Connection<CommitmentsLineItem>
  }>(COMMITMENTS_LINE_ITEMS_QUERY, { filter, limit, offset })
  return data.commitmentsLineItems
}

export interface CommitmentsAggregatedInput {
  filter: CommitmentsFilterInput
  metric: CommitmentsMetric
  limit?: number
  offset?: number
}

export async function fetchCommitmentsAggregated(
  input: CommitmentsAggregatedInput
): Promise<Connection<CommitmentsAggregatedItem>> {
  const data = await graphqlRequest<{
    commitmentsAggregated: Connection<CommitmentsAggregatedItem>
  }>(COMMITMENTS_AGGREGATED_QUERY, { input })
  return data.commitmentsAggregated
}

export async function fetchCommitmentsAggregatedAll(params: {
  input: CommitmentsAggregatedInput
  pageSize?: number
  maxPages?: number
  maxItems?: number
}): Promise<Connection<CommitmentsAggregatedItem>> {
  const pageSize = params.pageSize ?? 500
  const maxPages = params.maxPages ?? 25
  const maxItems = params.maxItems ?? 10_000

  let offset = params.input.offset ?? 0
  const hasPreviousPage = offset > 0
  let hasNextPage = false
  let totalCount: number | undefined
  const nodes: CommitmentsAggregatedItem[] = []

  for (let page = 0; page < maxPages; page += 1) {
    const res = await fetchCommitmentsAggregated({
      ...params.input,
      limit: pageSize,
      offset,
    })

    totalCount ??= res.pageInfo.totalCount
    nodes.push(...res.nodes)
    hasNextPage = res.pageInfo.hasNextPage

    if (!hasNextPage) break
    if (res.nodes.length === 0) break
    if (nodes.length >= maxItems) break

    offset += res.nodes.length

    if (totalCount !== undefined && offset >= totalCount) {
      hasNextPage = false
      break
    }
  }

  return {
    nodes,
    pageInfo: {
      totalCount: totalCount ?? nodes.length,
      hasNextPage,
      hasPreviousPage,
    },
  }
}

export interface CommitmentsAnalyticsInput {
  filter: CommitmentsFilterInput
  metric: CommitmentsMetric
  seriesId?: string
}

export async function fetchCommitmentsAnalytics(
  inputs: CommitmentsAnalyticsInput[]
): Promise<CommitmentsAnalyticsSeries[]> {
  const data = await graphqlRequest<{
    commitmentsAnalytics: CommitmentsAnalyticsSeries[]
  }>(COMMITMENTS_ANALYTICS_QUERY, { inputs })
  return data.commitmentsAnalytics
}

export interface CommitmentExecutionComparisonInput {
  filter: CommitmentsFilterInput
  commitments_metric?: CommitmentsMetric
}

export async function fetchCommitmentVsExecution(
  input: CommitmentExecutionComparisonInput
): Promise<CommitmentExecutionComparison> {
  const data = await graphqlRequest<{
    commitmentVsExecution: CommitmentExecutionComparison
  }>(COMMITMENT_VS_EXECUTION_QUERY, { input })
  return data.commitmentVsExecution
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Build an CommitmentsFilterInput from entity page params.
 */
export function buildCommitmentsFilter(params: {
  reportPeriod: ReportPeriodInput
  reportType?: string
  cui?: string
  normalization?: string
  currency?: string
  inflationAdjusted?: boolean
  showPeriodGrowth?: boolean
  excludeTransfers?: boolean
}): CommitmentsFilterInput {
  return {
    report_period: params.reportPeriod,
    report_type: (params.reportType as CommitmentsFilterInput['report_type']) ?? 'PRINCIPAL_AGGREGATED',
    entity_cuis: params.cui ? [params.cui] : undefined,
    normalization: params.normalization as CommitmentsFilterInput['normalization'],
    currency: params.currency as CommitmentsFilterInput['currency'],
    inflation_adjusted: params.inflationAdjusted,
    show_period_growth: params.showPeriodGrowth,
    exclude_transfers: params.excludeTransfers ?? true,
  }
}

/**
 * Extract summary values from union-typed summary nodes.
 * Returns the totals from the first node (or zeros).
 */
export function extractSummaryValues(nodes: CommitmentsSummaryResult[]): {
  totalBudget: number
  commitmentAuthority: number
  committed: number
  paid: number
  receipts: number
  arrears: number
} {
  if (nodes.length === 0) {
    return { totalBudget: 0, commitmentAuthority: 0, committed: 0, paid: 0, receipts: 0, arrears: 0 }
  }

  // Aggregate across all nodes
  let totalBudget = 0
  let commitmentAuthority = 0
  let committed = 0
  let paid = 0
  let receipts = 0
  let arrears = 0

  for (const node of nodes) {
    paid += node.total_plati
    receipts += node.receptii_totale

    if (node.__typename === 'CommitmentsMonthlySummary') {
      // Monthly summaries don't have definitive credits
      totalBudget += node.credite_angajament
      committed += node.credite_angajament
    } else {
      totalBudget += node.credite_bugetare_definitive
      commitmentAuthority += node.credite_angajament_definitive
      // NOTE: `credite_angajament_definitive` is commitment authority (limit),
      // while `credite_angajament` is the total commitments made (YTD).
      committed += node.credite_angajament
      arrears += node.receptii_neplatite
    }
  }

  return { totalBudget, commitmentAuthority, committed, paid, receipts, arrears }
}

export function buildPaidAggregatedInputs(params: {
  filter: CommitmentsFilterInput
  limit?: number
  offset?: number
}): { paidTreasury: CommitmentsAggregatedInput; paidNonTreasury: CommitmentsAggregatedInput } {
  return {
    paidTreasury: {
      filter: params.filter,
      metric: 'PLATI_TREZOR',
      limit: params.limit,
      offset: params.offset,
    },
    paidNonTreasury: {
      filter: params.filter,
      metric: 'PLATI_NON_TREZOR',
      limit: params.limit,
      offset: params.offset,
    },
  }
}

type AggregatedItemKey = string

function getAggregatedItemKey(item: Pick<CommitmentsAggregatedItem, 'functional_code' | 'economic_code'>): AggregatedItemKey {
  return `${item.functional_code}||${item.economic_code ?? ''}`
}

export function combineCommitmentsAggregatedNodes(
  ...nodeLists: readonly ReadonlyArray<CommitmentsAggregatedItem>[]
): CommitmentsAggregatedItem[] {
  const mergedByKey = new Map<AggregatedItemKey, CommitmentsAggregatedItem>()

  for (const nodes of nodeLists) {
    for (const node of nodes) {
      const key = getAggregatedItemKey(node)
      const existing = mergedByKey.get(key)
      if (!existing) {
        mergedByKey.set(key, { ...node })
        continue
      }

      mergedByKey.set(key, {
        ...existing,
        amount: existing.amount + node.amount,
        count: existing.count + node.count,
      })
    }
  }

  return Array.from(mergedByKey.values())
}
