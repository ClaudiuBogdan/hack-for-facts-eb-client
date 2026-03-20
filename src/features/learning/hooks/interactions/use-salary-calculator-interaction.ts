/**
 * Salary Calculator Interaction Hook
 *
 * Provides state and actions for the SalaryTaxCalculator component.
 * Users enter their gross salary, guess their net salary, and reveal the calculation.
 * State is persisted so users can resume exactly where they left off.
 *
 * @example
 * ```tsx
 * function MySalaryCalculator({ contentId, calculatorId }: Props) {
 *   const { savedState, isCompleted, save, reset } = useSalaryCalculatorInteraction({
 *     contentId,
 *     calculatorId,
 *   })
 *
 *   // Restore state on mount
 *   useEffect(() => {
 *     if (savedState) {
 *       setGross(savedState.gross)
 *       setUserGuess(savedState.userGuess)
 *       setStep(savedState.step)
 *     }
 *   }, [savedState])
 *
 *   // Save state when user progresses
 *   const handleReveal = async () => {
 *     setStep('REVEAL')
 *     await save(gross, userGuess, 'REVEAL')
 *   }
 *
 *   return (
 *     <div>
 *       {isCompleted && <span>Completed!</span>}
 *       <button onClick={reset}>Start Over</button>
 *     </div>
 *   )
 * }
 * ```
 */

import { useCallback, useMemo } from 'react'
import { useLearningProgress } from '../use-learning-progress'
import type {
  LearningGuestProgress,
  LearningSalaryCalculatorInteractionState,
  LearningSalaryCalculatorStep,
} from '../../types'
import { getInteractiveRecord, getJsonValue } from '../../utils/interactive-state'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type SalaryCalculatorInteractionContext = {
  /** The saved interaction state, or null if not saved */
  readonly savedState: LearningSalaryCalculatorInteractionState | null
  /** Whether the calculator has been completed (reached REVEAL step) */
  readonly isCompleted: boolean
  /** Save the current state */
  readonly save: (gross: number, userGuess: number, step: LearningSalaryCalculatorStep) => Promise<void>
  /** Reset all saved state */
  readonly reset: () => Promise<void>
}

export type UseSalaryCalculatorInteractionInput = {
  /** The content/lesson ID this calculator belongs to */
  readonly contentId: string
  /** Unique identifier for this calculator component */
  readonly calculatorId: string
  /** Content version for tracking changes */
  readonly contentVersion?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// State Resolution
// ═══════════════════════════════════════════════════════════════════════════

function resolveSalaryCalculatorState(params: {
  readonly progress: LearningGuestProgress
  readonly contentId: string
  readonly calculatorId: string
}): { readonly savedState: LearningSalaryCalculatorInteractionState | null } {
  const record = getInteractiveRecord(
    params.progress.interactiveState,
    {
      id: params.calculatorId,
      scopePolicy: 'global',
    },
  )
  const value = getJsonValue<Record<string, unknown>>(record)
  if (value) {
    return {
      savedState: {
        kind: 'salary-calculator',
        gross: typeof value.gross === 'number' ? value.gross : 0,
        userGuess: typeof value.userGuess === 'number' ? value.userGuess : 0,
        step: value.step === 'INPUT' || value.step === 'GUESS' || value.step === 'REVEAL' ? value.step : 'INPUT',
        completedAt: record?.submittedAt ?? undefined,
      },
    }
  }

  return { savedState: null }
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useSalaryCalculatorInteraction(
  params: UseSalaryCalculatorInteractionInput
): SalaryCalculatorInteractionContext {
  const { progress, dispatchInteractionAction } = useLearningProgress()

  const { savedState } = useMemo(
    () =>
      resolveSalaryCalculatorState({
        progress,
        contentId: params.contentId,
        calculatorId: params.calculatorId,
      }),
    [progress, params.contentId, params.calculatorId]
  )

  const isCompleted = savedState?.step === 'REVEAL'

  const save = useCallback(
    async (gross: number, userGuess: number, step: LearningSalaryCalculatorStep) => {
      await dispatchInteractionAction({
        type: 'salaryCalculator.save',
        contentId: params.contentId,
        interactionId: params.calculatorId,
        gross,
        userGuess,
        step,
        contentVersion: params.contentVersion,
      })
    },
    [dispatchInteractionAction, params.contentId, params.calculatorId, params.contentVersion]
  )

  const reset = useCallback(async () => {
    await dispatchInteractionAction({
      type: 'salaryCalculator.reset',
      contentId: params.contentId,
      interactionId: params.calculatorId,
    })
  }, [dispatchInteractionAction, params.contentId, params.calculatorId])

  return {
    savedState,
    isCompleted,
    save,
    reset,
  }
}
