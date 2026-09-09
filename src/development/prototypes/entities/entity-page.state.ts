/**
 * URL state for the prototype. The real route owns `view`, `year`,
 * `normalization` and the grouping keys in its search schema
 * (`docs/user-stories/entity-details.md` §URL State); here they are read
 * loosely from the harness URL so every state is a shareable deep link.
 */
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'
import {
  ENTITY_PAGE_VIEWS,
  type EntityPageState,
  type EntityPageStateChange,
  type EntityPageView,
} from './entity-page.types'

const DEFAULT_STATE: EntityPageState = {
  view: 'main-info',
  year: 2025,
  normalization: 'total',
  grouping: 'fn',
}

function isView(value: unknown): value is EntityPageView {
  return typeof value === 'string' && (ENTITY_PAGE_VIEWS as readonly string[]).includes(value)
}

export function useEntityPageState(): {
  readonly state: EntityPageState
  readonly onStateChange: EntityPageStateChange
} {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()

  const yearRaw = Number(search.year)
  const state: EntityPageState = {
    view: isView(search.view) ? search.view : DEFAULT_STATE.view,
    year: Number.isInteger(yearRaw) && yearRaw > 2000 ? yearRaw : DEFAULT_STATE.year,
    normalization: search.normalization === 'per_capita' ? 'per_capita' : DEFAULT_STATE.normalization,
    grouping: search.grouping === 'ec' ? 'ec' : DEFAULT_STATE.grouping,
  }

  const onStateChange = useCallback<EntityPageStateChange>(
    (patch) => {
      void navigate({
        to: '.',
        search: (previous: Record<string, unknown>) => {
          const next: Record<string, unknown> = { ...previous }
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === DEFAULT_STATE[key as keyof EntityPageState]) {
              delete next[key]
            } else {
              next[key] = value
            }
          }
          return next
        },
        replace: true,
        resetScroll: false,
      })
    },
    [navigate],
  )

  return { state, onStateChange }
}
