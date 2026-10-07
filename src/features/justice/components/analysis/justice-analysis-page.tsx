import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { questionOf, searchOf, siteSearchOf, sourceOf, type Question } from '../../lib/analysis-model'
import { asOfOf } from '../../lib/analysis-notes'
import { analysisDocumentTitle } from '../../lib/analysis-text'
import { JusticeSourceLine } from '../justice-source-line'
import { AnalysisFigures } from './analysis-figures'
import { AnalysisFilters } from './analysis-filters'
import { AnalysisHead } from './analysis-head'
import { AnalysisLevels } from './analysis-levels'
import { AnalysisAnswer } from './analysis-table'
import { AnalysisYears } from './analysis-years'

/**
 * `/justice/analytics` (design.md §15–16): one question about the courts'
 * cases — which courts, which matters, at which step, which year, grouped by
 * what — written in the address and answered on the page. Every control
 * writes the address: a question is a link, and Back is the question before.
 * The site's own keys (`lang`) stay through every change.
 */
export function JusticeAnalysisPage({ search }: { readonly search: Readonly<Record<string, unknown>> }) {
  const navigate = useNavigate({ from: '/justice/analytics' })
  const question = questionOf(search)
  const move = (next: Question) => void navigate({ search: (previous) => ({ ...siteSearchOf(previous), ...searchOf(next) }), resetScroll: false })
  return <JusticeAnalysis question={question} onChange={move} />
}

/**
 * The page itself, its question given: the route binds it to the address, a
 * prototype to its own. In the procurement analysis's language: the head
 * with the question as the headline, the levels in the pinned bar, the
 * figures, the answer under a grouping's tabs, the years, the source; every
 * filter in a sheet.
 */
export function JusticeAnalysis({ question, onChange }: { readonly question: Question; readonly onChange: (question: Question) => void }) {
  const { i18n } = useLingui()
  const [filters, setFilters] = useState(false)
  const source = sourceOf(question)
  // A court's arrow opens its page: have its code before the tap.
  useWarmRouteCode('/justice/courts/$code')
  // The browser tab says the question; the route's head gives every question the page's own title.
  useClientDocumentTitle(analysisDocumentTitle(i18n, question))
  return (
    // Clip, not hide: the crux marks overhang the frame, and a hidden overflow would unstick the bar.
    <div className="relative w-full overflow-x-clip bg-background">
      <AnalysisHead question={question} onChange={onChange} onFilters={() => setFilters(true)} />
      <AnalysisLevels question={question} onChange={onChange} />
      <AnalysisFigures question={question} />
      <section className="border-b" aria-label={t`Răspunsul`}>
        <RuledFrame className="py-12 sm:py-16">
          <AnalysisAnswer question={question} onChange={onChange} />
        </RuledFrame>
      </section>
      <AnalysisYears question={question} onChange={onChange} />
      <RuledFrame className="py-8">
        <JusticeSourceLine asOf={asOfOf(source)} archiveAsOf={asOfOf('iccj')} source={source} notes={[]} />
      </RuledFrame>
      <AnalysisFilters question={question} open={filters} onOpenChange={setFilters} onChange={onChange} />
    </div>
  )
}
