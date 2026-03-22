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

export function getDefaultConsent(): ConsentPreferences {
  return {
    version: 1,
    essential: true,
    analytics: false,
    sentry: false,
    updatedAt: new Date().toISOString(),
  }
}

export function getConsent(): ConsentPreferences {
  if (typeof window === 'undefined') return getDefaultConsent()

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!stored) return getDefaultConsent()
    const parsed = JSON.parse(stored) as Partial<ConsentPreferences>
    return {
      version: 1,
      essential: true,
      analytics: Boolean(parsed.analytics),
      sentry: Boolean(parsed.sentry),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    }
  } catch {
    return getDefaultConsent()
  }
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


