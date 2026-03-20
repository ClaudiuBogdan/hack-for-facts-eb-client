/**
 * Budget Cycle Interaction Hook
 *
 * Provides state and actions for the BudgetCycleTimeline and PhaseCards components.
 * Users explore the 6 phases of the Romanian budget cycle, with progress tracked
 * as they expand each phase card.
 *
 * @example
 * ```tsx
 * function MyPhaseCards({ contentId }: Props) {
 *   const {
 *     exploredPhases,
 *     isPhaseExplored,
 *     explorationProgress,
 *     isComplete,
 *     explorePhase,
 *     reset,
 *   } = useBudgetCycleInteraction({ contentId })
 *
 *   const handlePhaseExpand = async (phaseId: BudgetPhaseId) => {
 *     await explorePhase(phaseId)
 *   }
 *
 *   return (
 *     <div>
 *       <ProgressBar value={explorationProgress} />
 *       {phases.map(phase => (
 *         <PhaseCard
 *           key={phase.id}
 *           phase={phase}
 *           isExplored={isPhaseExplored(phase.id)}
 *           onExpand={() => handlePhaseExpand(phase.id)}
 *         />
 *       ))}
 *       {isComplete && <span>All phases explored!</span>}
 *     </div>
 *   )
 * }
 * ```
 */

import { useCallback, useMemo } from 'react'
import { useLearningProgress } from '../use-learning-progress'
import type {
  BudgetPhaseId,
  LearningBudgetCycleInteractionState,
  LearningGuestProgress,
} from '../../types'
import { getInteractiveRecord, getJsonValue } from '../../utils/interactive-state'

// Total number of budget phases
const TOTAL_PHASES = 6

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type BudgetCycleInteractionContext = {
  /** Array of phase IDs that have been explored */
  readonly exploredPhases: readonly BudgetPhaseId[]
  /** Check if a specific phase has been explored */
  readonly isPhaseExplored: (phaseId: BudgetPhaseId) => boolean
  /** Progress percentage (0-100) */
  readonly explorationProgress: number
  /** Whether all phases have been explored */
  readonly isComplete: boolean
  /** Mark a phase as explored */
  readonly explorePhase: (phaseId: BudgetPhaseId) => Promise<void>
  /** Reset all exploration progress */
  readonly reset: () => Promise<void>
}

export type UseBudgetCycleInteractionInput = {
  /** The content/lesson ID this component belongs to */
  readonly contentId: string
  /** Optional unique identifier for this component instance */
  readonly interactionId?: string
  /** Content version for tracking changes */
  readonly contentVersion?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// State Resolution
// ═══════════════════════════════════════════════════════════════════════════

function resolveBudgetCycleState(params: {
  readonly progress: LearningGuestProgress
  readonly contentId: string
  readonly interactionId: string
}): { readonly savedState: LearningBudgetCycleInteractionState | null } {
  const record = getInteractiveRecord(
    params.progress.interactiveState,
    {
      id: params.interactionId,
      scopePolicy: 'global',
    },
  )
  const value = getJsonValue<Record<string, unknown>>(record)
  if (value) {
    const exploredPhases = Array.isArray(value.exploredPhases)
      ? value.exploredPhases.filter((phaseId): phaseId is BudgetPhaseId => typeof phaseId === 'string')
      : []
    return {
      savedState: {
        kind: 'budget-cycle',
        exploredPhases,
        lastExploredPhase:
          typeof value.lastExploredPhase === 'string'
            ? (value.lastExploredPhase as BudgetPhaseId)
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

export function useBudgetCycleInteraction(
  params: UseBudgetCycleInteractionInput
): BudgetCycleInteractionContext {
  const { progress, dispatchInteractionAction } = useLearningProgress()
  const interactionId = params.interactionId ?? 'budget-cycle'

  const { savedState } = useMemo(
    () =>
      resolveBudgetCycleState({
        progress,
        contentId: params.contentId,
        interactionId,
      }),
    [progress, params.contentId, interactionId]
  )

  const exploredPhases = savedState?.exploredPhases ?? []
  const explorationProgress = Math.round((exploredPhases.length / TOTAL_PHASES) * 100)
  const isComplete = exploredPhases.length === TOTAL_PHASES

  const isPhaseExplored = useCallback(
    (phaseId: BudgetPhaseId) => exploredPhases.includes(phaseId),
    [exploredPhases]
  )

  const explorePhase = useCallback(
    async (phaseId: BudgetPhaseId) => {
      await dispatchInteractionAction({
        type: 'budgetCycle.explore',
        contentId: params.contentId,
        interactionId,
        phaseId,
        contentVersion: params.contentVersion,
      })
    },
    [dispatchInteractionAction, params.contentId, interactionId, params.contentVersion]
  )

  const reset = useCallback(async () => {
    await dispatchInteractionAction({
      type: 'budgetCycle.reset',
      contentId: params.contentId,
      interactionId,
    })
  }, [dispatchInteractionAction, params.contentId, interactionId])

  return {
    exploredPhases,
    isPhaseExplored,
    explorationProgress,
    isComplete,
    explorePhase,
    reset,
  }
}
