import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { ArrowUpRight, Check, ChevronDown, Link2, Plus, Search, X } from 'lucide-react'
import { z } from 'zod'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSearchResults } from '@/features/landing/hooks/use-landing-search'
import { procurementHrefOf } from '@/features/procurement/lib/home-links'
import { dayText, monthText } from '@/features/procurement/lib/home-format'
import { formatProcurementCountyName } from '@/features/procurement/lib/procurement-geography'
import { HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { cn } from '@/lib/utils'
import {
  AXIS_ORDER,
  bucketStart,
  clippedBucket,
  POPULATIONS,
  cpvLevelOf,
  cpvPrefix,
  drilled,
  groupProblem,
  perResidentAllowed,
  queryOf,
  repaired,
  searchOf,
  unreadParams,
  withFilter,
  withoutFilter,
  type AnalyticsSearch,
  type AxisId,
  type GroupBy,
  type Measure,
  type PopulationId,
  type Query,
} from './analytics.model'
import {
  COUNTY_POPULATION,
  countyPopulationNote,
  recordsProblem,
  useCounties,
  useCpvDivisions,
  useLocalities,
  useNames,
  useRecords,
  type Answer,
  type Bucket,
  type Facet,
  type Point,
  type Ranking,
  type RecordRow,
} from './analytics.data'
import { QUESTION_GROUPS, QUESTIONS, type Question } from './analytics.questions'
import {
  beforeComparableNote,
  changeText,
  countText,
  degradedNote,
  groupTab,
  headline,
  keyLabel,
  kindSplitNote,
  levelLabel,
  listTotalText,
  measureLabel,
  moneyText,
  monthsText,
  percentText,
  periodGloss,
  periodText,
  populationGloss,
  populationLabel,
  recordsCount,
  residentsText,
  undatedText,
  unknownLabel,
  type Namer,
} from './analytics.text'

/** The analytics page's parts, shared by the layouts: controls, the readout, the figures, the answers, the context, the records. */

const LABEL = 'block text-muted-foreground'
const CHIP = 'inline-flex min-h-9 items-center gap-1.5 border px-2.5 text-sm transition-colors hover:bg-muted/60'

// ───────────────────────────────────────────────────────────────── state ──

/** The query the URL holds, and a way to move to another (pushed: Back undoes a drill). The harness's own keys are kept. */
function useSearchStrings(): AnalyticsSearch {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  return Object.fromEntries(Object.entries(search).map(([key, value]) => [key, typeof value === 'string' || typeof value === 'number' ? String(value) : undefined]))
}

export function useAnalyticsQuery(): readonly [Query, (next: Query) => void, AnalyticsSearch] {
  const strings = useSearchStrings()
  const query = queryOf(strings)
  const navigate = useNavigate()
  const move = (next: Query) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({ ...(previous.v !== undefined ? { v: previous.v } : {}), ...(previous.layout !== undefined ? { layout: previous.layout } : {}), ...searchOf(repaired(next)) }),
    })
  return [query, move, strings] as const
}

/** Whether the URL names any question at all: without one, the page opens with its gallery above the default answer. */
export function hasQuestion(search: AnalyticsSearch): boolean {
  return Object.keys(search).some((key) => key !== 'v' && key !== 'layout' && search[key] !== undefined)
}

/** Names for everything on screen: the filters' values, the answer's keys, the facets' keys. */
export function useNamer(query: Query, answer: Pick<Answer, 'ranking' | 'facets'>, extra: readonly Ranking[] = []): Namer {
  const orgs: string[] = []
  const cpv: string[] = []
  if (query.filters.cumparator) orgs.push(...query.filters.cumparator.values)
  if (query.filters.furnizor) orgs.push(...query.filters.furnizor.values)
  if (query.filters.cpv) cpv.push(...query.filters.cpv.values.map((value) => value.padEnd(8, '0')))
  const collect = (dimension: string, buckets: readonly Bucket[]) => {
    for (const bucket of buckets) {
      if (!bucket.key || bucket.kind !== 'top') continue
      if (dimension === 'authority' || dimension === 'supplier') orgs.push(bucket.key)
      if (dimension.startsWith('cpv')) cpv.push(bucket.key)
    }
  }
  for (const ranking of [answer.ranking.data, ...extra]) if (ranking) collect(ranking.dimension, ranking.buckets)
  for (const facet of answer.facets.data ?? []) collect(facet.dimension, facet.buckets)
  const names = useNames({ orgs, cpv })
  const counties = useCounties()
  const divisions = useCpvDivisions()
  const needLocalities =
    query.filters.loc?.level === 'localitate' ||
    query.filters.loc_firma?.level === 'localitate' ||
    ((query.dupa.axis === 'loc' || query.dupa.axis === 'loc_firma') && query.dupa.level === 'localitate') ||
    (answer.facets.data ?? []).some((facet) => facet.level === 'localitate')
  const localities = useLocalities(needLocalities)
  return useMemo(
    () => ({
      names: names.data,
      divisions: divisions.data ?? new Map<string, string>(),
      counties: new Map((counties.data?.counties ?? []).map((county) => [county.countyCode, formatProcurementCountyName(county.countyName)])),
      localities,
    }),
    [names.data, divisions.data, counties.data, localities],
  )
}

// ────────────────────────────────────────────────────────────── controls ──

export function PopulationToggle({ query, onChange }: { readonly query: Query; readonly onChange: (query: Query) => void }) {
  return (
    <IndicatorToggle<PopulationId>
      label={t`Ce înregistrări`}
      value={query.tip}
      onChange={(tip) => onChange(repaired({ ...query, tip, masura: POPULATIONS[tip].defaultMeasure }))}
      options={(['directe', 'contracte', 'acorduri'] as const).map((key) => ({ key, label: populationLabel(key) }))}
    />
  )
}

