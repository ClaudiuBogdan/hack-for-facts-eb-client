/**
 * In-document search over a loaded transcript.
 *
 * This is a READING AID, not the server search: it only ever looks at blocks
 * already fetched, so it can be diacritic-FORGIVING where the server's
 * full-history search is diacritic-sensitive. A Romanian reader typing "sanatate"
 * expects to find "sănătate" in the page in front of them.
 *
 * The folding is deliberately character-for-character rather than
 * `normalize('NFD')`: NFD decomposition changes the string LENGTH (`ă` becomes
 * two code units), which would slide every match offset after the first
 * diacritic and highlight the wrong span. A 1:1 map keeps offsets valid against
 * the original text, so highlights land exactly on the matched characters.
 */

const DIACRITIC_FOLD: Readonly<Record<string, string>> = {
  ă: 'a',
  â: 'a',
  î: 'i',
  ș: 's',
  ş: 's',
  ț: 't',
  ţ: 't',
  Ă: 'A',
  Â: 'A',
  Î: 'I',
  Ș: 'S',
  Ş: 'S',
  Ț: 'T',
  Ţ: 'T',
}

/** Length-preserving Romanian fold + lowercase. */
export function foldForSearch(text: string): string {
  let out = ''
  for (const char of text) {
    out += DIACRITIC_FOLD[char] ?? char
  }
  return out.toLowerCase()
}

/** Shortest query that is worth running — one letter matches everything. */
export const DOCUMENT_SEARCH_MIN_LENGTH = 2

export interface DocumentMatch {
  readonly segmentKey: string
  /** Block position in the printed order — the anchor the reader scrolls to. */
  readonly position: number
  /** Character offsets INTO THE ORIGINAL (unfolded) block text. */
  readonly start: number
  readonly end: number
}

/**
 * Every occurrence of `query`, in document order. Overlapping matches are not
 * produced — the scan advances past each hit, so "aa" in "aaa" yields one match,
 * which is what a reader stepping through hits expects.
 */
export function findDocumentMatches(
  segments: ReadonlyArray<{
    readonly segmentKey: string
    readonly position: number
    readonly text: string
  }>,
  query: string,
): readonly DocumentMatch[] {
  const needle = foldForSearch(query.trim())
  if (needle.length < DOCUMENT_SEARCH_MIN_LENGTH) return []

  const matches: DocumentMatch[] = []
  for (const segment of segments) {
    const haystack = foldForSearch(segment.text)
    let from = 0
    for (;;) {
      const index = haystack.indexOf(needle, from)
      if (index === -1) break
      matches.push({
        segmentKey: segment.segmentKey,
        position: segment.position,
        start: index,
        end: index + needle.length,
      })
      from = index + needle.length
    }
  }
  return matches
}

export interface HighlightPart {
  readonly text: string
  readonly isMatch: boolean
  /** Index into the document-wide match list — drives the "current hit" ring. */
  readonly matchIndex?: number
}

/**
 * Split one block's text into alternating plain/matched runs for rendering.
 * `matches` must be the slice of the document-wide list belonging to this
 * block, and `offset` the index the first of them has in that list, so a part
 * can name its global hit number without recomputing the search.
 */
export function splitByMatches(
  text: string,
  matches: readonly DocumentMatch[],
  offset: number,
): readonly HighlightPart[] {
  if (matches.length === 0) return [{ text, isMatch: false }]

  const parts: HighlightPart[] = []
  let cursor = 0
  matches.forEach((match, index) => {
    if (match.start > cursor) {
      parts.push({ text: text.slice(cursor, match.start), isMatch: false })
    }
    parts.push({
      text: text.slice(match.start, match.end),
      isMatch: true,
      matchIndex: offset + index,
    })
    cursor = match.end
  })
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), isMatch: false })
  }
  return parts
}

/**
 * Group a document-wide match list by block, carrying each group's offset in
 * the global list. Built once per search so rendering a block is O(its matches).
 */
export function groupMatchesBySegment(
  matches: readonly DocumentMatch[],
): ReadonlyMap<string, { matches: DocumentMatch[]; offset: number }> {
  const grouped = new Map<string, { matches: DocumentMatch[]; offset: number }>()
  matches.forEach((match, index) => {
    const existing = grouped.get(match.segmentKey)
    if (existing) {
      existing.matches.push(match)
      return
    }
    grouped.set(match.segmentKey, { matches: [match], offset: index })
  })
  return grouped
}

/** Wrap-around step through the hit list — `next`/`previous` never dead-end. */
export function stepMatch(
  current: number,
  total: number,
  direction: 1 | -1,
): number {
  if (total === 0) return 0
  return (current + direction + total) % total
}
