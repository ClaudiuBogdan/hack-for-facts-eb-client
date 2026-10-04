import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { classifyRegistryError, isRegistryRefusal } from '../api/company-registry-errors'
import { privateCompanyProfileQueryKey, privateCompanyProfileQueryOptions } from './use-private-company-profile'
import { boundScopeKey, type CompanyRegistryScope } from './use-company-registry-scope'
import { useDocumentBootstrap } from './use-document-bootstrap'

/**
 * A company record another page shows beside its own data (the procurement
 * supplier page shows the firm's registry facts beside its SEAP sales),
 * accepted only under that page's pinned ONRC registry scope.
 *
 * - `document`: the page's first registry read has not answered yet, and the
 *   record is the one the server rendered into the document being hydrated
 *   (`useDocumentBootstrap`). No other record is shown without a pin: one the
 *   page's read kept in the browser's cache from an earlier visit waits.
 * - `shown`: a record answered under the pinned scope — the page's own one
 *   when it is current, else the company page's read; null when the answer
 *   is that the CUI is no directory company (a null carries no envelope).
 * - `checking`: no pin yet, a refusal being re-read, or no record of the
 *   pinned scope yet; nothing is shown meanwhile.
 * - `moved`: the registry moved under the page (publication, withdrawal or an
 *   access change): the company facts are hidden until the reader asks.
 * - `unavailable`: the registry or the current record could not be read:
 *   hidden, never guessed — also what an earlier success of that read left in
 *   the cache, once a newer read of it has failed.
 *
 * It reuses the company page's query (`privateCompanyProfileQueryOptions`) and
 * the page's pin; no cache of its own. A record under another scope makes the
 * page re-read the registry, once per such answer.
 */
export type ScopedCompanyRecord =
  | { readonly status: 'document'; readonly record: PrivateCompanyProfile | null }
  | { readonly status: 'shown'; readonly record: PrivateCompanyProfile | null }
  | { readonly status: 'checking' }
  | { readonly status: 'moved' }
  | { readonly status: 'unavailable' }

const scopeOf = (record: PrivateCompanyProfile) => record.registry.registry.scopeKey

export function useScopedCompanyRecord(
  cui: string,
  /** The record the page's own read carried: `undefined` while that read is pending, null for none. */
  given: PrivateCompanyProfile | null | undefined,
  scope: CompanyRegistryScope,
): ScopedCompanyRecord {
  const pinned = boundScopeKey(scope)
  const moved = scope.status === 'ready' && scope.moved !== null
  const documentRecord = useDocumentBootstrap(given)
  const givenCurrent = given === null || (given !== undefined && pinned !== null && scopeOf(given) === pinned)
  // The company page's own read is the record's source when the page's record is of another scope, or its read is pending.
  const fromStandalone = pinned !== null && !givenCurrent
  const standalone = useQuery({
    ...privateCompanyProfileQueryOptions(cui),
    enabled: fromStandalone,
  })
  const read = standalone.data

  // A record answered under another scope than the pin: the registry is read again, once per such answer.
  const stray = pinned === null ? null : ([given, read].find((record) => record && scopeOf(record) !== pinned) ?? null)
  const strayKey = stray ? scopeOf(stray) : null
  const report = scope.status === 'ready' ? scope.reportMoved : null
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (!report || strayKey === null || handled.current === strayKey) return
    handled.current = strayKey
    report()
  }, [report, strayKey])

  // That read refused by the registry (its scope moved, or access was lost while it was answered): the record is read
  // again and the registry re-read — its answer is shown only under the pin the registry confirms. Once per pinned
  // scope, so a refusal the registry repeats under a scope it has just confirmed stays a state, never a loop.
  const queryClient = useQueryClient()
  const refused = fromStandalone && isRegistryRefusal(classifyRegistryError(standalone.error))
  const pinnedKey = scope.status === 'ready' ? scope.pinned.registry.scopeKey : null
  const refusedUnder = useRef<string | null>(null)
  useEffect(() => {
    if (!report || !refused || pinnedKey === null || refusedUnder.current === pinnedKey) return
    refusedUnder.current = pinnedKey
    void queryClient.invalidateQueries({ queryKey: privateCompanyProfileQueryKey(cui), exact: true })
    report()
  }, [report, refused, pinnedKey, queryClient, cui])

  if (moved) return { status: 'moved' }
  if (scope.status === 'error') return { status: 'unavailable' }
  if (scope.status === 'pending') {
    return scope.firstRead && documentRecord !== undefined && given === documentRecord ? { status: 'document', record: documentRecord } : { status: 'checking' }
  }
  if (givenCurrent) return { status: 'shown', record: given }
  // The read failed: TanStack keeps the data of its last success (a record, or null), and none of it is shown.
  // Not the same as a successful answer whose ONRC envelope is unavailable: that answer is the record, shown below.
  if (standalone.isError) return { status: 'unavailable' }
  if (read === null) return { status: 'shown', record: null }
  if (read && scopeOf(read) === pinned) return { status: 'shown', record: read }
  return { status: 'checking' }
}
