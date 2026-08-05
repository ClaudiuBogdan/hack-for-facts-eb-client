import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  acceptAll,
  declineAll,
  getConsent,
  getDefaultConsent,
  hasAnalyticsConsent,
  hasSentryConsent,
  hasStoredConsentDecision,
  onConsentChange,
  setConsent,
  type ConsentPreferences,
} from './consent'

/**
 * The GDPR gate. `hasAnalyticsConsent()` / `hasSentryConsent()` are what
 * actually decide whether PostHog and Sentry may run (see `lib/analytics.ts`,
 * `lib/sentry.ts`), and both read `getConsent()`; `hasStoredConsentDecision()`
 * decides whether the banner still has to ask. The two must never disagree
 * about whether a stored blob is a decision this schema version can honour —
 * otherwise a blob from another version silently re-enables tracking while the
 * banner is still asking for consent.
 */

const STORAGE_KEY = 'cookie-consent'

const store = (value: unknown) => {
  window.localStorage.setItem(
    STORAGE_KEY,
    typeof value === 'string' ? value : JSON.stringify(value),
  )
}

const readStored = (): Record<string, unknown> =>
  JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')

const decision = (
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({
  version: 1,
  essential: true,
  analytics: true,
  sentry: true,
  updatedAt: '2026-01-15T10:00:00.000Z',
  ...over,
})

beforeEach(() => {
  window.localStorage.clear()
})

describe('getDefaultConsent', () => {
  it('defaults to no analytics and no Sentry', () => {
    const defaults = getDefaultConsent()
    expect(defaults.version).toBe(1)
    expect(defaults.essential).toBe(true)
    expect(defaults.analytics).toBe(false)
    expect(defaults.sentry).toBe(false)
    expect(Number.isNaN(Date.parse(defaults.updatedAt))).toBe(false)
  })
})

describe('hasStoredConsentDecision', () => {
  it('is false when nothing is stored', () => {
    expect(hasStoredConsentDecision()).toBe(false)
  })

  it('is true for a stored v1 decision', () => {
    store(decision())
    expect(hasStoredConsentDecision()).toBe(true)
  })

  it('is false for malformed JSON', () => {
    store('{not json')
    expect(hasStoredConsentDecision()).toBe(false)
  })

  it('is false for a blob written by another schema version', () => {
    store(decision({ version: 2 }))
    expect(hasStoredConsentDecision()).toBe(false)
  })

  it('is false when updatedAt is absent or not a string', () => {
    store({ version: 1, analytics: true, sentry: true })
    expect(hasStoredConsentDecision()).toBe(false)

    store(decision({ updatedAt: 1737000000000 }))
    expect(hasStoredConsentDecision()).toBe(false)
  })
})

describe('getConsent', () => {
  it('returns the privacy-safe defaults when nothing is stored', () => {
    expect(getConsent()).toMatchObject({
      version: 1,
      essential: true,
      analytics: false,
      sentry: false,
    })
  })

  it('returns the stored v1 decision', () => {
    store(decision({ analytics: true, sentry: false }))
    expect(getConsent()).toEqual({
      version: 1,
      essential: true,
      analytics: true,
      sentry: false,
      updatedAt: '2026-01-15T10:00:00.000Z',
    })
  })

  it('coerces missing and non-boolean flags to booleans', () => {
    store({ version: 1, updatedAt: '2026-01-15T10:00:00.000Z', analytics: 'yes' })
    const consent = getConsent()
    expect(consent.analytics).toBe(true)
    expect(consent.sentry).toBe(false)
    expect(consent.version).toBe(1)
    expect(consent.essential).toBe(true)
  })

  it('returns the defaults for malformed JSON', () => {
    store('{not json')
    expect(getConsent()).toMatchObject({ analytics: false, sentry: false })
  })

  it('never honours a decision written by another schema version', () => {
    // A blob from a different consent schema carries different semantics; it is
    // not a decision under this version, so analytics and Sentry stay off until
    // the user is asked again. This must agree with hasStoredConsentDecision().
    store(decision({ version: 2, analytics: true, sentry: true }))

    expect(hasStoredConsentDecision()).toBe(false)
    expect(getConsent()).toMatchObject({ analytics: false, sentry: false })
    expect(hasAnalyticsConsent()).toBe(false)
    expect(hasSentryConsent()).toBe(false)
  })

  it('never honours a blob without a decision timestamp', () => {
    store({ version: 1, analytics: true, sentry: true })

    expect(hasStoredConsentDecision()).toBe(false)
    expect(getConsent()).toMatchObject({ analytics: false, sentry: false })
  })

  it('agrees with hasStoredConsentDecision for every stored blob', () => {
    const blobs: readonly unknown[] = [
      decision(),
      decision({ version: 0 }),
      decision({ version: 2 }),
      decision({ version: '1' }),
      { version: 1, analytics: true },
      '{not json',
      'null',
      '42',
    ]

    for (const blob of blobs) {
      window.localStorage.clear()
      store(blob)
      const isDecision = hasStoredConsentDecision()
      const consent = getConsent()
      // Consent may only be ON when a decision this version can read exists.
      expect(isDecision || (!consent.analytics && !consent.sentry)).toBe(true)
    }
  })
})

describe('setConsent', () => {
  it('persists the decision, forcing version, essential and a fresh timestamp', () => {
    setConsent({
      version: 1,
      essential: true,
      analytics: true,
      sentry: false,
      updatedAt: '2000-01-01T00:00:00.000Z',
    })

    const stored = readStored()
    expect(stored.version).toBe(1)
    expect(stored.essential).toBe(true)
    expect(stored.analytics).toBe(true)
    expect(stored.sentry).toBe(false)
    // The stale timestamp the caller passed is replaced with the moment of the
    // decision — that is the record of WHEN consent was given.
    expect(stored.updatedAt).not.toBe('2000-01-01T00:00:00.000Z')
    expect(Date.parse(String(stored.updatedAt))).toBeGreaterThan(
      Date.parse('2020-01-01T00:00:00.000Z'),
    )
    expect(hasStoredConsentDecision()).toBe(true)
  })

  it('notifies listeners with the persisted payload', () => {
    const handler = vi.fn()
    const off = onConsentChange(handler)

    setConsent({ ...getDefaultConsent(), analytics: true, sentry: true })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toMatchObject({
      version: 1,
      essential: true,
      analytics: true,
      sentry: true,
    })
    off()
  })
})

describe('acceptAll / declineAll', () => {
  it('acceptAll turns both analytics and Sentry on and records the decision', () => {
    acceptAll()
    expect(getConsent()).toMatchObject({ analytics: true, sentry: true })
    expect(hasStoredConsentDecision()).toBe(true)
    expect(hasAnalyticsConsent()).toBe(true)
    expect(hasSentryConsent()).toBe(true)
  })

  it('declineAll turns both off and records the decision', () => {
    acceptAll()
    declineAll()
    expect(getConsent()).toMatchObject({ analytics: false, sentry: false })
    expect(hasStoredConsentDecision()).toBe(true)
    expect(hasAnalyticsConsent()).toBe(false)
    expect(hasSentryConsent()).toBe(false)
  })

  it('declineAll on a foreign-version blob writes a v1 refusal', () => {
    store(decision({ version: 2, analytics: true, sentry: true }))
    declineAll()
    expect(readStored()).toMatchObject({
      version: 1,
      analytics: false,
      sentry: false,
    })
  })
})

describe('hasAnalyticsConsent / hasSentryConsent', () => {
  it('are false before any decision is stored', () => {
    expect(hasAnalyticsConsent()).toBe(false)
    expect(hasSentryConsent()).toBe(false)
  })

  it('track the two flags independently', () => {
    store(decision({ analytics: true, sentry: false }))
    expect(hasAnalyticsConsent()).toBe(true)
    expect(hasSentryConsent()).toBe(false)

    store(decision({ analytics: false, sentry: true }))
    expect(hasAnalyticsConsent()).toBe(false)
    expect(hasSentryConsent()).toBe(true)
  })
})

describe('onConsentChange', () => {
  it('stops notifying after unsubscribe', () => {
    const handler = vi.fn()
    const off = onConsentChange(handler)
    setConsent({ ...getDefaultConsent(), analytics: true })
    expect(handler).toHaveBeenCalledTimes(1)

    off()
    setConsent({ ...getDefaultConsent(), analytics: false })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('falls back to the current consent when an event carries no detail', () => {
    const handler = vi.fn<(prefs: ConsentPreferences) => void>()
    const off = onConsentChange(handler)

    store(decision({ analytics: true, sentry: false }))
    window.dispatchEvent(new Event('consent:changed'))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toMatchObject({
      analytics: true,
      sentry: false,
    })
    off()
  })
})
