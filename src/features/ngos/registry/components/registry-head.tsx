import { Fragment, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
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
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { formatNgoDate } from '@/features/ngos/hub/ngo-format'
import type { RegistrySnapshot } from '../api'
import type { NgoRegistrySummary, NgoRegistryStatusKey } from '@/features/ngos/hub/registry-summary-types'
import { cn } from '@/lib/utils'
import {
  filterCount,
  headline,
  headlineParts,
  questions,
  STATUS_ORDER,
  statusLabel,
  suggestionsOf,
  without,
  type FilterKey,
  type RegistryNotes,
  type RegistryQuery,
} from '../model'

/**
 * The registry page's head, in the analytics page's language: the way
 * back, the export's date, the question as the headline — a filter's
 * phrase opens the panel, its ✕ drops it — what adds to the query (the
 * omnibox, the filters, the ready questions, the link), the caveats'
 * marker, and the statuses in the pinned bar. Promoted from prototype
 * ngos/registry, variant intrebare (design.md §15).
 */

const PHRASE =
  'text-left underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em] transition-colors hover:decoration-foreground'
const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'
const CHIP = 'inline-flex min-h-9 items-center gap-1.5 border px-2.5 text-sm transition-colors hover:bg-muted/60'

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
}: {
  readonly query: RegistryQuery
  readonly counties: NgoRegistrySummary['counties']
  readonly snapshot: RegistrySnapshot | null
  readonly notes: RegistryNotes
  readonly onChange: (query: RegistryQuery) => void
  readonly onFilters: () => void
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
