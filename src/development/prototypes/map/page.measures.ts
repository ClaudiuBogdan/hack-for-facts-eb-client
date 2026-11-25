import { msg } from '@lingui/core/macro'
import { formatAmount } from '@/features/landing/lib/budget-map-format'
import { MEASURES, measureById, percentileScale, type Measure, type MeasureId } from '@/features/landing/lib/budget-map-measures'
import type { NumberLocale } from '@/features/landing/lib/national-facts'

/**
 * The map page's maps: the landing's three (balance, income, expenses), for a
 * picked year and counted either as totals or per inhabitant.
 *
 * - The balance is a percent of income: the same map on either count.
 * - Per inhabitant, the amounts are whole lei („9.867 lei/loc."), classified at
 *   the same percentiles as the totals, on the edges as printed.
 */

export type Basis = 'total' | 'per_capita'
/** What is coloured: every primărie, or every county (its primării and its county council, summed as reported). */
export type Level = 'uat' | 'county'

/** The years the dev API has execution for (2015 and earlier answer with no values); the last whole year first. */
export const YEARS = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016'] as const
export const DEFAULT_YEAR = '2025'

const TAG: Readonly<Record<NumberLocale, string>> = { ro: 'ro-RO', en: 'en-GB' }
const whole = (value: number, locale: NumberLocale) => new Intl.NumberFormat(TAG[locale], { maximumFractionDigits: 0 }).format(Math.round(value)).replace(/^-/, '−')

/** Whole lei per inhabitant: „9.867 lei/loc.", „−412 lei/loc."; an em dash where there is none. */
export function formatPerCapita(value: number | null, locale: NumberLocale): string {
  return value === null ? '—' : `${whole(value, locale)} ${locale === 'ro' ? 'lei/loc.' : 'lei/inh.'}`
}

/** How the page writes an amount on this count. */
export function amountFormat(basis: Basis): (value: number | null, locale: NumberLocale) => string {
  return basis === 'per_capita' ? formatPerCapita : formatAmount
}

/** What each map is, in one line: the words name whose money it is, the year and the unit. */
function describe(id: MeasureId, year: string, basis: Basis, level: Level) {
  const county = level === 'county'
  if (id === 'balance') return county ? msg`Venituri minus cheltuieli ale primăriilor și consiliului județean, ca procent din venituri` : msg`Venituri minus cheltuieli, ca procent din venituri`
  if (id === 'income') {
    if (basis === 'total') return county ? msg`Tot ce au încasat primăriile și consiliul județean în ${year}, în lei` : msg`Tot ce a încasat primăria în ${year}, în lei`
    return county ? msg`Ce au încasat primăriile și consiliul județean în ${year}, în lei pe locuitor` : msg`Ce a încasat primăria în ${year}, în lei pe locuitor`
  }
  if (basis === 'total') return county ? msg`Tot ce au cheltuit primăriile și consiliul județean în ${year}, în lei` : msg`Tot ce a cheltuit primăria în ${year}, în lei`
  return county ? msg`Ce au cheltuit primăriile și consiliul județean în ${year}, în lei pe locuitor` : msg`Ce a cheltuit primăria în ${year}, în lei pe locuitor`
}

function pageMeasure(id: MeasureId, year: string, basis: Basis, level: Level): Measure {
  const base = measureById(id)
  const description = describe(id, year, basis, level)
  if (id === 'balance' || basis === 'total') return { ...base, description }
  return {
    ...base,
    title: id === 'income' ? msg`Venituri pe locuitor` : msg`Cheltuieli pe locuitor`,
    description,
    format: formatPerCapita,
    tick: whole,
    scale: (values) => percentileScale(values, base.ramp, Math.round),
  }
}

export function pageMeasures(year: string, basis: Basis, level: Level): readonly Measure[] {
  return MEASURES.map((measure) => pageMeasure(measure.id, year, basis, level))
}
