import { t } from '@lingui/core/macro'
import { compareDecimal, decimalSign, decimalToPlot, type DecimalLocale } from '@/lib/exact-decimal'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import {
  COMPANY_ANALYSIS_SIZE_BANDS,
  metricOfferedIn,
  yearCapabilityOf,
  type CompanyAnalysisBreakdown,
  type CompanyAnalysisBucket,
  type CompanyAnalysisDimension,
  type CompanyAnalysisMetric,
  type CompanyAnalysisRecords,
  type CompanyAnalysisRelease,
  type CompanyAnalysisScope,
  type CompanyAnalysisSizeBand,
  type CompanyAnalysisStats,
  type CompanyAnalysisStatus,
} from '@/schemas/company-analytics'
import type { CompanyHubSearch, CompanyHubSectorMetric } from '@/schemas/private-company-search'
import type { ResolvedQuestion } from '../api/company-analytics-plan'
import { drillScope } from './company-analytics-drill'
import { compactValue, countText, shareText } from './company-analytics-format'
import { caenText, countyLabel } from './company-analytics-text'
import { DEFAULT_STATE, urlSearchOf, type AnalyticsPanel, type CompanyAnalyticsState, type CompanyAnalyticsUrlSearch } from './company-analytics-url'
import { metricFact, partialYears, type Fact } from './company-analytics-view'
import type { HubCountyLayer, HubCountyValue } from './hub-counties'
import { hubUnitWord, type HubUnit } from './hub-format'

/**
 * The `/companies` hub's figures, worked out from the companies analytics
 * answers of ONE release and its default fiscal year: the hub asks the
 * analysis page's own questions (same reads, same cache keys) and draws
 * them. Pure, so each rule can be checked against the API's exact strings:
 * a null sum is no value and never a 0, a held or missing value is not in a
 * sum, a share is only of a positive whole, a CAEN code of unknown revision
 * stays unknown, and only a plotting coordinate becomes a number.
 */

// ──────────────────────────────────────────────────────────── measures ──

/** What a hub ranking, map or list measures: a reported sum, or the companies with a statement for the year. */
export type HubMeasure = 'TURNOVER' | 'EMPLOYEES' | 'FILERS'

const MEASURE_OF_WORD: Readonly<Record<CompanyHubSectorMetric, HubMeasure>> = { 'cifra-de-afaceri': 'TURNOVER', salariati: 'EMPLOYEES', firme: 'FILERS' }
const WORD_OF_MEASURE: Readonly<Record<HubMeasure, CompanyHubSectorMetric>> = { TURNOVER: 'cifra-de-afaceri', EMPLOYEES: 'salariati', FILERS: 'firme' }

export const DEFAULT_HUB_MEASURE: HubMeasure = 'TURNOVER'

/** The measure as the hub's address writes it (`cifra-de-afaceri`, `salariati`, `firme`). */
export function hubMeasureWord(measure: HubMeasure): CompanyHubSectorMetric {
  return WORD_OF_MEASURE[measure]
}

/** The analytics metric a measure sums; null for the companies with a statement (a count every answer carries). */
export function metricOfMeasure(measure: HubMeasure): CompanyAnalysisMetric | null {
  return measure === 'FILERS' ? null : measure
}

export function hubMeasureUnit(measure: HubMeasure): HubUnit {
  return measure === 'TURNOVER' ? 'lei' : measure === 'EMPLOYEES' ? 'persons' : 'firms'
}

export function hubMeasureLabel(measure: HubMeasure): string {
  if (measure === 'TURNOVER') return t`Cifra de afaceri`
  if (measure === 'EMPLOYEES') return t`Salariați`
  return t`Firme cu situație`
}

// ────────────────────────────────────────────────────── year and choices ──

/** The fiscal year the hub reads: the release's default, when the release holds it. Null otherwise — never another year in silence. */
export function hubYearOf(release: CompanyAnalysisRelease): number | null {
  const year = release.defaults.fiscalYear
  return release.fiscalYears.includes(year) ? year : null
}

/** The measures the year offers, in the toggles' order: a sum only where the release admits its metric for the year; the companies with a statement always. */
export function offeredHubMeasures(release: CompanyAnalysisRelease, year: number): readonly HubMeasure[] {
  const sums = (['TURNOVER', 'EMPLOYEES'] as const).filter((metric) => metricOfferedIn(release, year, metric))
  return [...sums, 'FILERS']
}

