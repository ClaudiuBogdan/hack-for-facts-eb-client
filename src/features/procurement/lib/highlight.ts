/**
 * Match emphasis from the search engine, applied to the DATABASE value.
 *
 * The engine returns a fragment: a window of the indexed text with the matched
 * terms wrapped in U+27E6 … U+27E7 (verified absent from every highlightable
 * column of all three grains). That fragment is NOT the record — it is capped
 * at 200 characters, so a 322-character title comes back truncated with no
 * ellipsis, and it is as of the index build while the row is read live from
 * Postgres.
 *
 * So the fragment is used only to learn WHICH substrings matched; those terms
 * are then marked inside the value Postgres served. A truncated, stale, or
 * unparseable fragment therefore degrades to the plain database text — it can
 * never replace it, shorten it, or show text the database no longer holds.
 *
 * Nothing here parses HTML: `markTerms` returns text segments and the caller
 * emits its own element, so a title containing `<script>` stays the literal
 * string `<script>`.
 */

import { PROCUREMENT_Q_MIN_LENGTH } from '@/schemas/procurement-search'

import type { ProcurementSearchHighlight } from '@/schemas/procurement'

export const HIGHLIGHT_OPEN = '⟦'
export const HIGHLIGHT_CLOSE = '⟧'

/**
 * One character is a real match: `q="lot x"` marks both `LOT` and `X`. Safe
 * because a mark must span a WHOLE word (see `markTerms`).
 */
const MIN_TERM_LENGTH = 1
/** A fragment with more distinct terms than this is not a highlight, it is noise. */
const MAX_TERMS = 20

export type HighlightSegment = {
  readonly text: string
  readonly marked: boolean
}

/** Letters and digits are word characters; everything else is a boundary. */
const WORD_CHAR = /[\p{L}\p{N}]/u

const atWordStart = (text: string, index: number): boolean =>
  index === 0 || !WORD_CHAR.test(text.charAt(index - 1))

const atWordEnd = (text: string, index: number): boolean =>
  index === text.length || !WORD_CHAR.test(text.charAt(index))

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')

/**
 * The distinct substrings a fragment marked, longest first (so an overlapping
 * pair marks the more specific one). An unbalanced fragment — the highlighter
 * trims a marker that lands on a fragment boundary — contributes the terms it
 * did close, and nothing else.
 */
export function markedTerms(fragment: string): readonly string[] {
  const terms = new Set<string>()
  let rest = fragment
  while (rest.length > 0 && terms.size < MAX_TERMS) {
    const open = rest.indexOf(HIGHLIGHT_OPEN)
    if (open === -1) break
    const close = rest.indexOf(HIGHLIGHT_CLOSE, open + 1)
    if (close === -1) break
    const term = rest.slice(open + 1, close)
    if (term.length >= MIN_TERM_LENGTH) terms.add(term)
    rest = rest.slice(close + 1)
  }
  return [...terms].sort((a, b) => b.length - a.length)
}

/**
 * Mark `terms` inside `text` — the authoritative database value. Matching is
 * case-insensitive because the index may hold a differently-cased older copy;
 * the emitted text is always `text`'s own, never the fragment's.
 */
export function markTerms(
  text: string,
  terms: readonly string[],
  options: { readonly wholeWord?: boolean } = {},
): readonly HighlightSegment[] {
  const wholeWord = options.wholeWord ?? true
  const usable = terms.filter((term) => term.length >= MIN_TERM_LENGTH)
  if (usable.length === 0) return [{ text, marked: false }]

  // Matched case-insensitively against the ORIGINAL string. Lower-casing the
  // text first would be wrong: `İ`.toLowerCase() is TWO characters, so on a
  // supplier like `NOKSEL ÇELİK BORU SANAYİ` every offset after it drifts and
  // the marks land on the wrong span.
  let pattern: RegExp
  try {
    pattern = new RegExp(
      usable
        .slice()
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join('|'),
      'giu',
    )
  } catch {
    return [{ text, marked: false }]
  }

  const segments: HighlightSegment[] = []
  let plainFrom = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const start = match.index
    const end = start + match[0].length
    // A mark must span a WHOLE word. The engine highlights whole tokens, so
    // every real term is one; without the end boundary a term like `de` also
    // marks the head of `demolare`, telling the reader the record matched on a
    // word it never matched.
    if (wholeWord && (!atWordStart(text, start) || !atWordEnd(text, end))) {
      pattern.lastIndex = start + 1
      continue
    }
    if (start > plainFrom) {
      segments.push({ text: text.slice(plainFrom, start), marked: false })
    }
    segments.push({ text: text.slice(start, end), marked: true })
    plainFrom = end
    pattern.lastIndex = end
  }
  if (segments.length === 0) return [{ text, marked: false }]
  if (plainFrom < text.length) {
    segments.push({ text: text.slice(plainFrom), marked: false })
  }
  return segments
}

/**
 * The database `text` with the fragment's matches marked. `null` fragment, no
 * marks found, or a fragment describing text the database no longer holds — all
 * render as the plain database value.
 */
export function markFromFragment(
  text: string,
  fragment: string | null | undefined,
): readonly HighlightSegment[] {
  if (fragment == null || fragment === '') return [{ text, marked: false }]
  return markTerms(text, markedTerms(fragment))
}

/** The fragment with every sentinel removed — the plain-text reading. */
export function stripHighlight(fragment: string): string {
  return fragment.split(HIGHLIGHT_OPEN).join('').split(HIGHLIGHT_CLOSE).join('')
}

/**
 * Mark the literal query — for a page the DATABASE answered.
 *
 * There are no fragments on that path: `q` is one `ILIKE '%q%'`, so the match IS
 * the whole query string as a raw substring. Word boundaries are therefore NOT
 * required here (the database matched mid-word too), and a multi-word query
 * marks as the single phrase it actually matched, not as separate words.
 */
export function markLiteral(
  text: string,
  query: string | undefined,
): readonly HighlightSegment[] {
  const trimmed = query?.trim() ?? ''
  if (trimmed.length < PROCUREMENT_Q_MIN_LENGTH) return [{ text, marked: false }]
  return markTerms(text, [trimmed], { wholeWord: false })
}

/** Index a page's fragments by record id, for O(1) lookup while rendering. */
export function highlightsById(
  highlights: readonly ProcurementSearchHighlight[] | undefined,
): ReadonlyMap<string, ProcurementSearchHighlight> {
  return new Map((highlights ?? []).map((highlight) => [highlight.id, highlight]))
}
