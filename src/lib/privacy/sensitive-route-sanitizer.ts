import { ROMANIA_COUNTIES } from '@/lib/territory-counties'

/**
 * Sanitizes sensitive route URLs for analytics / error reporting.
 *
 * Justice routes (`/justice*`, and the retired `/justitie*` that redirect
 * there) and justice litigation tabs on company/entity
 * profiles can carry privacy-sensitive query params (`partyKey`, `caseNumber`,
 * `from`) and arbitrary unknown params. These must never reach PostHog
 * pageviews or Sentry breadcrumbs/request URLs, even when analytics/Sentry
 * consent exists. PostHog autocapture + session recording are already disabled,
 * so this covers the manual pageview URL + Sentry scrubbing.
 *
 * The sanitizer is a closed allowlist: only `SAFE_JUSTICE_QUERY_PARAMS` are
 * preserved on justice URLs, the pages' own keys only with a value from
 * their closed list (`SAFE_JUSTICE_VALUES`); everything else (including
 * `partyKey`, `caseNumber`, `from`, and any unknown param) is stripped. A case page's
 * path carries the case number (`/justice/cases/<court>/<number>`): it is
 * reported as `/justice/cases/<court>/:caseNumber`. Another page's query can
 * carry a justice address as its way back (the cookie settings' `redirect`):
 * that address is sanitized the same way, however often it was encoded.
 */

