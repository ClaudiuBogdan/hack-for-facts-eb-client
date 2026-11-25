import { useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { BudgetAnalyticsError } from '@/components/entity-analytics/BudgetAnalyticsError'
import { PopulationMethodologyNote } from '@/components/normalization/population-methodology-note'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { entityRankingFilter, fetchEntityAnalytics } from '@/lib/api/entity-analytics'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { downloadMapDataCsv } from '@/lib/map-data-csv'
import { populationMethodologyReference } from '@/lib/population-methodology'
import { cn, formatNumber } from '@/lib/utils'
import type { EntityAnalyticsDataPoint } from '@/schemas/entity-analytics'
import type { PublicInstitutionsState } from '../hooks/use-public-institutions-page'
import { isCompleteExport, percentText, placeName, rankingCsv } from '../lib/public-institutions-format'
import { previousYearQueryOptions } from '../api/public-institutions-queries'
import { changeOf } from '../lib/public-institutions-selection'
import { RANKING_ID } from '../lib/public-institutions-anchors'
import { Amount } from './public-institutions-parts'

/**
 * The ranking: who, and how much. The amount the list is ordered by is always
 * in view, a phone included; the change on the year before beside it on a
 * wide screen, for a whole year only. Under it, which rows these are, the
 * whole list as a file, the pages.
 */

const NUMBER = 'whitespace-nowrap text-right align-top leading-5 tabular-nums'
const PAGER = 'inline-flex size-11 items-center justify-center border hover:bg-muted disabled:opacity-40 sm:size-8'
const EXPORT_BATCH = 500

function SortHead({ page, column, children, className, firstOrder = 'desc' }: { readonly page: PublicInstitutionsState; readonly column: string; readonly children: ReactNode; readonly className?: string; readonly firstOrder?: 'asc' | 'desc' }) {
  const sorted = page.selection.sortBy === column
  const order = page.selection.sortOrder
  const Arrow = order === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead className={className} aria-sort={sorted ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => page.setSorting(column, sorted ? (order === 'asc' ? 'desc' : 'asc') : firstOrder)}
        className={cn('inline-flex min-h-11 items-center gap-1 whitespace-nowrap hover:text-foreground sm:min-h-0', sorted && 'font-semibold text-foreground')}
      >
        {children}
        {sorted ? <Arrow className="size-3" aria-hidden="true" /> : null}
      </button>
    </TableHead>
  )
}

/** Every row of the selection, in the list's order, read in batches; a list that changed while it was read is refused. */
async function readAllRows(page: PublicInstitutionsState, total: number): Promise<readonly EntityAnalyticsDataPoint[]> {
  const { selection } = page
  const rows: EntityAnalyticsDataPoint[] = []
  for (let offset = 0; offset < total; offset += EXPORT_BATCH) {
    const batch = await fetchEntityAnalytics({
      filter: entityRankingFilter(selection.filter),
      sort: { by: selection.sortBy === 'county_name' ? 'county_code' : selection.sortBy, order: selection.sortOrder },
      limit: EXPORT_BATCH,
      offset,
    })
    if (batch.pageInfo.totalCount !== total || batch.nodes.length === 0) throw new Error('changed')
    rows.push(...batch.nodes)
  }
  if (!isCompleteExport(rows, total)) throw new Error('incomplete')
  return rows
}

