import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { resolveCompanyByName } from '../api/private-company-api'

/** Below two characters `companyResolve` returns noise, so we don't ask. */
const MIN_QUERY_LENGTH = 2
const SUGGESTION_LIMIT = 8
const DEBOUNCE_MS = 300

/**
 * Name suggestions for the company search autocomplete. The draft (not the
 * committed URL `q`) drives this, debounced, so the dropdown tracks typing
 * without a request per keystroke.
 */
export function useCompanyNameSuggestions(draft: string) {
  const debounced = useDebouncedValue(draft.trim(), DEBOUNCE_MS)
  const enabled = debounced.length >= MIN_QUERY_LENGTH

  return useQuery({
    queryKey: ['company-name-suggestions', debounced],
    queryFn: () => resolveCompanyByName(debounced, SUGGESTION_LIMIT),
    enabled,
    // Keep the previous list on screen while the next one loads — the dropdown
    // must not collapse mid-keystroke.
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  })
}
