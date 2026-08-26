/**
 * Number formatting shared by the comparison axes, tooltips and direct labels.
 *
 * Lives outside the chart components so the chart module exports only
 * components (react-refresh) — and so the formatting is testable on its own.
 */

/** A territory's identity as the legend and charts see it. */
export interface ComparisonSeriesDescriptor {
  readonly code: string
  readonly label: string
  readonly color: string
}

const numberFormatter = new Intl.NumberFormat('ro-RO', {
  maximumFractionDigits: 2,
})

export function formatComparisonNumber(value: number): string {
  return numberFormatter.format(value)
}

/** Compact axis ticks so six-figure populations do not collide. */
const compactFormatter = new Intl.NumberFormat('ro-RO', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatComparisonAxisTick(value: number): string {
  return compactFormatter.format(value)
}
