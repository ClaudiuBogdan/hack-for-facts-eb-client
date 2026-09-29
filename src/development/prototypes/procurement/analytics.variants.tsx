import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { searchOf, type Query } from './analytics.model'
import { useAnswer } from './analytics.data'
import {
  ControlRow,
  FiguresBand,
  GroupBar,
  hasQuestion,
  MethodNote,
  QuestionGallery,
  RankedAnswer,
  Readout,
  RecordsBlock,
  SelectionFacets,
  TimeAnswer,
  useAnalyticsQuery,
  useNamer,
  YearsStrip,
} from './analytics.parts'
import { CleanControls, NotesMarker, CleanFigures, CleanHead, CleanTable, CleanTime, CleanYears, SourceLine } from './analytics.clean'
import { FilterSheet } from './analytics.filters'
import { CommandBar, GridFigures, GridHead, PopulationNav, TrendFigures } from './analytics.heads'
import { headline } from './analytics.text'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

function Shell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      {children}
    </div>
  )
}

// ───────────────────────────────────────────────────────────── răspuns ──

/**
 * `raspuns` — the answer is the page. One column: the controls in one row,
 * the query read as a sentence, four figures, the ranked list (a row's click
 * narrows to it and ranks the next axis), the selection's other axes, its
 * years, the records on request, how it was counted. With no question in the
 * address, the ready questions sit above the default answer.
 */
const STICKY = 'border-b bg-background/95 backdrop-blur sm:sticky sm:top-0 sm:z-20'

/** „Arată primele 100" for the question it was asked on only: another question, or Back, opens at 25. */
function useExpanded(query: Query): readonly [boolean, (expanded: boolean) => void] {
  const key = JSON.stringify(searchOf(query))
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  return [expandedFor === key, (expanded: boolean) => setExpandedFor(expanded ? key : null)] as const
}

export function AnalyticsRaspuns() {
  const [query, move, search] = useAnalyticsQuery()
  const [expanded, setExpanded] = useExpanded(query)
  const answer = useAnswer(query, { topN: expanded ? 100 : 25, facets: true, years: true })
  const namer = useNamer(query, answer)
  const fresh = !hasQuestion(search)
  return (
    <Shell>
      <div className={STICKY}>
        <RuledFrame className="py-3">
          <ControlRow query={query} answer={answer} namer={namer} onChange={move} />
        </RuledFrame>
      </div>
      <RuledFrame className="py-8 sm:py-10">
        <MonoLabel className="block text-muted-foreground">{t`Achiziții publice · Analize`}</MonoLabel>
        <div className="mt-3">
          <Readout query={query} answer={answer} namer={namer} />
        </div>
        {fresh ? <QuestionGallery onChange={move} className="mt-8 border-y py-6" /> : null}
        <FiguresBand query={query} answer={answer} className="mt-8" />
        <GroupBar query={query} onChange={move} className="mt-10" />
        <RankedAnswer query={query} answer={answer} namer={namer} onChange={move} expanded={expanded} onExpand={setExpanded} className="mt-4" />
        <TimeAnswer query={query} answer={answer} onChange={move} className="mt-4" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <MonoLabel className="block text-muted-foreground">{t`În această selecție`}</MonoLabel>
            <SelectionFacets query={query} answer={answer} namer={namer} onChange={move} className="mt-3" />
          </div>
          <YearsStrip query={query} answer={answer} onChange={move} />
        </div>
        <RecordsBlock key={JSON.stringify([query.tip, query.filters, query.period, query.titlu, query.valoare])} query={query} answer={answer} className="mt-12" />
        <MethodNote query={query} answer={answer} className="mt-10 border-t pt-4" />
      </RuledFrame>
    </Shell>
  )
}

// ──────────────────────────────────────────────────────────────── curat ──

/** The records' block keyed by the selection: its own state (asked, the order) starts over with a new one. */
function recordsKey(query: Query): string {
  return JSON.stringify([query.tip, query.filters, query.period, query.titlu, query.valoare])
}

/**
 * `curat` — `raspuns` with the words cut. The question as its headline, the
 * months with one marker for all the caveats, four bare numbers, the answer
 * as a table of every measure (a header ranks by its column) — or, in time,
 * a chart — the years, the records, one source line. The quick row stays;
 * „Filtre" opens every filter in a sheet (from the right; from the bottom on
 * a phone).
 */
