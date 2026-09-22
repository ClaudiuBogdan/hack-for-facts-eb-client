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

  /** Mono provenance chip for matrix codes — secondary text, never a title. */
  provenanceChip:
    'inline-flex items-center gap-1 rounded-sm border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground',

  /** The tier-0 hero figure: the one LARGE number per page. */
  heroValue: 'text-4xl font-semibold tabular-nums tracking-tight',
  heroUnit: 'ml-1.5 text-lg font-normal text-muted-foreground',
  /** Amber advisory chip (heuristic pick, staleness) — tinted, never hue-only. */
  warningChip:
    'rounded-sm bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300',

  /** Flat bordered band container (single level, never nested). */
  band: 'rounded-lg border border-border/70 bg-card',
  /** A band's own header strip: the label that says what the band holds. */
  bandHeader:
    'flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-2.5',
  /** A band's body. The only padded surface inside a band, so nothing nests. */
  bandBody: 'p-4 md:p-5',

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
  /**
   * The value wraps to a second line rather than truncating: it is the
   * reader's own selection, and „1017 MUNICIPIUL AL…" says nothing about
   * which town is on the chart.
   */
  scopeRailValue:
    'mt-0.5 line-clamp-2 w-full break-words text-left text-sm font-medium text-foreground',

  // -- Dimension option panel ------------------------------------------------

  /** The panel's own header strip: which axis is being chosen, and a reset. */
  optionPanelHeader:
    'flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2',
  /**
   * One option row. `data-[active=true]` is the KEYBOARD cursor, not the
   * chosen value: the panel keeps its own, announced through
   * `aria-activedescendant`, because the rows are virtualised and a cursor
   * that lives in the DOM is lost with the row it sat on. It is the module's
   * navy tint — the same signal the catalog's facet rows use, never
   * `bg-accent`, which in this theme is pure black and made the list read as
   * a terminal — and the chosen value keeps the check mark and the weight.
   */
  optionRow:
    'flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground data-[active=true]:bg-primary/10',
  optionRowChosen: 'bg-primary/5 font-medium',
  /** An option that can be read but not picked — a cadence no chart can draw. */
  optionRowDisabled: 'cursor-not-allowed text-muted-foreground',
  /** The panel's closing strip: how many options there are, and the reset. */
  optionPanelFooter:
    'flex items-center justify-between gap-2 border-t border-border/70 px-3 py-1.5 text-xs tabular-nums text-muted-foreground',
  scopeChipName: 'shrink-0 text-muted-foreground',
  scopeChipValue: 'truncate font-medium text-foreground underline-offset-4',
  scopeChipValueDefault: 'decoration-border decoration-dotted',
  scopeChipValuePinned: 'decoration-foreground/50 decoration-solid',

  // -- Active filters (catalog list pages) ----------------------------------

  /**
   * One active-filter chip: the dimension's name quiet, its value in weight,
   * and a dismiss square of its own. 32px tall under a 40px search input, so
   * the row reads as part of the control band rather than as a footnote to it.
   * The chip itself is not the remove target — a chip that is loses a filter to
   * a misplaced click and leaves the reader nothing safe to point at.
   */
  filterChip:
    'inline-flex h-8 max-w-[min(100%,22rem)] items-center gap-1.5 rounded-md border border-border bg-card pl-2.5 pr-1 text-sm',
  filterChipName: 'shrink-0 text-muted-foreground',
  filterChipValue: 'min-w-0 truncate font-medium text-foreground',
  /** The dismiss square. 28px, clear of the 24px floor in WCAG 2.5.8. */
  filterChipRemove:
    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  /**
   * Clear-all is an action, not a token: underlined and unboxed, so it never
   * reads as one more chip at the end of the row.
   */
  filterClearAll:
    'inline-flex h-8 shrink-0 items-center rounded-md px-1 text-sm font-medium text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',

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
    'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm font-normal transition-colors hover:bg-muted/50',
  /**
   * A checked row. Lighter than a chosen facet: the box beside it has already
   * gone navy, so the row only has to agree with it.
   */
  railOptionChecked: 'bg-primary/5 font-medium text-foreground',
  /**
   * A facet row: quiet by default, and when it is the active filter a tinted
   * block with a navy bar down its leading edge. `overflow-hidden` is what
   * makes the bar part of the block — inset and pill-shaped, it read as a
   * separate dark mark floating in a field too pale to look like anything.
   * The bar is the second signal beside the weight, because colour is never
   * the only one (DESIGN.md §Colors, parliament's status border).
   */
  facetRow:
    'relative flex items-baseline gap-1.5 overflow-hidden rounded-md py-1.5 pr-2 text-left transition-colors hover:bg-muted/50',
  facetRowSelected:
    'bg-primary/10 font-semibold text-foreground before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary',
  /**
   * The level that only opens — the INS group between a domain and a
   * subdomain, which the server cannot filter on. It stays quieter than the
   * rows it holds, because those are the ones that can be picked; INS ships
   * these labels in caps, and a bolder weight on top of that turned a branch
   * into eleven lines of shouting.
   *
   * Not `text-muted-foreground`: at 12px over a hovered row that measures
   * 4.47:1, under the 4.5:1 AA floor for text this size.
   */
  facetRowGroup: 'font-medium text-foreground/70',
  facetCount: 'shrink-0 text-xs tabular-nums text-muted-foreground',
  facetCountSelected: 'text-foreground',
} as const
