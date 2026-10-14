import { plural, t } from '@lingui/core/macro'
import { compareDecimal, sumDecimals, type DecimalLocale } from '@/lib/exact-decimal'
import { countyNameRo } from '@/lib/territory-counties'
import {
  COMPANY_ANALYSIS_SELECTING_BASES,
  COMPANY_ANALYSIS_SIZE_BANDS,
  type CompanyAnalysisBucket,
  type CompanyAnalysisCoverage,
  type CompanyAnalysisDimension,
  type CompanyAnalysisMetricAggregate,
  type CompanyAnalysisRelease,
  type CompanyAnalysisSeries,
  type CompanyAnalysisSeriesPoint,
  type CompanyAnalysisSizeBand,
} from '@/schemas/company-analytics'
import { activityText, unclassifiedActivityLabel, unclassifiedBasisOf } from './company-activity-text'
import { compactValue, countText, exactValueText } from './company-analytics-format'
import { isUnresolvedMainActivity, mainActivityBucketText, unresolvedMainLabel, unresolvedMainStatusOf } from './company-analytics-main-activity'
import { orderedGroups } from './company-analytics-order'
import { basisGroupLabel, caenText, flagLabel, gapReasonLabel, labelSourceText, metricLabel, placeName, sizeBandLabel } from './company-analytics-text'

/**
 * What the analysis page draws, worked out from the answers: the headline,
 * the figures and their notes, a breakdown row's name, a year's sentence.
 * Pure, so each can be checked against the API's exact strings: a null sum
 * is said as „no value reported" and never drawn as 0.
 */

// ─────────────────────────────────────────────────────────────── figures ──

export interface Fact {
  readonly key: string
  readonly value: string
  readonly unit?: string
  readonly label: string
  readonly notes: readonly string[]
}

export function heldOf(coverage: CompanyAnalysisCoverage): string {
  return sumDecimals([coverage.heldProfile, coverage.heldObservation, coverage.heldQuality, coverage.heldComponent]) ?? '0'
}

/** A count of companies with its noun, the count as `countText` writes it: „1 firmă", „12 firme", „1.234 de firme". */
export function companiesCountText(count: string, locale: DecimalLocale): string {
  const text = countText(count, locale)
  return plural(Number(count), { one: `${text} firmă`, few: `${text} firme`, other: `${text} de firme` })
}

/** The reference-year cohort in a sentence, agreeing with its count: one company is „aceeași firmă, selectată". */
export function cohortSentence(count: string, year: number, locale: DecimalLocale): string {
  const text = countText(count, locale)
  return plural(Number(count), {
    one: `Fiecare an arată aceeași firmă, selectată în ${year}.`,
    few: `Fiecare an arată aceleași ${text} firme, selectate în ${year}.`,
    other: `Fiecare an arată aceleași ${text} de firme, selectate în ${year}.`,
  })
}

/** A measure's figure: its sum on one scale with the exact value under it, or why there is none — never a 0 for nothing reported. */
export function metricFact(aggregate: CompanyAnalysisMetricAggregate, locale: DecimalLocale): Fact {
  const label = metricLabel(aggregate.metric)
  if (aggregate.sum === null) return { key: aggregate.metric, value: '—', label, notes: [t`nicio firmă nu a raportat o valoare`] }
  const compact = compactValue(aggregate.sum, aggregate.unit, locale)
  return {
    key: aggregate.metric,
    value: compact.value,
    unit: compact.unit,
    label,
    notes: [t`raportat de ${companiesCountText(aggregate.contributors, locale)}`, exactValueText(aggregate.sum, aggregate.unit, locale)],
  }
}

// ────────────────────────────────────────────────────────────── breakdown ──

/** County, locality and status are consensus groupings: every company is in a value group or a basis group, and their `unknown` is an empty slot. */
export const CONSENSUS_DIMENSIONS: ReadonlySet<CompanyAnalysisDimension> = new Set(['COUNTY', 'UAT', 'OBSERVED_STATUS'])

/**
 * The rows an axis shows, in three parts that add up to the total: the
 * groups, ranked (basis groups among them, ranked like any; the sizes in
 * their own order); apart, „other" when it folds any and the unknown group
 * — except a consensus grouping's or the derived activity's, which the API
 * keeps empty (shown only if it ever were not); and last the derived
 * activity's unclassified buckets, never ranked.
 */
export function breakdownRows(breakdown: {
  readonly dimension: CompanyAnalysisDimension
  readonly groups: readonly CompanyAnalysisBucket[]
  readonly other: CompanyAnalysisBucket
  readonly unknown: CompanyAnalysisBucket
  readonly unclassified?: readonly CompanyAnalysisBucket[]
}): { readonly ranked: readonly CompanyAnalysisBucket[]; readonly rest: readonly CompanyAnalysisBucket[]; readonly tail: readonly CompanyAnalysisBucket[] } {
  const emptySlot = (CONSENSUS_DIMENSIONS.has(breakdown.dimension) || breakdown.dimension === 'ACTIVITY' || breakdown.dimension === 'MAIN_ACTIVITY') && breakdown.unknown.companies === '0'
  const tail = activityTail(breakdown)
  return {
    ranked: orderedGroups(breakdown.dimension, breakdown.groups.filter((bucket) => !tail.includes(bucket))),
    rest: [...(breakdown.other.groups > 0 ? [breakdown.other] : []), ...(emptySlot ? [] : [breakdown.unknown])],
    tail,
  }
}

