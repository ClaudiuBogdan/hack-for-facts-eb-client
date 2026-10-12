import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { downloadMapDataCsv } from '@/lib/map-data-csv'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisMetric, CompanyAnalysisRecord, CompanyAnalysisStatus } from '@/schemas/company-analytics'
import { COMPANY_ANALYSIS_STATUSES, companyMetricUnit } from '@/schemas/company-analytics'
import { isCursorRefused, isReleaseRefused } from '../../api/company-analytics-api'
import { RECORDS_PAGE, type ResolvedQuestion } from '../../api/company-analytics-plan'
import { useCompanyAnalysisRecords } from '../../hooks/use-company-analytics'
import { recordsCsv } from '../../lib/company-analytics-export'
import { compactValue, countText, exactValueText, localeOf } from '../../lib/company-analytics-format'
import { civilDateText, countyLabel, metricLabel, onrcBasisPhrase, placeName, statusLabel } from '../../lib/company-analytics-text'
import type { CompanyAnalyticsState } from '../../lib/company-analytics-url'
import { labelSourcesOf } from '../../lib/company-analytics-view'
import { STATUS_ACTIVE } from '../../lib/company-status-codes'

/**
 * The companies the figures count, the first tab: the same scope, year and
 * release, 25 at a time in the order the API ranks them (the measure, empty
 * values last, the CUI breaking ties). The pages follow the API's own
 * cursors, kept here in a stack: a new scope, year, order or release is a
 * new list (the page keys this component by them), and a cursor the API
 * refuses starts the list over. Names are the companies directory's current
 * public ones, not the edition's; a place or status without a consensus says
 * why; the date ONRC recorded is its civil date, never a founding date.
 *
 * A figure is its digits with its scale beside them, quieter; a headcount
 * bare, its column saying „Salariați". A value the API holds back or the
 * source lacks is a dash with a numbered mark, the marks explained once
 * under the table; a company without a statement says so once, in the
 * measure's column.
 */

const PAGER = 'inline-flex size-11 items-center justify-center border hover:bg-muted disabled:opacity-40 sm:size-8'

type Cell =
  | { readonly kind: 'value'; readonly digits: string; readonly scale: string | null; readonly exact: string }
  | { readonly kind: 'status'; readonly status: CompanyAnalysisStatus }
  | { readonly kind: 'unfiled' }
  | { readonly kind: 'none' }

function cellOf(record: CompanyAnalysisRecord, metric: CompanyAnalysisMetric, locale: 'ro' | 'en'): Cell {
  if (!record.filed) return { kind: 'unfiled' }
  const entry = record.values.find((value) => value.metric === metric)
  if (!entry || entry.status === null) return { kind: 'none' }
  if (entry.value === null) return { kind: 'status', status: entry.status }
  const unit = companyMetricUnit(metric)
  const compact = compactValue(entry.value, unit, locale)
  return { kind: 'value', digits: compact.value, scale: unit === 'HEADCOUNT' ? null : compact.unit, exact: exactValueText(entry.value, unit, locale) }
}

/** A column's name, short enough for one line: the headcount's long name is its column's whole width. */
function columnLabel(metric: CompanyAnalysisMetric): string {
  return metric === 'EMPLOYEES' ? t`Salariați` : metricLabel(metric)
}

/** The statuses the page's cells mark, in the API's order, each numbered from 1 for its footnote. */
function markedStatuses(records: readonly CompanyAnalysisRecord[], metrics: readonly CompanyAnalysisMetric[], locale: 'ro' | 'en'): readonly CompanyAnalysisStatus[] {
  const seen = new Set<CompanyAnalysisStatus>()
  for (const record of records) {
    for (const metric of metrics) {
      const cell = cellOf(record, metric, locale)
      if (cell.kind === 'status') seen.add(cell.status)
    }
  }
  return COMPANY_ANALYSIS_STATUSES.filter((status) => seen.has(status))
}

