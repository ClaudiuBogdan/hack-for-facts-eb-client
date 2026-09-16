import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import type { ConsentPreferences } from '@/lib/consent'

/**
 * The three things the app can remember about a reader, in the order every
 * consent surface lists them, with the sentence per category that says what
 * it actually stores. The full inventory of keys and lifetimes is the cookie
 * policy's job; this is the part a reader deciding needs.
 *
 * `msg` descriptors, resolved at render: this module is evaluated once per
 * server process and that process answers every locale.
 */
export type OptionalCategoryKey = 'analytics' | 'sentry'

export type ConsentCategory = {
  readonly index: string
  readonly title: MessageDescriptor
  readonly vendor: MessageDescriptor
  readonly summary: MessageDescriptor
  readonly detail: MessageDescriptor
}

export type OptionalCategory = ConsentCategory & { readonly key: OptionalCategoryKey }

export const ESSENTIAL_CATEGORY: ConsentCategory = {
  index: '01',
  title: msg`Esențiale`,
  vendor: msg`în browserul tău`,
  summary: msg`Preferințele tale: limbă, temă, monedă, graficele salvate și această alegere.`,
  detail: msg`Stocare locală, nu cookie-uri de urmărire. Dacă îți faci cont, sesiunea Clerk intră tot aici. Rămân până le ștergi tu.`,
}

export const OPTIONAL_CATEGORIES: readonly OptionalCategory[] = [
  {
    key: 'analytics',
    index: '02',
    title: msg`Statistici de utilizare`,
    vendor: msg`PostHog`,
    summary: msg`Ce pagini se deschid și ce funcții se folosesc, ca să știm ce merită îmbunătățit.`,
    detail: msg`Doar evenimente definite de noi — fără autocaptură, fără înregistrări de sesiune. Identificatori ph_* în browser, până la un an.`,
  },
  {
    key: 'sentry',
    index: '03',
    title: msg`Rapoarte de erori`,
    vendor: msg`Sentry`,
    summary: msg`Când ceva se strică, primim contextul ca să reparăm. Fără el, doar un semnal anonim că s-a stricat.`,
    detail: msg`Cu acordul tău, raportul poate include pașii de dinaintea erorii și, dacă trimiți feedback, textul sau captura ta. Doar pe durata sesiunii.`,
  },
]

/** What the cookie illustration draws for a set of preferences. */
export type CookieState = 'whole' | 'bitten' | 'plain'

/**
 * Which cookie a set of preferences draws.
 *
 * Bitten when everything is on, plain when nothing optional is, whole in
 * between — and whole before any decision, since the art's job before the
 * decision is to be the thing that is about to be decided.
 */
export function cookieStateFor(prefs: ConsentPreferences, hasDecision: boolean): CookieState {
  if (!hasDecision) return 'whole'
  if (prefs.analytics && prefs.sentry) return 'bitten'
  if (!prefs.analytics && !prefs.sentry) return 'plain'
  return 'whole'
}
