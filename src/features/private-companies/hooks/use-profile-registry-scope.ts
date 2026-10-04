import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { isRegistryPublished } from '@/schemas/private-company-registry'
import { fetchCompanyRegistrationDiff } from '../api/company-registry-api'
import { isRegistryParentMissing, isRegistryRefusal, retryRegistryRead } from '../api/company-registry-errors'
import { privateCompanyProfileQueryKey } from './use-private-company-profile'
import { boundScopeKey, useRegistryReadLedger, useReportRegistryMove, type CompanyRegistryScope } from './use-company-registry-scope'

/**
 * What the profile page may show of a company under its pinned ONRC scope.
 *
 * - `show`: an answer whose own scope is the pinned one; or, only while the
 *   page's first registry read is pending, the server's own answer for the
 *   document being hydrated (`useDocumentBootstrap`). A profile kept by the
 *   query cache or the router from an earlier visit is never shown before the
 *   check: it waits for the pin like any other answer.
 * - `checking`: nothing is shown while the registry or the company is read
 *   again: no pin yet, a refusal reported, an answer of another scope, a
 *   dependent read that found the company gone from the directory, or one the
 *   registry refused (until a read started after that refusal is accepted).
 * - `moved`: the registry moved under the page; hidden until the reader asks.
 * - `unreadable`: the registry could not be read, the company's presence
 *   could not be settled, or the registry refused the comparison again after
 *   it was re-read; hidden, with a retry.
 */
export type ProfileScopeVerdict =
  | { readonly status: 'show'; readonly profile: PrivateCompanyProfile }
  | { readonly status: 'checking' }
  | { readonly status: 'moved'; readonly accept: () => void }
  | { readonly status: 'unreadable'; readonly retry: () => void }

const CHECKING: ProfileScopeVerdict = { status: 'checking' }

