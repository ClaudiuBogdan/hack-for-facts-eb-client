/**
 * UAT Finder Interaction Hook
 *
 * Provides state and actions for the UATFinder component.
 * Users search for local governments, select one to view details,
 * and can explore further via action buttons.
 *
 * @example
 * ```tsx
 * function MyUATFinder({ contentId, finderId }: Props) {
 *   const { savedState, isCompleted, saveSelection, saveExploration, reset } = useUATFinderInteraction({
 *     contentId,
 *     finderId,
 *   })
 *
 *   // Restore state on mount
 *   useEffect(() => {
 *     if (savedState?.selectedCui) {
 *       setSelectedCui(savedState.selectedCui)
 *     }
 *   }, [savedState])
 *
 *   // Save state when user selects a UAT
 *   const handleSelect = async (cui: string, name: string) => {
 *     await saveSelection(cui, name)
 *   }
 *
 *   // Save state when user clicks an action button
 *   const handleExplore = async (action: 'view_budget' | 'compare' | 'map') => {
 *     if (selectedCui) {
 *       await saveExploration(selectedCui, action)
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       {isCompleted && <span>Completed!</span>}
 *       <button onClick={reset}>Clear</button>
 *     </div>
 *   )
 * }
 * ```
 */

import { useCallback, useMemo } from 'react'
import { useLearningProgress } from '../use-learning-progress'
import type {
  LearningGuestProgress,
  LearningUATFinderInteractionState,
  LearningUATFinderExploredAction,
} from '../../types'
import { getInteractiveRecord, getJsonValue } from '../../utils/interactive-state'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type UATFinderInteractionContext = {
  /** The saved interaction state, or null if not saved */
  readonly savedState: LearningUATFinderInteractionState | null
  /** Whether the finder has been completed (reached EXPLORED step) */
  readonly isCompleted: boolean
  /** Save the selection of a UAT */
  readonly saveSelection: (cui: string, name: string) => Promise<void>
  /** Save the exploration action (clicking an action button) */
  readonly saveExploration: (cui: string, action: LearningUATFinderExploredAction) => Promise<void>
  /** Reset all saved state */
  readonly reset: () => Promise<void>
}

export type UseUATFinderInteractionInput = {
  /** The content/lesson ID this finder belongs to */
  readonly contentId: string
  /** Unique identifier for this finder component */
  readonly finderId: string
  /** Content version for tracking changes */
  readonly contentVersion?: string
  /** Whether learning integration is enabled */
  readonly enabled?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// State Resolution
// ═══════════════════════════════════════════════════════════════════════════

function resolveUATFinderState(params: {
  readonly progress: LearningGuestProgress
  readonly contentId: string
  readonly finderId: string
}): { readonly savedState: LearningUATFinderInteractionState | null } {
  const record = getInteractiveRecord(
    params.progress.interactiveState,
    {
      id: params.finderId,
      scopePolicy: 'global',
    },
  )
  const value = getJsonValue<Record<string, unknown>>(record)
  if (value) {
    return {
      savedState: {
        kind: 'uat-finder',
        step:
          value.step === 'IDLE' || value.step === 'SELECTED' || value.step === 'EXPLORED' ? value.step : 'IDLE',
        selectedCui:
          typeof value.selectedCui === 'string' ? value.selectedCui : null,
        selectedName:
          typeof value.selectedName === 'string' ? value.selectedName : null,
        exploredAction:
          value.exploredAction === 'view_budget' || value.exploredAction === 'compare' || value.exploredAction === 'map'
            ? value.exploredAction
            : null,
        completedAt: record?.submittedAt ?? undefined,
      },
    }
  }

  return { savedState: null }
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useUATFinderInteraction(
  params: UseUATFinderInteractionInput
): UATFinderInteractionContext {
  const { progress, dispatchInteractionAction } = useLearningProgress()
  const enabled = params.enabled ?? true

  const { savedState } = useMemo(
    () =>
      enabled
        ? resolveUATFinderState({
            progress,
            contentId: params.contentId,
            finderId: params.finderId,
          })
        : { savedState: null },
    [enabled, progress, params.contentId, params.finderId]
  )

  const isCompleted = savedState?.step === 'EXPLORED'

  const saveSelection = useCallback(
    async (cui: string, name: string) => {
      if (!enabled) return
      await dispatchInteractionAction({
        type: 'uatFinder.select',
        contentId: params.contentId,
        interactionId: params.finderId,
        cui,
        name,
        contentVersion: params.contentVersion,
      })
    },
    [enabled, dispatchInteractionAction, params.contentId, params.finderId, params.contentVersion]
  )

  const saveExploration = useCallback(
    async (cui: string, action: LearningUATFinderExploredAction) => {
      if (!enabled) return
      await dispatchInteractionAction({
        type: 'uatFinder.explore',
        contentId: params.contentId,
        interactionId: params.finderId,
        cui,
        action,
        contentVersion: params.contentVersion,
      })
    },
    [enabled, dispatchInteractionAction, params.contentId, params.finderId, params.contentVersion]
  )

  const reset = useCallback(async () => {
    if (!enabled) return
    await dispatchInteractionAction({
      type: 'uatFinder.reset',
      contentId: params.contentId,
      interactionId: params.finderId,
    })
  }, [enabled, dispatchInteractionAction, params.contentId, params.finderId])

  return {
    savedState,
    isCompleted,
    saveSelection,
    saveExploration,
    reset,
  }
}
