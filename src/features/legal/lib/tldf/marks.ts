/**
 * Mark slicing — pure. Turns document-level marks (spans over the folded
 * clean text) into per-run segments the renderer can style/link.
 *
 * Correctness properties (unit-tested against the real fixtures):
 *  - Segmentation is a partition: concatenating a run's segment texts always
 *    reproduces the run text exactly — a mark can move or lose a link, but it
 *    can NEVER drop or duplicate a character of a law's text.
 *  - Marks apply only where they overlap the run's span; adjacent marks
 *    produce adjacent segments, nested/overlapping marks stack (the renderer
 *    picks the innermost actionable one).
 *  - Surrogate guard: when the document declares `contains_non_bmp`, any mark
 *    boundary that would split a UTF-16 surrogate pair disqualifies THAT
 *    mark for THAT run (reported, not thrown) — a broken half-character is
 *    never rendered for the sake of a link.
 */
import type { TldfMark, TldfRun, TldfSpan } from './types'

export interface RunSegment {
  readonly text: string
  /** Marks covering this segment, outermost first (ordinal order). */
  readonly marks: readonly TldfMark[]
}

export interface SlicedRun {
  readonly run: TldfRun
  readonly segments: readonly RunSegment[]
  /** Ordinals of marks skipped by the surrogate guard (rendered unmarked). */
  readonly skippedMarkOrdinals: readonly number[]
}

/**
 * Sorted mark index with binary search on span start — built once per
 * document (marks arrive sorted by ordinal, which the spec ties to span
 * order, but sorting defensively costs one O(n log n)).
 */
export interface MarkIndex {
  readonly sorted: readonly TldfMark[]
  readonly containsNonBmp: boolean
}

export function buildMarkIndex(
  marks: readonly TldfMark[],
  containsNonBmp: boolean,
): MarkIndex {
  const sorted = [...marks].sort(
    (a, b) => a.span[0] - b.span[0] || a.span[1] - b.span[1],
  )
  return { sorted, containsNonBmp }
}

function overlapping(index: MarkIndex, span: TldfSpan): TldfMark[] {
  const [start, end] = span
  // Binary search for the first mark that could overlap, then scan forward.
  // Marks are sorted by start; a mark overlaps iff mark.start < end AND
  // mark.end > start.
  let lo = 0
  let hi = index.sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    const mark = index.sorted[mid]
    if (mark !== undefined && mark.span[1] <= start) lo = mid + 1
    else hi = mid
  }
  const result: TldfMark[] = []
  for (let i = lo; i < index.sorted.length; i++) {
    const mark = index.sorted[i]
    if (mark === undefined) break
    if (mark.span[0] >= end) break
    if (mark.span[1] > start) result.push(mark)
  }
  return result
}

/** True when `offset` (document coords) falls between a surrogate pair. */
function splitsSurrogatePair(run: TldfRun, offset: number): boolean {
  const local = offset - run.span[0]
  if (local <= 0 || local >= run.text.length) return false
  const before = run.text.charCodeAt(local - 1)
  const after = run.text.charCodeAt(local)
  return before >= 0xd8_00 && before <= 0xdb_ff && after >= 0xdc_00 && after <= 0xdf_ff
}

/**
 * Slice one run into mark-aware segments. Total: the concatenation of
 * segment texts equals `run.text` for every input (property-tested).
 */
export function sliceRun(index: MarkIndex, run: TldfRun): SlicedRun {
  const candidates = overlapping(index, run.span)
  if (candidates.length === 0) {
    return {
      run,
      segments: [{ text: run.text, marks: [] }],
      skippedMarkOrdinals: [],
    }
  }

  const skippedMarkOrdinals: number[] = []
  const applicable: TldfMark[] = []
  for (const mark of candidates) {
    if (
      index.containsNonBmp &&
      (splitsSurrogatePair(run, mark.span[0]) ||
        splitsSurrogatePair(run, mark.span[1]))
    ) {
      skippedMarkOrdinals.push(mark.ordinal)
    } else {
      applicable.push(mark)
    }
  }

  const [runStart, runEnd] = run.span
  const boundaries = new Set<number>([runStart, runEnd])
  for (const mark of applicable) {
    boundaries.add(Math.max(runStart, mark.span[0]))
    boundaries.add(Math.min(runEnd, mark.span[1]))
  }
  const cuts = [...boundaries].sort((a, b) => a - b)

  const segments: RunSegment[] = []
  for (let i = 0; i < cuts.length - 1; i++) {
    const segStart = cuts[i]
    const segEnd = cuts[i + 1]
    if (segStart === undefined || segEnd === undefined || segStart >= segEnd) {
      continue
    }
    const covering = applicable.filter(
      (mark) => mark.span[0] <= segStart && mark.span[1] >= segEnd,
    )
    covering.sort((a, b) => a.ordinal - b.ordinal)
    segments.push({
      text: run.text.slice(segStart - runStart, segEnd - runStart),
      marks: covering,
    })
  }
  return { run, segments, skippedMarkOrdinals }
}

/**
 * The renderer's pick for a segment: the innermost actionable reference
 * (an act link the reader can navigate), else the innermost mark of any
 * kind (styled, not linked), else null.
 */
export function actionableMark(segment: RunSegment): TldfMark | null {
  for (let i = segment.marks.length - 1; i >= 0; i--) {
    const mark = segment.marks[i]
    if (mark !== undefined && mark.kind === 'reference' && mark.link !== undefined) {
      return mark
    }
  }
  const last = segment.marks[segment.marks.length - 1]
  return last ?? null
}
