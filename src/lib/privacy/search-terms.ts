/**
 * Readers' search text out of telemetry (docs/design/landing-search-query-param.md,
 * decision 9). A search link (`/?q=primaria cluj`) carries what a reader
 * looked for, and an address reaches telemetry in many places: PostHog's
 * current and previous URLs and referrers, the pageview the app captures,
 * Sentry's request URL and query string, breadcrumbs and error contexts, and a
 * return address nested in another (the cookie settings' `redirect`), escaped
 * whole, in part, or not at all.
 *
 * The rule is the site's search parameter itself, wherever it appears: every
 * `q` parameter's value becomes `_`, on any page. Deciding which page a `q`
 * belongs to would mean resolving paths the way each route does; every
 * attempt at that missed a shape the app accepts. Other pages' `q` (the
 * parliament and classification searches) is reader-typed text too, and
 * over-scrubbing telemetry is the safe direction (TEL-001).
 *
 * Read in one pass, with nothing decoded: a parameter starts after `?`, `&`,
 * `&amp;` or their escapes (`%3F`, `%26`, escaped any number of times — the
 * footer's cookie link wraps the current address again on each visit), its name is `q`
 * or its escape (`%71`), and `=` may be escaped (`%3D`). Its value runs to the
 * next parameter (an `&`, `&amp;` or `%26` followed by a name and its `=`), a
 * fragment (`#`), whitespace, or
 * a `"`, `<` or `>` (which no address leaves unescaped, and which close the
 * JSON string or HTML attribute it sits in). The characters an address does
 * leave unescaped — `'`, `(`, `)`, `!`, `*`, `~`, the backtick — are part of
 * the value, as are an escaped space, `&`, `#` or line break (a search can
 * hold one; an escaped list of addresses is masked from its first `q` on, the
 * safe direction) and an HTML entity
 * (`&#x27;`, `&quot;`). Pure; each `&` looks ahead a bounded distance, so the
 * work is linear in the string's length.
 *
 * PostHog stores campaign parameters (`utm_content`, …) decoded, `+` read as a
 * space, so an address inside one has lost its boundaries: such a value that
 * holds a search is masked whole (`isDecodedCampaignKey`).
 */

export const SEARCH_TERM_MASK = '_'