/** A reported sum the hub ranks companies and draws years by. */
export type HubSumMeasure = Exclude<HubMeasure, 'FILERS'>

/** The metrics the ranking of the largest companies and the years may use: turnover and employees, where the year offers them. */
export function offeredRankings(release: CompanyAnalysisRelease, year: number): readonly HubSumMeasure[] {
  return (['TURNOVER', 'EMPLOYEES'] as const).filter((metric) => metricOfferedIn(release, year, metric))
}

export interface HubChoices {
  /** The ranking's metric; null when the year offers neither turnover nor employees. */
  readonly ranking: HubSumMeasure | null
  readonly sectors: HubMeasure
  readonly map: HubMeasure
}

/** A measure the address asks for, kept only while the year offers it; otherwise the companies with a statement, which every year has. */
function offeredOrFilers(word: CompanyHubSectorMetric | undefined, offered: readonly HubMeasure[]): HubMeasure {
  const asked = word ? MEASURE_OF_WORD[word] : DEFAULT_HUB_MEASURE
  return offered.includes(asked) ? asked : 'FILERS'
}

export function hubChoicesOf(search: CompanyHubSearch, release: CompanyAnalysisRelease, year: number): HubChoices {
  const rankings = offeredRankings(release, year)
  const asked = MEASURE_OF_WORD[search.clasament ?? 'cifra-de-afaceri']
  const offered = offeredHubMeasures(release, year)
  return {
    ranking: rankings.find((metric) => metric === asked) ?? rankings[0] ?? null,
    sectors: offeredOrFilers(search.domenii, offered),
    map: offeredOrFilers(search.indicator, offered),
  }
}

// ───────────────────────────────────────────────── analysis-page questions ──

/**
 * The analysis page's question a hub section asks, in its own state: the
 * year written out, the measure's metric (the page's default one for the
 * companies with a statement) and how the groups are ranked. The plans the
 * page uses turn it into the same reads under the same keys.
 */
export function hubQuestionState(year: number, measure: HubMeasure): CompanyAnalyticsState {
  return { ...DEFAULT_STATE, year, metric: metricOfMeasure(measure), rankBy: measure === 'FILERS' ? 'FILERS' : 'METRIC_SUM', cohort: 'EACH_YEAR' }
}

/**
 * A link into the analysis page for a question the hub asked: its year,
 * release, metric and ranking written out — never left to the release's
 * defaults — so the page resolves the very same question (the series' cohort
 * too, on the years' panel); the panel and grouping it opens on; and, for a
 * list, the scope that narrows it. The page's own writer builds the address.
 */
export function hubAnalyticsLink(
  question: ResolvedQuestion,
  view: {
    readonly panel: AnalyticsPanel
    readonly dimension?: CompanyAnalysisDimension
    readonly metric?: CompanyAnalysisMetric
    readonly scope?: CompanyAnalysisScope
  },
): CompanyAnalyticsUrlSearch {
  return urlSearchOf({
    ...DEFAULT_STATE,
    year: question.year,
    release: question.release,
    metric: view.metric ?? question.metric,
    rankBy: question.rankBy,
    cohort: view.panel === 'evolutie' ? question.cohortMode : null,
    panel: view.panel,
    dimension: view.dimension ?? DEFAULT_STATE.dimension,
    scope: view.scope ?? {},
  })
}

/** The companies with a statement for the year: the list behind the figure that counts them. */
export const FILED_SCOPE: CompanyAnalysisScope = { filing: 'FILED' }

/**
 * A county's companies with a statement for the year, as the map counted
 * them — the county the analysis's ONRC edition agrees on, any registry
 * status — listed in the analysis by the map's question. Null for a group no
 * filter selects exactly.
 */
export function hubCountyDrill(question: ResolvedQuestion, bucket: CompanyAnalysisBucket): CompanyAnalyticsUrlSearch | null {
  const scope = drillScope(FILED_SCOPE, 'COUNTY', bucket)
  return scope ? hubAnalyticsLink(question, { panel: 'firme', scope }) : null
}

// ──────────────────────────────────────────────────────── exact values ──

