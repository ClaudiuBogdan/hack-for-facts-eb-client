import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { BarChart3, Building2, LineChart, type LucideIcon } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { cn } from '@/lib/utils'
import { isAnalyticsUnavailable } from '../../api/company-analytics-api'
import {
  useCompanyAnalysisOptions,
  useCompanyAnalysisRelease,
  useCompanyAnalysisStats,
  useCompanyAnalyticsMove,
  useCompanyAnalyticsState,
  useReleaseRefresh,
  useResolvedQuestion,
} from '../../hooks/use-company-analytics'
import { useReleaseWithdrawal } from '../../hooks/use-release-withdrawal'
import { useUatIndex } from '../../hooks/use-uat-index'
import { recordsKeyOf, type AnalyticsPanel, type CompanyAnalyticsState } from '../../lib/company-analytics-url'
import { headlineOf } from '../../lib/company-analytics-view'
import { AnalyticsBreakdown } from './analytics-breakdown'
import { AnalyticsEvolution } from './analytics-evolution'
import { AnalyticsFigures } from './analytics-figures'
import { AnalyticsFilterSheet } from './analytics-filter-sheet'
import { AnalyticsHead } from './analytics-head'
import { QuestionProblemsNotice, ReleaseRefusedNotice, UnavailableNotice, UnreadNotice } from './analytics-notices'
import { AnalyticsRecords } from './analytics-records'
import { SourceLine } from './analytics-source'
import { YearsBand } from './analytics-years'

/**
 * `/companies/analytics`: one question about Romanian companies' annual
 * statements — which companies, where, what they are, which year, which
 * measure — written in the address and answered on the page, on the
 * procurement analysis's pattern: the head with the question as its
 * headline, the pinned bar with the three answers (the companies
 * themselves first, then a breakdown and the years), the figures band, the
 * answer, the fiscal years in a band of their own and the source at the
 * foot. Every read is pinned to one release, resolved once; a release the
 * API refuses — on any read, the list's next page and a filter's options
 * included — withdraws every figure of the page at once, is said, and only
 * the reader moves to the current one.
 */

const PANELS: readonly { readonly key: AnalyticsPanel; readonly icon: LucideIcon }[] = [
  { key: 'firme', icon: Building2 },
  { key: 'defalcare', icon: BarChart3 },
  { key: 'evolutie', icon: LineChart },
]

function panelLabel(panel: AnalyticsPanel): string {
  if (panel === 'firme') return t`Firmele`
  if (panel === 'defalcare') return t`Defalcare`
  return t`Evoluție`
}

function PanelNav({ state, headline, onChange }: { readonly state: CompanyAnalyticsState; readonly headline: string | null; readonly onChange: (next: CompanyAnalyticsState) => void }) {
  return (
    <nav aria-label={t`Răspunsul`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        {headline ? <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground md:block md:max-w-md">{headline}</span> : null}
        <ol className="grid w-full grid-cols-3 gap-3 sm:flex sm:w-auto sm:shrink-0 sm:gap-6 md:ml-auto">
          {PANELS.map(({ key, icon: Icon }) => {
            const active = state.panel === key
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...state, panel: key })}
                  className={cn(
                    'flex h-full min-h-11 w-full items-center gap-2 border-b-2 py-2 text-left text-sm leading-tight transition-colors sm:w-auto sm:py-0',
                    active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', active && 'text-primary')} aria-hidden="true" />
                  {panelLabel(key)}
                </button>
              </li>
            )
          })}
        </ol>
      </RuledFrame>
    </nav>
  )
}

export function CompanyAnalyticsPage() {
  const { i18n } = useLingui()
  const state = useCompanyAnalyticsState()
  const release = useCompanyAnalysisRelease(state.release)
  const pinned = release.data?.release.releaseId ?? state.release
  // A refusal of the release by any read withdraws the whole page (`use-release-withdrawal.ts`):
  // no figure, list, panel or count of it is read or shown, and only the reader's refresh moves on.
  const withdrawn = useReleaseWithdrawal(pinned)
  const move = useCompanyAnalyticsMove(pinned)
  const refresh = useReleaseRefresh(state, withdrawn ? pinned : null)
  const resolved = useResolvedQuestion(state, release.data)
  const question = withdrawn ? null : resolved
  const live = withdrawn ? undefined : release.data
  const stats = useCompanyAnalysisStats(question)
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Localities by name only once one is on screen or being looked for (the map's files weigh 3 MB).
  const uats = useUatIndex(filtersOpen || Boolean(state.scope.uat?.in?.length))
  // Status labels for the chips, from the year's own population.
  const statuses = useCompanyAnalysisOptions(question, 'OBSERVED_STATUS', Boolean(state.scope.observedStatus?.in?.length))
  const names = {
    uats: uats.names,
    statuses: new Map((statuses.data?.groups ?? []).flatMap((group) => (group.key && group.label ? [[group.key, group.label] as const] : []))),
  }
  const headline = question ? headlineOf(state, question, names) : null
  useClientDocumentTitle(headline ? `${headline} — Transparenta.eu` : null)

  const answerable = Boolean(live && question && question.problems.length === 0)
  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <AnalyticsHead state={state} release={live} question={question} names={names} onChange={move} onFilters={() => setFiltersOpen(true)} />
      {state.unread.length > 0 ? <UnreadNotice keys={state.unread} /> : null}
      {withdrawn ? (
        <ReleaseRefusedNotice pin={pinned} onRefresh={refresh} />
      ) : release.isError ? (
        <UnavailableNotice unavailable={isAnalyticsUnavailable(release.error)} onRetry={() => void release.refetch()} />
      ) : question && question.problems.length > 0 ? (
        <QuestionProblemsNotice problems={question.problems} />
      ) : null}
      <PanelNav state={state} headline={headline} onChange={move} />
      {answerable && question && live ? (
        <>
          <AnalyticsFigures stats={stats.data} question={question} isError={stats.isError} onRetry={() => void stats.refetch()} />
          <section className="border-b" aria-label={panelLabel(state.panel)}>
            <RuledFrame className="py-12 sm:py-16">
              {state.panel === 'firme' ? (
                <AnalyticsRecords
                  key={recordsKeyOf({ release: question.release, scopeKey: question.scope, year: question.year, sort: question.sortMetric === null ? 'CUI' : 'METRIC', sortMetric: question.sortMetric, direction: question.direction })}
                  state={state}
                  question={question}
                  onChange={move}
                />
              ) : state.panel === 'defalcare' ? (
                <AnalyticsBreakdown state={state} question={question} onChange={move} />
              ) : (
                <AnalyticsEvolution state={state} question={question} release={live} uatNames={uats.names} onChange={move} />
              )}
            </RuledFrame>
          </section>
          <YearsBand state={state} release={live} question={question} onChange={move} />
        </>
      ) : release.isPending && !withdrawn ? (
        <div className="h-96 animate-pulse border-b bg-muted/20" aria-hidden="true" />
      ) : null}
      {live ? (
        <RuledFrame className="py-8">
          <SourceLine release={live} />
        </RuledFrame>
      ) : null}
      {/* Its counts and option lists are the release's figures too: gone with it. */}
      {withdrawn ? null : (
        <AnalyticsFilterSheet state={state} release={live} question={question} stats={stats.data} uats={uats} locale={i18n.locale} open={filtersOpen} onOpenChange={setFiltersOpen} onChange={move} />
      )}
    </div>
  )
}
