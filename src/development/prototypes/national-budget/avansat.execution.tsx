import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { useQueryClient, useSuspenseQueries } from '@tanstack/react-query'
import { ChevronRight, LineChart } from 'lucide-react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ExecutionGridInput } from '@/features/national-budget/analytics/api/national-budget-api'
import { executionGridOptions, observationsOptions, useExecutionGrid, useSeriesEvidence } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { exactText, plotOf } from '@/features/national-budget/analytics/lib/exact'
import { SECTION_ROOT, cutLines, rankedTree } from '@/features/national-budget/analytics/lib/lines'
import { lastWholeQuarter, periodsBetween, shiftYears, toAnalyticsSeries, yearOf, type PeriodLabel } from '@/features/national-budget/analytics/lib/series'
import type { BudgetNationalCatalog, BudgetNationalSeries, BudgetObservation, BudgetSection, BudgetSeriesBasis, PeriodType } from '@/schemas/national-budget-api'
import { cn } from '@/lib/utils'
import { billionsText, moneyText, percentText } from './budget.format'
import { PeriodBars, type BarPoint } from './avansat.chart'
import { ChangeCell, DocumentLink, EvidenceIcon, EvidenceList, STICKY_HEAD, ShareCell, Spark, Unavailable, activeEdges } from './avansat.parts'
import { itemOfRand, randOfItem, type AdvancedState } from './avansat.state'
import { SECTION_OF, changeText, itemLabel, lastCompleteYear, periodShort, periodText, previousText, reasonText, type ExecPeriod } from './avansat.view'

/**
 * The bulletins' answers, each a table of every number: the lines of a
 * period (lei, GDP share, share of the total, change on a year earlier, the
 * line's years), the budgets that make up the consolidated one, and a line in
 * time (a chart over a matrix of lines by period). Values are the server's
 * audited series or printed observations; nothing is summed here.
 */

type Change = (patch: Partial<AdvancedState>) => void

/** One period of one item: the plotted value, the exact one, why there is none. */
export type Cell = {
  readonly value: number | null
  readonly exact: string | null
  readonly reason: string | null
  readonly start: string
  readonly end: string
}

/** A series' periods by label, through the chart contract: a value only where the period vouches for it. */
export function cellsOf(result: BudgetNationalSeries | undefined): ReadonlyMap<string, Cell> {
  if (!result) return new Map()
  const series = toAnalyticsSeries(result.item.itemId, result)
  return new Map(
    result.periods.map((period) => {
      const exact = series.pointDetails[period.date]?.exact ?? null
      return [period.date, { value: plotOf(exact), exact, reason: period.reason, start: period.periodStart, end: period.periodEnd }] as const
    }),
  )
}

const BALANCE_ITEMS = ['mfin.bgc.revenue.total', 'mfin.bgc.expenditure.total', 'mfin.bgc.balance.surplus_deficit'] as const

/** The items a population reads: a section's lines, or for the balance its three headline lines. */
export function itemsOf(catalog: BudgetNationalCatalog, tip: 'cheltuieli' | 'venituri' | 'sold'): readonly string[] {
  if (tip === 'sold') return BALANCE_ITEMS
  const section = SECTION_OF[tip]
  return catalog.execution.seriesItems.filter((item) => item.section === section).map((item) => item.itemId)
}

/** Every full year the bulletins finish, 2006 on: one key, so the table's years, the time tab and the years band share one read. */
export function yearsInput(catalog: BudgetNationalCatalog, itemIds: readonly string[]): ExecutionGridInput {
  return { itemIds, basis: 'FULL_YEAR', period: { type: 'YEAR', interval: { start: catalog.execution.coverage.firstMonth.slice(0, 4), end: String(lastCompleteYear(catalog.execution.coverage)) } } }
}

/** The time tab's window: every year; the last eight years by quarter; the last 36 months. */
function windowInput(catalog: BudgetNationalCatalog, itemIds: readonly string[], state: Pick<AdvancedState, 'pas' | 'cumulat'>): ExecutionGridInput {
  const last = catalog.execution.coverage.lastMonth
  if (state.pas === 'an') return yearsInput(catalog, itemIds)
  if (state.pas === 'trimestru') return { itemIds, basis: 'PERIOD_DIFFERENCE', period: { type: 'QUARTER', interval: { start: `${yearOf(last) - 7}-Q1`, end: lastWholeQuarter(last) } } }
  const months = periodsBetween('MONTH', `${yearOf(last) - 3}-01`, last).slice(-36)
  return { itemIds, basis: state.cumulat ? 'YTD' : 'PERIOD_DIFFERENCE', period: { type: 'MONTH', interval: { start: months[0]!, end: last } } }
}

