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

/**
 * One consent state for the card and the settings page, on `@/lib/consent`.
 *
 * Initialised from the defaults and synced from storage in an effect. Reading
 * storage in the initialiser would render the stored answer on the client and
 * the default on the server, and React reports the difference as a hydration
 * mismatch the moment analytics is stored `true`.
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
