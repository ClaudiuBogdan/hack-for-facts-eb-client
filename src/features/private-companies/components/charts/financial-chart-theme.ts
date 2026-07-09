/**
 * Colors, bar styling and value formatters for the company financial overview
 * chart. Pure — no React, no i18n — so the sign-dependent styling and the
 * tooltip/axis formatters can be unit-tested directly.
 */
import { formatNumber } from '@/lib/utils'
import { formatEmployeesDisplay, formatRonAmount } from '../../lib/formatting'

export const SERIES_COLORS = {
  turnover: 'var(--pnrr-blue)',
  netResultPositive: '#16a34a',
  netResultNegative: '#ef4444',
  employees: '#f59e0b',
} as const

export const SERIES_STROKES = {
  turnover: '#1d4ed8',
  netResultPositive: '#15803d',
  netResultNegative: '#dc2626',
  netResultMuted: '#737373',
  employees: '#d97706',
} as const

export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0]

export const TOOLTIP_SERIES_ORDER = ['turnover', 'netResult', 'employees'] as const

export type SeriesKey = (typeof TOOLTIP_SERIES_ORDER)[number]

export type NetResultBarStyle = {
  readonly fill: string
  readonly fillOpacity: number
  readonly stroke: string
}

/** Profit is green, loss is red, missing is a muted ghost bar. */
export function getNetResultBarStyle(netResult: number | null): NetResultBarStyle {
  if (netResult === null || !Number.isFinite(netResult)) {
    return {
      fill: 'var(--pnrr-muted)',
      fillOpacity: 0.2,
      stroke: SERIES_STROKES.netResultMuted,
    }
  }
  if (netResult >= 0) {
    return {
      fill: SERIES_COLORS.netResultPositive,
      fillOpacity: 0.72,
      stroke: SERIES_STROKES.netResultPositive,
    }
  }
  return {
    fill: SERIES_COLORS.netResultNegative,
    fillOpacity: 0.72,
    stroke: SERIES_STROKES.netResultNegative,
  }
}

export function getNetResultSwatchColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'var(--pnrr-muted)'
  }
  return value >= 0 ? SERIES_COLORS.netResultPositive : SERIES_COLORS.netResultNegative
}

export function getSeriesSwatchColor(dataKey: SeriesKey, value: number): string {
  if (dataKey === 'netResult') return getNetResultSwatchColor(value)
  if (dataKey === 'turnover') return SERIES_COLORS.turnover
  return SERIES_COLORS.employees
}

/** A negative net result reads as `−1.234 lei`, with a true minus sign. */
export function formatTooltipValue(dataKey: SeriesKey, value: number): string {
  if (dataKey === 'employees') {
    return formatEmployeesDisplay(value)
  }
  if (dataKey === 'netResult' && value < 0) {
    return `−${formatRonAmount(-value)}`
  }
  return formatRonAmount(value)
}

export function formatRonAxis(value: number): string {
  return `${formatNumber(value, 'compact')} lei`
}

export function formatEmployeesAxis(value: number): string {
  return formatNumber(value, 'compact')
}
