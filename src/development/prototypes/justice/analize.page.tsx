import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { AnalysisFigures } from '@/features/justice/components/analysis/analysis-figures'
import { AnalysisFilters } from '@/features/justice/components/analysis/analysis-filters'
import { AnalysisHead } from '@/features/justice/components/analysis/analysis-head'
import { AnalysisLevels } from '@/features/justice/components/analysis/analysis-levels'
import { AnalysisYears } from '@/features/justice/components/analysis/analysis-years'
import { JusticeAnalysis } from '@/features/justice/components/analysis/justice-analysis-page'
import { JusticeSourceLine } from '@/features/justice/components/justice-source-line'
import { ANALYSIS_SEARCH_KEYS, questionOf, searchOf, sourceOf, type Question } from '@/features/justice/lib/analysis-model'
import { asOfOf } from '@/features/justice/lib/analysis-notes'
import { COLUMNS, CrossBar, CrossTable, type Columns } from './analize.cross'
import { PROTOTYPE_MARKER } from './hub.parts'

/**
 * The justice analysis page's two variants over the live components
 * (design.md §15). `clasament` (the owner's pick, 7 October 2026) is the
 * live page itself, its question in the prototype's address; `incrucisat`
 * keeps its cross table on the live head, bar, figures, years and panel.
 */

/** The prototype's address: the live page's keys, the cross's columns, and the harness's own (`v`, `layout`) kept. */
function usePrototypeQuestion(): { readonly question: Question; readonly columns: Columns; readonly move: (next: Question, columns?: Columns) => void } {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const columns = COLUMNS.find((key) => key === search.coloane) ?? 'ani'
  const move = (next: Question, nextColumns: Columns = columns) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => {
        const kept = Object.fromEntries(Object.entries(previous).filter(([key]) => !(ANALYSIS_SEARCH_KEYS as readonly string[]).includes(key) && key !== 'coloane'))
        return { ...kept, ...searchOf(next), ...(nextColumns === 'ani' ? {} : { coloane: nextColumns }) }
      },
      resetScroll: false,
    })
  return { question: questionOf(search), columns, move }
}

export function AnalyzeRanking() {
  const { question, move } = usePrototypeQuestion()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <JusticeAnalysis question={question} onChange={move} />
    </div>
  )
}

export function AnalyzeCross() {
  const { question, columns, move } = usePrototypeQuestion()
  const [filters, setFilters] = useState(false)
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background">
      <AnalysisHead question={question} onChange={move} onFilters={() => setFilters(true)} />
      <AnalysisLevels question={question} onChange={move} />
      <AnalysisFigures question={question} />
      <section className="border-b" aria-label={t`Răspunsul`}>
        <RuledFrame className="py-12 sm:py-16">
          <CrossBar question={question} columns={columns} onChange={move} onColumns={(next) => move(question, next)} />
          <CrossTable question={question} columns={columns} onChange={move} />
        </RuledFrame>
      </section>
      <AnalysisYears question={question} onChange={move} />
      <RuledFrame className="py-8">
        <JusticeSourceLine asOf={asOfOf(sourceOf(question))} archiveAsOf={asOfOf('iccj')} source={sourceOf(question)} notes={[]} />
      </RuledFrame>
      <AnalysisFilters question={question} open={filters} onOpenChange={setFilters} onChange={move} />
    </div>
  )
}
