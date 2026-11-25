import { useNavigate, useSearch } from '@tanstack/react-router'
import { searchFromState, stateFromSearch, type PageState } from '../lib/map-page-search'

/**
 * The map page's state, read from the address and written back to it
 * (`lib/map-page-search.ts`). A change replaces the history entry and keeps
 * the scroll: picking a map is not a new page.
 */
export function useMapPageState(): readonly [PageState, (change: Partial<PageState>) => void] {
  const search = useSearch({ strict: false }) as Readonly<Record<string, unknown>>
  const state = stateFromSearch(search)
  const navigate = useNavigate()
  const change = (next: Partial<PageState>) =>
    void navigate({
      to: '/map',
      search: (previous: Record<string, unknown>) => ({ ...previous, ...searchFromState({ ...state, ...next }) }),
      replace: true,
      resetScroll: false,
    })
  return [state, change]
}
