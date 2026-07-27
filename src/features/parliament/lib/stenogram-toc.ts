/**
 * The sitting's agenda, and the DOM anchors the reader navigates by.
 *
 * Kept out of the components so the derivation is testable on its own — and
 * because the anchor id is a contract shared by four callers (the table of
 * contents, the intervention rail, `?interventie=`, and in-document match
 * stepping), which is exactly the kind of thing that rots when each one spells
 * it out inline.
 */
import type { ParliamentStenogramSegment } from '@/schemas/parliament'
import { isSegmentVisibleForSpeakers } from './stenogram-speaker-filter'
import { estimateBlockHeightPx } from './stenogram-theme'

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

/**
 * The agenda OF AN EXCERPT — the same headings, restricted to what is on screen.
 *
 * A filtered reading contains no agenda headings at all (they are dropped with
 * everything else), so the full table of contents would be a map of a document
 * that is not on screen: every entry would anchor at a block the excerpt does
 * not render. Hiding it entirely was the previous answer and it cost the reader
 * the left lane and any sense of WHERE in the sitting a turn happened.
 *
 * So the entries are rebuilt from the ORIGINAL ordered sitting and the selected
 * names:
 *   - a section survives only if it holds at least one VISIBLE contribution;
 *   - `speechCount` counts the visible ones, not the section's real size —
 *     claiming the latter would describe debate the excerpt omits;
 *   - `position` anchors at the FIRST visible contribution in the section, not
 *     at the heading, because the heading has no DOM node here.
 *
 * Contributions printed BEFORE the first heading get no entry, exactly as in
 * the full agenda: there is no heading to name them by.
 */
export function buildFilteredStenogramToc({
  segments,
  speakerNames,
}: {
  readonly segments: readonly ParliamentStenogramSegment[]
  readonly speakerNames: readonly string[]
}): readonly StenogramTocEntry[] {
  if (speakerNames.length === 0) return buildStenogramToc(segments)

  const entries: StenogramTocEntry[] = []
  let heading: { segmentKey: string; label: string } | undefined
  let open: {
    segmentKey: string
    position: number
    label: string
    speechCount: number
  } | null = null

  for (const segment of segments) {
    if (segment.kind === 'AGENDA_HEADING') {
      if (open) entries.push(open)
      open = null
      heading = {
        segmentKey: segment.segmentKey,
        label: segment.text.trim().split('\n')[0] ?? '',
      }
      continue
    }
    if (!heading) continue
    if (!isSegmentVisibleForSpeakers({ segment, speakerNames })) continue

    if (open) open.speechCount += 1
    else
      open = {
        segmentKey: heading.segmentKey,
        position: segment.position,
        label: heading.label,
        speechCount: 1,
      }
  }
  if (open) entries.push(open)
  return entries
}

/* ── the intervention rail (transcript minimap) ─────────────────────────── */

/** One tick on the rail: a CONTRIBUTION, never a heading or a narration. */
export interface StenogramInterventionMarker {
  readonly segmentKey: string
  /** The serving speech row — what `?interventie=` carries. */
  readonly speechKey: string
  readonly position: number
  /** Speaker AS PRINTED. `undefined` is a real, honest state, not a gap. */
  readonly speakerName: string | undefined
  /** Whitespace-normalised opening of the block — a preview, not the text. */
  readonly excerpt: string
  /** 1-based order among the sitting's contributions. */
  readonly ordinal: number
  /** Where the block starts in the sitting, as a 0–1 share of its height. */
  readonly fraction: number
}

const EXCERPT_MAX_CHARS = 140

/**
 * The first sentence-or-so of a block, on one line.
 *
 * A stenogram is printed with hard wraps, tabs and runs of spaces that mean
 * nothing once the text is out of its column, so the preview normalises
 * whitespace and stops at a word boundary. It is explicitly an EXCERPT — the
 * ellipsis is not decoration, it is the promise that the block continues.
 */
export function stenogramExcerpt(
  text: string,
  maxChars: number = EXCERPT_MAX_CHARS,
): string {
  const normalised = text.replace(/\s+/gu, ' ').trim()
  if (normalised.length <= maxChars) return normalised
  const clipped = normalised.slice(0, maxChars)
  const lastSpace = clipped.lastIndexOf(' ')
  const cut = lastSpace > maxChars * 0.6 ? clipped.slice(0, lastSpace) : clipped
  return `${cut.trimEnd()}…`
}

/**
 * The sitting's contributions, positioned proportionally within the WHOLE
 * document.
 *
 * Only `SPEECH` blocks that carry a `speechKey` become markers: those are the
 * ones `?interventie=` can name, and putting an agenda heading or a
 * `(rumoare în sală)` on a rail of speakers would imply someone said it.
 *
 * `fraction` is measured with the same height model the reading column uses for
 * `contain-intrinsic-size`, so a tick sits where the block actually sits under
 * the scrollbar — counting characters alone would misplace a run of one-line
 * interjections, each of which still costs a speaker line and its padding.
 */
