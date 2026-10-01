import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatNgoDate, formatNgoNumber, formatNgoShare } from '@/features/ngos/hub/ngo-format'
import type { RegistryRecord, RegistrySnapshot } from '../api'
import type { NgoRegistrySummary } from '@/features/ngos/hub/registry-summary-types'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { activeNumberLocale } from '@/features/statistics/lib/format'
import { cn } from '@/lib/utils'
import {
  activeFilters,
  countText,
  countyLabel,
  drilled,
  filterLabel,
  groupAxes,
  groupLabel,
  PAGE_SIZE,
  READ_CAP_PAGES,
  statusKeyOf,
  statusLabel,
  statusWord,
  TABLE_PAGE,
  without,
  type GroupAxis,
  type RegistryQuery,
  type RegistryRead,
} from '../model'
import { placeKey } from '../place'
import { groupRows, isUnplaced, townLabel, unplacedOn, yearPoints, type RegistryFigure, type Tally } from '../counts'
import type { RegistryReadState } from '../use-registry-read'
import { ngoProfileLink } from '@/features/ngos/lib/ngo-address'

/**
 * The registry page's answer: the figures band, the tabs (the records, or
 * the selection split on an axis its filters leave open), the records
 * table, a breakdown, the years, and the source line with the method
 * behind it. Promoted from prototype ngos/registry, variant intrebare
 * (design.md §15).
 */

const CHIP = 'inline-flex min-h-9 items-center gap-1.5 border px-2.5 text-sm transition-colors hover:bg-muted/60'

