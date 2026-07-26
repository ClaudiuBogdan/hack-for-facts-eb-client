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

export function estimateBlockSize(segment: {
  readonly textChars: number
}): string {
  const lines = Math.max(1, Math.ceil(segment.textChars / CHARS_PER_LINE))
  return `auto ${String(lines * LINE_HEIGHT_PX + BLOCK_CHROME_PX)}px`
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

/** In-document search hit. `mark` is semantic; the ring marks the CURRENT hit. */
export const stenogramMatchClassName =
  'bg-[#fff2c9] text-[#0b0c0c] print:bg-transparent print:underline'

export const stenogramMatchCurrentClassName =
  'bg-[#ffdd00] text-[#0b0c0c] outline-2 outline-offset-1 outline-[#0b0c0c]'

/** Hidden on screen, shown only on paper (source URL, provenance footer). */
export const stenogramPrintOnlyClassName = 'hidden print:block'