export function focusOf(state: AdvancedState, catalog: BudgetNationalCatalog, tip: 'cheltuieli' | 'venituri' | 'sold'): string {
  if (tip === 'sold') return 'mfin.bgc.balance.surplus_deficit'
  const item = itemOfRand(state.rand)
  const section = SECTION_OF[tip]
  return item && catalog.execution.seriesItems.some((entry) => entry.itemId === item && entry.section === section) ? item : SECTION_ROOT[section]
}

/**
 * The GDP shares a release prints, by item. A share observation carries no
 * catalog item (only the amounts map to one), so it is matched by its line's
 * source label, within the section the read asked for.
 */
export function gdpShares(catalog: BudgetNationalCatalog, rows: readonly BudgetObservation[]): ReadonlyMap<string, number> {
  const out = new Map<string, number>()
  for (const row of rows) {
    const item = catalog.execution.seriesItems.find((entry) => entry.sourceLabel === row.lineItem && entry.section === row.section)
    const value = plotOf(row.value)
    if (item && value !== null && row.measure === 'GDP_SHARE') out.set(item.itemId, value)
  }
  return out
}

export function labelOf(catalog: BudgetNationalCatalog, itemId: string): string {
  return itemLabel(catalog.execution.seriesItems.find((item) => item.itemId === itemId)?.sourceLabel, itemId)
}

// ────────────────────────────────────────────────────────── the evidence ──

function basisText(basis: string | null, month: string | undefined, before: string | undefined): string {
  if (basis === 'REPORTED_CUMULATIVE') return t`cifra tipărită de buletinul din ${month ?? '—'}, de la 1 ianuarie`
  if (basis === 'REPORTED_CUMULATIVE_FIRST_PERIOD') return t`cifra tipărită de buletinul din ${month ?? '—'} (prima perioadă a anului)`
  if (basis === 'DERIVED_DIFFERENCE_BETWEEN_REPORTS') return t`diferența dintre buletinele din ${month ?? '—'} și ${before ?? '—'}, verificată de server`
  return '—'
}

/** One value's evidence, read when its icon opens: the exact amount, what it covers, the releases and cells it comes from. */
function SeriesEvidence({ itemId, basis, type, date, open }: { readonly itemId: string; readonly basis: BudgetSeriesBasis; readonly type: PeriodType; readonly date: string; readonly open: boolean }) {
  const { data, isPending, isError } = useSeriesEvidence({ itemId, basis, type, date }, open)
  if (isError) return <p className="text-muted-foreground">{t`Proveniența nu s-a putut citi acum.`}</p>
  if (isPending || !data) return <p className="text-muted-foreground">{t`Se citește proveniența…`}</p>
  const result = data.results[0]
  const period = result?.periods[0]
  if (!result || !period) return <p className="text-muted-foreground">{t`Nicio proveniență pentru această valoare.`}</p>
  const exact = result.series.data.find((point) => point.date === date)?.value ?? null
  const { endpoint, predecessor } = period
  return (
    <EvidenceList
      items={[
        [t`Rândul sursei`, result.item.sourceLabel],
        [t`Valoarea exactă`, exact ? <span className="font-mono">{`${exactText(exact)} lei`}</span> : reasonText(period.reason)],
        [t`Acoperă`, `${period.periodStart} – ${period.periodEnd}`],
        [t`Cum`, basisText(period.valueBasis, endpoint?.month, predecessor?.month)],
        endpoint?.document ? [t`Buletinul`, <DocumentLink key="doc" url={endpoint.document.url} sha256={endpoint.document.sha256} />] : null,
        endpoint?.label
          ? [t`Celula`, <span key="cell" className="font-mono">{`${endpoint.label.cell ?? '—'} · „${endpoint.label.text.trim()}"`}</span>]
          : endpoint?.observationKey
            ? [
                t`Celula`,
                <span key="cell" className="font-mono">
                  {endpoint.observationKey}
                </span>,
              ]
            : null,
        endpoint
          ? [
              t`Starea`,
              `${endpoint.executionStatus === 'ESTIMATE' ? t`estimare` : t`execuție`} · ${endpoint.finality === 'FINAL' ? t`finală` : endpoint.finality === 'OPERATIVE' ? t`operativă` : t`finalitate nedeclarată`}`,
            ]
          : null,
        predecessor?.document ? [t`Scade din`, <DocumentLink key="before" url={predecessor.document.url} sha256={predecessor.document.sha256} />] : null,
        endpoint?.document
          ? [
              t`SHA-256`,
              <span key="sha" className="break-all font-mono">
                {endpoint.document.sha256}
              </span>,
            ]
          : null,
      ]}
    />
  )
}

