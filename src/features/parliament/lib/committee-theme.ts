import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_RESOURCE_PURPLE,
  PARLIAMENT_SENAT_RED,
} from './hub-theme'

/**
 * Class strings for the committee surfaces, in one place so the directory and
 * the dossier cannot drift apart (DESIGN.md — theme constants per surface).
 *
 * The skin is Parliament's GOV.UK palette: warm grey ground, hard borders, no
 * radius, chamber colour carried in a left rule rather than a fill.
 */
export const COMMITTEE_SURFACE = '#f3f2f1'
export const COMMITTEE_BREADCRUMB_BG = '#372554'

export function committeeChamberColor(chamber: string | undefined): string {
  return chamber === 'senat' ? PARLIAMENT_SENAT_RED : PARLIAMENT_CAMERA_GREEN
}

export const committeePageContainerClassName =
  'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

export const committeeCardClassName =
  'rounded-none border border-[#b1b4b6] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]'

export const committeeSectionTitleClassName =
  'text-xl font-bold leading-tight text-[#0b0c0c] sm:text-2xl dark:text-[var(--pnrr-fg)]'

/** Muted label — tier one of the three-tier hierarchy. */
export const committeeGroupHeadingClassName =
  'text-xs font-semibold uppercase tracking-wide text-[#505a5f] dark:text-[var(--pnrr-muted)]'

export const committeeMutedTextClassName =
  'text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]'

/** Controls on the filter bar. One height, so the row reads as one bar. */
export const committeeControlClassName =
  'h-11 rounded-none border-2 border-[#b1b4b6] bg-white text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

/** Outlined type badge. Colour is never the only signal — the word is the signal. */
export const committeeTypeBadgeClassName =
  'inline-flex shrink-0 items-center rounded-none border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide'

export const committeeTypeToneClassName: Readonly<Record<string, string>> = {
  permanent:
    'border-[#0b0c0c] text-[#0b0c0c] dark:border-[var(--pnrr-fg)] dark:text-[var(--pnrr-fg)]',
  special: 'border-[#512178] text-[#512178] dark:border-[#b39ddb] dark:text-[#b39ddb]',
  joint: 'border-[#1d70b8] text-[#1d70b8] dark:border-[#7fb3e3] dark:text-[#7fb3e3]',
}

/** The chamber rule down the left edge of a row — green Camera, crimson Senat. */
export const committeeChamberRuleClassName = 'border-l-4'

/** Provenance / caveat band: a purple left rule on a tinted ground. */
export const committeeNoticeClassName =
  'border-l-[5px] px-4 py-3 text-sm leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

export const COMMITTEE_NOTICE_BG = '#f3f0ff'

export { PARLIAMENT_RESOURCE_PURPLE }
