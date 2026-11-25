/**
 * Number formats and colour tokens of the legislation analytics charts (shared by the pages and the development
 * prototype). Literal class names, so Tailwind keeps them.
 */

/** A lens value with its acts and its share of the selection (computed by the caller from the counts). */
export type Ranked = { readonly key: string; readonly label: string; readonly n: number; readonly share: number }

export const fmt = (n: number) => n.toLocaleString('ro-RO')

/**
 * A share as a percentage. A share that rounds to 0% or 100% without being it says so („<0,1%", „>99,9%"); a
 * share that is not a number (a count over an empty selection) is a dash.
 */
export const pct = (x: number, digits = 1) => {
  if (!Number.isFinite(x)) return '—'
  const format = (value: number) => value.toLocaleString('ro-RO', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  const step = 10 ** -digits
  const rounded = Number((x * 100).toFixed(digits))
  if (x > 0 && rounded === 0) return `<${format(step)}%`
  if (x < 1 && rounded === 100) return `>${format(100 - step)}%`
  return `${format(x * 100)}%`
}

/**
 * A share as a percentage figure (0–100) and the decimals to print it with, for a figure that counts up: as
 * many decimals (one to three) as it takes not to print 0 or 100 for a share that is neither. A share still
 * closer than that is held at 0,001 or 99,999, which it exceeds or does not reach.
 */
export function shareFigure(n: number, total: number): { readonly value: number; readonly digits: number } {
  const x = total > 0 ? n / total : 0
  for (const digits of [1, 2, 3]) {
    const rounded = Number((x * 100).toFixed(digits))
    if (!((x > 0 && rounded === 0) || (x < 1 && rounded === 100))) return { value: x * 100, digits }
  }
  return { value: x > 0.5 ? 99.999 : 0.001, digits: 3 }
}

/** `n` as a share of `total`, or a dash when there is nothing to share (an empty selection). */
export const pctOf = (n: number, total: number, digits = 1) => (total > 0 ? pct(n / total, digits) : '—')

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
