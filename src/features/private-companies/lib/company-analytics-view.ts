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
  type CompanyAnalysisStats,
} from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../api/company-analytics-plan'
import { activityText, unclassifiedActivityLabel, unclassifiedBasisOf } from './company-activity-text'
import { compactValue, countText, exactValueText, shareText } from './company-analytics-format'
import type { ScopeNames } from './company-analytics-scope-text'
import { basisGroupLabel, caenText, flagLabel, gapReasonLabel, labelSourceText, metricLabel, placeName, placePhrase, sizeBandLabel } from './company-analytics-text'
import type { CompanyAnalyticsState } from './company-analytics-url'

/**
 * What the analysis page draws, worked out from the answers: the headline,
 * the figures and their notes, a breakdown row's name, a year's sentence.
 * Pure, so each can be checked against the API's exact strings: a null sum
 * is said as „no value reported" and never drawn as 0.
 */

/** The question as a sentence: „Cifra de afaceri în județul Cluj, anul fiscal 2024". */
export function headlineOf(state: CompanyAnalyticsState, question: ResolvedQuestion, names: ScopeNames): string {
  return t`${metricLabel(question.metric)} ${placePhrase(state.scope, names.uats ?? new Map())}, anul fiscal ${question.year}`
}

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

export function statementsOf(coverage: CompanyAnalysisCoverage): string {
  return sumDecimals([coverage.reported, coverage.missing, coverage.notAdmitted, heldOf(coverage)]) ?? '0'
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
    notes: [t`raportat de ${countText(aggregate.contributors, locale)} firme`, exactValueText(aggregate.sum, aggregate.unit, locale)],
  }
}

export function factsOf(stats: CompanyAnalysisStats, question: ResolvedQuestion, locale: DecimalLocale): { readonly main: readonly Fact[]; readonly more: readonly Fact[] } {
  const selected = stats.metrics.find((aggregate) => aggregate.metric === question.metric)
  const main: Fact[] = [
    { key: 'companies', value: countText(stats.companies, locale), label: t`Firme eligibile în selecție`, notes: [t`persoane juridice din registru, în orice stare`] },
    {
      key: 'filers',
      value: countText(stats.filers, locale),
      label: t`Cu situație financiară pentru ${question.year}`,
      notes: [t`${countText(stats.nonFilers, locale)} fără situație pentru ${question.year}`],
    },
  ]
  if (selected) {
    main.push(metricFact(selected, locale))
    const share = shareText(selected.coverage.reported, statementsOf(selected.coverage), locale)
    main.push({
      key: 'coverage',
      value: share ?? '—',
      label: t`Din situații au valoarea raportată`,
      notes: [t`lipsă ${countText(selected.coverage.missing, locale)} · reținute ${countText(heldOf(selected.coverage), locale)} · neadmise ${countText(selected.coverage.notAdmitted, locale)}`],
    })
  }
  const more = stats.metrics.filter((aggregate) => aggregate.metric !== question.metric).map((aggregate) => metricFact(aggregate, locale))
  return { main, more }
}

// ────────────────────────────────────────────────────────────── breakdown ──

/** County, locality and status are consensus groupings: every company is in a value group or a basis group, and their `unknown` is an empty slot. */
export const CONSENSUS_DIMENSIONS: ReadonlySet<CompanyAnalysisDimension> = new Set(['COUNTY', 'UAT', 'OBSERVED_STATUS'])

/**
 * The rows a breakdown shows, in its order: the groups (basis groups among
 * them, ranked like any), „other" when it folds any, the derived activity's
 * unclassified buckets (never ranked: after every ranked row), and the
 * unknown group — except a consensus grouping's or the derived activity's,
 * which the API keeps empty (shown only if it ever were not, so the rows
 * still add up to the total).
 */
export function breakdownRows(breakdown: {
  readonly dimension: CompanyAnalysisDimension
  readonly groups: readonly CompanyAnalysisBucket[]
  readonly other: CompanyAnalysisBucket
  readonly unknown: CompanyAnalysisBucket
  readonly unclassified?: readonly CompanyAnalysisBucket[]
}): readonly CompanyAnalysisBucket[] {
  const emptySlot = (CONSENSUS_DIMENSIONS.has(breakdown.dimension) || breakdown.dimension === 'ACTIVITY') && breakdown.unknown.companies === '0'
  const tail = activityTail(breakdown)
  return [
    ...breakdown.groups.filter((bucket) => !tail.includes(bucket)),
    ...(breakdown.other.groups > 0 ? [breakdown.other] : []),
    ...tail,
    ...(emptySlot ? [] : [breakdown.unknown]),
  ]
}

/** A derived-activity bucket that selects no named activity: several classes, an uncatalogued ANAF code, no qualified selection. Never a sector, never ranked. */
export function isUnclassifiedActivity(bucket: CompanyAnalysisBucket): boolean {
  const basis = unclassifiedBasisOf(bucket)
  return basis !== null && !COMPANY_ANALYSIS_SELECTING_BASES.has(basis)
}

/**
 * The derived activity's unclassified buckets — the API's own, and any group
 * that selects no named activity (never ranked, wherever it was sent) — in
 * the API's order. Empty for every other dimension.
 */
export function activityTail(breakdown: { readonly dimension: CompanyAnalysisDimension; readonly groups: readonly CompanyAnalysisBucket[]; readonly unclassified?: readonly CompanyAnalysisBucket[] }): readonly CompanyAnalysisBucket[] {
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
  return t`${point.fiscalYear}: ${exactValueText(sum, series.unit, locale)} · raportat de ${countText(point.metric.contributors, locale)} din ${countText(point.filers, locale)} firme cu situație`
}

/** The last year when it holds fewer statements than the year before: observed partial coverage (a recent year still being filed), never „complete". */
export function partialYears(release: CompanyAnalysisRelease): ReadonlySet<number> {
  const years = [...release.years].sort((a, b) => a.fiscalYear - b.fiscalYear)
  const last = years[years.length - 1]
  const before = years[years.length - 2]
  return last && before && compareDecimal(last.statements, before.statements) < 0 ? new Set([last.fiscalYear]) : new Set()
}