/** A `q` parameter's start: a separator, the name, the `=` — each plain or escaped any number of times. */
const SEARCH_PARAM = /(?:^|[?&]|&amp;|%(?:25)*26amp%(?:25)*3B|%(?:25)*(?:3F|26))(?:q|%(?:25)*(?:71|51))(?:=|%(?:25)*3D)/giu
/** Where a value ends: whitespace, a fragment, or a character no address leaves unescaped. */
const VALUE_END = /[\s#"<>]/u
/** An HTML entity other than `&amp;` (`&#x27;`, `&#39;`, `&quot;`): part of the value, its `#` no fragment. */
const HTML_ENTITY = /&(?!amp;)(?:#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});/iuy
/** An `&`, plain, HTML-escaped, URL-escaped any number of times, or both (`%26amp%3B`). */
const AMPERSAND = /&amp;|&|%(?:25)*26amp%(?:25)*3B|%(?:25)*26/iuy
/** An `=`, plain or escaped any number of times. */
const EQUALS = /=|%(?:25)*3D/iuy
/** Where a parameter's name cannot go on: whitespace, a fragment, quotes, markup, another separator. */
const NAME_END = /[\s#"<>;&]/u
/** How far after an `&` a parameter's `=` is looked for. */
const MAX_NAME_CHARS = 64

/** A string with every `q` parameter's value masked; any other string unchanged. */
export function withoutSearchTerms(value: string): string {
  if (value.length === 0) return value
  let out = ''
  let from = 0
  SEARCH_PARAM.lastIndex = 0
  for (let match = SEARCH_PARAM.exec(value); match; match = SEARCH_PARAM.exec(value)) {
    const start = match.index + match[0].length
    const end = valueEnd(value, start)
    if (end > start) {
      out += value.slice(from, start) + SEARCH_TERM_MASK
      from = end
    }
    SEARCH_PARAM.lastIndex = Math.max(end, start)
  }
  return from === 0 ? value : out + value.slice(from)
}

/** Where the value starting at `start` ends. */
function valueEnd(text: string, start: number): number {
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (VALUE_END.test(char)) return index
    if (char === '&') {
      const entity = matchAt(HTML_ENTITY, text, index)
      if (entity) {
        index += entity[0].length - 1
        continue
      }
    }
    if ((char === '&' || char === '%') && startsNextParam(text, index)) return index
  }
  return text.length
}

/**
 * Whether an `&` at `index` starts the next parameter: a separator (`&`,
 * `&amp;`, `%26`) followed by a name and its `=`. An `&` that is the reader's own text
 * (`a%26b`, `&quot;`) does not. A search text that itself holds `&name=` reads
 * as two parameters, and only its first part is masked.
 */
function startsNextParam(text: string, index: number): boolean {
  const separator = matchAt(AMPERSAND, text, index)
  if (!separator) return false
  const limit = Math.min(text.length, index + separator[0].length + MAX_NAME_CHARS)
  for (let at = index + separator[0].length; at < limit; at += 1) {
    const char = text[at]
    if (matchAt(EQUALS, text, at)) return at > index + separator[0].length
    if (NAME_END.test(char) || matchAt(AMPERSAND, text, at)) return false
  }
  return false
}

/** A sticky pattern's match exactly at `index`, or null. */
function matchAt(pattern: RegExp, text: string, index: number): RegExpExecArray | null {
  pattern.lastIndex = index
  return pattern.exec(text)
}

/**
 * Keys whose value is a search term itself, whatever its shape: `q` (a query
 * string parsed into an object, `{ q: ['Cluj', 'Napoca'] }`), and the search
 * engine keyword PostHog copies out of an external referrer's own `q`
 * (`ph_keyword`, `$initial_ph_keyword`, `$session_entry_ph_keyword`).
 */
const SEARCH_TERM_KEY = /^(?:q|.*ph_keyword)$/iu

/** A telemetry object's key that holds a search term. */
export function isSearchTermKey(key: string | undefined): boolean {
  return key !== undefined && SEARCH_TERM_KEY.test(key.trim())
}

/** A query string as key/value pairs (`[['q', 'Cluj']]`): the pair whose value is a search term. */
export function isSearchTermPair(value: unknown): value is readonly [string, unknown] {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && value[0].trim().toLowerCase() === 'q'
}

/**
 * The campaign parameters PostHog copies out of the address, decoded and `+`
 * read as a space (posthog-js `CAMPAIGN_PARAMS`, @posthog/browser-common
 * `event-utils`), under their own names and with its `$initial_` and
 * `$session_entry_` prefixes. Decoding took the value's boundaries away, so
 * one that holds a search is masked whole.
 */
const DECODED_CAMPAIGN_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gad_source', 'mc_cid',
  'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'twclid', 'li_fat_id', 'igshid',
  'ttclid', 'rdt_cid', 'epik', 'qclid', 'sccid', 'irclid', '_kx',
])
const POSTHOG_PROPERTY_PREFIX = /^\$(?:initial_|session_entry_)?/u

/** Whether a telemetry key is a campaign parameter PostHog stores decoded. */
export function isDecodedCampaignKey(key: string | undefined): boolean {
  return key !== undefined && DECODED_CAMPAIGN_PARAMS.has(key.replace(POSTHOG_PROPERTY_PREFIX, '').toLowerCase())
}

/** Whether a string holds a `q` parameter at all, whatever its value. */
export function holdsSearchParam(value: string): boolean {
  SEARCH_PARAM.lastIndex = 0
  return SEARCH_PARAM.test(value)
}
