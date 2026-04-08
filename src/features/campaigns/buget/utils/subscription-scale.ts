export type SubscriptionLegendBin = {
  readonly min: number
  readonly max: number
  readonly color: string
}

export const SUBSCRIPTION_NO_DATA_COLOR = '#f4f4f5'

const SUBSCRIPTION_BIN_COLORS = [
  '#fee2e2',
  '#fca5a5',
  '#f87171',
  '#dc2626',
] as const

export function buildSubscriptionLegendBins(
  counts: readonly number[],
): readonly SubscriptionLegendBin[] {
  const positiveCounts = counts
    .filter((count) => Number.isFinite(count) && count > 0)
    .sort((left, right) => left - right)

  if (positiveCounts.length === 0) {
    return []
  }

  const maxCount = positiveCounts[positiveCounts.length - 1] ?? 0
  const step = Math.max(1, Math.ceil(maxCount / SUBSCRIPTION_BIN_COLORS.length))

  return SUBSCRIPTION_BIN_COLORS.flatMap((color, index) => {
    const min = index * step + 1
    const max = Math.min(maxCount, (index + 1) * step)

    if (min > max) {
      return []
    }

    return [{ min, max, color }]
  })
}

export function getSubscriptionFillColor(
  count: number,
  bins: readonly SubscriptionLegendBin[],
): string {
  if (!Number.isFinite(count) || count <= 0 || bins.length === 0) {
    return SUBSCRIPTION_NO_DATA_COLOR
  }

  const matchingBin = bins.find((bin) => count >= bin.min && count <= bin.max)
  return matchingBin?.color ?? bins[bins.length - 1]?.color ?? SUBSCRIPTION_NO_DATA_COLOR
}
