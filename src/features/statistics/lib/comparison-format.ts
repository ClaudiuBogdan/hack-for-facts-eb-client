import { t } from '@lingui/core/macro'

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
  /** Deterministic from the URL token shape — present even for empty rows. */
  readonly level: 'NATIONAL' | 'NUTS3' | 'LAU'
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

/**
 * Level badges (and the absolute-values note) appear ONLY when the compared
 * levels actually mix — a same-level set would wear N identical tags
 * (user ruling C2).
 */
export function hasMixedComparisonLevels(
  series: readonly ComparisonSeriesDescriptor[],
): boolean {
  return new Set(series.map((entry) => entry.level)).size > 1
}

/** Short level tag shown beside mixed-level series (identity, not colour). */
export function comparisonLevelLabel(
  level: ComparisonSeriesDescriptor['level'],
): string {
  switch (level) {
    case 'NATIONAL':
      return t`țară`
    case 'NUTS3':
      return t`județ`
    case 'LAU':
      return t`localitate`
  }
}