/** A derived-activity bucket that selects no named activity: several classes, an uncatalogued ANAF code, no qualified selection. Never a sector, never ranked. */
export function isUnclassifiedActivity(bucket: CompanyAnalysisBucket): boolean {
  const basis = unclassifiedBasisOf(bucket)
  return basis !== null && !COMPANY_ANALYSIS_SELECTING_BASES.has(basis)
}

/**
 * The derived activity's unclassified buckets — the API's own, and any group
 * that selects no named activity (never ranked, wherever it was sent) — in
 * the API's order; the same for the main activity's unresolved statuses (v4).
 * Empty for every other dimension.
 */
export function activityTail(breakdown: { readonly dimension: CompanyAnalysisDimension; readonly groups: readonly CompanyAnalysisBucket[]; readonly unclassified?: readonly CompanyAnalysisBucket[] }): readonly CompanyAnalysisBucket[] {
  if (breakdown.dimension === 'MAIN_ACTIVITY') return [...breakdown.groups.filter(isUnresolvedMainActivity), ...(breakdown.unclassified ?? [])]
  if (breakdown.dimension !== 'ACTIVITY') return []
  return [...breakdown.groups.filter(isUnclassifiedActivity), ...(breakdown.unclassified ?? [])]
}

export function groupLabel(dimension: CompanyAnalysisDimension, bucket: CompanyAnalysisBucket): string {
  if (bucket.kind === 'OTHER') return plural(bucket.groups, { one: 'Încă un grup', few: 'Alte # grupuri', other: 'Alte # de grupuri' })
  if (bucket.kind === 'TOTAL') return t`Total`
  // A consensus group without a value: why it has none, never a key in parentheses or an „unknown".
  if (bucket.kind === 'GROUP' && bucket.basis !== null) return basisGroupLabel(dimension, bucket.basis)
  if (bucket.kind === 'UNKNOWN') {
    switch (dimension) {
      case 'COUNTY':
        return t`Județ necunoscut`
      case 'UAT':
        return t`Localitate neidentificată`
      case 'MAIN_CAEN':
        return t`Fără cod CAEN fiscal ANAF`
      case 'ACTIVITY':
        return t`Fără activitate selectată`
      case 'MAIN_ACTIVITY':
        return t`Fără activitate principală presupusă`
      case 'OBSERVED_STATUS':
        return t`Stare necunoscută`
      case 'EMPLOYEE_SIZE':
        return t`Fără situație sau fără salariați raportați`
      case 'VAT_PAYER':
      case 'FISCALLY_INACTIVE':
        return t`Necunoscut (fără observație ANAF)`
      default:
        return t`Necunoscut`
    }
  }
  const key = bucket.key ?? ''
  switch (dimension) {
    // A place by its name, not the registry's capitals („Cluj", „Sectorul 1").
    case 'COUNTY':
      return countyNameRo(key) ?? (bucket.label ? placeName(bucket.label) : key)
    case 'UAT':
      return bucket.label ? placeName(bucket.label) : key
    case 'MAIN_CAEN':
      return bucket.caen ? caenText(bucket.caen) : key
    case 'ACTIVITY':
      if (isUnclassifiedActivity(bucket)) return unclassifiedActivityLabel(unclassifiedBasisOf(bucket))
      return bucket.activity ? activityText(bucket.activity) : key
    case 'MAIN_ACTIVITY': {
      const unresolved = unresolvedMainStatusOf(bucket)
      if (unresolved !== null) return unresolvedMainLabel(unresolved)
      return bucket.mainActivity ? mainActivityBucketText(bucket.mainActivity) : key
    }
    case 'VAT_PAYER':
    case 'FISCALLY_INACTIVE':
      return key === 'YES' || key === 'NO' ? flagLabel(key) : key
    case 'EMPLOYEE_SIZE':
      return (COMPANY_ANALYSIS_SIZE_BANDS as readonly string[]).includes(key) ? sizeBandLabel(key as CompanyAnalysisSizeBand) : key
    default:
      return bucket.label ?? key
  }
}

/** The sources of the names a set of rows shows, each once, in words („nomenclatorul teritorial al platformei"). */
export function labelSourcesOf(sources: readonly (string | null | undefined)[]): readonly string[] {
  return [...new Set(sources.filter((source): source is string => typeof source === 'string' && source.length > 0))].map(labelSourceText)
}

// ───────────────────────────────────────────────────────────────── series ──

/** A year in words: its exact figure and who reported it, or why it has none. */
export function pointText(point: CompanyAnalysisSeriesPoint, series: CompanyAnalysisSeries, locale: DecimalLocale): string {
  const sum = point.metric.sum
  if (!point.available || sum === null) return t`${point.fiscalYear}: ${gapReasonLabel(point.available ? 'NO_REPORTED_VALUES' : point.gapReason)}`
  return t`${point.fiscalYear}: ${exactValueText(sum, series.unit, locale)} · raportat de ${countText(point.metric.contributors, locale)} din ${companiesCountText(point.filers, locale)} cu situație`
}

/** The last year when it holds fewer statements than the year before: observed partial coverage (a recent year still being filed), never „complete". */
export function partialYears(release: CompanyAnalysisRelease): ReadonlySet<number> {
  const years = [...release.years].sort((a, b) => a.fiscalYear - b.fiscalYear)
  const last = years[years.length - 1]
  const before = years[years.length - 2]
  return last && before && compareDecimal(last.statements, before.statements) < 0 ? new Set([last.fiscalYear]) : new Set()
}
