import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import {
  useCompanyAnalysisOptions,
  useCompanyAnalysisRelease,
  useCompanyAnalysisStats,
  useResolvedQuestion,
} from '@/features/private-companies/hooks/use-company-analytics'
import { useReleaseWithdrawal } from '@/features/private-companies/hooks/use-release-withdrawal'
import { useUatIndex } from '@/features/private-companies/hooks/use-uat-index'
import { localeOf } from '@/features/private-companies/lib/company-analytics-format'
import type { ScopeNames } from '@/features/private-companies/lib/company-analytics-scope-text'
import { analyticsSearchOf, stateOf, urlSearchOf, type CompanyAnalyticsState } from '@/features/private-companies/lib/company-analytics-url'

/**
 * The analytics page's data, as `/companies/analytics` reads it, driven from
 * the prototype's own address: the same URL model (`stateOf`, `urlSearchOf`),
 * the same release pin and withdrawal, the same question and reads. Only the
 * two route-bound hooks are replaced — the state comes from `useSearch`
 * without a route, and a move keeps the harness's keys.
 *
 * How the answer is shown — a table, a map, charts — is the prototype's one
 * key the page's model does not have yet: `mod` (`harta`, `grafice`; the
 * table without it), kept on every move like the harness's own.
 */

export type AnalyticsMode = 'tabel' | 'harta' | 'grafice'

const MODE_WORDS: Readonly<Record<Exclude<AnalyticsMode, 'tabel'>, string>> = { harta: 'harta', grafice: 'grafice' }

/** The harness's own keys, the site's language and the mode, kept on every move. */
const KEPT = ['v', 'layout', 'lang', 'mod'] as const

export type AnalyticsPageData = ReturnType<typeof useAnalyticsPage>

function modeOf(word: unknown): AnalyticsMode {
  return word === MODE_WORDS.harta ? 'harta' : word === MODE_WORDS.grafice ? 'grafice' : 'tabel'
}

/** The address of a state, the harness's keys and the mode kept (or the mode given). */
function searchFor(previous: Record<string, unknown>, next: CompanyAnalyticsState, mode?: AnalyticsMode): Record<string, unknown> {
  const kept: Record<string, unknown> = Object.fromEntries(KEPT.filter((key) => previous[key] !== undefined).map((key) => [key, previous[key]]))
  if (mode !== undefined) {
    delete kept.mod
    if (mode !== 'tabel') kept.mod = MODE_WORDS[mode]
  }
  return { ...kept, ...urlSearchOf(next) }
}

export function useAnalyticsPage() {
  const { i18n } = useLingui()
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const state = stateOf(analyticsSearchOf(search))
  const mode = modeOf(search.mod)
  const navigate = useNavigate()
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
  const statuses = useCompanyAnalysisOptions(question, 'OBSERVED_STATUS', Boolean(state.scope.observedStatus?.in?.length))
  const names: ScopeNames = {
    uats: uats.names,
    statuses: new Map((statuses.data?.groups ?? []).flatMap((group) => (group.key && group.label ? [[group.key, group.label] as const] : []))),
  }
  const pin = (next: CompanyAnalyticsState) => ({ ...next, release: next.release ?? pinned })
  /** A new question, answered in place, pinned to its release, in the same mode — or in the one given. */
  const move = (next: CompanyAnalyticsState, nextMode?: AnalyticsMode) =>
    void navigate({ to: '.', search: (previous: Record<string, unknown>) => searchFor(previous, pin(next), nextMode), resetScroll: false })
  /** Where a narrower question opens, for a link: in the same mode, or the one given. */
  const linkTo = (next: CompanyAnalyticsState, nextMode?: AnalyticsMode) => ({
    to: '.' as const,
    search: (previous: Record<string, unknown>) => searchFor(previous, pin(next), nextMode),
    resetScroll: false,
  })
  const answerable = Boolean(live && question && question.problems.length === 0)
  return { state, mode, release, live, pinned, withdrawn, question, stats, filtersOpen, setFiltersOpen, uats, names, move, linkTo, answerable, locale: localeOf(i18n.locale) }
}
