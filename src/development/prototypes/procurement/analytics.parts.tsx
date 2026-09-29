import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { Check, ChevronDown, Plus, Search } from 'lucide-react'
import { z } from 'zod'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSearchResults } from '@/features/landing/hooks/use-landing-search'
import { procurementHrefOf } from '@/features/procurement/lib/home-links'
import { monthText } from '@/features/procurement/lib/home-format'
import { formatProcurementCountyName } from '@/features/procurement/lib/procurement-geography'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { cn } from '@/lib/utils'
import {
  clippedBucket,
  POPULATIONS,
  cpvLevelOf,
  cpvPrefix,
  groupProblem,
  perResidentAllowed,
  queryOf,
  repaired,
  searchOf,
  unreadParams,
  withFilter,
  withTitle,
  type AnalyticsSearch,
  type AxisId,
  type GroupBy,
  type Measure,
  type Query,
} from './analytics.model'
import {
  COUNTY_POPULATION,
  useCounties,
  useCpvDivisions,
  useLocalities,
  useNames,
  type Answer,
  type Bucket,
  type Ranking,
} from './analytics.data'
import { QUESTION_GROUPS, QUESTIONS, type Question } from './analytics.questions'
import {
  beforeComparableNote,
  countText,
  degradedNote,
  groupTab,
  keyLabel,
  kindSplitNote,
  levelLabel,
  measureLabel,
  moneyText,
  periodText,
  populationGloss,
  recordsCount,
  recordsTab,
  residentsText,
  undatedText,
  unknownLabel,
  type Namer,
} from './analytics.text'

/** The analytics page's shared parts: the address's query and its names, the period, the quick filter, the questions, the link, the caveats, the group-by, the rows, the records, the method. */

const LABEL = 'block text-muted-foreground'
const CHIP = 'inline-flex min-h-9 items-center gap-1.5 border px-2.5 text-sm transition-colors hover:bg-muted/60'

// ───────────────────────────────────────────────────────────────── state ──

