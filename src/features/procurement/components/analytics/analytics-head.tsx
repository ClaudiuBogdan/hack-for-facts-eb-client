import { Fragment, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { ArrowLeft, ChevronRight, FileSignature, Layers, Plus, ShoppingCart, X, type LucideIcon } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { Bone } from '@/features/procurement/components/home/home-chrome'
import { countText, dayText } from '@/features/procurement/lib/home-format'
import { lastDayOf } from '@/features/procurement/lib/profile-period'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { AXIS_ORDER, cpvPath, POPULATION_ORDER, POPULATIONS, withCategory, withoutFilter, withPopulation, withTitle, type AxisId, type PopulationId, type Query } from '../../lib/analytics-model'
import type { Answer, PopulationCounts } from '../../hooks/use-procurement-analytics'
import { AddFilter, PeriodMenu, QuestionsMenu } from './analytics-controls'
import { NotesMarker, ShareIcon } from './analytics-answer'
import { FiltersButton } from './analytics-filters'
import { cpvLabel, headline, headlineParts, kindSplitNote, moneyText, monthsText, populationLabel, type HeadlinePart, type Namer } from '../../lib/analytics-text'
import { figuresOf, filterChipLabel, type Figure } from './analytics-view'

/**
 * The page's head, on the procurement profiles' grid: the head band (the
 * period at the top right, the question as the headline — a filter's phrase
 * opens the panel, its ✕ drops it), the populations in the pinned bar under
 * it, the figures in the profiles' band.
 */
const PHRASE = 'text-left underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em] transition-colors hover:decoration-foreground'
/** Each population's mark: a purchase from the catalogue, a signed contract, a framework's layers (the contract page's own two). */
const POPULATION_ICON: Readonly<Record<PopulationId, LucideIcon>> = { directe: ShoppingCart, contracte: FileSignature, acorduri: Layers }

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
  if (key === 'titlu') return withTitle(query, null)
  if (key === 'valoare') return { ...query, valoare: null }
  if (key === 'cpv') return withCategory(query, null)
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
 * A category's place in the CPV tree, over the headline that names it: its
 * code and its parents' codes, each parent a step back up (design.md §19).
 * Codes, not names: the headline says the category's name, and a path of
 * names would not fit a phone; each code carries its name for a screen
 * reader, and on hover. The names are the page's own read (`nameKeys`).
 */
function CategoryPath({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  const path = cpvPath(query.filters.cpv?.values[0] ?? '')
  return (
    <MonoLabel className="mt-6 flex flex-wrap items-center gap-x-0.5 text-muted-foreground sm:mt-8">
      <span className="mr-1">CPV</span>
      {path.map((step, index) => {
        const label = cpvLabel(step, namer)
        // A whole target: 44 px tall on a phone, 24 from a small screen up, a little wider than its digits.
        const target = 'inline-flex min-h-11 items-center px-1 sm:min-h-6'
        return (
          <Fragment key={step}>
            {index > 0 ? <ChevronRight className="size-3 shrink-0" aria-hidden="true" /> : null}
            {index === path.length - 1 ? (
              <span className={cn(target, 'text-foreground')} title={label}>
                {step}
                <span className="sr-only"> {label}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onChange(withCategory(query, step))}
                title={t`Doar ${label}`}
                aria-label={`${step} ${label}`}
                className={cn(target, 'underline-offset-4 hover:text-foreground hover:underline')}
              >
                {step}
              </button>
            )}
          </Fragment>
        )
      })}
    </MonoLabel>
  )
}

/**
 * The page's head, in the procurement profiles' shape and on their grid: the
 * lattice, the corner ticks; the top row with the way back and the period
 * (with the date its data runs through); the question as the headline —
 * each filter's phrase opens the panel, its ✕ drops it; under it, what
 * adds to the query and the caveats' marker; the cross where the head's
 * bottom rule meets the frame, over the bar below.
 */
export function AnalyticsHead({
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
        {query.filters.cpv ? <CategoryPath query={query} namer={namer} onChange={onChange} /> : null}
        <h1 id="analytics-title" className={cn(query.filters.cpv ? 'mt-2' : 'mt-6 sm:mt-8', 'max-w-5xl font-extrabold leading-[1.02] tracking-tighter text-foreground', headlineSize(parts.map((part) => part.before + part.text).join('')))}>
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
 * populations at the right, each with its mark instead of a number (they
 * are choices, not a sequence); the one read is underlined.
 */
/**
 * A tab's count, in a slot of its own height: a bone while it is read, the
 * count, or nothing — the bar never moves. Its months on hover (each
 * population counts its own), and the record kinds' caveat marked where its
 * months run past the split, as the population's own page says it.
 */
function TabCount({ tip, count }: { readonly tip: PopulationId; readonly count: PopulationCounts[PopulationId] }) {
  const split = POPULATIONS[tip].kindSplitUntil
  const note = split && count.period && count.period.to > split ? kindSplitNote(tip) : null
  const months = count.period ? monthsText(count.period) : null
  return (
    <span className="flex h-4 items-center text-xs tabular-nums text-muted-foreground" title={count.value != null ? [months, note].filter(Boolean).join(' · ') : undefined}>
      {count.value === undefined ? (
        <Bone className="w-12" />
      ) : count.value !== null ? (
        <>
          {countText(count.value)}
          {note ? (
            <>
              <span className="text-amber-700 dark:text-amber-400" aria-hidden="true">
                *
              </span>
              <span className="sr-only">{note}</span>
            </>
          ) : null}
        </>
      ) : null}
    </span>
  )
}

export function PopulationNav({
  query,
  namer,
  counts,
  onChange,
}: {
  readonly query: Query
  readonly namer: Namer
  /** Each population's count for the question's filters (design.md §19): read, unknown (`null`) or on its way (`undefined`). */
  readonly counts: PopulationCounts
  readonly onChange: (query: Query) => void
}) {
  return (
    <nav aria-label={t`Ce înregistrări`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      {/* Nothing scrolls: on a phone the three share the width; from a small screen up they sit at the right. */}
      <RuledFrame className="flex items-center gap-6 py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground md:block md:max-w-md">{headline(query, namer)}</span>
        <ol className="grid w-full grid-cols-3 gap-3 sm:flex sm:w-auto sm:shrink-0 sm:gap-6 md:ml-auto">
          {POPULATION_ORDER.map((tip) => {
            const active = query.tip === tip
            const Icon = POPULATION_ICON[tip]
            return (
              <li key={tip}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(withPopulation(query, tip))}
                  className={cn(
                    'flex h-full min-h-11 w-full items-center gap-2 border-b-2 py-2 text-left text-sm leading-tight transition-colors sm:w-auto sm:py-0',
                    active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', active && 'text-primary')} aria-hidden="true" />
                  {/* The count under the name, beside it from `md` (three long names and counts overflow a small screen). */}
                  <span className="flex min-w-0 flex-col md:flex-row md:items-baseline md:gap-1.5">
                    <span>{populationLabel(tip)}</span>
                    <TabCount tip={tip} count={counts[tip]} />
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

/** A figure as the profiles' figures band takes it: its number, its decimals, its unit apart. */
function factOf(figure: Figure, answer: Answer, compared: string | undefined): HubFact | null {
  const now = answer.figures.data?.now ?? null
  const concentration = answer.concentration.data
  const note = figure.change ? <span title={compared}>{figure.change}</span> : null
  const link = (label: ReactNode, className: string) => <span className={className}>{label}</span>
  // A count the API withheld has no figure: the caveats' marker says why.
  if (figure.key === 'records' && now?.records != null) return { key: figure.key, value: now.records, digits: 0, label: figure.label, note, link }
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
export function AnalyticsFigures({ query, answer }: { readonly query: Query; readonly answer: Answer }) {
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

