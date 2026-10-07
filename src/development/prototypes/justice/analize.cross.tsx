import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { groupByOf, type AnalysisPlan, type Caseload, type CaseloadGroupBy, type CaseloadRead } from '@/features/justice/lib/analysis-plans'
import { useAnalysisPlan } from '@/features/justice/hooks/use-justice-analysis'
import { changeOf, comparable, countsBy, drilled, filterOf, GROUPINGS, LEVEL_KEYS, OTHER_STAGES, sourceOf, UNRANKED, YEARS, type CaseloadFilter, type Counts, type Grouping, type LevelKey, type Question } from '@/features/justice/lib/analysis-model'
import { groupingLabel, levelLabel, rowLabel, stageName } from '@/features/justice/lib/analysis-text'
import { lastMonthText } from '@/features/justice/lib/analysis-notes'
import { JUSTICE_LAST_CAPTURE_YEAR } from '@/features/justice/lib/hub-years'
import { countText, signedPercentText } from '@/features/justice/lib/judicial-format'
import { STAGE_KEYS, type StageKey } from '@/features/justice/lib/judicial-model'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'

/**
 * The `incrucisat` variant's answer, kept as the design record (the owner
 * picked `clasament`, 7 October 2026): the same groups as rows, crossed with
 * the capture's years, the stages or the levels as columns. A read per
 * column grouped by the rows — or, for stages as rows, a read per stage
 * grouped by the columns; stages as columns add „Alte etape" as each row's
 * rest of its total.
 */

export type Columns = 'ani' | 'etape' | 'niveluri'
export const COLUMNS: readonly Columns[] = ['ani', 'etape', 'niveluri']

const CONTROL_HEIGHT = '[&>button]:min-h-11 sm:[&>button]:min-h-10 sm:[&>button]:px-4'
const TOP = 25
const TOP_EXPANDED = 100

/** Whether a grouping can be crossed with a set of columns: not with itself, nor courts with levels (a court is at one level). */
export function crossable(rows: Grouping, columns: Columns): boolean {
  if (columns === 'etape') return rows !== 'etape'
  if (columns === 'niveluri') return rows !== 'niveluri' && rows !== 'instante'
  return true
}

function columnKeys(question: Question, columns: Columns): readonly string[] {
  if (columns === 'ani') return [...YEARS].reverse().map(String)
  if (columns === 'etape') return question.stages.length > 0 ? question.stages : [...STAGE_KEYS, OTHER_STAGES]
  return question.levels.length > 0 ? question.levels : LEVEL_KEYS
}

function columnLabel(columns: Columns, key: string, length: 'full' | 'short' = 'full'): string {
  if (columns === 'ani') return key
  if (columns === 'etape') {
    if (length === 'short' && key === 'extraordinare') return t`Căi extraordinare`
    if (length === 'short' && key === OTHER_STAGES) return t`Altele`
    return stageName(key as StageKey | typeof OTHER_STAGES)
  }
  if (length === 'short' && key === 'militare') return t`Militare`
  return levelLabel(key as LevelKey)
}

interface Cross {
  readonly columns: readonly string[]
  /** Each row's count in each column. */
  readonly cells: ReadonlyMap<string, ReadonlyMap<string, number>>
}

function transpose(byColumn: ReadonlyMap<string, Counts>): ReadonlyMap<string, ReadonlyMap<string, number>> {
  const cells = new Map<string, Map<string, number>>()
  for (const [column, counts] of byColumn) {
    for (const [row, count] of counts) {
      const line = cells.get(row) ?? new Map<string, number>()
      line.set(column, count)
      cells.set(row, line)
    }
  }
  return cells
}

