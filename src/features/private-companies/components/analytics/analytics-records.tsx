import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { downloadMapDataCsv } from '@/lib/map-data-csv'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisMetric, CompanyAnalysisRecord } from '@/schemas/company-analytics'
import { companyMetricUnit } from '@/schemas/company-analytics'
import { isCursorRefused, isReleaseRefused } from '../../api/company-analytics-api'
import { RECORDS_PAGE, type ResolvedQuestion } from '../../api/company-analytics-plan'
import { useCompanyAnalysisRecords } from '../../hooks/use-company-analytics'
import { recordsCsv } from '../../lib/company-analytics-export'
import { compactValueText, countText, exactValueText, localeOf } from '../../lib/company-analytics-format'
import { civilDateText, countyLabel, metricLabel, onrcBasisPhrase, statusLabel } from '../../lib/company-analytics-text'
import type { CompanyAnalyticsState } from '../../lib/company-analytics-url'
import { labelSourcesOf } from '../../lib/company-analytics-view'

/**
 * The companies the figures count, the first tab: the same scope, year and
 * release, 25 at a time in the order the API ranks them (the measure, empty
 * values last, the CUI breaking ties). The pages follow the API's own
 * cursors, kept here in a stack: a new scope, year, order or release is a
 * new list (the page keys this component by them), and a cursor the API
 * refuses starts the list over. Names are the companies directory's current
 * public ones, not the edition's; a place or status without a consensus says
 * why; the date ONRC recorded is its civil date, never a founding date.
 */

const PAGER = 'inline-flex size-11 items-center justify-center border hover:bg-muted disabled:opacity-40 sm:size-8'

function valueCell(record: CompanyAnalysisRecord, metric: CompanyAnalysisMetric, year: number, locale: 'ro' | 'en') {
  const entry = record.values.find((value) => value.metric === metric)
  if (!record.filed) return { text: t`fără situație pentru ${year}`, exact: null, muted: true }
  if (!entry || entry.status === null) return { text: '—', exact: null, muted: true }
  if (entry.value === null) return { text: statusLabel(entry.status), exact: null, muted: true }
  const unit = companyMetricUnit(metric)
  return { text: compactValueText(entry.value, unit, locale), exact: exactValueText(entry.value, unit, locale), muted: false }
}

