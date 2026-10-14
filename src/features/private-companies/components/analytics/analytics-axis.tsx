import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Download } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import type { DecimalLocale } from '@/lib/exact-decimal'
import { downloadMapDataCsv } from '@/lib/map-data-csv'
import { cn } from '@/lib/utils'
import { COMPANY_ANALYSIS_RANKINGS, type CompanyAnalysisBreakdown, type CompanyAnalysisBucket, type CompanyAnalysisDimension, type CompanyAnalysisRankBy } from '@/schemas/company-analytics'
import { isReleaseRefused } from '../../api/company-analytics-api'
import { ANSWER_TOP, ANSWER_TOP_EXPANDED } from '../../api/company-analytics-plan'
import { useCompanyAnalysisBreakdown } from '../../hooks/use-company-analytics'
import type { CompanyAnalyticsPageData } from '../../hooks/use-company-analytics-page'
import { activityDerivationText, activityQualityParts, activitySourceTag } from '../../lib/company-activity-text'
import { drillScope, nextDimension } from '../../lib/company-analytics-drill'
import { activityRefused, mainActivityRefused } from '../../lib/company-analytics-answer'
import { breakdownCsv } from '../../lib/company-analytics-export'
import { compactValueText, countText, exactValueText } from '../../lib/company-analytics-format'
import { dimensionLabel, metricLabel, rankLabel } from '../../lib/company-analytics-text'
import { withScope } from '../../lib/company-analytics-url'
import { breakdownRows, CONSENSUS_DIMENSIONS, groupLabel, isUnclassifiedActivity, labelSourcesOf } from '../../lib/company-analytics-view'
import { ActivityDescription } from '../activity-description'
import { CaenDescription } from '../caen-description'
import { ChoiceSelect } from './analytics-choices'

/**
 * One axis of the question, ranked: each group a row with its bar (its share
 * of the largest), its figure and its companies; a row narrows the question
 * to it. Every other group is folded into one row, the unknown group in its
 * own, and the total closes the list — the figures band's, so the rows add
 * up to it. For a county, locality or status every company is in one group,
 * a value or the reason it has none (a basis group, drawn muted).
 *
 * The derived activity (offered by a v3 release only) names each activity
 * with its source and its selection's quality; its unclassified buckets —
 * several classes, an uncatalogued ANAF code, no qualified selection —
 * follow every ranked row, apart, never as sectors. The ranking can be by the
 * measure's sum or by the companies; the rows go out as CSV.
 */

/** A derived-activity row's name: the activity with its source tag and quality, or why an unclassified bucket has none. */
export function ActivityName({ bucket, label, locale }: { readonly bucket: CompanyAnalysisBucket; readonly label: string; readonly locale: DecimalLocale }) {
  const unclassified = isUnclassifiedActivity(bucket)
  // An unclassified bucket names no activity, so no source tag: its label says why.
  const tag = unclassified ? null : activitySourceTag(bucket.activity)
  const quality = activityQualityParts(bucket.activityQuality, (value) => countText(value, locale))
  return (
    <span className="block whitespace-normal text-left">
      {bucket.activity?.code && !unclassified ? <ActivityDescription activity={bucket.activity} /> : <span>{label}</span>}
      {tag ? <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{tag}</span> : null}
      {quality.length > 0 ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{quality.join(' · ')}</span> : null}
    </span>
  )
}

/** The derived activity asked of a release without it: what to choose instead. */
/** The release cannot answer the grouping: the derived activity (v3) or, `capability` MAIN_ACTIVITY, the ANAF-assumed main activity (v4). */
export function ActivityUnavailable({ capability = 'ACTIVITY' }: { readonly capability?: 'ACTIVITY' | 'MAIN_ACTIVITY' }) {
  return (
    <p role="status" className="border-l-2 border-muted-foreground py-0.5 pl-3 text-sm text-muted-foreground" data-testid="companies-analytics-activity-unavailable" data-capability={capability}>
      {capability === 'MAIN_ACTIVITY'
        ? t`Această ediție a analizei nu are activitatea principală presupusă după ANAF. Alege altă grupare sau o ediție care o oferă.`
        : t`Această ediție a analizei nu are selecția derivată a activității. Alege altă grupare, de exemplu codul CAEN fiscal ANAF (gruparea anterioară).`}
    </p>
  )
}

/** The scaled figure to read; the exact one on hover and for a screen reader. A group nobody reported for says so, never zero. */
function Figure({ bucket, locale }: { readonly bucket: CompanyAnalysisBucket; readonly locale: DecimalLocale }) {
  const metric = bucket.metric
  if (!metric || metric.sum === null) return <span className="text-xs font-normal text-muted-foreground">{t`nicio valoare`}</span>
  const exact = exactValueText(metric.sum, metric.unit, locale)
  return (
    <span title={exact}>
      <span aria-hidden="true">{compactValueText(metric.sum, metric.unit, locale)}</span>
      <span className="sr-only">{exact}</span>
    </span>
  )
}

