/**
 * Procurement party codes out of telemetry (D6, root 19 November 2026; issue
 * TEL-001, "Keep party codes out of telemetry").
 *
 * A direct-purchase supplier the API withholds may be a person, and its code
 * must not reach a third-party processor (PostHog, Sentry). The rule is
 * deliberately blunt, so that no spelling of an address gets past it:
 *
 * 1. Each whitespace-separated word is read through every layer of URL
 *    encoding, and a backslash is read as a slash (browsers do both before
 *    routing).
 * 2. The word's first party marker is found: a party path word (`suppliers`,
 *    `institutions`, `companies`, `winners`, standing as a word of its own) or
 *    a party filter (`furnizor=`, `cumparator=`, `supplier_cui=`,
 *    `authority_cui=`).
 * 3. After it, every run of letters and digits that holds a digit becomes `_`:
 *    the code, however it is escaped, split, dotted or parameterised, and with
 *    it any other number in the rest of the word (`?year=2025` → `?year=_`).
 *
 * The company hub's own pages (`/companies/analytics`, `/companies/search`)
 * are no marker when nothing but a query or a fragment follows them. Matched
 * without regard to case. A word with no marker is returned as it was; one
 * with a marker is returned read. Pure; over-scrubbing telemetry is the safe
 * direction.
 */

export const PARTY_CODE_MASK = '_'

/** Party path words and filters, each a word of its own (no letter, digit or underscore on either side). */
const MARKER = /(?<![\p{L}\p{N}_])(?:(suppliers|institutions|companies|winners)(?![\p{L}\p{N}_])|(furnizor|cumparator|supplier_cui|authority_cui)\s*=)/giu
/** The company hub's own pages, when only a query or a fragment with no further path follows. */
const COMPANY_HUB_PAGE = /^\/(?:analytics|search)(?:[?#][^/]*)?$/iu
/** A run of letters and digits holding a digit: a code, however written. */
const CODE_LIKE = /[\p{L}\p{N}]*\p{N}[\p{L}\p{N}]*/gu
/** Enough layers for any escape a person or a tool would stack; a longer chain is masked whole. */
const MAX_LAYERS = 12

/** A string with every procurement party code in it replaced; any other string unchanged. */
export function withoutProcurementPartyCodes(value: string): string {
  if (value.length === 0) return value
  return value
    .split(/(\s+)/u)
    .map((word) => (/^\s*$/u.test(word) ? word : scrubWord(word)))
    .join('')
}

function scrubWord(word: string): string {
  const read = decoded(word)
  if (read === null) return word.replace(CODE_LIKE, PARTY_CODE_MASK)
  const plain = read.replace(/\\/gu, '/')
  const at = markerEnd(plain)
  if (at === null) return word
  return `${plain.slice(0, at)}${plain.slice(at).replace(CODE_LIKE, PARTY_CODE_MASK)}`
}

/** Where the word's first party marker ends, or null when it has none. */
function markerEnd(text: string): number | null {
  for (const match of text.matchAll(MARKER)) {
    const end = (match.index ?? 0) + match[0].length
    // The company hub's own pages, and nothing after them that could lead elsewhere.
    if (match[1]?.toLowerCase() === 'companies' && COMPANY_HUB_PAGE.test(text.slice(end))) continue
    return end
  }
  return null
}

/**
 * Every layer of URL encoding read; an escape that is not valid is read where
 * it can be and kept where not. Null when the chain is longer than any reader
 * would stack: the caller masks the word whole.
 */
function decoded(text: string): string | null {
  let out = text
  for (let layer = 0; out.includes('%'); layer += 1) {
    if (layer >= MAX_LAYERS) return null
    const next = out.replace(/(?:%[0-9A-F]{2})+/giu, (run) => {
      try {
        return decodeURIComponent(run)
      } catch {
        // A malformed byte in the run: each ASCII escape is still read (a digit, a slash), the rest kept as written.
        return run.replace(/%[0-7][0-9A-F]/giu, (escape) => String.fromCharCode(Number.parseInt(escape.slice(1), 16)))
      }
    })
    if (next === out) break
    out = next
  }
  return out
}

/** A fiscal code named in text: „CUI 14837428", „(CUI RO14837428)", „tax ID BG131128432", „CIF: 14837428", „CUI "7"". */
const NAMED_CODE = /\b(CUI|CIF|tax ID|VAT ID)(\s*:?\s*)(["']?)(?:[A-Z]{2}\s*)?\d+\3/giu

/**
 * Text without the fiscal codes it names (TEL-001): a page title the analytics
 * SDK sends („X SRL (CUI 14837428)", „Firma cu CUI 14837428"), and an element's
 * label a click breadcrumb copies („Copiază CUI 14837428").
 */
export function withoutNamedCodes(text: string): string {
  return text.replace(NAMED_CODE, `$1$2$3${PARTY_CODE_MASK}$3`)
}

/** Page titles: the same rule. */
export const withoutCodesInTitle = withoutNamedCodes
