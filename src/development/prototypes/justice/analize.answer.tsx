import { useId, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowUpRight } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { JusticeSourceLine, type JusticeSource } from '@/features/justice/components/justice-source-line'
import { JUSTICE_FIRST_WHOLE_YEAR, JUSTICE_LAST_CAPTURE_YEAR } from '@/features/justice/lib/hub-years'
import { countText, percentText, rateText } from '@/features/justice/lib/judicial-format'
import { COMPANY_HUB_SNAPSHOT } from '@/features/private-companies/lib/hub-snapshot'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { HubLoadError, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { crossable, crossColumns, useCross, useGrouped, useYears } from './analize.data'
import { BAND_FROM, changeOf, COLUMNS, COURTS, drilled, GROUPINGS, NO_COUNTY, rankedRows, type Columns, type Grouping, type Measure, type Question, type Row } from './analize.model'
import { ASOF, lastMonthText } from './analize.notes'
import { columnLabel, columnsLabel, groupingLabel, rowLabel } from './analize.text'

/**
 * The answer: the grouping's tabs over a table — the ranked groups with
 * their change on the year before (`clasament`), or the groups across years,
 * stages or levels (`incrucisat`) — then the years and the source.
 */

type Change = (question: Question) => void

/** The bar's controls: 44 px on a phone, 40 from a small screen up (no small buttons). */
const CONTROL_HEIGHT = '[&>button]:min-h-11 sm:[&>button]:min-h-10 sm:[&>button]:px-4'
const TOP = 25
const TOP_EXPANDED = 100
/** Groups that are drawn but not ranked: the ÎCCJ among counties (it has none), the stages none of the groups counts. */
const APART: ReadonlySet<string> = new Set([NO_COUNTY, 'alte'])

/** Residents on 1 January of the population year, by county (INS, POP105A, as the companies hub reads it). */
const POPULATION = {
  year: COMPANY_HUB_SNAPSHOT.fiscalYear,
  byCounty: new Map(COMPANY_HUB_SNAPSHOT.counties.map((county) => [county.code, county.population] as const)),
}

/** Whether a question's rate can be drawn: counties, in the year the residents were counted. */
function rateAllowed(question: Question): boolean {
  return question.dupa === 'judete' && question.year === POPULATION.year
}

function signedPercent(change: number): string {
  const text = percentText(Math.abs(change))
  return change > 0 ? `+${text}` : change < 0 ? `−${text}` : text
}

// ────────────────────────────────────────────────────────── the tabs ──

/** „După": the grouping the answer ranks by, the measure where a rate is possible, the columns of the cross. */
export function GroupBar({ question, onChange, cross = false }: { readonly question: Question; readonly onChange: Change; readonly cross?: boolean }) {
  const measures: Measure[] = !cross && question.dupa === 'judete' ? ['dosare', 'locuitori'] : []
  const columns = COLUMNS.filter((key) => crossable(question.dupa, key))
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div role="tablist" aria-label={t`După ce`} className="flex flex-wrap gap-x-4 gap-y-1 border-b">
        {GROUPINGS.map((grouping) => {
          const active = grouping === question.dupa
          return (
            <button
              key={grouping}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange({ ...question, dupa: grouping })}
              className={cn('-mb-px min-h-11 border-b-2 px-0.5 pb-2 text-sm sm:min-h-0', active ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
            >
              {groupingLabel(grouping)}
            </button>
          )
        })}
      </div>
      {cross ? (
        <IndicatorToggle<Columns>
          label={t`Coloane`}
          value={crossable(question.dupa, question.coloane) ? question.coloane : (columns[0] ?? 'ani')}
          onChange={(coloane) => onChange({ ...question, coloane })}
          options={columns.map((key) => ({ key, label: columnsLabel(key) }))}
          className={CONTROL_HEIGHT}
        />
      ) : measures.length > 0 ? (
        <IndicatorToggle<Measure>
          label={t`Măsura`}
          value={rateAllowed(question) ? question.masura : 'dosare'}
          onChange={(masura) => onChange({ ...question, masura })}
          options={measures.map((key) => ({
            key,
            label: key === 'dosare' ? t`Dosare` : t`La 1.000 de locuitori`,
          }))}
          className={cn(CONTROL_HEIGHT, !rateAllowed(question) && '[&>button:last-child]:pointer-events-none [&>button:last-child]:opacity-40')}
        />
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────── a row's name ──

function RowName({ question, grouping, row }: { readonly question: Question; readonly grouping: Grouping; readonly row: Pick<Row, 'key' | 'kind'> }) {
  const { label, sub } = rowLabel(grouping, row.key)
  const court = grouping === 'instante' && row.kind === 'group' && COURTS.has(row.key)
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="min-w-0">
        <span className="block truncate" title={label}>
          {label}
        </span>
        {sub ? <span className="block truncate text-xs text-muted-foreground">{sub}</span> : null}
      </span>
      {court ? (
        <Link
          to="/justice/courts/$code"
          params={{ code: row.key }}
          search={{ an: question.year }}
          onClick={(event) => event.stopPropagation()}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={t`Pagina instanței ${label}`}
        >
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </span>
  )
}

function Pending({ rows }: { readonly rows: number }) {
  return (
    <div className="mt-3 space-y-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-9 animate-pulse bg-muted/40" />
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────── the ranking ──

/**
 * The ranked answer (`clasament`): the year's groups, largest first — or by
 * cases per 1,000 residents —, their count, the year before's and the
 * change, their share; the groups past the list folded into „Restul", the
 * total under them. A group's row narrows the question to it; a court's
 * arrow opens its page.
 */
export function RankTable({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  const key = JSON.stringify(question)
  const expanded = expandedFor === key
  const grouped = useGrouped(question, question.dupa)
  if (grouped.isError)
    return (
      <div className="mt-4">
        <HubLoadError onRetry={grouped.retry} />
      </div>
    )
  const data = grouped.data
  if (!data) return <Pending rows={12} />
  const perResident = question.masura === 'locuitori' && rateAllowed(question)
  const { rows, total, groups } = rankedRows({
    now: data.now,
    before: data.before,
    total: data.total,
    top: expanded ? TOP_EXPANDED : TOP,
    residents: perResident ? POPULATION.byCounty : null,
    apart: APART,
  })
  const widest = Math.max(0.0001, ...rows.filter((row) => row.kind === 'group').map((row) => row.share))
  const compared = data.before !== null
  return (
    <div className={cn('mt-3', grouped.isFetching && 'opacity-70 transition-opacity')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-right">#</TableHead>
            <TableHead />
            {perResident ? <TableHead className="text-right">{t`La 1.000 loc.`}</TableHead> : null}
            <TableHead className={cn('text-right', perResident && 'hidden sm:table-cell')}>{t`Dosare ${question.year}`}</TableHead>
            {compared ? <TableHead className="hidden text-right md:table-cell">{question.year - 1}</TableHead> : null}
            {compared ? <TableHead className="hidden text-right sm:table-cell">{t`Schimbare`}</TableHead> : null}
            <TableHead className="hidden w-36 text-right sm:table-cell">{t`Cota`}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const next = row.kind === 'group' ? drilled(question, question.dupa, row.key) : null
            const change = changeOf(row.count, row.before)
            return (
              <TableRow key={row.key} className={cn(row.kind !== 'group' && 'text-muted-foreground', next && 'cursor-pointer')} onClick={next ? () => onChange(next) : undefined}>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{row.kind === 'group' ? index + 1 : ''}</TableCell>
                <TableCell className="max-w-[12rem] sm:max-w-md">
                  <RowName question={question} grouping={question.dupa} row={row} />
                </TableCell>
                {perResident ? (
                  <TableCell className="text-right font-semibold tabular-nums" title={POPULATION.byCounty.get(row.key) ? t`${countText(POPULATION.byCounty.get(row.key)!)} de locuitori` : undefined}>
                    {row.rate !== null ? rateText(row.rate) : '—'}
                  </TableCell>
                ) : null}
                <TableCell className={cn('text-right tabular-nums', perResident && 'hidden sm:table-cell')}>{countText(row.count)}</TableCell>
                {compared ? <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">{row.before !== null ? countText(row.before) : '—'}</TableCell> : null}
                {compared ? <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">{change !== null ? signedPercent(change) : '—'}</TableCell> : null}
                <TableCell className="hidden sm:table-cell">
                  <span className="flex items-center justify-end gap-2">
                    <span className="block h-1.5 w-20 bg-muted/70">
                      <span
                        className={cn('block h-1.5', row.kind === 'group' ? 'bg-primary/75' : 'bg-muted-foreground/35')}
                        style={{
                          width: `${Math.max(Math.min((row.share / widest) * 100, 100), 1).toFixed(1)}%`,
                        }}
                      />
                    </span>
                    <span className="w-12 text-right text-xs tabular-nums">{percentText(row.share)}</span>
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="font-semibold">
            <TableCell />
            <TableCell>{t`Total`}</TableCell>
            {perResident ? <TableCell /> : null}
            <TableCell className={cn('text-right tabular-nums', perResident && 'hidden sm:table-cell')}>{countText(total)}</TableCell>
            {compared ? <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">{data.totalBefore !== null ? countText(data.totalBefore) : '—'}</TableCell> : null}
            {compared ? <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">{changeOf(total, data.totalBefore) !== null ? signedPercent(changeOf(total, data.totalBefore)!) : '—'}</TableCell> : null}
            <TableCell className="hidden sm:table-cell" />
          </TableRow>
        </TableFooter>
      </Table>
      {!expanded && groups > TOP ? (
        <div className="mt-2 text-right">
          <button type="button" onClick={() => setExpandedFor(key)} className="min-h-11 text-xs font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0">
            {t`Primele ${TOP_EXPANDED}`}
          </button>
        </div>
      ) : null}
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the cross ──

/** A cell's tint by its share of its row's total: five steps, written out so the styles exist. */
const TINTS = ['', 'bg-primary/5', 'bg-primary/10', 'bg-primary/15', 'bg-primary/25'] as const

/** Untinted under 5% of the row, then a step per quarter: a sliver of a row reads as nothing. */
function tintOf(share: number): string {
  if (share < 0.05) return TINTS[0]
  return TINTS[Math.min(TINTS.length - 1, 1 + Math.floor(share * (TINTS.length - 1)))]!
}

/**
 * The groups across years, stages or levels (`incrucisat`): one row per
 * group, a column per year (with the change from the year before the
 * question's), per stage or per level, each cell tinted by its share of the
 * row. Ranked by the question's year, or by the row's total; the rest
 * folded into one row and the columns' totals under it.
 */
export function CrossTable({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
  const columns: Columns = crossable(question.dupa, question.coloane) ? question.coloane : (COLUMNS.find((key) => crossable(question.dupa, key)) ?? 'ani')
  const cross = useCross(question, question.dupa, columns)
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  const key = JSON.stringify([question, columns])
  const expanded = expandedFor === key
  if (cross.isError)
    return (
      <div className="mt-4">
        <HubLoadError onRetry={cross.retry} />
      </div>
    )
  const data = cross.data
  if (!data) return <Pending rows={12} />
  const keys = data.columns.length > 0 ? data.columns : crossColumns(question, columns)
  const years = columns === 'ani'
  const year = String(question.year)
  const before = String(question.year - 1)
  const showChange = years && keys.includes(before) && question.year - 1 >= JUSTICE_FIRST_WHOLE_YEAR && question.year < JUSTICE_LAST_CAPTURE_YEAR
  const sumOf = (line: ReadonlyMap<string, number>) => keys.reduce((sum, column) => sum + (line.get(column) ?? 0), 0)
  const rankOf = (line: ReadonlyMap<string, number>) => (years ? (line.get(year) ?? 0) : sumOf(line))
  const lines = [...data.cells.entries()].filter(([, line]) => sumOf(line) > 0)
  const apart = lines.filter(([row]) => APART.has(row))
  const ranked = lines.filter(([row]) => !APART.has(row)).sort((a, b) => rankOf(b[1]) - rankOf(a[1]) || a[0].localeCompare(b[0]))
  const top = expanded ? TOP_EXPANDED : TOP
  const folded = ranked.slice(top)
  const rest: [string, ReadonlyMap<string, number>][] = folded.length > 0 ? [['restul', new Map(keys.map((column) => [column, folded.reduce((sum, [, line]) => sum + (line.get(column) ?? 0), 0)] as const))]] : []
  const shown = [...ranked.slice(0, top), ...rest, ...apart]
  const totals = new Map(keys.map((column) => [column, lines.reduce((sum, [, line]) => sum + (line.get(column) ?? 0), 0)] as const))
  // Across stages or levels a cell is a part of its row: tinted by its share. Across years it is not, and the question's year is in bold.
  const tint = (line: ReadonlyMap<string, number>, column: string) => (years || sumOf(line) === 0 ? '' : tintOf((line.get(column) ?? 0) / sumOf(line)))
  const partYear = String(JUSTICE_LAST_CAPTURE_YEAR)
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
                {years && column === partYear ? <span className="block text-[0.6875rem] font-normal text-muted-foreground">{t`până în ${lastMonthText()}`}</span> : null}
              </TableHead>
            ))}
            {showChange ? <TableHead className="hidden whitespace-nowrap text-right sm:table-cell">{`${before}→${year}`}</TableHead> : null}
            {!years ? <TableHead className="text-right">{t`Total`}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map(([row, line], index) => {
            const kind = row === 'restul' ? 'rest' : APART.has(row) ? 'apart' : 'group'
            const next = kind === 'group' ? drilled(question, question.dupa, row) : null
            const change = showChange ? changeOf(line.get(year) ?? 0, line.get(before) ?? null) : null
            return (
              <TableRow key={row} className={cn(kind !== 'group' && 'text-muted-foreground', next && 'cursor-pointer')} onClick={next ? () => onChange(next) : undefined}>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{kind === 'group' ? index + 1 : ''}</TableCell>
                <TableCell className="max-w-[10rem] sm:max-w-xs">
                  <RowName question={question} grouping={question.dupa} row={{ key: row, kind }} />
                </TableCell>
                {keys.map((column) => (
                  <TableCell key={column} className={cn('text-right tabular-nums', kind === 'group' && tint(line, column), years && column === year && 'font-semibold')}>
                    {line.get(column) ? countText(line.get(column)!) : '—'}
                  </TableCell>
                ))}
                {showChange ? <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">{change !== null ? signedPercent(change) : '—'}</TableCell> : null}
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
            {showChange ? (
              <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">
                {changeOf(totals.get(year) ?? 0, totals.get(before) ?? null) !== null ? signedPercent(changeOf(totals.get(year) ?? 0, totals.get(before) ?? null)!) : '—'}
              </TableCell>
            ) : null}
            {!years ? <TableCell className="text-right tabular-nums">{countText(sumOf(totals))}</TableCell> : null}
          </TableRow>
        </TableFooter>
      </Table>
      {!expanded && ranked.length > TOP ? (
        <div className="mt-2 text-right">
          <button type="button" onClick={() => setExpandedFor(key)} className="min-h-11 text-xs font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0">
            {t`Primele ${TOP_EXPANDED}`}
          </button>
        </div>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────── the years ──

/** The unit a chart's labels share, from its largest figure: „mii de dosare" once, „1.677" on the bar. */
function scaleOf(max: number): {
  readonly divisor: number
  readonly digits: number
  readonly caption: string
} {
  if (max >= 1e6) return { divisor: 1e6, digits: 2, caption: t`milioane de dosare` }
  if (max >= 1e4)
    return {
      divisor: 1e3,
      digits: max >= 1e5 ? 0 : 1,
      caption: t`mii de dosare`,
    }
  return { divisor: 1, digits: 0, caption: t`dosare` }
}

/**
 * The question in every year since the crawl began (May 2013), in a band of
 * its own: the years the capture holds whole solid, the question's year
 * marked; the years before them dashed (only cases still active later) and
 * the last a part-year. Pointing at a year gives its count and change; a
 * click on a whole year makes it the question's.
 */
export function YearsBand({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
  const titleId = useId()
  const years = useYears(question)
  const [active, setActive] = useState<number | null>(null)
  const pressedWith = useRef<string | null>(null)
  const points = Array.from({ length: JUSTICE_LAST_CAPTURE_YEAR - BAND_FROM + 1 }, (_, index) => BAND_FROM + index).map((year) => ({ year, count: years.data?.get(String(year)) ?? 0 }))
  const max = Math.max(0, ...points.map((point) => point.count))
  const scale = scaleOf(max)
  const columns = {
    gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
  }
  const whole = (year: number) => year >= JUSTICE_FIRST_WHOLE_YEAR
  const part = (year: number) => year === JUSTICE_LAST_CAPTURE_YEAR
  return (
    <section className="border-b" aria-labelledby={titleId}>
      <RuledFrame className="py-12 sm:py-16">
        <HubSectionHead titleId={titleId} index={`${BAND_FROM}–${JUSTICE_LAST_CAPTURE_YEAR}`} title={t`Pe ani`} />
        <div className="mt-8">
          {years.isError ? (
            <HubLoadError onRetry={years.retry} />
          ) : !years.data ? (
            <div className="h-56 animate-pulse bg-muted/40 sm:h-64" aria-hidden="true" />
          ) : (
            <figure aria-labelledby={titleId}>
              <MonoLabel className="block text-muted-foreground">{scale.caption}</MonoLabel>
              <ol className="mt-3 grid h-48 items-end border-b border-foreground/20 sm:h-60" style={columns} onPointerLeave={() => setActive(null)}>
                {points.map((point, index) => {
                  const chosen = point.year === question.year
                  const dashed = !whole(point.year) || part(point.year)
                  const previous = points[index - 1]
                  const change = previous && whole(previous.year) && whole(point.year) && !part(point.year) ? changeOf(point.count, previous.count) : null
                  const lines = [
                    t`${point.year}: ${countText(point.count)} dosare`,
                    change !== null ? t`${signedPercent(change)} față de ${previous!.year}` : null,
                    !whole(point.year) ? t`preluare parțială` : part(point.year) ? t`până în ${lastMonthText()}` : null,
                  ].filter((line): line is string => line !== null)
                  return (
                    <li key={point.year} className={cn('relative h-full min-w-0 transition-colors', active === point.year && 'bg-muted/60')}>
                      <button
                        type="button"
                        disabled={!whole(point.year)}
                        aria-pressed={chosen}
                        aria-label={lines.join(', ')}
                        onPointerEnter={(event) => {
                          if (event.pointerType !== 'touch') setActive(point.year)
                        }}
                        onPointerDown={(event) => {
                          pressedWith.current = event.pointerType
                        }}
                        onFocus={() => setActive(point.year)}
                        onBlur={() => setActive(null)}
                        onClick={() => {
                          const touch = pressedWith.current === 'touch'
                          pressedWith.current = null
                          if (touch && active !== point.year) return setActive(point.year)
                          onChange({ ...question, year: point.year })
                        }}
                        className="flex h-full w-full flex-col items-center justify-end px-0.5 outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-default sm:px-2"
                      >
                        <span className={cn('mb-1.5 block h-3.5 max-w-full truncate text-[0.625rem] leading-none tabular-nums sm:text-xs', chosen ? 'font-semibold text-foreground' : 'text-muted-foreground')} aria-hidden="true">
                          {point.count > 0
                            ? formatHubNumber(point.count / scale.divisor, {
                                digits: scale.digits,
                              })
                            : ''}
                        </span>
                        <span
                          className={cn(
                            'block w-full max-w-24 transition-colors',
                            dashed ? cn('border border-dashed border-primary', chosen ? 'bg-primary/55' : 'bg-primary/10') : chosen ? 'bg-primary' : active === point.year ? 'bg-primary/55' : 'bg-primary/25',
                          )}
                          style={{
                            height: `calc((100% - 1.25rem) * ${max > 0 ? point.count / max : 0})`,
                            minHeight: point.count > 0 ? 2 : 0,
                          }}
                        />
                      </button>
                      {active === point.year ? (
                        <div
                          aria-hidden="true"
                          className={cn(
                            'pointer-events-none absolute top-0 z-20 w-max max-w-44 space-y-1 border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md sm:max-w-60',
                            index < points.length / 2 ? 'left-full ml-1.5' : 'right-full mr-1.5',
                          )}
                        >
                          {lines.map((line, position) => (
                            <p key={line} className={cn('tabular-nums', position === 0 ? 'font-semibold' : 'text-muted-foreground')}>
                              {line}
                            </p>
                          ))}
                          {whole(point.year) ? <p className="border-t pt-1 text-muted-foreground">{chosen ? t`Anul ales` : t`Clic: doar ${point.year}`}</p> : null}
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
              <ol className="mt-2 grid" style={columns} aria-hidden="true">
                {points.map((point) => (
                  <li key={point.year} className="min-w-0 text-center">
                    <MonoLabel className={cn('tabular-nums', point.year === question.year ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      <span className="sm:hidden">{`'${String(point.year).slice(2)}`}</span>
                      <span className="hidden sm:inline">{point.year}</span>
                    </MonoLabel>
                  </li>
                ))}
              </ol>
              <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 border border-dashed border-primary bg-primary/10" aria-hidden="true" />
                  {t`înainte de ${JUSTICE_FIRST_WHOLE_YEAR}: preluare parțială; ${JUSTICE_LAST_CAPTURE_YEAR}: până în ${lastMonthText()}`}
                </span>
              </figcaption>
            </figure>
          )}
        </div>
      </RuledFrame>
    </section>
  )
}

// ────────────────────────────────────────────────────────── the source ──

/** Where the question's cases come from: the ÎCCJ's archive alone, the portal alone, or both. */
function sourceOf(question: Question): JusticeSource {
  const levels = question.courts.length > 0 ? [...new Set(question.courts.map((code) => COURTS.get(code)?.level))] : question.levels
  if (levels.length === 0) return 'both'
  if (levels.every((level) => level === 'inalta_curte')) return 'iccj'
  return levels.includes('inalta_curte') ? 'both' : 'portal'
}

export function AnalyzeSource({ question }: { readonly question: Question }) {
  return (
    <RuledFrame className="py-8">
      <JusticeSourceLine asOf={ASOF} source={sourceOf(question)} notes={[]} />
    </RuledFrame>
  )
}