/** The query the URL holds, and a way to move to another (pushed: Back undoes a drill). The harness's own keys are kept. */
export function useSearchStrings(): AnalyticsSearch {
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

/** Names for everything on screen: the filters' values, the answer's keys. */
export function useNamer(query: Query, answer: Pick<Answer, 'ranking'>, extra: readonly Ranking[] = []): Namer {
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
  const names = useNames({ orgs, cpv })
  const counties = useCounties()
  const divisions = useCpvDivisions()
  const needLocalities =
    query.filters.loc?.level === 'localitate' ||
    query.filters.loc_firma?.level === 'localitate' ||
    ((query.dupa.axis === 'loc' || query.dupa.axis === 'loc_firma') && query.dupa.level === 'localitate')
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

export function PeriodMenu({ query, answer, onChange, triggerClassName }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void; readonly triggerClassName?: string }) {
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
      <PopoverTrigger className={triggerClassName ?? cn(CHIP, 'font-medium')}>
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

export function filterChipLabel(axis: AxisId, level: string, value: string, namer: Namer): string {
  const name = keyLabel(axis, level, axis === 'cpv' ? value.padEnd(8, '0') : value, namer)
  if (axis === 'cumparator') return name
  if (axis === 'furnizor') return name
  if (axis === 'cpv') return name
  if (axis === 'loc') return level === 'judet' ? t`instituții din ${name}` : t`instituții din ${name}`
  if (axis === 'loc_firma') return t`firme din ${name}`
  return name
}

const resolveSchema = z.object({ procurementResolve: z.array(z.object({ value: z.string(), label: z.string() })) })

export function useCpvSearch(term: string) {
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
export const PROCEDURES = [
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
export function AddFilter({
  query,
  namer,
  onChange,
  trigger,
  triggerClassName,
}: {
  readonly query: Query
  readonly namer: Namer
  readonly onChange: (query: Query) => void
  /** What the trigger shows and how it looks; „+ Filtru" as a chip when not given. */
  readonly trigger?: ReactNode
  readonly triggerClassName?: string
}) {
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
                <CommandItem value="title" onSelect={() => pick(withTitle(query, search.term.trim()))}>
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
export function QuestionsMenu({ onChange, triggerClassName }: { readonly onChange: (query: Query) => void; readonly triggerClassName?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={triggerClassName ?? cn(CHIP)}>
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
/** This page's address for a query, the months frozen where they would move: a link a journalist cites must not move with the next month. */
export function shareUrl(query: Query, answer: Answer): string {
  // The last twelve months and a year in progress move with the next month; the link carries the months they are today.
  const moving = query.period.kind === 'recent' || (query.period.kind === 'year' && answer.period !== null && !answer.period.to.endsWith('-12'))
  const period = answer.period && moving ? { kind: 'months' as const, from: answer.period.from, to: answer.period.to } : query.period
  const current = new URLSearchParams(window.location.search)
  const params = new URLSearchParams(
    [...['v', 'layout'].flatMap((key) => (current.get(key) ? [[key, current.get(key)!] as [string, string]] : [])), ...Object.entries(searchOf({ ...query, period }))].filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
  return `${window.location.origin}${window.location.pathname}${params.size > 0 ? `?${params.toString()}` : ''}`
}

// ───────────────────────────────────────────────────────────── readout ──

/**
 * The query as one sentence (generated, never edited), its months, what the
 * records are — then what the reader must know before the figures: what the
 * address held that the page could not use, a window the population does not
 * compare across, the API's own partial verdict, the question's warning.
 */
export interface ReadoutNotes {
  /** What the address held that the page could not use. */
  readonly unread: string | null
  /** What the numbers cannot say for this window: before 2019, past the kind split, the API's partial verdict. */
  readonly warnings: readonly string[]
  /** The ready question's own warning, when the address is one. */
  readonly trap: string | null
}

export function readoutNotes(query: Query, answer: Answer, search: AnalyticsSearch): ReadoutNotes {
  const unread = unreadParams(search)
  const population = POPULATIONS[query.tip]
  // A question's warning belongs to its own address, never to a default an unread address fell back to.
  const question = unread.length === 0 ? QUESTIONS.find((item) => JSON.stringify(searchOf(item.query)) === JSON.stringify(searchOf(query))) : undefined
  const split = population.kindSplitUntil
  const now = answer.figures.data?.now ?? null
  const warnings: string[] = []
  if (answer.period && answer.period.from < `${population.comparableFrom}-01`) warnings.push(beforeComparableNote(query.tip))
  if (split && answer.period && answer.period.to > split) warnings.push(kindSplitNote(query.tip))
  if (now?.answerability === 'degraded') warnings.push(degradedNote(now.undated, now.undatedMoney))
  if (now?.answerability === 'abstained') warnings.push(t`Sursa nu răspunde pentru această selecție: cifrele lipsesc, nu sunt zero.`)
  return {
    unread: unread.length > 0 ? t`Din adresă n-am putut folosi: ${unread.map((item) => `${item.param}=${item.value}`).join(', ')}. Răspunsul de mai jos nu ține seama de ele.` : null,
    warnings,
    trap: question?.trap ? i18n._(question.trap) : null,
  }
}

// ─────────────────────────────────────────────────────────────── figures ──

// ────────────────────────────────────────────────────── group-by and measure ──

const TABS: readonly { readonly axis: AxisId | 'timp' | 'inregistrari'; readonly levels: readonly { readonly id: string }[] }[] = [
  { axis: 'inregistrari', levels: [{ id: 'toate' }] },
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

function groupOf(axis: AxisId | 'timp' | 'inregistrari', level: string): GroupBy {
  if (axis === 'inregistrari') return { axis }
  return axis === 'timp' ? { axis, bucket: level as 'year' | 'quarter' | 'month' } : { axis, level }
}

/** „După": the axis the answer ranks by, its level where it has several, and the measure. */
export function GroupBar({ query, onChange, className }: { readonly query: Query; readonly onChange: (query: Query) => void; readonly className?: string }) {
  const current = query.dupa
  const currentLevel = current.axis === 'timp' ? current.bucket : current.axis === 'inregistrari' ? 'toate' : current.level
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
                {item.axis === 'inregistrari' ? recordsTab(query.tip) : groupTab(item.axis)}
              </button>
            )
          })}
        </div>
        {/* The records are ordered by their table's headers: no measure to choose. */}
        {current.axis === 'inregistrari' ? null : (
          <IndicatorToggle<Measure>
            label={t`Măsura`}
            value={query.masura}
            onChange={(masura) => onChange({ ...query, masura })}
            options={measures.map((key) => ({ key, label: measureLabel(key, query.tip) }))}
          />
        )}
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

export interface Row {
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

export function rowsOf(query: Query, ranking: Ranking, namer: Namer): { readonly rows: readonly Row[]; readonly total: number | null } {
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

export function profileLink(axis: AxisId, key: string): { readonly to: string; readonly params: Record<string, string> } | null {
  if (axis === 'cumparator') return { to: '/procurement/institutions/$cui', params: { cui: key } }
  if (axis === 'furnizor') return { to: '/procurement/suppliers/$cui', params: { cui: key } }
  return null
}

// ────────────────────────────────────────────────────────── time answer ──

/** What of a bucket a window holds, when not all of it: „(din iunie)", „(până în mai)", „(iunie–august)". */
export function clippedText(bucket: string, window: { readonly from: string; readonly to: string } | null): string | null {
  const clipped = window ? clippedBucket(bucket, window) : null
  if (!clipped) return null
  const month = (value: string) => monthText(value).split(' ')[0]
  if (clipped.from && clipped.to) return t`(${month(clipped.from)}–${month(clipped.to)})`
  if (clipped.from) return t`(din ${month(clipped.from)})`
  return t`(până în ${month(clipped.to!)})`
}

export function bucketLabel(bucket: string): string {
  if (/^\d{4}$/u.test(bucket)) return bucket
  if (/^\d{4}-Q[1-4]$/u.test(bucket)) return bucket.replace('-Q', ' T')
  return monthText(bucket)
}

// ─────────────────────────────────────────────────────── the selection ──

// ─────────────────────────────────────────────────────────── the method ──

export function MethodBody({ query, answer, className }: { readonly query: Query; readonly answer: Answer; readonly className?: string }) {
  const now = answer.figures.data?.now ?? null
  const ranking = answer.ranking.data
  const sum = ranking ? ranking.buckets.reduce((total, bucket) => total + bucket.count, 0) : null
  const adds = now && sum !== null ? sum === now.records : null
  return (
    <div className={cn('space-y-2', className)}>
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