export function useProfileRegistryScope(
  /** The newest answer the route holds for the CUI: the browser's own read, or the document's while that read is pending. */
  profile: PrivateCompanyProfile,
  /** The document's own answer, when this page hydrates it; undefined otherwise. */
  bootstrap: PrivateCompanyProfile | undefined,
  cui: string,
  scope: CompanyRegistryScope,
) {
  const queryClient = useQueryClient()
  const pinned = scope.status === 'ready' ? scope.pinned.registry.scopeKey : null
  const answered = profile.registry.registry.scopeKey
  // Answers a dependent read has withdrawn: never shown again, whatever their scope.
  const [withdrawn, setWithdrawn] = useState<readonly PrivateCompanyProfile[]>([])
  const live = !withdrawn.includes(profile)
  const current = live && pinned !== null && answered === pinned
  const diff = useCompanyRegistrationDiff(cui, current && boundScopeKey(scope) !== null ? profile : null, scope)
  // The diff read found no directory company for the CUI: hidden from this render on, never „not registered".
  const gone = current && isRegistryParentMissing(diff.error)
  // The diff read was refused by the registry — its scope moved, or access could not be rechecked: the scope the
  // profile was answered under is in doubt, so the profile is hidden from this render on, and while that refusal's
  // episode is open (until a diff read started after it is accepted). `company: null` is the withdrawal above, and an
  // ordinary failed diff only a missing comparison: neither puts the profile in doubt.
  const refusedNow = current && !gone && isRegistryRefusal(diff.error)
  const doubt = diff.openRefusal
  const inDoubt = current && diff.enabled && doubt !== null && doubt.scopeKey === pinned && !isRegistryParentMissing(doubt.refusal)

  const report = scope.status === 'ready' ? scope.reportMoved : null
  const mismatch = pinned !== null && answered !== pinned
  const moved = scope.status === 'ready' && scope.moved !== null
  // Each disagreeing answer is acted on once: a new disagreement needs a new server change.
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (!report || !mismatch || moved || handled.current === answered) return
    handled.current = answered
    report()
    void queryClient.invalidateQueries({ queryKey: privateCompanyProfileQueryKey(cui), exact: true })
  }, [report, mismatch, moved, answered, queryClient, cui])

  // A company gone from the directory: the answer is withdrawn, its presence is read again once per pinned
  // scope (the registry is re-read by the diff read's report), and a second loss under the same scope is a state.
  const [unsettled, setUnsettled] = useState(false)
  const rereadUnder = useRef<string | null>(null)
  useEffect(() => {
    if (!gone) return
    // The document's own answer goes too: the route may stand it in again while the company is re-read.
    setWithdrawn((list) => [...list, ...[profile, bootstrap].filter((answer): answer is PrivateCompanyProfile => answer !== undefined && !list.includes(answer))])
    queryClient.removeQueries({ queryKey: registrationDiffKey(cui) })
    if (rereadUnder.current === pinned) {
      setUnsettled(true)
      return
    }
    rereadUnder.current = pinned
    void queryClient.invalidateQueries({ queryKey: privateCompanyProfileQueryKey(cui), exact: true })
  }, [gone, profile, bootstrap, pinned, queryClient, cui])
  const reread = useCallback(() => {
    rereadUnder.current = null
    setUnsettled(false)
    void queryClient.invalidateQueries({ queryKey: privateCompanyProfileQueryKey(cui), exact: true })
  }, [queryClient, cui])

  let verdict: ProfileScopeVerdict
  if (scope.status === 'error') verdict = { status: 'unreadable', retry: scope.retry }
  else if (scope.status === 'pending') verdict = scope.firstRead && bootstrap ? { status: 'show', profile: bootstrap } : CHECKING
  else if (scope.moved) verdict = { status: 'moved', accept: scope.accept }
  else if (!live && unsettled) verdict = { status: 'unreadable', retry: reread }
  else if (!current || gone) verdict = CHECKING
  // The episode's diff read failed again — refused or not: a state with a retry, which re-reads the registry first.
  else if (inDoubt && diff.isError && !diff.isFetching && report) verdict = { status: 'unreadable', retry: report }
  else if (refusedNow || inDoubt) verdict = CHECKING
  else verdict = { status: 'show', profile }
  return { verdict, diff }
}

const registrationDiffKey = (cui: string) => ['company-registration-diff', cui] as const

/**
 * The comparison with the previous edition, under the pinned scope, for a CUI
 * the pinned edition holds. Asked only for an answer the page shows under its
 * pin (`profile` null otherwise) and never of an unpublished registry: there
 * is nothing to compare, and the page says why. A `company: null` answer is a
 * refusal (`CompanyRegistryParentMissingError`): the page re-reads the
 * registry and the company. Every refusal opens a refusal episode
 * (`useReportRegistryMove`); `openRefusal` names it while it is open.
 */
export function useCompanyRegistrationDiff(cui: string, profile: PrivateCompanyProfile | null, scope: CompanyRegistryScope) {
  const scopeKey = boundScopeKey(scope)
  const enabled =
    profile !== null &&
    scopeKey !== null &&
    profile.registry.registry.scopeKey === scopeKey &&
    isRegistryPublished(profile.registry.registry) &&
    profile.registry.cuiState === 'in_edition'
  const ledger = useRegistryReadLedger()
  const keyBeforeScope = useMemo(() => registrationDiffKey(cui), [cui])
  const query = useQuery({
    queryKey: [...keyBeforeScope, scopeKey] as const,
    queryFn: ({ signal }) => ledger.track(scopeKey ?? '', () => fetchCompanyRegistrationDiff(cui, scopeKey ?? '', signal)),
    enabled,
    staleTime: 5 * 60_000,
    retry: retryRegistryRead,
  })
  useReportRegistryMove(query.error, scope, ledger, keyBeforeScope)
  return { ...query, enabled, openRefusal: ledger.openRefusal }
}
