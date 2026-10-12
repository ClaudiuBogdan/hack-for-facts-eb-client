import { ActivityDescription } from '../activity-description'
import { CaenDescription } from '../caen-description'
import { Fragment, useState } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Download } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { decimalSign, type DecimalLocale } from '@/lib/exact-decimal'
import { downloadMapDataCsv } from '@/lib/map-data-csv'
import { cn } from '@/lib/utils'
import { COMPANY_ANALYSIS_DIMENSIONS, COMPANY_ANALYSIS_RANKINGS, type CompanyAnalysisBucket, type CompanyAnalysisDimension, type CompanyAnalysisRankBy } from '@/schemas/company-analytics'
import { isCapabilityRefused, isReleaseRefused } from '../../api/company-analytics-api'
import { BREAKDOWN_TOP, BREAKDOWN_TOP_EXPANDED, type ResolvedQuestion } from '../../api/company-analytics-plan'
import { useCompanyAnalysisBreakdown } from '../../hooks/use-company-analytics'
import { activityDerivationText, activityQualityParts, activitySourceTag } from '../../lib/company-activity-text'
import { drillScope, nextDimension } from '../../lib/company-analytics-drill'
import { breakdownCsv } from '../../lib/company-analytics-export'
import { compactValueText, countText, exactValueText, localeOf, shareText } from '../../lib/company-analytics-format'
import { dimensionLabel, metricLabel, rankLabel } from '../../lib/company-analytics-text'
import { withScope, type CompanyAnalyticsState } from '../../lib/company-analytics-url'
import { activityTail, breakdownRows, CONSENSUS_DIMENSIONS, groupLabel, isUnclassifiedActivity, labelSourcesOf } from '../../lib/company-analytics-view'

/**
 * The question by one grouping: the top groups, every other group folded
 * into one row, the unknown group in its own, and the total — which is the
 * figures band's, so the rows add up to it. For a county, locality or status
 * every company is in one group, a value or the reason it has none (a basis
 * group, named as such), and the empty unknown slot is not drawn. A group's
 * row narrows the same question to it (a filter the API reads exactly as the
 * group was counted); „other" and an unknown that no single filter names are
 * not links. Where the names come from is said under the table.
 *
 * The derived activity (offered by a v3 release only) is grouped by the
 * selected activity, each with its source (ONRC Rev.N, or ANAF with its
 * revision unpublished), its selection quality and ANAF's dates; its
 * unclassified buckets — several classes, an uncatalogued ANAF code, no
 * qualified selection — follow every ranked row, apart, never as sectors. A
 * row narrows to that exact activity (or that basis).
 */

const TRIGGER = 'h-11 w-full rounded-none text-sm shadow-none sm:h-9 sm:w-auto'

/** A derived-activity row's name: the activity with its source tag and quality, or why an unclassified bucket has none. */
function ActivityCell({ bucket, label, locale }: { readonly bucket: CompanyAnalysisBucket; readonly label: string; readonly locale: DecimalLocale }) {
  const unclassified = isUnclassifiedActivity(bucket)
  // An unclassified bucket names no activity, so no source tag: its label says why.
  const tag = unclassified ? null : activitySourceTag(bucket.activity)
  const quality = activityQualityParts(bucket.activityQuality, (value) => countText(value, locale))
  return (
    <span className="block whitespace-normal">
      {bucket.activity?.code && !unclassified ? <ActivityDescription activity={bucket.activity} /> : <span>{label}</span>}
      {tag ? <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{tag}</span> : null}
      {quality.length > 0 ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{quality.join(' · ')}</span> : null}
    </span>
  )
}

function SumCell({ bucket, locale }: { readonly bucket: CompanyAnalysisBucket; readonly locale: DecimalLocale }) {
  const aggregate = bucket.metric
  if (!aggregate || aggregate.sum === null) return <span className="text-xs text-muted-foreground">{t`nicio valoare raportată`}</span>
  const exact = exactValueText(aggregate.sum, aggregate.unit, locale)
  return (
    <span title={exact}>
      {compactValueText(aggregate.sum, aggregate.unit, locale)}
      <span className="sr-only"> ({exact})</span>
    </span>
  )
}

