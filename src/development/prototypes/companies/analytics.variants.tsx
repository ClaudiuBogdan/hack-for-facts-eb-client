import type { ReactNode } from 'react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { isAnalyticsUnavailable } from '@/features/private-companies/api/company-analytics-api'
import { AnalyticsFilterSheet } from '@/features/private-companies/components/analytics/analytics-filter-sheet'
import { QuestionProblemsNotice, ReleaseRefusedNotice, UnavailableNotice, UnreadNotice } from '@/features/private-companies/components/analytics/analytics-notices'
import { SourceLine } from '@/features/private-companies/components/analytics/analytics-source'
import { YearsBand } from '@/features/private-companies/components/analytics/analytics-years'
import { Answer, BareFigures, ModeBar } from './analytics.answer'
import { useAnalyticsPage, type AnalyticsPageData } from './analytics.data'
import { SentenceHead } from './analytics.head'

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

/** What the page says before or instead of an answer: an address it could not read, a refused release, the API down, a question it cannot ask. */
function Notices({ page }: { readonly page: AnalyticsPageData }) {
  const { state, release, withdrawn, pinned, question } = page
  return (
    <>
      {state.unread.length > 0 ? <UnreadNotice keys={state.unread} /> : null}
      {withdrawn ? (
        <ReleaseRefusedNotice pin={pinned} onRefresh={() => page.move({ ...state, release: null })} />
      ) : release.isError ? (
        <UnavailableNotice unavailable={isAnalyticsUnavailable(release.error)} onRetry={() => void release.refetch()} />
      ) : question && question.problems.length > 0 ? (
        <QuestionProblemsNotice problems={question.problems} />
      ) : null}
    </>
  )
}

function Foot({ page }: { readonly page: AnalyticsPageData }) {
  const { state, live, question, stats, uats, locale, withdrawn, filtersOpen, setFiltersOpen, move } = page
  return (
    <>
      {page.answerable && live && question ? <YearsBand state={state} release={live} question={question} onChange={move} /> : null}
      {live ? (
        <RuledFrame className="py-8">
          <SourceLine release={live} />
        </RuledFrame>
      ) : null}
      {withdrawn ? null : (
        <AnalyticsFilterSheet state={state} release={live} question={question} stats={stats.data} uats={uats} statusNames={page.names.statuses ?? new Map()} locale={locale} open={filtersOpen} onOpenChange={setFiltersOpen} onChange={move} />
      )}
    </>
  )
}

/**
 * `propozitie` — the procurement analytics page's anatomy: the selection as
 * the headline, the year and the measure as the controls row's dropdowns,
 * the pinned bar's ways to show the answer (a table, a map, charts), four
 * bare figures, one tab per open axis over the table or the charts.
 */
export function AnalyticsPropozitie() {
  const page = useAnalyticsPage()
  return (
    <Shell>
      <SentenceHead page={page} onFilters={() => page.setFiltersOpen(true)} />
      <Notices page={page} />
      <ModeBar page={page} />
      {page.answerable ? (
        <>
          <BareFigures page={page} />
          <Answer page={page} />
        </>
      ) : page.release.isPending ? (
        <div className="h-96 animate-pulse border-b bg-muted/20" aria-hidden="true" />
      ) : null}
      <Foot page={page} />
    </Shell>
  )
}
