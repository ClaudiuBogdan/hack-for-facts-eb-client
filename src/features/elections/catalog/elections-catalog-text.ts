import type { I18n, MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { ElectionReadiness, ElectionScopeType } from '@/schemas/elections-catalog'

/**
 * The elections pages' words that two places build: the route's `head` (with
 * the request's translator) and the page (with `useLingui()`'s), so a format
 * string cannot drift between them. Source values stay as the source wrote
 * them; only the page's own words translate.
 */

function suffix(i18n: I18n): string {
  return `${i18n._(msg`Alegeri`)} — Transparenta.eu`
}

export function buildCatalogDocumentTitle(i18n: I18n): string {
  return `${i18n._(msg`Ediții de date electorale`)} — ${suffix(i18n)}`
}

/** An edition is named by its reported name, else by its key. */
export function buildEditionDocumentTitle(i18n: I18n, options: { readonly electionKey: string; readonly name?: string | null }): string {
  const electionKey = options.electionKey
  return `${options.name || i18n._(msg`Ediția de sursă ${electionKey}`)} — ${suffix(i18n)}`
}

/** A contest is named by its scope's label (else its source key) and its reported office: „CINCU · mayor — …". */
export function buildContestDocumentTitle(
  i18n: I18n,
  options: { readonly contestKey: string; readonly place?: string | null; readonly office?: string | null },
): string {
  const contestKey = options.contestKey
  const named = options.place && options.office ? `${options.place} · ${options.office}` : options.place || options.office
  return `${named || i18n._(msg`Scrutinul ${contestKey}`)} — ${suffix(i18n)}`
}

/** The API's scope types are its own closed vocabulary, so they translate; the source's labels never do. */
const SCOPE_TYPE_LABEL: Readonly<Record<ElectionScopeType, MessageDescriptor>> = {
  siruta: msg`Cod SIRUTA`,
  county: msg`Județ`,
  diaspora: msg`Diaspora`,
  national: msg`Național`,
  chamber: msg`Cameră`,
  source_constituency: msg`Circumscripție din sursă`,
}

export function scopeTypeLabel(i18n: I18n, scopeType: ElectionScopeType): string {
  return i18n._(SCOPE_TYPE_LABEL[scopeType])
}

/** A reported ISO date in the reader's language, read as the calendar day it names; anything else as it came. */
export function formatReportedDate(locale: string, value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return value
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}

/** Whether a record's page says its identity is the source's own claim: until a review verifies both its identity and the source chosen for it. */
export function isIdentityUnverified(readiness: ElectionReadiness): boolean {
  return readiness.identity !== 'VERIFIED' || readiness.sourceSelection !== 'VERIFIED'
}
