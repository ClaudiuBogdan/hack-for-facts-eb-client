import { Fragment, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { ArrowLeft, Plus, Search, X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { dayText } from '@/features/procurement/lib/home-format'
import { lastDayOf } from '@/features/procurement/lib/profile-period'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { AXIS_ORDER, POPULATIONS, bucketStart, repaired, withoutFilter, type AxisId, type PopulationId, type Query } from './analytics.model'
import type { Answer, Point } from './analytics.data'
import { AddFilter, PeriodMenu, QuestionsMenu, filterChipLabel } from './analytics.parts'
import { NotesMarker, ShareIcon, figuresOf, type Figure } from './analytics.clean'
import { FiltersButton } from './analytics.filters'
import { countText, headline, headlineParts, moneyText, monthsText, populationLabel, type HeadlinePart, type Namer } from './analytics.text'

/**
 * Two redesigns of `curat`'s head — the controls, the headline, the months,
 * the figures — over the same query and the same reads:
 *
 * - the sentence, on the profiles' grid: the head band (the period at the
 *   top right, the question as the headline — a filter's phrase opens the
 *   panel, its ✕ drops it), the populations numbered in the pinned bar
 *   under it, the figures in the profiles' band.
 * - the bar: one quiet bar — the populations as tabs, the period, one search
 *   field holding the filters as chips — and figures that carry their own
 *   years, so the years strip below them goes.
 */
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

function SentencePart({ part, query, onChange, onFilters }: { readonly part: HeadlinePart; readonly query: Query; readonly onChange: (query: Query) => void; readonly onFilters: () => void }) {
  // The population is chosen in the bar under the head, the group-by above the table: here they are words.
  if (part.role === 'tip' || part.role === 'dupa') return <span>{part.text}</span>
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
        className="ml-0.5 inline-flex size-[0.7em] items-center justify-center align-[0.05em] text-muted-foreground/70 transition-opacity hover:text-foreground focus-visible:opacity-100 sm:absolute sm:-right-[0.5em] sm:-top-[0.1em] sm:ml-0 sm:size-[0.5em] sm:bg-background sm:opacity-0 sm:group-hover/phrase:opacity-100"
      >
        <X className="size-[0.55em] sm:size-full" aria-hidden="true" />
      </button>
    </span>
  )
}

/** The headline's size by its length, as the profiles size a name: a short question large, a long one a step down. */
function headlineSize(text: string): string {
  if (text.length <= 36) return 'text-4xl sm:text-6xl'
  if (text.length <= 72) return 'text-3xl sm:text-5xl'
  return 'text-2xl sm:text-4xl'
}

const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'

/**
 * The page's head, in the procurement profiles' shape and on their grid: the
 * lattice, the corner ticks; the top row with the way back and the period
 * (with the date its data runs through); the question as the headline —
 * each filter's phrase opens the panel, its ✕ drops it; under it, what
 * adds to the query and the caveats' marker; the cross where the head's
 * bottom rule meets the frame, over the bar below.
 */
export function GridHead({
  query,
  answer,
  namer,
  onChange,
  onFilters,
}: {
  readonly query: Query
  readonly answer: Answer
  readonly namer: Namer
  readonly onChange: (query: Query) => void
  readonly onFilters: () => void
}) {
  const parts = headlineParts(query, namer)
  const said = new Set<string>(parts.map((part) => part.role))
  // A filter the sentence folds into another (a county under a chosen institution) is still on: a chip says it.
  const unsaid = activeKeys(query).filter((key) => !said.has(key))
  const cutoff = answer.cutoff?.[POPULATIONS[query.tip].cutoff] ?? null
  const fresh = cutoff && !answer.cutoff?.failed ? t`Date actualizate până la ${dayText(lastDayOf(cutoff))} ${cutoff.slice(0, 4)}` : null
  return (
    <section className="relative border-b" aria-labelledby="analytics-title">
      <TwoLayerLattice idPrefix="analytics-head" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Link to="/procurement" className="group inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`Achiziții publice`}</span>
            </Link>
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden="true">/</span>
              <span>{t`Analize`}</span>
            </span>
          </MonoLabel>
          <div className="flex items-center gap-4">
            {fresh ? <span className="hidden text-xs text-muted-foreground sm:inline">{fresh}</span> : null}
            <span className="flex items-center gap-2">
              <MonoLabel className="sr-only text-muted-foreground sm:not-sr-only">{t`Perioada`}</MonoLabel>
              <PeriodMenu
                query={query}
                answer={answer}
                onChange={onChange}
                triggerClassName="inline-flex h-9 items-center gap-2 whitespace-nowrap border border-foreground/25 bg-background px-3 text-sm font-semibold tabular-nums transition-colors hover:border-foreground/60"
              />
            </span>
          </div>
        </div>
        {fresh ? <p className="mt-2 text-right text-xs text-muted-foreground sm:hidden">{fresh}</p> : null}
        <h1 id="analytics-title" className={cn('mt-6 max-w-5xl font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-8', headlineSize(parts.map((part) => part.before + part.text).join('')))}>
          {parts.map((part) => (
            <Fragment key={part.role}>
              {part.before}
              <SentencePart part={part} query={query} onChange={onChange} onFilters={onFilters} />
            </Fragment>
          ))}
        </h1>
        {unsaid.length > 0 ? (
          <p className="mt-4 flex flex-wrap gap-2">
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
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1">
          <AddFilter
            query={query}
            namer={namer}
            onChange={onChange}
            triggerClassName={LINK}
            trigger={
              <>
                <Plus className="size-3.5" aria-hidden="true" />
                {t`Adaugă un filtru`}
              </>
            }
          />
          <FiltersButton query={query} onClick={onFilters} className="min-h-11 border-0 px-0 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground sm:min-h-0" />
          <QuestionsMenu onChange={onChange} triggerClassName={LINK} />
          <ShareIcon query={query} answer={answer} className={cn(LINK, 'size-11 justify-center sm:size-auto')} />
          <NotesMarker query={query} answer={answer} />
        </div>
        {/* The crux on the head's bottom rule, where the bar begins; above the bar, which would cover its top half. */}
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/**
 * The records the page reads, as the profiles' pinned bar lays out their
 * bands: the question on the left (from a wide screen), the three
 * populations numbered at the right; the one read is marked.
 */
export function PopulationNav({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  return (
    <nav aria-label={t`Ce înregistrări`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 overflow-x-auto py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground md:block md:max-w-md">{headline(query, namer)}</span>
        <ol className="flex shrink-0 gap-4 sm:gap-6 md:ml-auto">
          {POPULATION_ORDER.map((tip, position) => {
            const active = query.tip === tip
            return (
              <li key={tip}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(withPopulation(query, tip))}
                  className={cn(
                    '-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 text-sm transition-colors',
                    active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <MonoLabel className="text-primary" aria-hidden="true">
                    {String(position + 1).padStart(2, '0')}
                  </MonoLabel>
                  {populationLabel(tip)}
                </button>
              </li>
            )
          })}
        </ol>
      </RuledFrame>
    </nav>
  )
}

/** A figure as the profiles' figures band takes it: its number, its decimals, its unit apart. */
function factOf(figure: Figure, answer: Answer, compared: string | undefined): HubFact | null {
  const now = answer.figures.data?.now ?? null
  const concentration = answer.concentration.data
  const note = figure.change ? <span title={compared}>{figure.change}</span> : null
  const link = (label: ReactNode, className: string) => <span className={className}>{label}</span>
  if (figure.key === 'records' && now) return { key: figure.key, value: now.records, digits: 0, label: figure.label, note, link }
  if (figure.key === 'money' && now?.money != null) {
    const [scale, unit] = now.money >= 1e9 ? [1e9, t`mld. lei`] : now.money >= 1e6 ? [1e6, t`mil. lei`] : [1, t`lei`]
    return { key: figure.key, value: now.money / scale, digits: scale === 1 ? 0 : 1, unit, label: figure.label, note, link }
  }
  if (figure.key === 'firms' && concentration?.firms != null) return { key: figure.key, value: concentration.firms, digits: 0, label: figure.label, note: null, link }
  if (figure.key === 'top5' && concentration?.top5 != null) {
    const percent = concentration.top5 * 100
    return { key: figure.key, value: percent, digits: percent < 10 ? 1 : 0, unit: '%', label: figure.label, note: null, link }
  }
  return null
}

/** The figures in the profiles' band: the value large, the term and its change under it, ruled cells across the frame. */
export function GridFigures({ query, answer }: { readonly query: Query; readonly answer: Answer }) {
  const { i18n } = useLingui()
  const figures = figuresOf(query, answer)
  const compared = answer.figures.data?.before && answer.period ? t`față de ${monthsText(answer.period.previous)}` : undefined
  const facts = (figures ?? []).flatMap((figure) => {
    const fact = factOf(figure, answer, compared)
    return fact ? [fact] : []
  })
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        {answer.figures.isError ? (
          <div className="py-6">
            <HubLoadError onRetry={answer.figures.retry} />
          </div>
        ) : facts.length === 0 ? (
          <div className="h-32 animate-pulse" aria-hidden="true" />
        ) : (
          <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
        )}
      </RuledFrame>
    </section>
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
