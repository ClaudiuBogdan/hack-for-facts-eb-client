/**
 * Procurement party codes out of telemetry (D6, root 19 November 2026; issue
 * TEL-001, "Keep party codes out of telemetry").
 *
 * A direct-purchase supplier the API withholds may be a person, and its code
 * must not reach a third-party processor (PostHog, Sentry). In any telemetry
 * string:
 * - under `/procurement`, the segment after `/suppliers/`, `/institutions/`,
 *   `/companies/` or `/winners/` (a contract-award winner's list, KB0Z)
 *   becomes `_`;
 * - on the company page (`/companies/<cui>`, at the root of a path), the code
 *   becomes `_` (its own `/companies/analytics` and `/companies/search` are
 *   not codes);
 * - the analytics page's party filters (`furnizor`, `cumparator`) become `_`
 *   wherever a query string carries them.
 *
 * Matched without regard to case (the router matches `/Procurement/…`), after
 * reading up to three layers of URL encoding (a query value carrying an address,
 * an escaped digit). A string that changes is returned decoded; one that does
 * not is returned as it was. Words are scrubbed one at a time, so prose around
 * an address and its closing punctuation stay. Pure; over-scrubbing telemetry
 * is the safe direction.
 */

export const PARTY_CODE_MASK = '_'

const MAYBE_IN_SCOPE = /procurement|companies|furnizor|cumparator|supplier_cui|authority_cui/iu
const SEPARATORS = /(\s+|["'`<>])/u
const TRAILING_PUNCTUATION = /[).,;:!\]}]+$/u
const COMPANY_PAGES = new Set(['analytics', 'search'])

/** Under `/procurement`, the code after a party's segment. */
const PROCUREMENT_PARTY = /(\/procurement(?:\/[^/?#]+)*?\/(?:suppliers|institutions|companies|winners)\/)[^/?#]+/giu
/** The company page's code: `/companies/` at the root of a path (string start, after a host, after `=`, `(` or `,`, or after an escape left unread). */
const COMPANY_PAGE = /((?:^|[=(,]|%[0-9A-F]{2}|:\/\/[^/?#]*))(\/companies\/)([^/?#]+)/giu
/** A party filter whose value is quoted. */
const QUOTED_PARTY_PARAM = /((?:^|[?&])(?:furnizor|cumparator|supplier_cui|authority_cui)=)(["'])[^"'&#]*\2/giu
/** The analytics page's party filters (and their legacy names), in any query string, with or without its `?`. */
const PARTY_PARAM = /((?:^|[?&])(?:furnizor|cumparator|supplier_cui|authority_cui)=)[^&#]+/giu

/** A string with every procurement party code in it replaced; any other string unchanged. */
export function withoutProcurementPartyCodes(value: string): string {
  if (value.length === 0 || !MAYBE_IN_SCOPE.test(decoded(value))) return value
  return value
    // A quoted filter value in text (`?furnizor="4267117"`): its quotes would split it from its name below.
    .replace(QUOTED_PARTY_PARAM, `$1$2${PARTY_CODE_MASK}$2`)
    .split(SEPARATORS)
    .map((word) => scrubWord(word))
    .join('')
}

function scrubWord(word: string): string {
  if (word.length === 0 || !MAYBE_IN_SCOPE.test(decoded(word))) return word
  const trailing = TRAILING_PUNCTUATION.exec(word)?.[0] ?? ''
  const core = word.slice(0, word.length - trailing.length)
  const plain = decoded(core)
  const scrubbed = plain
    .replace(PROCUREMENT_PARTY, `$1${PARTY_CODE_MASK}`)
    .replace(COMPANY_PAGE, (match, before: string, path: string, code: string) => (COMPANY_PAGES.has(code.toLowerCase()) ? match : `${before}${path}${PARTY_CODE_MASK}`))
    .replace(PARTY_PARAM, `$1${PARTY_CODE_MASK}`)
  return scrubbed === plain ? word : `${scrubbed}${trailing}`
}

/** Up to three layers of URL encoding read; an escape that is not valid is read where it can be and kept where not. */
function decoded(text: string): string {
  let out = text
  for (let layer = 0; layer < 3 && out.includes('%'); layer += 1) {
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