export function AnalyticsRecords({
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
  const [cursors, setCursors] = useState<readonly (string | null)[]>([null])
  const after = cursors[cursors.length - 1] ?? null
  const records = useCompanyAnalysisRecords(question, after)
  const page = cursors.length
  const extra = question.recordMetrics.filter((metric) => metric !== question.metric)

  const sortByMetric = () => onChange({ ...state, sort: 'METRIC', direction: state.sort === 'METRIC' && question.direction === 'DESC' ? 'ASC' : null })
  const sortByCui = () => onChange({ ...state, sort: 'CUI', direction: state.sort === 'CUI' && question.direction === 'ASC' ? 'DESC' : null })

  if (records.isError && !isReleaseRefused(records.error)) {
    const refused = isCursorRefused(records.error)
    return (
      <p role="alert" className={cn('py-6 text-sm text-muted-foreground', className)}>
        {refused ? t`Pagina aceasta nu mai corespunde listei. ` : t`Lista nu s-a putut citi acum. `}
        <button type="button" onClick={() => (refused ? setCursors([null]) : void records.refetch())} className="font-medium text-foreground underline underline-offset-4">
          {refused ? t`Începe lista de la capăt` : t`Încearcă din nou`}
        </button>
      </p>
    )
  }
  if (!records.data) return <div className={cn('h-72 animate-pulse bg-muted/30', className)} aria-hidden="true" />
  const { edges, pageInfo, totalCount } = records.data
  if (edges.length === 0) return <p className={cn('py-6 text-sm text-muted-foreground', className)}>{t`Nicio firmă în această selecție.`}</p>
  const names = labelSourcesOf(edges.flatMap(({ node }) => [node.county?.labelSource, node.uat?.labelSource, node.observedStatus?.labelSource]))
  const first = (page - 1) * RECORDS_PAGE + 1
  const metricSorted = question.sortMetric !== null
  const Arrow = question.direction === 'DESC' ? ArrowDown : ArrowUp
  return (
    <div className={cn(className, records.isFetching && 'opacity-70 transition-opacity')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-10 text-right sm:table-cell">#</TableHead>
            <TableHead aria-sort={!metricSorted ? (question.direction === 'ASC' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" onClick={sortByCui} className={cn('inline-flex min-h-11 items-center gap-1 hover:text-foreground sm:min-h-0', !metricSorted && 'font-semibold text-foreground')}>
                {t`Firma (CUI)`}
                {!metricSorted ? <Arrow className="size-3" aria-hidden="true" /> : null}
              </button>
            </TableHead>
            <TableHead className="text-right" aria-sort={metricSorted ? (question.direction === 'ASC' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" onClick={sortByMetric} className={cn('inline-flex min-h-11 items-center gap-1 hover:text-foreground sm:min-h-0', metricSorted && 'font-semibold text-foreground')}>
                {metricLabel(question.metric)}
                {metricSorted ? <Arrow className="size-3" aria-hidden="true" /> : null}
              </button>
            </TableHead>
            {extra.map((metric) => (
              <TableHead key={metric} className="hidden text-right md:table-cell">
                {metricLabel(metric)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {edges.map(({ node }, index) => {
            const main = valueCell(node, question.metric, question.year, locale)
            const place = [node.uat?.label, node.county ? (node.county.label ?? countyLabel(node.county.code)) : null].filter(Boolean).join(', ')
            // Without a consensus value, why — never an empty place or an unknown status.
            const where = place || t`fără județ comun (${onrcBasisPhrase(node.countyBasis)})`
            const status = node.observedStatus ? (node.observedStatus.label ?? node.observedStatus.code) : t`fără stare comună (${onrcBasisPhrase(node.observedStatusBasis)})`
            const recorded = node.onrcRecordedDate ? t`înregistrată la ONRC pe ${civilDateText(node.onrcRecordedDate, locale)}` : null
            return (
              <TableRow key={node.cui}>
                <TableCell className="hidden align-top font-mono text-xs tabular-nums text-muted-foreground sm:table-cell">{first + index}</TableCell>
                <TableCell className="max-w-[13rem] align-top sm:max-w-xl">
                  <Link to="/companies/$cui" params={{ cui: node.cui }} className="block truncate font-medium text-foreground hover:underline">
                    {node.currentName ?? t`Fără denumire publică`}
                  </Link>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{[`CUI ${node.cui}`, node.legalForm, where, status, recorded].filter(Boolean).join(' · ')}</span>
                </TableCell>
                <TableCell className={cn('whitespace-nowrap text-right align-top tabular-nums', main.muted ? 'text-xs text-muted-foreground' : 'font-semibold text-foreground')} title={main.exact ?? undefined}>
                  {main.text}
                  {main.exact ? <span className="sr-only"> ({main.exact})</span> : null}
                </TableCell>
                {extra.map((metric) => {
                  const cell = valueCell(node, metric, question.year, locale)
                  return (
                    <TableCell key={metric} className={cn('hidden whitespace-nowrap text-right align-top tabular-nums md:table-cell', cell.muted && 'text-xs text-muted-foreground')} title={cell.exact ?? undefined}>
                      {cell.text}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <p className="mt-2 text-xs text-muted-foreground">
        {t`Denumirile firmelor sunt cele publice actuale din directorul platformei, nu cele din ediția ONRC.`}
        {names.length > 0 ? ` ${t`Județe, localități, stări: ${names.join('; ')}.`}` : ''}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {t`${countText(String(first), locale)}–${countText(String(first + edges.length - 1), locale)} din ${countText(totalCount, locale)}`}
          {metricSorted ? ` · ${t`firmele fără valoare raportată la final`}` : ''}
        </span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => downloadMapDataCsv(recordsCsv(records.data, question), `firme-${question.year}-pagina-${page}.csv`)} className="inline-flex min-h-11 items-center gap-1 px-2 hover:text-foreground sm:min-h-8">
            <Download className="size-3.5" aria-hidden="true" />
            {t`CSV`}
          </button>
          <button type="button" disabled={page === 1} onClick={() => setCursors(cursors.slice(0, -1))} className={PAGER} aria-label={t`Pagina anterioară`}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" disabled={!pageInfo.hasNextPage || !pageInfo.endCursor} onClick={() => pageInfo.endCursor && setCursors([...cursors, pageInfo.endCursor])} className={PAGER} aria-label={t`Pagina următoare`}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </span>
      </div>
    </div>
  )
}
