import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_ICON_BG,
  PARLIAMENT_RESOURCE_PURPLE,
  PARLIAMENT_SENAT_RED,
  PARLIAMENT_SURFACE,
} from './hub-theme'
import type { ParliamentChamber } from '@/schemas/parliament'
import type { CohesionBand } from './group-roster'

/**
 * Class strings for the group dossier (`/parlament/grupuri/$groupId`), kept in
 * one place so the surface cannot drift from its siblings (DESIGN.md — theme
 * constants per surface).
 *
 * Same Parliament GOV.UK skin as the committee dossier: warm grey ground, hard
 * borders, no radius, chamber colour carried in a rule rather than a fill.
 */
export const GROUP_SURFACE = PARLIAMENT_SURFACE
export const GROUP_BREADCRUMB_BG = PARLIAMENT_ICON_BG

export function groupChamberColor(chamber: ParliamentChamber): string {
  return chamber === 'senat' ? PARLIAMENT_SENAT_RED : PARLIAMENT_CAMERA_GREEN
}

export const groupPageContainerClassName =
  'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

export const groupCardClassName =
  'rounded-none border border-[#b1b4b6] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]'

export const groupSectionTitleClassName =
  'text-xl font-bold leading-tight text-[#0b0c0c] sm:text-2xl dark:text-[var(--pnrr-fg)]'

/** Muted label — tier one of the three-tier hierarchy. */
export const groupEyebrowClassName =
  'text-xs font-semibold uppercase tracking-wide text-[#505a5f] dark:text-[var(--pnrr-muted)]'

export const groupMutedTextClassName =
  'text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]'

/** Controls on the filter bar. One height, so the row reads as one bar. */
export const groupControlClassName =
  'h-11 rounded-none border-2 border-[#b1b4b6] bg-white text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

/** Provenance / caveat band: a purple left rule on a tinted ground. */
export const groupNoticeClassName =
  'border-l-[5px] px-4 py-3 text-sm leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

export const GROUP_NOTICE_BG = '#f3f0ff'

/**
 * Four effective ballot outcomes plus two non-choice evidence buckets.
 *
 * Deliberately NOT a red/green pass-fail scale: "pentru" and "împotriva" are
 * positions, not a good and a bad outcome, so they get two neutral-weight
 * institutional hues. Absence is grey because the source records that a member
 * did not vote without ever saying why.
 */
export const GROUP_BALLOT_COLORS = {
  pentru: '#1d70b8',
  impotriva: '#d4351c',
  abtinere: '#f47738',
  absent: '#b1b4b6',
  conflicting: '#912b88',
  unknown: '#505a5f',
} as const

export const GROUP_BALLOT_LABELS = {
  pentru: 'Pentru',
  impotriva: 'Împotrivă',
  abtinere: 'Abțineri',
  absent: 'Nu au votat',
  conflicting: 'Conflict în sursă',
  unknown: 'Poziție neclară',
} as const

/**
 * Cohesion bands. Colour is never the only signal — every band ships a word
 * next to it, and the raw index stays on screen.
 */
export const groupCohesionBandToneClassName: Readonly<
  Record<CohesionBand, string>
> = {
  high: 'border-[#00703c] text-[#00703c] dark:border-[#85c99b] dark:text-[#85c99b]',
  medium:
    'border-[#1d70b8] text-[#1d70b8] dark:border-[#7fb3e3] dark:text-[#7fb3e3]',
  low: 'border-[#d4351c] text-[#d4351c] dark:border-[#f4a196] dark:text-[#f4a196]',
}

export const groupCohesionBandLabel: Readonly<Record<CohesionBand, string>> = {
  high: 'Foarte unit',
  medium: 'Unit',
  low: 'Divizat frecvent',
}

export const groupBadgeClassName =
  'inline-flex shrink-0 items-center rounded-none border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide'

export { PARLIAMENT_RESOURCE_PURPLE }
