/**
 * Prediction Interaction Hook
 *
 * Provides state and actions for prediction/reveal components like PromiseTracker.
 * Users make predictions (guesses) and then reveal the actual answer.
 *
 * @example
 * ```tsx
 * function MyPrediction({ contentId, predictionId }: Props) {
 *   const { reveals, isYearRevealed, reveal, reset } = usePredictionInteraction({
 *     contentId,
 *     predictionId,
 *   })
 *
 *   const [guess, setGuess] = useState(50)
 *   const actualRate = 60 // From data
 *
 *   return (
 *     <div>
 *       {!isYearRevealed('2024') ? (
 *         <>
 *           <Slider value={guess} onChange={setGuess} />
 *           <button onClick={() => reveal('2024', guess, actualRate)}>
 *             Reveal
 *           </button>
 *         </>
 *       ) : (
 *         <div>
 *           Your guess: {reveals['2024'].guess}%
 *           Actual: {reveals['2024'].actualRate}%
 *         </div>
 *       )}
 *       <button onClick={reset}>Reset All</button>
 *     </div>
 *   )
 * }
 * ```
 */

import { useCallback, useMemo } from 'react'
import { useLearningProgress } from '../use-learning-progress'
import type { LearningGuestProgress, LearningPredictionReveal } from '../../types'
import { getInteractiveRecord, getJsonValue } from '../../utils/interactive-state'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type PredictionInteractionContext = {
  /** All reveals keyed by year/identifier */
  readonly reveals: Readonly<Record<string, LearningPredictionReveal>>
  /** Check if a specific year/identifier has been revealed */
  readonly isYearRevealed: (year: string) => boolean
  /** Get reveal data for a specific year/identifier */
  readonly getYearReveal: (year: string) => LearningPredictionReveal | undefined
  /** Reveal the answer for a year, recording the user's guess */
  readonly reveal: (year: string, guess: number, actualRate: number) => Promise<void>
  /** Reset all predictions */
  readonly reset: () => Promise<void>
}

export type UsePredictionInteractionInput = {
  /** The content/lesson ID this prediction belongs to */
  readonly contentId: string
  /** Unique identifier for this prediction component */
  readonly predictionId: string
  /** Content version for tracking changes */
  readonly contentVersion?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// State Resolution
// ═══════════════════════════════════════════════════════════════════════════

function resolvePredictionState(params: {
  readonly progress: LearningGuestProgress
  readonly contentId: string
  readonly predictionId: string
}): { readonly reveals: Readonly<Record<string, LearningPredictionReveal>> } {
  const record = getInteractiveRecord(
    params.progress.interactiveState,
    {
      id: params.predictionId,
      scopePolicy: 'global',
    },
  )
  const jsonValue = getJsonValue<Record<string, unknown>>(record)
  const reveals = jsonValue?.reveals
  if (reveals && typeof reveals === 'object') {
    const validated: Record<string, LearningPredictionReveal> = {}
    for (const [key, entry] of Object.entries(reveals as Record<string, unknown>)) {
      if (
        entry &&
        typeof entry === 'object' &&
        'guess' in entry && typeof (entry as Record<string, unknown>).guess === 'number' &&
        'actualRate' in entry && typeof (entry as Record<string, unknown>).actualRate === 'number' &&
        'revealedAt' in entry && typeof (entry as Record<string, unknown>).revealedAt === 'string'
      ) {
        validated[key] = entry as LearningPredictionReveal
      }
    }
    return { reveals: validated }
  }

  return { reveals: {} }
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

export function usePredictionInteraction(params: UsePredictionInteractionInput): PredictionInteractionContext {
  const { progress, dispatchInteractionAction } = useLearningProgress()

  const { reveals } = useMemo(
    () =>
      resolvePredictionState({
        progress,
        contentId: params.contentId,
        predictionId: params.predictionId,
      }),
    [progress, params.contentId, params.predictionId]
  )

  const isYearRevealed = useCallback(
    (year: string): boolean => {
      return year in reveals
    },
    [reveals]
  )

  const getYearReveal = useCallback(
    (year: string): LearningPredictionReveal | undefined => {
      return reveals[year]
    },
    [reveals]
  )

  const reveal = useCallback(
    async (year: string, guess: number, actualRate: number) => {
      await dispatchInteractionAction({
        type: 'prediction.reveal',
        contentId: params.contentId,
        interactionId: params.predictionId,
        year,
        guess,
        actualRate,
        contentVersion: params.contentVersion,
      })
    },
    [dispatchInteractionAction, params.contentId, params.predictionId, params.contentVersion]
  )

  const reset = useCallback(async () => {
    await dispatchInteractionAction({
      type: 'prediction.reset',
      contentId: params.contentId,
      interactionId: params.predictionId,
    })
  }, [dispatchInteractionAction, params.contentId, params.predictionId])

  return {
    reveals,
    isYearRevealed,
    getYearReveal,
    reveal,
    reset,
  }
}