const COLUMNS = 'grid-cols-[2rem_minmax(0,1fr)_auto] sm:grid-cols-[2rem_minmax(0,1fr)_9rem_7rem]'

function Notes({ data, dimension, year, expanded, onExpand }: { readonly data: CompanyAnalysisBreakdown; readonly dimension: CompanyAnalysisDimension; readonly year: number; readonly expanded: boolean; readonly onExpand: () => void }) {
  const names = labelSourcesOf(
    data.groups.map((bucket) => bucket.labelSource ?? (bucket.caen?.descriptions?.length || bucket.activity?.label || bucket.activity?.descriptions.length ? 'current_db_catalog' : null)),
  )
  return (
    <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <p className="max-w-3xl">
        {dimension === 'EMPLOYEE_SIZE' ? t`Mărimea se citește din situația anului ${year}; celelalte grupări descriu firma la data ediției.` : t`Gruparea descrie firma la data ediției, nu în anul fiscal.`}
        {CONSENSUS_DIMENSIONS.has(dimension) ? ` ${t`Fiecare firmă e într-un singur grup: valoarea comună a înscrierilor ei sau motivul pentru care nu are una.`}` : ''}
        {dimension === 'ACTIVITY' ? ` ${activityDerivationText(data.release.source.sourcePublishedAt)}` : ''}
        {names.length > 0 ? ` ${t`Denumiri: ${names.join('; ')}.`}` : ''}
      </p>
      {!expanded && data.groupCount > data.topN ? (
        <button type="button" onClick={onExpand} className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0">
          {t`Arată primele ${Math.min(ANSWER_TOP_EXPANDED, data.groupCount)}`}
        </button>
      ) : null}
    </div>
  )
}

