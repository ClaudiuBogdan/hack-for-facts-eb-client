/**
 * Class constants for the stenogram surfaces — the parliament GOV.UK-light skin
 * (warm grey `#f3f2f1`, action blue `#1d70b8`, 2px borders, 0 radius), kept in
 * one place per the "theme constants per surface" convention so components
 * never hardcode their own.
 *
 * The reader also carries the app's only print stylesheet: a stenogram is a
 * document people cite, so `Ctrl+P` has to produce something a reader can file.
 * Print rules live here as `print:` utilities rather than in a CSS file, so a
 * component's printed form is visible in the same place as its screen form.
 */

/** Sticky toolbar band above a list. `top-0` + a solid background, never blur. */
export const stenogramStickyBarClassName =
  'sticky top-0 z-20 -mx-4 border-b-2 border-[#b1b4b6] bg-background px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 dark:border-[var(--pnrr-border)] print:hidden'

export const stenogramSectionTitleClassName =
  'text-xl font-bold leading-tight text-[#0b0c0c] sm:text-2xl dark:text-[var(--pnrr-fg)]'

export const stenogramSectionIntroClassName =
  'mt-3 max-w-3xl text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]'

export const stenogramMutedTextClassName =
  'text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]'

export const stenogramCardClassName =
  'border-2 border-[#b1b4b6] bg-white p-5 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]'

export const stenogramBadgeClassName =
  'inline-flex items-center gap-1.5 border border-[#b1b4b6] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#505a5f] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-muted)]'

/**
 * WHICH ASSEMBLY, IN THE HOUSE PAIR. The same two colours the votes surfaces
 * and the parliament hub already spend on the two chambers — green for the
 * Chamber of Deputies (`PARLIAMENT_CAMERA_GREEN`), red for the Senate
 * (`PARLIAMENT_SENAT_RED`) — so a reader who learnt them on the vote pages
 * reads them here without being taught twice.
 *
 * Outlined, never filled: the filled badge beside it belongs to the
 * availability caveat, and a label must not dress like a warning. Lightened in
 * dark mode, where the print-weight hues go muddy on the card.
 *
 * A JOINT sitting takes neither colour — it is not one of the two, and tinting
 * it would invent a third assembly — and neither does an unknown chamber.
 */
export const stenogramChamberToneClassName: Readonly<Record<string, string>> = {
  camera_deputatilor:
    'border-[#006435] text-[#006435] dark:border-[#58b083] dark:text-[#58b083]',
  senat:
    'border-[#9C051A] text-[#9C051A] dark:border-[#e8697c] dark:text-[#e8697c]',
}

/**
 * The same pair as a LEFT RULE on the card — this surface's own notice
 * vocabulary (`stenogramNoticeClassName`, `stenogramFilterNoticeClassName`),
 * borrowed for a label rather than a warning.
 *
 * Only the leading edge is tinted. Colouring the whole box was tried and
 * rejected: a column of red and green outlines made the assembly the loudest
 * thing on the page, above the sitting it describes. A rule on one edge sorts
 * a scrolling column just as fast while the record still leads, and it lines
 * the cards up on the same vertical the rest of the page is built on.
 *
 * Never the only carrier: the badge on the card's first line names the assembly
 * in words, so the colour is a shortcut for readers who can use it and nothing
 * is lost for those who cannot.
 */
export const stenogramChamberLeftRuleClassName: Readonly<
  Record<string, string>
> = {
  camera_deputatilor: 'border-l-4 border-l-[#006435] dark:border-l-[#58b083]',
  senat: 'border-l-4 border-l-[#9C051A] dark:border-l-[#e8697c]',
}


export const stenogramLinkClassName =
  'font-semibold text-[#1d70b8] underline underline-offset-4 hover:text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:hover:text-[var(--pnrr-fg)]'

/**
 * A secondary action sitting in a card's META LINE — the row that already
 * carries the counts.
 *
 * Deliberately NOT the link accent. On a list of sittings the accent is how a
 * reader finds the one thing that opens the record: the title. Painting the
 * actions under it in the same blue gave every card three equal blue claims and
 * made the title stop being the way in. These read as part of the meta line —
 * same size, same muted ink — and say they are clickable with an underline,
 * darkening rather than colouring on hover.
 */
