/**
 * Number formats and colour tokens of the legislation analytics charts (shared by the pages and the development
 * prototype). Literal class names, so Tailwind keeps them.
 */

/** A lens value with its acts and its share of the selection (computed by the caller from the counts). */
export type Ranked = { readonly key: string; readonly label: string; readonly n: number; readonly share: number }

export const fmt = (n: number) => n.toLocaleString('ro-RO')
export const pct = (x: number, digits = 1) =>
  `${(x * 100).toLocaleString('ro-RO', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`

// ───────────────────────────────────────────────────── colours ──

/**
 * Stacked series (round 1, note 1): the leading values in five navy steps from the choropleth tokens, darkest at the
 * bottom of the stack, and one grey for „altele". Steps differ in lightness, so they stay apart in dark mode and under
 * a colour-vision deficiency. Literal classes so Tailwind keeps them.
 */
export const STACK_BG = ['bg-choropleth-5', 'bg-choropleth-4', 'bg-choropleth-3', 'bg-choropleth-2', 'bg-choropleth-1', 'bg-muted-foreground/30'] as const
/** Categories without an order (the map's theme families, type bands, eras): six distinct tokens, navy first. */
export const SERIES_BG = ['bg-chart-1', 'bg-chart-sky', 'bg-choropleth-2', 'bg-chart-2', 'bg-choropleth-4', 'bg-chart-4', 'bg-muted-foreground/25'] as const
export const SERIES_FILL = ['fill-chart-1', 'fill-chart-sky', 'fill-choropleth-2', 'fill-chart-2', 'fill-choropleth-4', 'fill-chart-4', 'fill-muted-foreground/25'] as const
export const DENSITY_FILL = ['fill-choropleth-1', 'fill-choropleth-2', 'fill-choropleth-3', 'fill-choropleth-4', 'fill-choropleth-5'] as const
export const DENSITY_BG = ['bg-choropleth-1', 'bg-choropleth-2', 'bg-choropleth-3', 'bg-choropleth-4', 'bg-choropleth-5'] as const
export const HEAT_BG = ['bg-primary/5', 'bg-primary/15', 'bg-primary/30', 'bg-primary/50', 'bg-primary/70'] as const
