import type { PrivateCompanyProfile } from '@/schemas/private-company'
import type { CompanyMainActivity } from '@/schemas/private-company-main-activity'

/**
 * What the profile shows of the ANAF-assumed main activity, from the one
 * parsed profile the header, the activity badges and the history all read —
 * so they cannot disagree on the selected key, its basis, its revision or an
 * unresolved state.
 *
 * - `not_served`: the API serves no main activity (older API): nothing new is
 *   shown and nothing is inferred.
 * - `unreadable`: it served one this client cannot read: said, no flag kept.
 * - `unavailable`: this API cannot read the main surfaces: nothing inferred.
 * - `no_assignment`: readable, no assignment yet — not "no main activity".
 * - `assigned`: the assignment, its currentness deciding what is shown.
 * - `refused`: a dependent read (the main activity's history) answered that
 *   the company is no longer a public directory company: nothing of its main
 *   activity is shown, no flag kept, while the profile is read again — never
 *   said as a withdrawn ANAF source or an older API.
 */
export type AssumedMainView =
  | { readonly kind: 'not_served' }
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'no_assignment' }
  | { readonly kind: 'assigned'; readonly activity: CompanyMainActivity }
  | { readonly kind: 'refused' }

export function assumedMainOf(profile: Pick<PrivateCompanyProfile, 'mainActivity' | 'mainActivityUnreadable'>): AssumedMainView {
  if (profile.mainActivityUnreadable) return { kind: 'unreadable' }
  const read = profile.mainActivity
  if (!read) return { kind: 'not_served' }
  switch (read.availability) {
    case 'ASSIGNED':
      return read.activity ? { kind: 'assigned', activity: read.activity } : { kind: 'unreadable' }
    case 'NO_ASSIGNMENT':
      return { kind: 'no_assignment' }
    case 'UNAVAILABLE':
      return { kind: 'unavailable' }
  }
}

const NO_INTERPRETATION = { status: null, matchBasis: null, revisionBasis: null, resolved: null, candidates: null, correctionId: null } as const

/**
 * The assignment once ANAF's fiscal row is no longer public
 * (`anafWithdrawn`): no ANAF evidence and no interpretation of ANAF's code —
 * its key, candidates and status all say something about that code — only
 * the ONRC edition and the ids stay. The mapper applies it to what the API
 * served; the page applies it as soon as a history row reports the
 * withdrawal, before the profile is read again.
 */
export function withAnafWithdrawn(activity: CompanyMainActivity): CompanyMainActivity {
  return { ...activity, ...NO_INTERPRETATION, anafWithdrawn: true, anaf: null }
}

/**
 * The interpretation withheld pending verification (an integrity hold, among
 * others): pending, with no status. Shown as such — no key, no label, no
 * badge, no code — never as a malformed answer.
 */
export function mainInterpretationWithheld(activity: CompanyMainActivity): boolean {
  return activity.currentness === 'PENDING_REFRESH' && activity.status === null
}

/**
 * The ANAF source under an integrity hold (the API's `integrityHeld`, which
 * the mapper reads only on a non-current assignment with no interpretation):
 * said as such. Never inferred from a null status alone.
 */
export function mainIntegrityHeld(activity: CompanyMainActivity): boolean {
  return activity.integrityHeld && activity.currentness !== 'CURRENT'
}

/**
 * The only assignment the page presents as a current main activity: CURRENT
 * with a selected exact key, its ANAF source public. A status alone, a
 * pending or withheld one, never is.
 */
export function mainShownAsCurrent(activity: CompanyMainActivity): boolean {
  return activity.currentness === 'CURRENT' && activity.resolved !== null && !activity.anafWithdrawn && !activity.integrityHeld
}

/**
 * The cache identity of anything derived from the main activity (its history
 * pages above all): the API's opaque `cacheKey` — content epoch, resolution,
 * support, currentness, refresh, edition and the served row's visibility —
 * of an assignment; null when there is none to derive from. The content
 * epoch alone would not do: an evidence-only confirmation keeps it and moves
 * the support.
 */
export function mainActivityIdentity(view: AssumedMainView): string | null {
  return view.kind === 'assigned' ? view.activity.cacheKey : null
}

/**
 * Whether the assignment's history may be read and shown: an assignment the
 * API serves. A withdrawn source keeps its history (its withdrawn fields say
 * so); no assignment, an unreadable or unavailable one, and an older API have
 * none to show.
 */
export function mainHistoryShown(view: AssumedMainView): boolean {
  return view.kind === 'assigned'
}

/** `rev3` → „Rev.3": the ONRC counterpart's revision (ANAF publishes none). */
export function mainRevisionName(revision: string): string {
  return revision.replace(/^rev/u, 'Rev.')
}

/** A key as the page writes it: „Rev.3 4711". */
export function mainKeyText(key: { readonly revision: string; readonly code: string }): string {
  return `${mainRevisionName(key.revision)} ${key.code}`
}
