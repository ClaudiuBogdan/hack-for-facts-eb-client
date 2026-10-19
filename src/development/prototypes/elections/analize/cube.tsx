import { useId } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRight } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { CALENDAR_FIRST_YEAR, CALENDAR_LAST_YEAR } from '../shared/calendar'
import { eventTitle, familyPlural, roundLabel, scopeLabel } from '../shared/labels'
import { FAMILIES, isDisputedEvent, timeline, type ElectionEvent, type ScopeType } from '../shared/model'
import { PROTOTYPE_HREF, useFormat } from '../shared/parts'
import { cellsOf, referenceEdition, ROUND_UNREPORTED, withFilter, type Answer, type Catalog, type Cell, type Query } from './model'
import { officeText } from './text'

/**
 * The cube: elections as rows, one dimension of the rows as columns (the
 * offices, the levels or the rounds), each cell the rows the election's
 * reference edition reports there. An election's other editions are never
 * added in: a cell marks that they exist. Under it, what the data covers
 * against the calendar.
 */

export const COLUMNS = ['functii', 'niveluri', 'tururi'] as const
export type Columns = (typeof COLUMNS)[number]

function columnsLabel(columns: Columns): string {
  if (columns === 'functii') return t`Funcții`
  if (columns === 'niveluri') return t`Niveluri`
  return t`Tururi`
}

function columnKey(cell: Cell, columns: Columns): string {
  if (columns === 'functii') return cell.office
  if (columns === 'niveluri') return cell.scope
  return cell.round ?? ROUND_UNREPORTED
}

function columnHead(columns: Columns, key: string): { readonly label: string; readonly mono: boolean } {
  if (columns === 'functii') {
    const office = officeText(key)
    return { label: office.label, mono: !office.known }
  }
  if (columns === 'niveluri') return { label: scopeLabel(key as ScopeType), mono: false }
  return { label: roundLabel(key === ROUND_UNREPORTED ? null : key), mono: false }
}