/** A bucket's value for a measure: its metric's sum — null when nothing was reported — or its companies with a statement. */
export function bucketValue(bucket: CompanyAnalysisBucket, measure: HubMeasure): string | null {
  if (measure === 'FILERS') return bucket.filers
  // A breakdown of another metric holds no value of this one.
  return bucket.metric?.metric === measure ? bucket.metric.sum : null
}

/** A value on one scale with its unit: „1.234,6 mld. lei", „12.345 salariați", „965.213 firme". */
export function hubValueText(value: string, measure: HubMeasure, locale: DecimalLocale): { readonly value: string; readonly unit: string } {
  if (measure === 'FILERS') return { value: countText(value, locale), unit: hubUnitWord('firms') }
  return compactValue(value, measure === 'EMPLOYEES' ? 'HEADCOUNT' : 'RON', locale)
}

/**
 * A part's share of a whole („12,3%"), only of a positive whole and a part
 * that is not negative: a share of a loss, of a negative total or of nothing
 * would mislead, so there is none.
 */
export function hubShare(part: string | null, whole: string | null, locale: DecimalLocale): string | null {
  if (part === null || whole === null) return null
  if (decimalSign(whole) !== 1 || decimalSign(part) === -1 || decimalSign(part) === null) return null
  return shareText(part, whole, locale)
}

/**
 * Whether the parts of a partition — every group, the folded ones and the
 * unknown — can be read as shares of their total: none of them negative. A
 * loss among them makes the others add up to more than the whole (100 beside
 * -40 is not 166.7% of anything), so then no part has a share; every value
 * is still shown as it is.
 */
export function sharesHold(parts: readonly (string | null)[]): boolean {
  return parts.every((part) => part === null || decimalSign(part) !== -1)
}

/** A bar's length against the longest, in percent: 0 for a value that is missing, negative or not a number — never NaN. */
export function barPercent(value: string | null, max: number): number {
  const plot = decimalToPlot(value)
  if (plot === null || plot <= 0 || !(max > 0)) return 0
  return Math.min(100, (plot / max) * 100)
}

/** The longest bar's value among a set: the largest positive plotting coordinate, 0 when there is none. */
export function barMax(values: readonly (string | null)[]): number {
  return values.reduce<number>((max, value) => {
    const plot = decimalToPlot(value)
    return plot !== null && plot > max ? plot : max
  }, 0)
}

// ─────────────────────────────────────────────────────────── the figures ──

export interface HubFigure extends Fact {
  /** The metric the figure sums, for its link; null for the companies with a statement. */
  readonly metric: CompanyAnalysisMetric | null
}

const FIGURE_METRICS: readonly CompanyAnalysisMetric[] = ['TURNOVER', 'EMPLOYEES', 'NET_RESULT']

/**
 * The four national figures of the year: the companies with a statement (of
 * the eligible companies), then turnover, employees and net result where the
 * year offers them — each with who reported it and its exact value, or why
 * there is none.
 */
export function hubFiguresOf(stats: CompanyAnalysisStats, year: number, locale: DecimalLocale): readonly HubFigure[] {
  const filers: HubFigure = {
    key: 'filers',
    metric: null,
    value: countText(stats.filers, locale),
    label: t`Firme cu situație financiară pe ${year}`,
    notes: [t`din ${countText(stats.companies, locale)} firme eligibile din registru, în orice stare`],
  }
  const sums = FIGURE_METRICS.flatMap((metric) => {
    const aggregate = stats.metrics.find((entry) => entry.metric === metric)
    return aggregate ? [{ ...metricFact(aggregate, locale), metric }] : []
  })
  return [filers, ...sums]
}

/** What the year's figures cover: its statements, and whether the year is still being filed. */
export function hubCoverageText(release: CompanyAnalysisRelease, year: number, locale: DecimalLocale): string {
  const statements = yearCapabilityOf(release, year)?.statements
  const filed = statements ? t`Anul fiscal ${year}: ${countText(statements, locale)} situații financiare` : t`Anul fiscal ${year}`
  return partialYears(release).has(year) ? `${filed} · ${t`mai puține decât anul precedent: acoperire parțială observată`}` : filed
}

// ───────────────────────────────────────────────────────── the rankings ──

export interface HubRow {
  readonly key: string
  readonly bucket: CompanyAnalysisBucket
  /** The exact value, or null when the group has none for the measure. */
  readonly value: string | null
  readonly share: string | null
  /** The bar's length, 0–100. */
  readonly bar: number
}

