import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { localeOf } from '../lib/company-analytics-format'
import type { ScopeNames } from '../lib/company-analytics-scope-text'
import { analyticsSearchOf, stateOf, type CompanyAnalyticsState } from '../lib/company-analytics-url'
import {
  useCompanyAnalysisOptions,
  useCompanyAnalysisRelease,
  useCompanyAnalysisStats,
  useReleaseRefresh,
  useResolvedQuestion,
  type CompanyAnalyticsAddress,
} from './use-company-analytics'
import { useReleaseWithdrawal } from './use-release-withdrawal'
import { useUatIndex } from './use-uat-index'

/**
 * Everything the analysis page reads and every way it moves, from an
 * address — the route's, or the design harness's: the question, the release
 * it is pinned to (resolved once) and its withdrawal, the question resolved
 * against the release, the figures, the names a headline needs, the filters
 * panel's open state. A release the API refuses on any read withdraws every
 * figure at once (`use-release-withdrawal.ts`); only the reader's refresh
 * moves to the current one. Every question asked from the page names the
 * release it was answered from, so a shared link reads the same figures.
 */
export function useCompanyAnalyticsPage(address: CompanyAnalyticsAddress) {
  const { i18n } = useLingui()
  const state = stateOf(analyticsSearchOf(address.search))
  const release = useCompanyAnalysisRelease(state.release)
  const pinned = release.data?.release.releaseId ?? state.release
  const withdrawn = useReleaseWithdrawal(pinned)
  const resolved = useResolvedQuestion(state, release.data)
  const question = withdrawn ? null : resolved
  const live = withdrawn ? undefined : release.data
  const stats = useCompanyAnalysisStats(question)
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Localities by name only once one is on screen or being looked for (the map's files weigh 3 MB).
  const uats = useUatIndex(filtersOpen || Boolean(state.scope.uat?.in?.length))
  // Status labels for the headline and the ONRC observations, from the year's own population.
  const statuses = useCompanyAnalysisOptions(question, 'OBSERVED_STATUS', Boolean(state.scope.observedStatus?.in?.length || state.scope.onrc?.status?.length || state.scope.onrc?.exclude?.status?.length))
  const statusNames: ReadonlyMap<string, string> = new Map((statuses.data?.groups ?? []).flatMap((group) => (group.key && group.label ? [[group.key, group.label] as const] : [])))
  const names: ScopeNames = { uats: uats.names, statuses: statusNames }
  const pin = (next: CompanyAnalyticsState): CompanyAnalyticsState => ({ ...next, release: next.release ?? pinned })
  /** A new question, answered in place, pinned to the page's release. */
  const move = (next: CompanyAnalyticsState) => void address.go(pin(next))
  /** Where a narrower question opens, for a link. */
  const linkTo = (next: CompanyAnalyticsState) => address.link(pin(next))
  const refresh = useReleaseRefresh(state, withdrawn ? pinned : null, address.go)
  const answerable = Boolean(live && question && question.problems.length === 0)
  return {
    state,
    mode: state.mode,
    release,
    live,
    pinned,
    withdrawn,
    question,
    stats,
    filtersOpen,
    setFiltersOpen,
    uats,
    names,
    statusNames,
    move,
    linkTo,
    refresh,
    answerable,
    locale: localeOf(i18n.locale),
  }
}

export type CompanyAnalyticsPageData = ReturnType<typeof useCompanyAnalyticsPage>