function PeriodMenu({ query, answer, onChange }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void }) {
  const [open, setOpen] = useState(false)
  const cutoff = answer.cutoff ? answer.cutoff[POPULATIONS[query.tip].cutoff] : null
  const lastYear = cutoff ? Number(cutoff.slice(0, 4)) : new Date().getFullYear()
  const years = Array.from({ length: lastYear - 2018 }, (_, index) => lastYear - index)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const label = answer.period ? periodText(answer.period, query) : '…'
  const toggle = (next: boolean) => {
    if (next && answer.period) {
      setFrom(answer.period.from)
      setTo(answer.period.to)
    }
    setOpen(next)
  }
  const choose = (period: Query['period']) => {
    setOpen(false)
    onChange({ ...query, period })
  }
  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger className={cn(CHIP, 'font-medium')}>
        {label}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <button type="button" className={cn('flex w-full items-center justify-between px-2 py-1.5 text-left text-sm hover:bg-muted', query.period.kind === 'recent' && 'font-semibold')} onClick={() => choose({ kind: 'recent' })}>
          {t`Ultimele 12 luni`}
          {query.period.kind === 'recent' ? <Check className="size-3.5" aria-hidden="true" /> : null}
        </button>
        <MonoLabel className="mt-2 block px-2 text-muted-foreground">{t`Un an`}</MonoLabel>
        <div className="mt-1 grid grid-cols-4 gap-1 px-1">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => choose({ kind: 'year', year })}
              className={cn('border px-1 py-1 text-sm tabular-nums hover:bg-muted', query.period.kind === 'year' && query.period.year === year && 'border-primary font-semibold')}
            >
              {year}
            </button>
          ))}
        </div>
        <MonoLabel className="mt-3 block px-2 text-muted-foreground">{t`Între două luni`}</MonoLabel>
        <form
          className="mt-1 flex items-center gap-1 px-1"
          onSubmit={(event) => {
            event.preventDefault()
            if (/^\d{4}-\d{2}$/u.test(from) && /^\d{4}-\d{2}$/u.test(to) && from <= to) choose({ kind: 'months', from, to })
          }}
        >
          <input type="month" value={from} min="2016-01" onChange={(event) => setFrom(event.target.value)} aria-label={t`De la`} className="h-9 min-w-0 flex-1 border bg-background px-1 text-sm" />
          <input type="month" value={to} min="2016-01" onChange={(event) => setTo(event.target.value)} aria-label={t`Până la`} className="h-9 min-w-0 flex-1 border bg-background px-1 text-sm" />
          <button type="submit" className="h-9 border px-2 text-sm hover:bg-muted">
            {t`Aplică`}
          </button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

function filterChipLabel(axis: AxisId, level: string, value: string, namer: Namer): string {
  const name = keyLabel(axis, level, axis === 'cpv' ? value.padEnd(8, '0') : value, namer)
  if (axis === 'cumparator') return name
  if (axis === 'furnizor') return name
  if (axis === 'cpv') return name
  if (axis === 'loc') return level === 'judet' ? t`instituții din ${name}` : t`instituții din ${name}`
  if (axis === 'loc_firma') return t`firme din ${name}`
  return name
}

