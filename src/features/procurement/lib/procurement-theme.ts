/**
 * Procurement visual theme — GOV.UK-style class constants shared across the
 * feature (mirrors parliament's `hub-theme.ts` / `header-theme.ts`). Square
 * corners, 2px borders, uppercase bold section labels; light+dark from the
 * shared `--pnrr-*` tokens plus the GOV.UK grays used by parliament.
 */

// ── header / hero (parliament-shell rhythm) ─────────────────────────────────

export const procurementHeaderHeroClassName = 'pt-10 pb-2 sm:pt-14 sm:pb-4'

export const procurementHeaderTitleClassName =
  'max-w-5xl text-balance font-black leading-[0.85] tracking-tight text-[var(--pnrr-fg)]'

export const procurementHeaderTitleStyle = {
  fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
} as const

/**
 * Entity-page variant of the hero size. The hub title is two words and can
 * carry the full scale; an institution's legal name is often eight, and at
 * 5.5rem it wrapped to three lines and pushed the whole page below the fold.
 */
export const procurementHeaderEntityTitleStyle = {
  fontSize: 'clamp(1.75rem, 3.6vw, 3rem)',
} as const

export const procurementHeaderDescriptionClassName =
  'max-w-[40rem] text-[1.125rem] font-normal leading-8 text-[var(--pnrr-fg)]'

export const procurementHeaderMetaClassName =
  'text-base font-normal leading-6 text-[var(--pnrr-muted)]'

export const procurementHeaderStatClassName =
  'inline-flex items-center gap-2 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 py-2 text-base'

export const procurementHeaderStatValueClassName =
  'font-bold tabular-nums text-[var(--pnrr-fg)]'

export const procurementHeaderStatLabelClassName =
  'font-normal text-[var(--pnrr-muted)]'

/** Lime active-filter chips — same token as PNRR for cross-domain recognition. */
export const procurementActiveFilterChipClassName =
  'group inline-flex max-w-full items-center gap-1.5 bg-[var(--pnrr-green)] px-3 py-2 text-sm text-[var(--pnrr-fg)]'

export const procurementActiveFilterChipPrefixClassName =
  'shrink-0 text-[var(--pnrr-fg)]/80'

export const procurementActiveFilterChipValueClassName =
  'min-w-0 truncate font-bold'

export const procurementActiveFilterClearClassName =
  'shrink-0 text-sm text-[var(--pnrr-fg)] underline underline-offset-4 transition-colors hover:text-[var(--pnrr-muted)]'

// ── section surfaces ────────────────────────────────────────────────────────

export const procurementSectionClassName =
  'overflow-hidden rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]'

/**
 * Border-free header/footer — separation comes from spacing and the type
 * hierarchy, not rules stacked inside the card frame.
 */
export const procurementSectionHeaderClassName = 'px-5 py-4 sm:px-6 sm:py-5'

export const procurementSectionBodyClassName = 'p-5 sm:p-6'

/** Compact footer under ranking glance lists — mirrors header, not body padding. */
export const procurementSectionFooterClassName = 'px-5 py-2.5 sm:px-6'

export const procurementSectionTitleClassName =
  'text-xl font-bold tracking-tight text-[var(--pnrr-fg)] sm:text-2xl'

export const procurementSectionDescriptionClassName =
  'mt-1.5 text-sm leading-5 text-[var(--pnrr-muted)]'

export const procurementSectionLabelClassName =
  'text-xs font-bold uppercase tracking-wide text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

// ── controls ────────────────────────────────────────────────────────────────

export const procurementFieldClassName =
  'h-10 min-w-0 flex-1 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

export const procurementDateInputClassName =
  'h-10 w-full rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

export const procurementToggleItemClassName =
  'h-10 min-w-0 justify-start gap-2 rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm font-semibold text-[#0b0c0c] transition-colors hover:bg-[#f3f2f1] data-[state=on]:border-[#1d70b8] data-[state=on]:bg-[#1d70b8] data-[state=on]:text-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]'

