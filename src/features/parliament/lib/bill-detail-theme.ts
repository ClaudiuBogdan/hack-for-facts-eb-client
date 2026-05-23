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

export const billDetailPageContainerClassName =
  'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

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
