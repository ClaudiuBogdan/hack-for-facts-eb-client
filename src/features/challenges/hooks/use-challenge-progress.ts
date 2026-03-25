import { useCallback, useMemo } from 'react'
import { useLearningProgress } from '@/features/learning/hooks/use-learning-progress'
import type { LearningContentStatus } from '@/features/learning/types'
import type { ChallengeLocale, ChallengeStepDefinition } from '../types'
import { getChallengeModules } from '../utils/modules'
import {
  deriveChallengeStepStatus,
  stepHasTrackedChallengeInteractions,
} from '../utils/challenge-progress'

export function useChallengeProgress(params: {
  readonly entityCui?: string | null
  readonly locale: ChallengeLocale
}) {
  const {
    isReady,
    progress,
    getContentProgress,
    saveContentProgress,
    dispatchInteractionAction,
  } = useLearningProgress()
  const stepsById = useMemo(() => {
    const stepLookup = new Map<string, ChallengeStepDefinition>()

    for (const module of getChallengeModules()) {
      for (const challenge of module.challenges) {
        for (const step of challenge.steps) {
          stepLookup.set(step.id, step)
        }
      }
    }

    return stepLookup
  }, [])

  const getStepStatus = useCallback(
    (stepId: string): LearningContentStatus | undefined => {
      const step = stepsById.get(stepId)
      const fallbackStatus = getContentProgress(stepId)?.status

      if (!step) {
        return fallbackStatus
      }

      if (!stepHasTrackedChallengeInteractions({
        step,
        locale: params.locale,
      })) {
        return fallbackStatus
      }

      return deriveChallengeStepStatus({
        step,
        locale: params.locale,
        interactiveState: progress.interactiveState,
        entityCui: params.entityCui,
        fallbackStatus,
      })
    },
    [
      getContentProgress,
      params.entityCui,
      params.locale,
      progress.interactiveState,
      stepsById,
    ],
  )

  const isStepCompleted = useCallback(
    (stepId: string): boolean => {
      const status = getStepStatus(stepId)
      return status === 'completed' || status === 'passed'
    },
    [getStepStatus],
  )

  return {
    isReady,
    progress,
    getStepStatus,
    isStepCompleted,
    getContentProgress,
    saveContentProgress,
    dispatchInteractionAction,
  }
}