function crossPlan(question: Question, rows: Grouping, columns: Columns): AnalysisPlan<Cross> {
  const keys = columnKeys(question, columns)
  if (rows === 'etape') {
    const stages: readonly StageKey[] = question.stages.length > 0 ? question.stages : STAGE_KEYS
    const groupBy: CaseloadGroupBy = columns === 'ani' ? 'year' : 'courtLevel'
    const year = columns === 'ani' ? ('all' as const) : question.year
    const byColumn = (read: Caseload): Counts => (columns === 'ani' ? new Map(read.groups.map((group) => [group.key, group.count] as const)) : countsBy('niveluri', read.groups))
    return {
      reads: [...stages.map((stage): CaseloadRead => ({ groupBy, filter: filterOf(question, { year, stages: [stage] }) })), { groupBy, filter: filterOf(question, { year }) }],
      combine: (results) => {
        const totals = byColumn(results[stages.length]!)
        const cells = new Map<string, ReadonlyMap<string, number>>(stages.map((stage, index) => [stage, byColumn(results[index]!)] as const))
        if (question.stages.length === 0) {
          const rest = new Map(keys.map((column) => [column, (totals.get(column) ?? 0) - stages.reduce((sum, stage) => sum + (cells.get(stage)?.get(column) ?? 0), 0)] as const))
          if ([...rest.values()].some((count) => count > 0)) cells.set(OTHER_STAGES, rest)
        }
        return { columns: keys, cells }
      },
    }
  }
  const groupBy = groupByOf(rows)
  const counted = keys.filter((column) => column !== OTHER_STAGES)
  const narrowed = (column: string): CaseloadFilter | null =>
    columns === 'ani' ? filterOf(question, { year: Number(column) }) : columns === 'etape' ? filterOf(question, { stages: [column as StageKey] }) : filterOf(question, { levels: [column as LevelKey] })
  return {
    reads: [...counted.map((column): CaseloadRead => ({ groupBy, filter: narrowed(column) })), ...(keys.includes(OTHER_STAGES) ? [{ groupBy, filter: filterOf(question) } satisfies CaseloadRead] : [])],
    combine: (results) => {
      const byColumn = new Map<string, Counts>(counted.map((column, index) => [column, countsBy(rows, results[index]!.groups)] as const))
      if (keys.includes(OTHER_STAGES)) {
        const totals = countsBy(rows, results[counted.length]!.groups)
        byColumn.set(OTHER_STAGES, new Map([...totals].map(([row, total]) => [row, total - counted.reduce((sum, column) => sum + (byColumn.get(column)?.get(row) ?? 0), 0)] as const)))
      }
      return { columns: keys, cells: transpose(byColumn) }
    },
  }
}