export function ObservationEvidence({ row }: { readonly row: BudgetObservation }) {
  return (
    <EvidenceList
      items={[
        [t`Rândul sursei`, `${row.lineItem ?? '—'} · ${row.component ?? '—'}`],
        [t`Valoarea exactă`, row.value ? <span className="font-mono">{`${exactText(row.value)} lei`}</span> : t`gol în sursă`],
        row.sourceToken
          ? [
              t`Tipărit`,
              <span key="token" className="font-mono">
                {row.sourceToken}
              </span>,
            ]
          : null,
        row.reportPeriod ? [t`Acoperă`, `${row.reportPeriod.start ?? '—'} – ${row.reportPeriod.end ?? '—'}`] : null,
        row.locator
          ? [
              t`Celula`,
              <span key="cell" className="font-mono">
                {row.locator.cell ?? `p. ${row.locator.page ?? '—'}, r. ${row.locator.row ?? '—'}, c. ${row.locator.column ?? '—'}`}
              </span>,
            ]
          : null,
        [t`Buletinul`, <DocumentLink key="doc" url={row.document.url} sha256={row.document.sha256} />],
        [
          t`SHA-256`,
          <span key="sha" className="break-all font-mono">
            {row.document.sha256}
          </span>,
        ],
      ]}
    />
  )
}

// ─────────────────────────────────────────────────────────── the lines ──

/** What a table of lines shows of each: the period, a year earlier, its years, its GDP share, its evidence. */
type LinesSource = {
  readonly at: (itemId: string) => Cell | undefined
  readonly before: (itemId: string) => Cell | undefined
  readonly years: (itemId: string) => ReadonlyMap<string, Cell>
  readonly yearLabels: readonly string[]
  /** The GDP shares the release prints; null where it prints none (a period alone, one budget). */
  readonly gdp: ReadonlyMap<string, number> | null
  readonly evidence: (itemId: string) => (open: boolean) => ReactNode
}

type LineRow = {
  readonly itemId: string
  readonly label: string
  readonly depth: number
  readonly cell: Cell
  readonly before: Cell | undefined
  readonly gdp: number | null
  readonly opens: boolean
  readonly years: ReadonlyMap<string, Cell>
}

/** The consolidated budget's lines in a period: the audited series, the GDP shares the release prints. */
export function CategoriesAnswer({
  state,
  catalog,
  period,
  onChange,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly onChange: Change
}) {
  const tip = state.tip as 'cheltuieli' | 'venituri'
  const section = SECTION_OF[tip] as Exclude<BudgetSection, 'BALANCE'>
  const itemIds = itemsOf(catalog, tip)
  const client = useQueryClient()
  const snapshot = catalog.snapshots.execution
  const before = shiftYears(period.label, -1)
  const [{ data: grid }, { data: years }, { data: gdp }] = useSuspenseQueries({
    queries: [
      executionGridOptions(client, snapshot, { itemIds, basis: period.basis, period: { type: period.type, dates: [before, period.label] } }),
      executionGridOptions(client, snapshot, yearsInput(catalog, itemIds)),
      observationsOptions(client, snapshot, { months: [period.releaseMonth], components: ['general_consolidated_budget'], sections: [section], measures: ['GDP_SHARE'] }),
    ],
  })
  const cells = new Map(grid.results.map((result) => [result.item.itemId, cellsOf(result)]))
  const yearCells = new Map(years.results.map((result) => [result.item.itemId, cellsOf(result)]))
  const gdpOf = gdpShares(catalog, gdp.rows)
  const pdfEra = yearOf(period.label) < 2019 || yearOf(period.label) === 2023
  return (
    <LinesTable
      state={state}
      catalog={catalog}
      period={period}
      onChange={onChange}
      source={{
        at: (itemId) => cells.get(itemId)?.get(period.label),
        before: (itemId) => cells.get(itemId)?.get(before),
        years: (itemId) => yearCells.get(itemId) ?? new Map(),
        yearLabels: [...(yearCells.get(SECTION_ROOT[section])?.keys() ?? [])],
        gdp: period.cumulative && gdpOf.size > 0 ? gdpOf : null,
        evidence: (itemId) => (open) => <SeriesEvidence itemId={itemId} basis={period.basis} type={period.type} date={period.label} open={open} />,
      }}
      note={pdfEra ? t`Buletinele din anii PDF (până în 2018, și 2023) au rânduri fără serie: rândurile de aici pot să nu acopere totalul.` : null}
    />
  )
}

