import { useCallback } from 'react'
import { useLearningProgress } from '@/features/learning/hooks/use-learning-progress'
import type { LearningContentStatus } from '@/features/learning/types'

export function useChallengeProgress() {
  const {
    isReady,
    progress,
    getContentProgress,
    saveContentProgress,
    dispatchInteractionAction,
  } = useLearningProgress()

  const getStepStatus = useCallback(
    (stepId: string): LearningContentStatus | undefined => {
      return getContentProgress(stepId)?.status
    },
    [getContentProgress],
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
