import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_RESOURCE_PURPLE,
  PARLIAMENT_SENAT_RED,
  PARLIAMENT_ACTION_BLUE,
} from './hub-theme'

export const BILL_DETAIL_BREADCRUMB_BG = '#372554'
export const BILL_DETAIL_SURFACE = '#f3f2f1'
export const BILL_DETAIL_CONTENT_BG = '#ffffff'
export const BILL_DETAIL_INFO_BG = '#f3f0ff'
export const BILL_DETAIL_FINAL_PURPLE = '#512178'

export function getBillDetailHeroColor(
  originatingChamber: 'camera' | 'senat',
): string {
  return originatingChamber === 'camera'
    ? PARLIAMENT_CAMERA_GREEN
    : PARLIAMENT_SENAT_RED
}

/** Neutral grey for steps whose chamber the source never stated. */
export const BILL_DETAIL_UNSTATED_GREY = '#505a5f'

/**
 * Column titles and colours, shared by the two column views and the
 * chronological rail — so a step reads the same green wherever it appears.
 *
 * `gutter` is the form used in the timeline's narrow left column: one word, so
 * it holds a single line at 3.5rem on a phone.
 */
export const BILL_STAGE_COLUMN_META: Readonly<
  Record<
    string,
    {
      readonly title: string
      readonly short: string
      readonly gutter: string
      readonly color: string
    }
  >
> = {
  camera: {
    title: 'Camera Deputaților',
    short: 'Camera Deputaților',
    gutter: 'Camera',
    color: PARLIAMENT_CAMERA_GREEN,
  },
  senat: {
    title: 'Senat',
    short: 'Senat',
    gutter: 'Senat',
    color: PARLIAMENT_SENAT_RED,
  },
  final: {
    title: 'Parlament / Promulgare',
    short: 'Parlament / promulgare',
    gutter: 'Parlament',
    color: BILL_DETAIL_FINAL_PURPLE,
  },
  unstated: {
    title: 'Etape fără cameră indicată',
    short: 'Cameră neindicată',
    gutter: 'Necunoscut',
    color: BILL_DETAIL_UNSTATED_GREY,
  },
}

export const billDetailPageContainerClassName =
  'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

/** Height-matched to the votes list controls, so the two pages feel alike. */
export const billDetailControlClassName =
  'h-11 rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-base text-[#0b0c0c] focus-visible:ring-2 focus-visible:ring-[#1d70b8] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

export const billDetailCardClassName =
  'overflow-hidden rounded-none border border-[#b1b4b6] bg-white shadow-[0_2px_0_0_rgba(11,12,12,0.04)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]'

export const billDetailSectionTitleClassName =
  'text-xl font-bold leading-tight text-[#121847] sm:text-2xl dark:text-[var(--pnrr-fg)]'

export const billDetailTabLinkClassName =
  'relative whitespace-nowrap px-4 py-3 text-base transition-colors sm:px-5'

export const billDetailTabActiveClassName =
  'font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

export const billDetailTabInactiveClassName =
  'font-normal text-[#505a5f] hover:text-[#0b0c0c] dark:text-[var(--pnrr-muted)] dark:hover:text-[var(--pnrr-fg)]'

export { PARLIAMENT_ACTION_BLUE, PARLIAMENT_CAMERA_GREEN, PARLIAMENT_RESOURCE_PURPLE, PARLIAMENT_SENAT_RED }
