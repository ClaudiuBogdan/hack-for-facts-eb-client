import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_RESOURCE_PURPLE,
  PARLIAMENT_SENAT_RED,
  PARLIAMENT_ACTION_BLUE,
  PARLIAMENT_ICON_BG,
  PARLIAMENT_SURFACE,
} from './hub-theme'

export const BILL_DETAIL_BREADCRUMB_BG = PARLIAMENT_ICON_BG
export const BILL_DETAIL_SURFACE = PARLIAMENT_SURFACE
export const BILL_DETAIL_CONTENT_BG = 'var(--parliament-card)'
export const BILL_DETAIL_INFO_BG = 'color-mix(in srgb, var(--parliament-resource) 10%, var(--parliament-card))'
export const BILL_DETAIL_FINAL_PURPLE = PARLIAMENT_RESOURCE_PURPLE

export function getBillDetailHeroColor(
  originatingChamber: 'camera' | 'senat',
): string {
  return originatingChamber === 'camera'
    ? PARLIAMENT_CAMERA_GREEN
    : PARLIAMENT_SENAT_RED
}

/** Neutral grey for steps whose chamber the source never stated. */
export const BILL_DETAIL_UNSTATED_GREY = 'var(--parliament-muted)'

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
