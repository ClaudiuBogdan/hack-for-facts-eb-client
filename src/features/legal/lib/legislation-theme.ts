/**
 * Class strings for the `/legislation` surfaces. Components import from here and
 * never hardcode their own, mirroring `src/features/parliament/lib/*-theme.ts`.
 *
 * The structure is Parliament's (2px borders, 0 radius, UK-weight typography);
 * only the accent differs. Violet is not a new colour: `DOC_TYPE_META.legal_act`
 * already renders legal hits violet in global search.
 */

/** The single page accent — used on the tab indicator, icons, and fill bars only. */
export const LEGISLATION_ACCENT = '#512178'

/* ── header ──────────────────────────────────────────────────────────────── */

export const legislationHeaderTitleClassName =
  'max-w-5xl text-balance font-black leading-[0.85] tracking-tight text-[var(--pnrr-fg)]'

export const legislationHeaderTitleLineClassName = 'block'

export const legislationHeaderTitleStyle = {
  fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
} as const

export const legislationHeaderDescriptionClassName =
  'max-w-[40rem] text-[1.125rem] font-normal leading-8 text-[var(--pnrr-fg)]'

export const legislationHeaderMetaClassName =
  'text-base font-normal leading-6 text-[var(--pnrr-muted)]'

export const legislationHeaderStatClassName =
  'inline-flex items-center gap-2 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 py-2 text-base'

export const legislationHeaderStatValueClassName =
  'font-bold tabular-nums text-[var(--pnrr-fg)]'

export const legislationHeaderStatLabelClassName =
  'font-normal text-[var(--pnrr-muted)]'

export const legislationHeaderHeroClassName = 'pt-10 pb-8 sm:pt-14 sm:pb-10'

/* ── section containers ──────────────────────────────────────────────────── */

/**
 * The container for a section of tab content.
 *
 * Inside a tab there is exactly **one separator language: 1px
 * `--pnrr-subtle`** — the container edge, the rule under a heading, and the rows
 * of a grid all draw it. What makes this read as a container is the card fill
 * standing against the warm page background, not a heavy stroke, so the 2px
 * near-black stays where it belongs: the page header and the tab nav.
 */
export const legislationSectionClassName =
  'overflow-hidden rounded-none border border-[var(--pnrr-subtle)] bg-[var(--pnrr-card)]'

// A hairline under the title block, enough to seat the heading against its
// content without walling the two apart the way a 2px rule did.
export const legislationSectionHeaderClassName =
  'border-b border-[var(--pnrr-subtle)] px-5 py-4 sm:px-6'

export const legislationSectionBodyClassName = 'p-5 sm:p-6'

export const legislationSectionTitleClassName =
  'text-xl font-bold tracking-tight text-[var(--pnrr-fg)] sm:text-2xl'

export const legislationSectionDescriptionClassName =
  'mt-1 text-sm text-[var(--pnrr-muted)]'

// No rule of its own: quiet type already demotes a footnote to metadata, and the
// last row of the body above it supplies the boundary.
export const legislationSectionFootnoteClassName =
  'px-5 pb-4 pt-3 text-xs text-[var(--pnrr-muted)] sm:px-6'

export const legislationLinkClassName =
  'text-sm font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 transition-colors hover:text-[var(--pnrr-muted)]'

/* ── form controls ───────────────────────────────────────────────────────── */

export const legislationFieldClassName =
  'h-12 min-w-0 flex-1 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base shadow-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

export const legislationSubmitClassName =
  'h-12 shrink-0 rounded-none px-6 text-base font-semibold text-white hover:opacity-90'

export const legislationExampleChipClassName =
  'rounded-none border border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-2.5 py-1 text-xs transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

/**
 * The outbound action that leaves the platform for the official source.
 *
 * Solid rather than outlined, because on the act page this is not one link among
 * several: we do not hold the text of the law, so the route to it is the page's
 * reason to exist (`docs/design/legal/act-detail.md` §1).
 */
export const legislationActionClassName =
  'inline-flex items-center gap-2 rounded-none bg-[var(--pnrr-fg)] px-4 py-2.5 text-sm font-semibold text-[var(--pnrr-bg)] transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] focus-visible:ring-offset-2'

/* ── chips ───────────────────────────────────────────────────────────────── */

/**
 * One chip shape for every taxonomy on a legislation surface, distinguished by
 * fill rather than by border weight. Before this there were three shapes in a
 * single card — a 2px black one, an accent-left-bar one and a hairline one — and
 * the reader had to work out whether the differences meant anything. They did
 * not.
 */
export const legislationChipClassName =
  'inline-flex items-center gap-1.5 rounded-none border border-[var(--pnrr-subtle)] bg-[var(--pnrr-hover)] px-2.5 py-1 text-sm text-[var(--pnrr-fg)]'