export const stenogramMetaActionClassName =
  'inline-flex items-center gap-1.5 font-medium text-[#505a5f] underline decoration-[#b1b4b6] underline-offset-4 hover:text-[#0b0c0c] hover:decoration-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:text-[var(--pnrr-muted)] dark:decoration-[var(--pnrr-border)] dark:hover:text-[var(--pnrr-fg)] dark:hover:decoration-[var(--pnrr-fg)]'

export const stenogramControlClassName =
  'h-10 rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm font-semibold text-[#0b0c0c] hover:bg-[#f3f2f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]'

/**
 * Availability tint pairs — a tinted container plus a dark label, per the
 * data-trust palette, so the state never rests on hue alone (each is also
 * printed in words next to the badge).
 */
export const stenogramAvailabilityToneClassName: Readonly<
  Record<'COMPLETE' | 'PARTIAL' | 'SOURCE_ONLY', string>
> = {
  COMPLETE:
    'border-[#00703c] bg-[#e7f3ec] text-[#00552d] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]',
  PARTIAL:
    'border-[#b58840] bg-[#fdf3e3] text-[#6b4a08] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]',
  SOURCE_ONLY:
    'border-[#b1b4b6] bg-[#f3f2f1] text-[#383f43] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-muted)]',
}

/** Left-rule notice band, matching the member-detail notice rhythm. */
export const stenogramNoticeClassName =
  'border-l-[5px] border-l-[#1d70b8] bg-[#f0f5fb] p-5 text-sm leading-6 text-[#0b0c0c] sm:p-6 dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]'

/**
 * The FILTERED-READING notice — the one band on this surface that is printed.
 *
 * Amber rather than blue, and never `print:hidden`: it is the statement that
 * what follows is an excerpt of a sitting rather than the sitting, so it has to
 * survive onto paper with the excerpt it qualifies. On paper it drops to a
 * plain ruled box, because a tint that reads as a highlight on screen prints as
 * a grey smear.
 */
export const stenogramFilterNoticeClassName =
  'border-l-[5px] border-l-[#b58840] bg-[#fdf3e3] p-5 text-sm leading-6 text-[#0b0c0c] sm:p-6 dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)] print:border-2 print:border-black print:border-l-2 print:bg-transparent print:p-3 print:text-black'

/**
 * The scroll-to-top button — an IN-FLOW action in the left lane, never a FAB.
 *
 * It used to be `position: fixed` in the bottom-right corner, and that corner is
 * the busiest part of this app: the mobile dock owns the full width below `md`,
 * the chat and feedback FABs stack above it, and on a wide screen the reader's
 * own intervention rail sits there too. The button landed on top of all three
 * and on the prose besides. A floating control that covers the document it
 * belongs to is worse than one that is occasionally out of view, so it now sits
 * in the left rail's sticky stack (desktop) and at the end of the reading
 * (narrow), where it can overlap nothing.
 */
export const stenogramScrollTopClassName =
  'h-11 w-full justify-start rounded-none border-2 border-[#0b0c0c] bg-white px-3 text-sm font-bold text-[#0b0c0c] hover:bg-[#f3f2f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-fg)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)] print:hidden'

/**
 * The same control at the FOOT OF THE RAIL — a bare arrow, no words and no box.
 *
 * The rail is the reader's navigation column, so "back to the top of the
 * sitting" belongs at the end of it rather than under the agenda box, where it
 * sat at the top of the screen offering to undo a scroll the reader had just
 * made. A label there would be wider than the rail it hangs off, and a bordered
 * box would put back exactly the chrome the rail dropped: the column is marks
 * on the page's own background, so its last mark is one too — a heavier stroke
 * standing in for the weight the border used to carry. The name survives in
 * full on `aria-label`, which is what a screen reader announces either way.
 *
 * `justify-start` with no padding is what keeps the arrow on the same left edge
 * as the bars; the box around it stays 32px so the target is still a target.
 */
