import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_RESOURCE_PURPLE,
  PARLIAMENT_SENAT_RED,
  PARLIAMENT_ACTION_BLUE,
  PARLIAMENT_CAMERA_MARK,
  PARLIAMENT_ICON_BG,
  PARLIAMENT_NOTICE_TINT,
  PARLIAMENT_RESOURCE_MARK,
  PARLIAMENT_SENAT_MARK,
  PARLIAMENT_SURFACE,
} from './hub-theme'

export const BILL_DETAIL_BREADCRUMB_BG = PARLIAMENT_ICON_BG
export const BILL_DETAIL_SURFACE = PARLIAMENT_SURFACE
export const BILL_DETAIL_CONTENT_BG = 'var(--parliament-card)'
export const BILL_DETAIL_INFO_BG = PARLIAMENT_NOTICE_TINT
export const BILL_DETAIL_FINAL_PURPLE = PARLIAMENT_RESOURCE_PURPLE

export function getBillDetailHeroColor(
  originatingChamber: 'camera' | 'senat',
): string {
  return originatingChamber === 'camera'
    ? PARLIAMENT_CAMERA_GREEN
    : PARLIAMENT_SENAT_RED
}

/** Neutral grey for steps whose chamber the source never stated: as a mark, and as text. */
export const BILL_DETAIL_UNSTATED_GREY = 'var(--parliament-muted)'
export const BILL_DETAIL_UNSTATED_TEXT_CLASS_NAME = 'text-parliament-muted'

/**
 * Column titles and colours, shared by the two column views and the
 * chronological rail — so a step reads the same green wherever it appears.
 *
 * `gutter` is the form used in the timeline's narrow left column: one word, so
 * it holds a single line at 3.5rem on a phone.
 *
 * `mark` is the colour of a rule, dot or glyph that carries no text (the column's
 * top rule and chamber mark, the rail's dot); `textClassName` is the gutter label
 * written in that colour. Both flip in dark, so they hold on the dark card; the
 * non-flipping chamber fills are for the hero bands under white text only.
 */
export const BILL_STAGE_COLUMN_META: Readonly<
  Record<
    string,
    {
      readonly title: string
      readonly short: string
      readonly gutter: string
      readonly mark: string
      readonly textClassName: string
    }
  >
> = {
  camera: {
    title: 'Camera Deputaților',
    short: 'Camera Deputaților',
    gutter: 'Camera',
    mark: PARLIAMENT_CAMERA_MARK,
    textClassName: 'text-parliament-commons',
  },
  senat: {
    title: 'Senat',
    short: 'Senat',
    gutter: 'Senat',
    mark: PARLIAMENT_SENAT_MARK,
    textClassName: 'text-parliament-senate',
  },
  final: {
    title: 'Parlament / Promulgare',
    short: 'Parlament / promulgare',
    gutter: 'Parlament',
    mark: PARLIAMENT_RESOURCE_MARK,
    textClassName: 'text-parliament-resource',
  },
  unstated: {
    title: 'Etape fără cameră indicată',
    short: 'Cameră neindicată',
    gutter: 'Necunoscut',
    mark: BILL_DETAIL_UNSTATED_GREY,
    textClassName: BILL_DETAIL_UNSTATED_TEXT_CLASS_NAME,
  },
}

/**
 * The vote-role chip on a bill's vote card: an outlined badge, so its border
 * frames text on the card and both flip. A rejection reads in the Senate red; a
 * rejection that failed, and a role with no verdict, in the muted grey.
 */
export const BILL_VOTE_VERDICT_BADGE_CLASS_NAMES = {
  respins: 'border-parliament-senate text-parliament-senate',
  rejection_failed: 'border-parliament-muted text-parliament-muted',
} as const

export const BILL_VOTE_ROLE_NEUTRAL_BADGE_CLASS_NAME = 'border-parliament-muted text-parliament-muted'

export const billDetailPageContainerClassName =
  'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

/** Height-matched to the votes list controls, so the two pages feel alike. */
export const billDetailControlClassName =
  'h-11 rounded-none border-2 border-parliament-border bg-parliament-card px-3 text-base text-parliament-fg focus-visible:ring-2 focus-visible:ring-parliament-link'

export const billDetailCardClassName =
  'overflow-hidden rounded-none border border-parliament-border bg-parliament-card shadow-[0_2px_0_0_color-mix(in_srgb,var(--parliament-fg)_4%,transparent)]'

export const billDetailSectionTitleClassName =
  'text-xl font-bold leading-tight text-parliament-bill-heading sm:text-2xl'

export const billDetailTabLinkClassName =
  'relative whitespace-nowrap px-4 py-3 text-base transition-colors sm:px-5'

export const billDetailTabActiveClassName =
  'font-bold text-parliament-fg'

export const billDetailTabInactiveClassName =
  'font-normal text-parliament-muted hover:text-parliament-fg'

export { PARLIAMENT_ACTION_BLUE, PARLIAMENT_CAMERA_GREEN, PARLIAMENT_RESOURCE_PURPLE, PARLIAMENT_SENAT_RED }
