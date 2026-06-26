import type {
  IndicatorNumberRow,
  IndicatorValueRow,
} from '@/schemas/public-enterprise'
import { getUserLocale } from '@/lib/utils'

/**
 * Public enterprise indicators are ratios/KPIs, never currency. Values are
 * rendered exactly as recorded — 0.0425 with measureUnit `%` stays `0,0425 %`,
 * it is never scaled to `4,25 %`. No percent/1e6/1000 transforms here.
 */

const FALLBACK_DISPLAY = '—'

function resolveLocale(locale?: string): string {
  if (locale && locale.trim().length > 0) {
    return locale === 'ro' ? 'ro-RO' : 'en-US'
  }
  const userLocale = getUserLocale()
  return userLocale === 'ro' ? 'ro-RO' : 'en-US'
}

function formatBooleanValue(value: boolean, locale?: string): string {
  const booleanLocale = resolveLocale(locale)
  if (booleanLocale === 'ro-RO') {
    return value ? 'Da' : 'Nu'
  }
  return value ? 'Yes' : 'No'
}

/**
 * Formats a numeric KPI value using Intl.NumberFormat. No unit-based scaling.
 * The measure unit is appended separately by the caller (or via formatKpiValue).
 */
export function formatPublicEnterpriseNumber(
  value: number | null | undefined,
  locale?: string,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return FALLBACK_DISPLAY
  }
  const numberLocale = resolveLocale(locale)
  const fractionDigits = Number.isInteger(value) ? 0 : 4
  return new Intl.NumberFormat(numberLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

export type KpiFormatResult = {
  readonly display: string
  readonly kindLabel: string
  readonly valueKind: IndicatorValueRow['valueKind']
}

const KIND_LABELS: Record<IndicatorValueRow['valueKind'], string> = {
  number: 'number',
  boolean: 'boolean',
  text: 'text',
  empty: 'empty',
}

/**
 * Formats an indicator row into a display string plus a kind label. Handles all
 * four value kinds (number/boolean/text/empty) without any numeric transform.
 */
export function formatKpiValue(
  row: IndicatorValueRow,
  locale?: string,
): KpiFormatResult {
  switch (row.valueKind) {
    case 'number': {
      const numberRow = row as IndicatorNumberRow
      const formatted = formatPublicEnterpriseNumber(
        numberRow.numericValue,
        locale,
      )
      const withUnit =
        numberRow.measureUnit && numberRow.measureUnit.length > 0
          ? `${formatted} ${numberRow.measureUnit}`
          : formatted
      return {
        display: withUnit,
        kindLabel: KIND_LABELS.number,
        valueKind: 'number',
      }
    }
    case 'boolean': {
      return {
        display: formatBooleanValue(row.booleanValue, locale),
        kindLabel: KIND_LABELS.boolean,
        valueKind: 'boolean',
      }
    }
    case 'text': {
      return {
        display: row.rawValue ?? FALLBACK_DISPLAY,
        kindLabel: KIND_LABELS.text,
        valueKind: 'text',
      }
    }
    case 'empty': {
      return {
        display: FALLBACK_DISPLAY,
        kindLabel: KIND_LABELS.empty,
        valueKind: 'empty',
      }
    }
    default: {
      const exhaustive: never = row
      void exhaustive
      return {
        display: FALLBACK_DISPLAY,
        kindLabel: KIND_LABELS.empty,
        valueKind: 'empty',
      }
    }
  }
}

/**
 * A row is chartable only when it carries a finite numeric value. Non-numeric
 * rows (boolean/text/empty) are table-only; missing years stay null gaps.
 */
export function isIndicatorRowChartable(row: IndicatorValueRow): boolean {
  if (row.valueKind !== 'number') {
    return false
  }
  const numberRow = row as IndicatorNumberRow
  return Number.isFinite(numberRow.numericValue)
}

export type NumericRowChartPoint = {
  readonly year: string
  readonly value: number
  readonly measureUnit: string | null
  readonly kpiCode: string | null
}

/**
 * Collects chartable numeric points for a single indicator/KPI across years,
 * sorted ascending by year. Missing years are simply absent (gaps), not filled.
 */
export function collectNumericChartPoints(
  rows: readonly IndicatorValueRow[],
  indicator: string,
): readonly NumericRowChartPoint[] {
  return rows
    .filter(
      (row): row is IndicatorNumberRow =>
        row.indicator === indicator && isIndicatorRowChartable(row),
    )
    .map((row) => ({
      year: row.year,
      value: row.numericValue,
      measureUnit: row.measureUnit,
      kpiCode: row.kpiCode,
    }))
    .sort((a, b) => a.year.localeCompare(b.year))
}

export type NumericRowsByUnit = {
  readonly measureUnit: string | null
  readonly rows: readonly IndicatorNumberRow[]
}

/**
 * Groups chartable numeric rows by their measure unit, so a chart can render
 * one axis per unit without mixing incompatible KPI scales.
 */
export function groupNumericRowsByUnit(
  rows: readonly IndicatorValueRow[],
): readonly NumericRowsByUnit[] {
  const buckets = new Map<string, IndicatorNumberRow[]>()
  for (const row of rows) {
    if (!isIndicatorRowChartable(row)) {
      continue
    }
    const numberRow = row as IndicatorNumberRow
    const key = numberRow.measureUnit ?? ''
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.push(numberRow)
    } else {
      buckets.set(key, [numberRow])
    }
  }
  return Array.from(buckets.entries())
    .map(([unitKey, bucketRows]) => ({
      measureUnit: unitKey.length > 0 ? unitKey : null,
      rows: bucketRows,
    }))
    .sort((a, b) => {
      const aUnit = a.measureUnit ?? ''
      const bUnit = b.measureUnit ?? ''
      return aUnit.localeCompare(bUnit)
    })
}
