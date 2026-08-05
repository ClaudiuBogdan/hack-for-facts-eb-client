export type CookieCategory = 'essential' | 'analytics'

export type ConsentPreferences = {
  readonly version: 1
  readonly essential: true
  analytics: boolean
  /**
   * Explicit permission for enhanced error reporting (Sentry).
   * When false, only minimal anonymous error telemetry may be sent
   * under essential cookies to keep the service reliable.
   */
  sentry: boolean
  updatedAt: string
}

const CONSENT_STORAGE_KEY = 'cookie-consent'

/**
 * The stored decision, or null when there is none this schema version can
 * honour. Validation lives here alone so the banner gate
 * (`hasStoredConsentDecision`) and the value gate (`getConsent`) can never
 * drift: a blob written by a different consent schema carries different
 * semantics, so it is not a decision — and must not keep analytics or Sentry
 * enabled while the banner is asking the user again.
 */
function readStoredConsent(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored) as Partial<ConsentPreferences>
    if (parsed?.version !== 1 || typeof parsed.updatedAt !== 'string') {
      return null
    }

    return {
      version: 1,
      essential: true,
      analytics: Boolean(parsed.analytics),
      sentry: Boolean(parsed.sentry),
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

export function hasStoredConsentDecision(): boolean {
  return readStoredConsent() !== null
}

export function getDefaultConsent(): ConsentPreferences {
  return {
    version: 1,
    essential: true,
    analytics: false,
    sentry: false,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * The effective preferences. Falls back to the privacy-safe defaults (analytics
 * and Sentry off) whenever there is no readable v1 decision — consent is never
 * inferred from an unreadable or foreign-version blob.
 */
export function getConsent(): ConsentPreferences {
  return readStoredConsent() ?? getDefaultConsent()
}

export function setConsent(next: ConsentPreferences): void {
  if (typeof window === 'undefined') return
  const payload: ConsentPreferences = {
    ...next,
    version: 1,
    essential: true,
    updatedAt: new Date().toISOString(),
  }
  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload))
  window.dispatchEvent(new CustomEvent('consent:changed', { detail: payload }))
}

export function acceptAll(): void {
  const current = getConsent()
  setConsent({ ...current, analytics: true, sentry: true })
}

export function declineAll(): void {
  const current = getConsent()
  setConsent({ ...current, analytics: false, sentry: false })
}

export function hasAnalyticsConsent(): boolean {
  return getConsent().analytics === true
}

export function hasSentryConsent(): boolean {
  return getConsent().sentry === true
}

export function onConsentChange(handler: (prefs: ConsentPreferences) => void): () => void {
  const listener = (e: Event) => {
    const custom = e as CustomEvent<ConsentPreferences>
    handler(custom.detail ?? getConsent())
  }
  window.addEventListener('consent:changed', listener)
  return () => window.removeEventListener('consent:changed', listener)
}