// ──────────────────────────────────────────────────────────── the folds ──

/** Which groups of a tree are folded: all open at first; a group folds and unfolds in place, never as another view. */
function useFolds() {
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set())
  const toggle = (itemId: string) =>
    setFolded((previous) => {
      const next = new Set(previous)
      if (!next.delete(itemId)) next.add(itemId)
      return next
    })
  return { folded, toggle, setFolded }
}

/** The rows a fold leaves in view: under a folded group, every row deeper than it goes, up to the next row no deeper. */
function unfolded<T extends { readonly itemId: string; readonly depth: number }>(rows: readonly T[], folded: ReadonlySet<string>): readonly T[] {
  const out: T[] = []
  let hideBelow = Infinity
  for (const row of rows) {
    if (row.depth > hideBelow) continue
    hideBelow = folded.has(row.itemId) ? row.depth : Infinity
    out.push(row)
  }
  return out
}

/** A group's chevron: down while its rows show. */
function Fold({ open }: { readonly open: boolean }) {
  return <ChevronRight className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', open && 'rotate-90')} aria-hidden="true" />
}

/**
 * A section's lines in one period, every number at once, as the bulletin's
 * tree: each group above its lines, one step in, the largest first. A group
 * folds and unfolds in place; a line goes to its history.
 */