export const stenogramScrollTopCompactClassName =
  'size-8 shrink-0 justify-start rounded-none border-0 bg-transparent p-0 text-[#0b0c0c] hover:bg-transparent hover:text-[#1d70b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:text-[var(--pnrr-fg)] dark:hover:bg-transparent dark:hover:text-[var(--pnrr-blue)] print:hidden'

/**
 * The reader's LEFT LANE — one sticky stack, not several sticky children.
 *
 * Everything that accompanies the reading rather than being part of it lives
 * here in one box: the agenda, the excerpt notice while a speaker filter is on,
 * and the way back to the top. Making the STACK sticky rather than each child
 * is what keeps them in a fixed order relative to each other — separately
 * sticky children pile onto the same offset and overlap.
 *
 * The width is stated here, once, and is the same in full and filtered mode:
 * the reading measure to its right must not change when a reader selects a
 * speaker, or the document appears to jump and re-wrap under them.
 *
 * From `lg` it takes the FULL height of its sticky window rather than only
 * capping at it, which is what lets "back to top" sit at the FOOT of the lane
 * (`mt-auto`) instead of tucked under a short agenda box. A long agenda still
 * shrinks to fit — the box has a definite height and its children may shrink
 * inside it — so the button stays on screen either way, which is the whole
 * point of a way back that is always where the reader's eye ends up.
 *
 * On paper the lane collapses: its agenda and its "back to top" are screen
 * affordances and hide themselves, while the excerpt notice must survive, so
 * the box goes static and full width rather than `print:hidden`.
 */
export const stenogramLeftLaneClassName =
  'flex flex-col gap-4 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:w-72 lg:shrink-0 print:static print:block print:h-auto print:max-h-none print:w-auto'

/* ── reader ─────────────────────────────────────────────────────────────── */

/**
 * The reading column. `max-w-3xl` is a measure decision, not a layout one: a
 * stenogram is long-form prose and reads badly at full container width.
 */
export const stenogramReadingColumnClassName =
  'max-w-3xl text-base leading-8 text-[#0b0c0c] dark:text-[var(--pnrr-fg)] print:max-w-none print:text-[11pt] print:leading-6 print:text-black'

/**
 * One reading block.
 *
 * `content-visibility:auto` is what keeps a long sitting usable now that the
 * reader holds the WHOLE document: the browser skips layout and paint for
 * blocks outside the viewport, so a several-thousand-block transcript costs
 * roughly what a screenful costs. It is preferred over windowing/virtualisation
 * because it keeps every block in the DOM — which is what makes the position
 * anchors, `scrollIntoView`, native Ctrl+F and printing keep working. A
 * virtualised list would break all four.
 *
 * `contain-intrinsic-size` supplies a placeholder height so the scrollbar does
 * not jump as blocks are realised; the reader passes a per-block estimate.
 * Both are disabled for print, where every block must be laid out.
 */
export const stenogramBlockClassName =
  'scroll-mt-32 border-l-2 border-transparent py-3 pl-4 [content-visibility:auto] print:scroll-mt-0 print:break-inside-avoid print:border-l-0 print:pl-0 print:[content-visibility:visible] print:[contain-intrinsic-size:auto]'

/**
 * Placeholder height for a block the browser has not laid out yet.
 *
 * Pairs with `content-visibility:auto` above: it only needs to be the right
 * ORDER of magnitude, enough to keep the scrollbar from jumping as off-screen
 * blocks are realised. Derived from the block's own `textChars` at roughly 70
 * characters per rendered line, plus the speaker line and vertical padding.
 */
const CHARS_PER_LINE = 70
const LINE_HEIGHT_PX = 32
const BLOCK_CHROME_PX = 56

export function estimateBlockHeightPx(segment: {
  readonly textChars: number
}): number {
  const lines = Math.max(1, Math.ceil(segment.textChars / CHARS_PER_LINE))
  return lines * LINE_HEIGHT_PX + BLOCK_CHROME_PX
}

