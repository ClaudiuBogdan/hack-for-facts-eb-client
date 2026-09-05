/**
 * Commitments Bugetare (Budget Commitments) Types
 *
 * Real API types matching the GraphQL schema (snake_case).
 * See docs/commitments-api-reference.md for full specification.
 */

import type { ReportPeriodInput } from '@/schemas/reporting'

// ─────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────

export type CommitmentsReportType =
  | 'DETAILED'
  | 'PRINCIPAL_AGGREGATED'
  | 'SECONDARY_AGGREGATED'

export type CommitmentsMetric =
  | 'CREDITE_ANGAJAMENT'
  | 'PLATI_TREZOR'
  | 'PLATI_NON_TREZOR'
  | 'RECEPTII_TOTALE'
  | 'RECEPTII_NEPLATITE_CHANGE'
  | 'LIMITA_CREDIT_ANGAJAMENT'
  | 'CREDITE_BUGETARE'
  | 'CREDITE_ANGAJAMENT_INITIALE'
  | 'CREDITE_BUGETARE_INITIALE'
  | 'CREDITE_ANGAJAMENT_DEFINITIVE'
  | 'CREDITE_BUGETARE_DEFINITIVE'
  | 'CREDITE_ANGAJAMENT_DISPONIBILE'
  | 'CREDITE_BUGETARE_DISPONIBILE'
  | 'RECEPTII_NEPLATITE'

export type PeriodType = 'MONTH' | 'QUARTER' | 'YEAR'
export type Normalization =
  | 'total'
  | 'total_euro'
  | 'per_capita'
  | 'per_capita_euro'
  | 'percent_gdp'
export type Currency = 'RON' | 'EUR' | 'USD'
export type AnomalyType = 'YTD_ANOMALY' | 'MISSING_LINE_ITEM'

// ─────────────────────────────────────────────────────────────────
// Filter Inputs
// ─────────────────────────────────────────────────────────────────

export interface CommitmentsExcludeInput {
  report_ids?: string[]
  entity_cuis?: string[]
  main_creditor_cui?: string
  functional_codes?: string[]
  functional_prefixes?: string[]
  economic_codes?: string[]
  economic_prefixes?: string[]
  funding_source_ids?: string[]
  budget_sector_ids?: string[]
  county_codes?: string[]
  regions?: string[]
  uat_ids?: string[]
  entity_types?: string[]
}

export interface CommitmentsFilterInput {
  report_period: ReportPeriodInput
  report_type?: CommitmentsReportType

  entity_cuis?: string[]
  main_creditor_cui?: string
  entity_types?: string[]
  is_uat?: boolean
  is_territorial_executive?: boolean
  search?: string

  functional_codes?: string[]
  functional_prefixes?: string[]
  economic_codes?: string[]
  economic_prefixes?: string[]

  funding_source_ids?: string[]
  budget_sector_ids?: string[]

  county_codes?: string[]
  regions?: string[]
  uat_ids?: string[]

  min_population?: number
  max_population?: number

  aggregate_min_amount?: number
  aggregate_max_amount?: number
  item_min_amount?: number
  item_max_amount?: number

  normalization?: Normalization
  currency?: Currency
  inflation_adjusted?: boolean
  show_period_growth?: boolean

  exclude?: CommitmentsExcludeInput
  exclude_transfers?: boolean
}

// ─────────────────────────────────────────────────────────────────
// Pagination (shared)
// ─────────────────────────────────────────────────────────────────

export interface PageInfo {
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface Connection<T> {
  nodes: T[]
  pageInfo: PageInfo
}

// ─────────────────────────────────────────────────────────────────
// Summary Types (Union)
// ─────────────────────────────────────────────────────────────────

export interface CommitmentsMonthlySummary {
  __typename: 'CommitmentsMonthlySummary'
  year: number
  month: number
  entity_cui: string
  entity_name: string
  main_creditor_cui: string | null
  report_type: CommitmentsReportType
  credite_angajament: number
  plati_trezor: number
  plati_non_trezor: number
  receptii_totale: number
  receptii_neplatite_change: number
  total_plati: number
}

export interface CommitmentsQuarterlySummary {
  __typename: 'CommitmentsQuarterlySummary'
  year: number
  quarter: number
  entity_cui: string
  entity_name: string
  main_creditor_cui: string | null
  report_type: CommitmentsReportType
  credite_angajament: number
  limita_credit_angajament: number
  credite_bugetare: number
  credite_angajament_initiale: number
  credite_bugetare_initiale: number
  credite_angajament_definitive: number
  credite_bugetare_definitive: number
  credite_angajament_disponibile: number
  credite_bugetare_disponibile: number
  receptii_totale: number
  plati_trezor: number
  plati_non_trezor: number
  receptii_neplatite: number
  total_plati: number
  execution_rate: number | null
  commitment_rate: number | null
}

export interface CommitmentsAnnualSummary {
  __typename: 'CommitmentsAnnualSummary'
  year: number
  entity_cui: string
  entity_name: string
  main_creditor_cui: string | null
  report_type: CommitmentsReportType
  credite_angajament: number
  limita_credit_angajament: number
  credite_bugetare: number
  credite_angajament_initiale: number
  credite_bugetare_initiale: number
  credite_angajament_definitive: number
  credite_bugetare_definitive: number
  credite_angajament_disponibile: number
  credite_bugetare_disponibile: number
  receptii_totale: number
  plati_trezor: number
  plati_non_trezor: number
  receptii_neplatite: number
  total_plati: number
  execution_rate: number | null
  commitment_rate: number | null
}

export type CommitmentsSummaryResult =
  | CommitmentsMonthlySummary
  | CommitmentsQuarterlySummary
  | CommitmentsAnnualSummary

// ─────────────────────────────────────────────────────────────────
// Line Items
// ─────────────────────────────────────────────────────────────────

export interface CommitmentsLineItem {
  id: string
  year: number
  month: number
  report_type: CommitmentsReportType