export function LinesTable({
  state,
  catalog,
  period,
  source,
  note,
  onChange,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly source: LinesSource
  /** What a reader should know of these lines first (a PDF year, one budget's figures); else how the table reads. */
  readonly note: string | null
  readonly onChange: Change
}) {
  const { folded, toggle, setFolded } = useFolds()
  const tip = state.tip as 'cheltuieli' | 'venituri'
  const section = SECTION_OF[tip] as Exclude<BudgetSection, 'BALANCE'>
  const itemIds = itemsOf(catalog, tip)
  const before = shiftYears(period.label, -1)
  const present = new Set(itemIds.filter((itemId) => source.at(itemId)?.exact))
  const root = SECTION_ROOT[section]
  const total = source.at(root)
  if (!total?.exact) {
    return <Unavailable>{t`Buletinele nu dau o valoare pentru ${periodText(period.label, period.basis)}: ${reasonText(total?.reason ?? null)}.`}</Unavailable>
  }
  // A line of this year's bulletins (or last year's) that has no value now stays in the tree, a gap with its reason: its
  // group is then no longer the sum of the rows shown, and the note says so. A line that didn't exist then stays out.
  const year = yearOf(period.label)
  const existed = (itemId: string) => {
    const years = source.years(itemId)
    return Boolean(years.get(String(year))?.exact ?? years.get(String(year - 1))?.exact ?? source.before(itemId)?.exact)
  }
  const gaps = new Set(itemIds.filter((itemId) => !present.has(itemId) && existed(itemId)))
  const shown = new Set([...present, ...gaps])
  const rows: LineRow[] = rankedTree({ section, sectionItems: itemIds, present: shown, value: (itemId) => source.at(itemId)?.value ?? null }).map((line) => ({
    itemId: line.itemId,
    label: labelOf(catalog, line.itemId),
    depth: line.depth,
    cell: source.at(line.itemId) ?? { value: null, exact: null, reason: null, start: '', end: '' },
    before: source.before(line.itemId),
    gdp: source.gdp?.get(line.itemId) ?? null,
    opens: line.opens,
    years: source.years(line.itemId),
  }))
  const groups = rows.filter((row) => row.opens).map((row) => row.itemId)
  const allFolded = groups.length > 0 && groups.every((itemId) => folded.has(itemId))
  const share = (row: LineRow) => (row.cell.value !== null && total.value ? row.cell.value / total.value : null)
  const widest = Math.max(0.0001, ...rows.map((row) => Math.abs(share(row) ?? 0)))
  const showGdp = source.gdp !== null
  const yearLabels = source.yearLabels
  const selectedYear = period.type === 'YEAR' ? period.label : null
  const sparkOf = (map: ReadonlyMap<string, Cell>) => yearLabels.map((label) => ({ label, value: map.get(label)?.value ?? null }))
  const go = (row: LineRow) => (row.opens ? toggle(row.itemId) : onChange({ dupa: 'timp', rand: randOfItem(row.itemId) }))
  const totalGdp = source.gdp?.get(root)
  return (
    <div>
      <Table containerClassName="overflow-visible">
        <TableHeader className={STICKY_HEAD}>
          <TableRow>
            <TableHead>
              {groups.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setFolded(allFolded ? new Set() : new Set(groups))}
                  className="text-xs font-normal text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {allFolded ? t`Desfă toate grupele` : t`Restrânge toate grupele`}
                </button>
              ) : (
                <span className="sr-only">{t`Rândul`}</span>
              )}
            </TableHead>
            <TableHead className="text-right font-semibold text-foreground">{t`Lei`}</TableHead>
            {showGdp ? <TableHead className="hidden text-right md:table-cell">{t`% din PIB`}</TableHead> : null}
            <TableHead className="hidden w-32 text-right sm:table-cell">{t`Cota`}</TableHead>
            <TableHead className="hidden whitespace-nowrap text-right md:table-cell" title={previousText(period)}>
              {t`Față de ${periodShort(before)}`}
            </TableHead>
            <TableHead className="hidden w-32 whitespace-nowrap lg:table-cell">{yearLabels.length > 0 ? `${yearLabels[0]}–${yearLabels[yearLabels.length - 1]}` : ''}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {unfolded(rows, folded).map((row) => {
            const open = row.opens && !folded.has(row.itemId)
            return (
              <TableRow key={row.itemId} className={cn('group cursor-pointer', row.depth === 0 && row.opens && 'bg-muted/40')} onClick={() => go(row)}>
                <TableCell className="max-w-[13rem] sm:max-w-md">
                  <span className={cn('flex items-center gap-1', INDENT)} style={{ '--depth': row.depth } as CSSProperties}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        go(row)
                      }}
                      aria-expanded={row.opens ? open : undefined}
                      className={cn('flex min-w-0 items-center gap-1 text-left', row.opens ? (row.depth === 0 ? 'font-semibold' : 'font-medium') : 'hover:underline')}
                      title={row.opens ? (open ? t`Restrânge` : t`Desfă`) : t`În timp`}
                    >
                      {row.opens ? <Fold open={open} /> : <span className="size-3.5 shrink-0" aria-hidden="true" />}
                      <span className={cn('line-clamp-2 sm:line-clamp-none sm:truncate', !row.cell.exact && 'text-muted-foreground')}>{row.label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onChange({ dupa: 'timp', rand: randOfItem(row.itemId) })
                      }}
                      aria-label={t`${row.label}, în timp`}
                      className="hidden size-7 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:opacity-100 sm:inline-flex sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <LineChart className="size-3.5" aria-hidden="true" />
                    </button>
                    <EvidenceIcon label={row.label}>{source.evidence(row.itemId)}</EvidenceIcon>
                  </span>
                </TableCell>
                <TableCell
                  className={cn('whitespace-nowrap text-right tabular-nums', row.opens && row.depth === 0 && 'font-semibold')}
                  title={row.cell.exact ? `${exactText(row.cell.exact)} lei` : reasonText(row.cell.reason)}
                >
                  {row.cell.value !== null ? moneyText(row.cell.value) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                {showGdp ? <TableCell className="hidden text-right tabular-nums md:table-cell">{row.gdp !== null ? percentText(row.gdp, 2) : '—'}</TableCell> : null}
                <TableCell className="hidden sm:table-cell">
                  <ShareCell part={row.cell.exact} whole={total.exact} widest={widest} />
                </TableCell>
                <TableCell
                  className="hidden text-right md:table-cell"
                  title={row.before?.exact ? t`${previousText(period)}: ${moneyText(row.before.value ?? 0)}` : row.before ? reasonText(row.before.reason) : undefined}
                >
                  <ChangeCell text={changeText(row.cell.exact, row.before?.exact ?? null)} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Spark values={sparkOf(row.years)} selected={selectedYear} label={t`${row.label}, pe ani`} />
                </TableCell>
              </TableRow>
            )
          })}
          <TableRow className="text-muted-foreground hover:bg-transparent">
            <TableCell>
              <span className="pl-[1.125rem]">{labelOf(catalog, root)}</span>
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums text-foreground" title={`${exactText(total.exact)} lei`}>
              {moneyText(total.value ?? 0)}
            </TableCell>
            {showGdp ? <TableCell className="hidden text-right tabular-nums md:table-cell">{totalGdp != null ? percentText(totalGdp, 2) : '—'}</TableCell> : null}
            <TableCell className="hidden sm:table-cell" />
            <TableCell className="hidden text-right md:table-cell">
              <ChangeCell text={changeText(total.exact, source.before(root)?.exact ?? null)} />
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <Spark values={sparkOf(source.years(root))} selected={selectedYear} label={t`Totalul, pe ani`} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <p className="mt-2 max-w-[72ch] text-xs text-muted-foreground">
        {note ??
          (gaps.size > 0
            ? null
            : t`Fiecare grupă, cu rândurile ei dedesubt, de la cel mai mare; o grupă e suma rândurilor ei și se restrânge cu un clic. Un rând își arată anii; cotele, din total.`)}{' '}
        {gaps.size > 0 ? t`Un rând fără valoare în această perioadă („—", motivul la indicator) rămâne în arbore; grupa lui nu mai e suma rândurilor arătate.` : null}{' '}
        {t`Variația e nominală, față de ${previousText(period)}.`}
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── in time ──

