/**
 * Showing the reader *why* a result matched.
 *
 * A search that returns "Municipiul Cluj-Napoca" for the query `cluj` has
 * answered the question, but it has not shown its work. Marking the matched
 * span is what turns a list of names into evidence that the search understood
 * the input — and, when the match lands somewhere unexpected, it is the only
 * way the reader can tell why a result is there at all.
 *
 * The whole problem is Romanian. Names arrive from the source with diacritics —
 * `Iași`, `Constanța`, `Brăila` — and are typed without them roughly always.
 * Matching therefore has to happen on a folded form, but the *highlight* has to
 * land on the original string, or the marks fall a character to the left for
 * every diacritic they follow. So folding here records where each folded
 * character came from, and the ranges are mapped back before they are returned.
 *
 * Two further Romanian details, both of which produce silent misses:
 *
 * - `ș`/`ț` exist twice in Unicode — with a comma below (U+0219/U+021B, correct
 *   Romanian) and with a cedilla (U+015F/U+0163, the Turkish letters, still
 *   common in older public records). Decomposition reduces both to `s`/`t`,
 *   which is why folding runs through NFD rather than a character table.
 * - `î` and `â` are the same sound and are spelled differently by position, so a
 *   reader who types one may be looking at the other. Both fold to `a`/`i`
 *   respectively and stop being a distinction, which is the desired outcome.
 *
 * Nothing here touches React. It is exported as pure functions so the folding
 * can be tested against real place names rather than inferred from what the
 * dropdown looked like.
 */

/** A matched span, in indices into the *original* string. */
export type MatchRange = {
  readonly start: number
  readonly end: number
}

/** A piece of the original string, flagged as matched or not. */
export type HighlightSegment = {
  readonly text: string
  readonly match: boolean
}

type Folded = {
  readonly folded: string
  /** Where each folded character starts in the original, in code units. */
  readonly starts: readonly number[]
  /** Where each folded character ends in the original, in code units. */
  readonly ends: readonly number[]
}

/**
 * Lower-case, strip combining marks, and remember the origin of every character
 * that survives.
 *
 * Iteration is by code point rather than by index, so a character outside the
 * BMP advances the offset by two code units and the ranges stay aligned. Folding
 * is not always one-to-one — a character can expand or vanish — which is the
 * reason for two parallel arrays instead of a single offset.
 */
function fold(text: string): Folded {
  let folded = ''
  const starts: number[] = []
  const ends: number[] = []
  let offset = 0

  for (const char of text) {
    const stripped = char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    for (const piece of stripped) {
      folded += piece
      starts.push(offset)
      ends.push(offset + char.length)
    }
    offset += char.length
  }

  return { folded, starts, ends }
}

/** Sorted, with touching and overlapping ranges joined into one. */
function merge(ranges: readonly MatchRange[]): readonly MatchRange[] {
  if (ranges.length < 2) return ranges

  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end)
  const merged: MatchRange[] = [sorted[0]]

  for (const range of sorted.slice(1)) {
    const last = merged[merged.length - 1]
    // Adjacent counts as overlapping: two tokens that happen to match either
    // side of a hyphen should read as one mark, not as two with a seam.
    if (range.start <= last.end) {
      if (range.end > last.end) merged[merged.length - 1] = { start: last.start, end: range.end }
      continue
    }
    merged.push(range)
  }

  return merged
}

/**
 * Where `query` occurs in `text`, ignoring case and diacritics.
 *
 * The query is split on whitespace and each token matched independently, so
 * `mun cluj` marks both words of `Mun. Cluj-Napoca` without the punctuation
 * between them having to be guessed. Every occurrence of a token is marked, not
 * just the first: a reader scanning for `bucuresti` in
 * `Sectorul 1 al Municipiului București` should see the one place it appears,
 * and if a name repeats a word, hiding the second occurrence is a lie about
 * where the match was.
 */
export function matchRanges(text: string, query: string): readonly MatchRange[] {
  if (!text || !query.trim()) return []

  const haystack = fold(text)
  const tokens = [...new Set(fold(query).folded.split(/\s+/).filter(Boolean))]
  const ranges: MatchRange[] = []

  for (const token of tokens) {
    let from = 0
    for (;;) {
      const at = haystack.folded.indexOf(token, from)
      if (at === -1) break
      ranges.push({ start: haystack.starts[at], end: haystack.ends[at + token.length - 1] })
      // Advance by one rather than by the token length, so overlapping
      // occurrences of a repeated token ('aa' in 'aaa') are all found.
      from = at + 1
    }
  }

  return merge(ranges)
}

/**
 * The original string cut into matched and unmatched pieces, in order.
 *
 * This rather than `matchRanges` is what a component wants: it can map straight
 * to elements without doing index arithmetic in JSX, and the concatenation of
 * every segment is exactly the input, so a rendering bug cannot drop or
 * duplicate part of a name.
 */
export function highlightSegments(text: string, query: string): readonly HighlightSegment[] {
  const ranges = matchRanges(text, query)
  if (ranges.length === 0) return text ? [{ text, match: false }] : []

  const segments: HighlightSegment[] = []
  let cursor = 0

  for (const range of ranges) {
    if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start), match: false })
    segments.push({ text: text.slice(range.start, range.end), match: true })
    cursor = range.end
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false })

  return segments
}
