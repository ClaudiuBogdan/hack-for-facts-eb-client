import { getUserLocale } from '@/lib/utils'
import { FIRST_PLAUSIBLE_YEAR } from './company-litigation-model'

/** The justice pages' numbers and dates, in the reader's locale. */

const localeTag = () => (getUserLocale() === 'en' ? 'en-GB' : 'ro-RO')

const PLAIN_DATE = /^(\d{4})-(\d{2})-(\d{2})/

function utcDate(year: number, month: number, day: number): Date {
  // setUTCFullYear, not Date.UTC: Date.UTC reads the years 0–99 as 1900–1999.
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  return date
}

/**
 * A judicial calendar date (`YYYY-MM-DD`) in the reader's locale, or null
 * when the stored value is not a date a case can have: the API spells
 * exceptional values out (`0001-12-31 BC`, `infinity`) and stores placeholder
 * years (`0001-01-01`). The caller says such a date is missing.
 */
export function formatJudicialDate(value: string | null): string | null {
  if (value === null) return null
  const match = PLAIN_DATE.exec(value)
  if (!match || (value.length > 10 && !value.includes('T'))) return null
  const [, year, month, day] = match
  if (Number(year) < FIRST_PLAUSIBLE_YEAR) return null
  return new Intl.DateTimeFormat(localeTag(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    utcDate(Number(year), Number(month), Number(day)),
  )
}

/**
 * A hearing's date and hour, as the portal stores them. The portal's clock
 * has no stated time zone and the API serves it as stored, so the hour is
 * shown as stored, never converted.
 */
export function formatHearingTime(value: string | null): string | null {
  if (value === null) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return formatJudicialDate(value)
  const [, year, month, day, hour, minute] = match
  if (Number(year) < FIRST_PLAUSIBLE_YEAR) return null
  const date = new Intl.DateTimeFormat(localeTag(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    utcDate(Number(year), Number(month), Number(day)),
  )
  return hour === '00' && minute === '00' ? date : `${date}, ${hour}:${minute}`
}

export function countText(value: number): string {
  return new Intl.NumberFormat(localeTag(), { maximumFractionDigits: 0 }).format(value)
}

/** A Romanian amount of thousands or millions, agreed as Romanian agrees a count: „1 mie", „1,5 mii", „313 mii", „20 de mii". */
function romanianScaled(amount: number, words: { readonly one: string; readonly few: string; readonly other: string }): string {
  const figure = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1 }).format(amount)
  const category = new Intl.PluralRules('ro-RO').select(Number(amount.toFixed(1)))
  return category === 'one' ? `${figure} ${words.one}` : category === 'few' ? `${figure} ${words.few}` : `${figure} de ${words.other}`
}

/** A count in a narrow column: whole under a thousand, then thousands or millions to one decimal („3,6 mii"; „3.6K" in English). */
export function compactCountText(value: number): string {
  if (value < 1000) return countText(value)
  if (getUserLocale() === 'en') return new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  return value < 999_950
    ? romanianScaled(value / 1000, { one: 'mie', few: 'mii', other: 'mii' })
    : romanianScaled(value / 1_000_000, { one: 'milion', few: 'milioane', other: 'milioane' })
}

/** 1.677.596 → „1,68 mil." (Romanian) / „1.68m" (English). */
export function millionsText(value: number): string {
  const millions = new Intl.NumberFormat(localeTag(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 1_000_000)
  return getUserLocale() === 'en' ? `${millions}m` : `${millions} mil.`
}

/** A share as a whole percent; a share under one percent as „<1%". */
export function percentText(share: number): string {
  if (share > 0 && share < 0.01) return '<1%'
  return `${new Intl.NumberFormat(localeTag(), { maximumFractionDigits: 0 }).format(share * 100)}%`
}

/** A one-decimal rate („60,8"). */
export function rateText(value: number): string {
  return new Intl.NumberFormat(localeTag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
}

/** „2026-06-22T15:37:22Z" → „22 iunie 2026". */
export function dayText(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat(localeTag(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(utcDate(year ?? 1970, month ?? 1, day ?? 1))
}

/** „2026-03" → „mar. 2026" (short) / „martie 2026" (long). */
export function monthText(month: string, style: 'short' | 'long' = 'short'): string {
  const [year, value] = month.split('-').map(Number)
  return new Intl.DateTimeFormat(localeTag(), { month: style, year: 'numeric', timeZone: 'UTC' }).format(utcDate(year ?? 1970, value ?? 1, 1))
}
