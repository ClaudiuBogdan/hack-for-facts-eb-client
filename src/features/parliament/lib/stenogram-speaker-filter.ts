/**
 * The reader's speaker filter, derived FROM THE SITTING.
 *
 * The options are not a roster: they are the names this capture printed, in
 * this sitting, counted from its own blocks. A speaker the source never
 * resolved to a mandate is therefore just as filterable as one it did — the
 * printed name is both the label and the value, so nothing is lost in a
 * translation to ids that the transcript does not carry.
 *
 * Kept out of the components, like `stenogram-toc`, because three callers
 * depend on the same derivation agreeing: the multi-select's options, the
 * filtered reading column, and the intervention rail that navigates it.
 */
import type { ParliamentStenogramSegment } from '@/schemas/parliament'

/** One selectable speaker: the printed name, and how often it was printed. */
export interface StenogramSpeakerFacet {
  /** Speaker AS PRINTED — the option's label AND its selection value. */
  readonly speakerName: string
  /** Contributions this name is printed on, in this sitting. */
  readonly interventionCount: number
}

/**
 * Romanian name order, deterministic.
 *
 * `Intl.Collator` puts ă/â/î/ș/ț where a Romanian reader expects them, which a
 * plain code-point sort does not. `sensitivity: 'base'` would make two names
 * differing only in diacritics compare EQUAL, and equal keys make a sort
 * unstable across engines — so the raw comparison breaks ties and the order is
 * the same everywhere, browser and SSR alike.
 */
const romanianCollator = new Intl.Collator('ro', {
  numeric: true,
  sensitivity: 'variant',
})

export function compareRomanianNames(a: string, b: string): number {
  const collated = romanianCollator.compare(a, b)
  if (collated !== 0) return collated
  return a < b ? -1 : a > b ? 1 : 0
}

/** A contribution — the unit both the rail and the counts are built from. */
function isContribution(segment: ParliamentStenogramSegment): boolean {
  return segment.kind === 'SPEECH' && Boolean(segment.speechKey)
}

/** How many contributions the sitting holds, filtered or not. */
export function countStenogramContributions(
  segments: readonly ParliamentStenogramSegment[],
): number {
  return segments.filter(isContribution).length
}

/**
 * The sitting's speakers, with their contribution counts, in Romanian order.
 *
 * Blocks the capture printed no name on are NOT an option: there is no name to
 * select them by, and inventing one ("Vorbitor necunoscut" as a bucket) would
 * imply the source grouped them. They stay in the full reading, which is where
 * the complete record lives.
 */
export function buildStenogramSpeakerFacets(
  segments: readonly ParliamentStenogramSegment[],
): readonly StenogramSpeakerFacet[] {
  const counts = new Map<string, number>()

  for (const segment of segments) {
    if (!isContribution(segment)) continue
    const name = segment.speakerName?.trim()
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([speakerName, interventionCount]) => ({
      speakerName,
      interventionCount,
    }))
    .sort((a, b) => compareRomanianNames(a.speakerName, b.speakerName))
}

/**
 * Trim/dedupe a selection coming from the control, keeping the reader's order.
 *
 * The same normalisation the URL param applies, so a round trip through the
 * router cannot produce a selection the control would render differently.
 */
export function normalizeSpeakerSelection(
  values: readonly string[],
): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    normalized.push(trimmed)
  }
  return normalized
}

/**
 * The filtered reading: ONLY the contributions of the selected speakers.
 *
 * Agenda headings and narration blocks are dropped with everything else,
 * deliberately — a filtered reading is an excerpt, and keeping the headings
 * would imply the omitted debate under them is still there. The reader states
 * that in words next to the filtered column; this function's job is to make the
 * subset unambiguous, not to soften it.
 */
export function filterSegmentsBySpeakers({
  segments,
  speakerNames,
}: {
  readonly segments: readonly ParliamentStenogramSegment[]
  readonly speakerNames: readonly string[]
}): readonly ParliamentStenogramSegment[] {
  if (speakerNames.length === 0) return segments
  const wanted = new Set(speakerNames)
  return segments.filter(
    (segment) =>
      isContribution(segment) &&
      segment.speakerName !== undefined &&
      wanted.has(segment.speakerName),
  )
}

/**
 * Would this block survive the given selection?
 *
 * Used to decide whether a deep-linked `?interventie=` still has somewhere to
 * land once the reader changes the filter — the reader clears the link rather
 * than pointing it at a block it has just hidden.
 */
export function isSegmentVisibleForSpeakers({
  segment,
  speakerNames,
}: {
  readonly segment: ParliamentStenogramSegment | undefined
  readonly speakerNames: readonly string[]
}): boolean {
  if (speakerNames.length === 0) return true
  if (!segment) return false
  if (!isContribution(segment)) return false
  return (
    segment.speakerName !== undefined && speakerNames.includes(segment.speakerName)
  )
}
