import { useCallback, useEffect, useState } from 'react'
import {
  acceptAll,
  declineAll,
  getConsent,
  getDefaultConsent,
  hasStoredConsentDecision,
  onConsentChange,
  setConsent,
  type ConsentPreferences,
} from '@/lib/consent'
import type { CookieState } from './cookies.cookie-art'

/**
 * One consent state for both surfaces, on the real `@/lib/consent`.
 *
 * The prototype writes real decisions to `localStorage`, deliberately: a cookie
 * modal that does not actually decide anything cannot be judged for the moment
 * it decides — and that moment is most of the design. Prototype-only reset
 * controls live in the variants, not here.
 *
 * Initialised from the defaults and synced from storage in an effect, the way
 * the shipped page does it. Reading storage in the initialiser renders the
 * stored answer on the client and the default on the server, and React reports
 * the difference as a hydration mismatch the moment analytics is stored `true`.
 */
export function useConsentDraft() {
  const [saved, setSaved] = useState<ConsentPreferences>(getDefaultConsent)
  const [draft, setDraft] = useState<ConsentPreferences>(getDefaultConsent)
  const [hasDecision, setHasDecision] = useState(false)
  // False until storage has been read on the client. Until then `saved` is the
  // default, not the reader's answer, and a surface that describes the stored
  // state must not describe this one.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const sync = (next: ConsentPreferences) => {
      setSaved(next)
      setDraft(next)
      setHasDecision(hasStoredConsentDecision())
    }
    sync(getConsent())
    setHydrated(true)
    return onConsentChange(sync)
  }, [])

  const patch = useCallback((change: Partial<Pick<ConsentPreferences, 'analytics' | 'sentry'>>) => {
    setDraft((current) => ({ ...current, ...change }))
  }, [])

  const save = useCallback(() => {
    setConsent(draft)
  }, [draft])

  const isDirty = draft.analytics !== saved.analytics || draft.sentry !== saved.sentry

  return {
    saved,
    draft,
    hasDecision,
    hydrated,
    isDirty,
    patch,
    save,
    essentialOnly: declineAll,
    everything: acceptAll,
  }
}

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

/** The optional categories, in the order every surface lists them. */
export const OPTIONAL_CATEGORIES = [
  {
    key: 'analytics',
    index: '02',
    title: 'Statistici de utilizare',
    vendor: 'PostHog',
    summary: 'Ce pagini se deschid și ce funcții se folosesc, ca să știm ce merită îmbunătățit.',
    detail:
      'Doar evenimente definite de noi — fără autocaptură, fără înregistrări de sesiune. Identificatori ph_* în browser, până la un an.',
  },
  {
    key: 'sentry',
    index: '03',
    title: 'Rapoarte de erori',
    vendor: 'Sentry',
    summary: 'Când ceva se strică, primim contextul ca să reparăm. Fără el, doar un semnal anonim că s-a stricat.',
    detail:
      'Cu acordul tău, raportul poate include pașii de dinaintea erorii și, dacă trimiți feedback, textul sau captura ta. Doar pe durata sesiunii.',
  },
] as const

export type OptionalCategoryKey = (typeof OPTIONAL_CATEGORIES)[number]['key']

export const ESSENTIAL_CATEGORY = {
  index: '01',
  title: 'Esențiale',
  vendor: 'în browserul tău',
  summary: 'Preferințele tale: limbă, temă, monedă, graficele salvate și această alegere.',
  detail:
    'Stocare locală, nu cookie-uri de urmărire. Dacă îți faci cont, sesiunea Clerk intră tot aici. Rămân până le ștergi tu.',
} as const
