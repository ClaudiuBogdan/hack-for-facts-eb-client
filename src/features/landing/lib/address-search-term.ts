/**
 * The landing's search from the address (`/?q=`), as a link carries it
 * (docs/design/landing-search-query-param.md). The site's `SearchAction`
 * promises `/?q={search_term_string}`: a standard query string, so `+` and
 * `%20` are spaces and `%2B` is a plus.
 *
 * Two steps, on purpose. The route keeps the value as the router read it
 * (`readAddressQuery`): the app's codec reads every value as JSON first, so a
 * CUI arrives as a number, and a validated search that serialised differently
 * would make the server render redirect. The field's text is derived from that
 * value (`searchTermFromAddress`).
 */

/** `q` as the router read it: text, or a number or word the codec took for JSON. */
export type AddressQuery = string | number | boolean

/** The longest term an address may seed, in Unicode code points. Typing is not limited. */
export const MAX_ADDRESS_QUERY_CHARS = 200

/** A run of control characters (CR, LF, tab, …): a text field is one line. */
const CONTROL_RUN = /\p{Cc}+/gu

/**
 * What the route keeps of `q`: a string, a boolean or a safe integer, as read.
 * Anything else — a repeated `q` (an array), an object, `null`, a number the
 * codec could not hold exactly — is no search.
 */
export function readAddressQuery(value: unknown): AddressQuery | undefined {
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value
  return undefined
}

/** The field's text for an address query: one line, trimmed, at most `MAX_ADDRESS_QUERY_CHARS`; none when empty. */
export function searchTermFromAddress(query: AddressQuery | undefined): string | undefined {
  if (query === undefined) return undefined
  const line = String(query).replace(CONTROL_RUN, ' ').trim()
  const term = Array.from(line).slice(0, MAX_ADDRESS_QUERY_CHARS).join('').trimEnd()
  return term || undefined
}
