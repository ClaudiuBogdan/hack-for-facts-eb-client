import { cn } from '@/lib/utils'

/**
 * The act page's one grid (owner, 26 November 2026, the act page's redesign): the contents' column, the reading
 * column and, from 88rem, a column for what is to know about the text shown. The head, the reading bar and the body
 * all sit on it, so the title, the bar's place and the text share one left edge.
 *
 * `min-[88rem]` is in rem on purpose: an arbitrary px breakpoint sorts before `lg:` and loses to it.
 */
export const ACT_GRID = 'mx-auto grid w-full max-w-6xl grid-cols-1 px-4 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-x-12 min-[88rem]:max-w-[84rem]'

/** The third column, from 88rem: the head's facts and the box about the text shown. */
export const ACT_GRID_THREE = 'min-[88rem]:grid-cols-[16rem_minmax(0,42rem)_17rem]'

/** The reading column's measure. */
export const ACT_COLUMN = 'min-w-0 max-w-[42rem]'

/** A link that goes somewhere: the site's blue. */
export const ACT_LINK = 'font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary'

/** A control that opens more of the same page. Not blue: blue is for a link that goes somewhere (owner, 26 November 2026). */
export const ACT_MORE = 'font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground'

/** A control's height: 44 px on a phone, 40 px from `sm`. */
export const ACT_CONTROL = 'h-11 sm:h-10'

/** The way back to the act's start, floating: a floating layer, so the one place a shadow is allowed. */
export const ACT_TO_START = 'inline-flex items-center justify-center rounded-md border bg-background text-muted-foreground shadow-sm hover:text-foreground'

/** The `h1` the ways back to the start move the focus to. */
export const ACT_TITLE_ID = 'act-title'

/**
 * A line of a list in the act's record ("Fișa actului"): the date or the relation in the muted colour at the left,
 * the thing itself at the right. The list draws the hairlines between its lines (`divide-y`).
 */
export const ACT_RECORD_LINE = 'grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 py-2 sm:grid-cols-[9rem_minmax(0,1fr)]'

/** A control in the act's record that opens more of the same row: 44 px on a phone, 40 px from `sm`. */
export const ACT_RECORD_MORE = cn(ACT_MORE, 'mt-1 inline-flex min-h-11 items-center text-left sm:min-h-10')

/**
 * The live page's warnings (`ActWarnings`, rows), worn in the box about the text: their words and their
 * open-on-demand rows as they are, restyled from outside. The headline at the column's reading size and medium
 * weight, the triangle and the chevron on its first line, no inset, the explanation as small print under the
 * headline's text.
 */
export const ACT_ABOUT_WARNINGS = cn(
  '[&_details]:border-border',
  '[&_summary]:items-start [&_summary]:gap-2 [&_summary]:px-0 [&_summary]:py-2.5',
  '[&_summary>svg:first-child]:mt-[3px] [&_summary>svg:first-child]:text-status-partial-fg',
  '[&_summary>span]:text-sm [&_summary>span]:font-medium [&_summary>span]:leading-5 [&_summary>span]:text-foreground',
  '[&_summary>svg:last-child]:mt-0.5 [&_summary>svg:last-child]:text-muted-foreground',
  '[&_details>p]:px-0 [&_details>p]:pb-3 [&_details>p]:pl-[1.375rem] [&_details>p]:text-xs [&_details>p]:leading-5 [&_details>p]:text-muted-foreground',
)