function shortDate(iso: string | null): string {
  if (iso === null) return '—'
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(activeNumberLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

// ──────────────────────────────────────────────────────────── the figures ──

const FIGURE_COLUMNS: Readonly<Record<number, string>> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
}

/** The figures in the profiles' band: the value large, the term and its basis under it, ruled cells across the frame. */
export function RegistryFigures({ figures }: { readonly figures: readonly RegistryFigure[] }) {
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <dl className={cn('grid', FIGURE_COLUMNS[figures.length] ?? 'grid-cols-2 lg:grid-cols-4')}>
          {figures.map((figure, index) => (
            <div
              key={figure.key}
              className={cn(
                'flex flex-col px-5 py-6 sm:py-7',
                index % 2 === 1 && 'border-l',
                index >= 2 && 'border-t lg:border-t-0',
                index >= 1 && 'lg:border-l',
              )}
            >
              <dt className="order-2 mt-2.5 flex flex-1 flex-col">
                <MonoLabel className="block leading-relaxed text-foreground">{figure.label}</MonoLabel>
                {figure.note ? <MonoLabel className="mt-auto block pt-3 leading-relaxed text-muted-foreground">{figure.note}</MonoLabel> : null}
              </dt>
              <dd className="order-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
                {figure.value ?? (
                  <>
                    <span className="inline-block h-[1em] w-24 animate-pulse bg-muted align-middle" aria-hidden="true" />
                    <span className="sr-only">{t`se citește`}</span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </RuledFrame>
    </section>
  )
}

// ───────────────────────────────────────────────────────────── the answer ──

export type AnswerAxis = 'inregistrari' | GroupAxis

/** The answer's panel, which every tab controls. */
const ANSWER_PANEL = 'registry-answer'

function answerTabId(axis: AnswerAxis): string {
  return `registry-answer-${axis}`
}

/** What the tab shown answers with, as the tabs' panel. */
export function AnswerPanel({ axis, children }: { readonly axis: AnswerAxis; readonly children: ReactNode }) {
  return (
    <div role="tabpanel" id={ANSWER_PANEL} aria-labelledby={answerTabId(axis)}>
      {children}
    </div>
  )
}

/**
 * The tabs over the answer: the records, then each axis the selection's
 * filters leave open. The axes wait for the selection to be counted; a
 * name or a number past the cap cannot be, and says why under the tabs.
 * One tab stop; the arrows, Home and End move between the tabs.
 */
export function AnswerTabs({
  query,
  read,
  tally,
  error,
  axis,
  onAxis,
}: {
  readonly query: RegistryQuery
  readonly read: RegistryRead
  readonly tally: Tally | null
  /** The read failed: a selection it was counting cannot be split. */
  readonly error: boolean
  readonly axis: AnswerAxis
  readonly onAxis: (axis: AnswerAxis) => void
}) {
  const atLeast = formatNgoNumber(read.rows.length)
  const tabs: readonly AnswerAxis[] = ['inregistrari', ...groupAxes(query)]
  // An axis waits for its count (its panel says so); only a selection that cannot be counted turns the axes off.
  const off = tally === null && (read.capped || error)
  const usable = off ? (['inregistrari'] as const) : tabs
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = usable.indexOf(axis)
    const next =
      event.key === 'ArrowRight'
        ? usable[(at + 1) % usable.length]
        : event.key === 'ArrowLeft'
          ? usable[(at - 1 + usable.length) % usable.length]
          : event.key === 'Home'
            ? usable[0]
            : event.key === 'End'
              ? usable[usable.length - 1]
              : undefined
    if (next === undefined) return
    event.preventDefault()
    onAxis(next)
    document.getElementById(answerTabId(next))?.focus()
  }
  return (
    <>
      <div role="tablist" aria-label={t`Cum răspunde`} onKeyDown={move} className="hide-scrollbar flex gap-x-4 overflow-x-auto border-b">
        {tabs.map((tab) => {
          const disabled = tab !== 'inregistrari' && off
          const active = tab === axis
          return (
            <button
              key={tab}
              id={answerTabId(tab)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={ANSWER_PANEL}
              tabIndex={active ? 0 : -1}
              disabled={disabled}
              onClick={() => onAxis(tab)}
              className={cn(
                'min-h-10 shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-2 text-sm disabled:opacity-40 sm:min-h-0',
                active ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === 'inregistrari' ? t`Înregistrări` : groupLabel(tab)}
            </button>
          )
        })}
      </div>
      {read.capped ? (
        <p className="mt-2 text-xs text-muted-foreground">{t`Cel puțin ${atLeast} de înregistrări: restrânge selecția pentru a o împărți.`}</p>
      ) : null}
    </>
  )
}

/** Rows of grey while a list is read. */
export function Pending({ rows, className }: { readonly rows: number; readonly className?: string }) {
  return (
    <div className={cn('space-y-3 py-2', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-5 animate-pulse bg-muted/40" style={{ width: `${95 - index * 6}%` }} />
      ))}
    </div>
  )
}

/** Nothing for the selection: said once, with the way out. */
function EmptyAnswer({
  query,
  counties,
  onChange,
  className,
}: {
  readonly query: RegistryQuery
  readonly counties: NgoRegistrySummary['counties']
  readonly onChange: (query: RegistryQuery) => void
  readonly className?: string
}) {
  const filters = activeFilters(query)
  return (
    <div className={cn('py-6 text-sm text-muted-foreground', className)}>
      <p>{t`Nicio înregistrare pentru această selecție.`}</p>
      {filters.length > 0 || query.status !== null ? (
        <p className="mt-3 flex flex-wrap items-center gap-2">
          <span>{t`Scoate:`}</span>
          {query.status !== null ? (
            <button type="button" onClick={() => onChange({ ...query, status: null })} className={CHIP}>
              {statusLabel(query.status)}
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
          {filters.map((key) => (
            <button key={key} type="button" onClick={() => onChange(without(query, key))} className={CHIP}>
              {filterLabel(query, key, counties)}
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ))}
        </p>
      ) : null}
    </div>
  )
}

/** A row's second line: the legal form, the place, and the status where the selection mixes them. */
function rowMeta(row: RegistryRecord, query: RegistryQuery, counties: NgoRegistrySummary['counties']): string {
  const code = counties.find((item) => item.source === row.county)?.code ?? null
  // As the breakdown names it: a town whose suffix names another county keeps that county („Berceni (PH)").
  const town = row.locality ? townLabel(row.locality, code) : null
  const county = row.county && row.county !== 'NEDETERMINAT' ? countyLabel(row.county, counties) : null
  // „Arad, Arad" says the county twice: the county's name alone (with its diacritics) where the town bears it.
  const place = town && county && placeKey(town) === placeKey(county) ? county : [town, county].filter(Boolean).join(', ')
  const status = query.status === null && statusKeyOf(row.sourceRegistryStatus) !== 'registered' ? statusWord(row.sourceRegistryStatus) : null
  return [row.legalForm, place || null, status].filter(Boolean).join(' · ')
}

/**
 * The records themselves, the answer's first tab: the selection 25 at a
 * time, in the export's order (the registration date, newest first — there
 * is no other), each opening its own page. The count is the tally's when
 * the selection is counted, „din cel puțin N" otherwise. A page waits for
 * its 25 distinct rows; a read that stops says so, with a retry.
 */
export function RecordsTable({
  query,
  counties,
  state,
  page,
  onPage,
  onChange,
  className,
}: {
  readonly query: RegistryQuery
  readonly counties: NgoRegistrySummary['counties']
  readonly state: RegistryReadState
  readonly page: number
  readonly onPage: (page: number) => void
  readonly onChange: (query: RegistryQuery) => void
  readonly className?: string
}) {
  const { read } = state
  if (state.error && read.pending)
    return (
      <div className={cn('py-6', className)}>
        <HubLoadError onRetry={state.retry} />
      </div>
    )
  if (read.pending) return <Pending rows={10} className={className} />
  if (read.rows.length === 0) return <EmptyAnswer query={query} counties={counties} onChange={onChange} className={className} />
  const first = (page - 1) * TABLE_PAGE
  const rows = read.rows.slice(first, first + TABLE_PAGE)
  const total = state.tally?.total ?? null
  const last = first + rows.length
  // What is read says whether another page follows — never the count alone, which a repeat could outrun.
  const more = last < read.rows.length || state.more
  const filling = rows.length < TABLE_PAGE && state.more && !state.error
  const atLeast = formatNgoNumber(read.rows.length)
  const firstText = formatNgoNumber(first + 1)
  const lastText = formatNgoNumber(last)
  const totalText = total !== null ? formatNgoNumber(total) : ''
  const showStatus = query.status === null
  return (
    <div className={className}>
      {filling ? (
        <Pending rows={6} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-8 text-right sm:table-cell">#</TableHead>
              <TableHead>{t`Organizația`}</TableHead>
              <TableHead className="whitespace-nowrap text-right">{t`Nr. registru`}</TableHead>
              <TableHead className="hidden whitespace-nowrap text-right sm:table-cell">{t`Data în registru`}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const closed = showStatus && statusKeyOf(row.sourceRegistryStatus) !== 'registered'
              return (
                <TableRow key={row.id}>
                  <TableCell className="hidden align-top font-mono text-xs tabular-nums text-muted-foreground sm:table-cell">{first + index + 1}</TableCell>
                  <TableCell className="w-full max-w-0">
                    <Link
                      // The organisation's one address: its admitted CUI's profile, else its registry number's.
                      {...(ngoProfileLink({ cui: row.organizationCui, registryNumber: row.registryNumber }) ?? { to: '/ngos/registry' })}
                      className={cn('line-clamp-2 break-words font-medium hover:underline', closed ? 'text-muted-foreground' : 'text-foreground')}
                      title={row.name}
                    >
                      {row.nameWithheld ? t`Nume în curs de verificare` : row.name}
                    </Link>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {rowMeta(row, query, counties)}
                      <span className="sm:hidden">{row.sourceRegistrationDate ? ` · ${shortDate(row.sourceRegistrationDate)}` : ''}</span>
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right align-top font-mono text-xs tabular-nums text-muted-foreground">
                    {row.registryNumber}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-right align-top tabular-nums text-muted-foreground sm:table-cell">
                    {shortDate(row.sourceRegistrationDate)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {total !== null && page === 1 && !more
            ? countText(total)
            : total !== null
              ? t`${firstText}–${lastText} din ${totalText}`
              : t`${firstText}–${lastText} din cel puțin ${atLeast}`}
        </span>
        {page > 1 || more ? (
          <span className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => onPage(page - 1)}
              className="inline-flex size-11 items-center justify-center border hover:bg-muted disabled:opacity-40 sm:size-8"
              aria-label={t`Pagina anterioară`}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={!more}
              onClick={() => onPage(page + 1)}
              className="inline-flex size-11 items-center justify-center border hover:bg-muted disabled:opacity-40 sm:size-8"
              aria-label={t`Pagina următoare`}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </span>
        ) : null}
      </div>
      {state.error ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <span>{t`Citirea s-a oprit după ${atLeast} de înregistrări.`}</span>
          <button
            type="button"
            onClick={state.retry}
            disabled={state.fetching}
            className="inline-flex min-h-10 items-center border px-3 font-medium text-foreground hover:bg-muted disabled:opacity-60 sm:min-h-9"
          >
            {state.fetching ? t`Se încarcă…` : t`Încearcă din nou`}
          </button>
        </div>
      ) : null}
    </div>
  )
}

/** Rows a breakdown shows before „Arată toate". */
const GROUP_SHOWN = 15

/**
 * The selection on one axis: rank, name, entries, share with a bar; the
 * unplaced last, unranked. A row the address can say narrows the selection
 * to it; the others (a locality, a year: no API filter) stay figures.
 */
export function GroupTable({
  query,
  counties,
  tally,
  axis,
  onChange,
  className,
}: {
  readonly query: RegistryQuery
  readonly counties: NgoRegistrySummary['counties']
  readonly tally: Tally
  readonly axis: GroupAxis
  readonly onChange: (query: RegistryQuery) => void
  readonly className?: string
}) {
  const [all, setAll] = useState(false)
  const rows = groupRows(tally, axis, counties, query.county)
  if (rows.length === 0) return <p className={cn('py-6 text-sm text-muted-foreground', className)}>{t`Nicio înregistrare pentru această selecție.`}</p>
  const shown = all ? rows : rows.slice(0, GROUP_SHOWN)
  const widest = Math.max(0.0001, ...rows.filter((row) => !isUnplaced(row)).map((row) => row.share))
  const hidden = rows.length - shown.length
  const rowCount = formatNgoNumber(rows.length)
  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-right">#</TableHead>
            <TableHead>{groupHeading(axis)}</TableHead>
            <TableHead className="text-right">{t`Înregistrări`}</TableHead>
            <TableHead className="hidden w-36 text-right sm:table-cell">{t`Din selecție`}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((row, index) => {
            const unplaced = isUnplaced(row)
            const next = unplaced ? null : drilled(query, axis, row.key)
            return (
              <TableRow key={row.key} className={cn(unplaced && 'text-muted-foreground')}>
                <TableCell className="align-top font-mono text-xs tabular-nums text-muted-foreground">{unplaced ? '' : index + 1}</TableCell>
                <TableCell className="w-full max-w-0">
                  {next ? (
                    <button type="button" onClick={() => onChange(next)} className="group flex max-w-full items-center gap-1.5 text-left hover:underline">
                      <span className="truncate">{row.label}</span>
                      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="block truncate">{row.label}</span>
                  )}
                  <span className="mt-1 block h-1 bg-muted/70 sm:hidden" aria-hidden="true">
                    <span className="block h-1 bg-primary/75" style={{ width: barWidth(row.share, widest, unplaced) }} />
                  </span>
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {formatNgoNumber(row.count)}
                  <span className="block text-xs text-muted-foreground sm:hidden">{formatNgoShare(row.share)}</span>
                </TableCell>
                <TableCell className="hidden align-top sm:table-cell">
                  <span className="flex items-center justify-end gap-2">
                    <span className="block h-1.5 w-20 bg-muted/70" aria-hidden="true">
                      <span className="block h-1.5 bg-primary/75" style={{ width: barWidth(row.share, widest, unplaced) }} />
                    </span>
                    <span className="w-12 text-right text-xs tabular-nums">{formatNgoShare(row.share)}</span>
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {hidden > 0 || all ? (
        <button
          type="button"
          onClick={() => setAll(!all)}
          aria-expanded={all}
          className="mt-3 min-h-10 text-sm font-medium text-foreground hover:underline sm:min-h-0"
        >
          {all ? t`Arată mai puține` : t`Arată toate (${rowCount})`}
        </button>
      ) : null}
    </div>
  )
}

function groupHeading(axis: GroupAxis): string {
  switch (axis) {
    case 'judet':
      return t`Județul`
    case 'localitate':
      return t`Localitatea`
    case 'forma':
      return t`Forma`
    case 'stare':
      return t`Starea`
    case 'an':
      return t`Anul`
  }
}

/** A bar's width against the largest placed row; the unplaced drawn to the same scale. */
function barWidth(share: number, widest: number, unplaced: boolean): string {
  const width = Math.max(Math.min((share / widest) * 100, 100), unplaced ? 0 : 1)
  return `${width.toFixed(1)}%`
}

/**
 * The selection by the year in the registry number: a bar a year, the
 * pointed or chosen year's count above. The export's own year is still
 * running and says so, drawn paler. One tab stop: the arrows, Home and End
 * move between the years. Every year labelled while they are few, the
 * lustrums or the decades when they are many.
 */
export function YearsBars({ tally, through, className }: { readonly tally: Tally; readonly through: string | null; readonly className?: string }) {
  const points = yearPoints(tally)
  const [active, setActive] = useState<number | null>(null)
  if (points.length === 0) return <p className={cn('py-6 text-sm text-muted-foreground', className)}>{t`Niciun an de registru în selecție.`}</p>
  const max = Math.max(1, ...points.map((point) => point.count))
  const shown = points.find((point) => point.year === active) ?? points[points.length - 1]
  const running = through ? Number(through.slice(0, 4)) : null
  const step = points.length <= 8 ? 1 : points.length <= 20 ? 5 : 10
  const unknown = unplacedOn(tally, 'an')
  const unknownText = formatNgoNumber(unknown)
  const until = through ? formatNgoDate(through) : ''
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = points.findIndex((point) => point.year === shown?.year)
    const index =
      event.key === 'ArrowRight' ? at + 1 : event.key === 'ArrowLeft' ? at - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : null
    if (index === null) return
    event.preventDefault()
    const point = points[Math.max(0, Math.min(points.length - 1, index))]
    if (point) setActive(point.year)
  }
  return (
    <figure className={className}>
      <p className="min-h-6 text-sm tabular-nums text-muted-foreground" aria-live="polite">
        {shown ? (
          <>
            <span className="font-semibold text-foreground">{shown.year}</span> · {countText(shown.count)}
            {shown.year === running ? ` · ${t`până la ${until}`}` : ''}
          </>
        ) : null}
      </p>
      <div
        role="group"
        tabIndex={0}
        aria-label={t`Înregistrări pe ani; săgețile schimbă anul`}
        onKeyDown={move}
        onPointerLeave={() => setActive(null)}
        className="mt-3 flex h-56 items-end gap-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:gap-1"
      >
        {points.map((point) => (
          <div key={point.year} onPointerEnter={() => setActive(point.year)} className="flex h-full min-w-0 flex-1 flex-col justify-end" aria-hidden="true">
            <span
              className={cn('block w-full', point.year === shown?.year ? 'bg-primary' : point.year === running ? 'bg-primary/35' : 'bg-primary/70')}
              style={{ height: point.count > 0 ? `${Math.max((point.count / max) * 100, 0.5)}%` : '0' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-px text-xs tabular-nums text-muted-foreground sm:gap-1" aria-hidden="true">
        {points.map((point) => (
          <span key={point.year} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
            {point.year % step === 0 ? point.year : ''}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 text-xs text-muted-foreground">
        {t`După anul din numărul de registru, nu după data înregistrării.`}
        {unknown > 0 ? ` ${t`${unknownText} fără an valid în număr.`}` : ''}
      </figcaption>
    </figure>
  )
}

// ──────────────────────────────────────────────────────────── the source ──

/** One line at the foot: the source, its export date, and how it was counted behind a click. */
export function SourceLine({
  snapshot,
  tally,
  className,
}: {
  readonly snapshot: RegistrySnapshot | null
  readonly tally: Tally | null
  readonly className?: string
}) {
  const captured = snapshot ? formatNgoDate(snapshot.capturedAt.slice(0, 10)) : null
  const url = snapshot?.sourceUrl ?? 'https://rnong.just.ro/registru-ong'
  const cap = formatNgoNumber(READ_CAP_PAGES * PAGE_SIZE)
  return (
    <footer className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground', className)}>
      <span>
        {captured ? (
          <Trans>
            Sursa:{' '}
            <a href={url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-foreground hover:underline">
              Registrul național ONG
            </a>
            , Ministerul Justiției, export din {captured}
          </Trans>
        ) : (
          <Trans>
            Sursa:{' '}
            <a href={url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-foreground hover:underline">
              Registrul național ONG
            </a>
            , Ministerul Justiției
          </Trans>
        )}
      </span>
      <span aria-hidden="true">·</span>
      <Popover>
        <PopoverTrigger className="underline-offset-4 hover:text-foreground hover:underline">{t`Cum am numărat`}</PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,32rem)] space-y-2 text-sm text-muted-foreground">
          <p>{t`Lista este exportul registrului, filtrat de API, în ordinea exportului: data din registru, cea mai recentă întâi. API-ul nu numără și nu grupează.`}</p>
          <p>{t`Numărătorile și împărțirile vin din citirea integrală a aceluiași export, pe județ, localitate, formă, stare, utilitate publică, an și CUI; le arătăm doar cât timp API-ul servește acel export.`}</p>
          <p>{t`O căutare după nume sau după număr e numărată din propriile rânduri, citite până la ${cap}; peste acest prag spunem doar că sunt mai multe.`}</p>
          <p>{t`Rândurile repetate câmp cu câmp sunt numărate o dată. Anul este cel din numărul de registru; un an înainte de 1990 sau după export e o greșeală de scriere și nu e numărat.`}</p>
          {tally && tally.capturedAt === null ? <p>{t`Această selecție a fost numărată din rândurile ei, citite integral.`}</p> : null}
        </PopoverContent>
      </Popover>
    </footer>
  )
}
