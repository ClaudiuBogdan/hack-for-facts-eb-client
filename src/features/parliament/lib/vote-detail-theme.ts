import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_RESOURCE_PURPLE,
  PARLIAMENT_SENAT_RED,
} from './hub-theme'

export const VOTE_DETAIL_BREADCRUMB_BG = '#372554'
export const VOTE_DETAIL_SURFACE = '#f3f2f1'
export const VOTE_DETAIL_INFO_BG = '#f3f0ff'

/** Plot-area wash behind the party chart. Shared so the loading placeholder
 *  reserves the same block of colour the chart lands in. */
export const VOTE_DETAIL_CHART_PLOT_BG = '#f8f9fd'

export function getVoteDetailHeroColor(chamber: 'camera' | 'senat'): string {
  return chamber === 'camera' ? PARLIAMENT_CAMERA_GREEN : PARLIAMENT_SENAT_RED
}

/** UK Parliament member card shadow — soft lift, bottom/right bias */
export const voteMemberCardShadowClassName =
  'shadow-[1px_2px_8px_rgba(11,12,12,0.08)] hover:shadow-[1px_3px_10px_rgba(11,12,12,0.1)]'

export const voteDetailCardClassName =
  'overflow-hidden rounded-none border border-[#b1b4b6] bg-white shadow-[0_2px_0_0_rgba(11,12,12,0.04)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]'

export const voteDetailPageContainerClassName =
  'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

export const voteDetailSectionTitleClassName =
  'text-xl font-bold leading-tight text-[#0b0c0c] sm:text-2xl lg:text-[1.75rem] dark:text-[var(--pnrr-fg)]'

export const voteDetailTabListClassName =
  'h-auto w-max min-w-full flex-nowrap justify-start gap-0 rounded-none border-b border-[#b1b4b6] bg-transparent p-0 dark:border-[var(--pnrr-border)]'

export const voteDetailTabTriggerClassName =
  'shrink-0 rounded-none border-b-[3px] border-transparent bg-transparent px-0 py-3 text-sm font-normal text-[#505a5f] shadow-none sm:text-base data-[state=active]:border-[#512178] data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-[#0b0c0c] data-[state=active]:shadow-none dark:data-[state=active]:text-[var(--pnrr-fg)]'

export const voteDetailToggleActiveClassName =
  'border-[#512178] bg-[#512178] text-white hover:bg-[#512178]/90'

export const voteDetailToggleInactiveClassName =
  'border-[#b1b4b6] bg-white text-[#0b0c0c] hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

export { PARLIAMENT_RESOURCE_PURPLE }
