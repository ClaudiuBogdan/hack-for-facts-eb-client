import { t } from '@lingui/core/macro'
import type { ClassInterval } from './uat-map-scales'

/** Two bounds as one range: an en dash between plain figures, an ellipsis where a sign would meet it. */
const range = (low: string, high: string) => (/^[+−-]/.test(low) || /^[+−-]/.test(high) ? `${low} … ${high}` : `${low}–${high}`)

/** A bound as the integer it is meant to be: `roundBound` can leave 3.0000000000000004. */
const snap = (value: number) => (Math.abs(value - Math.round(value)) < 1e-9 ? Math.round(value) : value)

/**
 * A class in words, naming exactly the values the map puts in it
 * (`ClassInterval`: a class holds its lower bound, not its upper one, unless
 * the scale says otherwise). Whole numbers read as closed ranges — „1–20",
 * „81 sau mai mult" — counted inward from a bound that falls between two
 * integers; other figures name the end a class leaves open — „2,5 – sub 5".
 * „Peste 81" over a class that holds 81 read 81 out of it.
 */
export function classLabel(format: (value: number) => string, interval: ClassInterval, wholeNumbers: boolean): string {
  if (interval.zero) return '0'
  const includesFrom = interval.includesFrom ?? true
  const includesTo = interval.includesTo ?? false
  const from = interval.from === null ? null : snap(interval.from)
  const to = interval.to === null ? null : snap(interval.to)
  // A band around zero that holds both its bounds reads as its half-width.
  if (from !== null && to !== null && from === -to && to > 0 && includesFrom && includesTo)
    return `±${format(to).replace(/^\+/, '')}`
  if (from === null) return t`sub ${format(to!)}`
  if (to === null) return includesFrom ? t`${format(from)} sau mai mult` : t`peste ${format(from)}`
  if (wholeNumbers) {
    const low = includesFrom ? Math.ceil(from) : Math.floor(from) + 1
    const high = includesTo ? Math.floor(to) : Math.ceil(to) - 1
    // No whole number falls in it; a scale should not draw such a class, and the legend does not invent one.
    if (low > high) return '—'
    return low === high ? format(low) : range(format(low), format(high))
  }
  // The first class above a zero class: zero has its own swatch, so „sub" says it.
  if (from === 0 && !includesFrom && !includesTo) return t`sub ${format(to)}`
  if (includesFrom && includesTo) return range(format(from), format(to))
  if (includesFrom) return t`${format(from)} – sub ${format(to)}`
  if (includesTo) return t`peste ${format(from)} – ${format(to)}`
  return t`peste ${format(from)} – sub ${format(to)}`
}