export interface HubRanking {
  readonly rows: readonly HubRow[]
  /** The groups the answer folds together, when it folds any. */
  readonly other: HubRow | null
  /** The companies without the dimension's value (no declared main activity, no statement), when there are any. */
  readonly unknown: HubRow | null
  readonly total: string | null
}

/** Every part of a breakdown — the groups, the folded ones, the unknown — in a measure. */
function partsOf(breakdown: CompanyAnalysisBreakdown, measure: HubMeasure): readonly (string | null)[] {
  return [...breakdown.groups, breakdown.other, breakdown.unknown].map((bucket) => bucketValue(bucket, measure))
}

/**
 * A breakdown's groups in the API's order, each with its share of the
 * answer's total — none at all when a part is negative — and a bar against
 * the largest.
 */
export function hubRankingOf(breakdown: CompanyAnalysisBreakdown, measure: HubMeasure, locale: DecimalLocale): HubRanking {
  const total = bucketValue(breakdown.totals, measure)
  const whole = sharesHold(partsOf(breakdown, measure)) ? total : null
  const max = barMax(breakdown.groups.map((bucket) => bucketValue(bucket, measure)))
  const rowOf = (bucket: CompanyAnalysisBucket, key: string): HubRow => {
    const value = bucketValue(bucket, measure)
    return { key, bucket, value, share: hubShare(value, whole, locale), bar: barPercent(value, max) }
  }
  const empty = (bucket: CompanyAnalysisBucket) => bucket.companies === '0'
  return {
    rows: breakdown.groups.map((bucket, index) => rowOf(bucket, bucket.key ?? `group-${index}`)),
    other: breakdown.other.groups > 0 ? rowOf(breakdown.other, 'other') : null,
    unknown: empty(breakdown.unknown) ? null : rowOf(breakdown.unknown, 'unknown'),
    total,
  }
}

/** A main activity: its code with the catalogue label of its OWN revision, or marked as of unknown revision — never given one. */
export function caenRowLabel(bucket: CompanyAnalysisBucket): string {
  return bucket.caen ? caenText(bucket.caen) : (bucket.label ?? bucket.key ?? '—')
}

/** The revision a main activity code was declared in, as a tag („CAEN rev2"); null when ANAF did not publish it. */
export function caenRevisionTag(bucket: CompanyAnalysisBucket): string | null {
  return bucket.caen?.revision ? `CAEN ${bucket.caen.revision}` : null
}

// ─────────────────────────────────────────────────────────── size bands ──

export interface HubSizeRow {
  readonly band: CompanyAnalysisSizeBand
  readonly filers: string
  readonly filersShare: string | null
  /** The band's exact sum of the measure; null when nothing in it was reported (never a 0), and for the companies with a statement. */
  readonly value: string | null
  /** The band's share of the measure's sum; null for the companies with a statement (their share is `filersShare`), without a positive total, or when any part is negative. */
  readonly valueShare: string | null
}

/**
 * The companies with a statement by size band, in the bands' own order: how
 * many each holds, and of the measure's sum. The statements without a
 * reported headcount are in the API's unknown group — beside the companies
 * without a statement, which hold no statement and no value — so they are
 * the unavailable band here, counted by their statements only.
 */
export function hubSizeRowsOf(breakdown: CompanyAnalysisBreakdown, measure: HubMeasure, locale: DecimalLocale): readonly HubSizeRow[] {
  const byBand = new Map<string, CompanyAnalysisBucket>(breakdown.groups.flatMap((bucket) => (bucket.key && bucket.key !== 'UNAVAILABLE' ? [[bucket.key, bucket] as const] : [])))
  if (breakdown.unknown.filers !== '0') byBand.set('UNAVAILABLE', breakdown.unknown)
  const totalValue = measure === 'FILERS' || !sharesHold(partsOf(breakdown, measure)) ? null : bucketValue(breakdown.totals, measure)
  return COMPANY_ANALYSIS_SIZE_BANDS.flatMap((band) => {
    const bucket = byBand.get(band)
    if (!bucket) return []
    const value = measure === 'FILERS' ? null : bucketValue(bucket, measure)
    return [{ band, filers: bucket.filers, filersShare: hubShare(bucket.filers, breakdown.totals.filers, locale), value, valueShare: hubShare(value, totalValue, locale) }]
  })
}