/** Safe aggregate-routing params allowed on justice URLs. */
export const SAFE_JUSTICE_QUERY_PARAMS = [
  'an',
  'instante',
  'materii',
  'nivel',
  // The analysis page's question: counties, matters, stages, the grouping and the measure. Its courts (`instanta`) are not
  // kept: a court's code has no closed list here, and a crafted one could carry a name.
  'judet',
  'materie',
  'etapa',
  'dupa',
  'masura',
  // The ECHR page's tab (its year is `an`).
  'vedere',
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

/** A value — or each value of a comma list — from a closed set. */
function oneOf(values: readonly string[]): (value: string) => boolean {
  const allowed = new Set(values)
  return (value) => value.split(',').every((item) => allowed.has(item))
}

const LEVELS = ['judecatorie', 'tribunal', 'curte_de_apel', 'inalta_curte', 'militare']

/**
 * What the justice pages' own keys may hold: a year, the codes the pages
 * define (`justice/lib/analysis-codes.ts`, the front door's choices), a
 * county's code — each from a closed list, never free text. A key whose
 * value is anything else is dropped whole: `?materie=656/1/2025` never
 * reaches telemetry.
 */
export const SAFE_JUSTICE_VALUES: Readonly<Partial<Record<(typeof SAFE_JUSTICE_QUERY_PARAMS)[number], (value: string) => boolean>>> = {
  an: (value) => /^\d{4}$/u.test(value),
  instante: oneOf(LEVELS),
  materii: oneOf(['toate', ...LEVELS]),
  nivel: oneOf(LEVELS),
  judet: oneOf(ROMANIA_COUNTIES.map((county) => county.code)),
  materie: oneOf([
    'civil',
    'penal',
    'litigiicuprofesionistii',
    'contenciosadministrativsifiscal',
    'minorisifamilie',
    'asigurarisociale',
    'litigiidemunca',
    'faliment',
    'proprietateintelectuala',
    'insolventapersoaneifizice',
    'dreptmaritimsifluvial',
    'altematerii',
  ]),
  etapa: oneOf(['fond', 'apel', 'recurs', 'contestatie', 'extraordinare']),
  dupa: oneOf(['instante', 'judete', 'materii', 'etape', 'niveluri']),
  masura: oneOf(['dosare', 'locuitori']),
  vedere: oneOf(['ani', 'hotarari']),
}

const SAFE_PARAM_SET = new Set<string>(SAFE_JUSTICE_QUERY_PARAMS)
const STRIPPED_PARAM_SET = new Set<string>(STRIPPED_JUSTICE_QUERY_PARAMS)
const JUSTICE_CASE_DETAIL_PREFIX = '/justitie/dosare/'
const REDACTED_JUSTICE_CASE_ID_SEGMENT = ':caseId'
/** `/justice/cases/<court>/<number…>`: the court stays (a public institution), the number goes. */
const JUSTICE_CASE_PAGE_PATTERN = /^(\/justice\/cases\/[^/]+)\/.+$/i
const REDACTED_JUSTICE_CASE_NUMBER_SEGMENT = ':caseNumber'
const REDACTED_JUSTICE_VALUE = '[scrubbed]'
const SENSITIVE_JUSTICE_PAYLOAD_KEYS = new Set([
  'caseid',
  'casenumber',
  'partykey',
])
const JUSTICE_SOURCE_HINT_PATTERN =
  /^(?:cautare|justitie|dosare|companies:\d+|entities:\d+)$/i
const ABSOLUTE_URL_PATTERN = /\bhttps?:\/\/[^\s"'<>]+/gi
const RELATIVE_ROUTE_PATTERN = /\/(?:justice|justitie|companies|entities)\/[^\s"'<>]*/gi
/** A justice address encoded into text, once or more (`%2Fjustice%2Fcases%2F…`, `%252F…`): a way back quoted in a message. */
const ENCODED_JUSTICE_ROUTE_PATTERN = /%(?:25)*2F(?:justice|justitie)\b[^\s"'<>&#]*/gi
/** The same, tested once: a value still holding one after it was decoded was encoded past what is read, and is scrubbed whole. */
const STILL_ENCODED_JUSTICE_ROUTE = /%(?:25)*2F(?:justice|justitie)\b/iu
const SENSITIVE_FIELD_ASSIGNMENT_PATTERN =
  /\b(caseNumber|case_number|case-id|caseId|partyKey|party_key|party-key)\s*[:=]\s*["']?[^"',\s&})]+["']?/gi

/**
 * A path as the router reads it, decoded until it stops changing
 * (`/justice/%2563ases/…` is a case page too), and cut at a query or a
 * fragment that was encoded into it. Undecodable input stays as it is.
 */
function decodedPath(pathname: string): string {
  const path = decodedValue(pathname)
  return path.split(/[?#]/u)[0] ?? path
}

/** How many times a value is decoded before what is still encoded counts as hidden. */
const MAX_DECODE_ROUNDS = 4

/** A value decoded until it stops changing. Undecodable input stays as it is. */
function decodedValue(value: string): string {
  let current = value
  for (let round = 0; round < MAX_DECODE_ROUNDS; round += 1) {
    let next: string
    try {
      next = decodeURIComponent(current)
    } catch {
      break
    }
    if (next === current) break
    current = next
  }
  return current
}

const ABSOLUTE_ADDRESS_START = /^https?:\/\//iu

/**
 * A value as an address, decoded one layer at a time only until it reads as
 * one (`/…` or `http…`): each layer's own query keeps its escapes, so an
 * inner `%26caseNumber=…` stays inside the address it belongs to rather
 * than becoming a key of the page around it. Null when it never reads as an
 * address.
 */
function addressOf(value: string): string | null {
  let current = value
  for (let round = 0; round <= MAX_DECODE_ROUNDS; round += 1) {
    if (current.startsWith('/') || ABSOLUTE_ADDRESS_START.test(current)) return current
    let next: string
    try {
      next = decodeURIComponent(current)
    } catch {
      return null
    }
    if (next === current) return null
    current = next
  }
  return null
}

/** How deep a way back may hold another before the rest is scrubbed whole. */
const MAX_NESTED_ADDRESSES = 4
const JUSTICE_ROUTE_ANYWHERE = /\/(?:justice|justitie)\b/iu

/**
 * A query value that is itself an address — the way back another page
 * carries (`/cookies?redirect=%2Fjustice%2Fcases%2F…`) — read as the router
 * would and sanitized as one; a justice address quoted inside other text is
 * sanitized where it stands. What cannot be read to the end — encoded past
 * the rounds read, or nested past the depth — and could hold a justice
 * address is scrubbed whole. Any other value is returned as it was.
 */
function sanitizeAddressValue(value: string, depth: number): string {
  const address = addressOf(value)
  if (address === null) {
    const text = decodedValue(value)
    if (STILL_ENCODED_JUSTICE_ROUTE.test(text)) return REDACTED_JUSTICE_VALUE
    if (!JUSTICE_ROUTE_ANYWHERE.test(text)) return value
    const clean = text.replace(RELATIVE_ROUTE_PATTERN, (match) => sanitizeFragmentAt(match, depth + 1))
    return clean === text ? value : clean
  }
  if (depth > MAX_NESTED_ADDRESSES) {
    const text = decodedValue(address)
    return JUSTICE_ROUTE_ANYWHERE.test(text) || STILL_ENCODED_JUSTICE_ROUTE.test(text) ? REDACTED_JUSTICE_VALUE : value
  }
  const clean = ABSOLUTE_ADDRESS_START.test(address) ? sanitizeUrlAt(address, depth + 1) : sanitizeFragmentAt(address, depth + 1)
  return clean === address ? value : clean
}

/** A query's values that are addresses, each sanitized; the query is rebuilt only when one of them changed. */
function sanitizeNestedAddresses(queryString: string, depth: number): string {
  if (queryString.length === 0) return queryString
  const params = new URLSearchParams(queryString)
  const next = new URLSearchParams()
  let changed = false
  for (const [key, value] of params) {
    const clean = sanitizeAddressValue(value, depth)
    if (clean !== value) changed = true
    next.append(key, clean)
  }
  return changed ? next.toString() : queryString
}

/**
 * Returns true when a path belongs to the justice domain and must be
 * sanitized. Matches `/justice`, `/justice/...`, `/justitie`, `/justitie/...`,
 * but not unrelated paths that merely contain the substring.
 */
export function isJusticePath(pathname: string): boolean {
  if (!pathname) return false
  const path = decodedPath(pathname).toLowerCase()
  return ['/justice', '/justitie'].some((root) => path === root || path.startsWith(`${root}/`))
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
  const decoded = decodedPath(pathname)
  const casePage = JUSTICE_CASE_PAGE_PATTERN.exec(decoded)
  if (casePage) return `${casePage[1]}/${REDACTED_JUSTICE_CASE_NUMBER_SEGMENT}`
  // A justice path is reported as the router reads it: anything encoded into it after a query mark is gone.
  if (isJusticePath(pathname) && decoded !== pathname && !decoded.toLowerCase().startsWith(JUSTICE_CASE_DETAIL_PREFIX)) return decoded
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
  sanitized = sanitized.replace(ENCODED_JUSTICE_ROUTE_PATTERN, (match) => {
    // Read one layer at a time, as a query value is; one that never reads as an address is scrubbed whole.
    const address = addressOf(match)
    if (address === null) return REDACTED_JUSTICE_VALUE
    const clean = sanitizeAddressValue(address, 0)
    return clean === address ? match : encodeURIComponent(clean)
  })
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

/** A case number inside a page title („Dosarul 1234/117/2024 — …"): the titles name the case they show. */
const CASE_NUMBER_IN_TITLE = /\b\d{1,7}(?:[.,]\d{0,3}\.?)?\/[^\s—–,;)]+/gu
const TITLE_KEYS = new Set(['title', '$title'])

/**
 * An analytics event's properties as the SDK is about to send them: every
 * URL, path and keyed identifier scrubbed as above, and a page title's case
 * number replaced. The SDK adds its own properties after a capture call —
 * the current and previous URLs, the referrer, the document title — so this
 * runs on the final payload (`before_send`), not only on what the app passes.
 */
export function sanitizeJusticeEventProperties<T extends Record<string, unknown>>(properties: T): T {
  return redactTitles(sanitizeJusticeTelemetryValue(properties), 0) as T
}

/** Every title at any depth (`$set.title` too), its case number replaced. */
function redactTitles(value: unknown, depth: number): unknown {
  if (depth > 8 || !value || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    const next = value.map((item) => redactTitles(item, depth + 1))
    return next.some((item, index) => item !== value[index]) ? next : value
  }
  let changed = false
  const out: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const next =
      TITLE_KEYS.has(key) && typeof entry === 'string' ? entry.replace(CASE_NUMBER_IN_TITLE, REDACTED_JUSTICE_CASE_NUMBER_SEGMENT) : redactTitles(entry, depth + 1)
    if (next !== entry) changed = true
    out[key] = next
  }
  return changed ? out : value
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
  // Each key once: `keys()` repeats a key for each of its values.
  for (const key of new Set(params.keys())) {
    if (SAFE_PARAM_SET.has(key) && !STRIPPED_PARAM_SET.has(key)) {
      const values = params.getAll(key)
      const check = SAFE_JUSTICE_VALUES[key as keyof typeof SAFE_JUSTICE_VALUES]
      // A value the key cannot hold drops the key whole: no part of free text is kept.
      if (check && !values.every(check)) continue
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
 * routes. Non-justice URLs are returned unchanged, except a justice address
 * one of their query values carries (a way back). Hash is preserved.
 * Tolerates malformed input by returning it unchanged on parse failure.
 */
export function sanitizeJusticeUrl(url: string): string {
  return sanitizeUrlAt(url, 0)
}

function sanitizeUrlAt(url: string, depth: number): string {
  if (typeof url !== 'string' || url.length === 0) return url
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    // Not an absolute URL; try to sanitize as a pathname+search fragment.
    return sanitizeFragmentAt(url, depth)
  }
  if (
    !isJusticePath(parsed.pathname) &&
    !isJusticeLitigationProfilePath(parsed.pathname, parsed.search)
  ) {
    const query = parsed.search.slice(1)
    const nested = sanitizeNestedAddresses(query, depth)
    if (nested === query) return url
    parsed.search = `?${nested}`
    return parsed.toString()
  }
  const sanitizedSearch = sanitizeJusticeQueryString(parsed.pathname, parsed.search)
  parsed.pathname = sanitizeJusticePathname(parsed.pathname)
  parsed.search = sanitizedSearch.length > 0 ? `?${sanitizedSearch}` : ''
  return parsed.toString()
}

/**
 * Sanitizes a pathname+search fragment (no origin), e.g. the values TanStack
 * Router exposes via `location.pathname` / `location.searchStr`, or relative
 * hrefs. Non-justice fragments are returned unchanged, except a justice
 * address one of their query values carries: the cookie settings' way back
 * from a case page (`/cookies?redirect=%2Fjustice%2Fcases%2F…`).
 */
export function sanitizeJusticeUrlFragment(fragment: string): string {
  return sanitizeFragmentAt(fragment, 0)
}

function sanitizeFragmentAt(fragment: string, depth: number): string {
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
    const nested = sanitizeNestedAddresses(queryString, depth)
    return nested === queryString ? fragment : `${pathname}?${nested}${hash}`
  }
  const sanitized = sanitizeJusticeQueryString(pathname, queryString)
  const sanitizedPathname = sanitizeJusticePathname(pathname)
  const searchPart = sanitized.length > 0 ? `?${sanitized}` : ''
  return `${sanitizedPathname}${searchPart}${hash}`
}