function RankingFoot({ page, shown, total }: { readonly page: PublicInstitutionsState; readonly shown: number; readonly total: number }) {
  const [exporting, setExporting] = useState<'idle' | 'busy' | 'failed'>('idle')
  const first = (page.page - 1) * page.pageSize + 1
  const pages = Math.max(1, Math.ceil(total / page.pageSize))
  const exportCsv = async () => {
    setExporting('busy')
    try {
      const rows = await readAllRows(page, total)
      downloadMapDataCsv(rankingCsv(rows, populationMethodologyReference()), `institutii-publice-${page.selection.year ?? 'perioada'}.csv`)
      setExporting('idle')
    } catch {
      setExporting('failed')
    }
  }
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="tabular-nums">
        {t`${formatNumber(first)}–${formatNumber(first + shown - 1)} din ${formatNumber(total)}`}
        {exporting === 'failed' ? (
          <span role="alert" className="ml-2 text-foreground">
            {t`Fișierul nu a putut fi făcut. Încearcă din nou.`}
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-1">
        <button type="button" disabled={exporting === 'busy'} onClick={() => void exportCsv()} className="inline-flex min-h-11 items-center gap-1 px-2 hover:text-foreground disabled:opacity-60 sm:min-h-8">
          <Download className="size-3.5" aria-hidden="true" />
          {exporting === 'busy' ? t`Se pregătește…` : t`CSV`}
        </button>
        <span className="px-1 tabular-nums">{t`Pagina ${formatNumber(page.page)} din ${formatNumber(pages)}`}</span>
        <button type="button" disabled={page.page <= 1} onClick={() => page.setPagination(page.page - 1)} className={PAGER} aria-label={t`Pagina anterioară`}>
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button type="button" disabled={page.page >= pages} onClick={() => page.setPagination(page.page + 1)} className={PAGER} aria-label={t`Pagina următoare`}>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </span>
    </div>
  )
}

/** The same institutions a year earlier, for a whole year only: one read of the page's rows. */
function usePreviousYear(page: PublicInstitutionsState, rows: readonly EntityAnalyticsDataPoint[]) {
  const status = page.coverage?.status
  const shown = page.selection.year != null && page.selection.measure !== 'other' && (status === 'complete' || status === 'pending')
  // Read only for the column that shows it.
  const whole = shown && status === 'complete'
  const previous = useQuery(previousYearQueryOptions(page.selection, rows.map((row) => row.entity_cui), whole))
  const byCui = useMemo(() => new Map((previous.data?.nodes ?? []).map((node) => [node.entity_cui, node])), [previous.data])
  return { shown, pending: status === 'pending' || (whole && rows.length > 0 && previous.isPending), byCui }
}

/** The API cannot answer this selection (a year without CPI for real prices, a population it lacks): no retry helps, the reader has to change it. */
function isUnavailable(error: Error | null): error is Error {
  return error instanceof GraphQLRequestError && error.graphQLErrors.some((entry) => entry.extensions?.code === 'SERVICE_UNAVAILABLE')
}

function Change({ now, before, locale, pending }: { readonly now: number | null | undefined; readonly before: number | null | undefined; readonly locale: string; readonly pending: boolean }) {
  if (pending) return <span className="inline-block h-3 w-10 animate-pulse rounded-sm bg-muted align-middle" />
  const ratio = changeOf(now, before)
  return <span className="text-muted-foreground">{ratio == null ? '—' : percentText(ratio, locale, true)}</span>
}

export function PublicInstitutionsRanking({ page }: { readonly page: PublicInstitutionsState }) {
  const { ranking, perCapita, selection, locale, currency } = page
  const rows: readonly EntityAnalyticsDataPoint[] = ranking.data?.nodes ?? []
  const total = ranking.data?.pageInfo.totalCount ?? 0
  const first = (page.page - 1) * page.pageSize + 1
  const previous = usePreviousYear(page, rows)
  const unit = page.unit.startsWith('%') ? page.unit : undefined
  // Per inhabitant on a phone, one amount fits: the one the list is ordered by.
  const byTotal = perCapita && selection.sortBy === 'total_amount'
  const measureOf = (row: EntityAnalyticsDataPoint | undefined) => (row ? (perCapita ? row.per_capita_amount : row.total_amount) : undefined)
  return (
    <section id={RANKING_ID} aria-label={t`Clasament`} className="min-w-0 scroll-mt-14">
      {isUnavailable(ranking.error) ? (
        // The old page's explanation: what is missing, and to choose another period or nominal amounts.
        <div className="py-6">
          <BudgetAnalyticsError error={ranking.error} />
        </div>
      ) : ranking.isError ? (
        <p role="alert" className="py-6 text-sm text-muted-foreground">
          {t`Clasamentul nu a putut fi citit.`}{' '}
          <button type="button" onClick={() => void ranking.refetch()} className="font-medium text-foreground underline underline-offset-4">
            {t`Încearcă din nou`}
          </button>
        </p>
      ) : !ranking.data ? (
        <div className="h-[36rem] animate-pulse bg-muted/30" aria-busy="true" aria-label={t`Se încarcă clasamentul`} />
      ) : rows.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">{t`Nicio instituție în această selecție.`}</p>
      ) : (
        <div className={cn(ranking.isFetching && 'opacity-70 transition-opacity')}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="hidden w-12 sm:table-cell">#</TableHead>
                <SortHead page={page} column="entity_name" firstOrder="asc">
                  {t`Instituția`}
                </SortHead>
                {perCapita ? (
                  <>
                    <SortHead page={page} column="population" className="hidden text-right md:table-cell">
                      {t`Populație`}
                    </SortHead>
                    <SortHead page={page} column="per_capita_amount" className={cn('text-right', byTotal && 'hidden sm:table-cell')}>
                      {t`Pe locuitor`}
                    </SortHead>
                  </>
                ) : null}
                <SortHead page={page} column="total_amount" className={cn('text-right', perCapita && !byTotal && 'hidden sm:table-cell')}>
                  {unit ? t`Din PIB` : t`Total`}
                </SortHead>
                {previous.shown ? <TableHead className="hidden w-28 whitespace-nowrap text-right md:table-cell">{t`Față de ${(selection.year ?? 0) - 1}`}</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.entity_cui}>
                  <TableCell className="hidden align-top font-mono text-xs leading-5 tabular-nums text-muted-foreground sm:table-cell">{first + index}</TableCell>
                  <TableCell className="max-w-[11rem] align-top sm:max-w-md lg:max-w-xl">
                    <Link to="/entities/$cui" params={{ cui: row.entity_cui }} className="line-clamp-2 font-medium leading-5 text-foreground hover:underline sm:line-clamp-1" title={row.entity_name}>
                      {row.entity_name}
                    </Link>
                    {row.county_name ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{placeName(row.county_name, locale)}</span> : null}
                  </TableCell>
                  {perCapita ? (
                    <>
                      <TableCell className={cn(NUMBER, 'hidden text-muted-foreground md:table-cell')}>{row.population != null ? formatNumber(row.population) : '—'}</TableCell>
                      <TableCell className={cn(NUMBER, byTotal && 'hidden sm:table-cell')}>
                        <Amount value={row.per_capita_amount} currency={currency} locale={locale} strong={selection.sortBy !== 'total_amount'} />
                      </TableCell>
                    </>
                  ) : null}
                  <TableCell className={cn(NUMBER, perCapita && !byTotal && 'hidden sm:table-cell')}>
                    <Amount value={row.total_amount} currency={currency} locale={locale} unit={unit} strong={!perCapita || selection.sortBy === 'total_amount'} />
                  </TableCell>
                  {previous.shown ? (
                    <TableCell className={cn(NUMBER, 'hidden text-xs md:table-cell')}>
                      <Change now={measureOf(row)} before={measureOf(previous.byCui.get(row.entity_cui))} locale={locale} pending={previous.pending} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <RankingFoot page={page} shown={rows.length} total={total} />
          {perCapita ? <PopulationMethodologyNote /> : null}
        </div>
      )}
    </section>
  )
}
