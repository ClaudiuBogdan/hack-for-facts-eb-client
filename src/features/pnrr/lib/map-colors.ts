const PNRR_BLUE_HEATMAP_STOPS = [
  { stop: 0, hue: 204, saturation: 100, lightness: 94 },
  { stop: 0.25, hue: 203, saturation: 92, lightness: 78 },
  { stop: 0.5, hue: 207, saturation: 86, lightness: 61 },
  { stop: 0.75, hue: 214, saturation: 82, lightness: 47 },
  { stop: 1, hue: 224, saturation: 76, lightness: 34 },
] as const

export function getPnrrBlueHeatmapColor(value: number): string {
  const clampedValue = Math.max(0, Math.min(1, value))

  for (let i = 1; i < PNRR_BLUE_HEATMAP_STOPS.length; i += 1) {
    const lower = PNRR_BLUE_HEATMAP_STOPS[i - 1]
    const upper = PNRR_BLUE_HEATMAP_STOPS[i]

    if (clampedValue <= upper.stop) {
      const range = upper.stop - lower.stop
      const scaledValue = range > 0 ? (clampedValue - lower.stop) / range : 0
      const hue = lower.hue + (upper.hue - lower.hue) * scaledValue
      const saturation = lower.saturation + (upper.saturation - lower.saturation) * scaledValue
      const lightness = lower.lightness + (upper.lightness - lower.lightness) * scaledValue

      return `hsl(${hue}, ${saturation}%, ${lightness}%)`
    }
  }

  const last = PNRR_BLUE_HEATMAP_STOPS[PNRR_BLUE_HEATMAP_STOPS.length - 1]
  return `hsl(${last.hue}, ${last.saturation}%, ${last.lightness}%)`
}

