import { useState, type ReactNode } from 'react'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { Check, ChevronDown, Plus, Search } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSearchResults } from '@/features/landing/hooks/use-landing-search'
import { humanizeProcurementCaveat, isSourceDisclosure } from '../../lib/caveat-text'
import { procurementHrefOf } from '../../lib/home-links'
import { cn } from '@/lib/utils'
import {
  groupProblem,
  perResidentAllowed,
  POPULATIONS,
  withCategory,
  withFilter,
  withTitle,
  type AxisId,
  type GroupBy,
  type Measure,
  type Query,
} from '../../lib/analytics-model'
import { useCpvSearch, type Answer } from '../../hooks/use-procurement-analytics'
import { QUESTION_GROUPS, QUESTIONS, type Question } from '../../lib/analytics-questions'
import {
  groupTab,
  keyLabel,
  levelLabel,
  measureLabel,
  moneyText,
  periodText,
  populationGloss,
  recordsTab,
  undatedText,
  type Namer,
} from '../../lib/analytics-text'
import { cpvFilterOf, PROCEDURES } from './analytics-view'

/** The analytics page's controls and shared parts: the period, the quick filter, the questions, the link, the caveats, the group-by, the rows, the method. */

const LABEL = 'block text-muted-foreground'
const CHIP = 'inline-flex min-h-9 items-center gap-1.5 border px-2.5 text-sm transition-colors hover:bg-muted/60'

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
            {/* Only the answer for what is typed now: the last term's rows, kept while the next is read, must not be picked for it. */}
            {cpv.settled && (cpv.data ?? []).length > 0 ? (
              <CommandGroup heading={t`Categorii`}>
                {(cpv.data ?? []).map((hit) => {
                  const next = cpvFilterOf(hit.value)
                  if (!next) return null
                  return (
                    <CommandItem key={hit.value} value={`cpv-${hit.value}`} onSelect={() => pick(withCategory(query, next.value))}>
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
                data-axis={item.axis}
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

// ─────────────────────────────────────────────────────── the selection ──

// ─────────────────────────────────────────────────────────── the method ──

export function MethodBody({ query, answer, className }: { readonly query: Query; readonly answer: Answer; readonly className?: string }) {
  const now = answer.figures.data?.now ?? null
  const ranking = answer.ranking.data
  const sum = ranking ? ranking.buckets.reduce((total, bucket) => total + bucket.count, 0) : null
  const adds = now?.records != null && sum !== null ? sum === now.records : null
  // The source-reported and source-catalogue notes sit on the source line.
  const caveats = now?.caveats.filter((caveat) => !isSourceDisclosure(caveat)) ?? []
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
        {caveats.length ? <p className="text-xs">{t`Notele sursei:`}</p> : null}
        {caveats.length ? (
          <ul className="list-disc space-y-1 pl-5 text-xs">
            {caveats.map((caveat) => (
              <li key={caveat}>{humanizeProcurementCaveat(caveat)}</li>
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