export function RankedAxis({ page, dimension }: { readonly page: CompanyAnalyticsPageData; readonly dimension: CompanyAnalysisDimension }) {
  const { state, question, locale, move } = page
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  const key = JSON.stringify([question?.release, question?.scope, dimension, question?.metric, question?.rankBy])
  const expanded = expandedFor === key
  const breakdown = useCompanyAnalysisBreakdown(question, dimension, expanded ? ANSWER_TOP_EXPANDED : ANSWER_TOP)
  const data = breakdown.data
  if (!question) return null

  const controls = (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span className="text-xs text-muted-foreground">{t`Ordonate după`}</span>
      <ChoiceSelect
        value={question.rankBy}
        groups={[{ options: COMPANY_ANALYSIS_RANKINGS.map((rankBy) => ({ value: rankBy, label: rankLabel(rankBy) })) }]}
        onChange={(value) => move({ ...state, rankBy: value as CompanyAnalysisRankBy })}
        label={t`Ordonează grupurile`}
        triggerClassName="h-9 w-auto gap-2 rounded-none border-foreground/25 px-3 text-sm shadow-none"
      />
      {data ? (
        <button type="button" onClick={() => downloadMapDataCsv(breakdownCsv(data), `firme-${question.year}-${dimension.toLowerCase()}.csv`)} className="ml-auto inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground sm:min-h-8">
          <Download className="size-3.5" aria-hidden="true" />
          {t`CSV`}
        </button>
      ) : null}
    </div>
  )

  if (activityRefused(dimension, question.activity, breakdown.error)) return <ActivityUnavailable />
  if (mainActivityRefused(dimension, question.mainActivity, breakdown.error)) return <ActivityUnavailable capability="MAIN_ACTIVITY" />
  if (breakdown.isError && !isReleaseRefused(breakdown.error)) return <HubLoadError onRetry={() => void breakdown.refetch()} />
  if (!data)
    return (
      <>
        {controls}
        <div className="h-96 animate-pulse bg-muted/30" aria-hidden="true" />
      </>
    )

  const { ranked, rest, tail } = breakdownRows(data)
  const byMetric = data.rankedBy === 'METRIC_SUM'
  // The count beside the figure is the one the rows are ranked by, where they are ranked by one: the bars follow it too.
  const counted = (bucket: CompanyAnalysisBucket): string =>
    data.rankedBy === 'FILERS' ? bucket.filers : data.rankedBy === 'CONTRIBUTORS' ? (bucket.metric?.contributors ?? '0') : bucket.companies
  const countHead = data.rankedBy === 'FILERS' ? t`Cu bilanț` : data.rankedBy === 'CONTRIBUTORS' ? t`Au raportat` : t`Firme`
  const measure = (bucket: CompanyAnalysisBucket) => (byMetric ? Math.abs(Number(bucket.metric?.sum ?? 0)) : Number(counted(bucket)))
  const largest = Math.max(...ranked.map(measure), 1)
  const drill = (bucket: CompanyAnalysisBucket) => {
    const scope = drillScope(state.scope, dimension, bucket)
    return scope ? () => move({ ...withScope(state, scope), dimension: nextDimension(dimension, scope) }) : null
  }
  const nameOf = (bucket: CompanyAnalysisBucket, label: string) =>
    dimension === 'ACTIVITY' ? <ActivityName bucket={bucket} label={label} locale={locale} /> : bucket.caen ? <CaenDescription caen={bucket.caen} /> : label
  const wraps = dimension === 'ACTIVITY' || dimension === 'MAIN_CAEN' || dimension === 'MAIN_ACTIVITY'

  const row = (bucket: CompanyAnalysisBucket, index: number | null, quiet: boolean) => {
    const onDrill = drill(bucket)
    const label = groupLabel(dimension, bucket)
    const cells = (
      <>
        <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground">{index === null ? '' : String(index + 1).padStart(2, '0')}</MonoLabel>
        <span className="min-w-0">
          <span className={cn('block text-sm', wraps ? 'whitespace-normal' : 'truncate', quiet ? 'italic text-muted-foreground' : 'font-medium text-foreground')}>{nameOf(bucket, label)}</span>
          {index !== null ? (
            <span className="mt-1.5 block h-1 bg-muted" aria-hidden="true">
              <span className={cn('block h-1', quiet ? 'bg-muted-foreground/40' : 'bg-primary/70 group-hover:bg-primary')} style={{ width: `${Math.max((measure(bucket) / largest) * 100, 0.8).toFixed(1)}%` }} />
            </span>
          ) : null}
        </span>
        <span className={cn('text-right text-sm tabular-nums', quiet ? 'text-muted-foreground' : 'font-semibold text-foreground')}>
          <Figure bucket={bucket} locale={locale} />
          {/* On a phone the count's column is gone: ranked by a count, the count is read under the figure. */}
          {byMetric ? null : <span className="block text-xs font-normal text-muted-foreground sm:hidden">{`${countHead}: ${countText(counted(bucket), locale)}`}</span>}
        </span>
        <span className="hidden text-right text-sm tabular-nums text-muted-foreground sm:block">{countText(counted(bucket), locale)}</span>
      </>
    )
    const rowClass = cn('group grid w-full items-start gap-x-3 border-b border-border/70 py-2.5 text-left', COLUMNS)
    return (
      <li key={`${bucket.kind}-${bucket.key ?? ''}-${index === null ? 'apart' : 'ranked'}`}>
        {onDrill ? (
          <button type="button" onClick={onDrill} className={cn(rowClass, 'hover:bg-muted/40')} title={t`Doar ${label}`}>
            {cells}
          </button>
        ) : (
          <div className={rowClass}>{cells}</div>
        )}
      </li>
    )
  }

  return (
    <div className={cn(breakdown.isFetching && 'opacity-70 transition-opacity')}>
      {controls}
      {data.rankedBy !== data.rankBy ? <p className="mb-3 text-xs text-muted-foreground">{t`Nicio grupă nu are valori raportate: sunt ordonate după numărul de firme.`}</p> : null}
      <div className={cn('grid gap-x-3 border-b pb-2', COLUMNS)}>
        <MonoLabel className="text-muted-foreground">#</MonoLabel>
        <MonoLabel className="text-muted-foreground">{dimensionLabel(dimension)}</MonoLabel>
        <MonoLabel className="text-right text-muted-foreground">{metricLabel(question.metric)}</MonoLabel>
        <MonoLabel className="hidden text-right text-muted-foreground sm:block">{countHead}</MonoLabel>
      </div>
      <ol>
        {ranked.map((bucket, index) => row(bucket, index, bucket.basis !== null))}
        {rest.map((bucket) => row(bucket, null, true))}
        {tail.length > 0 ? (
          <li className="pt-4 text-xs text-muted-foreground" data-testid="companies-analytics-unclassified-head">
            {t`Fără o activitate selectată: nu sunt domenii și nu sunt clasate.`}
          </li>
        ) : null}
        {tail.map((bucket) => row(bucket, null, true))}
        <li className={cn('grid gap-x-3 py-2.5 text-sm font-semibold', COLUMNS)}>
          <span />
          <span>{groupLabel(dimension, data.totals)}</span>
          <span className="text-right tabular-nums">
            <Figure bucket={data.totals} locale={locale} />
          </span>
          <span className="hidden text-right tabular-nums sm:block">{countText(counted(data.totals), locale)}</span>
        </li>
      </ol>
      <Notes data={data} dimension={dimension} year={question.year} expanded={expanded} onExpand={() => setExpandedFor(key)} />
    </div>
  )
}
