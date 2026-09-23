import type { StatisticsHubIndicator, StatisticsHubSeriesPoint } from '@/schemas/statistics'

/** The hub's own arithmetic over its indicators: the facts band's inflation and natural decrease, and the link into a series. */

/**
 * The detail-page search that lands on exactly this national cell. A matrix
 * without a geography axis is national already; a territory in its link would
 * only be a filter the page has no axis to show.
 */
export function indicatorDetailSearch(indicator: StatisticsHubIndicator) {
  return {
    ...(indicator.hasGeography ? { teritoriu: 'cod:RO' } : {}),
    ...(indicator.pins.length > 0 ? { clasificari: indicator.pins } : {}),
    ...(indicator.unitCode ? { unitate: indicator.unitCode } : {}),
    ...(indicator.periodicity === 'ANNUAL' || indicator.periodicity === 'QUARTERLY' || indicator.periodicity === 'MONTHLY'
      ? { frecventa: indicator.periodicity }
      : {}),
  }
}

/**
 * The annual inflation rate from a consumer price index against the same
 * month a year earlier (=100): the index less 100, which is how INS states
 * the rate. Rounded to the index's own precision, so 110.85 reads 10,85 and
 * not 10,849999….
 */
export function annualInflationRate(index: number, decimals: number): number {
  const scale = 10 ** decimals
  return Math.round((index - 100) * scale) / scale
}

/**
 * The first year of the unbroken run of years, ending at the latest year both
 * series have, in which deaths outnumbered births. Null when that latest year
 * does not have more deaths than births. A year either series lacks — or
 * both do — ends the run: a gap is not evidence either way.
 */
export function deathsExceedBirthsSince(
  births: readonly StatisticsHubSeriesPoint[],
  deaths: readonly StatisticsHubSeriesPoint[],
): string | null {
  const aligned = alignSeriesByPeriod(births, deaths)
  let last = aligned.periods.length - 1
  while (last >= 0 && (aligned.a[last] === null || aligned.b[last] === null)) last -= 1
  let first: number | null = null
  for (let index = last; index >= 0; index -= 1) {
    const born = aligned.a[index]
    const died = aligned.b[index]
    if (born === null || died === null || died <= born) break
    // The union of both series' periods skips a year neither has.
    if (first !== null && Number(aligned.periods[index]) !== Number(aligned.periods[first]) - 1) break
    first = index
  }
  return first === null ? null : (aligned.periods[first] ?? null)
}

/**
 * Two series on one period axis. Each point is placed at its period's
 * position in the union of both series' periods, so a year one series has
 * and the other lacks is a gap, not a shift.
 */
export function alignSeriesByPeriod(
  a: readonly StatisticsHubSeriesPoint[],
  b: readonly StatisticsHubSeriesPoint[],
): {
  readonly periods: readonly string[]
  readonly a: readonly (number | null)[]
  readonly b: readonly (number | null)[]
} {
  const periods = [...new Set([...a, ...b].map((point) => point.period))].sort()
  const index = new Map(periods.map((period, position) => [period, position]))
  const place = (series: readonly StatisticsHubSeriesPoint[]) => {
    const values: (number | null)[] = periods.map(() => null)
    for (const point of series) {
      const position = index.get(point.period)
      if (position !== undefined) values[position] = point.value
    }
    return values
  }
  return { periods, a: place(a), b: place(b) }
}