export function buildStenogramInterventions(
  segments: readonly ParliamentStenogramSegment[],
): readonly StenogramInterventionMarker[] {
  const found: { marker: Omit<StenogramInterventionMarker, 'ordinal' | 'fraction'>; offset: number }[] =
    []
  let offset = 0

  for (const segment of segments) {
    if (segment.kind === 'SPEECH' && segment.speechKey) {
      found.push({
        marker: {
          segmentKey: segment.segmentKey,
          speechKey: segment.speechKey,
          position: segment.position,
          speakerName: segment.speakerName,
          excerpt: stenogramExcerpt(segment.text),
        },
        offset,
      })
    }
    offset += estimateBlockHeightPx(segment)
  }

  const total = Math.max(1, offset)
  return found.map(({ marker, offset: start }, index) => ({
    ...marker,
    ordinal: index + 1,
    fraction: Math.min(1, start / total),
  }))
}

/* The reading-line fraction and the progress-fill maths that used to live here
   went with the fill itself: the rail says where the reader is with the run of
   contributions the viewport actually holds, which is measured by an
   IntersectionObserver against the window and needs no share-of-height
   constant to agree with. */

/** Contributions that quantise onto the same slot of the track. */
export interface InterventionRailCluster {
  /** Slot index in the track, top to bottom. */
  readonly slot: number
  /** Pixel offset of the slot inside the track. */
  readonly top: number
  /** Indices into the intervention list, in printed order. */
  readonly indices: readonly number[]
}

export interface InterventionRailLayout {
  readonly clusters: readonly InterventionRailCluster[]
  /** For each intervention, the index of its cluster in `clusters`. */
  readonly clusterOfIndex: readonly number[]
  readonly slotHeight: number
  /** Track height, quantised down to a whole number of slots. */
  readonly trackHeight: number
}

/**
 * Quantise the sitting onto the rail — the density strategy, stated once.
 *
 * THE PROBLEM. A dense sitting prints several hundred contributions. Placed
 * proportionally on a rail one viewport tall they land 1–2px apart: ticks merge
 * into a grey smear that says nothing, and no tick is a hit target. The previous
 * answer — grow the track and scroll it inside its own box — traded that for a
 * worse one: a rail that scrolls independently of the document is no longer a
 * scrollbar, because a fixed point on it stops meaning a fixed point in the
 * text.
 *
 * THE ANSWER. The track is exactly one viewport tall, ALWAYS, so rail position
 * maps 1:1 onto document position. It is divided into fixed `slotHeight` slots,
 * and each contribution falls into the slot its fraction lands in —
 * `floor(fraction * slotCount)`, pure and deterministic, no jitter, no
 * measurement. Slots that catch more than one contribution become a CLUSTER,
 * drawn as a single tick whose weight states how many turns it holds. Ticks
 * therefore cannot overlap: there is at most one per slot, by construction.
 *
 * Nothing is dropped. Every contribution stays in `clusterOfIndex`, and the rail
 * renders every one of them as its own button — clustering is a drawing
 * decision, and the progressive disclosure that fans a cluster open on hover or
 * focus is what keeps each one reachable by pointer as well as by keyboard.
 */
export function clusterInterventionRail({
  fractions,
  trackHeight,
  slotHeight,
}: {
  readonly fractions: readonly number[]
  readonly trackHeight: number
  readonly slotHeight: number
}): InterventionRailLayout {
  const safeSlotHeight = Math.max(1, slotHeight)
  const slotCount = Math.max(
    1,
    Math.floor(Math.max(0, trackHeight) / safeSlotHeight),
  )

  const bySlot = new Map<number, number[]>()
  fractions.forEach((fraction, index) => {
    const bounded = Math.min(1, Math.max(0, fraction))
    const slot = Math.min(slotCount - 1, Math.floor(bounded * slotCount))
    const members = bySlot.get(slot)
    if (members) members.push(index)
    else bySlot.set(slot, [index])
  })

  const clusters = [...bySlot.entries()]
    .sort(([a], [b]) => a - b)
    .map(([slot, indices]) => ({
      slot,
      top: slot * safeSlotHeight,
      indices: indices as readonly number[],
    }))

  const clusterOfIndex: number[] = []
  clusters.forEach((cluster, clusterIndex) => {
    for (const index of cluster.indices) clusterOfIndex[index] = clusterIndex
  })

  return {
    clusters,
    clusterOfIndex,
    slotHeight: safeSlotHeight,
    trackHeight: slotCount * safeSlotHeight,
  }
}

/* `fanOutCluster` used to live here: it spread a crowded slot's turns apart on
   hover so each got its own hit target. It is gone with the fan itself — marks
   that move out from under an approaching pointer cannot be aimed at, so a
   crowded slot now draws one weighted bar and hands the pointer its first turn.
   The keyboard still walks every turn, and the document is the fallback for
   reading them apart. */