function CellContent({ cell, marks }: { readonly cell: Cell; readonly marks: readonly CompanyAnalysisStatus[] }) {
  switch (cell.kind) {
    case 'value':
      return (
        <span title={cell.exact}>
          <span className="font-semibold text-foreground">{cell.digits}</span>
          {cell.scale ? <span className="ml-1 text-xs text-muted-foreground">{cell.scale}</span> : null}
          <span className="sr-only"> ({cell.exact})</span>
        </span>
      )
    case 'status': {
      const mark = marks.indexOf(cell.status) + 1
      return (
        <span className="text-muted-foreground" title={statusLabel(cell.status)}>
          <span aria-hidden="true">—</span>
          <sup className="ml-0.5 font-mono text-[0.65rem] text-amber-700 dark:text-amber-400" aria-hidden="true">
            {mark}
          </sup>
          <span className="sr-only">{statusLabel(cell.status)}</span>
        </span>
      )
    }
    case 'unfiled':
      return <span className="text-xs italic text-muted-foreground">{t`fără bilanț`}</span>
    case 'none':
      return <span className="text-muted-foreground">—</span>
  }
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
  const marks = markedStatuses(
    edges.map((edge) => edge.node),
    [question.metric, ...extra],
    locale,
  )
  return (
    <div className={cn(className, records.isFetching && 'opacity-70 transition-opacity')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-10 sm:table-cell">#</TableHead>
            <TableHead aria-sort={!metricSorted ? (question.direction === 'ASC' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" onClick={sortByCui} className={cn('inline-flex min-h-11 items-center gap-1 whitespace-nowrap hover:text-foreground sm:min-h-0', !metricSorted && 'font-semibold text-foreground')}>
                {t`Firma (CUI)`}
                {!metricSorted ? <Arrow className="size-3" aria-hidden="true" /> : null}
              </button>
            </TableHead>
            <TableHead className="text-right" aria-sort={metricSorted ? (question.direction === 'ASC' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" onClick={sortByMetric} className={cn('inline-flex min-h-11 items-center gap-1 whitespace-nowrap hover:text-foreground sm:min-h-0', metricSorted && 'font-semibold text-foreground')}>
                {columnLabel(question.metric)}
                {metricSorted ? <Arrow className="size-3" aria-hidden="true" /> : null}
              </button>
            </TableHead>
            {extra.map((metric) => (
              <TableHead key={metric} className="hidden whitespace-nowrap text-right md:table-cell">
                {columnLabel(metric)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {edges.map(({ node }, index) => {
            const place = [node.uat ? placeName(node.uat.label ?? node.uat.code) : null, node.county ? countyLabel(node.county.code) : null].filter(Boolean).join(', ')
            // Without a consensus value, why — never an empty place or an unknown status.
            const where = place || t`fără județ comun (${onrcBasisPhrase(node.countyBasis)})`
            const status = node.observedStatus ? (node.observedStatus.label ?? node.observedStatus.code) : null
            const noStatus = node.observedStatus ? null : t`fără stare comună (${onrcBasisPhrase(node.observedStatusBasis)})`
            const recorded = node.onrcRecordedDate ? t`înregistrată la ONRC pe ${civilDateText(node.onrcRecordedDate, locale)}` : null
            const unfiled = !node.filed
            return (
              <TableRow key={node.cui}>
                <TableCell className="hidden align-top font-mono text-xs leading-5 tabular-nums text-muted-foreground sm:table-cell">{first + index}</TableCell>
                <TableCell className="max-w-[13rem] align-top sm:max-w-xl">
                  <Link to="/companies/$cui" params={{ cui: node.cui }} className="block truncate font-medium leading-5 text-foreground hover:underline">
                    {node.currentName ?? t`Fără denumire publică`}
                  </Link>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {[`CUI ${node.cui}`, node.legalForm, where, noStatus].filter(Boolean).join(' · ')}
                    {status ? (
                      <>
                        {' · '}
                        <span className={cn(node.observedStatus?.code !== STATUS_ACTIVE && 'text-amber-700 dark:text-amber-400')}>{status}</span>
                      </>
                    ) : null}
                    {recorded ? ` · ${recorded}` : null}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right align-top leading-5 tabular-nums">
                  <CellContent cell={cellOf(node, question.metric, locale)} marks={marks} />
                </TableCell>
                {extra.map((metric) => (
                  <TableCell key={metric} className="hidden whitespace-nowrap text-right align-top leading-5 tabular-nums md:table-cell">
                    {/* A company without a statement says so once, in the measure's column. */}
                    {unfiled ? null : <CellContent cell={cellOf(node, metric, locale)} marks={marks} />}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {marks.length > 0 ? (
        <ol className="mt-3 space-y-0.5 text-xs text-muted-foreground">
          {marks.map((status, index) => (
            <li key={status}>
              <sup className="mr-1 font-mono text-amber-700 dark:text-amber-400">{index + 1}</sup>
              {statusLabel(status)}
            </li>
          ))}
          <li>{t`O valoare reținută sau lipsă nu e arătată și nu intră în sume.`}</li>
        </ol>
      ) : null}
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
