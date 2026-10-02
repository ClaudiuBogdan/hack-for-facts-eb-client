import { t } from '@lingui/core/macro'
import { compareDecimal, sumDecimals, type DecimalLocale } from '@/lib/exact-decimal'
import {
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
import { compactValue, countText, exactValueText, shareText } from './company-analytics-format'
import type { ScopeNames } from './company-analytics-scope-text'
import { caenText, countyLabel, flagLabel, gapReasonLabel, metricLabel, placePhrase, sizeBandLabel } from './company-analytics-text'
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

export function groupLabel(dimension: CompanyAnalysisDimension, bucket: CompanyAnalysisBucket): string {
  if (bucket.kind === 'OTHER') return t`Alte ${bucket.groups} grupuri`
  if (bucket.kind === 'TOTAL') return t`Total`
  if (bucket.kind === 'UNKNOWN') {
    switch (dimension) {
      case 'COUNTY':
        return t`Județ necunoscut`
      case 'UAT':
        return t`Localitate neidentificată`
      case 'MAIN_CAEN':
        return t`Fără activitate principală declarată`
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
    case 'COUNTY':
      return bucket.label ?? countyLabel(key)
    case 'MAIN_CAEN':
      return bucket.caen ? caenText(bucket.caen) : key
    case 'VAT_PAYER':
    case 'FISCALLY_INACTIVE':
      return key === 'YES' || key === 'NO' ? flagLabel(key) : key
    case 'EMPLOYEE_SIZE':
      return (COMPANY_ANALYSIS_SIZE_BANDS as readonly string[]).includes(key) ? sizeBandLabel(key as CompanyAnalysisSizeBand) : key
    default:
      return bucket.label ?? key
  }
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
