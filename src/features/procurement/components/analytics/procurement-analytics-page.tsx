import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { useAnalyticsQuery, useAnswer, useNamer, usePopulationCounts } from '../../hooks/use-procurement-analytics'
import { documentTitleOf } from '../../lib/analytics-head'
import { searchOf, type Query } from '../../lib/analytics-model'
import { AnswerRecords, AnswerTable, AnswerTime, SourceLine } from './analytics-answer'
import { GroupBar } from './analytics-controls'
import { FilterSheet } from './analytics-filters'
import { AnalyticsFigures, AnalyticsHead, PopulationNav } from './analytics-head'
import { YearsBand } from './analytics-years'

/** „Arată primele 100" for the question it was asked on only: another question, or Back, opens at 25. */
function useExpanded(query: Query): readonly [boolean, (expanded: boolean) => void] {
  const key = JSON.stringify(searchOf(query))
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  return [expandedFor === key, (expanded: boolean) => setExpandedFor(expanded ? key : null)] as const
}

/** The records keyed by the selection: their own state (the order, the page) starts over with a new one. */
function recordsKey(query: Query): string {
  return JSON.stringify([query.tip, query.filters, query.period, query.titlu, query.valoare])
}

/**
 * `/procurement/analytics` (design.md §18): the head on the procurement
 * profiles' grid — the way back, the period and how recent its data is; the
 * question as the headline, a filter's phrase opening the panel, its ✕
 * dropping it; what adds to the query and the caveats' marker — then the
 * pinned bar with the three populations, the figures band, the answer (the
 * records themselves, a table of every measure, or a chart in time), the
 * years in a band of their own, and the source at the foot. Every control
 * writes the address: a question is a link.
 */
export function ProcurementAnalyticsPage() {
  const [query, move, strings] = useAnalyticsQuery()
  const [expanded, setExpanded] = useExpanded(query)
  const [filters, setFilters] = useState(false)
  const answer = useAnswer(query, { topN: expanded ? 100 : 25, years: true })
  const namer = useNamer(query, answer)
  const counts = usePopulationCounts(query)
  // The browser tab says the question, as the route's head would with every name read: its own title stays on a client navigation.
  const { i18n } = useLingui()
  useClientDocumentTitle(documentTitleOf(i18n, strings, query, namer))
  return (
    // Clip, not hide: the crux marks overhang the frame, and a hidden overflow would unstick the bar.
    <div className="relative w-full overflow-x-clip bg-background">
      <AnalyticsHead query={query} answer={answer} namer={namer} onChange={move} onFilters={() => setFilters(true)} />
      <PopulationNav query={query} namer={namer} counts={counts} onChange={move} />
      <AnalyticsFigures query={query} answer={answer} />
      <section className="border-b" aria-label={t`Răspunsul`}>
        <RuledFrame className="py-12 sm:py-16">
          <GroupBar query={query} onChange={move} />
          {query.dupa.axis === 'inregistrari' ? (
            <AnswerRecords key={recordsKey(query)} query={query} answer={answer} onChange={move} className="mt-3" />
          ) : query.dupa.axis === 'timp' ? (
            <AnswerTime query={query} answer={answer} onChange={move} className="mt-4" />
          ) : (
            <AnswerTable query={query} answer={answer} namer={namer} onChange={move} expanded={expanded} onExpand={setExpanded} className="mt-3" />
          )}
        </RuledFrame>
      </section>
      <YearsBand query={query} answer={answer} onChange={move} />
      <RuledFrame className="py-8">
        <SourceLine query={query} answer={answer} />
      </RuledFrame>
      <FilterSheet query={query} answer={answer} namer={namer} onChange={move} open={filters} onOpenChange={setFilters} />
    </div>
  )
}
