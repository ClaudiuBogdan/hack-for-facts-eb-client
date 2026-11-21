import {
  getVoteDetailHeroColor,
  VOTE_DETAIL_BREADCRUMB_BG,
  VOTE_DETAIL_INFO_BG,
  VOTE_DETAIL_SURFACE,
  voteDetailCardClassName,
  voteDetailPageContainerClassName,
  voteDetailSectionTitleClassName,
} from './vote-detail-theme'
import { PARLIAMENT_RESOURCE_PURPLE, PARLIAMENT_SURFACE } from './hub-theme'

export const MEMBER_DETAIL_ACTIVE_PURPLE = PARLIAMENT_RESOURCE_PURPLE
export const MEMBER_DETAIL_BORDER = 'var(--parliament-border)'
export const MEMBER_DETAIL_TEXT = 'var(--parliament-fg)'
export const MEMBER_DETAIL_MUTED_TEXT = 'var(--parliament-muted)'
export const MEMBER_DETAIL_SIDEBAR_WIDTH = '17.5rem'
export const MEMBER_DETAIL_SIDEBAR_BG = PARLIAMENT_SURFACE
export const MEMBER_DETAIL_CAREER_ACCENT = 'var(--parliament-muted)'
export const MEMBER_DETAIL_CONTACT_ACCENT = MEMBER_DETAIL_ACTIVE_PURPLE

/** Outer shell — sidebar + content share one bordered frame */
export const memberDetailBodyShellClassName =
  'overflow-hidden rounded-none border border-parliament-border bg-parliament-card shadow-[0_2px_0_0_color-mix(in_srgb,var(--parliament-fg)_4%,transparent)]'

export const memberDetailBodyGridClassName =
  'lg:grid lg:grid-cols-[var(--member-detail-sidebar)_minmax(0,1fr)]'

export const memberDetailSidebarColumnClassName =
  'bg-parliament-surface'

export const memberDetailSidebarNavClassName =
  'flex gap-0 overflow-x-auto hide-scrollbar border-b border-parliament-border lg:block lg:overflow-visible lg:border-b-0'

export const memberDetailSidebarLinkClassName =
  'block shrink-0 border-l-[5px] border-transparent bg-transparent px-5 py-3.5 text-base font-normal leading-snug text-parliament-fg hover:bg-parliament-card/70 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-parliament-resource focus-visible:ring-inset lg:min-w-0 lg:px-6 lg:py-4'

export const memberDetailSidebarActiveLinkClassName =
  'border-l-parliament-resource-fill bg-parliament-card font-bold no-underline hover:bg-parliament-card lg:-mr-px lg:border-r lg:border-r-parliament-card'

export const memberDetailContentPanelClassName =
  'min-w-0 bg-parliament-card p-6 sm:p-8 lg:p-10'

export const memberDetailSectionIntroClassName =
  'mt-3 max-w-3xl text-base leading-7 text-parliament-muted'

export const memberDetailSubsectionTitleClassName =
  'text-xl font-bold leading-tight text-parliament-resource'

export const memberDetailSubsectionIntroClassName =
  'mt-2 text-sm leading-6 text-parliament-muted'

export const memberDetailCardLabelClassName =
  'text-lg font-bold leading-snug text-parliament-resource'

export const memberDetailCareerCardClassName =
  'overflow-hidden rounded-none border border-parliament-border bg-parliament-card'

export const memberDetailCareerCardBodyClassName =
  'flex border-l-[5px] border-l-parliament-muted'

export const memberDetailCareerCardFooterClassName =
  'flex flex-wrap items-center justify-between gap-3 border-t border-parliament-border px-5 py-3 text-sm text-parliament-muted sm:px-6'

export const memberDetailContactCardClassName =
  'overflow-hidden rounded-none border border-parliament-border border-l-[5px] border-l-parliament-resource-fill bg-parliament-card'

export const memberDetailNoticeClassName =
  'border-l-[5px] border-l-parliament-resource-fill bg-parliament-resource/10 p-5 text-sm leading-6 text-parliament-fg sm:p-6'

export {
  getVoteDetailHeroColor as getMemberDetailHeroColor,
  VOTE_DETAIL_BREADCRUMB_BG as MEMBER_DETAIL_BREADCRUMB_BG,
  VOTE_DETAIL_INFO_BG as MEMBER_DETAIL_INFO_BG,
  VOTE_DETAIL_SURFACE as MEMBER_DETAIL_SURFACE,
  voteDetailCardClassName as memberDetailCardClassName,
  voteDetailPageContainerClassName as memberDetailPageContainerClassName,
  voteDetailSectionTitleClassName as memberDetailSectionTitleClassName,
}
