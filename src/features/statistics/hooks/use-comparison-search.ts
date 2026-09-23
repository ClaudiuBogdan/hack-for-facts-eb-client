import { useCallback } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { COMPARISON_EXAMPLE_PRESET } from '../lib/comparison-presets'
import type { ComparisonSearchPatch } from '../lib/comparison-search-edits'

/**
 * The comparison's address: what the URL holds, whether the page is showing
 * its worked example in place of an empty one, and the two ways it is
 * written — a patch merged over the current search, or a reset to nothing.
 * The edits themselves are pure (`editComparisonSearch`); this owns the
 * router alone.
 */
export function useComparisonSearch() {
  const search = useSearch({ from: '/ins/comparatii/' })
  const navigate = useNavigate({ from: '/ins/comparatii/' })
  const exampleMode = Object.values(search).every((value) => value === undefined)
  const effectiveSearch = exampleMode ? COMPARISON_EXAMPLE_PRESET.search : search

  const apply = useCallback(
    (edited: ComparisonSearchPatch | null) => {
      if (!edited) return
      void navigate({
        search: (previous) => ({ ...previous, ...edited.patch }),
        replace: edited.replace,
      })
    },
    [navigate],
  )
  const reset = useCallback(() => void navigate({ search: {}, replace: false }), [navigate])

  return { search, exampleMode, effectiveSearch, apply, reset }
}
