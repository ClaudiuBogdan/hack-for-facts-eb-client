import { Fragment, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import {
  ArrowLeft,
  FileSignature,
  Layers,
  Plus,
  ShoppingCart,
  X,
  type LucideIcon,
} from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { dayText } from '@/features/procurement/lib/home-format'
import { lastDayOf } from '@/features/procurement/lib/profile-period'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import {
  AXIS_ORDER,
  POPULATIONS,
  repaired,
  withoutFilter,
  withTitle,
  type AxisId,
  type PopulationId,
  type Query,
} from './analytics.model'
import type { Answer } from './analytics.data'
import { AddFilter, PeriodMenu, QuestionsMenu, filterChipLabel } from './analytics.parts'
import { NotesMarker, ShareIcon, figuresOf, type Figure } from './analytics.clean'
import { FiltersButton } from './analytics.filters'
import {
  headline,
  headlineParts,
  moneyText,
  monthsText,
  populationLabel,
  type HeadlinePart,
  type Namer,
} from './analytics.text'

/**
 * The page's head, on the procurement profiles' grid: the head band (the
 * period at the top right, the question as the headline — a filter's phrase
 * opens the panel, its ✕ drops it), the populations in the pinned bar under
 * it, the figures in the profiles' band.
 */
const PHRASE = 'text-left underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em] transition-colors hover:decoration-foreground'
const POPULATION_ORDER: readonly PopulationId[] = ['directe', 'contracte', 'acorduri']
/** Each population's mark: a purchase from the catalogue, a signed contract, a framework's layers (the contract page's own two). */
const POPULATION_ICON: Readonly<Record<PopulationId, LucideIcon>> = { directe: ShoppingCart, contracte: FileSignature, acorduri: Layers }

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
  if (key === 'titlu') return withTitle(query, null)
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
 * populations at the right, each with its mark instead of a number (they
 * are choices, not a sequence); the one read is underlined.
 */
export function PopulationNav({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
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

