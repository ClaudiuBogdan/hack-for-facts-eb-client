import { readCookieValue, readRequestCookie } from '@/lib/user-preferences'

/**
 * The pages whose notice the visitor dismissed, as one session cookie: no
 * expiry, so the browser drops it when it closes. The server reads it, so a
 * dismissed notice is never rendered (no flash, no layout jump).
 */
export const PAGE_NOTICE_COOKIE = 'page-notices-dismissed'

/** A notice id: lowercase words joined by hyphens, e.g. `public-enterprises`. */
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** Keeps the cookie small; the oldest dismissal goes first. */
const MAX_IDS = 30

export function isPageNoticeId(id: string): boolean {
  return ID.test(id)
}

export function parseDismissedNotices(value: string | null | undefined): readonly string[] {
  if (!value) return []
  return value.split(',').filter(isPageNoticeId)
}

export function addDismissedNotice(dismissed: readonly string[], id: string): readonly string[] {
  if (!isPageNoticeId(id)) return dismissed
  return [...dismissed.filter((existing) => existing !== id), id].slice(-MAX_IDS)
}

/** For the root route: the request cookie on the server, `document.cookie` in the browser. */
export async function readDismissedNotices(): Promise<readonly string[]> {
  const value = (await readRequestCookie(PAGE_NOTICE_COOKIE)) ?? readCookieValue(PAGE_NOTICE_COOKIE)
  return parseDismissedNotices(value)
}

/** The dismissals in this browser's cookie right now. Browser only; empty on the server. */
export function readBrowserDismissedNotices(): readonly string[] {
  return parseDismissedNotices(readCookieValue(PAGE_NOTICE_COOKIE))
}

/** Records a dismissal in the session cookie. Browser only. */
export function rememberDismissedNotice(id: string): void {
  if (typeof document === 'undefined') return
  const next = addDismissedNotice(parseDismissedNotices(readCookieValue(PAGE_NOTICE_COOKIE)), id)
  const parts = [`${PAGE_NOTICE_COOKIE}=${next.join(',')}`, 'Path=/', 'SameSite=Lax']
  if (window.location.protocol === 'https:') parts.push('Secure')
  document.cookie = parts.join('; ')
}