  entity_cui: string
  entity_name: string
  main_creditor_cui: string | null

  budget_sector_id: number
  budget_sector_name: string
  funding_source_id: number
  funding_source_name: string
  functional_code: string
  functional_name: string
  economic_code: string | null
  economic_name: string | null

  // YTD metrics
  credite_angajament: number
  limita_credit_angajament: number
  credite_bugetare: number
  credite_angajament_initiale: number
  credite_bugetare_initiale: number
  credite_angajament_definitive: number
  credite_bugetare_definitive: number
  credite_angajament_disponibile: number
  credite_bugetare_disponibile: number
  receptii_totale: number
  plati_trezor: number
  plati_non_trezor: number
  receptii_neplatite: number

  // Monthly deltas
  monthly_plati_trezor: number
  monthly_plati_non_trezor: number
  monthly_receptii_totale: number
  monthly_receptii_neplatite_change: number
  monthly_credite_angajament: number

  // Period flags
  is_quarterly: boolean
  quarter: number | null
  is_yearly: boolean

  // Data quality
  anomaly: AnomalyType | null
}

// ─────────────────────────────────────────────────────────────────
// Aggregated
// ─────────────────────────────────────────────────────────────────

export interface CommitmentsAggregatedItem {
  functional_code: string
  functional_name: string
  economic_code: string | null
  economic_name: string | null
  amount: number
  count: number
}

// ─────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────

export interface CommitmentsAnalyticsDataPoint {
  x: string
  y: number
  growth_percent: number | null
}

export interface Axis {
  name: string
  type: string
  unit: string
}

export interface CommitmentsAnalyticsSeries {
  seriesId: string
  metric: CommitmentsMetric
  xAxis: Axis
  yAxis: Axis
  data: CommitmentsAnalyticsDataPoint[]
}

// ─────────────────────────────────────────────────────────────────
// Commitment vs Execution
// ─────────────────────────────────────────────────────────────────

export interface CommitmentExecutionDataPoint {
  period: string
  commitment_value: number
  execution_value: number
  difference: number
  difference_percent: number | null
  commitment_growth_percent: number | null
  execution_growth_percent: number | null
  difference_growth_percent: number | null
}

export interface CommitmentExecutionComparison {
  frequency: PeriodType
  data: CommitmentExecutionDataPoint[]
  total_commitment: number
  total_execution: number
  total_difference: number
  overall_difference_percent: number | null
  matched_count: number
  unmatched_commitment_count: number
  unmatched_execution_count: number
}

// ─────────────────────────────────────────────────────────────────
// UI-only types (kept from previous version)
// ─────────────────────────────────────────────────────────────────

export interface PipelineStage {
  id: 'credits' | 'commitments' | 'receipts' | 'payments'
  label: string
  value: number
  percentage: number
  status: 'healthy' | 'warning' | 'danger'
}

export type FundingSource = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'

export const FUNDING_SOURCE_LABELS: Record<FundingSource, string> = {
  A: 'Integral de la buget',
  B: 'Venituri proprii',
  C: 'Credite externe',
  D: 'Credite interne',
  E: 'Fonduri externe nerambursabile',
  F: 'Venituri proprii și subvenții',
  G: 'Subvenții de la bugetul de stat',
  H: 'Subvenții de la alte administrații',
  I: 'Alte surse',
}

// ─────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────

const MONTHLY_METRICS: ReadonlySet<CommitmentsMetric> = new Set([
  'CREDITE_ANGAJAMENT',
  'PLATI_TREZOR',
  'PLATI_NON_TREZOR',
  'RECEPTII_TOTALE',
  'RECEPTII_NEPLATITE_CHANGE',
])

export function isMetricAvailableForPeriod(
  metric: CommitmentsMetric,
  periodType: PeriodType
): boolean {
  if (periodType === 'MONTH') {
    return MONTHLY_METRICS.has(metric)
  }
  // QUARTER and YEAR support all metrics except RECEPTII_NEPLATITE_CHANGE
  return metric !== 'RECEPTII_NEPLATITE_CHANGE'
}