export function pointsOf(cells: ReadonlyMap<string, Cell>, dates: readonly string[], basis: BudgetSeriesBasis): readonly BarPoint[] {
  return dates.map((date) => {
    const cell = cells.get(date)
    return { label: date, value: cell?.value ?? null, exact: cell?.exact ?? null, gap: cell?.exact ? undefined : reasonText(cell?.reason ?? null), title: periodText(date, basis) }
  })
}

/** The consolidated budget in time: the audited series, by year, quarter or month. */
export function TimeAnswer({
  state,
  catalog,
  period,
  onChange,
  titleId,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly onChange: Change
  readonly titleId: string
}) {
  const tip = state.tip as 'cheltuieli' | 'venituri' | 'sold'
  const input = windowInput(catalog, itemsOf(catalog, tip), state)
  const grid = useExecutionGrid(input)
  const cells = new Map(grid.results.map((result) => [result.item.itemId, cellsOf(result)]))
  const dates = grid.results[0]?.periods.map((item) => item.date) ?? []
  return (
    <TimeView
      state={state}
      catalog={catalog}
      period={period}
      cells={cells}
      dates={dates}
      basis={input.basis}
      type={input.period.type}
      scope={null}
      alert={null}
      onChange={onChange}
      titleId={titleId}
    />
  )
}

/** A line in time, over every line by period: the chart of the line followed, then the matrix of the section's lines (the balance's three). */
export function TimeView({
  state,
  catalog,
  period,
  cells,
  dates,
  basis,
  type,
  scope,
  alert,
  onChange,
  titleId,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly cells: ReadonlyMap<string, ReadonlyMap<string, Cell>>
  readonly dates: readonly PeriodLabel[]
  readonly basis: BudgetSeriesBasis
  readonly type: PeriodType
  /** Whose figures, when not the consolidated budget's: the chart's caption ends with it. */
  readonly scope: string | null
  /** What differs from what the reader asked (a month alone read from 1 January). */
  readonly alert: string | null
  readonly onChange: Change
  readonly titleId: string
}) {
  const tip = state.tip as 'cheltuieli' | 'venituri' | 'sold'
  const itemIds = itemsOf(catalog, tip)
  const focus = focusOf(state, catalog, tip)
  const selected = period.type === type && period.basis === basis ? period.label : null
  const pick = (label: string) => onChange({ perioada: label, cumulat: type === 'MONTH' ? basis === 'YTD' : true })
  const focusLabel = labelOf(catalog, focus)
  let rows: readonly { readonly itemId: string; readonly depth: number; readonly opens: boolean }[]
  if (tip === 'sold') rows = BALANCE_ITEMS.map((itemId) => ({ itemId, depth: 0, opens: false }))
  else {
    // The section's tree under its total, the largest of the newest period first.
    const section = SECTION_OF[tip] as Exclude<BudgetSection, 'BALANCE'>
    const present = new Set(itemIds.filter((itemId) => [...(cells.get(itemId)?.values() ?? [])].some((cell) => cell.exact !== null)))
    const latest = (itemId: string) => {
      const values = dates.map((date) => cells.get(itemId)?.get(date)?.value ?? null).filter((value): value is number => value !== null)
      return values[values.length - 1] ?? null
    }
    rows = [{ itemId: SECTION_ROOT[section], depth: 0, opens: true }, ...rankedTree({ section, sectionItems: itemIds, present, value: latest }).map((line) => ({ ...line, depth: line.depth + 1 }))]
  }
  const how = basis === 'YTD' ? t`cumulat de la 1 ianuarie` : basis === 'FULL_YEAR' ? t`an întreg` : type === 'QUARTER' ? t`pe trimestru` : t`pe lună`
  const caption = [focusLabel.toLocaleLowerCase('ro-RO'), how, scope].filter(Boolean).join(', ')
  return (
    <div>
      {alert ? <p className="mb-3 border-l-2 border-amber-600/60 pl-3 text-sm text-foreground">{alert}</p> : null}
      <PeriodBars points={pointsOf(cells.get(focus) ?? new Map(), dates, basis)} caption={caption} selected={selected} onSelect={pick} labelledBy={titleId} />
      <PeriodMatrix
        className="mt-8"
        rows={rows.map((row) => ({ ...row, label: labelOf(catalog, row.itemId), cells: cells.get(row.itemId) ?? new Map(), total: row.itemId === SECTION_ROOT[SECTION_OF[tip]] && tip !== 'sold' }))}
        dates={dates}
        basis={basis}
        focus={focus}
        selected={selected}
        onFocus={tip === 'sold' ? undefined : (itemId) => onChange({ rand: itemId === SECTION_ROOT[SECTION_OF[tip]] ? null : randOfItem(itemId) })}
        onPick={pick}
      />
      <p className="mt-2 max-w-[72ch] text-xs text-muted-foreground">
        {basis === 'PERIOD_DIFFERENCE'
          ? t`O lună sau un trimestru e diferența dintre două buletine cumulate, verificată de server; unde lipsește un buletin, perioada rămâne goală, nu zero.`
          : basis === 'YTD'
            ? t`Fiecare lună: cifra buletinului de la 1 ianuarie. Nu se compară luni din ani diferiți ca pe cifre lunare.`
            : t`Fiecare an: buletinul din decembrie. Anii fără buletin comparabil rămân goi, cu motivul la indicator.`}
      </p>
    </div>
  )
}

