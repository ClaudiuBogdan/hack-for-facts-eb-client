import { t } from '@lingui/core/macro'
import type { CompanyHubYearMeasure } from '@/schemas/private-company-search'
import { formatHubChange, formatHubValue, type HubUnit } from './hub-format'
import type { HubFiscalYear } from './hub-snapshot-types'

/**
 * The hub's „Economia, an de an" in pure functions: which measure a tab
 * draws, the year still being filed, and how a change between two years is
 * said.
 */

export type EconomyMeasure = 'turnover' | 'netResult' | 'employees'

/** The first year ANAF published the statements; before it, the Ministry of Finance did. */
export const ANAF_FIRST_YEAR = 2019

export const ECONOMY_MEASURE: Readonly<Record<CompanyHubYearMeasure, EconomyMeasure>> = {
  'cifra-de-afaceri': 'turnover',
  'rezultat-net': 'netResult',
  salariati: 'employees',
}

export const ECONOMY_UNIT: Readonly<Record<EconomyMeasure, HubUnit>> = { turnover: 'lei', netResult: 'lei', employees: 'persons' }

/** The analysis's name for a measure, so the chart's link opens it. */
export const ECONOMY_METRIC = { turnover: 'TURNOVER', netResult: 'NET_RESULT', employees: 'EMPLOYEES' } as const

export function economyMeasureLabel(measure: EconomyMeasure): string {
  switch (measure) {
    case 'turnover':
      return t`Cifra de afaceri`
    case 'netResult':
      return t`Rezultatul net`
    case 'employees':
      return t`Salariați`
  }
}

/** The last year when it has fewer companies with a statement than the year before: still being filed. */
export function partialYear(years: readonly HubFiscalYear[]): number | null {
  const last = years[years.length - 1]
  const before = years[years.length - 2]
  return last && before && last.filers < before.filers ? last.year : null
}

/**
 * A change between two years: a percent between two positive figures,
 * otherwise — and always for a net result, whose small or negative base
 * would make any percent misleading — the difference in the measure's unit.
 */
export function economyChange(from: number | null, to: number, measure: EconomyMeasure): string | null {
  if (from === null) return null
  const unit = ECONOMY_UNIT[measure]
  if (measure !== 'netResult' && from > 0 && to >= 0) return formatHubChange(from, to)
  const difference = formatHubValue(to - from, unit)
  return `${to - from > 0 ? '+' : ''}${difference.value} ${difference.unit}`
}
