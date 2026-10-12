import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { useCompanyAnalysisBreakdown, useCompanyAnalysisRecords } from '@/features/private-companies/hooks/use-company-analytics'
import { drillScope, nextDimension } from '@/features/private-companies/lib/company-analytics-drill'
import { compactValueText, countText, shareText } from '@/features/private-companies/lib/company-analytics-format'
import { dimensionLabel, metricLabel } from '@/features/private-companies/lib/company-analytics-text'
import { withScope } from '@/features/private-companies/lib/company-analytics-url'
import { groupLabel } from '@/features/private-companies/lib/company-analytics-view'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { decimalToPlot } from '@/lib/exact-decimal'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisBucket, CompanyAnalysisDimension } from '@/schemas/company-analytics'
import type { AnalyticsPageData } from './analytics.data'
import { orderedGroups } from './analytics.order'

/**
 * The answer as charts: the largest companies as bars, and each axis as two
 * shares side by side — of the companies with a statement and of the measure
 * — where the measure can be shared out (no losses in it); as bars either
 * side of zero where it cannot. Only the bars' lengths use floating-point
 * numbers; every figure printed is the API's.
 */

const CHART_PENDING = <div className="h-96 animate-pulse bg-muted/30" aria-hidden="true" />
const TOP_COMPANIES = 15
const TOP_GROUPS = 10

/** A bar's length, as a percent of the longest: never so short it vanishes. */
function barWidth(value: number, largest: number): string {
  return `${Math.max((Math.abs(value) / (largest || 1)) * 100, 0.6).toFixed(1)}%`
}

// ──────────────────────────────────────────────────────────── the companies ──

/**
 * The selection's companies at the top of the measure, each bar its length
 * against the first; a name opens the company. The largest first — or the
 * smallest, where the table is read from the smallest of this measure (the
 * largest losses).
 */
export function TopCompaniesChart({ page }: { readonly page: AnalyticsPageData }) {
  const { question, locale } = page
  const ascending = question?.sortMetric === question?.metric && question?.direction === 'ASC'
  const ranked = question ? { ...question, sortMetric: question.metric, direction: ascending ? ('ASC' as const) : ('DESC' as const) } : null
  const records = useCompanyAnalysisRecords(ranked, null)
  if (records.isError) return <HubLoadError onRetry={() => void records.refetch()} />
  if (!records.data || !question) return CHART_PENDING
  const rows = records.data.edges.flatMap(({ node }) => {
    const value = node.values.find((entry) => entry.metric === question.metric)?.value ?? null
    const plotted = decimalToPlot(value)
    return value !== null && plotted !== null ? [{ node, value, plotted }] : []
  })
  const top = rows.slice(0, TOP_COMPANIES)
  const measure = metricLabel(question.metric)
  if (top.length === 0) return <p className="py-6 text-sm text-muted-foreground">{t`Nicio firmă din selecție nu are o valoare raportată pentru ${measure.toLocaleLowerCase('ro-RO')} în ${question.year}.`}</p>
  const largest = Math.max(...top.map((row) => Math.abs(row.plotted)))
  return (
    <figure>
      <MonoLabel className="text-muted-foreground">{ascending ? t`${measure}, ${question.year}: firmele cu cele mai mici valori` : t`${measure}, ${question.year}: firmele cu cele mai mari valori`}</MonoLabel>
      <ol className="mt-4 space-y-2.5">
        {top.map(({ node, value, plotted }) => (
          <li key={node.cui} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 sm:grid-cols-[16rem_minmax(0,1fr)_7rem]">
            <Link to="/companies/$cui" params={{ cui: node.cui }} className="truncate text-sm font-medium text-foreground hover:underline sm:pt-0.5">
              {node.currentName ?? t`CUI ${node.cui}`}
            </Link>
            <span className="text-right text-sm font-semibold tabular-nums text-foreground sm:order-last">{compactValueText(value, question.unit, locale)}</span>
            <span className="col-span-2 mt-1 flex h-3 items-center bg-muted/60 sm:col-span-1 sm:mt-0 sm:h-5" aria-hidden="true">
              <span className={cn('block h-full', plotted < 0 ? 'bg-destructive/60' : 'bg-primary/75')} style={{ width: barWidth(plotted, largest) }} />
            </span>
          </li>
        ))}
      </ol>
    </figure>
  )
}

// ──────────────────────────────────────────────────────────── the shares ──

/**
 * One axis as shares: for each group, its part of the companies with a
 * statement and its part of the measure, one bar under the other — where a
 * group's weight differs from its number, the bars say so at a glance. A
 * measure with losses in it has no shares: its groups are drawn either side
 * of zero.
 */
