import { Fragment, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { AXIS_ORDER, POPULATIONS, bucketStart, repaired, withoutFilter, type AxisId, type PopulationId, type Query } from './analytics.model'
import type { Answer, Point } from './analytics.data'
import { AddFilter, PeriodMenu, QuestionsMenu, filterChipLabel } from './analytics.parts'
import { NotesMarker, ShareIcon, figuresOf, type Figure } from './analytics.clean'
import { FiltersButton } from './analytics.filters'
import { countText, headlineParts, moneyText, monthsText, populationLabel, type HeadlinePart, type Namer } from './analytics.text'

/**
 * Two redesigns of `curat`'s head — the controls, the headline, the months,
 * the figures — over the same query and the same reads:
 *
 * - the sentence: the headline is the control. Its phrases are the query's
 *   parts; the population's opens its switch, a filter's opens the panel
 *   (its ✕ drops it); the months under it pick the period. No toolbar.
 * - the bar: one quiet bar — the populations as tabs, the period, one search
 *   field holding the filters as chips — and figures that carry their own
 *   years, so the years strip below them goes.
 */

const GHOST = 'inline-flex min-h-9 items-center gap-1.5 px-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground'
const PHRASE = 'text-left underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em] transition-colors hover:decoration-foreground'
const POPULATION_ORDER: readonly PopulationId[] = ['directe', 'contracte', 'acorduri']

function withPopulation(query: Query, tip: PopulationId): Query {
  return repaired({ ...query, tip, masura: POPULATIONS[tip].defaultMeasure })
}

/** A filter's value in a few words: „instituții din Cluj", „titlu: „laptop"", „≥ 100.000 lei". */
function chipLabel(query: Query, key: AxisId | 'titlu' | 'valoare', namer: Namer): string {
  if (key === 'titlu') return t`titlu: „${query.titlu ?? ''}"`
  if (key === 'valoare') {
    const { min, max } = query.valoare ?? { min: null, max: null }
    if (min != null && max != null) return `${moneyText(min)}–${moneyText(max)}`
    return min != null ? `≥ ${moneyText(min)}` : `≤ ${moneyText(max ?? 0)}`
  }
  const filter = query.filters[key]!
  return filterChipLabel(key, filter.level, filter.values[0]!, namer)
}

function without(query: Query, key: AxisId | 'titlu' | 'valoare'): Query {
  if (key === 'titlu') return { ...query, titlu: null }
  if (key === 'valoare') return { ...query, valoare: null }
  return withoutFilter(query, key)
}

/** Every filter on, in the order the panel lists them. */
function activeKeys(query: Query): readonly (AxisId | 'titlu' | 'valoare')[] {
  return [...AXIS_ORDER.filter((axis) => query.filters[axis]), ...(query.titlu ? (['titlu'] as const) : []), ...(query.valoare ? (['valoare'] as const) : [])]
}

// ────────────────────────────────────────────────────────── the sentence ──

function PopulationMenu({ query, onChange, children }: { readonly query: Query; readonly onChange: (query: Query) => void; readonly children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(PHRASE, 'inline')} aria-label={t`Schimbă înregistrările`}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        {POPULATION_ORDER.map((tip) => (
          <button
            key={tip}
            type="button"
            onClick={() => {
              setOpen(false)
              onChange(withPopulation(query, tip))
            }}
            className={cn('flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted', query.tip === tip && 'font-semibold')}
          >
            {populationLabel(tip)}
            {query.tip === tip ? <Check className="size-4" aria-hidden="true" /> : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function SentencePart({ part, query, onChange, onFilters }: { readonly part: HeadlinePart; readonly query: Query; readonly onChange: (query: Query) => void; readonly onFilters: () => void }) {
  if (part.role === 'tip') return (
      <PopulationMenu query={query} onChange={onChange}>
        {part.text}
        <ChevronDown className="ml-1 inline size-[0.6em] align-[0.05em] text-muted-foreground" aria-hidden="true" />
      </PopulationMenu>
    )
  if (part.role === 'dupa') return <span>{part.text}</span>
  const key = part.role
  return (
    <span className="group/phrase relative">
      <button type="button" onClick={onFilters} className={PHRASE}>
        {part.text}
      </button>
      <button
        type="button"
        onClick={() => onChange(without(query, key))}
        aria-label={t`Scoate „${part.text}"`}
        className="ml-0.5 inline-flex size-[0.8em] items-center justify-center align-[-0.02em] text-muted-foreground/70 transition-opacity hover:text-foreground focus-visible:opacity-100 sm:absolute sm:-right-[0.55em] sm:-top-[0.15em] sm:ml-0 sm:size-[0.55em] sm:bg-background sm:opacity-0 sm:group-hover/phrase:opacity-100"
      >
        <X className="size-[0.55em]" aria-hidden="true" />
      </button>
    </span>
  )
}

/**
 * The head as one sentence that is also the controls, the months under it
 * the period's, and at the line's end what adds to it: a filter, the whole
 * panel, the questions, the link.
 */
export function SentenceHead({
  query,
  answer,
  namer,
  onChange,
  onFilters,
  className,
}: {
  readonly query: Query
  readonly answer: Answer
  readonly namer: Namer
  readonly onChange: (query: Query) => void
  readonly onFilters: () => void
  readonly className?: string
}) {
  const parts = headlineParts(query, namer)
  const said = new Set<string>(parts.map((part) => part.role))
  // A filter the sentence folds into another (a county under a chosen institution) is still on: a chip says it.
  const unsaid = activeKeys(query).filter((key) => !said.has(key))
  return (
    <div className={className}>
      <h1 className="max-w-5xl text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-[2.1rem] sm:leading-[1.2]">
        {parts.map((part) => (
          <Fragment key={part.role}>
            {part.before}
            <SentencePart part={part} query={query} onChange={onChange} onFilters={onFilters} />
          </Fragment>
        ))}
      </h1>
      {unsaid.length > 0 ? (
        <p className="mt-3 flex flex-wrap gap-2">
          {unsaid.map((key) => (
            <span key={key} className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 text-sm">
              {chipLabel(query, key, namer)}
              <button type="button" onClick={() => onChange(without(query, key))} aria-label={t`Scoate`} className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1">
          <PeriodMenu query={query} answer={answer} onChange={onChange} triggerClassName="inline-flex min-h-9 items-center gap-1 text-base font-medium tabular-nums text-foreground underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-4 hover:decoration-foreground" />
          <NotesMarker query={query} answer={answer} />
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-0.5">
          <AddFilter
            query={query}
            namer={namer}
            onChange={onChange}
            triggerClassName={GHOST}
            trigger={
              <>
                <Plus className="size-4" aria-hidden="true" />
                {t`Adaugă`}
              </>
            }
          />
          <FiltersButton query={query} onClick={onFilters} className="border-0 px-2 font-normal text-muted-foreground hover:text-foreground" />
          <QuestionsMenu onChange={onChange} triggerClassName={GHOST} />
          <ShareIcon query={query} answer={answer} className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground" />
        </span>
      </div>
    </div>
  )
}

/** The figures in one ruled row: the value first, its change beside it, what it counts under it. */
export function RuledFigures({ query, answer, className }: { readonly query: Query; readonly answer: Answer; readonly className?: string }) {
  if (answer.figures.isError) return (
      <div className={className}>
        <HubLoadError onRetry={answer.figures.retry} />
      </div>
    )
  const figures = figuresOf(query, answer)
  if (!figures) return <div className={cn('h-24 animate-pulse border-y bg-muted/30', className)} aria-hidden="true" />
  const compared = answer.figures.data?.before && answer.period ? t`față de ${monthsText(answer.period.previous)}` : undefined
  return (
    <dl className={cn('grid grid-cols-2 border-y sm:grid-cols-4', className)}>
      {figures.map((figure, index) => (
        <div
          key={figure.key}
          className={cn(
            'flex min-w-0 flex-col-reverse justify-end gap-1 py-5 pr-4',
            index % 2 === 1 && 'border-l pl-4',
            index >= 2 && 'border-t sm:border-t-0',
            index > 0 && 'sm:border-l sm:pl-6',
          )}
        >
          <dt className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
            {figure.label}
            {figure.change ? (
              <span className="text-xs tabular-nums" title={compared}>
                {figure.change}
              </span>
            ) : null}
          </dt>
          <dd className={cn('text-2xl font-semibold leading-none tabular-nums tracking-tight sm:text-[2rem]', figure.muted ? 'text-muted-foreground' : 'text-foreground')}>{figure.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// ─────────────────────────────────────────────────────────────── the bar ──

/**
 * One bar for the whole query: the populations as tabs and the period on the
 * first line; on the second, one search field holding the filters as chips
 * (a click in it opens the search over institutions, firms, categories,
 * counties), then the panel, the questions, the link.
 */
export function CommandBar({
  query,
  answer,
  namer,
  onChange,
  onFilters,
  className,
}: {
  readonly query: Query
  readonly answer: Answer
  readonly namer: Namer
  readonly onChange: (query: Query) => void
  readonly onFilters: () => void
  readonly className?: string
}) {
  const keys = activeKeys(query)
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b">
        <div className="grid w-full grid-cols-3 gap-3 sm:flex sm:w-auto sm:gap-5" aria-label={t`Ce înregistrări`}>
          {POPULATION_ORDER.map((tip) => (
            <button
              key={tip}
              type="button"
              aria-pressed={query.tip === tip}
              onClick={() => onChange(withPopulation(query, tip))}
              className={cn('-mb-px border-b-2 pb-2 text-left text-sm leading-snug transition-colors', query.tip === tip ? 'border-foreground font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
            >
              {populationLabel(tip)}
            </button>
          ))}
        </div>
        <div className="pb-1">
          <PeriodMenu query={query} answer={answer} onChange={onChange} triggerClassName="inline-flex min-h-8 items-center gap-1 text-sm font-medium tabular-nums text-foreground hover:text-primary" />
        </div>
      </div>
      <div className="flex flex-wrap items-stretch gap-2">
        <div className="flex min-h-10 min-w-0 flex-1 basis-80 flex-wrap items-center gap-1.5 border bg-background px-2.5 py-1 transition-colors focus-within:border-primary">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {keys.map((key) => (
            <span key={key} className="inline-flex max-w-[16rem] items-center gap-1 bg-primary/10 px-2 py-0.5 text-sm">
              <span className="truncate">{chipLabel(query, key, namer)}</span>
              <button type="button" onClick={() => onChange(without(query, key))} aria-label={t`Scoate ${chipLabel(query, key, namer)}`} className="shrink-0 text-muted-foreground hover:text-foreground">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
          <AddFilter
            query={query}
            namer={namer}
            onChange={onChange}
            triggerClassName="min-h-8 min-w-[9rem] flex-1 text-left text-sm text-muted-foreground"
            trigger={keys.length > 0 ? t`Adaugă un filtru…` : t`Caută o instituție, o firmă, o categorie sau un județ`}
          />
        </div>
        <FiltersButton query={query} onClick={onFilters} className="min-h-10" />
        <QuestionsMenu onChange={onChange} triggerClassName="inline-flex min-h-10 items-center gap-1.5 border px-2.5 text-sm transition-colors hover:bg-muted/60" />
        <ShareIcon query={query} answer={answer} className="inline-flex size-10 shrink-0 items-center justify-center border text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground" />
      </div>
    </div>
  )
}

/** A figure's years since 2019, as small bars: the window's darker, a year still filling (or mixed) dashed; a click takes the year. */
function Trend({ figure, query, answer, onChange }: { readonly figure: Figure; readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void }) {
  const points = answer.years.data
  if (!points || points.length < 2 || (figure.key !== 'records' && figure.key !== 'money')) return null
  const pick = (point: Point) => (figure.key === 'money' ? point.money : point.count) ?? 0
  const text = (point: Point) => (figure.key === 'money' ? moneyText(point.money ?? 0) : countText(point.count ?? 0))
  const max = Math.max(1, ...points.map(pick))
  const population = POPULATIONS[query.tip]
  const cutoff = answer.cutoff?.[population.cutoff] ?? null
  const split = population.kindSplitUntil
  const inWindow = (year: string) => answer.period !== null && answer.period.from.slice(0, 4) <= year && answer.period.to.slice(0, 4) >= year
  return (
    <div className="mt-3 max-w-[12rem]">
      <ol className="flex h-9 items-end gap-[3px]">
        {points.map((point) => {
          const dashed = (cutoff !== null && point.bucket === cutoff.slice(0, 4) && !cutoff.endsWith('-12')) || (split !== undefined && bucketStart(point.bucket) > split)
          return (
            <li key={point.bucket} className="flex h-full min-w-0 flex-1 items-end">
              <button
                type="button"
                onClick={() => onChange({ ...query, period: { kind: 'year', year: Number(point.bucket) } })}
                className="flex h-full w-full items-end"
                aria-label={`${point.bucket}: ${text(point)}`}
                title={`${point.bucket}: ${text(point)}`}
              >
                <span
                  className={cn('block w-full', inWindow(point.bucket) ? 'bg-primary/80' : 'bg-primary/25', dashed && 'outline-dashed outline-1 -outline-offset-1 outline-primary/70')}
                  style={{ height: `${Math.max((pick(point) / max) * 100, 4)}%` }}
                />
              </button>
            </li>
          )
        })}
      </ol>
      <div className="mt-1 flex justify-between font-mono text-[0.65rem] tabular-nums text-muted-foreground" aria-hidden="true">
        <span>{points[0]!.bucket}</span>
        <span>{points[points.length - 1]!.bucket}</span>
      </div>
    </div>
  )
}

/** The figures with their years: the label, the value and its change, and under the counts and the money, their trend since 2019. */
export function TrendFigures({ query, answer, onChange, className }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void; readonly className?: string }) {
  if (answer.figures.isError) return (
      <div className={className}>
        <HubLoadError onRetry={answer.figures.retry} />
      </div>
    )
  const figures = figuresOf(query, answer)
  if (!figures) return <div className={cn('h-32 animate-pulse bg-muted/30', className)} aria-hidden="true" />
  const compared = answer.figures.data?.before && answer.period ? t`față de ${monthsText(answer.period.previous)}` : undefined
  return (
    <dl className={cn('grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4', className)}>
      {figures.map((figure) => (
        <div key={figure.key} className="min-w-0">
          <dt className="text-sm text-muted-foreground">{figure.label}</dt>
          <dd className="mt-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className={cn('text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl', figure.muted ? 'text-muted-foreground' : 'text-foreground')}>{figure.value}</span>
              {figure.change ? (
                <span className="text-xs tabular-nums text-muted-foreground" title={compared}>
                  {figure.change}
                </span>
              ) : null}
            </span>
            <Trend figure={figure} query={query} answer={answer} onChange={onChange} />
          </dd>
        </div>
      ))}
    </dl>
  )
}
