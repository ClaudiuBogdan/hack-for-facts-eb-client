import { useMemo } from 'react'
import { useLingui } from '@lingui/react'
import type { Line, LineCount } from './lines'

/** Numbers in the reader's language. */
export function useAnalyticsFormat() {
  const { i18n } = useLingui()
  return useMemo(() => {
    const locale: 'en' | 'ro' = i18n.locale === 'en' ? 'en' : 'ro'
    const number = new Intl.NumberFormat(locale)
    return { locale, n: (value: number) => number.format(value) }
  }, [i18n.locale])
}

/** Largest remainder: whole squares per line that add up to the rounded total. */
export function squaresOf(rows: readonly LineCount[], per: number): readonly (readonly [Line, number])[] {
  const whole = Math.round(rows.reduce((sum, row) => sum + row.value, 0) / per)
  const exact = rows.map((row) => row.value / per)
  const counts = exact.map(Math.floor)
  let left = whole - counts.reduce((sum, n) => sum + n, 0)
  const byRemainder = exact.map((value, index) => [value - Math.floor(value), index] as const).sort((a, b) => b[0] - a[0])
  for (const [, index] of byRemainder) {
    if (left <= 0) break
    counts[index] = (counts[index] ?? 0) + 1
    left -= 1
  }
  return rows.map((row, index) => [row.line, counts[index] ?? 0] as const)
}