export function AnalyticsCurat() {
  const [query, move] = useAnalyticsQuery()
  const [expanded, setExpanded] = useExpanded(query)
  const [filters, setFilters] = useState(false)
  const answer = useAnswer(query, { topN: expanded ? 100 : 25, facets: false, years: true })
  const namer = useNamer(query, answer)
  return (
    <Shell>
      <div className={STICKY}>
        <RuledFrame className="py-3">
          <CleanControls query={query} answer={answer} namer={namer} onChange={move} onFilters={() => setFilters(true)} />
        </RuledFrame>
      </div>
      <RuledFrame className="py-8 sm:py-12">
        <CleanHead query={query} answer={answer} namer={namer} />
        <CleanFigures query={query} answer={answer} className="mt-8" />
        <GroupBar query={query} onChange={move} className="mt-12" />
        {query.dupa.axis === 'timp' ? (
          <CleanTime query={query} answer={answer} onChange={move} className="mt-4" />
        ) : (
          <CleanTable query={query} answer={answer} namer={namer} onChange={move} expanded={expanded} onExpand={setExpanded} className="mt-3" />
        )}
        <CleanYears query={query} answer={answer} onChange={move} className="mt-12" />
        <RecordsBlock key={recordsKey(query)} query={query} answer={answer} className="mt-12" />
        <SourceLine query={query} answer={answer} className="mt-12 border-t pt-4" />
      </RuledFrame>
      <FilterSheet query={query} answer={answer} namer={namer} onChange={move} open={filters} onOpenChange={setFilters} />
    </Shell>
  )
}

// ─────────────────────────────────────────────────────────── propoziție ──

/**
 * `propozitie` — `curat`'s answer under a head on the procurement profiles'
 * grid: the head band (the way back, the period and how recent its data is;
 * the question as the headline, a filter's phrase opening the panel, its ✕
 * dropping it; what adds to the query and the caveats' marker), the cross on
 * its bottom rule, the pinned bar with the three populations (the profiles'
 * bar, without its numbers: these are choices, not bands), the figures band; then the answer, the years
 * and the records in bands of the same frame, the source at the foot.
 */
export function AnalyticsPropozitie() {
  const [query, move] = useAnalyticsQuery()
  const [expanded, setExpanded] = useExpanded(query)
  const [filters, setFilters] = useState(false)
  const answer = useAnswer(query, { topN: expanded ? 100 : 25, facets: false, years: true })
  const namer = useNamer(query, answer)
  return (
    <Shell>
      <GridHead query={query} answer={answer} namer={namer} onChange={move} onFilters={() => setFilters(true)} />
      <PopulationNav query={query} namer={namer} onChange={move} />
      <GridFigures query={query} answer={answer} />
      <section className="border-b" aria-label={t`Răspunsul`}>
        <RuledFrame className="py-12 sm:py-16">
          <GroupBar query={query} onChange={move} />
          {query.dupa.axis === 'timp' ? (
            <CleanTime query={query} answer={answer} onChange={move} className="mt-4" />
          ) : (
            <CleanTable query={query} answer={answer} namer={namer} onChange={move} expanded={expanded} onExpand={setExpanded} className="mt-3" />
          )}
        </RuledFrame>
      </section>
      <section className="border-b" aria-label={t`Înregistrările`}>
        <RuledFrame className="py-12 sm:py-16">
          <CleanYears query={query} answer={answer} onChange={move} className="mb-12" />
          <RecordsBlock key={recordsKey(query)} query={query} answer={answer} />
        </RuledFrame>
      </section>
      <RuledFrame className="py-8">
        <SourceLine query={query} answer={answer} />
      </RuledFrame>
      <FilterSheet query={query} answer={answer} namer={namer} onChange={move} open={filters} onOpenChange={setFilters} />
    </Shell>
  )
}

// ───────────────────────────────────────────────────────────────── bară ──

/**
 * `bara` — `curat` with the head redesigned as one bar: the populations as
 * tabs and the period, one search field holding the filters as chips, the
 * panel, the questions, the link. The headline with its marker; the figures
 * each with its years since 2019 (the years strip below goes).
 */
export function AnalyticsBara() {
  const [query, move] = useAnalyticsQuery()
  const [expanded, setExpanded] = useExpanded(query)
  const [filters, setFilters] = useState(false)
  const answer = useAnswer(query, { topN: expanded ? 100 : 25, facets: false, years: true })
  const namer = useNamer(query, answer)
  return (
    <Shell>
      <div className={STICKY}>
        <RuledFrame className="pb-3 pt-2">
          <CommandBar query={query} answer={answer} namer={namer} onChange={move} onFilters={() => setFilters(true)} />
        </RuledFrame>
      </div>
      <RuledFrame className="py-8 sm:py-10">
        {/* The marker rides the headline's last line, outside the heading: the heading says the question only. */}
        <div className="max-w-4xl">
          <h1 className="inline text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[2rem]">{headline(query, namer)}</h1>{' '}
          <span className="inline-block align-middle">
            <NotesMarker query={query} answer={answer} />
          </span>
        </div>
        <TrendFigures query={query} answer={answer} onChange={move} className="mt-8" />
        <GroupBar query={query} onChange={move} className="mt-12" />
        {query.dupa.axis === 'timp' ? (
          <CleanTime query={query} answer={answer} onChange={move} className="mt-4" />
        ) : (
          <CleanTable query={query} answer={answer} namer={namer} onChange={move} expanded={expanded} onExpand={setExpanded} className="mt-3" />
        )}
        <RecordsBlock key={recordsKey(query)} query={query} answer={answer} className="mt-12" />
        <SourceLine query={query} answer={answer} className="mt-12 border-t pt-4" />
      </RuledFrame>
      <FilterSheet query={query} answer={answer} namer={namer} onChange={move} open={filters} onOpenChange={setFilters} />
    </Shell>
  )
}
