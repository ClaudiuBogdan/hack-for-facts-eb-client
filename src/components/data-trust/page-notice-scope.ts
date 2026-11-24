/**
 * Which notice a path shows, for the one `PageNotice` in the app shell: one per
 * section (the path's first segment), so dismissing it on `/procurement` also
 * covers `/procurement/…`. Null where there is no data to verify.
 */
const NO_NOTICE = new Set([
  // The landing page (owner, 24 November 2026).
  '',
  // Legal, account and utility pages.
  'privacy', 'terms', 'cookie-policy', 'cookies', 'sign-in', 'sign-up', 'settings', 'unsubscribe', 'alerts', 'share',
  // Internal: admin, local prototypes, the error test page.
  'admin', 'development', 'test-error',
])

/** `/ro/…` and `/en/…` belong to the section after the language. */
const LANGUAGE = new Set(['ro', 'en'])

export function pageNoticeScope(pathname: string): string | null {
  const segments = pathname.toLowerCase().split('/').filter(Boolean)
  const section = (LANGUAGE.has(segments[0] ?? '') ? segments[1] : segments[0]) ?? ''
  if (NO_NOTICE.has(section)) return null
  const id = section.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return id || null
}
