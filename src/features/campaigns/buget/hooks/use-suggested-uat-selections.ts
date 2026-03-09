import { useCallback } from 'react'
import { usePersistedState } from '@/lib/hooks/usePersistedState'

const SUGGESTED_UAT_SELECTIONS_STORAGE_KEY =
  'campaign-suggested-uat-selections'
const MAX_SUGGESTED_UAT_SELECTIONS = 10

type SuggestedUatSelectionsHook = {
  readonly selectedSuggestionCuis: readonly string[]
  readonly rememberSelectedSuggestion: (entityCui: string) => void
}

export function useSuggestedUatSelections(): SuggestedUatSelectionsHook {
  const [selectedSuggestionCuis, setSelectedSuggestionCuis] =
    usePersistedState<string[]>(
      SUGGESTED_UAT_SELECTIONS_STORAGE_KEY,
      [],
    )

  const rememberSelectedSuggestion = useCallback(
    (entityCui: string) => {
      const normalizedEntityCui = entityCui.trim()

      if (!normalizedEntityCui) {
        return
      }

      setSelectedSuggestionCuis((previousSelectionCuis) => [
        normalizedEntityCui,
        ...previousSelectionCuis.filter(
          (previousEntityCui) => previousEntityCui !== normalizedEntityCui,
        ),
      ].slice(0, MAX_SUGGESTED_UAT_SELECTIONS))
    },
    [setSelectedSuggestionCuis],
  )

  return {
    selectedSuggestionCuis,
    rememberSelectedSuggestion,
  }
}
