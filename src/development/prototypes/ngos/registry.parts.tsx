import { Fragment, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  Info,
  Link2,
  List,
  MinusCircle,
  Plus,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { formatNgoDate, formatNgoNumber, formatNgoShare } from '@/features/ngos/hub/ngo-format'
import type { RegistryRecord, RegistrySnapshot } from '@/features/ngos/registry/api'
import type { NgoRegistrySummary, NgoRegistryStatusKey } from '@/features/ngos/hub/registry-summary-types'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { activeNumberLocale } from '@/features/statistics/lib/format'
import { cn } from '@/lib/utils'
import {
  activeFilters,
  countText,
  countyLabel,
  drilled,
  filterCount,
  filterLabel,
  groupAxes,
  groupLabel,
  headline,
  headlineParts,
  PAGE_SIZE,
  questions,
  READ_CAP_PAGES,
  STATUS_ORDER,
  statusKeyOf,
  statusLabel,
  statusWord,
  suggestionsOf,
  TABLE_PAGE,
  without,
  type FilterKey,
  type GroupAxis,
  type RegistryNotes,
  type RegistryQuery,
  type RegistryRead,
} from './registry.model'
import { placeKey } from './registry.place'
import { groupRows, isUnplaced, townLabel, unplacedOn, yearPoints, type RegistryFigure, type Tally } from './registry.counts'
import type { RegistryReadState } from './registry.data'

/**
 * The registry page's parts, in the analytics page's language: the head on
 * the profiles' grid (the way back, the export's date, the question as the
 * headline — a filter's phrase opens the panel, its ✕ drops it — what adds
 * to the query and the caveats' marker), the statuses in the pinned bar,
 * the figures band, the answer (the records, or the selection broken down
 * on an axis its filters leave open), the source line with the method
 * behind it.
 */

const PHRASE =
  'text-left underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em] transition-colors hover:decoration-foreground'
const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'
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

// ─────────────────────────────────────────────────────────── controls ──

/** One marker for all a reader should know before the numbers: amber with a count when something is off, an „i" otherwise. */
function NotesMarker({ notes }: { readonly notes: RegistryNotes }) {
  const alerts = notes.alerts
  const count = alerts.length
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex min-h-11 min-w-11 items-center justify-center gap-1 px-1 text-xs tabular-nums sm:h-6 sm:min-h-0 sm:min-w-0',
          alerts.length > 0 ? 'text-amber-700 hover:text-amber-800 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground',
        )}
        aria-label={count > 0 ? plural(count, { one: '# atenționare', few: '# atenționări', other: '# de atenționări' }) : t`Despre aceste cifre`}
      >
        {alerts.length > 0 ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : <Info className="size-3.5" aria-hidden="true" />}
        {alerts.length > 0 ? alerts.length : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] space-y-2 text-sm">
        {alerts.map((alert) => (
          <p key={alert} className="border-l-2 border-amber-600/60 pl-3 text-foreground">
            {alert}
          </p>
        ))}
        {notes.facts.map((fact) => (
          <p key={fact} className="text-muted-foreground">
            {fact}
          </p>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/** Copies this page's address: every control writes it, so a question is a link. */
function ShareIcon({ className }: { readonly className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  return (
    <button
      type="button"
      onClick={copy}
      className={className}
      aria-label={copied ? t`Copiat` : t`Copiază legătura`}
      title={copied ? t`Copiat` : t`Copiază legătura`}
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
    </button>
  )
}

const GROUP_TITLE: Readonly<Record<'county' | 'form' | 'status' | 'utility' | 'name' | 'number', () => string>> = {
  county: () => t`Județe`,
  form: () => t`Forme juridice`,
  status: () => t`Stări`,
  utility: () => t`Utilitate publică`,
  name: () => t`În nume`,
  number: () => t`Număr de registru`,
}

/** „+ Adaugă un filtru": one box over counties, legal forms, statuses, public utility, words in a name and a registry number. */
function AddFilter({
  query,
  counties,
  onChange,
  trigger,
  triggerClassName,
}: {
  readonly query: RegistryQuery
  readonly counties: NgoRegistrySummary['counties']
  readonly onChange: (query: RegistryQuery) => void
  readonly trigger?: ReactNode
  readonly triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const found = suggestionsOf(term, query, counties)
  const groups = (['number', 'county', 'form', 'status', 'utility', 'name'] as const)
    .map((group) => ({
      group,
      items: found.filter((item) => item.group === group),
    }))
    .filter((entry) => entry.items.length > 0)
  const pick = (next: RegistryQuery) => {
    setOpen(false)
    setTerm('')
    onChange(next)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={triggerClassName ?? cn(CHIP, 'text-muted-foreground')}>
        {trigger ?? (
          <>
            <Plus className="size-3.5" aria-hidden="true" />
            {t`Filtru`}
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] p-0">
        <Command shouldFilter={false}>
          <CommandInput value={term} onValueChange={setTerm} placeholder={t`Județ, formă, stare, cuvinte din nume…`} />
          <CommandList className="max-h-[60vh]">
            {term.trim().length < 2 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">{t`Scrie un județ („Cluj”), o formă („fundații”), o stare („radiate”), un număr de registru sau cuvinte din nume.`}</p>
            ) : (
              <CommandEmpty>{t`Nimic găsit.`}</CommandEmpty>
            )}
            {groups.map(({ group, items }) => (
              <CommandGroup key={group} heading={GROUP_TITLE[group]()}>
                {items.map((item) => (
                  <CommandItem key={item.key} value={item.key} onSelect={() => pick(item.query)}>
                    {group === 'name' ? <Search className="size-3.5" aria-hidden="true" /> : null}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** The ready questions, as a menu. */
function QuestionsMenu({ onChange, triggerClassName }: { readonly onChange: (query: RegistryQuery) => void; readonly triggerClassName?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={triggerClassName ?? CHIP}>
        {t`Întrebări`}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-[min(92vw,22rem)] overflow-y-auto p-3">
        <ul className="space-y-1.5">
          {questions().map((question) => (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onChange(question.query)
                }}
                className="text-left text-sm leading-snug text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                {question.text}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/** „Filtre", with how many are on. */
function FiltersButton({ query, onClick, className }: { readonly query: RegistryQuery; readonly onClick: () => void; readonly className?: string }) {
  const count = filterCount(query)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('inline-flex min-h-9 items-center gap-1.5 border px-2.5 text-sm font-medium transition-colors hover:bg-muted/60', className)}
    >
      <SlidersHorizontal className="size-3.5" aria-hidden="true" />
      {t`Filtre`}
      {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
    </button>
  )
}

// ───────────────────────────────────────────────────────────── the head ──

function SentencePart({
  part,
  query,
  onChange,
  onFilters,
}: {
  readonly part: ReturnType<typeof headlineParts>[number]
  readonly query: RegistryQuery
  readonly onChange: (query: RegistryQuery) => void
  readonly onFilters: () => void
}) {
  // The status is chosen in the bar under the head; the subject is the form, a filter of its own.
  if (part.role === 'status') return <span>{part.text}</span>
  if (part.role === 'subject' && query.category === null) return <span>{part.text}</span>
  const key: FilterKey = part.role === 'subject' ? 'category' : part.role
  const phrase = part.text
  return (
    <span className="group/phrase relative">
      <button type="button" onClick={onFilters} className={PHRASE}>
        {part.text}
      </button>
      <button
        type="button"
        onClick={() => onChange(without(query, key))}
        aria-label={t`Scoate „${phrase}”`}
        className="ml-0.5 inline-flex size-[0.7em] items-center justify-center align-[0.05em] text-muted-foreground/70 transition-opacity hover:text-foreground focus-visible:opacity-100 sm:absolute sm:-right-[0.5em] sm:-top-[0.1em] sm:ml-0 sm:size-[0.5em] sm:bg-background sm:opacity-0 sm:group-hover/phrase:opacity-100"
      >
        <X className="size-[0.55em] sm:size-full" aria-hidden="true" />
      </button>
    </span>
  )
}

/** The headline's size by its length, as the profiles size a name. */
function headlineSize(text: string): string {
  if (text.length <= 36) return 'text-4xl sm:text-6xl'
  if (text.length <= 72) return 'text-3xl sm:text-5xl'
  return 'text-2xl sm:text-4xl'
}

export function RegistryHead({
  query,
  counties,
  snapshot,
  notes,
  onChange,
  onFilters,
  under,
}: {
  readonly query: RegistryQuery
  readonly counties: NgoRegistrySummary['counties']
  readonly snapshot: RegistrySnapshot | null
  readonly notes: RegistryNotes
  readonly onChange: (query: RegistryQuery) => void
  readonly onFilters: () => void
  /** A line under the headline, the list variant's count. */
  readonly under?: ReactNode
}) {
  const parts = headlineParts(query, counties)
  const captured = snapshot ? formatNgoDate(snapshot.capturedAt.slice(0, 10)) : null
  const fresh = captured ? t`Export din ${captured}` : null
  return (
    <section className="relative border-b" aria-labelledby="registry-title">
      <TwoLayerLattice idPrefix="registry-head" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Link to="/ngos" className="group inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`ONG-uri`}</span>
            </Link>
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden="true">/</span>
              <span>{t`Registrul`}</span>
            </span>
          </MonoLabel>
          {fresh ? (
            <span className="text-xs tabular-nums text-muted-foreground">{fresh}</span>
          ) : (
            <span className="h-4 w-36 animate-pulse bg-muted/60" aria-hidden="true" />
          )}
        </div>
        <h1
          id="registry-title"
          className={cn(
            'mt-6 max-w-5xl break-words font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-8',
            headlineSize(parts.map((part) => part.before + part.text).join('')),
          )}
        >
          {parts.map((part) => (
            <Fragment key={part.role}>
              {part.before}
              <SentencePart part={part} query={query} onChange={onChange} onFilters={onFilters} />
            </Fragment>
          ))}
        </h1>
        {under ? <div className="mt-4">{under}</div> : null}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1">
          <AddFilter
            query={query}
            counties={counties}
            onChange={onChange}
            triggerClassName={LINK}
            trigger={
              <>
                <Plus className="size-3.5" aria-hidden="true" />
                {t`Adaugă un filtru`}
              </>
            }
          />
          <FiltersButton
            query={query}
            onClick={onFilters}
            className="min-h-11 border-0 px-0 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground sm:min-h-0"
          />
          <QuestionsMenu onChange={onChange} triggerClassName={LINK} />
          <ShareIcon className={cn(LINK, 'size-11 justify-center sm:size-auto')} />
          <NotesMarker notes={notes} />
        </div>
        {/* The crux on the head's bottom rule, where the bar begins; above the bar, which would cover its top half. */}
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────── the bar ──

const STATUS_ICON: Readonly<Record<NgoRegistryStatusKey | 'all', LucideIcon>> = {
  all: List,
  registered: CheckCircle2,
  dissolved: MinusCircle,
  inLiquidation: Hourglass,
  deregistered: XCircle,
}

/**
 * The statuses in the pinned bar, as the analytics page lays out its
 * populations: the question on the left (from a wide screen), the five
 * statuses at the right, each with its mark; the one read is underlined.
 * „Toate" is the registry itself; „Înregistrate" is what most readers mean.
 */
export function StatusNav({
  query,
  counties,
  onChange,
}: {
  readonly query: RegistryQuery
  readonly counties: NgoRegistrySummary['counties']
  readonly onChange: (query: RegistryQuery) => void
}) {
  return (
    <nav aria-label={t`Starea în registru`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 overflow-x-auto py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground md:block md:max-w-md">{headline(query, counties)}</span>
        <ol className="flex shrink-0 gap-4 sm:gap-6 md:ml-auto">
          {STATUS_ORDER.map((status) => {
            const active = query.status === status
            const Icon = STATUS_ICON[status ?? 'all']
            return (
              <li key={status ?? 'all'}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...query, status })}
                  className={cn(
                    'flex min-h-11 items-center gap-1.5 whitespace-nowrap border-b-2 text-[0.8125rem] leading-tight transition-colors sm:text-sm',
                    active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className={cn('hidden size-4 shrink-0 sm:block', active && 'text-primary')} aria-hidden="true" />
                  {statusLabel(status)}
                </button>
              </li>
            )
          })}
        </ol>
      </RuledFrame>
    </nav>
  )
}

/** The statuses as a quick row above the list, for the variant without the bar. */
export function StatusRow({
  query,
  onChange,
  className,
}: {
  readonly query: RegistryQuery
  readonly onChange: (query: RegistryQuery) => void
  readonly className?: string
}) {
  return (
    <div role="group" aria-label={t`Starea în registru`} className={cn('flex flex-wrap gap-1.5', className)}>
      {STATUS_ORDER.map((status) => (
        <button
          key={status ?? 'all'}
          type="button"
          aria-pressed={query.status === status}
          onClick={() => onChange({ ...query, status })}
          className={cn(
            'min-h-10 border px-2.5 py-1 text-sm sm:min-h-0',
            query.status === status ? 'border-primary bg-primary/5 font-semibold' : 'hover:bg-muted',
          )}
        >
          {statusLabel(status)}
        </button>
      ))}
    </div>
  )
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
export const ANSWER_PANEL = 'registry-answer'

export function answerTabId(axis: AnswerAxis): string {
  return `registry-answer-${axis}`
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
                      to="/ngos/registry/$recordId"
                      params={{ recordId: row.id }}
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
