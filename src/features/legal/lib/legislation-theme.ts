/**
 * Class strings for the `/legislation` surfaces. Components import from here and
 * never hardcode their own, mirroring `src/features/parliament/lib/*-theme.ts`.
 *
 * The structure is Parliament's (2px borders, 0 radius, UK-weight typography);
 * only the accent differs. Violet is not a new colour: `DOC_TYPE_META.legal_act`
 * already renders legal hits violet in global search.
 */

/** The single page accent — used on the tab indicator, icons, and fill bars only. */
export const LEGISLATION_ACCENT = '#512178'

/* ── header ──────────────────────────────────────────────────────────────── */

export const legislationHeaderTitleClassName =
  'max-w-5xl text-balance font-black leading-[0.85] tracking-tight text-[var(--pnrr-fg)]'

export const legislationHeaderTitleLineClassName = 'block'

export const legislationHeaderTitleStyle = {
  fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
} as const

export const legislationHeaderDescriptionClassName =
  'max-w-[40rem] text-[1.125rem] font-normal leading-8 text-[var(--pnrr-fg)]'

export const legislationHeaderMetaClassName =
  'text-base font-normal leading-6 text-[var(--pnrr-muted)]'

export const legislationHeaderStatClassName =
  'inline-flex items-center gap-2 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 py-2 text-base'

export const legislationHeaderStatValueClassName =
  'font-bold tabular-nums text-[var(--pnrr-fg)]'

export const legislationHeaderStatLabelClassName =
  'font-normal text-[var(--pnrr-muted)]'

export const legislationHeaderHeroClassName = 'pt-10 pb-8 sm:pt-14 sm:pb-10'

/* ── section bands ───────────────────────────────────────────────────────── */

export const legislationSectionClassName =
  'overflow-hidden rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]'

export const legislationSectionHeaderClassName =
  'border-b-2 border-[var(--pnrr-border)] px-5 py-4 sm:px-6'

export const legislationSectionBodyClassName = 'p-5 sm:p-6'

export const legislationSectionTitleClassName =
  'text-xl font-bold tracking-tight text-[var(--pnrr-fg)] sm:text-2xl'

export const legislationSectionDescriptionClassName =
  'mt-1 text-sm text-[var(--pnrr-muted)]'

export const legislationSectionFootnoteClassName =
  'border-t-2 border-[var(--pnrr-border)] px-5 py-2.5 text-xs text-[var(--pnrr-muted)] sm:px-6'

export const legislationLinkClassName =
  'text-sm font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 transition-colors hover:text-[var(--pnrr-muted)]'

/* ── form controls ───────────────────────────────────────────────────────── */

export const legislationFieldClassName =
  'h-12 min-w-0 flex-1 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base shadow-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

export const legislationSubmitClassName =
  'h-12 shrink-0 rounded-none px-6 text-base font-semibold text-white hover:opacity-90'

export const legislationExampleChipClassName =
  'rounded-none border border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-2.5 py-1 text-xs transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

/* ── three-tier text hierarchy (label → value → metadata) ────────────────── */

export const legislationStatLabelClassName =
  'text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]'

export const legislationStatValueClassName =
  'mt-2 text-[2rem] font-extrabold leading-tight tabular-nums text-[var(--pnrr-fg)]'

export const legislationStatMetaClassName =
  'mt-1.5 text-xs text-[var(--pnrr-muted)]'

/* ── rows ────────────────────────────────────────────────────────────────── */

export const legislationRowClassName =
  'relative flex w-full items-center gap-4 overflow-hidden border-b border-[var(--pnrr-track)] px-5 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] sm:px-6'

export const legislationCellClassName =
  'border-b border-r border-[var(--pnrr-track)] px-4 py-3 text-left transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'
