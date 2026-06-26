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
const STRIPPED_PARAM_SET = new Set<string>(STRIPPED_JUSTICE_QUERY_PARAMS)
const JUSTICE_CASE_DETAIL_PREFIX = '/justitie/dosare/'
const REDACTED_JUSTICE_CASE_ID_SEGMENT = ':caseId'
const REDACTED_JUSTICE_VALUE = '[scrubbed]'
const SENSITIVE_JUSTICE_PAYLOAD_KEYS = new Set([
  'caseid',
  'casenumber',
  'partykey',
])
const JUSTICE_SOURCE_HINT_PATTERN =
  /^(?:cautare|justitie|dosare|companies:\d+|entities:\d+)$/i
const ABSOLUTE_URL_PATTERN = /\bhttps?:\/\/[^\s"'<>]+/gi
const RELATIVE_ROUTE_PATTERN = /\/(?:justitie|companies|entities)\/[^\s"'<>]*/g
const SENSITIVE_FIELD_ASSIGNMENT_PATTERN =
  /\b(caseNumber|case_number|case-id|caseId|partyKey|party_key|party-key)\s*[:=]\s*["']?[^"',\s&})]+["']?/gi

/**
 * Returns true when a path belongs to the justice domain and must be
 * sanitized. Matches `/justitie`, `/justitie/...`, but not unrelated paths
 * that merely contain the substring.
 */
export function isJusticePath(pathname: string): boolean {
  if (!pathname) return false
  return pathname === '/justitie' || pathname.startsWith('/justitie/')
}

function normalizePayloadKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function hasJusticeSensitiveProfileParams(queryString: string): boolean {
  const raw = queryString.startsWith('?') ? queryString.slice(1) : queryString
  if (raw.length === 0) return false
  const params = new URLSearchParams(raw)
  if (params.get('tab') === 'litigii') return true
  return STRIPPED_JUSTICE_QUERY_PARAMS.some((key) => params.has(key))
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
  return hasJusticeSensitiveProfileParams(queryString)
}

export function sanitizeJusticePathname(pathname: string): string {
  if (!pathname.startsWith(JUSTICE_CASE_DETAIL_PREFIX)) return pathname
  const suffix = pathname.slice(JUSTICE_CASE_DETAIL_PREFIX.length)
  if (suffix.length === 0) return pathname
  const slashIndex = suffix.indexOf('/')
  const trailingPath = slashIndex === -1 ? '' : suffix.slice(slashIndex)
  return `${JUSTICE_CASE_DETAIL_PREFIX}${REDACTED_JUSTICE_CASE_ID_SEGMENT}${trailingPath}`
}

function shouldRedactJusticePayloadValue(
  key: string | undefined,
  value: unknown,
): boolean {
  if (!key || value === null || value === undefined) return false
  const normalized = normalizePayloadKey(key)
  if (SENSITIVE_JUSTICE_PAYLOAD_KEYS.has(normalized)) return true
  return (
    normalized === 'from' &&
    typeof value === 'string' &&
    JUSTICE_SOURCE_HINT_PATTERN.test(value)
  )
}

export function sanitizeJusticeTelemetryString(value: string): string {
  if (value.length === 0) return value
  let sanitized = sanitizeJusticeUrlFragment(value)
  sanitized = sanitized.replace(ABSOLUTE_URL_PATTERN, (match) =>
    sanitizeJusticeUrl(match),
  )
  sanitized = sanitized.replace(RELATIVE_ROUTE_PATTERN, (match) =>
    sanitizeJusticeUrlFragment(match),
  )
  sanitized = sanitized.replace(
    SENSITIVE_FIELD_ASSIGNMENT_PATTERN,
    (_match, key: string) => `${key}=${REDACTED_JUSTICE_VALUE}`,
  )
  return sanitized
}

export function sanitizeJusticeTelemetryValue<T>(
  value: T,
  key?: string,
  depth = 0,
): T {
  if (depth > 8) return value
  if (shouldRedactJusticePayloadValue(key, value)) {
    return REDACTED_JUSTICE_VALUE as T
  }
  if (typeof value === 'string') {
    return sanitizeJusticeTelemetryString(value) as T
  }
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const sanitized = sanitizeJusticeTelemetryValue(item, undefined, depth + 1)
      if (sanitized !== item) changed = true
      return sanitized
    })
    return (changed ? next : value) as T
  }
  if (!value || typeof value !== 'object') {
    return value
  }
  if (value instanceof Date || value instanceof RegExp || value instanceof URL) {
    return value
  }

  const entries = Object.entries(value as Record<string, unknown>)
  let changed = false
  const next: Record<string, unknown> = {}
  for (const [entryKey, entryValue] of entries) {
    const sanitized = sanitizeJusticeTelemetryValue(
      entryValue,
      entryKey,
      depth + 1,
    )
    if (sanitized !== entryValue) changed = true
    next[entryKey] = sanitized
  }
  return (changed ? next : value) as T
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
    if (SAFE_PARAM_SET.has(key) && !STRIPPED_PARAM_SET.has(key)) {
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
  parsed.pathname = sanitizeJusticePathname(parsed.pathname)
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
  const sanitizedPathname = sanitizeJusticePathname(pathname)
  const searchPart = sanitized.length > 0 ? `?${sanitized}` : ''
  return `${sanitizedPathname}${searchPart}${hash}`
}
