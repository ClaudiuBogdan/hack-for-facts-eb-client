/** UK Parliament content palette */
export const PARLIAMENT_CAMERA_GREEN = '#006435'
export const PARLIAMENT_SENAT_RED = '#9C051A'
export const PARLIAMENT_RESOURCE_PURPLE = '#512178'
export const PARLIAMENT_ICON_BG = '#372554'
export const PARLIAMENT_ACTION_BLUE = '#1d70b8'
export const PARLIAMENT_QUICK_LINK_ILLUSTRATION = '#c5c7c9'
export const PARLIAMENT_SURFACE = '#f3f2f1'
export const PARLIAMENT_UK_TEXT = '#0b0c0c'

/** UK Parliament quick-link card typography */
export const parliamentQuickLinkTitleClassName =
  'text-xl font-bold leading-[1.2] tracking-normal text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

export const parliamentQuickLinkDescriptionClassName =
  'text-base font-normal leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

/** UK Parliament resource row typography */
export const parliamentResourceTitleClassName =
  'text-lg font-bold leading-[1.25] text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

export const parliamentResourceDescriptionClassName =
  'text-base font-normal leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

/** Card chevron — UK Parliament style, slightly larger and bolder */
export const parliamentCardChevronClassName =
  'h-6 w-6 shrink-0 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

/** PNRR-style hub surfaces — shared border rhythm across Parlament sections */
export const parliamentHubSectionClassName =
  'overflow-hidden rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]'

export const parliamentHubSectionHeaderClassName =
  'border-b-2 border-[var(--pnrr-border)] px-5 py-4 sm:px-6'

export const parliamentHubSectionBodyClassName = 'p-5 sm:p-6'

export const parliamentHubInternalBorderClassName = 'border-[var(--pnrr-border)]'

export const parliamentHubFieldClassName =
  'h-10 min-w-0 flex-1 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base shadow-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

export const parliamentHubActionClassName =
  'h-10 shrink-0 rounded-none px-5 text-base font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

export const parliamentHubLinkClassName =
  'text-sm font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 transition-colors hover:text-[var(--pnrr-muted)]'

export const parliamentHubTitleClassName =
  'text-xl font-bold tracking-tight text-[var(--pnrr-fg)] sm:text-2xl'

export const parliamentHubDescriptionClassName =
  'mt-1 text-sm text-[var(--pnrr-muted)]'

/** UK Parliament vote division card */
export const parliamentVoteCardClassName =
  'group flex overflow-hidden border border-[#b1b4b6] bg-white shadow-[0_2px_0_0_rgba(11,12,12,0.04)] transition-colors hover:bg-[#f3f2f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:hover:bg-[var(--pnrr-hover)]'

export const parliamentVoteCardDividerClassName = 'border-[#b1b4b6] dark:border-[var(--pnrr-border)]'

/** UK Parliament votes overview — shared row tracks for column alignment (lg+) */
export const parliamentVotesOverviewGridClassName =
  'grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_auto_auto_auto] lg:gap-x-8 lg:gap-y-0'

/** UK Parliament votes overview surface */
export const parliamentVotesSurfaceClassName =
  '-mx-4 rounded-none bg-[#f3f2f1] px-4 py-6 sm:-mx-6 sm:px-6 sm:py-8 lg:-mx-8 lg:px-8 dark:bg-[var(--pnrr-subtle)]'
