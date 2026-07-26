/**
 * The sitting's agenda, and the DOM anchors the reader navigates by.
 *
 * Kept out of the components so the derivation is testable on its own — and
 * because the anchor id is a contract shared by three callers (the table of
 * contents, `?interventie=`, and in-document match stepping), which is exactly
 * the kind of thing that rots when each one spells it out inline.
 */
import type { ParliamentStenogramSegment } from '@/schemas/parliament'

/**
 * DOM id of a reading block, keyed by its POSITION in the printed order.
 * Position is the document's identity — the database enforces
 * `(sessionKey, position)` unique — so an anchor built from it survives
 * re-renders, paging, and a re-parse that changes segment keys.
 */
export function segmentDomId(position: number): string {
  return `stenogram-block-${String(position)}`
}

export interface StenogramTocEntry {
  readonly segmentKey: string
  readonly position: number
  readonly label: string
  /** Contributions printed under this heading — the size of the section. */
  readonly speechCount: number
}

/**
 * Build the agenda FROM THE DOCUMENT.
 *
 * The table of contents is not invented: it is the sequence of AGENDA_HEADING
 * blocks the official transcript printed, in the order it printed them, each
 * counting the SPEECH blocks that follow it. When a capture printed no
 * headings there IS no agenda, and the rail says so — synthesising one out of
 * speaker names would present our structure as the institution's.
 */
export function buildStenogramToc(
  segments: readonly ParliamentStenogramSegment[],
): readonly StenogramTocEntry[] {
  const entries: StenogramTocEntry[] = []
  let current: {
    segmentKey: string
    position: number
    label: string
    speechCount: number
  } | null = null

  for (const segment of segments) {
    if (segment.kind === 'AGENDA_HEADING') {
      if (current) entries.push(current)
      current = {
        segmentKey: segment.segmentKey,
        position: segment.position,
        label: segment.text.trim().split('\n')[0] ?? '',
        speechCount: 0,
      }
      continue
    }
    if (segment.kind === 'SPEECH' && current) current.speechCount += 1
  }
  if (current) entries.push(current)
  return entries
}
