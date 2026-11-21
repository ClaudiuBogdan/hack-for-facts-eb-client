/**
 * Parliament's palette as CSS references to its tokens (`--parliament-*` in `src/index.css`), for inline styles and
 * SVG that take a colour string; classes use the Tailwind colours (`bg-parliament-commons-fill`).
 *
 * The chamber and resource colours here are the fills: hero bands, accent bars and rules, under white text. They keep
 * one colour in both themes, so they are for fills only: text in a chamber's colour belongs on the flipping
 * `text-parliament-commons` / `var(--parliament-commons)` (docs/design/parliament-skin-tokens-plan.md, batches).
 */
export const PARLIAMENT_CAMERA_GREEN = 'var(--parliament-commons-fill)'
export const PARLIAMENT_SENAT_RED = 'var(--parliament-senate-fill)'
export const PARLIAMENT_RESOURCE_PURPLE = 'var(--parliament-resource-fill)'
export const PARLIAMENT_ICON_BG = 'var(--parliament-icon)'
export const PARLIAMENT_ACTION_BLUE = 'var(--parliament-action)'
export const PARLIAMENT_SURFACE = 'var(--parliament-surface)'

/** The purple notice ground under the caveat bands (resource at 10% over the card, opaque). */
export const PARLIAMENT_NOTICE_TINT = 'color-mix(in srgb, var(--parliament-resource) 10%, var(--parliament-card))'

/**
 * The heat maps' blue ramp (hub activity, member votes, member speeches) as inline fills for counted cells, fewest to
 * most: one copy, so the three maps cannot drift. In light the steps run light to dark; in dark they run dark to light,
 * rising from the empty cell. Counted cells take no edge: every dark step clears 3:1 on the card by itself. A cell with
 * no count is `parliamentHeatmapEmptyCellClassName`.
 */
export const PARLIAMENT_HEATMAP_RAMP = [
  'var(--parliament-ramp-1)',
  'var(--parliament-ramp-2)',
  'var(--parliament-ramp-3)',
  'var(--parliament-ramp-4)',
] as const

/** A heat-map cell with no count: the zero step inside its edge. */
export const parliamentHeatmapEmptyCellClassName = 'border border-parliament-ramp-edge bg-parliament-ramp-0'

/** The edge alone, for a cell with no data at all (a day outside the capture, the hub's uncaptured cells); never for a counted cell. */
export const parliamentHeatmapCellEdgeClassName = 'border border-parliament-ramp-edge'

/** UK Parliament quick-link card typography */
export const parliamentQuickLinkTitleClassName =
  'text-xl font-bold leading-[1.2] tracking-normal text-parliament-fg'

export const parliamentQuickLinkDescriptionClassName =
  'text-base font-normal leading-6 text-parliament-fg'

/** UK Parliament resource row typography */
export const parliamentResourceTitleClassName =
  'text-lg font-bold leading-[1.25] text-parliament-fg'

export const parliamentResourceDescriptionClassName =
  'text-base font-normal leading-6 text-parliament-fg'

/** Card chevron — UK Parliament style, slightly larger and bolder */
export const parliamentCardChevronClassName =
  'h-6 w-6 shrink-0 text-parliament-fg'

/** PNRR-style hub surfaces — shared border rhythm across Parlament sections */
export const parliamentHubSectionClassName =
  'overflow-hidden rounded-none border-2 border-parliament-border-strong bg-parliament-card'

export const parliamentHubSectionHeaderClassName =
  'border-b-2 border-parliament-border-strong px-5 py-4 sm:px-6'

export const parliamentHubSectionBodyClassName = 'p-5 sm:p-6'

export const parliamentHubInternalBorderClassName = 'border-parliament-border-strong'

export const parliamentHubFieldClassName =
  'h-10 min-w-0 flex-1 rounded-none border-2 border-parliament-border-strong bg-parliament-card px-3 text-base shadow-none focus-visible:ring-2 focus-visible:ring-parliament-focus'

export const parliamentHubActionClassName =
  'h-10 shrink-0 rounded-none px-5 text-base font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

export const parliamentHubLinkClassName =
  'text-sm font-semibold text-parliament-frame-fg underline underline-offset-2 transition-colors hover:text-parliament-frame-muted'

export const parliamentHubTitleClassName =
  'text-xl font-bold tracking-tight text-parliament-frame-fg sm:text-2xl'

export const parliamentHubDescriptionClassName =
  'mt-1 text-sm text-parliament-frame-muted'

/** UK Parliament vote division card */
export const parliamentVoteCardClassName =
  'group flex overflow-hidden border border-parliament-border bg-parliament-card shadow-[0_2px_0_0_color-mix(in_srgb,var(--parliament-fg)_4%,transparent)] transition-colors hover:bg-parliament-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-parliament-focus'

export const parliamentVoteCardDividerClassName = 'border-parliament-border'

/** UK Parliament votes overview — shared row tracks for column alignment (lg+) */
export const parliamentVotesOverviewGridClassName =
  'grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_auto_auto_auto] lg:gap-x-8 lg:gap-y-0'

/** UK Parliament votes overview surface */
export const parliamentVotesSurfaceClassName =
  '-mx-4 rounded-none bg-parliament-surface px-4 py-6 sm:-mx-6 sm:px-6 sm:py-8 lg:-mx-8 lg:px-8'
