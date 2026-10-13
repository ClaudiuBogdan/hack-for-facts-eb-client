import { t } from '@lingui/core/macro'
import { compactDecimal, formatDecimal, percentOf, roundDecimal, type DecimalLocale } from '@/lib/exact-decimal'
import type { CompanyAnalysisUnit } from '@/schemas/company-analytics'

/**
 * The analysis page's numbers, from the API's decimal strings: lei with
 * their bani, headcounts and counts whole, every digit kept. A figure on a
 * scale („1,2 mld. lei") always has its exact value beside it.
 */

const NBSP = ' '

export function localeOf(locale: string): DecimalLocale {
  return locale === 'en' ? 'en' : 'ro'
}

/** A count as the API sends it, grouped: „13.702.812". */
export function countText(count: string, locale: DecimalLocale): string {
  return formatDecimal(count, locale, 0)
}

function unitWord(unit: CompanyAnalysisUnit): string {
  return unit === 'RON' ? t`lei` : t`salariați`
}

/** The exact value with its unit: „1.234.567,89 lei", „12.345 salariați". */
export function exactValueText(value: string, unit: CompanyAnalysisUnit, locale: DecimalLocale): string {
  return `${formatDecimal(value, locale, unit === 'RON' ? 2 : 0)}${NBSP}${unitWord(unit)}`
}

/** The value on one scale for a band or a cell: „1,2 mld. lei", „4,5 mil. lei", „12.345 salariați". */
export function compactValue(value: string, unit: CompanyAnalysisUnit, locale: DecimalLocale): { readonly value: string; readonly unit: string } {
  if (unit === 'HEADCOUNT') return { value: formatDecimal(value, locale, 0), unit: unitWord(unit) }
  const compact = compactDecimal(value, locale)
  const scale = compact.scale === 'billion' ? t`mld. lei` : compact.scale === 'million' ? t`mil. lei` : t`lei`
  return { value: compact.value, unit: scale }
}

/**
 * A headcount mean as the API sends it, to two decimals without trailing
 * zeros: an average over companies is rarely whole, and „0,43" is not none.
 */
function headcountMean(value: string): string {
  const rounded = roundDecimal(value, 2) ?? value
  return rounded.includes('.') ? rounded.replace(/\.?0+$/u, '') : rounded
}

/** A mean per company on one scale: lei as any amount, a headcount with its fraction („0,43 salariați"). */
export function meanValue(value: string, unit: CompanyAnalysisUnit, locale: DecimalLocale): { readonly value: string; readonly unit: string } {
  if (unit !== 'HEADCOUNT') return compactValue(value, unit, locale)
  return { value: formatDecimal(headcountMean(value), locale), unit: unitWord(unit) }
}

/** A mean per company, exact: lei with their bani, a headcount with its fraction. */
export function exactMeanText(value: string, unit: CompanyAnalysisUnit, locale: DecimalLocale): string {
  if (unit !== 'HEADCOUNT') return exactValueText(value, unit, locale)
  return `${formatDecimal(headcountMean(value), locale)}${NBSP}${unitWord(unit)}`
}

export function compactValueText(value: string, unit: CompanyAnalysisUnit, locale: DecimalLocale): string {
  const compact = compactValue(value, unit, locale)
  return `${compact.value}${NBSP}${compact.unit}`
}

/** A share as a percent with one decimal („12,3%"); null for a share of nothing. */
export function shareText(part: string, whole: string, locale: DecimalLocale): string | null {
  const percent = percentOf(part, whole, 1)
  return percent === null ? null : `${formatDecimal(percent, locale, 1)}%`
}

/** A value for a file a reader downloads: the API's digits, untouched. */
export function exportValue(value: string | null): string {
  return value ?? ''
}
