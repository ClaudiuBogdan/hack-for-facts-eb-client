import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_ICON_BG,
  PARLIAMENT_NOTICE_TINT,
  PARLIAMENT_RESOURCE_PURPLE,
  PARLIAMENT_SENAT_RED,
  PARLIAMENT_SURFACE,
} from './hub-theme'

export const VOTE_DETAIL_BREADCRUMB_BG = PARLIAMENT_ICON_BG
export const VOTE_DETAIL_SURFACE = PARLIAMENT_SURFACE
export const VOTE_DETAIL_INFO_BG = PARLIAMENT_NOTICE_TINT

/** Plot-area wash behind the party chart. Shared so the loading placeholder
 *  reserves the same block of colour the chart lands in. */
export const VOTE_DETAIL_CHART_PLOT_BG = 'color-mix(in srgb, var(--parliament-link) 5%, var(--parliament-card))'

export function getVoteDetailHeroColor(
  chamber: 'camera' | 'senat' | 'comun',
): string {
  switch (chamber) {
    case 'camera':
      return PARLIAMENT_CAMERA_GREEN
    case 'senat':
      return PARLIAMENT_SENAT_RED
    // A joint sitting belongs to BOTH chambers, so it wears neither chamber's
    // colour — the purple already used for cross-chamber resources.
    case 'comun':
      return PARLIAMENT_RESOURCE_PURPLE
  }
}

/**
 * The division hero rides at the top of the page while everything under it
 * scrolls, so the title and the two tallies stay readable next to whichever
 * group the reader has scrolled down to.
 *
 * DESKTOP ONLY, at `lg` — the same line where the hero itself turns from a
 * stacked block into its two-column layout. Below it the title wraps to three or
 * four lines and the tallies sit underneath, so a pinned hero would hold a third
 * of a phone screen against the reader for the whole page. Every part of the
 * behaviour is behind the prefix, so under `lg` the band is ordinary in-flow
 * content: not positioned, no offset, no stacking context, no shadow.
 *
 * `top-0`: this app has no fixed global header — the shell is a left sidebar
 * plus `SidebarInset`, and the DOCUMENT scrolls — so the viewport's top edge is
 * the right anchor. No ancestor between here and `<body>` carries an `overflow`,
 * `transform` or `filter` rule, which is what would silently disable sticky.
 *
 * `z-30`: above the vote table's own sticky column head (`z-10`) and pinned
 * group rows (`z-[5]`), which compete in the same stacking context and would
 * otherwise paint over the hero for being later in the document; below the
 * sidebar, the FABs and the mobile dock (`z-40`).
 *
 * No added border or shadow: the hero is a saturated chamber-coloured band on a
 * light grey page and is already its own boundary. Sticky also keeps the element
 * in normal flow, so nothing jumps when it engages.
 */
export const voteDetailHeroStickyClassName = 'lg:sticky lg:top-0 lg:z-30'

/** UK Parliament member card shadow — soft lift, bottom/right bias */
export const voteMemberCardShadowClassName =
  'shadow-[1px_2px_8px_color-mix(in_srgb,var(--parliament-fg)_8%,transparent)] hover:shadow-[1px_3px_10px_color-mix(in_srgb,var(--parliament-fg)_10%,transparent)]'

export const voteDetailCardClassName =
  'overflow-hidden rounded-none border border-parliament-border bg-parliament-card shadow-[0_2px_0_0_color-mix(in_srgb,var(--parliament-fg)_4%,transparent)]'

export const voteDetailPageContainerClassName =
  'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

export const voteDetailSectionTitleClassName =
  'text-xl font-bold leading-tight text-parliament-fg sm:text-2xl lg:text-[1.75rem]'

export const voteDetailTabListClassName =
  'h-auto w-max min-w-full flex-nowrap justify-start gap-0 rounded-none border-b border-parliament-border bg-transparent p-0'

export const voteDetailTabTriggerClassName =
  'shrink-0 rounded-none border-b-[3px] border-transparent bg-transparent px-0 py-3 text-sm font-normal text-parliament-muted shadow-none sm:text-base data-[state=active]:border-parliament-resource data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-parliament-fg data-[state=active]:shadow-none'

export const voteDetailToggleActiveClassName =
  'border-parliament-resource-fill bg-parliament-resource-fill text-white hover:bg-parliament-resource-fill/90'

export const voteDetailToggleInactiveClassName =
  'border-parliament-border bg-parliament-card text-parliament-fg hover:bg-parliament-surface'

export { PARLIAMENT_RESOURCE_PURPLE }
