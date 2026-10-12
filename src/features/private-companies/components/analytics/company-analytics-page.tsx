import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { isAnalyticsUnavailable } from '../../api/company-analytics-api'
import { useCompanyAnalyticsRouteAddress } from '../../hooks/use-company-analytics'
import { useCompanyAnalyticsPage, type CompanyAnalyticsPageData } from '../../hooks/use-company-analytics-page'
import { sentenceOf } from '../../lib/company-analytics-sentence'
import { Answer, BareFigures, ModeBar } from './analytics-answer'
import { AnalyticsFilterSheet } from './analytics-filter-sheet'
import { AnalyticsHead } from './analytics-head'
import { QuestionProblemsNotice, ReleaseRefusedNotice, UnavailableNotice, UnreadNotice } from './analytics-notices'
import { SourceLine } from './analytics-source'
import { YearsBand } from './analytics-years'

/**
 * `/companies/analytics`: one question about Romanian companies' annual
 * statements — which companies, where, what they are, which year, which
 * measure — written in the address and answered on the page, in the NGO
 * registry's and the procurement analysis's language (promoted from the
 * prototype `companies/analytics`, variant `propozitie`; design:
 * docs/design/companies/design.md):
 *
 * - the head: the data's date and sources, the selection as the headline in a
 *   room of fixed height (each filter a phrase with its ✕), the fiscal year
 *   and the measure as dropdowns, a search box to add a filter, the filters,
 *   the ready questions, the link, the notes;
 * - the pinned bar: the sentence, and how the answer is shown — a table, a
 *   map, charts (`mod`);
 * - four bare figures, then the answer: the companies, each open axis ranked
 *   and drillable, the years — as a table or as charts — or the measure by
 *   county and, in one county, by locality on the map;
 * - the fiscal years' band, the source, the filters panel.
 *
 * Every read is pinned to one release, resolved once; a release the API
 * refuses — on any read — withdraws every figure of the page at once, is
 * said, and only the reader moves to the current one.
 */

/** What the page says before or instead of an answer: an address it could not read, a refused release, the API down, a question it cannot ask. */
function Notices({ page }: { readonly page: CompanyAnalyticsPageData }) {
  const { state, release, withdrawn, pinned, question } = page
  return (
    <>
      {state.unread.length > 0 ? <UnreadNotice keys={state.unread} /> : null}
      {withdrawn ? (
        <ReleaseRefusedNotice pin={pinned} onRefresh={page.refresh} />
      ) : release.isError ? (
        <UnavailableNotice unavailable={isAnalyticsUnavailable(release.error)} onRetry={() => void release.refetch()} />
      ) : question && question.problems.length > 0 ? (
        <QuestionProblemsNotice problems={question.problems} />
      ) : null}
    </>
  )
}

function Foot({ page }: { readonly page: CompanyAnalyticsPageData }) {
  const { state, live, question, stats, uats, statusNames, locale, withdrawn, filtersOpen, setFiltersOpen, move } = page
  return (
    <>
      {page.answerable && live && question ? <YearsBand state={state} release={live} question={question} onChange={move} /> : null}
      {live ? (
        <RuledFrame className="py-8">
          <SourceLine release={live} />
        </RuledFrame>
      ) : null}
      {/* Its counts and option lists are the release's figures too: gone with it. */}
      {withdrawn ? null : (
        <AnalyticsFilterSheet
          state={state}
          release={live}
          question={question}
          stats={stats.data}
          uats={uats}
          statusNames={statusNames}
          locale={locale}
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          onChange={move}
        />
      )}
    </>
  )
}

/** The page from its data: the route's, or the design harness's. */
export function CompanyAnalyticsView({ page }: { readonly page: CompanyAnalyticsPageData }) {
  return (
    // Clip, not hide: the crux marks overhang the frame, and a hidden overflow would unstick the bar.
    <div className="relative w-full overflow-x-clip bg-background">
      <AnalyticsHead page={page} onFilters={() => page.setFiltersOpen(true)} />
      <Notices page={page} />
      <ModeBar page={page} />
      {page.answerable ? (
        <>
          <BareFigures page={page} />
          <Answer page={page} />
        </>
      ) : page.release.isPending && !page.withdrawn ? (
        <div className="h-96 animate-pulse border-b bg-muted/20" aria-hidden="true" />
      ) : null}
      <Foot page={page} />
    </div>
  )
}

export function CompanyAnalyticsPage() {
  const page = useCompanyAnalyticsPage(useCompanyAnalyticsRouteAddress())
  const headline = page.question ? sentenceOf(page) : null
  useClientDocumentTitle(headline ? `${headline} — Transparenta.eu` : null)
  return <CompanyAnalyticsView page={page} />
}
