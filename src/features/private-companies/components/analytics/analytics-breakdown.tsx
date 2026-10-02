import { useState } from 'react'
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
import { isReleaseRefused } from '../../api/company-analytics-api'
import { BREAKDOWN_TOP, BREAKDOWN_TOP_EXPANDED, type ResolvedQuestion } from '../../api/company-analytics-plan'
import { useCompanyAnalysisBreakdown } from '../../hooks/use-company-analytics'
import { drillScope, nextDimension } from '../../lib/company-analytics-drill'
import { breakdownCsv } from '../../lib/company-analytics-export'
import { compactValueText, countText, exactValueText, localeOf, shareText } from '../../lib/company-analytics-format'
import { dimensionLabel, metricLabel, rankLabel } from '../../lib/company-analytics-text'
import { withScope, type CompanyAnalyticsState } from '../../lib/company-analytics-url'
import { groupLabel } from '../../lib/company-analytics-view'

/**
 * The question by one grouping: the top groups, every other group folded
 * into one row, the unknown group in its own, and the total — which is the
 * figures band's, so the rows add up to it. A group's row narrows the same
 * question to it (a filter the API reads exactly as the group was counted);
 * „other" and an unknown that no single filter names are not links.
 */

const TRIGGER = 'h-11 w-full rounded-none text-sm shadow-none sm:h-9 sm:w-auto'

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
          {COMPANY_ANALYSIS_DIMENSIONS.map((dimension) => (
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

  const rows = [...data.groups, ...(data.other.groups > 0 ? [data.other] : []), data.unknown]
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
            return (
              <TableRow key={`${bucket.kind}-${bucket.key ?? ''}`} className={cn(bucket.kind !== 'GROUP' && 'text-muted-foreground')}>
                <TableCell className="max-w-[12rem] sm:max-w-md">
                  {onDrill ? (
                    <button type="button" onClick={onDrill} className="block max-w-full truncate text-left font-medium text-foreground underline-offset-4 hover:underline" title={t`Doar ${label}`}>
                      {label}
                    </button>
                  ) : (
                    <span className="block truncate" title={label}>
                      {label}
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
        <span>{state.dimension === 'EMPLOYEE_SIZE' ? t`Mărimea se citește din situația anului ${question.year}; celelalte grupări descriu firma la data ediției.` : t`Gruparea descrie firma la data ediției, nu în anul fiscal.`}</span>
        {!expanded && data.groupCount > data.topN ? (
          <button type="button" onClick={() => setExpandedFor(questionKey)} className="min-h-11 font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0">
            {t`Primele ${BREAKDOWN_TOP_EXPANDED}`}
          </button>
        ) : null}
      </div>
    </div>
  )
}
