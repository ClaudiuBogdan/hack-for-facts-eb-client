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

/** The reading line itself — where the fill ends, drawn as a hairline. */
export const stenogramRailHeadClassName =
  'pointer-events-none absolute inset-x-0 h-px -translate-y-px bg-[#1d70b8] dark:bg-[var(--pnrr-blue)] motion-safe:transition-[top] motion-safe:duration-150 motion-safe:ease-out'

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

/** The paper a fanned-open cluster is drawn on, so its ticks stay legible. */
export const stenogramRailFanClassName =
  'pointer-events-none absolute -left-1 -right-1 border-y-2 border-[#0b0c0c] bg-white dark:border-[var(--pnrr-fg)] dark:bg-[var(--pnrr-card)] motion-safe:transition-[top,height] motion-safe:duration-150 motion-safe:ease-out'

/** One tick. Grey by default; the accent is spent only on the two live states. */
export const stenogramRailMarkerToneClassName: Readonly<
  Record<'idle' | 'reading' | 'selected', string>
> = {
  // Hover and keyboard focus darken the tick identically — colour is never the
  // only cue, but it must at least agree with the ring.
  idle: 'bg-[#8f9294] group-hover/marker:bg-[#0b0c0c] group-focus-visible/marker:bg-[#0b0c0c] dark:bg-[var(--pnrr-border)] dark:group-hover/marker:bg-[var(--pnrr-fg)] dark:group-focus-visible/marker:bg-[var(--pnrr-fg)]',
  reading: 'bg-[#1d70b8] dark:bg-[var(--pnrr-blue)]',
  selected: 'bg-[#0b0c0c] dark:bg-[var(--pnrr-fg)]',
}

/**
 * The deep-linked contribution, when it is NOT the one being read: a notch on
 * the outer edge of the track. A second colour would compete with the reading
 * marker for "you are here"; a shape does not.
 */
export const stenogramRailSelectedCueClassName =
  'pointer-events-none absolute right-0 top-1/2 h-2 w-1 -translate-y-1/2 bg-[#0b0c0c] dark:bg-[var(--pnrr-fg)]'

/** The hit area a marker owns — always taller and wider than the tick it draws. */
export const stenogramRailMarkerHitClassName =
  'group/marker absolute -left-1 -right-2 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] motion-safe:transition-[top,height] motion-safe:duration-150 motion-safe:ease-out'

/** The tick a marker draws. Live states break out of the track's own width. */
export const stenogramRailMarkerTickClassName =
  'absolute top-1/2 -translate-y-1/2 motion-safe:transition-[height,left,right,opacity,background-color] motion-safe:duration-150 motion-safe:ease-out'

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

/** In-document search hit. `mark` is semantic; the ring marks the CURRENT hit. */
export const stenogramMatchClassName =
  'bg-[#fff2c9] text-[#0b0c0c] print:bg-transparent print:underline'

export const stenogramMatchCurrentClassName =
  'bg-[#ffdd00] text-[#0b0c0c] outline-2 outline-offset-1 outline-[#0b0c0c]'

/** Hidden on screen, shown only on paper (source URL, provenance footer). */
export const stenogramPrintOnlyClassName = 'hidden print:block'
