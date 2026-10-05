import { Fragment, Suspense, createContext, useContext, useDeferredValue, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { ErrorBoundary } from '@sentry/react'
import { QueryErrorResetBoundary, keepPreviousData, useQuery, useQueryClient, useSuspenseQueries } from '@tanstack/react-query'
import { ArrowLeft, Coins, Landmark, Scale, ScrollText, Wallet, X, type LucideIcon } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import {
  approvedRecordsOptions,
  approvedTotalsOptions,
  executionGridOptions,
  observationsOptions,
  useApprovedSeries,
  useExecutionGrid,
  useNationalCatalog,
} from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { plotOf, thousandToLei } from '@/features/national-budget/analytics/lib/exact'
import { SECTION_ROOT, cutLines } from '@/features/national-budget/analytics/lib/lines'
import { shiftYears, toAnalyticsSeries } from '@/features/national-budget/analytics/lib/series'
import { useAnafStateBudget } from '@/features/national-budget/page/hooks/use-national-budget-page'
import { Bone } from '@/features/procurement/components/home/home-chrome'
import { HubLoadError, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import type { BudgetApprovedEdition, BudgetNationalCatalog } from '@/schemas/national-budget-api'
import { authorityName, moneyText, monthText, shortName } from './budget.format'
import { anafRanking, topShare } from './budget.model'
import { HUB_PATH } from './budget.parts'
import { BandRead, BudgetShell } from './budget.shell'
import { NotesMarker, ShareIcon } from './analize.controls'
import { PeriodBars, type BarPoint } from './avansat.chart'
import { AnswerBar, FiltersButton, FilterSheet, LawYearMenu, PeriodMenu, QuestionsMenu, Trail } from './avansat.controls'
import { ContentsSheet, SearchButton } from './avansat.nav'
import { BudgetCategoriesAnswer, BudgetTimeAnswer, BudgetYears, BudgetsAnswer, budgetPhrase, budgetWhen, useBudgetFigures } from './avansat.budgets'
import { CategoriesAnswer, TimeAnswer, cellsOf, focusOf, gdpShares, itemsOf, labelOf, largestShare, pointsOf, yearsInput } from './avansat.execution'
import { AuthoritiesAnswer, ChaptersAnswer, EditionsAnswer, FundsAnswer, PaymentsAnswer, creditTypeOf, editionOf } from './avansat.law'
import { TablePending, Unavailable } from './avansat.parts'
import { TABS, itemOfRand, useAdvancedState, type AdvancedState, type Tip } from './avansat.state'
import {
  FUND_OF,
  approvedStatusText,
  SECTION_OF,
  SPENDING_TOTAL_OF,
  changeOf,
  shareOf,
  chapterLabel,
  componentLabel,
  cumulativeOf,
  TOP_DEPTH,
  execPeriodOf,
  fundLabel,
  headlineParts,
  headlineText,
  isExecution,
  lastCompleteYear,
  lawText,
  periodText,
  populationLabel,
  previousText,
  subjectLabel,
  yearsOfLaw,
  type ExecPeriod,
} from './avansat.view'

/**
 * The national budget's advanced analysis page, read live from the national
 * budget API (seven roots, Chronos development, 4 October 2026), on the
 * procurement analytics page's grid: the head (the way back, how recent the
 * data is, the period; the question as the headline; filters, questions, the
 * link, the caveats), the pinned bar of what the page reads, four figures,
 * the answer as a table of every number (by line, by budget, in time; the
 * law by fund, chapter and law; the ministries), the years, one source line.
 * Every control writes the address: a question is a link.
 */
export function BudgetAdvancedVariant() {
  const { state, set } = useAdvancedState()
  return (
    <BudgetShell demo={null}>
      {state.demo === 'loading' ? (
        <Pending state={state} />
      ) : (
        <BandRead framed fallback={<Pending state={state} />}>
          <Advanced state={state} set={set} />
        </BandRead>
      )}
    </BudgetShell>
  )
}

/** The law year a view reads: the chosen law when loaded, else the newest; the ANAF payments keep their own year. */
function lawYearOf(state: AdvancedState, edition: BudgetApprovedEdition | null): number {
  if (state.tip === 'ministere' && state.dupa === 'platit') return state.an ?? 2025
  return edition?.budgetYear ?? state.an ?? 2025
}

/** What every band of a view reads: the catalog, the period asked and the one read, the law, and how a control moves the view. */
function useAdvancedModel(state: AdvancedState, set: (patch: Partial<AdvancedState>) => void) {
  const catalog = useNationalCatalog()
  useEffect(() => () => stopCounting(), [])
  // One budget is read from its release's column, from 1 January: a quarter or a month alone becomes its release's figure.
  const asked = execPeriodOf(state, catalog.execution.coverage)
  const period = state.buget && isExecution(state.tip) ? cumulativeOf(asked) : asked
  const edition = editionOf(catalog, state.an)
  const lawYear = lawYearOf(state, edition)
  // A population switch keeps only what the new one reads: its first tab, no line opened.
  const move = (patch: Partial<AdvancedState>) => {
    const next: Partial<AdvancedState> = patch.tip && patch.tip !== state.tip ? { dupa: TABS[patch.tip][0], rand: null, ...patch } : patch
    set(next)
  }
  // A band's failure belongs to the view it failed in: another view starts its bands afresh.
  return {
    state,
    catalog,
    asked,
    period,
    edition,
    lawYear,
    move,
    // A band's failure belongs to the view and to the snapshots it read: a lane that moves starts its bands afresh.
    view: `${JSON.stringify(state)}|${catalog.snapshots.execution}|${catalog.snapshots.approved}`,
  }
}

type AdvancedModel = ReturnType<typeof useAdvancedModel>

function Advanced({ state, set }: { readonly state: AdvancedState; readonly set: (patch: Partial<AdvancedState>) => void }) {
  const model = useAdvancedModel(state, set)
  const { catalog, asked, period, edition, lawYear, move } = model
  // While a choice loads, the bands keep their last answer on screen (dimmed) and change in place when the new one
  // is read: never a shorter placeholder that pushes the page. The controls and the headline follow the choice at once.
  const deferred = useDeferredValue(state)
  const shown: AdvancedModel = { ...useAdvancedModel(deferred, set), move }
  const stale = deferred !== state
  const [filters, setFilters] = useState(false)
  const [contents, setContents] = useState(false)
  const page = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLElement>(null)
  useBarHeight(page, bar)
  return (
    <div ref={page} className="relative w-full overflow-x-clip bg-background [--bar-h:2.8rem] sm:[--bar-h:2.75rem]">
      <Head state={state} catalog={catalog} period={period} asked={asked} edition={edition} lawYear={lawYear} onChange={move} onFilters={() => setFilters(true)} />
      <PopulationNav barRef={bar} state={state} onChange={move} onSearch={() => setContents(true)} />
      <FiguresRead model={shown} stale={stale} />
      <AnswerSection live={model} shown={shown} stale={stale} />
      <YearsRead model={shown} stale={stale} />
      <SourceRead model={shown} />
      <FilterSheet state={state} lawYears={yearsOfLaw(catalog.approved.editions)} lawYear={lawYear} onChange={move} open={filters} onOpenChange={setFilters} />
      <ContentsSheet open={contents} onOpenChange={setContents} catalog={catalog} state={state} edition={edition} lawYear={lawYear} onGo={move} />
    </div>
  )
}

/**
 * The sticky bar's height, as `--bar-h` on the page: the tables' headers stick
 * just under it (CSS `sticky`, drawn by the browser in step with the scroll).
 */
function useBarHeight(page: RefObject<HTMLElement | null>, bar: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = bar.current
    const root = page.current
    if (!element || !root) return
    const measure = () => root.style.setProperty('--bar-h', `${element.offsetHeight}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [page, bar])
}

/**
 * A band's read that keeps its last answer while the next loads: the Suspense
 * boundary stays mounted across views (so a deferred render that suspends
 * leaves the old answer on screen), and only the error boundary belongs to a
 * view (a failure doesn't outlive it). The placeholder shows on a first read.
 */
function KeptRead({ view, fallback, framed = false, children }: { readonly view: string; readonly fallback: ReactNode; readonly framed?: boolean; readonly children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <Suspense fallback={fallback}>
          <ErrorBoundary
            key={view}
            fallback={({ resetError }) => {
              const error = (
                <HubLoadError
                  onRetry={() => {
                    reset()
                    resetError()
                  }}
                />
              )
              return framed ? <RuledFrame className="py-10">{error}</RuledFrame> : error
            }}
          >
            {children}
          </ErrorBoundary>
        </Suspense>
      )}
    </QueryErrorResetBoundary>
  )
}

/** The last answer, while the next one loads: dimmed after a beat (a read from the cache never dims). */
const STALE = 'transition-opacity duration-200 motion-reduce:transition-none'
const staleClass = (stale: boolean) => cn(STALE, stale && 'opacity-55 delay-200')

function FiguresRead({ model, stale }: { readonly model: AdvancedModel; readonly stale: boolean }) {
  const { state, catalog, period, edition, lawYear } = model
  return (
    <div className={staleClass(stale)} aria-busy={stale || undefined}>
      <KeptRead view={`figures-${model.view}`} framed fallback={<FiguresPending />}>
        <Figures state={state} catalog={catalog} period={period} edition={edition} lawYear={lawYear} />
      </KeptRead>
    </div>
  )
}

/** The answer: its bar (the tabs and how they read) and the trail follow the choice at once; the table keeps the last answer until the next is read. */
function AnswerSection({ live, shown, stale }: { readonly live: AdvancedModel; readonly shown: AdvancedModel; readonly stale: boolean }) {
  const { state, catalog, period, edition, lawYear, move } = shown
  return (
    <section className="border-b" aria-label={t`Răspunsul`}>
      <RuledFrame className="py-12 sm:py-16">
        <AnswerBar state={live.state} catalog={live.catalog} onChange={move} />
        <div className="mt-4 empty:hidden">
          <Trail state={live.state} onChange={move} />
        </div>
        <div id="answer-panel" role="tabpanel" aria-labelledby={`answer-tab-${live.state.dupa}`} className={cn('mt-4', staleClass(stale))} aria-busy={stale || undefined}>
          <KeptRead view={`answer-${shown.view}`} fallback={<TablePending />}>
            {state.demo === 'error' ? <Boom /> : <Answer state={state} catalog={catalog} period={period} edition={edition} lawYear={lawYear} onChange={move} />}
          </KeptRead>
        </div>
      </RuledFrame>
    </section>
  )
}

function YearsRead({ model, stale }: { readonly model: AdvancedModel; readonly stale: boolean }) {
  const { state, catalog, period, lawYear, move } = model
  if (state.dupa === 'timp' && state.pas === 'an') return null
  return (
    <div className={staleClass(stale)}>
      <YearsBand view={`years-${model.view}`} state={state} catalog={catalog} period={period} lawYear={lawYear} onChange={move} />
    </div>
  )
}

function SourceRead({ model }: { readonly model: AdvancedModel }) {
  return (
    <RuledFrame className="py-8">
      <SourceLine state={model.state} catalog={model.catalog} edition={model.edition} />
    </RuledFrame>
  )
}

/** The prototype's `?demo=error`: a read that fails, for the band's own error. */
function Boom(): never {
  throw new Error('demo: a failed read')
}

// ──────────────────────────────────────────────────────────── the head ──

const PHRASE =
  'cursor-pointer underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em] transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

/**
 * A phrase of the question the reader can change. Inline text, not a <button>:
 * a button never breaks across lines, so a long ministry's name would stand on
 * lines of its own and the headline would shrink for nothing.
 */
function Phrase({ onClick, children }: { readonly onClick: () => void; readonly children: ReactNode }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      className={PHRASE}
    >
      {children}
    </span>
  )
}
const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'

/** The server's first guess at the headline's size, by its length; the browser then fits it to its box. */
function headlineSize(text: string): string {
  if (text.length <= 40) return 'text-4xl sm:text-6xl'
  if (text.length <= 76) return 'text-3xl sm:text-5xl'
  return 'text-2xl sm:text-4xl'
}

/**
 * The headline's box keeps one height whatever the question (7.75rem, about
 * two lines at the largest size), so nothing under it moves when a choice
 * changes the question. The text steps down in size until it fits the box;
 * a question too long even at the smallest size grows the box rather than
 * being cut.
 */
const HEADLINE_STEPS = {
  narrow: [36, 30, 26, 22, 20, 18],
  wide: [60, 48, 40, 34, 30, 24],
} as const

function useFittedHeadline(text: string) {
  const box = useRef<HTMLDivElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  // Before the browser paints: only the headline's own size changes, never the page under it.
  useLayoutEffect(() => {
    const frame = box.current
    if (!frame) return
    let width = -1
    const fit = () => {
      const element = title.current
      if (!element || frame.clientWidth === width) return
      width = frame.clientWidth
      const room = parseFloat(getComputedStyle(frame).minHeight)
      const steps = window.innerWidth >= 640 ? HEADLINE_STEPS.wide : HEADLINE_STEPS.narrow
      for (const size of steps) {
        element.style.fontSize = `${size}px`
        if (element.getBoundingClientRect().height <= room + 0.5) return
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [text])
  return { box, title }
}

/** What a reader should know before this question's numbers: amber when something is off. */
function notesOf(state: AdvancedState, period: ExecPeriod, asked: ExecPeriod): { readonly alerts: readonly string[]; readonly facts: readonly string[] } {
  const alerts: string[] = []
  const facts: string[] = []
  if (isExecution(state.tip) && state.buget && state.dupa !== 'bugete') {
    if (asked.label !== period.label)
      alerts.push(t`Pe un buget, buletinul dă doar cifre de la 1 ianuarie: în loc de ${periodText(asked.label, asked.basis)}, ${periodText(period.label, period.basis)}.`)
    alerts.push(
      t`Un singur buget: coloana lui, tipărită doar de buletinele Excel (din 2019; până în 2023 unele luni, și decembrie 2023, sunt PDF); fără % din PIB. Bugetele nu se adună la consolidat.`,
    )
  }
  if (isExecution(state.tip)) {
    const year = Number(period.label.slice(0, 4))
    if (year < 2019 || year === 2023) alerts.push(t`${year}: buletinul e un PDF; unele rânduri nu au serie, iar pe bugete nu sunt coloane în date.`)
    if (state.dupa === 'bugete' && !period.cumulative) alerts.push(t`Pe bugete, cifrele sunt de la 1 ianuarie, nu ale perioadei alese.`)
    facts.push(t`Bugetul general consolidat: toate bugetele publice, fără transferurile dintre ele.`)
    facts.push(t`O lună sau un trimestru e diferența dintre două buletine cumulate, verificată de server; o perioadă fără buletin rămâne goală, nu zero.`)
    facts.push(t`Variațiile sunt nominale, fără inflație. % din PIB: cum îl tipărește buletinul, din PIB-ul anual estimat de MF.`)
    facts.push(t`Acoperirea se oprește la ultima lună încărcată; o lună lipsă nu dovedește că buletinul n-a fost publicat.`)
  } else if (state.dupa === 'platit') {
    facts.push(t`Plățile raportate la ANAF de ordonatorii principali: altă sursă decât legea și decât buletinul MF. Un instantaneu al API-ului ANAF.`)
    facts.push(t`Codul unui ordonator în lege nu e CUI-ul lui: plățile și legea nu se leagă rând cu rând.`)
  } else {
    alerts.push(t`Legea inițială, fără rectificări: nu se compară cu execuția și nu dă un grad de realizare.`)
    facts.push(t`Legea tipărește mii de lei; aici, lei, mutând virgula (exact). Un total e rândul lui tipărit; rândurile nu se adună.`)
    facts.push(t`Legăturile documentelor legii sunt în așteptare; fiecare document are amprenta SHA-256.`)
    if (state.tip === 'ministere') facts.push(t`Codul unui ordonator în lege nu e CUI-ul lui și se poate schimba de la o lege la alta.`)
  }
  return { alerts, facts }
}

function Head({
  state,
  catalog,
  period,
  asked,
  edition,
  lawYear,
  onChange,
  onFilters,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly asked: ExecPeriod
  readonly edition: BudgetApprovedEdition | null
  readonly lawYear: number
  readonly onChange: (patch: Partial<AdvancedState>) => void
  readonly onFilters: () => void
}) {
  const execution = isExecution(state.tip)
  const coverage = catalog.execution.coverage
  const lawYears = yearsOfLaw(catalog.approved.editions)
  const fresh = execution
    ? t`Buletine MF până în ${monthText(coverage.lastMonth)}`
    : state.dupa === 'platit'
      ? t`Plăți ANAF, instantaneu`
      : t`Legile ${lawYears[lawYears.length - 1] ?? ''}–${lawYears[0] ?? ''}`
  const notes = notesOf(state, period, asked)
  return (
    <section className="relative border-b" aria-labelledby="budget-advanced-title">
      <TwoLayerLattice idPrefix="budget-advanced-head" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <a href={HUB_PATH} className="group inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`Bugetul statului`}</span>
            </a>
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden="true">/</span>
              <span>{t`Analize avansate`}</span>
            </span>
          </MonoLabel>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:inline">{fresh}</span>
            <span className="flex items-center gap-2">
              <MonoLabel className="sr-only text-muted-foreground sm:not-sr-only">{execution ? t`Perioada` : t`Legea`}</MonoLabel>
              {execution ? (
                <PeriodMenu key={`${asked.label}-${asked.basis}`} catalog={catalog} tip={state.tip as 'cheltuieli' | 'venituri' | 'sold'} period={asked} budget={state.buget} onChange={onChange} />
              ) : state.dupa === 'platit' ? (
                <LawYearMenu years={[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]} value={lawYear} label={String(lawYear)} onChange={(an) => onChange({ an })} />
              ) : (
                <LawYearMenu years={lawYears} value={lawYear} label={lawText(lawYear)} onChange={(an) => onChange({ an, rand: null })} />
              )}
            </span>
          </div>
        </div>
        <p className="mt-2 text-right text-xs text-muted-foreground sm:hidden">{fresh}</p>
        <Headline state={state} catalog={catalog} period={execution ? period : null} edition={edition} lawYear={lawYear} onChange={onChange} onFilters={onFilters} />
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1">
          <FiltersButton state={state} onClick={onFilters} className={LINK} />
          <QuestionsMenu onPick={onChange} className={LINK} />
          <ShareIcon className={cn(LINK, 'size-11 justify-center sm:size-auto')} />
          <NotesMarker alerts={notes.alerts} facts={notes.facts} />
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

function Headline({
  state,
  catalog,
  period,
  edition,
  lawYear,
  onChange,
  onFilters,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod | null
  readonly edition: BudgetApprovedEdition | null
  readonly lawYear: number
  readonly onChange: (patch: Partial<AdvancedState>) => void
  readonly onFilters: () => void
}) {
  if (state.tip === 'ministere' && state.dupa === 'aprobat' && state.rand && edition) {
    return <AuthorityHeadline state={state} catalog={catalog} edition={edition} lawYear={lawYear} onChange={onChange} onFilters={onFilters} />
  }
  const execution = isExecution(state.tip)
  // The categories tab shows the whole tree: a line followed elsewhere is not its question.
  const focus = execution && state.tip !== 'sold' && state.dupa !== 'categorii' && itemOfRand(state.rand) ? focusOf(state, catalog, state.tip) : null
  const rowLabel = focus ? labelOf(catalog, focus) : state.tip === 'lege' && state.dupa === 'capitole' && state.rand ? chapterLabel(state.rand, null) : null
  const rowSubject = focus && rowLabel ? subjectLabel(focus, rowLabel) : null
  const budget = execution && state.buget ? budgetPhrase(state.buget) : null
  return (
    <HeadlineText
      parts={headlineParts({
        state,
        period,
        rowLabel,
        rowSubject,
        budget,
        lawYear,
        authorityName: null,
      })}
      onChange={onChange}
      onFilters={onFilters}
    />
  )
}

/** A ministry opened: its name, as the law prints it, in the question. */
function AuthorityHeadline({
  state,
  catalog,
  edition,
  lawYear,
  onChange,
  onFilters,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly edition: BudgetApprovedEdition
  readonly lawYear: number
  readonly onChange: (patch: Partial<AdvancedState>) => void
  readonly onFilters: () => void
}) {
  // The head is live, outside the bands: a read here that suspended or failed would take the whole page with it.
  const client = useQueryClient()
  const { data: cells } = useQuery({
    ...approvedTotalsOptions(client, catalog.snapshots.approved, {
      totals: ['AUTHORITY_EXPENDITURE_5001'],
      editionIds: [edition.id],
      creditTypes: [creditTypeOf(state)],
      measures: ['APPROVED'],
    }),
    placeholderData: keepPreviousData,
  })
  const name = cells?.find((cell) => cell.authority?.code === state.rand)?.authority?.name ?? t`ordonatorul cu codul ${state.rand ?? ''}`
  return (
    <HeadlineText
      parts={headlineParts({
        state,
        period: null,
        rowLabel: null,
        lawYear,
        authorityName: name,
      })}
      onChange={onChange}
      onFilters={onFilters}
    />
  )
}

function HeadlineText({
  parts,
  onChange,
  onFilters,
}: {
  readonly parts: ReturnType<typeof headlineParts>
  readonly onChange: (patch: Partial<AdvancedState>) => void
  readonly onFilters: () => void
}) {
  const text = headlineText(parts)
  const { box, title } = useFittedHeadline(text)
  return (
    <div ref={box} data-headline-box className="mt-6 flex min-h-[7.75rem] items-end sm:mt-8">
      <h1 ref={title} id="budget-advanced-title" className={cn('max-w-5xl font-extrabold leading-[1.02] tracking-tighter text-foreground', headlineSize(text))}>
        {parts.map((part, index) => (
          <Fragment key={index}>
            {part.role === 'scope' ? (
              <Phrase onClick={onFilters}>{part.text}</Phrase>
            ) : part.role === 'row' || part.role === 'budget' ? (
              // The ✕ is a badge on the phrase's corner, out of the sentence: shown on hover or focus, always on a touch screen.
              <span className="group/phrase relative">
                <Phrase onClick={onFilters}>{part.text}</Phrase>
                <button
                  type="button"
                  onClick={() => onChange(part.role === 'budget' ? { buget: null } : { rand: null })}
                  aria-label={t`Scoate „${part.text}"`}
                  className="absolute -right-[0.3em] -top-[0.05em] inline-flex size-[0.42em] items-center justify-center rounded-full border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/phrase:opacity-100 motion-reduce:transition-none after:absolute after:-inset-2 after:content-[''] [@media(hover:none)]:opacity-100"
                >
                  <X className="size-[0.26em]" aria-hidden="true" />
                </button>
              </span>
            ) : (
              part.text
            )}
          </Fragment>
        ))}
      </h1>
    </div>
  )
}

