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
} as const
