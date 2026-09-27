import { plural, t } from '@lingui/core/macro'
import { formatHubMonth, formatHubNumber, formatHubValue, hubNumberLocale } from '@/features/private-companies/lib/hub-format'
import type { HomeGrain } from './home-model'

/**
 * Numbers on the front door follow the page's language, as the `/ins` and
 * `/companies` hubs' do: separators from the locale, money on one scale per
 * magnitude and never past billions, a figure and its unit joined by a
 * no-break space.
 */

const NBSP = '\u00a0'

/** „18,0 mld. lei", „93,9 mil. lei", „8.948 lei". */
export function moneyText(value: number): string {
  const formatted = formatHubValue(value, 'lei')
  return `${formatted.value}${NBSP}${formatted.unit}`
}

/** The figure alone, for a label on a chart whose unit is said once: „18,0 mld.". */
export function moneyFigure(value: number): string {
  return formatHubValue(value, 'lei').value
}

export function countText(value: number): string {
  return formatHubNumber(value)
}

/** One decimal by default: „36,7%". */
export function percentText(fraction: number, digits = 1): string {
  return `${formatHubNumber(fraction * 100, { digits })}%`
}

/** A count past a million as „2,01 mil.", the whole figure below it. */
export function bigCountText(value: number): string {
  return value >= 1_000_000 ? `${formatHubNumber(value / 1_000_000, { digits: 2 })}${NBSP}${t`mil.`}` : formatHubNumber(value)
}

/** `2026-05` → „mai 2026", in the page's language. */
export function monthText(month: string): string {
  return formatHubMonth(month)
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>()

/** `2026-05-28` → „28 mai", in the page's language; an unreadable date as written. */
export function dayText(date: string): string {
  const locale = hubNumberLocale()
  let formatter = dayFormatters.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
    dayFormatters.set(locale, formatter)
  }
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? date : formatter.format(parsed)
}

// ─────────────────────────────────────────── counts with their nouns ──
// Romanian writes „de" before a count ending in 20–99 or 00 and not before
// one ending in 01–19; the plural categories carry exactly that rule.

export function contractsCount(value: number): string {
  return plural(value, { one: '# contract', few: '# contracte', other: '# de contracte' })
}

export function directPurchasesCount(value: number): string {
  return plural(value, { one: '# achiziție directă', few: '# achiziții directe', other: '# de achiziții directe' })
}

export function purchasesCount(value: number): string {
  return plural(value, { one: '# achiziție', few: '# achiziții', other: '# de achiziții' })
}

export function firmsCount(value: number): string {
  return plural(value, { one: '# firmă', few: '# firme', other: '# de firme' })
}

export function institutionsCount(value: number): string {
  return plural(value, { one: '# instituție', few: '# instituții', other: '# de instituții' })
}

/** Past a million the figure is shortened („2,01 mil. de achiziții directe"), and a million always takes „de". */
export function directPurchasesBig(value: number): string {
  if (value < 1_000_000) return directPurchasesCount(value)
  const figure = bigCountText(value)
  return t`${figure} de achiziții directe`
}

/** A population's records, counted: contracts or direct purchases. */
export function unitCount(grain: HomeGrain, value: number): string {
  return grain === 'contract' ? contractsCount(value) : directPurchasesCount(value)
}