// ───────────────────────────────────────────────────────────── the bar ──

const ICONS: Readonly<Record<Tip, LucideIcon>> = {
  cheltuieli: Wallet,
  venituri: Coins,
  sold: Scale,
  lege: ScrollText,
  ministere: Landmark,
}
const ORDER: readonly Tip[] = ['cheltuieli', 'venituri', 'sold', 'lege', 'ministere']

function PopulationNav({
  barRef,
  state,
  onChange,
  onSearch,
}: {
  readonly barRef: RefObject<HTMLElement | null>
  readonly state: AdvancedState
  readonly onChange: (patch: Partial<AdvancedState>) => void
  readonly onSearch: () => void
}) {
  return (
    <nav ref={barRef} aria-label={t`Ce citești`} className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-2 py-0 sm:gap-6">
        <SearchButton onClick={onSearch} className="order-last border-l pl-1 sm:order-first sm:border-l-0" />
        <ol className="grid min-w-0 flex-1 grid-cols-5 sm:ml-auto sm:flex sm:flex-none sm:gap-6">
          {ORDER.map((tip) => {
            const active = state.tip === tip
            const Icon = ICONS[tip]
            return (
              <li key={tip}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ tip })}
                  className={cn(
                    'flex h-full min-h-11 w-full flex-col items-center gap-1 border-b-2 py-2 text-center text-[0.6875rem] leading-tight sm:text-left transition-colors sm:w-auto sm:flex-row sm:items-center sm:gap-2 sm:py-0 sm:text-sm',
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

// ──────────────────────────────────────────────────────────── figures ──

/**
 * The figures' captions keep a set number of lines (three on a phone, two
 * wider), clamped with the whole text on hover; a figure without a note keeps
 * the note's lines. Every band then has one height, whatever its figures say,
 * and a new answer never moves the page.
 */
const CAPTION = 'line-clamp-3 min-h-[3lh] sm:line-clamp-2 sm:min-h-[2lh]'

const captionTitle = (node: ReactNode) => (typeof node === 'string' ? node : undefined)

const steady = (fact: HubFact): HubFact => ({
  ...fact,
  label: (
    <span className={CAPTION} title={captionTitle(fact.label)}>
      {fact.label}
    </span>
  ),
  note: (
    <span className={CAPTION} title={captionTitle(fact.note)}>
      {fact.note}
    </span>
  ),
})

/** The band's shape on a first read: four cells of the figures' own room, so the real ones take its place without a jump. */
function FiguresPending() {
  return (
    <section className="border-b bg-muted/20" aria-busy="true">
      <RuledFrame>
        <div className="grid grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className={cn('flex flex-col px-5 py-6 sm:py-7', index % 2 === 1 && 'border-l', index >= 2 && 'border-t lg:border-t-0', index >= 1 && 'lg:border-l')}>
              <div className="flex h-8 items-center sm:h-10">
                <Bone className="h-6 w-24 sm:h-8 sm:w-32" />
              </div>
              <div className="mt-2.5 font-mono text-[0.625rem] leading-relaxed">
                <span className={cn(CAPTION, 'block')}>
                  <Bone className="w-3/4" />
                </span>
                <div className="pt-3">
                  <span className={cn(CAPTION, 'block')}>
                    <Bone className="w-1/2" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </RuledFrame>
    </section>
  )
}

const asIs = (label: ReactNode, className: string) => <span className={className}>{label}</span>

function money(key: string, lei: number, label: string, note: ReactNode): HubFact {
  const [scale, unit] = Math.abs(lei) >= 1e9 ? [1e9, t`mld. lei`] : Math.abs(lei) >= 1e6 ? [1e6, t`mil. lei`] : [1, t`lei`]
  return {
    key,
    value: Math.round((lei / scale) * 10) / 10,
    digits: scale === 1 ? 0 : 1,
    unit,
    label,
    note,
    link: asIs,
  }
}

function percent(key: string, fraction: number, label: string, note: ReactNode, digits?: number): HubFact {
  const value = fraction * 100
  return {
    key,
    value,
    digits: digits ?? (Math.abs(value) < 10 ? 2 : 1),
    unit: '%',
    label,
    note,
    link: asIs,
  }
}

function Figures(props: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly edition: BudgetApprovedEdition | null
  readonly lawYear: number
}) {
  const { i18n } = useLingui()
  const { state } = props
  const facts =
    isExecution(state.tip) && state.buget && state.dupa !== 'bugete' ? (
      <BudgetFigures {...props} />
    ) : state.tip === 'cheltuieli' || state.tip === 'venituri' ? (
      <SectionFigures {...props} tip={state.tip} />
    ) : state.tip === 'sold' ? (
      <BalanceFigures {...props} />
    ) : state.dupa === 'platit' ? (
      <PaymentFigures year={props.lawYear} />
    ) : props.edition ? (
      state.tip === 'ministere' ? (
        <AuthorityFigures {...props} edition={props.edition} />
      ) : (
        <LawFigures {...props} edition={props.edition} />
      )
    ) : null
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <FiguresLocale.Provider value={i18n.locale === 'en' ? 'en' : 'ro'}>{facts ?? <p className="py-8 text-sm text-muted-foreground">{t`Nicio lege în date.`}</p>}</FiguresLocale.Provider>
      </RuledFrame>
    </section>
  )
}

const FiguresLocale = createContext<'ro' | 'en'>('ro')

function Band({ facts, empty }: { readonly facts: readonly HubFact[]; readonly empty: string }) {
  const locale = useContext(FiguresLocale)
  if (facts.length === 0) return <p className="py-8 text-sm text-muted-foreground">{empty}</p>
  return <HubFiguresBand key={JSON.stringify(facts.map((fact) => [fact.key, fact.value]))} facts={facts.map(steady)} locale={locale} />
}

function SectionFigures({ catalog, period, tip }: { readonly catalog: BudgetNationalCatalog; readonly period: ExecPeriod; readonly tip: 'cheltuieli' | 'venituri' }) {
  const client = useQueryClient()
  const snapshot = catalog.snapshots.execution
  const section = SECTION_OF[tip] as 'EXPENDITURE' | 'REVENUE'
  const itemIds = itemsOf(catalog, tip)
  const before = shiftYears(period.label, -1)
  const [{ data: grid }, { data: gdp }] = useSuspenseQueries({
    queries: [
      executionGridOptions(client, snapshot, {
        itemIds,
        basis: period.basis,
        period: { type: period.type, dates: [before, period.label] },
      }),
      observationsOptions(client, snapshot, {
        months: [period.releaseMonth],
        components: ['general_consolidated_budget'],
        sections: [section],
        measures: ['GDP_SHARE'],
      }),
    ],
  })
  const root = SECTION_ROOT[section]
  const cells = cellsOf(grid.results.find((result) => result.item.itemId === root))
  const now = cells.get(period.label)
  const then = cells.get(before)
  const facts: HubFact[] = []
  const when = periodText(period.label, period.basis)
  const spending = tip === 'cheltuieli'
  if (now?.value != null) facts.push(money('total', now.value, spending ? t`Cheltuieli publice` : t`Venituri publice`, t`${when}, bugetul general consolidat`))
  const share = gdpShares(catalog, gdp.rows).get(root)
  if (period.cumulative && share !== undefined) facts.push(percent('gdp', share, t`Din PIB`, t`cum îl tipărește buletinul`))
  const change = changeOf(now?.exact ?? null, then?.exact ?? null)
  if (change !== null && then?.value != null)
    facts.push(percent('change', Math.abs(change), change >= 0 ? t`Mai mult decât în ${previousText(period)}` : t`Mai puțin decât în ${previousText(period)}`, moneyText(then.value), 1))
  const top = largestShare(grid, section, itemIds, period.label, TOP_DEPTH[section])
  const topShare = top ? shareOf(top.exact, top.total) : null
  if (top && topShare !== null) facts.push(percent('top', topShare, shortName(labelOf(catalog, top.itemId)), moneyText(top.value), 1))
  return <Band facts={facts} empty={t`Buletinele nu au o valoare pentru ${when}.`} />
}

function BudgetFigures({ catalog, period, state }: { readonly catalog: BudgetNationalCatalog; readonly period: ExecPeriod; readonly state: AdvancedState }) {
  const { focus, now, before, allBudgets, at } = useBudgetFigures(state, catalog, period)
  const component = state.buget!
  const when = budgetWhen(period)
  const name = componentLabel(component)
  const facts: HubFact[] = []
  if (state.tip === 'sold') {
    if (now?.value != null) facts.push(money('balance', Math.abs(now.value), now.value < 0 ? t`Deficit` : t`Excedent`, t`${name}, ${when}`))
    if (before?.value != null) facts.push(money('before', Math.abs(before.value), before.value < 0 ? t`Deficit, ${previousText(period)}` : t`Excedent, ${previousText(period)}`, name))
    return <Band facts={facts} empty={t`Buletinul nu tipărește coloana acestui buget pentru ${when}.`} />
  }
  const tip = state.tip as 'cheltuieli' | 'venituri'
  const section = SECTION_OF[tip] as 'EXPENDITURE' | 'REVENUE'
  if (now?.value != null) facts.push(money('total', now.value, name, tip === 'cheltuieli' ? t`cheltuieli, ${when}` : t`venituri, ${when}`))
  const ofAll = shareOf(now?.exact, allBudgets)
  if (ofAll !== null) facts.push(percent('share', ofAll, t`Din toate bugetele`, t`înainte de transferurile dintre ele`, 1))
  const change = changeOf(now?.exact ?? null, before?.exact ?? null)
  if (change !== null && before?.value != null)
    facts.push(percent('change', Math.abs(change), change >= 0 ? t`Mai mult decât în ${previousText(period)}` : t`Mai puțin decât în ${previousText(period)}`, moneyText(before.value), 1))
  const itemIds = itemsOf(catalog, tip)
  const present = new Set(itemIds.filter((itemId) => at(itemId)?.exact))
  const top = cutLines({
    section,
    sectionItems: itemIds,
    present,
    depth: TOP_DEPTH[section],
  })
    .map((itemId) => ({ itemId, value: at(itemId)?.value ?? null, exact: at(itemId)?.exact ?? null }))
    .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))[0]
  const topShare = shareOf(top?.exact, now?.exact)
  if (top?.value != null && topShare !== null) facts.push(percent('top', topShare, shortName(labelOf(catalog, top.itemId)), moneyText(top.value), 1))
  return <Band facts={facts} empty={t`Buletinul nu tipărește coloana ${budgetPhrase(component)} pentru ${when} (buletin PDF).`} key={focus} />
}

function BalanceFigures({ catalog, period }: { readonly catalog: BudgetNationalCatalog; readonly period: ExecPeriod }) {
  const client = useQueryClient()
  const snapshot = catalog.snapshots.execution
  const before = shiftYears(period.label, -1)
  const itemIds = itemsOf(catalog, 'sold')
  const [{ data: grid }, { data: gdp }] = useSuspenseQueries({
    queries: [
      executionGridOptions(client, snapshot, {
        itemIds,
        basis: period.basis,
        period: { type: period.type, dates: [before, period.label] },
      }),
      observationsOptions(client, snapshot, {
        months: [period.releaseMonth],
        components: ['general_consolidated_budget'],
        sections: ['BALANCE'],
        measures: ['GDP_SHARE'],
      }),
    ],
  })
  const cellAt = (itemId: string, label: string) => cellsOf(grid.results.find((result) => result.item.itemId === itemId)).get(label)
  const at = (itemId: string, label: string) => cellAt(itemId, label)?.value ?? null
  const balance = at('mfin.bgc.balance.surplus_deficit', period.label)
  const earlier = at('mfin.bgc.balance.surplus_deficit', before)
  const revenue = at('mfin.bgc.revenue.total', period.label)
  const spending = at('mfin.bgc.expenditure.total', period.label)
  const when = periodText(period.label, period.basis)
  const facts: HubFact[] = []
  if (balance !== null) facts.push(money('balance', Math.abs(balance), balance < 0 ? t`Deficit` : t`Excedent`, t`${when}, bugetul general consolidat`))
  const share = gdpShares(catalog, gdp.rows).get('mfin.bgc.balance.surplus_deficit')
  if (period.cumulative && share !== undefined) facts.push(percent('gdp', Math.abs(share), t`Din PIB`, t`cum îl tipărește buletinul`))
  if (earlier !== null) facts.push(money('before', Math.abs(earlier), earlier < 0 ? t`Deficit, ${previousText(period)}` : t`Excedent, ${previousText(period)}`, t`aceeași perioadă, un an înainte`))
  const cover = revenue !== null && spending ? shareOf(cellAt('mfin.bgc.revenue.total', period.label)?.exact, cellAt('mfin.bgc.expenditure.total', period.label)?.exact) : null
  if (cover !== null) facts.push(percent('cover', cover, t`Veniturile acoperă`, t`din cheltuieli`, 1))
  return <Band facts={facts} empty={t`Buletinele nu au o valoare pentru ${when}.`} />
}

function LawFigures({ catalog, state, edition }: { readonly catalog: BudgetNationalCatalog; readonly state: AdvancedState; readonly edition: BudgetApprovedEdition }) {
  const client = useQueryClient()
  const snapshot = catalog.snapshots.approved
  const year = edition.budgetYear
  const fund = state.fond
  const [{ data: totals }, { data: deficit }] = useSuspenseQueries({
    queries: [
      approvedTotalsOptions(client, snapshot, {
        totals: ['REVENUE_TOTAL', SPENDING_TOTAL_OF[fund]],
        editionIds: [edition.id],
        funds: [FUND_OF[fund]],
        creditTypes: [creditTypeOf(state)],
      }),
      approvedRecordsOptions(client, snapshot, {
        editionId: edition.id,
        form: 'STATE_BUDGET_SYNTHESIS',
        rowRoles: ['DESCRIPTOR'],
        capitols: ['9901'],
      }),
    ],
  })
  const cell = (total: string, measureYear: number) => totals.find((item) => item.total === total && item.measureYear === measureYear)
  const facts: HubFact[] = []
  const spending = plotOf(cell(SPENDING_TOTAL_OF[fund], year)?.value)
  const revenue = plotOf(cell('REVENUE_TOTAL', year)?.value)
  const next = plotOf(cell(SPENDING_TOTAL_OF[fund], year + 1)?.value)
  if (spending !== null) facts.push(money('spending', spending, t`Cheltuieli aprobate`, t`${fundLabel(fund)}, ${state.credite === 'angajament' ? t`credite de angajament` : t`credite bugetare`}`))
  if (revenue !== null) facts.push(money('revenue', revenue, t`Venituri prevăzute`, fundLabel(fund)))
  const printed = deficit.rows.find((row) => row.codes.capitol === '9901')?.values.find((value) => value.measureYear === year)?.value
  const deficitLei = fund === 'stat' && printed && !edition.hasConflictingInterpretations ? plotOf(thousandToLei(printed)) : null
  if (deficitLei !== null) facts.push(money('deficit', Math.abs(deficitLei), t`Deficit prevăzut`, t`rândul tipărit 9901, bugetul de stat`))
  if (next !== null) facts.push(money('next', next, t`Estimare pentru ${year + 1}`, t`din ${lawText(year)}`))
  return <Band facts={facts.slice(0, 4)} empty={t`Legea pe ${year} nu tipărește aceste totaluri.`} />
}

function AuthorityFigures({ catalog, state, edition }: { readonly catalog: BudgetNationalCatalog; readonly state: AdvancedState; readonly edition: BudgetApprovedEdition }) {
  const client = useQueryClient()
  const snapshot = catalog.snapshots.approved
  const credit = creditTypeOf(state)
  const year = edition.budgetYear
  const [{ data: approved }, { data: totals }] = useSuspenseQueries({
    queries: [
      approvedTotalsOptions(client, snapshot, {
        totals: ['AUTHORITY_EXPENDITURE_5001'],
        editionIds: [edition.id],
        creditTypes: [credit],
        measures: ['APPROVED'],
      }),
      approvedTotalsOptions(client, snapshot, {
        totals: ['EXPENDITURE_5001_STATE_BUDGET'],
        editionIds: [edition.id],
        creditTypes: [credit],
        measureYears: [year, year + 1],
      }),
    ],
  })
  const approvedTotal = totals.find((cell) => cell.measureYear === year)?.value ?? null
  const total = plotOf(approvedTotal)
  const next = plotOf(totals.find((cell) => cell.measureYear === year + 1)?.value)
  const rows = approved
    .flatMap((cell) => (cell.authority && cell.value && plotOf(cell.value) !== null ? [{ name: cell.authority.name, lei: plotOf(cell.value)!, exact: cell.value }] : []))
    .sort((a, b) => b.lei - a.lei)
  const facts: HubFact[] = []
  if (total !== null) facts.push(money('total', total, t`Bugetul de stat, aprobat`, t`${lawText(year)}, rândul 5001`))
  facts.push({
    key: 'count',
    value: rows.length,
    digits: 0,
    label: t`Ordonatori principali`,
    note: t`cu rândul 5001 în anexa 3`,
    link: asIs,
  })
  // The largest ministry's share is two printed rows; the first five's would be a sum of the law's totals, which the page never makes.
  const largest = rows[0] ? shareOf(rows[0].exact, approvedTotal) : null
  if (rows[0] && largest !== null) facts.push(percent('top1', largest, shortName(rows[0].name), moneyText(rows[0].lei), 1))
  if (next !== null) facts.push(money('next', next, t`Estimare pentru ${year + 1}`, t`bugetul de stat, din ${lawText(year)}`))
  return <Band facts={facts} empty={t`Legea pe ${year} nu are ordonatori în date.`} />
}

function PaymentFigures({ year }: { readonly year: number }) {
  const { data } = useAnafStateBudget()
  if (data.status !== 'ok') return <Band facts={[]} empty={t`Plățile ANAF nu sunt disponibile.`} />
  const ranking = anafRanking(data, year)
  if (!ranking || ranking.rows.length === 0) return <Band facts={[]} empty={t`Nicio plată raportată la ANAF pentru ${year}.`} />
  const top = ranking.rows[0]!
  return (
    <Band
      facts={[
        money('paid', ranking.total, t`Plăți, bugetul de stat`, ranking.throughMonth.endsWith('-12') ? String(year) : t`${year}, până în ${monthText(ranking.throughMonth)}`),
        {
          key: 'count',
          value: ranking.rows.length,
          digits: 0,
          label: t`Ordonatori principali`,
          note: t`cu plăți raportate la ANAF`,
          link: asIs,
        },
        percent('top5', topShare(ranking, 5), t`Primii 5`, t`din plățile bugetului de stat`, 1),
        percent('top1', top.share, shortName(authorityName(top.name)), moneyText(top.lei), 1),
      ]}
      empty=""
    />
  )
}

// ─────────────────────────────────────────────────────────── the answer ──

function Answer({
  state,
  catalog,
  period,
  edition,
  lawYear,
  onChange,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly edition: BudgetApprovedEdition | null
  readonly lawYear: number
  readonly onChange: (patch: Partial<AdvancedState>) => void
}) {
  if (isExecution(state.tip)) {
    if (state.dupa === 'bugete') return <BudgetsAnswer state={state} catalog={catalog} period={period} onChange={onChange} />
    if (state.buget)
      return state.dupa === 'timp' ? (
        <BudgetTimeAnswer state={state} catalog={catalog} period={period} onChange={onChange} titleId="budget-advanced-title" />
      ) : (
        <BudgetCategoriesAnswer state={state} catalog={catalog} period={period} onChange={onChange} />
      )
    if (state.dupa === 'timp') return <TimeAnswer state={state} catalog={catalog} period={period} onChange={onChange} titleId="budget-advanced-title" />
    return <CategoriesAnswer state={state} catalog={catalog} period={period} onChange={onChange} />
  }
  if (state.dupa === 'platit') return <PaymentsAnswer year={lawYear} />
  if (!edition) return <Unavailable>{t`Nicio lege a bugetului în date.`}</Unavailable>
  // The views read from the law's records (chapters, titles, a ministry's lines) would mix an annex read in more than
  // one way; the totals already answer such a cell as ambiguous.
  if (edition.hasConflictingInterpretations && ((state.tip === 'ministere' && state.rand) || (state.tip === 'lege' && state.dupa === 'capitole'))) {
    return <Unavailable>{t`Legea pe ${edition.budgetYear}: ${approvedStatusText('AMBIGUOUS')}.`}</Unavailable>
  }
  if (state.tip === 'ministere') return <AuthoritiesAnswer state={state} catalog={catalog} edition={edition} onChange={onChange} />
  if (state.dupa === 'legi') return <EditionsAnswer state={state} catalog={catalog} lawYear={lawYear} onChange={onChange} />
  if (state.dupa === 'capitole') return <ChaptersAnswer state={state} edition={edition} onChange={onChange} />
  return <FundsAnswer state={state} edition={edition} />
}

// ──────────────────────────────────────────────────────────── the years ──

function YearsBand({
  view,
  state,
  catalog,
  period,
  lawYear,
  onChange,
}: {
  readonly view: string
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly lawYear: number
  readonly onChange: (patch: Partial<AdvancedState>) => void
}) {
  const titleId = 'budget-advanced-years'
  const execution = isExecution(state.tip)
  const lawYears = yearsOfLaw(catalog.approved.editions)
  const index =
    execution && state.buget && state.dupa !== 'bugete'
      ? t`Buletinele MF, ${componentLabel(state.buget)}`
      : execution
        ? t`Buletinele MF, ${catalog.execution.coverage.firstMonth.slice(0, 4)}–${lastCompleteYear(catalog.execution.coverage)}`
        : state.dupa === 'platit'
          ? t`ANAF, instantaneu`
          : t`Legile ${lawYears[lawYears.length - 1] ?? ''}–${lawYears[0] ?? ''}`
  return (
    <section id="ani" className="border-b" aria-labelledby={titleId}>
      <RuledFrame className="py-12 sm:py-16">
        <HubSectionHead titleId={titleId} index={index} title={t`Pe ani`} />
        <div className="mt-8">
          <KeptRead view={view} fallback={<div className="h-56 animate-pulse bg-muted/40 sm:h-64" aria-hidden="true" />}>
            {execution && state.buget && state.dupa !== 'bugete' ? (
              <BudgetYears state={state} catalog={catalog} period={period} onChange={onChange} titleId={titleId} />
            ) : execution ? (
              <ExecutionYears state={state} catalog={catalog} period={period} onChange={onChange} titleId={titleId} />
            ) : state.dupa === 'platit' ? (
              <PaymentYears year={lawYear} onChange={onChange} titleId={titleId} />
            ) : (
              <LawYears state={state} lawYears={lawYears} lawYear={lawYear} onChange={onChange} titleId={titleId} />
            )}
          </KeptRead>
        </div>
      </RuledFrame>
    </section>
  )
}

function ExecutionYears({
  state,
  catalog,
  period,
  onChange,
  titleId,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly period: ExecPeriod
  readonly onChange: (patch: Partial<AdvancedState>) => void
  readonly titleId: string
}) {
  const tip = state.tip as 'cheltuieli' | 'venituri' | 'sold'
  const grid = useExecutionGrid(yearsInput(catalog, itemsOf(catalog, tip)))
  const focus = focusOf(state, catalog, tip)
  const cells = cellsOf(grid.results.find((result) => result.item.itemId === focus))
  const dates = [...cells.keys()]
  return (
    <PeriodBars
      points={pointsOf(cells, dates, 'FULL_YEAR')}
      caption={t`${labelOf(catalog, focus).toLocaleLowerCase('ro-RO')}, an întreg, bugetul general consolidat`}
      selected={period.type === 'YEAR' ? period.label : null}
      onSelect={(label) => onChange({ perioada: label, cumulat: true })}
      labelledBy={titleId}
    />
  )
}

function LawYears({
  state,
  lawYears,
  lawYear,
  onChange,
  titleId,
}: {
  readonly state: AdvancedState
  /** The laws the catalog holds: the bars run over their years. */
  readonly lawYears: readonly number[]
  readonly lawYear: number
  readonly onChange: (patch: Partial<AdvancedState>) => void
  readonly titleId: string
}) {
  const fund = state.tip === 'ministere' ? 'stat' : state.fond
  const total = state.tip !== 'ministere' && state.linie === 'venituri' ? 'REVENUE_TOTAL' : SPENDING_TOTAL_OF[fund]
  const series = useApprovedSeries({
    axis: { ownYearApprovals: {} },
    fund: FUND_OF[fund],
    total,
    ...(total === 'REVENUE_TOTAL' ? {} : { creditType: creditTypeOf(state) }),
    years: { start: Math.min(...lawYears), end: Math.max(...lawYears) },
  })
  const chart = toAnalyticsSeries('approved', series)
  const points: BarPoint[] = series.periods.map((item) => {
    const exact = chart.pointDetails[item.date]?.exact ?? null
    return {
      label: item.date,
      value: plotOf(exact),
      exact,
      gap: exact ? undefined : approvedGap(item.status),
      title: t`${lawText(Number(item.date))}, aprobat pentru ${item.date}`,
    }
  })
  return (
    <PeriodBars
      points={points}
      caption={t`${fundLabel(fund).toLocaleLowerCase('ro-RO')}, ${total === 'REVENUE_TOTAL' ? t`venituri prevăzute` : t`cheltuieli aprobate`} de legea fiecărui an`}
      selected={String(lawYear)}
      onSelect={(label) => onChange({ an: Number(label), rand: null })}
      labelledBy={titleId}
    />
  )
}

function approvedGap(status: string): string {
  if (status === 'NO_MATCHING_RECORD') return t`legea nu are un rând de total cu acest tip de credite`
  if (status === 'EDITION_NOT_LOADED') return t`legea nu e încărcată`
  return status.toLowerCase().replace(/_/gu, ' ')
}

function PaymentYears({ year, onChange, titleId }: { readonly year: number; readonly onChange: (patch: Partial<AdvancedState>) => void; readonly titleId: string }) {
  const { data } = useAnafStateBudget()
  if (data.status !== 'ok') return <Unavailable>{t`Plățile ANAF nu sunt disponibile.`}</Unavailable>
  const points: BarPoint[] = data.years.map((point) => ({
    label: String(point.year),
    value: Number(point.lei),
    exact: point.lei,
    title: point.throughMonth.endsWith('-12') ? String(point.year) : t`${point.year}, până în ${monthText(point.throughMonth)}`,
  }))
  return <PeriodBars points={points} caption={t`plăți din bugetul de stat raportate la ANAF`} selected={String(year)} onSelect={(label) => onChange({ an: Number(label) })} labelledBy={titleId} />
}

// ──────────────────────────────────────────────────────────── the source ──

function SourceLine({ state, catalog, edition }: { readonly state: AdvancedState; readonly catalog: BudgetNationalCatalog; readonly edition: BudgetApprovedEdition | null }) {
  const coverage = catalog.execution.coverage
  const execution = isExecution(state.tip)
  const source = execution
    ? t`Sursa: buletinele lunare de execuție bugetară ale Ministerului Finanțelor, ${monthText(coverage.firstMonth)} – ${monthText(coverage.lastMonth)} (${coverage.selectedMonthCount} din ${coverage.calendarMonthCount} luni)`
    : state.dupa === 'platit'
      ? t`Sursa: ANAF, execuția raportată de ordonatorii principali (instantaneu)`
      : t`Sursa: ${edition ? lawText(edition.budgetYear) : t`legile bugetului`}, cum a fost publicată (XML); legătura documentului: în așteptare`
  return (
    <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>{source}</span>
      <span aria-hidden="true" className="hidden sm:inline">
        ·
      </span>
      <Popover>
        <PopoverTrigger className="min-h-11 underline-offset-4 hover:text-foreground hover:underline sm:min-h-0">{t`Cum am calculat`}</PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,32rem)] space-y-2 text-sm text-muted-foreground">
          {execution ? (
            <>
              <p>{t`Valorile sunt seriile naționale auditate de server (bugetul general consolidat) și cifrele tipărite ale fiecărui buletin (bugetele, % din PIB). Pagina nu adună și nu scade nimic: cota unui rând e rândul împărțit la totalul aceluiași buletin; variația, două valori de același fel.`}</p>
              <p>{t`Fiecare grupă e suma rândurilor de sub ea în anii cu buletin Excel (2019–2025, fără 2023); verificat pe fiecare an. O lună lipsă (${coverage.missingMonths.join(', ')}) lasă goale perioadele care depind de ea.`}</p>
            </>
          ) : (
            <>
              <p>{t`Totalurile legii sunt rândurile lor tipărite (un descriptor revizuit), nu sume. Capitolele, titlurile și ordonatorii sunt rândurile anexelor, cum sunt tipărite.`}</p>
              <p>{t`Estimările pentru anii următori sunt ale aceleiași legi; o lege nu se amestecă niciodată cu alta.`}</p>
            </>
          )}
          <p className="font-mono text-xs break-all">{execution ? catalog.snapshots.execution : catalog.snapshots.approved}</p>
        </PopoverContent>
      </Popover>
    </footer>
  )
}

// ──────────────────────────────────────────────────────────── pending ──

function Pending({ state }: { readonly state: AdvancedState }) {
  return (
    <div aria-busy="true">
      <section className="relative border-b">
        <RuledFrame className="py-10 sm:py-12 lg:py-14">
          <MonoLabel className="text-muted-foreground">{t`Bugetul statului / Analize avansate`}</MonoLabel>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tighter text-foreground sm:mt-8 sm:text-5xl">
            <Bone className="w-4/5" />
          </h1>
          <p className="mt-6 text-sm">
            <Bone className="w-64" />
          </p>
        </RuledFrame>
      </section>
      <nav className="border-b">
        <RuledFrame className="flex h-12 items-center gap-6">
          {ORDER.map((tip) => (
            <span key={tip} className={cn('text-sm', state.tip === tip ? 'font-medium' : 'text-muted-foreground')}>
              {populationLabel(tip)}
            </span>
          ))}
        </RuledFrame>
      </nav>
      <FiguresPending />
      <RuledFrame className="py-12">
        <TablePending />
      </RuledFrame>
    </div>
  )
}