type MatrixRow = { readonly itemId: string; readonly label: string; readonly depth: number; readonly opens: boolean; readonly cells: ReadonlyMap<string, Cell>; readonly total: boolean }

/** A line one step under its group, indented by its depth: less on a phone, where the names are narrow. */
const INDENT = 'pl-[calc(var(--depth)*0.625rem)] sm:pl-[calc(var(--depth)*1rem)]'

/** The pinned names: opaque, with a rule and a soft shadow on their right edge. */
const PINNED = 'sticky left-0 z-10 border-r border-border bg-background pr-3 text-left shadow-[6px_0_8px_-6px_rgb(0_0_0/0.18)]'

/**
 * The matrix's fixed columns, and the table's width as their sum: a fixed
 * layout holds only in a table of a set width. The strip of periods above it
 * has the same width and columns, so it lines up cell for cell.
 */
const MATRIX_COLS = '[--name-col:10rem] sm:[--name-col:18rem] [--period-col:4.5rem]'
const NAME_COL = 'w-[var(--name-col)] min-w-[var(--name-col)] max-w-[var(--name-col)]'
const PERIOD_COL = 'w-[var(--period-col)] min-w-[var(--period-col)] max-w-[var(--period-col)]'
const matrixWidth = (periods: number): CSSProperties => ({ width: `calc(var(--name-col) + ${periods} * var(--period-col))` })

/**
 * Lines by period, every number at once: the first column pinned, the newest
 * period in view, a gap a dot with its reason. The periods stand in a strip
 * above the table, not in its header: the table scrolls sideways in a box of
 * its own, and a header inside that box would stick to the box, not under the
 * page's bar. The strip sticks (CSS, drawn by the browser in step with the
 * scroll) and follows the table sideways; the table keeps its header, hidden,
 * for screen readers.
 */
