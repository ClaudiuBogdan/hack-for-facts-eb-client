import {
  getVoteDetailHeroColor,
  VOTE_DETAIL_BREADCRUMB_BG,
  VOTE_DETAIL_INFO_BG,
  VOTE_DETAIL_SURFACE,
  voteDetailCardClassName,
  voteDetailPageContainerClassName,
  voteDetailSectionTitleClassName,
} from './vote-detail-theme'

export const MEMBER_DETAIL_ACTIVE_PURPLE = '#512178'
export const MEMBER_DETAIL_BORDER = '#b1b4b6'
export const MEMBER_DETAIL_TEXT = '#0b0c0c'
export const MEMBER_DETAIL_MUTED_TEXT = '#505a5f'
export const MEMBER_DETAIL_SIDEBAR_WIDTH = '17.5rem'
export const MEMBER_DETAIL_SIDEBAR_BG = '#f3f2f1'
export const MEMBER_DETAIL_CAREER_ACCENT = '#3d434a'
export const MEMBER_DETAIL_CONTACT_ACCENT = MEMBER_DETAIL_ACTIVE_PURPLE

/** Outer shell — sidebar + content share one bordered frame */
export const memberDetailBodyShellClassName =
  'overflow-hidden rounded-none border border-[#b1b4b6] bg-white shadow-[0_2px_0_0_rgba(11,12,12,0.04)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]'

export const memberDetailBodyGridClassName =
  'lg:grid lg:grid-cols-[var(--member-detail-sidebar)_minmax(0,1fr)]'

export const memberDetailSidebarColumnClassName =
  'bg-[#f3f2f1] dark:bg-[var(--pnrr-subtle)]'

export const memberDetailSidebarNavClassName =
  'flex gap-0 overflow-x-auto hide-scrollbar border-b border-[#b1b4b6] lg:block lg:overflow-visible lg:border-b-0 dark:border-[var(--pnrr-border)]'

export const memberDetailSidebarLinkClassName =
  'block shrink-0 border-l-[5px] border-transparent bg-transparent px-5 py-3.5 text-base font-normal leading-snug text-[#0b0c0c] hover:bg-white/70 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#512178] focus-visible:ring-inset lg:min-w-0 lg:px-6 lg:py-4 dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-card)]/70'

export const memberDetailSidebarActiveLinkClassName =
  'border-l-[#512178] bg-white font-bold no-underline hover:bg-white dark:bg-[var(--pnrr-card)] dark:hover:bg-[var(--pnrr-card)] lg:-mr-px lg:border-r lg:border-r-white dark:lg:border-r-[var(--pnrr-card)]'

export const memberDetailContentPanelClassName =
  'min-w-0 bg-white p-6 sm:p-8 lg:p-10 dark:bg-[var(--pnrr-card)]'

export const memberDetailSectionIntroClassName =
  'mt-3 max-w-3xl text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]'

export const memberDetailSubsectionTitleClassName =
  'text-xl font-bold leading-tight text-[#512178] dark:text-[var(--pnrr-fg)]'

export const memberDetailSubsectionIntroClassName =
  'mt-2 text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]'

export const memberDetailCardLabelClassName =
  'text-lg font-bold leading-snug text-[#512178] dark:text-[var(--pnrr-fg)]'

export const memberDetailCareerCardClassName =
  'overflow-hidden rounded-none border border-[#b1b4b6] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]'

export const memberDetailCareerCardBodyClassName =
  'flex border-l-[5px] border-l-[#3d434a]'

export const memberDetailCareerCardFooterClassName =
  'flex flex-wrap items-center justify-between gap-3 border-t border-[#b1b4b6] px-5 py-3 text-sm text-[#505a5f] sm:px-6 dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-muted)]'

export const memberDetailContactCardClassName =
  'overflow-hidden rounded-none border border-[#b1b4b6] border-l-[5px] border-l-[#512178] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]'

export const memberDetailNoticeClassName =
  'border-l-[5px] border-l-[#512178] bg-[#f3f0ff] p-5 text-sm leading-6 text-[#0b0c0c] sm:p-6 dark:text-[var(--pnrr-fg)]'

export {
  getVoteDetailHeroColor as getMemberDetailHeroColor,
  VOTE_DETAIL_BREADCRUMB_BG as MEMBER_DETAIL_BREADCRUMB_BG,
  VOTE_DETAIL_INFO_BG as MEMBER_DETAIL_INFO_BG,
  VOTE_DETAIL_SURFACE as MEMBER_DETAIL_SURFACE,
  voteDetailCardClassName as memberDetailCardClassName,
  voteDetailPageContainerClassName as memberDetailPageContainerClassName,
  voteDetailSectionTitleClassName as memberDetailSectionTitleClassName,
}
