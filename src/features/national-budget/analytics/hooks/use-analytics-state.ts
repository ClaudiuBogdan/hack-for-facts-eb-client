import { useCallback, useMemo } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { nextSearch, parseAdvanced, type AdvancedState } from '@/features/national-budget/analytics/lib/analytics-state'

/**
 * The analysis page's state, read from its address and written back to it:
 * each change a step in the history, so the browser's Back returns to the view
 * before. The parse is memoized on the address, so a render that changes
 * nothing doesn't read as a new view (the page defers its bands on one).
 */
export function useAnalyticsState(): { readonly state: AdvancedState; readonly set: (patch: Partial<AdvancedState>) => void } {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const set = useCallback(
    (patch: Partial<AdvancedState>) => {
      void navigate({ to: '.', search: (previous: Record<string, unknown>) => nextSearch(previous, patch), resetScroll: false })
    },
    [navigate],
  )
  const state = useMemo(() => parseAdvanced(search), [search])
  return { state, set }
}