function PeriodMatrix({
  rows,
  dates,
  basis,
  focus,
  selected,
  onFocus,
  onPick,
  className,
}: {
  readonly rows: readonly MatrixRow[]
  readonly dates: readonly PeriodLabel[]
  readonly basis: BudgetSeriesBasis
  readonly focus: string
  readonly selected: string | null
  readonly onFocus?: (itemId: string) => void
  readonly onPick: (label: string) => void
  readonly className?: string
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const { folded, toggle } = useFolds()
  // The newest periods are what a reader came for: the table opens scrolled to them. The pinned names carry a
  // rule and a shadow, so a cell passing under them reads as covered („…14,2"), not as a smaller number.
  useEffect(() => {
    const element = scroller.current
    if (!element) return
    element.scrollLeft = element.scrollWidth
    if (strip.current) strip.current.scrollLeft = element.scrollLeft
  }, [dates.length])
  return (
    <div className={cn(MATRIX_COLS, className)}>
      <div ref={strip} aria-hidden="true" className="sticky top-[var(--bar-h,0px)] z-20 overflow-hidden border-b bg-background">
        <div className="flex text-xs" style={matrixWidth(dates.length)}>
          <div className={cn(PINNED, NAME_COL, 'py-2 text-muted-foreground')}>{t`mld. lei`}</div>
          {dates.map((date) => (
            <div
              key={date}
              className={cn(PERIOD_COL, 'px-2 py-2 text-right tabular-nums', date === selected ? 'font-semibold text-foreground' : 'text-muted-foreground', activeEdges(false, date === selected))}
            >
              <button type="button" tabIndex={-1} onClick={() => onPick(date)} className="whitespace-nowrap hover:text-foreground hover:underline" title={periodText(date, basis)}>
                {periodShort(date)}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div
        ref={scroller}
        onScroll={(event) => {
          if (strip.current) strip.current.scrollLeft = event.currentTarget.scrollLeft
        }}
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label={t`Tabelul pe perioade`}
      >
        <table className="table-fixed border-collapse text-sm" style={matrixWidth(dates.length)}>
          <thead>
            <tr>
              <th scope="col" className={cn(NAME_COL, 'h-0 p-0')}>
                <span className="sr-only">{t`Rândul, în mld. lei`}</span>
              </th>
              {dates.map((date) => (
                <th key={date} scope="col" className={cn(PERIOD_COL, 'h-0 p-0')}>
                  <span className="sr-only">{periodText(date, basis)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {unfolded(rows, folded).map((row) => {
              const focused = row.itemId === focus
              const open = !folded.has(row.itemId)
              return (
                <tr key={row.itemId} className={cn('border-b border-border/60', focused && 'bg-muted/50')}>
                  <th
                    scope="row"
                    className={cn(PINNED, INDENT, 'py-1.5 font-normal', focused && 'bg-muted', row.total ? 'font-semibold' : row.opens && 'font-medium', activeEdges(focused, false))}
                    style={{ '--depth': row.total ? 0 : row.depth - 1 } as CSSProperties}
                  >
                    <span className="flex items-center gap-0.5">
                      {row.opens && !row.total ? (
                        <button
                          type="button"
                          onClick={() => toggle(row.itemId)}
                          aria-expanded={open}
                          aria-label={open ? t`Restrânge ${row.label}` : t`Desfă ${row.label}`}
                          className="inline-flex size-5 shrink-0 items-center justify-center"
                        >
                          <Fold open={open} />
                        </button>
                      ) : (
                        <span className="size-5 shrink-0" aria-hidden="true" />
                      )}
                      {onFocus ? (
                        <button type="button" onClick={() => onFocus(row.itemId)} aria-pressed={focused} className="block min-w-0 flex-1 truncate text-left hover:underline" title={row.label}>
                          {row.label}
                        </button>
                      ) : (
                        <span className="block min-w-0 flex-1 truncate" title={row.label}>
                          {row.label}
                        </span>
                      )}
                    </span>
                  </th>
                  {dates.map((date) => {
                    const cell = row.cells.get(date)
                    return (
                      <td
                        key={date}
                        className={cn(
                          'px-2 py-1.5 text-right tabular-nums',
                          date === selected && 'bg-muted/60',
                          row.total && 'font-semibold',
                          !cell?.exact && 'text-muted-foreground/60',
                          activeEdges(focused, date === selected),
                        )}
                        title={cell?.exact ? `${periodText(date, basis)}: ${exactText(cell.exact)} lei` : `${periodText(date, basis)}: ${reasonText(cell?.reason ?? null)}`}
                      >
                        {cell?.value != null ? billionsText(cell.value) : '·'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** A share for the figures: the largest row of the default cut, against the section's total. */
export function largestShare(grid: { readonly results: readonly BudgetNationalSeries[] }, section: Exclude<BudgetSection, 'BALANCE'>, itemIds: readonly string[], label: PeriodLabel, depth: number) {
  const cells = new Map(grid.results.map((result) => [result.item.itemId, cellsOf(result).get(label)]))
  const present = new Set(itemIds.filter((itemId) => cells.get(itemId)?.exact))
  const rows = cutLines({ section, sectionItems: itemIds, present, depth })
  const total = cells.get(SECTION_ROOT[section])?.exact ?? null
  const top = rows.map((itemId) => ({ itemId, value: cells.get(itemId)?.value ?? null, exact: cells.get(itemId)?.exact ?? null })).sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))[0]
  return top && top.value !== null && top.exact !== null && total ? { itemId: top.itemId, value: top.value, exact: top.exact, total } : null
}
