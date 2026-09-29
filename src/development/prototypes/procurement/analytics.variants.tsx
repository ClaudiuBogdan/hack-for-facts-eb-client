import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { searchOf, type Query } from './analytics.model'
import { useAnswer } from './analytics.data'
import { GroupBar, useAnalyticsQuery, useNamer } from './analytics.parts'
import { CleanTable, CleanTime, RecordsTable, SourceLine } from './analytics.clean'
import { YearsBand } from './analytics.years'
import { FilterSheet } from './analytics.filters'
import { GridFigures, GridHead, PopulationNav } from './analytics.heads'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

function Shell({ children }: { readonly children: ReactNode }) {
  return (
    // Clip, not hide: the crux marks overhang the frame, and a hidden overflow would unstick the bar.
    <div className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────── the page ──

/** „Arată primele 100" for the question it was asked on only: another question, or Back, opens at 25. */
function useExpanded(query: Query): readonly [boolean, (expanded: boolean) => void] {
  const key = JSON.stringify(searchOf(query))
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  return [expandedFor === key, (expanded: boolean) => setExpandedFor(expanded ? key : null)] as const
}

/** The records' block keyed by the selection: its own state (asked, the order) starts over with a new one. */
function recordsKey(query: Query): string {
  return JSON.stringify([query.tip, query.filters, query.period, query.titlu, query.valoare])
}

/**
 * The analytics page (`propozitie`): the head on the procurement profiles'
 * grid — the way back, the period and how recent its data is; the question
 * as the headline, a filter's phrase opening the panel, its ✕ dropping it;
 * what adds to the query and the caveats' marker; the cross on its bottom
 * rule — then the pinned bar with the three populations, the figures band,
 * the answer (the records themselves, a table of every measure, or a chart
 * in time) and the years in a band of the same frame, the source at the foot.
 */
export function AnalyticsPropozitie() {
  const [query, move] = useAnalyticsQuery()
  const [expanded, setExpanded] = useExpanded(query)
  const [filters, setFilters] = useState(false)
  const answer = useAnswer(query, { topN: expanded ? 100 : 25, years: true })
  const namer = useNamer(query, answer)
  return (
    <Shell>
      <GridHead query={query} answer={answer} namer={namer} onChange={move} onFilters={() => setFilters(true)} />
      <PopulationNav query={query} namer={namer} onChange={move} />
      <GridFigures query={query} answer={answer} />
      <section className="border-b" aria-label={t`Răspunsul`}>
        <RuledFrame className="py-12 sm:py-16">
          <GroupBar query={query} onChange={move} />
          {query.dupa.axis === 'inregistrari' ? (
            <RecordsTable key={recordsKey(query)} query={query} answer={answer} className="mt-3" />
          ) : query.dupa.axis === 'timp' ? (
            <CleanTime query={query} answer={answer} onChange={move} className="mt-4" />
          ) : (
            <CleanTable query={query} answer={answer} namer={namer} onChange={move} expanded={expanded} onExpand={setExpanded} className="mt-3" />
          )}
        </RuledFrame>
      </section>
      <YearsBand query={query} answer={answer} onChange={move} />
      <RuledFrame className="py-8">
        <SourceLine query={query} answer={answer} />
      </RuledFrame>
      <FilterSheet query={query} answer={answer} namer={namer} onChange={move} open={filters} onOpenChange={setFilters} />
    </Shell>
  )
}
