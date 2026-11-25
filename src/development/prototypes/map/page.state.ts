import { useNavigate, useSearch } from '@tanstack/react-router'
import { measureFromSearch, searchForMeasure, type MeasureId } from '@/features/landing/lib/budget-map-measures'
import { DEFAULT_YEAR, YEARS, type Basis, type Level } from './page.measures'

/**
 * What the map page shows, kept in the address so a link reopens it:
 * `?harta=venituri|cheltuieli` (the landing's own values), `?an=2023`,
 * `?pe=locuitor`, `?nivel=judete`, `?vedere=tabel`. The default view has no
 * parameters.
 */

export type View = 'map' | 'table'

export interface PageState {
  readonly measureId: MeasureId
  readonly year: string
  readonly basis: Basis
  readonly level: Level
  readonly view: View
}

interface PageSearch {
  readonly harta?: unknown
  readonly an?: unknown
  readonly pe?: unknown
  readonly nivel?: unknown
  readonly vedere?: unknown
}

/** Anything the address says that the page does not know is the default: a stale link never errors. */
export function stateFromSearch(search: PageSearch): PageState {
  const year = String(search.an ?? '')
  return {
    measureId: measureFromSearch(search.harta) ?? 'balance',
    year: (YEARS as readonly string[]).includes(year) ? year : DEFAULT_YEAR,
    basis: search.pe === 'locuitor' ? 'per_capita' : 'total',
    level: search.nivel === 'judete' ? 'county' : 'uat',
    view: search.vedere === 'tabel' ? 'table' : 'map',
  }
}

function searchFromState(state: PageState) {
  return {
    harta: searchForMeasure(state.measureId),
    // The router reads a bare number back as a number; the page compares strings either way.
    an: state.year === DEFAULT_YEAR ? undefined : Number(state.year),
    pe: state.basis === 'per_capita' ? 'locuitor' : undefined,
    nivel: state.level === 'county' ? 'judete' : undefined,
    vedere: state.view === 'table' ? 'tabel' : undefined,
  }
}

export function usePageState(): readonly [PageState, (change: Partial<PageState>) => void] {
  const state = stateFromSearch(useSearch({ strict: false }) as PageSearch)
  const navigate = useNavigate()
  const change = (next: Partial<PageState>) =>
    void navigate({ to: '.', search: (previous: Record<string, unknown>) => ({ ...previous, ...searchFromState({ ...state, ...next }) }), replace: true, resetScroll: false })
  return [state, change]
}
