/**
 * Quiz Interaction Hook
 *
 * Provides state and actions for quiz components.
 *
 * @example
 * ```tsx
 * function MyQuiz({ contentId, quizId, options }: QuizProps) {
 *   const { selectedOptionId, isAnswered, isCorrect, answer, reset } = useQuizInteraction({
 *     contentId,
 *     quizId,
 *     options,
 *   })
 *
 *   return (
 *     <div>
 *       {options.map(option => (
 *         <button
 *           key={option.id}
 *           onClick={() => answer(option.id)}
 *           disabled={isAnswered}
 *         >
 *           {option.text}
 *         </button>
 *       ))}
 *       {isAnswered && !isCorrect && <button onClick={reset}>Try Again</button>}
 *     </div>
 *   )
 * }
 * ```
 */

import { useCallback, useMemo } from 'react'
import { useLearningProgress } from '../use-learning-progress'
import { scoreSingleChoice, type SingleChoiceOption } from '../../utils/scoring'
import { QUIZ_PASS_SCORE } from '../../utils/interactions'
import type { InteractiveDefinition, LearningGuestProgress } from '../../types'
import {
  getChoiceSelection,
  getInteractionOutcome,
  getInteractiveRecord,
} from '../../utils/interactive-state'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type QuizInteractionContext = {
  /** The currently selected option ID, or null if not answered */
  readonly selectedOptionId: string | null
  /** Whether the quiz has been answered */
  readonly isAnswered: boolean
  /** The score achieved (0-100) */
  readonly score: number
  /** Whether the answer is correct (score >= pass threshold) */
  readonly isCorrect: boolean
  /** Submit an answer */
  readonly answer: (optionId: string) => Promise<void>
  /** Reset the quiz to try again */
  readonly reset: () => Promise<void>
}

export type UseQuizInteractionInput = {
  /** The content/lesson ID this quiz belongs to */
  readonly contentId: string
  /** Unique identifier for this quiz within the content */
  readonly quizId: string
  /** Available options for the quiz */
  readonly options: readonly SingleChoiceOption[]
  /** Score required to pass (default: 70) */
  readonly passScore?: number
  /** Content version for tracking changes */
  readonly contentVersion?: string
  /** Whether the quiz state is global or entity-scoped */
  readonly scopePolicy?: InteractiveDefinition['scopePolicy']
  /** Entity CUI used for entity-scoped quizzes */
  readonly entityCui?: string
  /** Whether answering the quiz should also persist lesson progress */
  readonly trackContentProgress?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// State Resolution
// ═══════════════════════════════════════════════════════════════════════════

function resolveQuizState(params: {
  readonly progress: LearningGuestProgress
  readonly contentId: string
  readonly quizId: string
  readonly options: readonly SingleChoiceOption[]
  readonly scopePolicy: InteractiveDefinition['scopePolicy']
  readonly entityCui?: string
}): { readonly selectedOptionId: string | null } {
  const record = getInteractiveRecord(
    params.progress.interactiveState,
    {
      id: params.quizId,
      scopePolicy: params.scopePolicy,
    },
    params.entityCui,
  )
  const selectedOptionId = getChoiceSelection(record)

  if (!selectedOptionId) {
    return { selectedOptionId: null }
  }

  // Validate the option still exists
  const isValidOption = params.options.some((option) => option.id === selectedOptionId)
  return { selectedOptionId: isValidOption ? selectedOptionId : null }
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useQuizInteraction(params: UseQuizInteractionInput): QuizInteractionContext {
  const {
    progress,
    resolveInteractive,
    resetInteractive,
  } = useLearningProgress()
  const passScore = params.passScore ?? QUIZ_PASS_SCORE
  const scopePolicy = params.scopePolicy ?? 'global'

  const { selectedOptionId } = useMemo(
    () =>
      resolveQuizState({
        progress,
        contentId: params.contentId,
        quizId: params.quizId,
        options: params.options,
        scopePolicy,
        entityCui: params.entityCui,
      }),
    [progress, params.contentId, params.entityCui, params.options, params.quizId, scopePolicy]
  )

  const score = useMemo(
    () => scoreSingleChoice(params.options, selectedOptionId),
    [params.options, selectedOptionId]
  )

  const isAnswered = selectedOptionId !== null

  const answer = useCallback(
    async (optionId: string) => {
      const isValidOption = params.options.some((option) => option.id === optionId)
      if (!isValidOption) return

      const nextScore = scoreSingleChoice(params.options, optionId)
      await resolveInteractive({
        definition: {
          id: params.quizId,
          lessonId: params.contentId,
          kind: 'quiz',
          scopePolicy,
          completionRule: { type: 'outcome', outcome: 'correct' },
          lifecycleMode: 'immediate',
        },
        entityCui: params.entityCui,
        value: {
          kind: 'choice',
          choice: { selectedId: optionId },
        },
        outcome: nextScore >= passScore ? 'correct' : 'incorrect',
        score: nextScore,
        ...(params.trackContentProgress === false
          ? {}
          : {
              content: {
                contentId: params.contentId,
                status: 'in_progress' as const,
                score: nextScore,
                contentVersion: params.contentVersion,
              },
            }),
      })
    },
    [
      params.contentId,
      params.contentVersion,
      params.entityCui,
      params.options,
      params.quizId,
      params.trackContentProgress,
      passScore,
      scopePolicy,
      resolveInteractive,
    ]
  )

  const reset = useCallback(async () => {
    await resetInteractive({
      definition: {
        id: params.quizId,
        lessonId: params.contentId,
        kind: 'quiz',
        scopePolicy,
        completionRule: { type: 'outcome', outcome: 'correct' },
        lifecycleMode: 'immediate',
      },
      entityCui: params.entityCui,
    })
  }, [params.contentId, params.entityCui, params.quizId, resetInteractive, scopePolicy])

  const record = getInteractiveRecord(
    progress.interactiveState,
    { id: params.quizId, scopePolicy },
    params.entityCui,
  )

  return {
    selectedOptionId,
    isAnswered,
    score,
    isCorrect: getInteractionOutcome(record) === 'correct',
    answer,
    reset,
  }
}