/** The grouping's tabs and the columns to cross them with. */
export function CrossBar({ question, columns, onChange, onColumns }: { readonly question: Question; readonly columns: Columns; readonly onChange: (question: Question) => void; readonly onColumns: (columns: Columns) => void }) {
  const offered = COLUMNS.filter((key) => crossable(question.dupa, key))
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div role="tablist" aria-label={t`După ce`} className="flex flex-wrap gap-x-4 gap-y-1 border-b">
        {GROUPINGS.map((grouping) => (
          <button
            key={grouping}
            type="button"
            role="tab"
            aria-selected={grouping === question.dupa}
            onClick={() => onChange({ ...question, dupa: grouping })}
            className={cn('-mb-px min-h-11 border-b-2 px-0.5 pb-2 text-sm sm:min-h-0', grouping === question.dupa ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            {groupingLabel(grouping)}
          </button>
        ))}
      </div>
      <IndicatorToggle<Columns>
        label={t`Coloane`}
        value={crossable(question.dupa, columns) ? columns : (offered[0] ?? 'ani')}
        onChange={onColumns}
        options={offered.map((key) => ({ key, label: key === 'ani' ? t`Ani` : key === 'etape' ? t`Etape` : t`Niveluri` }))}
        className={CONTROL_HEIGHT}
      />
    </div>
  )
}

/** A cell's tint by its share of its row's total: five steps, written out so the styles exist; none under 5%. */
const TINTS = ['', 'bg-primary/5', 'bg-primary/10', 'bg-primary/15', 'bg-primary/25'] as const

function tintOf(share: number): string {
  if (share < 0.05) return TINTS[0]
  return TINTS[Math.min(TINTS.length - 1, 1 + Math.floor(share * (TINTS.length - 1)))]!
}

export function CrossTable({ question, columns: asked, onChange }: { readonly question: Question; readonly columns: Columns; readonly onChange: (question: Question) => void }) {
  const columns: Columns = crossable(question.dupa, asked) ? asked : (COLUMNS.find((key) => crossable(question.dupa, key)) ?? 'ani')
  const cross = useAnalysisPlan(crossPlan(question, question.dupa, columns))
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  const questionKey = JSON.stringify([question, columns])
  const expanded = expandedFor === questionKey
  if (cross.isError && !cross.data)
    return (
      <div className="mt-4">
        <HubLoadError onRetry={cross.retry} />
      </div>
    )
  const data = cross.data
  if (!data) return <div className="mt-3 h-96 animate-pulse bg-muted/40" aria-hidden="true" />
  const keys = data.columns
  const years = columns === 'ani'
  const year = String(question.year)
  const before = String(question.year - 1)
  const showChange = years && keys.includes(before) && comparable(question)
  const sumOf = (line: ReadonlyMap<string, number>) => keys.reduce((sum, column) => sum + (line.get(column) ?? 0), 0)
  const rankOf = (line: ReadonlyMap<string, number>) => (years ? (line.get(year) ?? 0) : sumOf(line))
  const lines = [...data.cells.entries()].filter(([, line]) => sumOf(line) > 0)
  const ranked = lines.filter(([row]) => !UNRANKED.has(row)).sort((a, b) => rankOf(b[1]) - rankOf(a[1]) || a[0].localeCompare(b[0]))
  const top = expanded ? TOP_EXPANDED : TOP
  const folded = ranked.slice(top)
  const rest: [string, ReadonlyMap<string, number>][] = folded.length > 0 ? [['restul', new Map(keys.map((column) => [column, folded.reduce((sum, [, line]) => sum + (line.get(column) ?? 0), 0)] as const))]] : []
  const shown = [...ranked.slice(0, top), ...rest, ...lines.filter(([row]) => UNRANKED.has(row))]
  const totals = new Map(keys.map((column) => [column, lines.reduce((sum, [, line]) => sum + (line.get(column) ?? 0), 0)] as const))
  // Across stages or levels a cell is a part of its row: tinted by its share. Across years it is not, and the question's year is in bold.
  const tint = (line: ReadonlyMap<string, number>, column: string) => (years || sumOf(line) === 0 ? '' : tintOf((line.get(column) ?? 0) / sumOf(line)))
  const totalChange = changeOf(totals.get(year) ?? 0, totals.get(before) ?? null)
  return (
    <div className={cn('mt-3', cross.isFetching && 'opacity-70 transition-opacity')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-right">#</TableHead>
            <TableHead />
            {keys.map((column) => (
              <TableHead key={column} className={cn('whitespace-nowrap text-right', years && column === year && 'font-semibold text-foreground')} title={columnLabel(columns, column)}>
                {columnLabel(columns, column, 'short')}
                {years && column === String(JUSTICE_LAST_CAPTURE_YEAR) ? <span className="block text-[0.6875rem] font-normal text-muted-foreground">{t`până în ${lastMonthText(sourceOf(question))}`}</span> : null}
              </TableHead>
            ))}
            {showChange ? <TableHead className="hidden whitespace-nowrap text-right sm:table-cell">{`${before}→${year}`}</TableHead> : null}
            {!years ? <TableHead className="text-right">{t`Total`}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map(([row, line], index) => {
            const kind = row === 'restul' ? 'rest' : UNRANKED.has(row) ? 'apart' : 'group'
            const next = kind === 'group' ? drilled(question, question.dupa, row) : null
            const change = showChange ? changeOf(line.get(year) ?? 0, line.get(before) ?? null) : null
            const { label, sub } = rowLabel(question.dupa, row)
            return (
              <TableRow key={row} className={cn(kind !== 'group' && 'text-muted-foreground', next && 'cursor-pointer')} onClick={next ? () => onChange(next) : undefined}>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{kind === 'group' ? index + 1 : ''}</TableCell>
                <TableCell className="max-w-[10rem] sm:max-w-xs">
                  <span className="block truncate" title={label}>
                    {label}
                  </span>
                  {sub ? <span className="block truncate text-xs text-muted-foreground">{sub}</span> : null}
                </TableCell>
                {keys.map((column) => (
                  <TableCell key={column} className={cn('text-right tabular-nums', kind === 'group' && tint(line, column), years && column === year && 'font-semibold')}>
                    {line.get(column) ? countText(line.get(column)!) : '—'}
                  </TableCell>
                ))}
                {showChange ? <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">{change !== null ? signedPercentText(change) : '—'}</TableCell> : null}
                {!years ? <TableCell className="text-right font-semibold tabular-nums">{countText(sumOf(line))}</TableCell> : null}
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="font-semibold">
            <TableCell />
            <TableCell>{t`Total`}</TableCell>
            {keys.map((column) => (
              <TableCell key={column} className="text-right tabular-nums">
                {countText(totals.get(column) ?? 0)}
              </TableCell>
            ))}
            {showChange ? <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">{totalChange !== null ? signedPercentText(totalChange) : '—'}</TableCell> : null}
            {!years ? <TableCell className="text-right tabular-nums">{countText(sumOf(totals))}</TableCell> : null}
          </TableRow>
        </TableFooter>
      </Table>
      {!expanded && ranked.length > TOP ? (
        <div className="mt-2 text-right">
          <button type="button" onClick={() => setExpandedFor(questionKey)} className="min-h-11 text-xs font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0">
            {t`Primele ${TOP_EXPANDED}`}
          </button>
        </div>
      ) : null}
    </div>
  )
}
