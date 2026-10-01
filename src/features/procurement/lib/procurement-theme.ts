/**
 * Procurement visual theme — GOV.UK-style class constants shared across the
 * feature (mirrors parliament's `hub-theme.ts` / `header-theme.ts`). Square
 * corners, 2px borders, uppercase bold section labels; light+dark from the
 * shared `--pnrr-*` tokens plus the GOV.UK grays used by parliament.
 */
/**
 * Entity-page hero size: an institution's legal name is often eight words,
 * and at 5.5rem it wrapped to three lines and pushed the whole page below
 * the fold.
 */
export const procurementHeaderEntityTitleStyle = {
  fontSize: 'clamp(1.75rem, 3.6vw, 3rem)',
} as const

export const procurementHeaderMetaClassName =
  'text-base font-normal leading-6 text-[var(--pnrr-muted)]'

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

export const procurementOutlineButtonClassName =
  'h-11 rounded-none border-2 border-[#b1b4b6] bg-white px-2 text-xs font-black uppercase tracking-wide text-[#0b0c0c] hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] sm:text-sm'

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
