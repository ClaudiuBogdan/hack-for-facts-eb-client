import { t } from '@lingui/core/macro'
import { formatHubMonth, formatHubNumber, formatHubValue, hubNumberLocale } from './hub-format'

/**
 * The profile's numbers in its language, as the `/companies` hub writes them:
 * money on one scale per magnitude and never past billions, a percent with one
 * decimal against the figure, counts whole.
 */

const NBSP = '\u00a0'

export function moneyText(value: number): string {
  const formatted = formatHubValue(value, 'lei')
  return `${formatted.value}${NBSP}${formatted.unit}`
}

/**
 * Money in a column: one decimal on every scaled figure, so a column lines up
 * („1,0 mld." under „30,8 mld."), and whole lei below a million, which a
 * reader cites as they are („42.160").
 */
export function moneyCell(value: number): string {
  return formatHubValue(value, 'lei').value
}

/** A tick on a money axis: no decimals it does not need („10 mld.", „2,5 mld."). */
export function moneyTick(value: number): string {
  const magnitude = Math.abs(value)
  const scaled = (divisor: number, word: string) => {
    const figure = value / divisor
    return `${formatHubNumber(figure, { digits: Number.isInteger(Math.round(figure * 10) / 10) ? 0 : 1 })}${NBSP}${word}`
  }
  if (magnitude >= 1e9) return scaled(1e9, t`mld.`)
  if (magnitude >= 1e6) return scaled(1e6, t`mil.`)
  if (magnitude >= 1e3) return scaled(1e3, t`mii`)
  return formatHubNumber(value)
}

/** A money figure for the figures band: the value on its scale and the unit apart. */
export function moneyFigure(value: number): { readonly value: number; readonly digits: number; readonly unit: string } {
  const magnitude = Math.abs(value)
  if (magnitude >= 1e9) return { value: Math.round(value / 1e8) / 10, digits: 1, unit: t`mld. lei` }
  if (magnitude >= 1e6) return { value: Math.round(value / 1e5) / 10, digits: 1, unit: t`mil. lei` }
  return { value: Math.round(value), digits: 0, unit: t`lei` }
}

export function percent(fraction: number, signed = false): string {
  return `${formatHubNumber(fraction * 100, { digits: 1, signed })}%`
}

export function count(value: number, signed = false): string {
  return formatHubNumber(value, { signed })
}

/** A registry date („2002-11-26") as a reader writes it; the source text when it is not a date. */
export function dateText(iso: string | null): string {
  if (!iso) return '—'
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Intl.DateTimeFormat(hubNumberLocale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day))
}

export function monthText(period: string | null): string {
  return period ? formatHubMonth(period) : '—'
}

/** Consecutive years as ranges: [2012…2018, 2021] → „2012–2018, 2021". */
export function yearRanges(years: readonly number[]): string {
  const ranges: string[] = []
  let start: number | null = null
  let previous: number | null = null
  for (const year of [...years].sort((a, b) => a - b)) {
    if (start === null || previous === null || year !== previous + 1) {
      if (start !== null && previous !== null) ranges.push(start === previous ? String(start) : `${start}–${previous}`)
      start = year
    }
    previous = year
  }
  if (start !== null && previous !== null) ranges.push(start === previous ? String(start) : `${start}–${previous}`)
  return ranges.join(', ')
}
