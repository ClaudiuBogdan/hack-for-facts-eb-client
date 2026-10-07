/**
 * The arithmetic behind the page's drawings, as pure functions: a part's
 * tone, whole lei out of a hundred, a squarified treemap, a share's words.
 */
import type { CSSProperties } from 'react'


/** One part of a whole, as a chart draws it. */
export type Part = {
  readonly key: string
  readonly label: string
  readonly hint?: string | null
  /** The amount in words: „208,0 mld. lei". */
  readonly amount: string
  /** The share of the whole in percent, six decimals: the geometry only. */
  readonly share: number
  /** The share as a whole percentage, rounded once from the exact amounts: lei out of 100. */
  readonly shareWhole: number
  /** The share as a label says it, rounded once from the exact amounts: „16%”, „4,1%”. */
  readonly shareLabel: string
  /** The share with one decimal, rounded once from the exact amounts: „15,4%”. */
  readonly shareDecimal: string
  /** „+12,3%" against the same window a year earlier. */
  readonly change?: string | null
  /** What the printed total leaves: drawn hatched, listed last. */
  readonly rest?: boolean
  readonly href?: string
}

const REST_FILL = 'bg-[repeating-linear-gradient(135deg,hsl(var(--muted-foreground)/0.28)_0_1.5px,transparent_1.5px_7px)] bg-muted/70'

/** A part's tone: its fill and the text that reads on it. */
export type Tone = { readonly className: string; readonly style?: CSSProperties; readonly ink: string }

/**
 * One navy family, darkest for the largest part, palest for the smallest:
 * the choropleth's two ends mixed in OKLab, so dark mode (where the ends
 * swap) follows the tokens. Text needs ≥ 4.5:1 on its fill, which neither
 * text colour has in the middle of the mix (47–69% in either theme, checked
 * against both): the larger parts take the dark steps (100→70%, the
 * background's colour on them), the smaller the pale ones (46→12%, the
 * foreground's). „The rest" is hatched grey.
 */
export function toneOf(part: Part, rank: number, count: number): Tone {
  if (part.rest) return { className: REST_FILL, ink: 'text-foreground' }
  const at = count <= 1 ? 0 : Math.min(rank / (count - 1), 1)
  const mix = Math.round(at <= 0.42 ? 100 - (at / 0.42) * 30 : 46 - ((at - 0.42) / 0.58) * 34)
  return {
    className: '',
    style: { backgroundColor: `color-mix(in oklab, hsl(var(--choropleth-5)) ${mix}%, hsl(var(--choropleth-1)))` },
    ink: mix >= 70 ? 'text-background' : 'text-foreground',
  }
}

/** The parts the scale is spread over: every named one („the rest" is grey). */
export const namedCount = (parts: readonly Part[]): number => parts.filter((part) => !part.rest).length

/** Whole cells out of a hundred for each part, by the largest remainder: they always make a hundred. */
export function cellsOutOfHundred(parts: readonly Part[]): readonly number[] {
  const total = parts.reduce((sum, part) => sum + Math.max(part.share, 0), 0) || 1
  const exact = parts.map((part) => (Math.max(part.share, 0) / total) * 100)
  const floors = exact.map(Math.floor)
  let left = 100 - floors.reduce((sum, value) => sum + value, 0)
  const order = exact.map((value, index) => ({ index, remainder: value - Math.floor(value) })).sort((a, b) => b.remainder - a.remainder)
  for (const { index } of order) {
    if (left <= 0) break
    floors[index]! += 1
    left -= 1
  }
  return floors
}

export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** Squarified treemap (Bruls, Huizing, van Wijk): rectangles near squares, in the order given, in a w×h box. */
export function squarify(values: readonly number[], box: Rect): readonly Rect[] {
  const total = values.reduce((sum, value) => sum + Math.max(value, 0), 0)
  if (total <= 0) return values.map(() => ({ x: box.x, y: box.y, w: 0, h: 0 }))
  const scale = (box.w * box.h) / total
  const areas = values.map((value) => Math.max(value, 0) * scale)
  const out: Rect[] = new Array(values.length)
  let rest = { ...box }
  let start = 0
  const worst = (row: readonly number[], side: number) => {
    const sum = row.reduce((a, b) => a + b, 0)
    const max = Math.max(...row)
    const min = Math.min(...row)
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min))
  }
  while (start < areas.length) {
    const side = Math.min(rest.w, rest.h)
    let end = start + 1
    while (end < areas.length && worst(areas.slice(start, end + 1), side) <= worst(areas.slice(start, end), side)) end += 1
    const row = areas.slice(start, end)
    const sum = row.reduce((a, b) => a + b, 0)
    if (rest.w >= rest.h) {
      // A column on the left.
      const width = sum / rest.h
      let y = rest.y
      row.forEach((area, offset) => {
        const height = area / width
        out[start + offset] = { x: rest.x, y, w: width, h: height }
        y += height
      })
      rest = { x: rest.x + width, y: rest.y, w: rest.w - width, h: rest.h }
    } else {
      // A row on top.
      const height = sum / rest.w
      let x = rest.x
      row.forEach((area, offset) => {
        const width = area / height
        out[start + offset] = { x, y: rest.y, w: width, h: height }
        x += width
      })
      rest = { x: rest.x, y: rest.y + height, w: rest.w, h: rest.h - height }
    }
    start = end
  }
  return out
}