export function CubeBand({
  query,
  cat,
  answer,
  columns,
  onChange,
  onColumns,
}: {
  readonly query: Query
  readonly cat: Catalog
  readonly answer: Answer
  readonly columns: Columns
  readonly onChange: (query: Query) => void
  readonly onColumns: (columns: Columns) => void
}) {
  const format = useFormat()
  const titleId = useId()
  const cells = cellsOf(cat, query)
  // The columns in the catalog's order: offices by rows, the levels as listed, the rounds as labelled.
  const order =
    columns === 'functii'
      ? cat.offices
      : columns === 'niveluri'
        ? (['siruta', 'source_constituency', 'county', 'diaspora', 'national', 'chamber'] as const)
        : cat.rounds.map((round) => round ?? ROUND_UNREPORTED)
  const present = new Set(cells.map((cell) => columnKey(cell, columns)))
  const keys = order.filter((key) => present.has(key))
  const events = answer.events
  const valueOf = (event: ElectionEvent, key: string): { readonly rows: number; readonly others: readonly string[] } => {
    const reference = referenceEdition(event, query)
    let rows = 0
    const others = new Set<string>()
    for (const cell of cells) {
      if (cell.event.key !== event.key || columnKey(cell, columns) !== key) continue
      if (cell.edition.key === reference?.key) rows += cell.rows
      else others.add(cell.edition.key)
    }
    return { rows, others: [...others] }
  }
  const drill = (event: ElectionEvent, key: string) => {
    const base = withFilter(query, 'alegere', event.key, cat)
    const next =
      columns === 'functii' ? withFilter(base, 'functie', key, cat) : columns === 'niveluri' ? withFilter(base, 'nivel', key as ScopeType, cat) : withFilter(base, 'tur', key, cat)
    onChange({ ...next, dupa: 'editii' })
  }
  return (
    <section className="border-b" aria-labelledby={titleId}>
      <RuledFrame className="py-12 sm:py-16">
        <HubSectionHead
          titleId={titleId}
          index={t`01 / Cubul`}
          title={t`Alegeri × ${columnsLabel(columns).toLocaleLowerCase('ro-RO')}`}
          lede={
            <Trans>Rândurile de scrutin ale ediției de referință a fiecărei alegeri. Un punct după cifră: alegerea mai are ediții care raportează aici; ele nu se adună.</Trans>
          }
          aside={<IndicatorToggle<Columns> label={t`Coloanele`} value={columns} onChange={onColumns} options={COLUMNS.map((key) => ({ key, label: columnsLabel(key) }))} />}
        />
        <div className="mt-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-[11rem] bg-background">{t`Alegerea`}</TableHead>
                {keys.map((key) => {
                  const head = columnHead(columns, key)
                  return (
                    <TableHead key={key} className={cn('min-w-[5.5rem] text-right', head.mono && 'font-mono text-[0.65rem] normal-case')} title={key}>
                      <span className="block max-w-[7rem] truncate">{head.label}</span>
                    </TableHead>
                  )
                })}
                <TableHead className="min-w-[5rem] text-right">{t`Ediții`}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const reference = referenceEdition(event, query)
                return (
                  <TableRow key={event.key}>
                    <TableCell className="sticky left-0 z-10 bg-background">
                      <span className="flex items-center gap-1.5">
                        <a
                          href={PROTOTYPE_HREF.election(event.key)}
                          className="min-w-0 truncate hover:underline"
                          title={reference ? t`Ediția de referință: ${reference.key}` : undefined}
                        >
                          {eventTitle(event)}
                        </a>
                        {isDisputedEvent(event) ? (
                          <span
                            className="shrink-0 text-xs text-amber-700 dark:text-amber-400"
                            title={t`Etichetată 2014; după auditul datelor, date din 2016 — nu o alegere în plus`}
                          >
                            ✱
                          </span>
                        ) : null}
                        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </span>
                      {reference ? <span className="block truncate font-mono text-[0.65rem] text-muted-foreground">{reference.key}</span> : null}
                    </TableCell>
                    {keys.map((key) => {
                      const value = valueOf(event, key)
                      const empty = value.rows === 0 && value.others.length === 0
                      return (
                        <TableCell key={key} className={cn('text-right tabular-nums', empty && 'text-muted-foreground/50')}>
                          {empty ? (
                            '·'
                          ) : (
                            <button
                              type="button"
                              onClick={() => drill(event, key)}
                              className="inline-flex items-baseline gap-0.5 hover:underline"
                              title={value.others.length ? t`Alte ediții aici: ${value.others.join(', ')}` : undefined}
                            >
                              <span className={cn(value.rows === 0 && 'text-muted-foreground')}>{value.rows > 0 ? format.n(value.rows) : '—'}</span>
                              {value.others.length > 0 ? (
                                <span className="text-primary" aria-label={t`${value.others.length} alte ediții`}>
                                  •
                                </span>
                              ) : null}
                            </button>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {format.n(new Set(cells.filter((cell) => cell.event.key === event.key).map((cell) => cell.edition.key)).size)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">
            {t`${format.n(events.length)} grupări de alegeri, cele mai noi primele · ${format.n(keys.length)} coloane · „—": doar alte ediții raportează aici`}
            {answer.folded.size > 0 ? ` · ${t`✱ „locale 2014": date din 2016, aceeași alegere ca 2016, nu una în plus`}` : ''}
          </p>
        </div>
      </RuledFrame>
    </section>
  )
}

// ───────────────────────────────────────────────────────── coverage ──

/**
 * What the data covers: the families by year against Transparenta.eu's
 * calendar. A cell with data says how many editions; a calendar election
 * with none is „nu e în date"; data outside the calendar (the 1998 partial,
 * the „2014" local editions) is marked as such.
 */
export function CoverageBand({ query, cat, onChange }: { readonly query: Query; readonly cat: Catalog; readonly onChange: (query: Query) => void }) {
  const titleId = useId()
  const format = useFormat()
  const cells = timeline(cat.data.events, CALENDAR_FIRST_YEAR, CALENDAR_LAST_YEAR)
  const years = [...new Set(cells.filter((cell) => cell.expected > 0 || cell.events.length > 0).map((cell) => cell.year))].sort((a, b) => a - b)
  const missing = cells.reduce((sum, cell) => sum + Math.max(cell.expected - cell.events.length, 0), 0)
  const outside = cells.filter((cell) => cell.expected === 0 && cell.events.length > 0).length
  return (
    <section className="border-b" aria-labelledby={titleId}>
      <RuledFrame className="py-12 sm:py-16">
        <HubSectionHead
          titleId={titleId}
          index={t`02 / Acoperirea`}
          title={t`Ce acoperă datele`}
          lede={
            <Trans>
              {format.n(missing)} alegeri din calendarul Transparenta.eu nu sunt în date; {format.n(outside)} grupări din date nu sunt în calendar. Un an fără ediții nu înseamnă că
              nu au fost alegeri.
            </Trans>
          }
        />
        <div className="mt-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-[8rem] bg-background" />
                {years.map((year) => (
                  <TableHead key={year} className="min-w-[2.75rem] px-1 text-center tabular-nums">
                    {`'${String(year).slice(2)}`}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {FAMILIES.map((family) => (
                <TableRow key={family}>
                  <TableCell className="sticky left-0 z-10 bg-background font-medium">{familyPlural(family)}</TableCell>
                  {years.map((year) => {
                    const cell = cells.find((item) => item.family === family && item.year === year)
                    if (!cell) return <TableCell key={year} />
                    const editions = cell.events.reduce((sum, event) => sum + event.editions.length, 0)
                    const inData = cell.events.length > 0
                    const lacking = cell.expected > cell.events.length
                    const outsideCalendar = cell.expected === 0 && inData
                    const chosen = query.tip === family && query.an === year
                    const title = inData
                      ? `${cell.events.map((event) => eventTitle(event)).join('; ')}: ${format.n(editions)} ${editions === 1 ? t`ediție` : t`ediții`}${outsideCalendar ? ` · ${t`în afara calendarului`}` : ''}${lacking ? ` · ${t`o alegere din calendar nu e în date`}` : ''}`
                      : cell.expected > 0
                        ? t`${familyPlural(family)} ${year}: nu e în date`
                        : ''
                    return (
                      <TableCell key={year} className="px-1 text-center">
                        {inData ? (
                          <button
                            type="button"
                            onClick={() => onChange({ ...withFilter(withFilter(query, 'tip', family, cat), 'an', year, cat), dupa: query.dupa })}
                            title={title}
                            aria-label={title}
                            className={cn(
                              'inline-flex size-8 items-center justify-center text-xs font-semibold tabular-nums',
                              chosen ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-foreground hover:bg-primary/30',
                              outsideCalendar && 'outline-dashed outline-1 outline-offset-1 outline-amber-600/70',
                            )}
                          >
                            {editions}
                          </button>
                        ) : cell.expected > 0 ? (
                          <span
                            className="inline-flex size-8 items-center justify-center border border-dashed border-amber-600/70 text-[0.6rem] text-amber-700 dark:text-amber-400"
                            title={title}
                            aria-label={title}
                          >
                            {cell.expected > 1 ? cell.expected : ''}
                          </span>
                        ) : (
                          <span className="inline-block size-8" aria-hidden="true" />
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-3 bg-primary/15" aria-hidden="true" />
              <MonoLabel>{t`ediții în date`}</MonoLabel>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-3 border border-dashed border-amber-600/70" aria-hidden="true" />
              <MonoLabel>{t`în calendar, nu e în date`}</MonoLabel>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-3 bg-primary/15 outline-dashed outline-1 outline-offset-1 outline-amber-600/70" aria-hidden="true" />
              <MonoLabel>{t`în date, în afara calendarului`}</MonoLabel>
            </span>
          </p>
        </div>
      </RuledFrame>
    </section>
  )
}
