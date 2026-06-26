/**
 * Sanitizes sensitive route URLs for analytics / error reporting.
 *
 * Justice routes (`/justitie*`) and justice litigation tabs on company/entity
 * profiles can carry privacy-sensitive query params (`partyKey`, `caseNumber`,
 * `from`) and arbitrary unknown params. These must never reach PostHog
 * pageviews or Sentry breadcrumbs/request URLs, even when analytics/Sentry
 * consent exists. PostHog autocapture + session recording are already disabled,
 * so this covers the manual pageview URL + Sentry scrubbing.
 *
 * The sanitizer is a closed allowlist: only `SAFE_JUSTICE_QUERY_PARAMS` are
 * preserved on `/justitie*` URLs; everything else (including `partyKey`,
 * `caseNumber`, `from`, and any unknown param) is stripped.
 */

/** Safe aggregate-routing params allowed on `/justitie*` URLs. */
export const SAFE_JUSTICE_QUERY_PARAMS = [
  'court',
  'tier',
  'category',
  'stage',
  'year',
  'partyKind',
  'role',
  'hasAppeal',
  'sort',
  'page',
  'pageSize',
  'tab',
  'litPage',
] as const

/** Params that are explicitly stripped (documented, even though the allowlist
 *  already excludes them — useful for tests and audits). */
export const STRIPPED_JUSTICE_QUERY_PARAMS = [
  'partyKey',
  'caseNumber',
  'from',
] as const

const SAFE_PARAM_SET = new Set<string>(SAFE_JUSTICE_QUERY_PARAMS)

/**
 * Returns true when a path belongs to the justice domain and must be
 * sanitized. Matches `/justitie`, `/justitie/...`, but not unrelated paths
 * that merely contain the substring.
 */
export function isJusticePath(pathname: string): boolean {
  if (!pathname) return false
  return pathname === '/justitie' || pathname.startsWith('/justitie/')
}

export function isJusticeLitigationProfilePath(
  pathname: string,
  queryString: string,
): boolean {
  if (
    !(
      pathname.startsWith('/companies/') ||
      pathname.startsWith('/entities/')
    )
  ) {
    return false
  }
  const raw = queryString.startsWith('?') ? queryString.slice(1) : queryString
  return new URLSearchParams(raw).get('tab') === 'litigii'
}

/**
 * Strips non-allowlisted params from a query string for justice routes.
 * Returns the (possibly empty) sanitized query string WITHOUT a leading `?`.
 * Returns the original query string (without `?`) untouched when the path is
 * not a justice path.
 */
export function sanitizeJusticeQueryString(
  pathname: string,
  queryString: string,
): string {
  const raw = queryString.startsWith('?') ? queryString.slice(1) : queryString
  if (
    !isJusticePath(pathname) &&
    !isJusticeLitigationProfilePath(pathname, raw)
  ) {
    return raw
  }
  if (raw.length === 0) {
    return ''
  }
  const params = new URLSearchParams(raw)
  const kept = new URLSearchParams()
  for (const key of params.keys()) {
    if (SAFE_PARAM_SET.has(key)) {
      const values = params.getAll(key)
      for (const value of values) {
        kept.append(key, value)
      }
    }
  }
  // URLSearchParams normalizes; drop the trailing '=' for empty-value keys
  // to keep output compact and stable.
  const result = kept.toString()
  return result
}

/**
 * Sanitizes a full URL string (origin + pathname + search + hash) for justice
 * routes. Non-justice URLs are returned unchanged. Hash is preserved.
 * Tolerates malformed input by returning it unchanged on parse failure.
 */
export function sanitizeJusticeUrl(url: string): string {
  if (typeof url !== 'string' || url.length === 0) return url
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    // Not an absolute URL; try to sanitize as a pathname+search fragment.
    return sanitizeJusticeUrlFragment(url)
  }
  if (
    !isJusticePath(parsed.pathname) &&
    !isJusticeLitigationProfilePath(parsed.pathname, parsed.search)
  ) {
    return url
  }
  const sanitizedSearch = sanitizeJusticeQueryString(parsed.pathname, parsed.search)
  parsed.search = sanitizedSearch.length > 0 ? `?${sanitizedSearch}` : ''
  return parsed.toString()
}

/**
 * Sanitizes a pathname+search fragment (no origin), e.g. the values TanStack
 * Router exposes via `location.pathname` / `location.searchStr`, or relative
 * hrefs. Non-justice fragments are returned unchanged.
 */
export function sanitizeJusticeUrlFragment(fragment: string): string {
  if (typeof fragment !== 'string' || fragment.length === 0) return fragment
  const queryIndex = fragment.indexOf('?')
  const hashIndex = fragment.indexOf('#')
  const hashStart = hashIndex === -1 ? fragment.length : hashIndex
  const pathname =
    queryIndex === -1
      ? fragment.slice(0, hashStart)
      : fragment.slice(0, queryIndex)
  const queryString =
    queryIndex === -1 ? '' : fragment.slice(queryIndex + 1, hashStart)
  const hash = hashIndex === -1 ? '' : fragment.slice(hashIndex)
  if (
    !isJusticePath(pathname) &&
    !isJusticeLitigationProfilePath(pathname, queryString)
  ) {
    return fragment
  }
  const sanitized = sanitizeJusticeQueryString(pathname, queryString)
  const searchPart = sanitized.length > 0 ? `?${sanitized}` : ''
  return `${pathname}${searchPart}${hash}`
}
