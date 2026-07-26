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

export const stenogramLinkClassName =
  'font-semibold text-[#1d70b8] underline underline-offset-4 hover:text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:hover:text-[var(--pnrr-fg)]'

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
 * On paper the lane collapses: its agenda and its "back to top" are screen
 * affordances and hide themselves, while the excerpt notice must survive, so
 * the box goes static and full width rather than `print:hidden`.
 */
export const stenogramLeftLaneClassName =
  'flex flex-col gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:w-72 lg:shrink-0 print:static print:block print:max-h-none print:w-auto'

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
 * point on the rail always means the same point in the document; a 2px rule on
 * its left edge ties it to the column it measures.
 */
export const stenogramRailTrackClassName =
  'relative w-6 border-l-2 border-[#b1b4b6] bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)]'

/**
 * Read so far — a continuous fill from the top of the sitting to the reading
 * line, which is what makes the rail a progress bar rather than a list of ticks.
 * Tinted, not saturated: it sits UNDER the markers and must not compete with
 * them.
 */
export const stenogramRailProgressClassName =
  'pointer-events-none absolute inset-x-0 top-0 bg-[#1d70b8]/15 dark:bg-[var(--pnrr-blue)]/25 motion-safe:transition-[height] motion-safe:duration-150 motion-safe:ease-out'

/**
 * The reading line itself — where the fill ends.
 *
 * THE ONE HORIZONTAL LIVE LINE ON THIS RAIL. Nothing else here may draw a rule
 * across the track: the reader read two full-width bars (this one, plus the
 * live/hover tick that broke out of the track's width) as two progress
 * positions. Every other state below is a compact shape — a dot, a ring, a
 * notch — precisely so this line keeps its meaning unshared.
 */
export const stenogramRailHeadClassName =
  'pointer-events-none absolute inset-x-0 h-0.5 -translate-y-px bg-[#1d70b8] dark:bg-[var(--pnrr-blue)] motion-safe:transition-[top] motion-safe:duration-150 motion-safe:ease-out'

/**
 * A collapsed cluster: one tick standing for several contributions, its WIDTH
 * stating how many. Weight is the honest encoding here — a wider tick is more
 * turns in the same stretch of transcript, which is exactly what the reader
 * needs to see before deciding to open it.
 */
export const stenogramRailClusterClassName =
  'pointer-events-none absolute left-0 bg-[#8f9294] dark:bg-[var(--pnrr-border)] motion-safe:transition-opacity motion-safe:duration-150'

export const stenogramRailClusterDensityClassName: Readonly<
  Record<'few' | 'many' | 'crowd', string>
> = {
  few: 'w-3',
  many: 'w-[1.125rem]',
  crowd: 'w-6',
}

/**
 * The paper a fanned-open cluster is drawn on, so its ticks stay legible.
 *
 * Carries NO top/bottom rule. It used to be `border-y-2`, which put two more
 * black horizontal lines onto a rail whose whole job is to own exactly one —
 * an opened cluster looked like a second progress region. The expanded stretch
 * is now stated by paper: a raised surface, a soft shadow, and a single
 * VERTICAL rule on its leading edge, which is this app's own notice vocabulary
 * and cannot be misread as progress.
 */
export const stenogramRailFanClassName =
  'pointer-events-none absolute -left-1 -right-1 border-l-2 border-[#0b0c0c] bg-white shadow-md dark:border-[var(--pnrr-fg)] dark:bg-[var(--pnrr-card)] motion-safe:transition-[top,height] motion-safe:duration-150 motion-safe:ease-out'

/**
 * One tick. Grey by default; the accent is spent only on the two live states.
 *
 * Hover and focus no longer darken it to near-black. A dark tick spanning the
 * track is a bar, and a bar on this rail claims to be a reading position — so
 * emphasis moved off the tick entirely and onto the node below.
 */
export const stenogramRailMarkerToneClassName: Readonly<
  Record<'idle' | 'reading' | 'selected', string>
> = {
  idle: 'bg-[#8f9294] dark:bg-[var(--pnrr-border)]',
  reading: 'bg-[#1d70b8] dark:bg-[var(--pnrr-blue)]',
  selected: 'bg-[#0b0c0c] dark:bg-[var(--pnrr-fg)]',
}

/**
 * The deep-linked contribution, when it is NOT the one being read: a notch on
 * the outer edge of the track. A second colour would compete with the reading
 * marker for "you are here"; a shape does not — and this one is taller than it
 * is wide, so it reads as a vertical nick off the edge rather than as a rule.
 */
export const stenogramRailSelectedCueClassName =
  'pointer-events-none absolute right-0 top-1/2 h-3 w-1 -translate-y-1/2 bg-[#0b0c0c] dark:bg-[var(--pnrr-fg)]'

/** The hit area a marker owns — always taller and wider than the tick it draws. */
export const stenogramRailMarkerHitClassName =
  'group/marker absolute -left-1 -right-2 hover:z-10 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] motion-safe:transition-[top,height] motion-safe:duration-150 motion-safe:ease-out'

/**
 * The tick a marker draws — a short neutral mark, always exactly the track's
 * own width. It never grows, never breaks out sideways and never darkens: the
 * geometry is fixed so no marker state can turn into a second rule.
 */
export const stenogramRailMarkerTickClassName =
  'absolute left-1 right-2 top-1/2 -translate-y-1/2 motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease-out'

/**
 * The tick steps aside when its marker is pointed at or focused, handing the
 * emphasis to the node. Fading rather than resizing keeps the rail free of
 * layout jitter under a moving pointer.
 */
export const stenogramRailTickYieldClassName =
  'group-hover/marker:opacity-0 group-focus-visible/marker:opacity-0'

/**
 * The NODE — every emphasised marker state, as a compact round shape.
 *
 * Centred on the track rather than on the hit box: the box overhangs the 24px
 * track by 4px on the left, so `left-4` is the track's own centre line. A
 * circle is a deliberate break from this surface's 0-radius skin, and it is the
 * point of the fix — a round mark is the one shape that cannot be mistaken for
 * a progress rule, however close it sits to the head.
 */
export const stenogramRailNodeClassName =
  'pointer-events-none absolute left-4 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out'

/**
 * `reading` — the contribution under the reader's eye: a solid accent dot on
 * the progress line, ringed in the surface colour so it stays legible over the
 * fill in either theme. Always drawn; it grows slightly when pointed at.
 *
 * `cue` — hover and keyboard focus on any other marker: a hollow ring, smaller
 * and unfilled, that scales in from nothing. Obvious enough to confirm what the
 * tooltip is about, and unmistakably SECONDARY to the accent dot, so a reader
 * hovering near the head still sees one reading position.
 */
export const stenogramRailNodeToneClassName: Readonly<
  Record<'reading' | 'cue', string>
> = {
  reading:
    'size-2.5 scale-100 bg-[#1d70b8] ring-2 ring-white group-hover/marker:scale-125 group-focus-visible/marker:scale-125 dark:bg-[var(--pnrr-blue)] dark:ring-[var(--pnrr-card)]',
  cue: 'size-2 scale-0 border-2 border-[#0b0c0c] bg-white group-hover/marker:scale-100 group-focus-visible/marker:scale-100 dark:border-[var(--pnrr-fg)] dark:bg-[var(--pnrr-card)]',
}

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