export function estimateBlockSize(segment: {
  readonly textChars: number
}): string {
  return `auto ${String(estimateBlockHeightPx(segment))}px`
}

/** The block named by `?interventie=` — highlighted WITHOUT hiding its context. */
export const stenogramBlockSelectedClassName =
  'border-l-[#1d70b8] bg-[#f0f5fb] dark:bg-[var(--pnrr-subtle)] print:bg-transparent'

export const stenogramSpeakerNameClassName =
  'font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)] print:text-black'

export const stenogramAgendaHeadingClassName =
  'mt-8 border-b-2 border-[#0b0c0c] pb-2 text-lg font-bold uppercase tracking-wide text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-fg)] print:mt-6 print:border-black print:text-black'

/** Table of contents rail — collapses below the document on small screens. */
export const stenogramTocClassName =
  'border-2 border-[#b1b4b6] bg-[#f3f2f1] p-4 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] print:hidden'

/* ── intervention rail (the reading-progress scrollbar) ─────────────────── */

/**
 * The slim rail column, at the RIGHT edge of the reading column — where a
 * scrollbar belongs, and where it cannot be confused with the agenda rail on the
 * left, which navigates by the institution's own structure rather than by
 * reading position.
 *
 * Hidden below `xl`: at `lg` the agenda rail and the reading measure already
 * fill the row, and a third column there would squeeze the prose — the document
 * itself and the previous/next contribution controls are the fallback, and they
 * are not worse, only different.
 */
export const stenogramRailClassName = 'hidden shrink-0 xl:block print:hidden'

/**
 * The track. Exactly one viewport tall and NEVER scrolled inside itself, so a
 * point on the rail always means the same point in the document.
 *
 * NO CHROME, AND NO SURFACES — BARS ONLY. It used to be a bordered grey column
 * with a tinted wash for the part already read and a rule where that wash
 * ended. Every one of those was a box drawn around information the bars already
 * carried, and the wash in particular claimed the rail's whole width for a
 * state the bars state better. What is left is marks on the page's own
 * background: where you are is a run of accent bars, not a filled rectangle.
 */
export const stenogramRailTrackClassName = 'relative w-12'

/**
 * THE WAVE — the pointer's own magnification, in one place.
 *
 * `--rail-wave` is written on each drawn mark by the rail component, from the
 * pointer's (or the focused marker's) distance to it: 1 right under it, 0 at
 * the edge of the wave's reach. Every mark reads the same variable, so the
 * whole rail leans toward the pointer as one motion instead of a single tick
 * blinking on under it.
 *
 * It buys emphasis with LENGTH, never with height: the mark is scaled
 * horizontally from its left edge, which keeps the rail's vertical rhythm — the
 * thing that makes a position on it mean a position in the document — exactly
 * where it was. `scale` is also a property the compositor animates without
 * touching layout, so a pointer running down several hundred ticks never
 * reflows the page.
 *
 * The transition is SHORT on purpose. The wave is repainted every animation
 * frame from the pointer's real position, so a long ease only adds a rubbery
 * delay between where the pointer is and where the rail says it is; 70ms is
 * enough to keep the swell from stepping, and short enough to feel welded to
 * the cursor.
 *
 * Opacity is NOT here: each tone below sets its own ramp, because a mark in the
 * viewport and a mark nowhere near it cannot share a resting weight, and two
 * `opacity` utilities on one element is a coin-flip about which wins.
 */
const RAIL_WAVE_CLASS_NAMES =
  'origin-left scale-x-[calc(1+var(--rail-wave,0)*1.2)] motion-safe:transition-[scale,opacity] motion-safe:duration-75 motion-safe:ease-out'

/**
 * A collapsed cluster: one tick standing for several contributions, its WIDTH
 * stating how many. Weight is the honest encoding here — a wider tick is more
 * turns in the same stretch of transcript, which is exactly what the reader
 * needs to see before deciding to open it.
 *
 * It takes the strongest tone any of its members holds, so a dense stretch that
 * happens to be on screen lights up as one bar rather than going dark just
 * because its turns were quantised into a single slot.
 */
