import type { InsPeriodicity } from '@/schemas/ins'
import type { StatisticsDatasetDetailSearch, StatisticsLatestValue } from '@/schemas/statistics'
import { activeNumberLocale, groupWireValue } from './format'
import { figureUnitWord } from './units'
import { parseWireDecimal } from './value-status'

/**
 * What the detail page can already show while its series reads: the figure
 * the first read resolved. The loading state is built around it, so the band
 * fills in where it stands instead of swapping one grey block for a different
 * layout. Not the years: neither the catalog's span nor a pinned window is
 * the axis the loaded chart draws, which the observed rows decide.
 */

export interface KnownLatestFigure {
  /** The published value, grouped in the reader's locale, not one digit changed. */
  readonly value: string
  readonly unit: string
  readonly period: string | null
}

/**
 * The latest value the first read resolved, when it is exactly the figure the
 * band will show once the series lands: the same cell (the scope derives from
 * that read), at the cadence the band shows, a value the summary can read, no
 * INS flag the loading state would drop, and no year window — a pinned window
 * shows its own last year, not the series'. Anything less, and the loading
 * state shows a placeholder rather than a figure that changes on arrival.
 */
export function knownLatestFigure(params: {
  readonly latest: StatisticsLatestValue | null
  readonly canDerive: boolean
  /** The cadence the band shows: the scope's, resolved. */
  readonly periodicity: InsPeriodicity | null
  readonly search: Pick<StatisticsDatasetDetailSearch, 'din' | 'pana'>
}): KnownLatestFigure | null {
  const { latest, canDerive, periodicity, search } = params
  if (!canDerive || !latest || !latest.hasData || latest.value === null) return null
  if (latest.matchStrategy === 'AMBIGUOUS_GEOGRAPHY') return null
  if (periodicity === null || latest.resolvedPeriodicity !== periodicity) return null
  if (parseWireDecimal(latest.value) === null || latest.valueStatus) return null
  // A unit the first read cannot name, the loaded page names from the rows
  // or the unit axis — a word the loading state would not have.
  if (!latest.unitNameRo?.trim() && !latest.unitSymbol?.trim()) return null
  if (search.din !== undefined || search.pana !== undefined) return null
  return {
    value: groupWireValue(latest.value, activeNumberLocale()),
    unit: figureUnitWord(latest, latest.unitNameRo ?? latest.unitSymbol),
    period: latest.period,
  }
}
