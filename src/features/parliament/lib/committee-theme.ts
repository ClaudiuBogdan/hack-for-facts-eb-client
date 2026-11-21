import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_ICON_BG,
  PARLIAMENT_NOTICE_TINT,
  PARLIAMENT_RESOURCE_PURPLE,
  PARLIAMENT_SENAT_RED,
  PARLIAMENT_SURFACE,
} from './hub-theme'

/**
 * Class strings for the committee surfaces, in one place so the directory and
 * the dossier cannot drift apart (DESIGN.md — theme constants per surface).
 *
 * The skin is Parliament's GOV.UK palette: warm grey ground, hard borders, no
 * radius, chamber colour carried in a left rule rather than a fill.
 */
export const COMMITTEE_SURFACE = PARLIAMENT_SURFACE
export const COMMITTEE_BREADCRUMB_BG = PARLIAMENT_ICON_BG

export function committeeChamberColor(chamber: string | undefined): string {
  return chamber === 'senat' ? PARLIAMENT_SENAT_RED : PARLIAMENT_CAMERA_GREEN
}

export const committeePageContainerClassName =
  'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

export const committeeCardClassName =
  'rounded-none border border-parliament-border bg-parliament-card'

export const committeeSectionTitleClassName =
  'text-xl font-bold leading-tight text-parliament-fg sm:text-2xl'

/** Muted label — tier one of the three-tier hierarchy. */
export const committeeGroupHeadingClassName =
  'text-xs font-semibold uppercase tracking-wide text-parliament-muted'

export const committeeMutedTextClassName =
  'text-sm text-parliament-muted'

/** Controls on the filter bar. One height, so the row reads as one bar. */
export const committeeControlClassName =
  'h-11 rounded-none border-2 border-parliament-border bg-parliament-card text-parliament-fg'

/** Outlined type badge. Colour is never the only signal — the word is the signal. */
export const committeeTypeBadgeClassName =
  'inline-flex shrink-0 items-center rounded-none border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide'

export const committeeTypeToneClassName: Readonly<Record<string, string>> = {
  permanent:
    'border-parliament-fg text-parliament-fg',
  special: 'border-parliament-resource text-parliament-resource',
  joint: 'border-parliament-link text-parliament-link',
}

/** The chamber rule down the left edge of a row — green Camera, crimson Senat. */
export const committeeChamberRuleClassName = 'border-l-4'

/** Provenance / caveat band: a purple left rule on a tinted ground. */
export const committeeNoticeClassName =
  'border-l-[5px] px-4 py-3 text-sm leading-6 text-parliament-fg'

export const COMMITTEE_NOTICE_BG = PARLIAMENT_NOTICE_TINT

export { PARLIAMENT_RESOURCE_PURPLE }
