import { isDecimalString } from '@/lib/exact-decimal'
import type { CompanyAnalysisBreakdown, CompanyAnalysisBucket, CompanyAnalysisRecords, CompanyAnalysisSeries } from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../api/company-analytics-plan'

/**
 * What the page shows, as a file a reader can check: the API's own digits
 * (no rounding, no scale, no thousands separators), an empty cell where the
 * API has no value — never a 0 — and the release every row was read from.
 * Bounded by what the page read: one page of companies, a breakdown's rows,
 * a series' years.
 */

/** A cell, guarded against spreadsheet formulas; a number (negative included) is written as it is. */
function cell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const raw = String(value)
  if (isDecimalString(raw)) return raw
  const safe = /^[=+\-@\t\r]/u.test(raw) ? `'${raw}` : raw
  return /[",\n\r]/u.test(safe) ? `"${safe.replace(/"/gu, '""')}"` : safe
}

export function csvOf(header: readonly string[], rows: readonly (readonly (string | number | boolean | null | undefined)[])[]): string {
  return [header.map(cell).join(','), ...rows.map((row) => row.map(cell).join(','))].join('\r\n')
}

export function recordsCsv(records: CompanyAnalysisRecords, question: ResolvedQuestion): string {
  const metrics = question.recordMetrics
  const header = ['release_id', 'fiscal_year', 'cui', 'current_name', 'legal_form', 'county_code', 'uat_siruta', 'observed_status_code', 'vat_payer', 'fiscally_inactive', 'main_caen_code', 'main_caen_revision', 'filed', 'employee_size_band', ...metrics.flatMap((metric) => [metric.toLowerCase(), `${metric.toLowerCase()}_status`])]
  const rows = records.edges.map(({ node }) => [
    records.release.releaseId,
    records.fiscalYear,
    node.cui,
    node.currentName,
    node.legalForm,
    node.county?.code,
    node.uat?.code,
    node.observedStatus?.code,
    node.vatPayer,
    node.fiscallyInactive,
    node.mainCaen?.code,
    node.mainCaen?.revision,
    node.filed,
    node.employeeSizeBand,
    ...metrics.flatMap((metric) => {
      const entry = node.values.find((value) => value.metric === metric)
      return [entry?.value ?? null, entry?.status ?? null]
    }),
  ])
  return csvOf(header, rows)
}

function bucketRow(breakdown: CompanyAnalysisBreakdown, bucket: CompanyAnalysisBucket) {
  return [
    breakdown.release.releaseId,
    breakdown.fiscalYear,
    breakdown.dimension,
    bucket.kind,
    bucket.key,
    bucket.label ?? bucket.caen?.label ?? null,
    bucket.groups,
    bucket.companies,
    bucket.filers,
    breakdown.metric,
    bucket.metric?.sum ?? null,
    bucket.metric?.contributors ?? null,
    bucket.metric?.coverage.missing ?? null,
    bucket.metric?.coverage.notAdmitted ?? null,
    bucket.metric?.coverage.heldProfile ?? null,
    bucket.metric?.coverage.heldObservation ?? null,
    bucket.metric?.coverage.heldQuality ?? null,
    bucket.metric?.coverage.heldComponent ?? null,
  ]
}

export function breakdownCsv(breakdown: CompanyAnalysisBreakdown): string {
  const header = ['release_id', 'fiscal_year', 'dimension', 'bucket', 'key', 'label', 'groups', 'companies', 'filers', 'metric', 'sum', 'contributors', 'missing', 'not_admitted', 'held_profile', 'held_observation', 'held_quality', 'held_component']
  const buckets = [...breakdown.groups, breakdown.other, breakdown.unknown, breakdown.totals]
  return csvOf(header, buckets.map((bucket) => bucketRow(breakdown, bucket)))
}

export function seriesCsv(series: CompanyAnalysisSeries): string {
  const header = ['release_id', 'fiscal_year', 'metric', 'unit', 'cohort_mode', 'reference_year', 'available', 'gap_reason', 'companies', 'filers', 'sum', 'contributors', 'missing', 'not_admitted', 'held_profile', 'held_observation', 'held_quality', 'held_component']
  return csvOf(
    header,
    series.points.map((point) => [
      series.release.releaseId,
      point.fiscalYear,
      series.metric,
      series.unit,
      series.cohortMode,
      series.referenceYear,
      point.available,
      point.gapReason,
      point.companies,
      point.filers,
      point.metric.sum,
      point.metric.contributors,
      point.metric.coverage.missing,
      point.metric.coverage.notAdmitted,
      point.metric.coverage.heldProfile,
      point.metric.coverage.heldObservation,
      point.metric.coverage.heldQuality,
      point.metric.coverage.heldComponent,
    ]),
  )
}
