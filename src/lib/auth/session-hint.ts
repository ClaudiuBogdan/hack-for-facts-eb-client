/**
 * Whether this browser holds a Clerk session, read from Clerk's own
 * `__client_uat` cookie without loading Clerk.
 *
 * Clerk keeps the cookie readable by the page: absent before Clerk ever ran,
 * `0` when signed out, the session's Unix time when signed in. Clerk writes it
 * on the registrable domain (`.transparenta.eu`), so every Clerk instance there
 * shares the plain name; the copy suffixed for this instance is the one that
 * speaks for this app. See docs/performance/2026-11-17-landing/clerk-on-demand.md.
 */

const COOKIE_PREFIX = '__client_uat'

export type SessionHint = 'signed-in' | 'signed-out'

/** The value of one cookie in a `document.cookie` string, or `undefined`. */
export function readCookie(cookieString: string, name: string): string | undefined {
  for (const part of cookieString.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim()
    }
  }
  return undefined
}

/** A `__client_uat` value means a session when it is a positive number. */
export function isSessionValue(value: string | undefined): boolean {
  if (value === undefined) return false
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds > 0
}

/**
 * Clerk's cookie suffix for a publishable key: the first 8 characters of
 * base64url(SHA-1(key)). `null` when the browser has no `crypto.subtle`
 * (plain `http` on a non-local host).
 */
export async function clerkCookieSuffix(publishableKey: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return null
  const digest = await subtle.digest('SHA-1', new TextEncoder().encode(publishableKey))
  let binary = ''
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').slice(0, 8)
}

/**
 * Pure decision from a cookie string. With a suffix only the instance's own
 * cookie counts. Without one, any `__client_uat` cookie holding a session
 * counts, the shared one or any instance's: the error can then only be towards
 * loading Clerk when it is not needed.
 */
export function sessionHintFromCookies(cookieString: string, suffix: string | null): SessionHint {
  if (suffix) {
    return isSessionValue(readCookie(cookieString, `${COOKIE_PREFIX}_${suffix}`)) ? 'signed-in' : 'signed-out'
  }
  for (const part of cookieString.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    const name = part.slice(0, separator).trim()
    if ((name === COOKIE_PREFIX || name.startsWith(`${COOKIE_PREFIX}_`)) && isSessionValue(part.slice(separator + 1).trim())) {
      return 'signed-in'
    }
  }
  return 'signed-out'
}

const suffixes = new Map<string, Promise<string | null>>()

function suffixFor(publishableKey: string): Promise<string | null> {
  let suffix = suffixes.get(publishableKey)
  if (!suffix) {
    suffix = clerkCookieSuffix(publishableKey).catch(() => null)
    suffixes.set(publishableKey, suffix)
  }
  return suffix
}

/** Reads the hint for this browser now. Browser only. */
export async function readSessionHint(publishableKey: string): Promise<SessionHint> {
  const suffix = await suffixFor(publishableKey)
  return sessionHintFromCookies(document.cookie, suffix)
}
