import { Fragment, useId, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, Check, Info, Link2, Plus, SlidersHorizontal, X } from 'lucide-react'
import { HeadlinePhrase } from '@/components/filters/filter-sheet/headline-phrase'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { ChoiceSelect } from '@/features/private-companies/components/analytics/analytics-choices'
import { cn } from '@/lib/utils'
import { ContestFigures, type Figure } from '../scrutin/parts'
import { eventTitle, familyPlural, scopeLabel } from '../shared/labels'
import { SCOPE_TYPES, type ScopeType } from '../shared/model'
import { commonNotes, ElectionsSourceLine, PROTOTYPE_HREF, useFormat } from '../shared/parts'
import {
  AXES,
  catalog,
  cleared,
  DEFAULT_QUERY,
  FILTER_KEYS,
  filledSearch,
  filterCount,
  levelTotals,
  MEASURES,
  measureValue,
  offeredTabs,
  onOfferedTab,
  optionsOf,
  QUERY_KEYS,
  questionOf,
  repaired,
  ROUND_UNREPORTED,
  searchOf,
  withFilter,
  withoutFilter,
  type Answer,
  type Catalog,
  type FilterKey,
  type Measure,
  type Query,
  type Tab,
} from './model'
import { axisPhrase, chipLabel, headlineParts, headlineText, measureLabel, officeText, roundText, tabLabel } from './text'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'

// ───────────────────────────────────────────────────────── the address ──

/**
 * The question, from the prototype's address, and the move that writes the
 * next one (every control writes the URL: a question is a link, Back works).
 * The harness's own keys (`v`, `layout`) and anything else are kept.
 */
export function useQuestion(tabs: readonly Tab[], defaults: Query = DEFAULT_QUERY): { readonly cat: Catalog; readonly query: Query; readonly move: (next: Query) => void } {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const cat = catalog()
  const query = useMemo(() => {
    // An absent key is its default (the default view needs no address); an address that names an election takes none of the default one.
    return onOfferedTab(repaired(questionOf(filledSearch(search, defaults), cat, tabs), cat), tabs)
  }, [cat, defaults, search, tabs])
  const move = (next: Query) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => {
        const kept = Object.fromEntries(Object.entries(previous).filter(([key]) => !(QUERY_KEYS as readonly string[]).includes(key)))
        return { ...kept, ...searchOf(onOfferedTab(repaired(next, cat), tabs), defaults) }
      },
      resetScroll: false,
    })
  return { cat, query, move }
}

// ───────────────────────────────────────────────────────── the notes ──