export const procurementPrimaryButtonClassName =
  'h-11 rounded-none border-2 border-[#1d70b8] bg-[#1d70b8] px-2 text-xs font-black uppercase tracking-wide text-white hover:opacity-90 sm:text-sm'

export const procurementOutlineButtonClassName =
  'h-11 rounded-none border-2 border-[#b1b4b6] bg-white px-2 text-xs font-black uppercase tracking-wide text-[#0b0c0c] hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] sm:text-sm'

/** Compact choice chip — blue fill when pressed (metric / territorial level). */
export const procurementChoiceButtonClassName =
  'h-9 rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-xs font-semibold text-[#0b0c0c] shadow-none transition-colors hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]'

export const procurementChoiceButtonActiveClassName =
  'border-[#1d70b8] bg-[#1d70b8] text-white hover:bg-[#1d70b8] hover:text-white dark:border-[#1d70b8] dark:bg-[#1d70b8] dark:text-white dark:hover:bg-[#1d70b8] dark:hover:text-white'

export const procurementPaginationButtonClassName =
  'inline-flex h-10 min-w-10 items-center justify-center rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm font-semibold text-[#0b0c0c] transition-colors hover:bg-[#f3f2f1] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

export const procurementChipClassName =
  'inline-flex max-w-full items-center gap-1.5 border-2 border-[#b1b4b6] bg-[#f3f2f1] px-2.5 py-1 text-sm font-semibold text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]'

export const procurementUnderlineLinkClassName =
  'text-sm font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 transition-colors hover:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

// ── compact data strips ─────────────────────────────────────────────────────

/**
 * A bordered strip carrying a divided row of figures. Replaces grids of
 * one-figure cards: a card per number spent three text tiers and ~140px on
 * data a reader wants to compare side by side.
 */
export const procurementStripClassName =
  'overflow-hidden rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]'

// ── cards ───────────────────────────────────────────────────────────────────

export const procurementRecordCardClassName =
  'group block overflow-hidden rounded-none border-2 border-[#b1b4b6] bg-white transition-colors hover:bg-[#f8f8f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:hover:bg-[var(--pnrr-hover)]'

export const procurementCardChevronClassName =
  'h-6 w-6 shrink-0 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

// ── chart marks ─────────────────────────────────────────────────────────────

/**
 * The single data-mark hue (all procurement charts are single-series nominal
 * bars — one hue, never per-row colors). Validated with the dataviz palette
 * validator: #1d70b8 passes on the light surface (#ffffff), #3b82f6 on the
 * dark card surface (#1b1f1c) — lightness band, chroma floor and ≥3:1
 * contrast all PASS.
 */
export const procurementMarkClassName = 'bg-[#1d70b8] dark:bg-[#3b82f6]'

/** Unfilled bar track — a lighter step of the surface, not a border. */
export const procurementMarkTrackClassName =
  'bg-[#f3f2f1] dark:bg-[var(--pnrr-track)]'

/**
 * Header utility action — quieter and smaller than the page's own controls, so
 * "open the entity profile" never reads as a filter next to the year buttons.
 */
export const procurementCompactActionClassName =
  'h-8 rounded-none border-2 border-[#b1b4b6] bg-white px-2.5 text-xs font-bold uppercase tracking-wide text-[#0b0c0c] shadow-none transition-colors hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]'

// ── inline notices ──────────────────────────────────────────────────────────

/**
 * Disclosure block: bordered, subtly filled, icon left, one paragraph that
 * opens with a bold statement. Used for every "here is what this view is not
 * showing you" message so they read as one voice.
 */
export const procurementNoticeClassName =
  'flex items-start gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)] p-3 text-sm text-[var(--pnrr-muted)]'

export const procurementNoticeIconClassName =
  'mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-fg)]'
