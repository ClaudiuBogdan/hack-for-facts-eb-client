import { useCallback, useMemo } from 'react'
import { useCampaignProgress } from '../../hooks/use-campaign-progress'

export function useChallengeInteractionAdapter(challengeSlug: string) {
  const {
    getChallengeStatus,
    markChallengeInProgress,
    setChallengeStatus,
  } = useCampaignProgress()

  const challengeStatus = getChallengeStatus(challengeSlug)

  const markInteractionStarted = useCallback(() => {
    markChallengeInProgress(challengeSlug)
  }, [challengeSlug, markChallengeInProgress])

  const markInteractionCompleted = useCallback(() => {
    setChallengeStatus(challengeSlug, 'completed')
  }, [challengeSlug, setChallengeStatus])

  const markInteractionPendingReview = useCallback(() => {
    setChallengeStatus(challengeSlug, 'pending_review')
  }, [challengeSlug, setChallengeStatus])

  return useMemo(() => ({
    status: challengeStatus,
    isCompleted: challengeStatus === 'completed',
    markInteractionStarted,
    markInteractionCompleted,
    markInteractionPendingReview,
  }), [
    challengeStatus,
    markInteractionStarted,
    markInteractionCompleted,
    markInteractionPendingReview,
  ])
}
