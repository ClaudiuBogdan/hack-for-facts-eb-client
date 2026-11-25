import { measureFromSearch, searchForMeasure, type MeasureId } from '@/features/landing/lib/budget-map-measures'
import { DEFAULT_YEAR, YEARS, type Basis, type Level } from './map-page-measures'

/**
 * What the map page shows, kept in the address so a link reopens it:
 * `?harta=venituri|cheltuieli` (the landing's own values), `?an=2023`,
 * `?pe=locuitor`, `?nivel=judete`, `?vedere=tabel`. The default view has no
 * parameters. Pure: the route reads and writes the address through these.
 *
 * Links to the page that came before (`?filters=…&mapViewType=…`, still sent
 * by other pages and found in old shares) open with what this page can show —
 * the map, the year, the count, the level, the view — and the rest is dropped
 * without a word (owner, 25 November 2026). A key the page does not know, or a
 * value it cannot read, is the default: a stale link never errors.
 */

export type View = 'map' | 'table'

export interface PageState {
  readonly measureId: MeasureId
  readonly year: string
  readonly basis: Basis
  readonly level: Level
  readonly view: View
}

export const DEFAULT_STATE: PageState = { measureId: 'balance', year: DEFAULT_YEAR, basis: 'total', level: 'uat', view: 'map' }

/** The previous page's keys: read once from an old link, dropped from the address at the first change. */
export const LEGACY_KEYS = ['filters', 'preset', 'activeView', 'mapViewType', 'mapCenter', 'mapZoom', 'entity_cuis'] as const

type Search = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null && !Array.isArray(value)

const isYear = (value: unknown): value is string => (YEARS as readonly string[]).includes(String(value))

/** The single year an old `report_period` names, if it names exactly one this page has. */
function legacyYear(period: unknown): string | undefined {
  if (!isRecord(period) || !isRecord(period.selection)) return undefined
  const { interval, dates } = period.selection
  if (isRecord(interval) && interval.start !== undefined && String(interval.start) === String(interval.end) && isYear(interval.start)) return String(interval.start)
  if (Array.isArray(dates) && dates.length === 1 && isYear(dates[0])) return String(dates[0])
  return undefined
}

/** What an old link asks for that this page can show; nothing else. */
export function legacyState(search: Search): Partial<PageState> {
  const filters = isRecord(search.filters) ? search.filters : {}
  const preset = search.preset
  const measureId: MeasureId | undefined =
    preset === 'income' || preset === 'expenses' || preset === 'balance'
      ? preset
      : preset === undefined && filters.account_category === 'vn'
        ? 'income'
        : preset === undefined && filters.account_category === 'ch'
          ? 'expenses'
          : undefined
  const normalization = filters.normalization
  return {
    measureId,
    year: legacyYear(filters.report_period),
    basis: normalization === 'per_capita' || normalization === 'per_capita_euro' ? 'per_capita' : undefined,
    level: search.mapViewType === 'County' ? 'county' : undefined,
    view: search.activeView === 'table' ? 'table' : undefined,
  }
}

/** The page's state from the address: its own keys first, then what an old link asks for, then the default. */
export function stateFromSearch(search: Search): PageState {
  const legacy = legacyState(search)
  const year = search.an === undefined ? undefined : String(search.an)
  return {
    measureId: measureFromSearch(search.harta) ?? (search.harta === undefined ? legacy.measureId : undefined) ?? DEFAULT_STATE.measureId,
    year: (year !== undefined && isYear(year) ? year : undefined) ?? (search.an === undefined ? legacy.year : undefined) ?? DEFAULT_STATE.year,
    basis: search.pe === 'locuitor' ? 'per_capita' : search.pe === undefined ? (legacy.basis ?? DEFAULT_STATE.basis) : DEFAULT_STATE.basis,
    level: search.nivel === 'judete' ? 'county' : search.nivel === undefined ? (legacy.level ?? DEFAULT_STATE.level) : DEFAULT_STATE.level,
    view: search.vedere === 'tabel' ? 'table' : search.vedere === undefined ? (legacy.view ?? DEFAULT_STATE.view) : DEFAULT_STATE.view,
  }
}

/**
 * The address for a state: only what differs from the default, and every old
 * key cleared — the router keeps a key it is not told to drop, and an old
 * `filters` left in place would decide the map again on the next read.
 */
export function searchFromState(state: PageState): Record<string, unknown> {
  const search: Record<string, unknown> = {
    harta: searchForMeasure(state.measureId),
    // A bare number in the address (`an=2023`): the router would quote a numeric string.
    an: state.year === DEFAULT_YEAR ? undefined : Number(state.year),
    pe: state.basis === 'per_capita' ? 'locuitor' : undefined,
    nivel: state.level === 'county' ? 'judete' : undefined,
    vedere: state.view === 'table' ? 'tabel' : undefined,
  }
  for (const key of LEGACY_KEYS) search[key] = undefined
  return search
}