export function FilterChips({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  return (
    <>
      {AXIS_ORDER.map((axis) => {
        const filter = query.filters[axis]
        if (!filter) return null
        const label = filterChipLabel(axis, filter.level, filter.values[0]!, namer)
        return (
          <button key={axis} type="button" className={cn(CHIP, 'max-w-[18rem] border-primary/50 bg-primary/5')} onClick={() => onChange(withoutFilter(query, axis))} aria-label={t`Scoate filtrul ${label}`}>
            <span className="truncate">{label}</span>
            <X className="size-3.5 shrink-0" aria-hidden="true" />
          </button>
        )
      })}
      {query.titlu ? (
        <button type="button" className={cn(CHIP, 'border-primary/50 bg-primary/5')} onClick={() => onChange({ ...query, titlu: null })}>
          {t`titlu: „${query.titlu}"`}
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
      {query.valoare ? (
        <button type="button" className={cn(CHIP, 'border-primary/50 bg-primary/5')} onClick={() => onChange({ ...query, valoare: null })}>
          {query.valoare.min != null && query.valoare.max != null
            ? t`${moneyText(query.valoare.min)}–${moneyText(query.valoare.max)}`
            : query.valoare.min != null
              ? t`≥ ${moneyText(query.valoare.min)}`
              : t`≤ ${moneyText(query.valoare.max ?? 0)}`}
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </>
  )
}

const resolveSchema = z.object({ procurementResolve: z.array(z.object({ value: z.string(), label: z.string() })) })

function useCpvSearch(term: string) {
  const trimmed = term.trim()
  return useQuery({
    queryKey: ['prototype', 'analytics', 'cpv-search', trimmed],
    queryFn: async ({ signal }) => {
      const raw = await graphqlQuery<unknown>(`query AnalyticsCpvSearch($q: String!) { procurementResolve(dim: cpv, q: $q, limit: 8) { value label } }`, { q: trimmed }, { operationName: 'AnalyticsCpvSearch', signal })
      return resolveSchema.parse(raw).procurementResolve
    },
    enabled: trimmed.length >= 3,
    staleTime: 60 * 60 * 1000,
  })
}

/** „Procedures" a contract row carries, by SEAP's own words (the scope takes them as they are). */
const PROCEDURES = [
  'Licitatie deschisa',
  'Procedura simplificata',
  'Negociere fara publicare prealabila',
  'Norme proprii (Anexa 2)',
  'Licitatie restransa',
  'Procedura competitiva cu negociere',
  'Licitatie deschisa accelerata',
]

/**
 * „+ Filtru": one box over institutions and firms (the site's search),
 * categories (the CPV names), counties, procedures — and, for what a name
 * cannot find, a title's words and a value.
 */
export function AddFilter({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  const [open, setOpen] = useState(false)
  const search = useSearchResults({ docTypes: ['organization', 'public_enterprise', 'company'], suggestions: false })
  const cpv = useCpvSearch(search.term)
  const term = search.term.trim().toLocaleLowerCase('ro-RO')
  const counties = [...namer.counties.entries()].filter(([code, name]) => term.length >= 2 && (name.toLocaleLowerCase('ro-RO').includes(term) || code.toLocaleLowerCase('ro-RO') === term)).slice(0, 4)
  const procedures = POPULATIONS[query.tip].grain === 'contract' ? PROCEDURES.filter((key) => term.length >= 2 && keyLabel('procedura', 'tip', key, namer).toLocaleLowerCase('ro-RO').includes(term)) : []
  const number = Number(search.term.replace(/[.\s]/gu, '').replace(',', '.'))
  const pick = (next: Query) => {
    setOpen(false)
    search.reset()
    onChange(next)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(CHIP, 'text-muted-foreground')}>
        <Plus className="size-3.5" aria-hidden="true" />
        {t`Filtru`}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] p-0">
        <Command shouldFilter={false}>
          <CommandInput value={search.term} onValueChange={search.setTerm} placeholder={t`Instituție, firmă, categorie, județ…`} />
          <CommandList className="max-h-[60vh]">
            {term.length < 2 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">{t`Scrie un nume, un CUI, o categorie („medicamente", „drumuri") sau un județ.`}</p>
            ) : (
              <CommandEmpty>{t`Nimic găsit.`}</CommandEmpty>
            )}
            {search.results.length > 0 ? (
              <CommandGroup heading={t`Instituții și firme`}>
                {search.results.slice(0, 6).map((hit) => {
                  const href = procurementHrefOf(hit)
                  const cui = href?.split('/').pop()
                  if (!href || !cui) return null
                  const supplier = href.includes('/suppliers/')
                  return (
                    <CommandItem key={hit.id} value={`org-${hit.id}`} onSelect={() => pick(withFilter(query, supplier ? 'furnizor' : 'cumparator', 'cui', cui))}>
                      <span className="min-w-0 flex-1 truncate">{hit.title}</span>
                      <MonoLabel className="text-muted-foreground">{supplier ? t`firmă` : t`instituție`}</MonoLabel>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ) : null}
            {(cpv.data ?? []).length > 0 ? (
              <CommandGroup heading={t`Categorii`}>
                {(cpv.data ?? []).map((hit) => {
                  const prefix = hit.value.replace(/0+$/u, '')
                  const level = cpvLevelOf(prefix.length < 2 ? hit.value.slice(0, 2) : prefix.length === 6 || prefix.length === 7 ? hit.value : prefix)
                  if (!level) return null
                  const value = level.id === 'cod' ? hit.value : prefix.length < 2 ? hit.value.slice(0, 2) : prefix
                  return (
                    <CommandItem key={hit.value} value={`cpv-${hit.value}`} onSelect={() => pick(withFilter(query, 'cpv', level.id, value))}>
                      <span className="min-w-0 flex-1 truncate">{hit.label}</span>
                      <MonoLabel className="tabular-nums text-muted-foreground">{hit.value}</MonoLabel>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ) : null}
            {counties.length > 0 ? (
              <CommandGroup heading={t`Județe`}>
                {counties.map(([code, name]) => (
                  <CommandItem key={`buyer-${code}`} value={`buyer-${code}`} onSelect={() => pick(withFilter(query, 'loc', 'judet', code))}>
                    {t`Instituții din ${name}`}
                  </CommandItem>
                ))}
                {counties.map(([code, name]) => (
                  <CommandItem key={`firm-${code}`} value={`firm-${code}`} onSelect={() => pick(withFilter(query, 'loc_firma', 'judet', code))}>
                    {t`Firme din ${name}`}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {procedures.length > 0 ? (
              <CommandGroup heading={t`Proceduri`}>
                {procedures.map((key) => (
                  <CommandItem key={key} value={`proc-${key}`} onSelect={() => pick(withFilter(query, 'procedura', 'tip', key))}>
                    {keyLabel('procedura', 'tip', key, namer)}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {term.length >= 3 ? (
              <CommandGroup heading={t`Altfel`}>
                <CommandItem value="title" onSelect={() => pick({ ...query, titlu: search.term.trim() })}>
                  <Search className="size-3.5" aria-hidden="true" />
                  {t`Titlul conține „${search.term.trim()}"`}
                </CommandItem>
                {Number.isFinite(number) && number > 0 ? (
                  <>
                    <CommandItem value="min" onSelect={() => pick({ ...query, valoare: { min: number, max: query.valoare?.max ?? null } })}>
                      {t`Valoare de cel puțin ${moneyText(number)}`}
                    </CommandItem>
                    <CommandItem value="max" onSelect={() => pick({ ...query, valoare: { min: query.valoare?.min ?? null, max: number } })}>
                      {t`Valoare de cel mult ${moneyText(number)}`}
                    </CommandItem>
                  </>
                ) : null}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** The ready questions, as a menu once the reader has one of their own. */
export function QuestionsMenu({ onChange }: { readonly onChange: (query: Query) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(CHIP)}>
        {t`Întrebări`}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-[min(92vw,30rem)] overflow-y-auto p-3">
        <QuestionList
          onPick={(question) => {
            setOpen(false)
            onChange(question.query)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

/** Copies the address with the period written out: a link a journalist cites must not move with the next month. */
export function ShareButton({ query, answer }: { readonly query: Query; readonly answer: Answer }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    // The last twelve months and a year in progress move with the next month; the link carries the months they are today.
    const moving = query.period.kind === 'recent' || (query.period.kind === 'year' && answer.period !== null && !answer.period.to.endsWith('-12'))
    const period = answer.period && moving ? { kind: 'months' as const, from: answer.period.from, to: answer.period.to } : query.period
    const current = new URLSearchParams(window.location.search)
    const params = new URLSearchParams(
      [...['v', 'layout'].flatMap((key) => (current.get(key) ? [[key, current.get(key)!] as [string, string]] : [])), ...Object.entries(searchOf({ ...query, period }))].filter((entry): entry is [string, string] => entry[1] !== undefined),
    )
    const url = `${window.location.origin}${window.location.pathname}${params.size > 0 ? `?${params.toString()}` : ''}`
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button type="button" onClick={copy} className={cn(CHIP)}>
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Link2 className="size-3.5" aria-hidden="true" />}
      {copied ? t`Copiat` : t`Link`}
    </button>
  )
}

/** The one row of controls: what records, when, the filters, a new filter, the questions, the link. */
export function ControlRow({ query, answer, namer, onChange, className }: { readonly query: Query; readonly answer: Answer; readonly namer: Namer; readonly onChange: (query: Query) => void; readonly className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <PopulationToggle query={query} onChange={onChange} />
      <div className="flex flex-wrap items-center gap-2">
        <PeriodMenu query={query} answer={answer} onChange={onChange} />
        <FilterChips query={query} namer={namer} onChange={onChange} />
        <AddFilter query={query} namer={namer} onChange={onChange} />
        <span className="ml-auto flex items-center gap-2">
          <QuestionsMenu onChange={onChange} />
          <ShareButton query={query} answer={answer} />
        </span>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────── readout ──

/** The query as one sentence (generated, never edited), its months, what the records are, and the question's own warning. */
const NOTE = 'mt-2 max-w-[70ch] border-l-2 border-amber-600/60 pl-3 text-sm text-foreground'

/**
 * The query as one sentence (generated, never edited), its months, what the
 * records are — then what the reader must know before the figures: what the
 * address held that the page could not use, a window the population does not
 * compare across, the API's own partial verdict, the question's warning.
 */
export function Readout({ query, answer, namer, withGroup = true }: { readonly query: Query; readonly answer: Answer; readonly namer: Namer; readonly withGroup?: boolean }) {
  const unread = unreadParams(useSearchStrings())
  const population = POPULATIONS[query.tip]
  // A question's warning belongs to its own address, never to a default an unread address fell back to.
  const question = unread.length === 0 ? QUESTIONS.find((item) => JSON.stringify(searchOf(item.query)) === JSON.stringify(searchOf(query))) : undefined
  const split = population.kindSplitUntil
  const now = answer.figures.data?.now ?? null
  return (
    <div>
      <h1 className="max-w-4xl text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">{headline(query, namer, withGroup)}</h1>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {answer.period ? <span className="font-medium text-foreground">{periodText(answer.period, query)}</span> : null}
        {answer.period ? <span>{periodGloss(answer.period, query, answer.cutoff?.failed ?? false)}</span> : null}
      </p>
      <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{populationGloss(query.tip)}</p>
      {unread.length > 0 ? (
        <p className={NOTE}>
          {t`Din adresă n-am putut folosi: ${unread.map((item) => `${item.param}=${item.value}`).join(', ')}. Răspunsul de mai jos nu ține seama de ele.`}
        </p>
      ) : null}
      {answer.period && answer.period.from < `${population.comparableFrom}-01` ? <p className={NOTE}>{beforeComparableNote(query.tip)}</p> : null}
      {split && answer.period && answer.period.to > split ? <p className={NOTE}>{kindSplitNote(query.tip)}</p> : null}
      {now?.answerability === 'degraded' ? <p className={NOTE}>{degradedNote(now.undated, now.undatedMoney)}</p> : null}
      {now?.answerability === 'abstained' ? <p className={NOTE}>{t`Sursa nu răspunde pentru această selecție: cifrele lipsesc, nu sunt zero.`}</p> : null}
      {question?.trap ? <p className={NOTE}>{i18n._(question.trap)}</p> : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────── figures ──

function Figure({ label, value, change, note, muted }: { readonly label: string; readonly value: string; readonly change?: string | null; readonly note?: ReactNode; readonly muted?: boolean }) {
  return (
    <div className="min-w-0 border-t pt-3">
      <MonoLabel className={LABEL}>{label}</MonoLabel>
      <p className={cn('mt-2 flex flex-wrap items-baseline gap-x-2 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl', muted ? 'text-muted-foreground' : 'text-foreground')}>
        <span>{value}</span>
        {change ? <span className="text-sm font-normal text-muted-foreground">{change}</span> : null}
      </p>
      {note ? <p className="mt-1 text-xs leading-snug text-muted-foreground">{note}</p> : null}
    </div>
  )
}

/**
 * Four figures, each with its change against the same number of months
 * before: the records; the money (said for what it is — clean, provisional,
 * or not a spend at all); the firms; the top five's share.
 */
export function FiguresBand({ query, answer, className }: { readonly query: Query; readonly answer: Answer; readonly className?: string }) {
  const now = answer.figures.data?.now ?? null
  const before = answer.figures.data?.before ?? null
  const population = POPULATIONS[query.tip]
  if (answer.figures.isError) return (
      <div className={className}>
        <HubLoadError onRetry={answer.figures.retry} />
      </div>
    )
  if (!now) return <HubPending className={className} rows={2} />
  const previousNote = before && answer.period ? t`față de ${monthsText(answer.period.previous)}` : null
  const coverage = now.records > 0 ? now.valued / now.records : null
  const concentration = answer.concentration.data
  const byValue = query.masura !== 'numar' && population.money !== 'none'
  // A firm's contracts leave out the ones it won in an association: SEAP gives the association's value, not the firm's part.
  const firmContracts = population.grain === 'contract' && Boolean(query.filters.furnizor)
  const rowsNote = firmContracts ? t`fără contractele câștigate în asociere` : t`rânduri SEAP: o asociere are un rând pe firmă`
  return (
    <div className={cn('grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4', className)}>
      <Figure label={population.id === 'directe' ? t`Achiziții` : population.id === 'contracte' ? t`Contracte atribuite` : t`Acorduri-cadru`} value={countText(now.records)} change={changeText(now.records, before?.records ?? null)} note={population.id === 'directe' ? previousNote : rowsNote} />
      {population.money === 'clean' ? (
        <Figure label={t`Valoare, fără TVA`} value={now.money !== null ? moneyText(now.money) : '—'} change={changeText(now.money, before?.money ?? null)} note={now.average !== null ? t`în medie ${moneyText(now.average)} pe achiziție` : null} />
      ) : population.money === 'provisional' ? (
        <Figure
          label={t`Valoare publicată, provizoriu`}
          value={now.money !== null ? moneyText(now.money) : '—'}
          muted
          note={
            firmContracts
              ? t`fără banii asocierilor, pe care SEAP nu-i împarte pe firme; include plafoane de acorduri-cadru`
              : coverage !== null
                ? t`bani publicați pentru ${percentText(coverage, 0)} din rânduri; include plafoane de acorduri-cadru și contracte subsecvente`
                : null
          }
        />
      ) : (
        <Figure label={t`Valoare`} value="—" muted note={t`Un acord-cadru fixează cât se poate cheltui, cel mult: nu e o cheltuială.`} />
      )}
      {concentration && concentration.firms !== null ? (
        <Figure label={t`Firme`} value={countText(concentration.firms)} note={t`care au vândut în această selecție`} />
      ) : (
        <Figure label={t`Firme`} value={query.filters.furnizor ? '1' : '—'} muted note={query.filters.furnizor ? t`firma aleasă` : null} />
      )}
      {concentration && concentration.top5 !== null ? (
        <Figure label={!byValue ? t`Primele 5 firme, din rânduri` : population.money === 'provisional' ? t`Primele 5 firme, din lei provizorii` : t`Primele 5 firme, din bani`} value={percentText(concentration.top5, 0)} note={concentration.top1 !== null ? t`prima: ${percentText(concentration.top1, 1)}` : null} />
      ) : (
        <Figure label={t`Primele 5 firme`} value="—" muted note={query.filters.furnizor ? t`nu are sens pentru o singură firmă` : null} />
      )}
    </div>
  )
}


// ────────────────────────────────────────────────────── group-by and measure ──

const TABS: readonly { readonly axis: AxisId | 'timp'; readonly levels: readonly { readonly id: string }[] }[] = [
  { axis: 'cumparator', levels: [{ id: 'cui' }] },
  { axis: 'furnizor', levels: [{ id: 'cui' }] },
  {
    axis: 'cpv',
    levels: [
      { id: 'diviziune' },
      { id: 'grup' },
      { id: 'clasa' },
      { id: 'categorie' },
      { id: 'cod' },
    ],
  },
  { axis: 'loc', levels: [{ id: 'judet' }, { id: 'localitate' }, { id: 'regiune' }] },
  { axis: 'loc_firma', levels: [{ id: 'judet' }, { id: 'localitate' }, { id: 'regiune' }] },
  { axis: 'procedura', levels: [{ id: 'tip' }] },
  { axis: 'timp', levels: [{ id: 'year' }, { id: 'quarter' }, { id: 'month' }] },
]

function groupOf(axis: AxisId | 'timp', level: string): GroupBy {
  return axis === 'timp' ? { axis, bucket: level as 'year' | 'quarter' | 'month' } : { axis, level }
}

/** „După": the axis the answer ranks by, its level where it has several, and the measure. */
export function GroupBar({ query, onChange, className }: { readonly query: Query; readonly onChange: (query: Query) => void; readonly className?: string }) {
  const current = query.dupa
  const currentLevel = current.axis === 'timp' ? current.bucket : current.level
  const tab = TABS.find((item) => item.axis === current.axis)
  const measures: Measure[] = POPULATIONS[query.tip].money === 'none' ? ['numar'] : ['numar', 'lei']
  if (perResidentAllowed(current)) measures.push('locuitor')
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" aria-label={t`După ce`} className="flex flex-wrap gap-x-4 gap-y-1 border-b">
          {TABS.map((item) => {
            const firstReadable = item.levels.find((level) => groupProblem(query, groupOf(item.axis, level.id)) === null)
            if (!firstReadable) return null
            const active = item.axis === current.axis
            return (
              <button
                key={item.axis}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange({ ...query, dupa: groupOf(item.axis, firstReadable.id) })}
                className={cn('-mb-px border-b-2 px-0.5 pb-2 text-sm', active ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
              >
                {groupTab(item.axis)}
              </button>
            )
          })}
        </div>
        <IndicatorToggle<Measure>
          label={t`Măsura`}
          value={query.masura}
          onChange={(masura) => onChange({ ...query, masura })}
          options={measures.map((key) => ({ key, label: measureLabel(key, query.tip) }))}
        />
      </div>
      {tab && tab.levels.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <MonoLabel className="text-muted-foreground">{t`pe`}</MonoLabel>
          {tab.levels.map((level) => {
            const group = groupOf(tab.axis, level.id)
            const disabled = groupProblem(query, group) !== null
            return (
              <button
                key={level.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...query, dupa: group })}
                className={cn('border px-2 py-0.5 disabled:opacity-40', level.id === currentLevel ? 'border-primary font-semibold' : 'hover:bg-muted')}
              >
                {levelLabel(level.id)}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

// ──────────────────────────────────────────────────────── ranked answer ──

interface Row {
  readonly key: string | null
  readonly kind: 'top' | 'other' | 'unknown' | 'withheld'
  readonly label: string
  readonly sub: string | null
  /** What the row is ranked and drawn by. */
  readonly figure: number | null
  readonly figureText: string
  readonly share: number | null
  readonly secondary: string | null
}

function rowsOf(query: Query, ranking: Ranking, namer: Namer): { readonly rows: readonly Row[]; readonly total: number | null } {
  const group = query.dupa as { axis: AxisId; level: string }
  const perResident = query.masura === 'locuitor'
  const byValue = ranking.rankedBy === 'value'
  const population = POPULATIONS[query.tip]
  const buckets = ranking.buckets
  const total = buckets.reduce((sum, bucket) => sum + (byValue ? (bucket.money ?? 0) : bucket.count), 0) + (byValue ? (ranking.withheld ?? 0) : 0)
  const moneyOf = (value: number | null) => (value === null ? '—' : moneyText(value))
  const rows: Row[] = buckets
    // An empty „Restul" or unknown bucket is no row: nothing is left out.
    .filter((bucket) => bucket.kind === 'top' || bucket.count > 0)
    .map((bucket) => {
      const label = bucket.kind === 'other' ? t`Restul` : bucket.kind === 'unknown' ? unknownLabel(group.axis) : keyLabel(group.axis, group.level, bucket.key ?? '', namer)
      const sub = bucket.kind !== 'top' || !bucket.key ? null : group.axis === 'cumparator' || group.axis === 'furnizor' ? `CUI ${bucket.key}` : group.axis === 'cpv' ? `CPV ${cpvPrefix(bucket.key, group.level)}` : null
      if (perResident && !bucket.key) {
        // No county, so no residents: the total, said as a total, never beside the rates.
        const total = population.money === 'clean' ? bucket.money : bucket.count
        return { key: null, kind: bucket.kind, label, sub: null, figure: null, figureText: '—', share: null, secondary: total === null ? null : population.money === 'clean' ? t`${moneyText(total)} în total` : t`${countText(total)} în total` }
      }
      if (perResident && bucket.key) {
        const residents = COUNTY_POPULATION.get(bucket.key) ?? null
        const base = population.money === 'clean' ? bucket.money : bucket.count
        const rate = residents && base !== null ? (population.money === 'clean' ? base / residents : (base / residents) * 100_000) : null
        return {
          key: bucket.key,
          kind: bucket.kind,
          label,
          sub: residents ? residentsText(residents) : null,
          figure: rate,
          figureText: rate === null ? '—' : population.money === 'clean' ? `${countText(Math.round(rate))} lei` : countText(Math.round(rate)),
          share: null,
          secondary: population.money === 'clean' ? moneyOf(bucket.money) : countText(bucket.count),
        }
      }
      const figure = byValue ? bucket.money : bucket.count
      return {
        key: bucket.key,
        kind: bucket.kind,
        label,
        sub,
        figure,
        figureText: byValue ? moneyOf(bucket.money) : countText(bucket.count),
        share: total > 0 && figure !== null ? figure / total : null,
        // Contract money is shown only when asked for (and marked); beside a count it would read as a total.
        secondary: byValue ? recordsCount(query.tip, bucket.count) : population.money === 'clean' && bucket.money !== null ? moneyOf(bucket.money) : null,
      }
    })
  // Contract money SEAP publishes per consortium belongs to no member (nor to a member's county): its own row, sized, so the list adds up and the gap shows.
  if (byValue && ranking.withheld && ranking.withheld > 0) {
    rows.push({ key: null, kind: 'withheld', label: t`În asociere — neîmpărțit pe firme`, sub: t`SEAP publică valoarea întregii asocieri, nu partea fiecărei firme`, figure: ranking.withheld, figureText: moneyOf(ranking.withheld), share: total > 0 ? ranking.withheld / total : null, secondary: null })
  }
  const top = rows.filter((row) => row.kind === 'top')
  const rest = rows.filter((row) => row.kind !== 'top')
  if (perResident) top.sort((a, b) => (b.figure ?? -1) - (a.figure ?? -1))
  return { rows: [...top, ...rest.sort((a, b) => (b.figure ?? 0) - (a.figure ?? 0))], total }
}

function profileLink(axis: AxisId, key: string): { readonly to: string; readonly params: Record<string, string> } | null {
  if (axis === 'cumparator') return { to: '/procurement/institutions/$cui', params: { cui: key } }
  if (axis === 'furnizor') return { to: '/procurement/suppliers/$cui', params: { cui: key } }
  return null
}

/**
 * The page's answer: the ranked list. A row's click narrows to it and ranks
 * by the next axis (an institution → its firms); its profile is the arrow
 * beside it. „Restul" and the unknown rows make the list add up and are not
 * clicked.
 */
export function RankedAnswer({
  query,
  answer,
  namer,
  onChange,
  expanded,
  onExpand,
  className,
}: {
  readonly query: Query
  readonly answer: Answer
  readonly namer: Namer
  readonly onChange: (query: Query) => void
  readonly expanded: boolean
  readonly onExpand: (expanded: boolean) => void
  readonly className?: string
}) {
  const ranking = answer.ranking.data
  if (query.dupa.axis === 'timp') return null
  if (answer.ranking.isError) return (
      <div className={className}>
        <HubLoadError onRetry={answer.ranking.retry} />
      </div>
    )
  if (!ranking) return <HubPending className={className} rows={10} />
  const { rows } = rowsOf(query, ranking, namer)
  const group = query.dupa
  const max = Math.max(1, ...rows.filter((row) => row.kind === 'top' || row.kind === 'withheld').map((row) => row.figure ?? 0))
  const topCount = ranking.buckets.filter((bucket) => bucket.kind === 'top').length
  return (
    <div className={cn(className, answer.ranking.isFetching && 'opacity-70 transition-opacity')}>
      {rows.length === 0 ? <p className="py-6 text-sm text-muted-foreground">{t`Nicio înregistrare în această selecție.`}</p> : null}
      <ol className="divide-y divide-border/70 border-y border-border/70">
        {rows.map((row, index) => {
          const drillable = row.kind === 'top' && row.key !== null
          const link = drillable ? profileLink(group.axis, row.key!) : null
          const body = (
            <>
              <span className="w-7 shrink-0 pt-0.5 text-right font-mono text-xs tabular-nums text-muted-foreground">{row.kind === 'top' ? index + 1 : ''}</span>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm', row.kind === 'top' ? 'text-foreground' : 'text-muted-foreground')}>{row.label}</span>
                <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {row.sub ? <span className="font-mono tabular-nums">{row.sub}</span> : null}
                  {row.secondary ? <span>{row.secondary}</span> : null}
                </span>
                {row.kind === 'top' || row.kind === 'withheld' ? (
                  <span className="mt-1.5 block h-1 bg-muted" aria-hidden="true">
                    <span className={cn('block h-1', row.kind === 'withheld' ? 'bg-muted-foreground/40' : 'bg-primary/70')} style={{ width: `${Math.max(((row.figure ?? 0) / max) * 100, 0.5).toFixed(1)}%` }} />
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-right">
                <span className={cn('block text-sm tabular-nums', row.kind === 'top' ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{row.figureText}</span>
                {row.share !== null ? <span className="block text-xs tabular-nums text-muted-foreground">{percentText(row.share, row.share < 0.1 ? 1 : 0)}</span> : null}
              </span>
            </>
          )
          return (
            <li key={`${row.kind}-${row.key ?? index}`} className="flex items-stretch">
              {drillable ? (
                <button type="button" onClick={() => onChange(drilled(query, group, row.key!))} className="flex min-w-0 flex-1 items-start gap-3 py-2.5 pr-2 text-left transition-colors hover:bg-muted/50" title={t`Restrânge la „${row.label}"`}>
                  {body}
                </button>
              ) : (
                <div className="flex min-w-0 flex-1 items-start gap-3 py-2.5 pr-2">{body}</div>
              )}
              {link ? (
                <Link to={link.to} params={link.params} className="flex w-9 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={t`Pagina ${row.label}`}>
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <span className="w-9 shrink-0" />
              )}
            </li>
          )
        })}
      </ol>
      {query.masura === 'locuitor' ? <p className="mt-2 text-xs text-muted-foreground">{t`Împărțit la populația județului (${countyPopulationNote()}). Instituțiile centrale au sediul în București.`}</p> : null}
      {!expanded && topCount >= 25 && query.masura !== 'locuitor' ? (
        <button type="button" onClick={() => onExpand(true)} className="mt-3 text-sm font-medium underline-offset-4 hover:underline">
          {t`Arată primele 100`}
        </button>
      ) : null}
    </div>
  )
}

// ────────────────────────────────────────────────────────── time answer ──

/** What of a bucket a window holds, when not all of it: „(din iunie)", „(până în mai)", „(iunie–august)". */
function clippedText(bucket: string, window: { readonly from: string; readonly to: string } | null): string | null {
  const clipped = window ? clippedBucket(bucket, window) : null
  if (!clipped) return null
  const month = (value: string) => monthText(value).split(' ')[0]
  if (clipped.from && clipped.to) return t`(${month(clipped.from)}–${month(clipped.to)})`
  if (clipped.from) return t`(din ${month(clipped.from)})`
  return t`(până în ${month(clipped.to!)})`
}

function bucketLabel(bucket: string): string {
  if (/^\d{4}$/u.test(bucket)) return bucket
  if (/^\d{4}-Q[1-4]$/u.test(bucket)) return bucket.replace('-Q', ' T')
  return monthText(bucket)
}

/** The answer in time: bars by year, quarter or month, a click opening the bucket. */
export function TimeAnswer({ query, answer, onChange, className }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void; readonly className?: string }) {
  const [active, setActive] = useState<string | null>(null)
  if (query.dupa.axis !== 'timp') return null
  if (answer.series.isError) return (
      <div className={className}>
        <HubLoadError onRetry={answer.series.retry} />
      </div>
    )
  const points = answer.series.data
  if (!points) return <HubPending className={className} rows={6} />
  const byValue = query.masura !== 'numar' && POPULATIONS[query.tip].money !== 'none'
  const figure = (point: Point) => (byValue ? point.money : point.count) ?? 0
  const max = Math.max(1, ...points.map(figure))
  const shown = points.find((point) => point.bucket === active) ?? points[points.length - 1]
  const group = query.dupa
  const population = POPULATIONS[query.tip]
  const split = population.kindSplitUntil
  const mixed = (bucket: string) => split !== undefined && bucketStart(bucket) > split
  const cut = (bucket: string) => answer.period !== null && clippedBucket(bucket, answer.period) !== null
  return (
    <figure className={className}>
      <p className="min-h-6 text-sm text-muted-foreground">
        {shown ? (
          <>
            <span className="font-semibold text-foreground">
              {bucketLabel(shown.bucket)}
              {clippedText(shown.bucket, answer.period) ? ` ${clippedText(shown.bucket, answer.period)}` : ''}
              {mixed(shown.bucket) ? ` ${t`(fără deosebirea acordurilor-cadru)`}` : ''}
            </span>{' '}
            · {recordsCount(query.tip, shown.count ?? 0)}
            {/* Contract money only when asked for, and said provisional: beside a count it would read as spend. */}
            {shown.money !== null && (population.money === 'clean' || (population.money === 'provisional' && byValue)) ? ` · ${moneyText(shown.money)}${population.money === 'provisional' ? ` ${t`(provizoriu)`}` : ''}` : ''}
          </>
        ) : (
          t`Nicio înregistrare în această selecție.`
        )}
      </p>
      <ol className="mt-3 flex h-48 items-end gap-1" onPointerLeave={() => setActive(null)}>
        {points.map((point) => (
          <li key={point.bucket} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <button
              type="button"
              onPointerEnter={() => setActive(point.bucket)}
              onFocus={() => setActive(point.bucket)}
              onClick={() => onChange(drilled(query, group, point.bucket))}
              className="flex h-full w-full flex-col justify-end"
              aria-label={`${bucketLabel(point.bucket)}: ${byValue ? moneyText(point.money ?? 0) : countText(point.count ?? 0)}`}
            >
              <span
                className={cn('block w-full', active === point.bucket ? 'bg-primary' : 'bg-primary/70', (cut(point.bucket) || mixed(point.bucket)) && 'bg-primary/35 outline-dashed outline-1 outline-offset-1 outline-primary')}
                style={{ height: `${Math.max((figure(point) / max) * 100, 1)}%` }}
              />
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground" aria-hidden="true">
        <span>{points[0] ? bucketLabel(points[0].bucket) : ''}</span>
        <span>{points.length > 1 ? bucketLabel(points[points.length - 1]!.bucket) : ''}</span>
      </div>
      {points.some((point) => cut(point.bucket)) ? <figcaption className="mt-2 text-xs text-muted-foreground">{t`Punctat: o perioadă pe care intervalul ales o cuprinde doar în parte.`}</figcaption> : null}
      {points.some((point) => mixed(point.bucket)) ? <figcaption className="mt-2 text-xs text-muted-foreground">{t`Punctat: ${kindSplitNote(query.tip)}`}</figcaption> : null}
      {population.grain === 'contract' && group.axis === 'timp' && group.bucket !== 'month' ? <figcaption className="mt-2 text-xs text-muted-foreground">{t`Sursele contractelor acoperă diferit fiecare an: o diferență între ani nu măsoară doar cumpărăturile.`}</figcaption> : null}
      {POPULATIONS[query.tip].money === 'provisional' && byValue ? <figcaption className="mt-2 text-xs text-muted-foreground">{t`Lei publicați, provizoriu: includ plafoane de acorduri-cadru și contracte subsecvente.`}</figcaption> : null}
    </figure>
  )
}

// ─────────────────────────────────────────────────────── the selection ──

/** „În această selecție": the top three of the other axes, each a click to narrow — where to go next, without a form. */
export function SelectionFacets({ query, answer, namer, onChange, className }: { readonly query: Query; readonly answer: Answer; readonly namer: Namer; readonly onChange: (query: Query) => void; readonly className?: string }) {
  const facets = answer.facets.data
  if (!facets || facets.length === 0) return null
  const byValue = query.masura !== 'numar' && POPULATIONS[query.tip].money !== 'none'
  return (
    <div className={cn('grid gap-4 sm:grid-cols-3', className)}>
      {facets.map((facet: Facet) => (
        <div key={facet.dimension} className="min-w-0">
          <MonoLabel className={LABEL}>{groupTab(facet.axis)}</MonoLabel>
          <ul className="mt-2 space-y-1">
            {facet.buckets
              .filter((bucket) => bucket.kind === 'top' && bucket.key)
              .map((bucket) => {
                const label = keyLabel(facet.axis, facet.level, bucket.key!, namer)
                const value = facet.axis === 'cpv' ? cpvPrefix(bucket.key!, facet.level) : bucket.key!
                return (
                  <li key={bucket.key}>
                    <button type="button" onClick={() => onChange(withFilter(query, facet.axis, facet.level, value))} className="flex w-full items-baseline justify-between gap-2 text-left text-sm hover:text-primary">
                      <span className="min-w-0 truncate">{label}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{bucket.share !== null ? percentText(bucket.share, bucket.share < 0.1 ? 1 : 0) : byValue ? moneyText(bucket.money ?? 0) : countText(bucket.count)}</span>
                    </button>
                  </li>
                )
              })}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** The selection's years since 2019, the period's marked; a click takes the year. */
export function YearsStrip({ query, answer, onChange, className }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void; readonly className?: string }) {
  const points = answer.years.data
  // Ranked by years already, the answer is this strip.
  if (!points || points.length === 0 || (query.dupa.axis === 'timp' && query.dupa.bucket === 'year')) return null
  const byValue = query.masura !== 'numar' && POPULATIONS[query.tip].money !== 'none'
  const figure = (point: Point) => (byValue ? point.money : point.count) ?? 0
  const max = Math.max(1, ...points.map(figure))
  const population = POPULATIONS[query.tip]
  const cutoff = answer.cutoff?.[population.cutoff] ?? null
  const split = population.kindSplitUntil
  const inYear = (year: string) => answer.period !== null && answer.period.from.slice(0, 4) <= year && answer.period.to.slice(0, 4) >= year
  const anyMixed = split !== undefined && points.some((point) => bucketStart(point.bucket) > split)
  return (
    <figure className={className}>
      <MonoLabel className={LABEL}>{!byValue ? t`Selecția, pe ani` : population.money === 'provisional' ? t`Selecția, pe ani, lei provizorii` : t`Selecția, pe ani, lei`}</MonoLabel>
      <ol className="mt-3 flex h-20 items-end gap-1.5">
        {points.map((point) => {
          const filling = cutoff !== null && point.bucket === cutoff.slice(0, 4) && !cutoff.endsWith('-12') ? monthText(cutoff).split(' ')[0] : null
          const mixed = split !== undefined && bucketStart(point.bucket) > split
          return (
            <li key={point.bucket} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <button
                type="button"
                onClick={() => onChange({ ...query, period: { kind: 'year', year: Number(point.bucket) } })}
                className="flex h-full w-full flex-col justify-end"
                aria-label={`${point.bucket}${filling ? ` (${t`până în ${filling}`})` : ''}${mixed ? ` ${t`(fără deosebirea acordurilor-cadru)`}` : ''}: ${byValue ? moneyText(point.money ?? 0) : countText(point.count ?? 0)}`}
              >
                <span
                  className={cn('block w-full', inYear(point.bucket) ? 'bg-primary' : 'bg-primary/35', (filling !== null || mixed) && 'outline-dashed outline-1 outline-offset-1 outline-primary')}
                  style={{ height: `${Math.max((figure(point) / max) * 100, 2)}%` }}
                />
              </button>
            </li>
          )
        })}
      </ol>
      <div className="mt-1 flex gap-1.5" aria-hidden="true">
        {points.map((point) => (
          <MonoLabel key={point.bucket} className="min-w-0 flex-1 text-center tabular-nums text-muted-foreground">{`'${point.bucket.slice(2)}`}</MonoLabel>
        ))}
      </div>
      {anyMixed ? <figcaption className="mt-2 text-xs text-muted-foreground">{t`Punctat: ${kindSplitNote(query.tip)}`}</figcaption> : null}
    </figure>
  )
}

// ─────────────────────────────────────────────────────────────── records ──

/** Several rows of one contract (a consortium's members, each at the whole value) as one. */
function groupedRows(rows: readonly RecordRow[]): readonly (RecordRow & { readonly suppliers: readonly string[] })[] {
  const groups = new Map<string, RecordRow & { suppliers: string[] }>()
  for (const row of rows) {
    const key = row.contractNo ? `${row.authority.cui}|${row.contractNo}|${row.value}` : row.id
    const found = groups.get(key)
    const name = row.supplier.name ?? '—'
    if (found) found.suppliers.push(name)
    else groups.set(key, { ...row, suppliers: [name] })
  }
  return [...groups.values()]
}

/**
 * The records behind the answer, on request: the lists are slow on the dev
 * API, so they are read only when asked (or when a party is fixed and the
 * list is small), under their own deadline, with their own count.
 */
export function RecordsBlock({ query, answer, className }: { readonly query: Query; readonly answer: Answer; readonly className?: string }) {
  const party = Boolean(query.filters.cumparator || query.filters.furnizor)
  const [asked, setAsked] = useState(false)
  // A framework has no value to rank by (a ceiling at most): its records open newest first, with no choice.
  const valued = POPULATIONS[query.tip].money !== 'none'
  const [sort, setSort] = useState<'value_desc' | 'date_desc'>(valued ? 'value_desc' : 'date_desc')
  const problem = recordsProblem(query, answer.period)
  const records = useRecords(query, answer.period, sort, 1, asked || party)
  const count = answer.figures.data?.now?.records ?? null
  const rows = records.data ? (query.tip === 'directe' ? records.data.rows.map((row) => ({ ...row, suppliers: [row.supplier.name ?? '—'] })) : groupedRows(records.data.rows)) : []
  return (
    <section className={className} aria-labelledby="analytics-records">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="analytics-records" className="text-lg font-semibold tracking-tight">
          {t`Înregistrările`}
        </h2>
        {(asked || party) && valued ? (
          <IndicatorToggle<'value_desc' | 'date_desc'>
            label={t`Ordinea`}
            value={sort}
            onChange={setSort}
            options={[
              { key: 'value_desc', label: t`Cele mai mari` },
              { key: 'date_desc', label: t`Cele mai noi` },
            ]}
          />
        ) : null}
      </div>
      {problem === 'supplier-place' ? (
        <p className="mt-3 text-sm text-muted-foreground">{t`Lista înregistrărilor nu se poate filtra încă după locul firmei. Alege o firmă din listă pentru înregistrările ei.`}</p>
      ) : problem === 'procedure' ? (
        <p className="mt-3 text-sm text-muted-foreground">{t`Lista înregistrărilor nu se poate filtra încă după procedură: ar arăta și contracte din alte proceduri.`}</p>
      ) : problem === 'too-wide' ? (
        <p className="mt-3 text-sm text-muted-foreground">{t`Pentru achiziții directe, lista cere o instituție, o firmă sau cel mult 12 luni.`}</p>
      ) : !asked && !party ? (
        <button type="button" onClick={() => setAsked(true)} className="mt-3 border px-3 py-2 text-sm font-medium hover:bg-muted">
          {count === null ? t`Vezi înregistrările` : valued ? t`Vezi cele mai mari 25 din ${countText(count)}` : t`Vezi cele mai noi 25 din ${countText(count)}`}
        </button>
      ) : records.isError ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {party ? t`Lista nu s-a putut citi acum.` : t`Lista nu s-a putut citi pentru o selecție atât de largă. Restrânge la o instituție, o firmă sau o lună și încearcă din nou.`}{' '}
          <button type="button" onClick={() => void records.refetch()} className="font-medium underline underline-offset-4">
            {t`Încearcă din nou`}
          </button>
        </p>
      ) : !records.data ? (
        <HubPending className="mt-3" rows={5} />
      ) : (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            {records.data.total === null ? t`Lista are peste 10.000 de înregistrări.` : listTotalText(records.data.total)}{' '}
            {query.tip !== 'directe' ? t`Rândurile unei asocieri sunt adunate într-unul.` : null}
          </p>
          <ol className="mt-3 divide-y divide-border/70 border-y border-border/70">
            {rows.map((row) => (
              <li key={row.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] gap-x-3 py-2.5 text-sm">
                <span className="pt-0.5 font-mono text-xs tabular-nums text-muted-foreground">{row.date ? dayText(row.date) : '—'}</span>
                <span className="min-w-0">
                  <a href={row.href} className="block truncate text-foreground hover:underline">
                    {row.title ?? t`Fără titlu în SEAP`}
                  </a>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {row.authority.name ?? '—'} → {row.suppliers.join(', ')}
                  </span>
                </span>
                <span className={cn('text-right tabular-nums', row.checked ? 'font-semibold' : 'text-muted-foreground')}>{row.value !== null ? moneyText(row.value) : '—'}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────── the method ──

/** „Cum am calculat": the population's rules, the months, the scope sent, the API's own notes, and whether the list adds up. */
export function MethodNote({ query, answer, className }: { readonly query: Query; readonly answer: Answer; readonly className?: string }) {
  const now = answer.figures.data?.now ?? null
  const ranking = answer.ranking.data
  const sum = ranking ? ranking.buckets.reduce((total, bucket) => total + bucket.count, 0) : null
  const adds = now && sum !== null ? sum === now.records : null
  return (
    <details className={cn('text-sm text-muted-foreground', className)}>
      <summary className="cursor-pointer font-medium text-foreground">{t`Cum am calculat`}</summary>
      <div className="mt-3 space-y-2">
        <p>{populationGloss(query.tip)}</p>
        {answer.period ? (
          <p>
            {answer.figures.data?.before
              ? t`Lunile: ${answer.period.from} – ${answer.period.to}; schimbarea se măsoară față de aceleași luni cu ani în urmă, ${answer.period.previous.from} – ${answer.period.previous.to}.`
              : t`Lunile: ${answer.period.from} – ${answer.period.to}.`}
          </p>
        ) : null}
        {query.valoare ? <p>{t`Un filtru de valoare păstrează doar înregistrările cu valoare publicată; și numărul lor se schimbă.`}</p> : null}
        {query.titlu ? <p>{t`„Titlul conține" caută în titlu, fără diacritice ignorate: „deszăpezire" și „deszapezire" dau răspunsuri diferite.`}</p> : null}
        {adds !== null ? <p>{adds ? t`Rândurile listei, cu „Restul" și cele necunoscute, se adună la total.` : t`Rândurile listei nu se adună exact la total: citirile nu sunt din același moment.`}</p> : null}
        {now?.undated ? <p>{undatedText(now.undated)}</p> : null}
        {now?.caveats.length ? <p className="text-xs">{t`Notele sursei (în engleză):`}</p> : null}
        {now?.caveats.length ? (
          <ul className="list-disc space-y-1 pl-5 text-xs">
            {now.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        ) : null}
        {answer.scopes.now ? <pre className="overflow-x-auto bg-muted/60 p-2 font-mono text-xs">{JSON.stringify(answer.scopes.now)}</pre> : null}
      </div>
    </details>
  )
}

// ──────────────────────────────────────────────────────────── questions ──

export function QuestionList({ onPick, columns = false }: { readonly onPick: (question: Question) => void; readonly columns?: boolean }) {
  return (
    <div className={cn(columns ? 'grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4')}>
      {QUESTION_GROUPS.map((group) => (
        <div key={group.id}>
          <MonoLabel className={LABEL}>{i18n._(group.title)}</MonoLabel>
          <ul className="mt-2 space-y-1.5">
            {QUESTIONS.filter((item) => item.group === group.id).map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onPick(item)} className="text-left text-sm leading-snug text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
                  {i18n._(item.text)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

const STARTERS = ['cheltuie-direct', 'vand-direct', 'pe-locuitor', 'constructii', 'negociere', 'din-2019']

/** The gallery above the default answer, for a reader who arrives with no question: six to start, all on request. */
export function QuestionGallery({ onChange, className }: { readonly onChange: (query: Query) => void; readonly className?: string }) {
  const [all, setAll] = useState(false)
  return (
    <section className={className} aria-labelledby="analytics-questions">
      <h2 id="analytics-questions" className="text-sm font-semibold tracking-tight">
        {t`Pornește de la o întrebare`}
      </h2>
      {all ? (
        <div className="mt-4">
          <QuestionList columns onPick={(question) => onChange(question.query)} />
        </div>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {STARTERS.map((id) => QUESTIONS.find((item) => item.id === id))
            .filter((item): item is Question => Boolean(item))
            .map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onChange(item.query)} className="border px-3 py-1.5 text-left text-sm hover:bg-muted">
                  {i18n._(item.text)}
                </button>
              </li>
            ))}
        </ul>
      )}
      <button type="button" onClick={() => setAll((value) => !value)} className="mt-3 text-sm font-medium underline-offset-4 hover:underline">
        {all ? t`Mai puține întrebări` : t`Toate cele ${QUESTIONS.length} de întrebări`}
      </button>
    </section>
  )
}