// ───────────────────────────────────────────────────────────── counties ──

/** A county on the map: its plotting coordinate, the exact value every text shows, and the answer's group it is (its drill). */
export interface HubCountyFigure extends HubCountyValue {
  readonly exact: string
  readonly bucket: CompanyAnalysisBucket
}

export interface HubCountyMapLayer extends HubCountyLayer {
  readonly measure: HubMeasure
  readonly values: readonly HubCountyFigure[]
  /** The answer's total, exact: every company of the year, those without a common county included. */
  readonly nationalExact: string | null
  /** The total a county's or group's share is of; null when a part is negative and no part has a share. */
  readonly shareWhole: string | null
  /** The groups that are not a county on the map — no common county (by why), folded, or a code the map does not hold — with their values. */
  readonly outside: readonly { readonly bucket: CompanyAnalysisBucket; readonly value: string | null }[]
}

const COUNTY_CODES: ReadonlySet<string> = new Set(ROMANIA_COUNTIES.map((county) => county.code))

/**
 * The county layer of a COUNTY breakdown: each county with a value for the
 * measure, keyed by its code. A county with no reported value is left off
 * (hatched and named on the map, never zero); the companies without a common
 * county are listed beside the map, by why.
 */
export function hubCountyLayerOf(breakdown: CompanyAnalysisBreakdown, measure: HubMeasure): HubCountyMapLayer {
  const values: HubCountyFigure[] = []
  const outside: { bucket: CompanyAnalysisBucket; value: string | null }[] = []
  for (const bucket of breakdown.groups) {
    const value = bucketValue(bucket, measure)
    const plot = decimalToPlot(value)
    if (bucket.basis === null && bucket.key !== null && COUNTY_CODES.has(bucket.key)) {
      if (value !== null && plot !== null) values.push({ code: bucket.key, value: plot, exact: value, bucket })
    } else {
      outside.push({ bucket, value })
    }
  }
  if (breakdown.other.groups > 0) outside.push({ bucket: breakdown.other, value: bucketValue(breakdown.other, measure) })
  if (breakdown.unknown.companies !== '0') outside.push({ bucket: breakdown.unknown, value: bucketValue(breakdown.unknown, measure) })
  const nationalExact = bucketValue(breakdown.totals, measure)
  const shareWhole = sharesHold(partsOf(breakdown, measure)) ? nationalExact : null
  return { measure, unit: hubMeasureUnit(measure), values, national: decimalToPlot(nationalExact) ?? 0, nationalExact, shareWhole, outside }
}

/** Highest first, by the exact values; ties keep the order they arrive in. */
export function rankHubCounties(values: readonly HubCountyFigure[]): readonly HubCountyFigure[] {
  return [...values].sort((a, b) => compareDecimal(b.exact, a.exact))
}

/** A group that is not on the map, by name: why it has no common county, the folded groups, or the county's own label. */
export function outsideLabel(bucket: CompanyAnalysisBucket): string {
  if (bucket.kind === 'OTHER') return t`Alte ${bucket.groups} grupuri`
  if (bucket.kind === 'UNKNOWN') return t`Județ necunoscut`
  return bucket.label ?? (bucket.key ? countyLabel(bucket.key) : '—')
}

// ──────────────────────────────────────────────────────────── the leaders ──

export interface HubLeader {
  readonly cui: string
  /** The current public name in the directory; null when the company is not publicly named. */
  readonly name: string | null
  readonly county: string | null
  readonly caen: string | null
  /** The reported value; null for any other status. */
  readonly value: string | null
  readonly status: CompanyAnalysisStatus | null
}

/** The first companies of a records page ranked by one metric, each with its value of that metric only. */
export function hubLeadersOf(records: CompanyAnalysisRecords, metric: CompanyAnalysisMetric, limit: number): readonly HubLeader[] {
  return records.edges.slice(0, limit).map(({ node }) => {
    const entry = node.values.find((item) => item.metric === metric)
    return {
      cui: node.cui,
      name: node.currentName,
      county: node.county ? (node.county.label ?? countyLabel(node.county.code)) : null,
      caen: node.mainCaen && node.mainCaen.basis !== 'MISSING' ? caenText(node.mainCaen) : null,
      value: entry?.status === 'REPORTED' ? entry.value : null,
      status: entry?.status ?? null,
    }
  })
}
