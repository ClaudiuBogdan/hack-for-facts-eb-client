import { isDecimalString } from '@/lib/exact-decimal'
import type { CompanyAnalysisBreakdown, CompanyAnalysisBucket, CompanyAnalysisReleaseRef, CompanyAnalysisRecords, CompanyAnalysisSeries } from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../api/company-analytics-plan'

/**
 * What the page shows, as a file a reader can check: the API's own digits
 * (no rounding, no scale, no thousands separators), an empty cell where the
 * API has no value — never a 0 — the release every row was read from and the
 * ONRC edition it was exported from, a date as the exact civil text the API
 * sent. Bounded by what the page read: one page of companies, a breakdown's
 * rows, a series' years.
 */

const SOURCE_HEADER = ['source_edition_id', 'source_publication_epoch', 'source_published_at'] as const

function sourceCells(release: CompanyAnalysisReleaseRef) {
  return [release.source.editionId, release.source.publicationEpoch, release.source.sourcePublishedAt]
}

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
  const header = [
    'release_id',
    ...SOURCE_HEADER,
    'fiscal_year',
    'cui',
    'current_name',
    'legal_form',
    'legal_form_basis',
    'county_code',
    'county_basis',
    'uat_siruta',
    'uat_basis',
    'observed_status_code',
    'observed_status_basis',
    'observed_status_coverage',
    'onrc_caen_coverage',
    'onrc_recorded_date',
    'onrc_recorded_date_basis',
    'vat_payer',
    'fiscally_inactive',
    'main_caen_code',
    'main_caen_revision',
    'filed',
    'employee_size_band',
    ...metrics.flatMap((metric) => [metric.toLowerCase(), `${metric.toLowerCase()}_status`]),
  ]
  const rows = records.edges.map(({ node }) => [
    records.release.releaseId,
    ...sourceCells(records.release),
    records.fiscalYear,
    node.cui,
    node.currentName,
    node.legalForm,
    node.legalFormBasis,
    node.county?.code,
    node.countyBasis,
    node.uat?.code,
    node.uatBasis,
    node.observedStatus?.code,
    node.observedStatusBasis,
    node.observedStatusCoverage,
    node.onrcCaenCoverage,
    node.onrcRecordedDate,
    node.onrcRecordedDateBasis,
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
    ...sourceCells(breakdown.release),
    breakdown.fiscalYear,
    breakdown.dimension,
    bucket.kind,
    bucket.key,
    bucket.basis,
    bucket.label ?? bucket.caen?.label ?? null,
    bucket.labelSource,
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
  const header = ['release_id', ...SOURCE_HEADER, 'fiscal_year', 'dimension', 'bucket', 'key', 'basis', 'label', 'label_source', 'groups', 'companies', 'filers', 'metric', 'sum', 'contributors', 'missing', 'not_admitted', 'held_profile', 'held_observation', 'held_quality', 'held_component']
  // Every bucket the API answered, the empty unknown slot of a consensus grouping too: the file adds up as the API's does.
  const buckets = [...breakdown.groups, breakdown.other, breakdown.unknown, breakdown.totals]
  return csvOf(header, buckets.map((bucket) => bucketRow(breakdown, bucket)))
}

export function seriesCsv(series: CompanyAnalysisSeries): string {
  const header = ['release_id', ...SOURCE_HEADER, 'fiscal_year', 'metric', 'unit', 'cohort_mode', 'reference_year', 'available', 'gap_reason', 'companies', 'filers', 'sum', 'contributors', 'missing', 'not_admitted', 'held_profile', 'held_observation', 'held_quality', 'held_component']
  return csvOf(
    header,
    series.points.map((point) => [
      series.release.releaseId,
      ...sourceCells(series.release),
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
