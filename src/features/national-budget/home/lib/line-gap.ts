/** A line's point: its month (1–12) and its value. */
export type Plotted = { readonly month: number; readonly value: number }

/** A line's height at a month: its own point, or on the straight segment the line draws across a missing one. */
export function heightAt(line: readonly Plotted[], month: number): number {
  const after = line.findIndex((point) => point.month >= month)
  const next = line[after]
  if (!next) return line[line.length - 1]?.value ?? 0
  const previous = line[after - 1]
  if (next.month === month || !previous) return next.value
  return previous.value + ((next.value - previous.value) * (month - previous.month)) / (next.month - previous.month)
}

/**
 * The gap between two lines, over the months both cover: a polygon along one and back along the other, as a CSS
 * clip path in the chart's own percentages (`x`, `y`). Each edge takes every month either line has a point at, so
 * it follows both lines as drawn, a missing month included. Null where the lines share fewer than two months.
 */
export function gapOf(now: readonly Plotted[], before: readonly Plotted[], x: (month: number) => number, y: (value: number) => number): string | null {
  const from = Math.max(now[0]?.month ?? 13, before[0]?.month ?? 13)
  const to = Math.min(now[now.length - 1]?.month ?? 0, before[before.length - 1]?.month ?? 0)
  if (to <= from) return null
  const months = [...new Set([...now, ...before].map((point) => point.month))].filter((month) => month >= from && month <= to).sort((a, b) => a - b)
  const edge = (line: readonly Plotted[]) => months.map((month) => `${x(month)}% ${y(heightAt(line, month))}%`)
  return `polygon(${[...edge(now), ...edge(before).reverse()].join(', ')})`
}