/** The page's notes behind one marker: the shared ones, then this page's own, each only when the question touches it. */
export function pageNotes(query: Query, answer: Answer): readonly ReactNode[] {
  const notes: ReactNode[] = [...commonNotes()]
  const references = answer.references
  if (references.length === 1 && query.editie) {
    notes.push(<Trans key="ref-one">Rândurile sunt numărate în ediția aleasă, {query.editie}.</Trans>)
  } else if (answer.multiEdition > 0) {
    const list = answer.events
      .filter((event) => event.editions.length > 1)
      .slice(0, 4)
      .map((event) => `${eventTitle(event)}: ${event.editions[0]?.key ?? ''}`)
      .join('; ')
    notes.push(
      <Trans key="ref-many">
        Rândurile de scrutin sunt numărate pe o singură ediție de fiecare alegere — cea cu cele mai multe rânduri, ediția de referință ({list}
        {answer.multiEdition > 4 ? '…' : ''}). Alegeți o ediție din filtre pentru a număra pe alta; API-ul nu are încă o selecție a sursei.
      </Trans>,
    )
  }
  if (answer.totals.unreferenced > 0) {
    const subject = plural(answer.totals.unreferenced, { one: 'O alegere are', few: '# alegeri au', other: '# de alegeri au' })
    notes.push(
      <Trans key="unreferenced">
        {subject} rânduri în această selecție doar în ediții care nu sunt de referință: ele nu intră în cifra rândurilor („—" acolo unde sunt singurele). Alegeți ediția din filtre
        ca să le numărați.
      </Trans>,
    )
  }
  if (answer.folded.size > 0) {
    notes.push(
      <Trans key="e1-folded">
        Gruparea „locale 2014" ține datele alegerilor locale din 2016: e listată, marcată cu ✱, dar alegerea și rândurile ei sunt numărate o singură dată, la 2016.
      </Trans>,
    )
  }
  if (query.judet || query.dupa === 'judete' || query.dupa === 'localitati') {
    notes.push(
      <Trans key="county">
        Județul unui rând e județul INS de azi al localității în care sursa a raportat (după codul SIRUTA). Rândurile raportate pe numerotarea sursei, pe județe, în străinătate sau
        pe țară nu au județ aici: codurile de județ ale surselor diferă de la o ediție la alta și nu se potrivesc.
      </Trans>,
    )
  }
  if (query.dupa === 'timp' || query.an !== null) {
    notes.push(<Trans key="calendar">Anii fără date sunt comparați cu calendarul electoral al Transparenta.eu, ținut de mână, nu cu o listă a API-ului.</Trans>)
  }
  return notes
}

/** One marker for everything a reader should know before the numbers: amber with the count. The shared marker is not exported on its own, so this is its copy. */
export function NotesMarker({ notes }: { readonly notes: readonly ReactNode[] }) {
  const captionId = useId()
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex min-h-11 items-center gap-1 px-1 text-xs font-semibold tabular-nums text-amber-700 transition-colors hover:text-amber-800 dark:text-amber-400 sm:min-h-0"
        aria-label={t`Ce trebuie știut despre aceste date (${notes.length} note)`}
      >
        <Info className="size-3.5" aria-hidden="true" />
        {notes.length}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(28rem,calc(100vw-2rem))] text-sm leading-relaxed" aria-labelledby={captionId}>
        <MonoLabel id={captionId} className="block text-muted-foreground">
          <Trans>Ce trebuie știut despre aceste date</Trans>
        </MonoLabel>
        <ul className="mt-3 list-disc space-y-2 pl-4 text-foreground">
          {notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

// ───────────────────────────────────────────────────────── the head ──

function headlineSize(text: string): string {
  if (text.length <= 36) return 'text-4xl sm:text-6xl'
  if (text.length <= 72) return 'text-3xl sm:text-5xl'
  return 'text-2xl sm:text-4xl'
}

const ALL = '__toate__'

/** The election at the top right, newest first: the analysis's „period". */
export function ElectionMenu({
  query,
  cat,
  onChange,
  allLabel,
}: {
  readonly query: Query
  readonly cat: Catalog
  readonly onChange: (query: Query) => void
  readonly allLabel: string
}) {
  const groups = useMemo(() => {
    const byFamily = new Map<string, { value: string; label: string }[]>()
    for (const event of cat.data.events) {
      const family = familyPlural(event.family)
      byFamily.set(family, [...(byFamily.get(family) ?? []), { value: event.key, label: eventTitle(event) }])
    }
    return [{ options: [{ value: ALL, label: allLabel }] }, ...[...byFamily.entries()].map(([label, options]) => ({ label, options }))]
  }, [allLabel, cat])
  return (
    <ChoiceSelect
      value={query.alegere ?? ALL}
      groups={groups}
      onChange={(value) => onChange(value === ALL ? withoutFilter(query, 'alegere', cat) : withFilter(query, 'alegere', value, cat))}
      label={t`Alegerea`}
      triggerClassName="h-9 w-auto max-w-[14rem] rounded-none border-foreground/25 font-semibold shadow-none hover:border-foreground/60 sm:max-w-xs"
    />
  )
}

export function ShareIcon({ className }: { readonly className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  return (
    <button type="button" onClick={copy} className={className} aria-label={copied ? t`Copiat` : t`Copiază legătura`} title={copied ? t`Copiat` : t`Copiază legătura`}>
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
    </button>
  )
}

/**
 * The head on the profiles' grid: the way back and the election at the top
 * right, with the date the data was read; the question as the headline, each
 * filter a phrase that opens the panel and whose ✕ drops it; under it, what
 * adds to the question and the caveats marker (Guidelines G1, G2, G5).
 */
export function AnalyticsHead({
  query,
  cat,
  answer,
  notes,
  onChange,
  onFilters,
  fixedRoles = [],
  allLabel,
}: {
  readonly query: Query
  readonly cat: Catalog
  readonly answer: Answer
  readonly notes: readonly ReactNode[]
  readonly onChange: (query: Query) => void
  readonly onFilters: () => void
  /** Filters the page is about, with no ✕ (the finder's election). */
  readonly fixedRoles?: readonly FilterKey[]
  readonly allLabel?: string
}) {
  const format = useFormat()
  const parts = headlineParts(query, cat)
  const said = new Set<string>(parts.map((part) => part.role))
  const unsaid = FILTER_KEYS.filter((key) => query[key] !== null && !said.has(key))
  const text = headlineText(query, cat)
  return (
    <section className="relative border-b" aria-labelledby="elections-analytics-title">
      <TwoLayerLattice idPrefix="elections-analytics-head" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <a href={PROTOTYPE_HREF.hub()} className="group inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`Alegeri`}</span>
            </a>
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden="true">/</span>
              <span>{t`Analize`}</span>
            </span>
          </MonoLabel>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:inline">{t`Date citite pe ${format.day(cat.readAt)}`}</span>
            <span className="flex items-center gap-2">
              <MonoLabel className="sr-only text-muted-foreground sm:not-sr-only">{t`Alegerea`}</MonoLabel>
              <ElectionMenu query={query} cat={cat} onChange={onChange} allLabel={allLabel ?? t`Toate alegerile`} />
            </span>
          </div>
        </div>
        <p className="mt-2 text-right text-xs text-muted-foreground sm:hidden">{t`Date citite pe ${format.day(cat.readAt)}`}</p>
        <h1 id="elections-analytics-title" className={cn('mt-6 max-w-5xl font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-8', headlineSize(text))}>
          {parts.map((part, index) => (
            <Fragment key={`${part.role}-${index}`}>
              {part.before}
              {part.role === 'measure' || fixedRoles.includes(part.role) ? (
                <span>{part.text}</span>
              ) : (
                <HeadlinePhrase
                  text={part.text}
                  removeLabel={t`Scoate „${part.text}"`}
                  onOpen={onFilters}
                  onRemove={() => onChange(withoutFilter(query, part.role as FilterKey, cat))}
                />
              )}
            </Fragment>
          ))}
          {', '}
          <span className="text-muted-foreground">{axisPhrase(query.dupa)}</span>
        </h1>
        {unsaid.length > 0 ? (
          <p className="mt-4 flex flex-wrap gap-2">
            {unsaid.map((key) => (
              <span key={key} className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 text-sm">
                {chipLabel(query, key, cat)}
                <button type="button" onClick={() => onChange(withoutFilter(query, key, cat))} aria-label={t`Scoate`} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1">
          <AddFilter query={query} cat={cat} onChange={onChange} />
          <button type="button" onClick={onFilters} className={LINK}>
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            {t`Filtre`}
            {filterCount(query) > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{filterCount(query)}</span> : null}
          </button>
          <ShareIcon className={cn(LINK, 'size-11 justify-center sm:size-auto')} />
          <NotesMarker notes={notes} />
          <span className="sr-only">
            {measureValue(answer.totals, 'randuri') === null
              ? t`Rânduri de scrutin doar în ediții care nu sunt de referință`
              : t`${format.n(answer.totals.randuri)} rânduri de scrutin`}
          </span>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

// ───────────────────────────────────────────────────────── add a filter ──

/** „+ Adaugă un filtru": one box over every value the snapshot can filter by — elections, editions, offices, levels, rounds, counties, years. */
export function AddFilter({ query, cat, onChange }: { readonly query: Query; readonly cat: Catalog; readonly onChange: (query: Query) => void }) {
  const [open, setOpen] = useState(false)
  const pick = (next: Query) => {
    setOpen(false)
    onChange(next)
  }
  const options = useMemo(
    () => (open ? (Object.fromEntries(FILTER_KEYS.map((key) => [key, optionsOf(cat, query, key)])) as Record<FilterKey, ReturnType<typeof optionsOf>>) : null),
    [cat, open, query],
  )
  const has = (key: FilterKey, value: string | number) => options?.[key].some((option) => option.value === value) ?? false
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={LINK}>
        <Plus className="size-3.5" aria-hidden="true" />
        {t`Adaugă un filtru`}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] p-0">
        <Command className="pt-1.5">
          <CommandInput placeholder={t`Alegere, funcție, județ, an, tur…`} />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>{t`Nimic găsit.`}</CommandEmpty>
            {options ? (
              <>
                <CommandGroup heading={t`Alegeri`}>
                  {cat.data.events
                    .filter((event) => has('alegere', event.key) && query.alegere !== event.key)
                    .map((event) => (
                      <CommandItem key={event.key} value={`alegere ${eventTitle(event)} ${event.year}`} onSelect={() => pick(withFilter(query, 'alegere', event.key, cat))}>
                        {eventTitle(event)}
                      </CommandItem>
                    ))}
                </CommandGroup>
                <CommandGroup heading={t`Funcții`}>
                  {cat.offices
                    .filter((office) => has('functie', office) && query.functie !== office)
                    .map((office) => {
                      const text = officeText(office)
                      return (
                        <CommandItem key={office} value={`functie ${text.label} ${office}`} onSelect={() => pick(withFilter(query, 'functie', office, cat))}>
                          <span className={cn('min-w-0 flex-1 truncate', !text.known && 'font-mono text-xs')}>{text.label}</span>
                          {!text.known ? <MonoLabel className="text-muted-foreground">{t`etichetă din sursă`}</MonoLabel> : null}
                        </CommandItem>
                      )
                    })}
                </CommandGroup>
                <CommandGroup heading={t`Județe`}>
                  {cat.counties
                    .filter((county) => has('judet', county.code) && query.judet !== county.code)
                    .map((county) => (
                      <CommandItem key={county.code} value={`judet ${county.name} ${county.code}`} onSelect={() => pick(withFilter(query, 'judet', county.code, cat))}>
                        {t`Raportate pe localități din ${county.name}`}
                      </CommandItem>
                    ))}
                </CommandGroup>
                <CommandGroup heading={t`Niveluri și tururi`}>
                  {SCOPE_TYPES.filter((scope) => has('nivel', scope) && query.nivel !== scope && !query.judet).map((scope) => (
                    <CommandItem key={scope} value={`nivel ${scopeLabel(scope)}`} onSelect={() => pick(withFilter(query, 'nivel', scope, cat))}>
                      {t`Nivel: ${scopeLabel(scope)}`}
                    </CommandItem>
                  ))}
                  {[...cat.rounds.map((round) => round ?? ROUND_UNREPORTED)]
                    .filter((round) => has('tur', round) && query.tur !== round)
                    .map((round) => (
                      <CommandItem key={round} value={`tur ${roundText(round)}`} onSelect={() => pick(withFilter(query, 'tur', round, cat))}>
                        {t`Tur: ${roundText(round)}`}
                      </CommandItem>
                    ))}
                </CommandGroup>
                <CommandGroup heading={t`Ani și tipuri`}>
                  {cat.years
                    .filter((year) => has('an', year) && query.an !== year)
                    .map((year) => (
                      <CommandItem key={year} value={`an ${year}`} onSelect={() => pick(withFilter(query, 'an', year, cat))}>
                        {t`Anul ${year}`}
                      </CommandItem>
                    ))}
                  {(['local', 'parliamentary', 'presidential', 'european', 'referendum'] as const)
                    .filter((family) => has('tip', family) && query.tip !== family)
                    .map((family) => (
                      <CommandItem key={family} value={`tip ${familyPlural(family)}`} onSelect={() => pick(withFilter(query, 'tip', family, cat))}>
                        {t`Tipul: ${familyPlural(family)}`}
                      </CommandItem>
                    ))}
                </CommandGroup>
                <CommandGroup heading={t`Ediții de date`}>
                  {cat.data.editions
                    .filter((edition) => has('editie', edition.key) && query.editie !== edition.key)
                    .map((edition) => (
                      <CommandItem key={edition.key} value={`editie ${edition.key}`} onSelect={() => pick(withFilter(query, 'editie', edition.key, cat))}>
                        <span className="font-mono text-xs">{edition.key}</span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ───────────────────────────────────────────────────────── the bars ──

/** The scope types the data holds; `chamber` has no row anywhere, so it is never offered. */
const LEVELS: readonly ScopeType[] = SCOPE_TYPES.filter((scope) => scope !== 'chamber')

/**
 * The pinned bar: the scope types kept apart (§12.3 rule 3), each with the
 * rows it holds for the question's other filters; the one read is
 * underlined. Under a county filter only the rows per locality have a county,
 * so the other levels are not offered.
 */
export function LevelsBar({ query, cat, onChange }: { readonly query: Query; readonly cat: Catalog; readonly onChange: (query: Query) => void }) {
  const format = useFormat()
  const totals = levelTotals(cat, query)
  // A level is offered when the question has rows there, counted or not (a level with rows only in other editions shows a dash).
  const levels = query.judet ? LEVELS.filter((scope) => scope === 'siruta') : LEVELS.filter((scope) => (totals.get(scope)?.editii ?? 0) > 0)
  const items: readonly { readonly key: ScopeType | 'all'; readonly label: string }[] = [
    { key: 'all', label: t`Toate nivelurile` },
    ...levels.map((scope) => ({ key: scope, label: scopeLabel(scope) })),
  ]
  return (
    <nav aria-label={t`Nivelul raportării`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground md:block md:max-w-md">{headlineText(query, cat)}</span>
        <ol className="flex w-full gap-x-4 overflow-x-auto sm:w-auto sm:shrink-0 sm:gap-6 md:ml-auto">
          {items.map((item) => {
            const active = (query.nivel ?? 'all') === item.key
            const level = totals.get(item.key)
            const value = level ? measureValue(level, query.masura) : 0
            return (
              <li key={item.key} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(item.key === 'all' ? withoutFilter(query, 'nivel', cat) : withFilter(query, 'nivel', item.key, cat))}
                  className={cn(
                    'flex min-h-11 items-center gap-2 border-b-2 py-2 text-left text-sm leading-tight transition-colors sm:py-0',
                    active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="flex min-w-0 flex-col md:flex-row md:items-baseline md:gap-1.5">
                    <span className="whitespace-nowrap">{item.label}</span>
                    <span
                      className="flex h-4 items-center text-xs tabular-nums text-muted-foreground"
                      title={value === null ? t`Rânduri doar în ediții care nu sunt de referință; nu se adună` : undefined}
                    >
                      {value === null ? '—' : format.n(value)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </RuledFrame>
    </nav>
  )
}

// ───────────────────────────────────────────────────────── the figures ──

/**
 * Three or four figures, each in the unit it counts (G3): elections, editions,
 * rows on the reference editions, places (when the snapshot can say). A value
 * the selection holds but does not count here is a dash with its note, never
 * 0 — so the band is the contest page's copy of `HubFiguresBand` with a dash.
 */
export function Figures({ query, answer, cat }: { readonly query: Query; readonly answer: Answer; readonly cat: Catalog }) {
  const format = useFormat()
  const years = answer.events.map((event) => event.year)
  const first = years.length ? Math.min(...years) : null
  const last = years.length ? Math.max(...years) : null
  const rows = measureValue(answer.totals, 'randuri')
  const unreferenced = answer.totals.unreferenced
  const figures: Figure[] = [
    {
      key: 'alegeri',
      value: answer.totals.alegeri,
      label: <Trans>Alegeri</Trans>,
      note:
        first !== null && last !== null ? (
          answer.folded.size > 0 ? (
            <Trans>
              din {first} până în {last}; „locale 2014” numărate cu 2016
            </Trans>
          ) : first === last ? (
            <Trans>din {first}, grupate de platformă</Trans>
          ) : (
            <Trans>
              din {first} până în {last}, grupate de platformă
            </Trans>
          )
        ) : (
          <Trans>nimic în această selecție</Trans>
        ),
    },
    {
      key: 'editii',
      value: answer.totals.editii,
      label: <Trans>Ediții de date</Trans>,
      note: answer.multiEdition > 0 ? <Trans>{answer.multiEdition} alegeri au mai multe; nu se adună</Trans> : <Trans>câte una de fiecare alegere</Trans>,
    },
    {
      key: 'randuri',
      value: rows,
      label: <Trans>Rânduri de scrutin</Trans>,
      note:
        rows === null ? (
          <Trans>doar în ediții care nu sunt de referință; alegeți ediția din filtre</Trans>
        ) : unreferenced > 0 ? (
          <Trans>pe edițiile de referință; {unreferenced} alegeri au rânduri doar în alte ediții</Trans>
        ) : answer.references.length === 1 && answer.references[0] ? (
          <Trans>în ediția {answer.references[0].key}; nu curse</Trans>
        ) : (
          <Trans>pe ediția de referință a fiecărei alegeri; nu curse</Trans>
        ),
    },
  ]
  if (answer.places !== null) {
    figures.push({
      key: 'localitati',
      value: answer.places,
      label: <Trans>Localități raportate</Trans>,
      note: query.judet ? (
        <Trans>coduri SIRUTA distincte din județ, în lista INS de azi</Trans>
      ) : (
        <Trans>coduri SIRUTA distincte; {format.n(cat.data.places.insUats)} UAT-uri în lista INS de azi</Trans>
      ),
    })
  }
  return <ContestFigures figures={figures} />
}

// ───────────────────────────────────────────────────────── the tabs ──

const CONTROL_HEIGHT = '[&>button]:min-h-11 sm:[&>button]:min-h-10 sm:[&>button]:px-4'

/** The axis tabs over the answer and the measure beside them; a tab with nothing to group is not shown. */
export function AxisTabs({
  query,
  tabs,
  onChange,
  className,
}: {
  readonly query: Query
  readonly tabs: readonly Tab[]
  readonly onChange: (query: Query) => void
  readonly className?: string
}) {
  const offered = offeredTabs(tabs, query)
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      {/* Toggle buttons, not tabs: each writes the address and the table below follows; a pressed state says which one is read. */}
      <div role="group" aria-label={t`După ce`} className="flex flex-wrap gap-x-4 gap-y-1 border-b">
        {offered.map((tab) => {
          const active = tab === query.dupa
          return (
            <button
              key={tab}
              type="button"
              data-axis={tab}
              aria-pressed={active}
              onClick={() => onChange({ ...query, dupa: tab, pagina: 1 })}
              className={cn(
                '-mb-px border-b-2 px-0.5 pb-2 text-sm',
                active ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tabLabel(tab)}
            </button>
          )
        })}
      </div>
      {query.dupa === 'randuri' ? null : (
        <IndicatorToggle<Measure>
          label={t`Măsura`}
          value={query.masura}
          onChange={(masura) => onChange({ ...query, masura })}
          options={MEASURES.map((key) => ({ key, label: measureLabel(key) }))}
          className={CONTROL_HEIGHT}
        />
      )}
    </div>
  )
}

export const ALL_AXES: readonly Tab[] = AXES

// ───────────────────────────────────────────────────────── the foot ──

/** The one source line, with how the figures were counted behind a click; the caveats are the head's marker. */
export function SourceFoot({ query, answer, cat }: { readonly query: Query; readonly answer: Answer; readonly cat: Catalog }) {
  const format = useFormat()
  const references = answer.references
  const catalogRows = cat.data.editions.reduce((sum, edition) => sum + edition.contests, 0)
  return (
    <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <ElectionsSourceLine readAt={cat.readAt} notes={[]} className="text-xs" />
      <span aria-hidden="true">·</span>
      <Popover>
        <PopoverTrigger className="underline-offset-4 hover:text-foreground hover:underline">{t`Cum am numărat`}</PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,32rem)] space-y-2 text-sm text-muted-foreground">
          <p>
            <Trans>
              Un rând de scrutin e o funcție raportată la un loc raportat, cu eticheta de tur a sursei. Rândurile se numără pe o singură ediție de fiecare alegere, ediția de
              referință: cea aleasă din filtre, altfel cea cu cele mai multe rânduri. Edițiile și alegerile se numără ca atare.
            </Trans>
          </p>
          {references.length > 0 ? (
            <p className="font-mono text-xs">
              {t`Ediții de referință:`} {references.map((edition) => edition.key).join(', ')}
            </p>
          ) : null}
          <p>
            <Trans>
              Tipul și anul sunt ale grupării platformei (cheia alegerii), nu ale etichetei ediției. Un județ e județul INS al localității raportate, după codul SIRUTA; rândurile
              fără localitate nu au județ. Cota se arată doar când axa împarte măsura în părți care se adună la total.
            </Trans>
          </p>
          {query.dupa === 'timp' ? <p>{t`Calendarul alegerilor este al Transparenta.eu, ținut de mână; un an fără date este „nu e în date", nu zero.`}</p> : null}
        </PopoverContent>
      </Popover>
      <span className="basis-full">
        {t`Snapshot al catalogului (${format.n(cat.data.editions.length)} ediții de date, cu ${format.n(catalogRows)} rânduri în fișierele lor — edițiile se suprapun, deci nu e un număr de rânduri al alegerilor), scris de scripts/generate-elections-catalog-fixture.mjs și generate-elections-analize-counties.mjs.`}
      </span>
    </footer>
  )
}

export { cleared, chipLabel }
