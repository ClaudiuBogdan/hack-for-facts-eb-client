import { useEffect, useRef } from 'react'
import { useLearningProgress } from './use-learning-progress'
import { getLearningPathById } from '../utils/paths'

type UseAutoOnboardingParams = {
  readonly pathId: string
}

/**
 * Automatically completes onboarding when a new user navigates directly
 * to a learning path via a shared URL.
 *
 * This hook ensures that when someone shares a path URL with a new user,
 * and that user starts learning, their progress is associated with the
 * shared path rather than requiring them to go through onboarding first.
 *
 * The hook only triggers for users who haven't completed onboarding.
 * Users who have already completed onboarding are not affected.
 */
export function useAutoOnboarding({ pathId }: UseAutoOnboardingParams): void {
  const {
    isReady,
    bootstrapPhase,
    progress,
    saveOnboarding,
  } = useLearningProgress()

  // Track which pathId we've already processed to avoid duplicate saves
  // when dependencies change but the path remains the same
  const processedPathIdRef = useRef<string | null>(null)

  // Track if we're currently saving to prevent race conditions
  const isSavingRef = useRef(false)

  useEffect(() => {
    // Wait until progress state is ready
    if (!isReady) return
    if (bootstrapPhase !== 'ready') return

    // Skip if onboarding is already completed
    if (progress.onboarding.completedAt) return

    // Skip if we already processed this exact pathId
    if (processedPathIdRef.current === pathId) return

    // Skip if currently saving (prevents race conditions)
    if (isSavingRef.current) return

    // Validate that the path exists before saving
    const path = getLearningPathById(pathId)
    if (!path) return

    // Mark as processing to prevent duplicate calls
    processedPathIdRef.current = pathId
    isSavingRef.current = true

    // Complete onboarding with this path
    // This sets both onboarding.pathId and activePathId
    void saveOnboarding({ pathId }).finally(() => {
      isSavingRef.current = false
    })
  }, [bootstrapPhase, isReady, pathId, progress.onboarding.completedAt, saveOnboarding])
}
