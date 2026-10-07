import { getUserLocale } from '@/lib/utils'
import { FIRST_PLAUSIBLE_YEAR } from './company-litigation-model'

const PLAIN_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * A judicial calendar date (`YYYY-MM-DD`) in the reader's locale, or null
 * when the stored value is not a date a case can have: the API spells
 * exceptional values out (`0001-12-31 BC`, `infinity`) and stores placeholder
 * years (`0001-01-01`). The caller says such a date is missing.
 */
export function formatJudicialDate(value: string | null): string | null {
  if (value === null) return null
  const match = PLAIN_DATE.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  if (Number(year) < FIRST_PLAUSIBLE_YEAR) return null
  // setUTCFullYear, not Date.UTC: Date.UTC reads the years 0–99 as 1900–1999.
  const date = new Date(0)
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day))
  return new Intl.DateTimeFormat(getUserLocale() === 'ro' ? 'ro-RO' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