export function ShareChart({ page, dimension }: { readonly page: AnalyticsPageData; readonly dimension: CompanyAnalysisDimension }) {
  const { state, question, locale, move } = page
  const breakdown = useCompanyAnalysisBreakdown(question, dimension, TOP_GROUPS)
  const data = breakdown.data
  if (breakdown.isError) return <HubLoadError onRetry={() => void breakdown.refetch()} />
  if (!data || !question) return CHART_PENDING
  const rows = [...orderedGroups(dimension, data.groups), ...(data.other.groups > 0 ? [data.other] : []), ...(data.unknown.companies !== '0' ? [data.unknown] : [])]
  const total = data.totals.metric?.sum ?? null
  const sums = rows.map((bucket) => decimalToPlot(bucket.metric?.sum) ?? 0)
  const shared = total !== null && (decimalToPlot(total) ?? 0) > 0 && sums.every((sum) => sum >= 0)
  const drill = (bucket: CompanyAnalysisBucket) => {
    const scope = drillScope(state.scope, dimension, bucket)
    return scope ? () => move({ ...withScope(state, scope), dimension: nextDimension(dimension, scope) }) : null
  }
  const measure = metricLabel(question.metric)
  return (
    <figure className={cn(breakdown.isFetching && 'opacity-70 transition-opacity')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <MonoLabel className="text-muted-foreground">{shared ? t`${dimensionLabel(dimension)}: ponderea în firme și în ${measure.toLocaleLowerCase('ro-RO')}, ${question.year}` : t`${dimensionLabel(dimension)}: ${measure.toLocaleLowerCase('ro-RO')}, ${question.year}`}</MonoLabel>
        {shared ? (
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 bg-muted-foreground/45" aria-hidden="true" />
              {t`Firme cu bilanț (${countText(data.totals.filers, locale)})`}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 bg-primary/80" aria-hidden="true" />
              {t`${measure} (${compactValueText(total ?? '0', question.unit, locale)})`}
            </span>
          </span>
        ) : null}
      </div>
      <ol className="mt-5 space-y-4">
        {rows.map((bucket, index) => {
          const label = groupLabel(dimension, bucket)
          const onDrill = bucket.kind === 'GROUP' ? drill(bucket) : null
          const basis = bucket.basis !== null
          const name = (
            <span className={cn('block truncate text-sm', bucket.kind !== 'GROUP' || basis ? 'italic text-muted-foreground' : 'font-medium text-foreground')}>{label}</span>
          )
          return (
            <li key={`${bucket.kind}-${bucket.key ?? index}`} className="grid gap-1.5 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-x-4">
              {onDrill ? (
                <button type="button" onClick={onDrill} className="min-w-0 text-left hover:underline" title={t`Doar ${label}`}>
                  {name}
                </button>
              ) : (
                name
              )}
              {shared ? (
                <span className="space-y-1">
                  <ShareBar label={t`Firme cu bilanț`} share={shareText(bucket.filers, data.totals.filers, locale)} part={Number(bucket.filers)} whole={Number(data.totals.filers)} tone="bg-muted-foreground/45" />
                  {/* A group with no reported value has no share of the measure: a dash, never 0 %. */}
                  <ShareBar
                    label={measure}
                    share={bucket.metric?.sum != null && total !== null ? shareText(bucket.metric.sum, total, locale) : null}
                    part={sums[index] ?? 0}
                    whole={decimalToPlot(total) ?? 0}
                    tone="bg-primary/80"
                  />
                </span>
              ) : (
                <SignedBar value={sums[index] ?? 0} largest={Math.max(...sums.map(Math.abs))} text={bucket.metric?.sum ? compactValueText(bucket.metric.sum, question.unit, locale) : '—'} />
              )}
            </li>
          )
        })}
      </ol>
      {data.groupCount > data.topN ? <p className="mt-4 text-xs text-muted-foreground">{t`Primele ${data.topN} din ${data.groupCount}; celelalte, adunate.`}</p> : null}
    </figure>
  )
}

/** One share: its bar and its percent, named for a screen reader (the colours name it for the eye). */
function ShareBar({ label, share, part, whole, tone }: { readonly label: string; readonly share: string | null; readonly part: number; readonly whole: number; readonly tone: string }) {
  return (
    <span className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-3">
      <span className="flex h-2.5 bg-muted/60" aria-hidden="true">
        <span className={cn('block h-full', tone)} style={{ width: share !== null && whole > 0 ? `${Math.max((part / whole) * 100, part > 0 ? 0.6 : 0).toFixed(1)}%` : '0%' }} />
      </span>
      <span className="text-right text-xs tabular-nums text-muted-foreground">
        <span className="sr-only">{label}: </span>
        {share ?? '—'}
      </span>
    </span>
  )
}

/** A value either side of zero: losses to the left, in red. */
function SignedBar({ value, largest, text }: { readonly value: number; readonly largest: number; readonly text: string }) {
  const half = `${((Math.abs(value) / (largest || 1)) * 50).toFixed(1)}%`
  return (
    <span className="grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-3">
      <span className="relative h-4 bg-muted/60" aria-hidden="true">
        <span className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
        <span className={cn('absolute inset-y-0', value < 0 ? 'right-1/2 bg-destructive/60' : 'left-1/2 bg-primary/75')} style={{ width: half }} />
      </span>
      <span className="text-right text-sm font-semibold tabular-nums text-foreground">{text}</span>
    </span>
  )
}
