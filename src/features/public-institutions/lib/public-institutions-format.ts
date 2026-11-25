import type { Currency } from '@/schemas/charts'
import type { EntityAnalyticsDataPoint } from '@/schemas/entity-analytics'

/**
 * How the page writes its numbers: an amount as its digits and its scale
 * apart („991,06” · „mld. RON”), below a hundred thousand in full („1.033
 * RON”); a change with its sign; a county as a name. Pure: the formatters
 * are passed in, so the tests need no locale setup.
 */

export type AmountParts = { readonly digits: string; readonly scale: string | null; readonly exact: string }

/** The site's compact currency form split at the scale; a form that does not start with its digits („RON 259.69B”) stays whole. */
export function amountParts(
  value: number,
  { currency, locale, format }: { readonly currency: Currency; readonly locale: string; readonly format: (value: number, notation: 'standard' | 'compact', currency: Currency) => string },
): AmountParts {
  const exact = format(value, 'standard', currency)
  if (Math.abs(value) < 100_000) {
    const digits = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'ro-RO', { maximumFractionDigits: 0 }).format(value)
    return { digits, scale: currency, exact }
  }
  const compact = format(value, 'compact', currency)
  const split = /^([-\u2212]?[\d.,\u00a0\u202f]*\d)[\s\u00a0\u202f]+(.+)$/.exec(compact)
  return split ? { digits: split[1], scale: split[2], exact } : { digits: compact, scale: null, exact }
}

/** A share or a change as a percentage; a change keeps its sign („+12,9 %”). */
export function percentText(value: number, locale: string, signed = false): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'ro-RO', {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value)
}

/** „MUNICIPIUL BUCUREȘTI” as „Municipiul București”: a county is read as a name, not as a code. */
export function placeName(value: string, locale: string): string {
  const lang = locale === 'en' ? 'en' : 'ro'
  return value.toLocaleLowerCase(lang).replace(/(^|[\s-])(\p{L})/gu, (_, before: string, letter: string) => `${before}${letter.toLocaleUpperCase(lang)}`)
}

function csvCell(value: string | number | null | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/** The whole list as a file, in the list's order; the population method once, on the first row, as the old export wrote it. */
export function rankingCsv(rows: readonly EntityAnalyticsDataPoint[], populationMethod: string): string {
  const header = ['entity_cui', 'entity_name', 'entity_type', 'county_code', 'county_name', 'population', 'total_amount', 'per_capita_amount', 'population_methodology']
  const lines = rows.map((row, index) =>
    [row.entity_cui, row.entity_name, row.entity_type, row.county_code, row.county_name, row.population, row.total_amount, row.per_capita_amount, index === 0 ? populationMethod : ''].map(csvCell).join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

/** A whole export is one row per institution: a list that changed while it was read, or repeated a row, is refused. */
export function isCompleteExport(rows: readonly EntityAnalyticsDataPoint[], total: number): boolean {
  return rows.length === total && new Set(rows.map((row) => row.entity_cui)).size === total
}