/** The same chip, demoted: for a second taxonomy that is navigation, not answer. */
export const legislationQuietChipClassName =
  'inline-flex items-center gap-1.5 rounded-none border border-[var(--pnrr-subtle)] bg-[var(--pnrr-card)] px-2.5 py-1 text-sm text-[var(--pnrr-muted)]'

/* ── alerts ──────────────────────────────────────────────────────────────── */

/**
 * A caveat that must be read before the thing it qualifies.
 *
 * The tint carries the signal, so the border stays a hairline and the accent is
 * a single left bar. A 2px box on all four sides made every warning shout at the
 * same volume as the page chrome around it.
 */
export const legislationAlertClassName =
  'flex gap-3 border border-l-4 border-[var(--pnrr-subtle)] border-l-[var(--pnrr-warning-fg)] bg-[var(--pnrr-warning-bg)] px-4 py-3 sm:px-5'

/**
 * The same caveat surface without the row layout or vertical padding — for a
 * collapsible warning whose `<summary>` row owns the flex and the padding.
 * A separate constant rather than `legislationAlertClassName` + overrides:
 * `gap-0` vs `gap-3` at equal specificity is decided by stylesheet order,
 * not by class-attribute order, so an override there breaks silently.
 */
export const legislationAlertShellClassName =
  'border border-l-4 border-[var(--pnrr-subtle)] border-l-[var(--pnrr-warning-fg)] bg-[var(--pnrr-warning-bg)] px-4 sm:px-5'

/* ── three-tier text hierarchy (label → value → metadata) ────────────────── */

export const legislationStatLabelClassName =
  'text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]'

export const legislationStatValueClassName =
  'mt-2 text-[2rem] font-extrabold leading-tight tabular-nums text-[var(--pnrr-fg)]'

export const legislationStatMetaClassName =
  'mt-1.5 text-xs text-[var(--pnrr-muted)]'

/* ── rows ────────────────────────────────────────────────────────────────── */

export const legislationRowClassName =
  'relative flex w-full items-center gap-4 overflow-hidden border-b border-[var(--pnrr-subtle)] px-5 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] sm:px-6'

/**
 * A cell in a hairline lattice. Pair it with `legislationGridClassName`, and with
 * `getGridFillerClassNames` when the item count may not fill the last row.
 *
 * Rules are drawn on the **top and left** rather than bottom and right, so every
 * rule falls *between* two cells and none trails past the content into the
 * container edge. Padding matches the section header, so the first column lines up
 * with the title above it.
 */
export const legislationCellClassName =
  'border-l border-t border-[var(--pnrr-subtle)] px-5 py-3 text-left transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] sm:px-6'

/**
 * The grid that carries `legislationCellClassName` cells.
 *
 * The negative margins slide the leading row's and column's rules under the
 * container edge, where `overflow-hidden` clips them — the top one landing exactly
 * on the header hairline. Without this, the outer rules would double the container
 * border. Add the column counts at the call site.
 */
export const legislationGridClassName = '-ml-px -mt-px grid'

/** An empty cell that closes the lattice. No hover — there is nothing to point at. */
export const legislationGridFillerClassName =
  'border-l border-t border-[var(--pnrr-subtle)]'

/**
 * Written out in full rather than assembled from a prefix: Tailwind only emits
 * classes it can find as literal strings in the source, so `` `${prefix}block` ``
 * would compile to CSS that does not exist.
 */
const GRID_FILLER_VISIBILITY = [
  { show: 'block', hide: 'hidden' },
  { show: 'sm:block', hide: 'sm:hidden' },
  { show: 'lg:block', hide: 'lg:hidden' },
  { show: 'xl:block', hide: 'xl:hidden' },
] as const

/**
 * Visibility classes for the empty cells that complete a lattice's final row, so
 * the rules close the rectangle even where the data runs out.
 *
 * How many cells are missing depends on the column count, and the column count
 * changes per breakpoint — five gazette issues leave one gap at three columns, one
 * at two, and none at one. So this returns the widest set of fillers any
 * breakpoint needs, each carrying the responsive visibility that shows it only
 * where it is actually missing. Grid items stretch by default, so a filler takes
 * its row's height without being given one.
 *
 * `columns` is the column count per breakpoint, widest last: `[2, 3, 4]`.
 */
export function getGridFillerClassNames({
  itemCount,
  columns,
}: {
  readonly itemCount: number
  readonly columns: readonly number[]
}): readonly string[] {
  const missing = columns
    .slice(0, GRID_FILLER_VISIBILITY.length)
    .map((count) => (count - (itemCount % count)) % count)
  const fillerCount = Math.max(0, ...missing)

  return Array.from({ length: fillerCount }, (_unused, index) =>
    missing
      .map((missingHere, breakpoint) => {
        const visibility = GRID_FILLER_VISIBILITY[breakpoint]
        return index < missingHere ? visibility.show : visibility.hide
      })
      .join(' '),
  )
}
