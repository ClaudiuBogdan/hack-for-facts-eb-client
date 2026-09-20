/**
 * Statistics surface class constants (parliament/legal convention: components
 * import these, never hardcode their own copies). Neutral-navy system skin —
 * borders not shadows, three text tiers, tabular figures on every number.
 */
export const statisticsTheme = {
  /** Page column: bands stacked in one rhythm, no nested cards. */
  page: 'mx-auto max-w-6xl space-y-10 px-4 py-6 md:px-6',

  /** Muted uppercase tier-1 label. */
  sectionLabel:
    'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  sectionTitle: 'text-lg font-semibold',
  sectionSubtitle: 'mt-1 text-sm text-muted-foreground',

  /** Mono provenance chip for matrix codes — secondary text, never a title. */
  provenanceChip:
    'inline-flex items-center gap-1 rounded-sm border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground',

  /** Stat tile: bordered, flat, three-tier. */
  statTile:
    'group relative flex min-w-0 flex-col gap-1 rounded-lg border border-border/70 bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  statTileLabel:
    'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  statTileValue: 'text-2xl font-semibold tabular-nums tracking-tight',
  statTileUnit: 'text-sm font-normal text-muted-foreground',
  statTileMeta: 'text-xs text-muted-foreground',

  /** Ranked list rows with the inline proportion fill (PNRR pattern, re-skinned). */
  rankedRow:
    'relative flex items-center justify-between gap-3 overflow-hidden rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
  rankedFill: 'absolute inset-y-0 left-0 bg-primary/10',
  rankedValue: 'shrink-0 tabular-nums text-sm font-medium',

  /** The tier-0 hero figure: the one LARGE number per page. */
  heroValue: 'text-4xl font-semibold tabular-nums tracking-tight',
  heroUnit: 'ml-1.5 text-lg font-normal text-muted-foreground',
  /** Amber advisory chip (heuristic pick, staleness) — tinted, never hue-only. */
  warningChip:
    'rounded-sm bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300',

  /** Flat bordered band container (single level, never nested). */
  band: 'rounded-lg border border-border/70 bg-card',
  bandPadded: 'rounded-lg border border-border/70 bg-card p-4 md:p-6',
  /** A band's own header strip: the label that says what the band holds. */
  bandHeader:
    'flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-2.5',
  /** A band's body. The only padded surface inside a band, so nothing nests. */
  bandBody: 'p-4 md:p-5',
  /**
   * A band's closing strip: where the data came from and what can be taken
   * away with it. Reads as the band's footnote, not as a second header.
   */
  bandFooter:
    'flex flex-col gap-3 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between',

  // -- Detail page ----------------------------------------------------------

  /**
   * The quiet identity line under a page title: source, matrix code, cadence.
   * Everything a badge used to say and did not need a badge to say it.
   */
  metaLine:
    'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground',
  /** Long published prose (definitions, methodology). Measured, not cramped. */
  prose: 'max-w-prose text-sm leading-relaxed text-muted-foreground',
  /**
   * An advisory note inside a band: tinted, not outlined. A second bordered
   * box inside a bordered band is a card in a card. (`Alert` keeps its border
   * — an error or a warning is meant to interrupt, and it is a shared
   * primitive whose framing every other surface relies on.)
   */
  note: 'space-y-2 rounded-md bg-muted/60 p-3 text-sm',
  /**
   * One scope chip — the dimension's name, its value, a chevron. A dotted
   * underline on the value marks a server default, a solid one a user pin;
   * the legend under the row says so once, and `aria-label` says it per chip.
   */
  scopeChip:
    'inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/70 bg-card py-1 pl-2 pr-1.5 text-xs transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  /**
   * A scope axis with nothing to choose — one periodicity, one unit. It wears
   * no border and no surface: given the same chip as its neighbours it read as
   * a control that did nothing when pressed.
   */
  scopeChipStatic: 'inline-flex items-center gap-1.5 px-1 py-1 text-xs',
  /**
   * One row of the standing scope rail: the axis name over its value, with the
   * chevron and the „implicit" mark at the far edge. The rail is the desktop
   * alternative to the chip row — the same segments, stacked, so changing an
   * axis never pushes the figure down the page.
   */
  scopeRailRow:
    'flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
  /** The same row for an axis with nothing to choose: text, not a button. */
  scopeRailStatic: 'flex min-w-0 flex-col items-start px-4 py-2.5',
  scopeRailLabel: 'text-xs text-muted-foreground',
  scopeRailValue:
    'mt-0.5 w-full truncate text-left text-sm font-medium text-foreground',

  // -- Dimension option panel ------------------------------------------------

  /** The panel's own header strip: which axis is being chosen, and a reset. */
  optionPanelHeader:
    'flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2',
  /**
   * One option row. `data-[selected=true]` is cmdk's KEYBOARD cursor, not the
   * chosen value — the shared `CommandItem` paints it with `bg-accent`, which
   * in this theme is pure black and made the list read as a terminal. Here it
   * is the module's own navy tint, the same signal the catalog's facet rows
   * use, and the chosen value keeps the check mark and the weight.
   */
  optionRow:
    'cursor-pointer rounded-md px-2 py-2 text-sm data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground',
  optionRowChosen: 'bg-primary/5 font-medium',
  scopeChipName: 'shrink-0 text-muted-foreground',
  scopeChipValue: 'truncate font-medium text-foreground underline-offset-4',
  scopeChipValueDefault: 'decoration-border decoration-dotted',
  scopeChipValuePinned: 'decoration-foreground/50 decoration-solid',

  // -- Facet rail (catalog list pages) --------------------------------------

  /**
   * One filter group. The first carries no rule; the rest are separated by
   * one. It sits on a wrapper, never on the `fieldset` — a `legend` renders
   * inside its fieldset's top border, which puts the rule under the label.
   */
  railGroup: 'border-t border-border/70 pt-5 first:border-t-0 first:pt-0',
  /**
   * Checkbox row: a full-width target rather than a label beside a box. No
   * negative margin — the phone sheet scrolls this column, and a scroller
   * clips whatever hangs past its start edge.
   */
  railOption:
    'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-normal transition-colors hover:bg-muted/50',
  /**
   * A facet row: quiet by default, tinted when it is the active filter, with
   * the accent carried by a left bar as well as by weight — colour is never
   * the only signal (DESIGN.md §Colors, parliament's status border).
   */
  facetRow:
    'relative flex items-baseline gap-1.5 rounded-md py-1.5 pr-2 text-left transition-colors hover:bg-muted/50',
  facetRowSelected:
    'bg-primary/10 font-medium text-foreground before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full before:bg-primary',
  facetCount: 'shrink-0 text-xs tabular-nums text-muted-foreground',
} as const