export function AnalyticsBreakdown({
  state,
  question,
  onChange,
  className,
}: {
  readonly state: CompanyAnalyticsState
  readonly question: ResolvedQuestion
  readonly onChange: (next: CompanyAnalyticsState) => void
  readonly className?: string
}) {
  const { i18n } = useLingui()
  const locale = localeOf(i18n.locale)
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  const questionKey = JSON.stringify([question.release, question.scope, state.dimension, question.rankBy])
  const expanded = expandedFor === questionKey
  const breakdown = useCompanyAnalysisBreakdown(question, state.dimension, expanded ? BREAKDOWN_TOP_EXPANDED : BREAKDOWN_TOP)
  const data = breakdown.data
  const total = data?.totals.metric?.sum ?? null
  // A share of a total of mixed signs (losses and profits) would not read as a share: every
  // row the table shows — the groups, „other" and the unknown — must be a part of a positive total.
  const parts = data ? [...data.groups, data.other, data.unknown] : []
  const shares =
    total !== null &&
    decimalSign(total) === 1 &&
    parts.every((bucket) => {
      const sum = bucket.metric?.sum ?? null
      return sum === null || decimalSign(sum) !== -1
    })
  const drill = (bucket: CompanyAnalysisBucket) => {
    const scope = drillScope(state.scope, state.dimension, bucket)
    if (!scope) return null
    return () => onChange({ ...withScope(state, scope), dimension: nextDimension(state.dimension, scope) })
  }

  const controls = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={state.dimension} onValueChange={(value) => onChange({ ...state, dimension: value as CompanyAnalysisDimension })}>
        <SelectTrigger className={TRIGGER} aria-label={t`Grupează după`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {/* The derived activity only where the release offers it; an address that asks for it elsewhere keeps it, said below. */}
          {COMPANY_ANALYSIS_DIMENSIONS.filter((dimension) => dimension !== 'ACTIVITY' || question.activity || state.dimension === 'ACTIVITY').map((dimension) => (
            <SelectItem key={dimension} value={dimension}>
              {dimensionLabel(dimension)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={question.rankBy} onValueChange={(value) => onChange({ ...state, rankBy: value as CompanyAnalysisRankBy })}>
        <SelectTrigger className={TRIGGER} aria-label={t`Ordonează grupurile`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COMPANY_ANALYSIS_RANKINGS.map((rankBy) => (
            <SelectItem key={rankBy} value={rankBy}>
              {rankLabel(rankBy)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {data ? (
        <button type="button" onClick={() => downloadMapDataCsv(breakdownCsv(data), `firme-${question.year}-${state.dimension.toLowerCase()}.csv`)} className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground sm:ml-auto sm:min-h-8">
          <Download className="size-3.5" aria-hidden="true" />
          {t`CSV`}
        </button>
      ) : null}
    </div>
  )

  // Not offered by the release — known from its capabilities, or said by the API's typed refusal.
  if (state.dimension === 'ACTIVITY' && (!question.activity || (breakdown.isError && isCapabilityRefused(breakdown.error))))
    return (
      <div className={className}>
        {controls}
        <p role="status" className="mt-4 border-l-2 border-muted-foreground py-0.5 pl-3 text-sm text-muted-foreground" data-testid="companies-analytics-activity-unavailable">
          {t`Această ediție a analizei nu are selecția derivată a activității. Alege altă grupare, de exemplu codul CAEN fiscal ANAF (gruparea anterioară).`}
        </p>
      </div>
    )
  if (breakdown.isError && !isReleaseRefused(breakdown.error))
    return (
      <div className={className}>
        {controls}
        <div className="mt-4">
          <HubLoadError onRetry={() => void breakdown.refetch()} />
        </div>
      </div>
    )
  if (!data)
    return (
      <div className={className}>
        {controls}
        <div className="mt-4 h-72 animate-pulse bg-muted/30" aria-hidden="true" />
      </div>
    )

  const rows = breakdownRows(data)
  const activity = data.dimension === 'ACTIVITY'
  const unclassified = activityTail(data)
  const firstUnclassified = unclassified[0]
  const names = labelSourcesOf(
    data.groups.map((bucket) => bucket.labelSource ?? (bucket.caen?.descriptions?.length || bucket.activity?.label || bucket.activity?.descriptions.length ? 'current_db_catalog' : null)),
  )
  return (
    <div className={cn(className, breakdown.isFetching && 'opacity-70 transition-opacity')}>
      {controls}
      {data.rankedBy !== data.rankBy ? <p className="mt-3 text-xs text-muted-foreground">{t`Nicio grupă nu are valori raportate: sunt ordonate după numărul de firme.`}</p> : null}
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>{dimensionLabel(state.dimension)}</TableHead>
            <TableHead className="text-right">{t`Firme`}</TableHead>
            <TableHead className="hidden text-right sm:table-cell">{t`Cu situație`}</TableHead>
            <TableHead className="text-right">{metricLabel(question.metric)}</TableHead>
            <TableHead className="hidden text-right md:table-cell">{t`Au raportat`}</TableHead>
            {shares ? <TableHead className="hidden text-right lg:table-cell">{t`Cota`}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((bucket) => {
            const onDrill = drill(bucket)
            const label = groupLabel(state.dimension, bucket)
            const share = shares && total && bucket.metric?.sum ? shareText(bucket.metric.sum, total, locale) : null
            // The derived activity's unclassified buckets: after every ranked row, under their own line, never as sectors.
            const tail = activity && unclassified.includes(bucket)
            const name = activity ? <ActivityCell bucket={bucket} label={label} locale={locale} /> : bucket.caen ? <CaenDescription caen={bucket.caen} /> : label
            const wraps = activity || bucket.caen !== null
            return (
              <Fragment key={`${bucket.kind}-${bucket.key ?? ''}-${tail ? 'unclassified' : 'ranked'}`}>
                {tail && bucket === firstUnclassified ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={shares ? 6 : 5} className="pt-4 text-xs text-muted-foreground" data-testid="companies-analytics-unclassified-head">
                      {t`Fără o activitate selectată: nu sunt domenii și nu sunt clasate.`}
                    </TableCell>
                  </TableRow>
                ) : null}
                <TableRow className={cn((bucket.kind !== 'GROUP' || tail) && 'text-muted-foreground')} data-unclassified={tail ? 'true' : undefined}>
                  <TableCell className="max-w-[12rem] sm:max-w-md">
                    {onDrill ? (
                      <button type="button" onClick={onDrill} className={cn('block max-w-full text-left font-medium underline-offset-4 hover:underline', tail ? 'text-muted-foreground' : 'text-foreground', wraps ? 'whitespace-normal' : 'truncate')} title={t`Doar ${label}`}>
                        {name}
                      </button>
                    ) : (
                      <span className={cn('block', wraps ? 'whitespace-normal' : 'truncate')} title={label}>
                        {name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{countText(bucket.companies, locale)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{countText(bucket.filers, locale)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    <SumCell bucket={bucket} locale={locale} />
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">{bucket.metric ? countText(bucket.metric.contributors, locale) : '—'}</TableCell>
                  {shares ? <TableCell className="hidden text-right text-xs tabular-nums lg:table-cell">{share ?? '—'}</TableCell> : null}
                </TableRow>
              </Fragment>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="font-semibold">
            <TableCell>{groupLabel(state.dimension, data.totals)}</TableCell>
            <TableCell className="text-right tabular-nums">{countText(data.totals.companies, locale)}</TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">{countText(data.totals.filers, locale)}</TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">
              <SumCell bucket={data.totals} locale={locale} />
            </TableCell>
            <TableCell className="hidden text-right tabular-nums md:table-cell">{data.totals.metric ? countText(data.totals.metric.contributors, locale) : '—'}</TableCell>
            {shares ? <TableCell className="hidden lg:table-cell" /> : null}
          </TableRow>
        </TableFooter>
      </Table>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {state.dimension === 'EMPLOYEE_SIZE' ? t`Mărimea se citește din situația anului ${question.year}; celelalte grupări descriu firma la data ediției.` : t`Gruparea descrie firma la data ediției, nu în anul fiscal.`}
          {CONSENSUS_DIMENSIONS.has(state.dimension) ? ` ${t`Fiecare firmă e într-un singur grup: valoarea comună a înscrierilor ei sau motivul pentru care nu are una.`}` : ''}
          {activity ? ` ${activityDerivationText(data.release.source.sourcePublishedAt)}` : ''}
          {names.length > 0 ? ` ${t`Denumiri: ${names.join('; ')}.`}` : ''}
        </span>
        {!expanded && data.groupCount > data.topN ? (
          <button type="button" onClick={() => setExpandedFor(questionKey)} className="min-h-11 font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0">
            {t`Primele ${BREAKDOWN_TOP_EXPANDED}`}
          </button>
        ) : null}
      </div>
    </div>
  )
}