export const stenogramRailClusterClassName = `pointer-events-none absolute left-0 ${RAIL_WAVE_CLASS_NAMES}`

/**
 * Resting widths. Kept short so the wave has somewhere to go: a mark under the
 * pointer doubles, and doubling a mark that already spans the rail would only
 * be able to spill out of it.
 */
export const stenogramRailClusterDensityClassName: Readonly<
  Record<'few' | 'many' | 'crowd', string>
> = {
  few: 'w-3',
  many: 'w-4',
  crowd: 'w-5',
}

/**
 * WHERE THE READER IS, TOLD IN BARS.
 *
 * `inView` is every contribution the viewport currently holds, in the accent at
 * half weight: a run of coloured bars whose LENGTH along the rail is how much
 * of the sitting fits on one screen and whose POSITION is how far in the reader
 * has come. That run replaces the tinted wash and the rule that used to end it
 * — a filled rectangle answered "how far" with a box drawn around nothing,
 * while these are the same marks the rest of the rail is made of.
 *
 * `reading` is the contribution at the top of that run — the section being read
 * — as a solid accent bar. It was a round dot on the old reading line, which
 * only made sense while there was a line for it to sit on.
 *
 * `selected` is the deep link ONCE THE READER HAS SCROLLED AWAY from it:
 * full-weight ink, not accent, so it points back without competing with the run
 * for "you are here". While it is on screen it is simply part of the run —
 * which is what leaves the rail unmarked when a reader clicks a bar: the bar
 * they clicked turns accent because they are now there, and nothing else
 * appears next to it.
 *
 * Each tone carries its own opacity ramp, ending at 1 under the pointer, so
 * every bar answers the wave from wherever its resting weight is.
 */
export const stenogramRailMarkerToneClassName: Readonly<
  Record<'idle' | 'inView' | 'reading' | 'selected', string>
> = {
  idle: 'bg-[#0b0c0c] opacity-[calc(0.3+var(--rail-wave,0)*0.7)] dark:bg-[var(--pnrr-fg)]',
  inView:
    'bg-[#1d70b8] opacity-[calc(0.55+var(--rail-wave,0)*0.45)] dark:bg-[var(--pnrr-blue)]',
  reading: 'bg-[#1d70b8] opacity-100 dark:bg-[var(--pnrr-blue)]',
  selected:
    'bg-[#0b0c0c] opacity-[calc(0.8+var(--rail-wave,0)*0.2)] dark:bg-[var(--pnrr-fg)]',
}

/**
 * The hit area a marker owns — taller and wider than the bar it draws, and it
 * overhangs the track on the LEFT, into the column gap, so the pointer target
 * never eats into the room the wave grows into.
 */
export const stenogramRailMarkerHitClassName =
  'group/marker absolute -left-2 right-0 hover:z-10 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

/**
 * The tick a marker draws — a short mark pinned to the track's left edge
 * (`left-2` inside a box that overhangs it by 8px), lengthening to the right
 * under the wave.
 *
 * Fixed HEIGHT is what holds the rail together: a mark may get longer and
 * darker, never taller, so no state can thicken into a rule across the track.
 * Growth is also always rightward, away from the prose, so the mark that stands
 * for a position never drifts off the position it stands for.
 */
export const stenogramRailMarkerTickClassName = `absolute left-2 top-1/2 w-3 -translate-y-1/2 ${RAIL_WAVE_CLASS_NAMES}`

/**
 * The hover/focus preview — a genuine floating layer, so it carries the one
 * shadow this surface allows, over the flat document skin (2px border, no
 * radius, white paper).
 *
 * Deliberately narrow, and opened to the RIGHT of the rail: the rail is the
 * last column of the row, so the preview lands in the page's own margin instead
 * of over the prose the reader is scanning.
 */
export const stenogramRailTooltipClassName =
  'max-w-[15rem] rounded-none border-2 border-[#0b0c0c] bg-white p-3 text-left text-[#0b0c0c] shadow-md dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

/** Hidden on screen, shown only on paper (source URL, provenance footer). */
export const stenogramPrintOnlyClassName = 'hidden print:block'
