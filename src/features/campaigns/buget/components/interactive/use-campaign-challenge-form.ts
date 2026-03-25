import { useCallback, useEffect, useMemo } from 'react'
import { useRegisterLessonChallenge } from '@/features/learning/components/player/lesson-challenges-context'
import { useCustomInteraction } from '@/features/learning/hooks/interactions/use-custom-interaction'
import { useLearningProgress } from '@/features/learning/hooks/use-learning-progress'
import type { InteractionLifecycleMode } from '@/features/learning/types'
import { resolveInteractiveRecordKey } from '@/features/learning/utils/interactive-state'
import type { CivicOwnerChallengeSlug } from '../../civic-interaction-definitions'
import { useCampaignProgress } from '../../hooks/use-campaign-progress'
import { deriveCampaignChallengeInteractionCandidate } from '../../utils/progress-records'
import type { SubmittedVariant } from './campaign-challenge-review-state'

type UseCampaignChallengeFormInput = {
  readonly ownerChallengeSlug: CivicOwnerChallengeSlug
  readonly interactionId: string
  readonly lifecycleMode: InteractionLifecycleMode
  readonly entityCui: string
}

export function useCampaignChallengeForm<TValue extends Record<string, unknown>>(
  params: UseCampaignChallengeFormInput,
) {
  const { progress: learningProgress } = useLearningProgress()
  const {
    progress: campaignProgress,
    markChallengeInProgress,
    setChallengeStatus,
  } = useCampaignProgress()
  const interaction = useCustomInteraction<TValue>({
    lessonId: params.ownerChallengeSlug,
    interactionId: params.interactionId,
    scopePolicy: 'entity',
    entityCui: params.entityCui,
    kind: 'custom',
    completionRule: { type: 'resolved' },
    lifecycleMode: params.lifecycleMode,
  })

  const currentRecordKey = useMemo(
    () => resolveInteractiveRecordKey(
      {
        id: params.interactionId,
        scopePolicy: 'entity',
      },
      params.entityCui,
    ),
    [params.entityCui, params.interactionId],
  )

  const syncAggregateChallengeStatusFromTrackedInteractions = useCallback((options?: {
    readonly excludedRecordKey?: string | null
  }) => {
    const strongestSiblingCandidate = deriveCampaignChallengeInteractionCandidate(
      params.ownerChallengeSlug,
      Object.values(learningProgress.interactiveState.recordsByKey).filter((record) => {
        return record.key !== options?.excludedRecordKey
      }),
    )
    const persistedChallengeProgress = campaignProgress.challenges[params.ownerChallengeSlug]
    const nextChallengeStatus = strongestSiblingCandidate?.status ?? 'not_started'

    if (nextChallengeStatus === 'not_started') {
      if (!persistedChallengeProgress) {
        return
      }

      setChallengeStatus(params.ownerChallengeSlug, 'not_started', {
        attempts: 0,
        incrementAttempts: false,
        emitAuditEvent: false,
      })
      return
    }

    if (persistedChallengeProgress?.status === nextChallengeStatus) {
      return
    }

    setChallengeStatus(params.ownerChallengeSlug, nextChallengeStatus, {
      incrementAttempts: false,
      emitAuditEvent: false,
    })
  }, [
    campaignProgress.challenges,
    learningProgress.interactiveState.recordsByKey,
    params.ownerChallengeSlug,
    setChallengeStatus,
  ])

  const saveDraft = useCallback(async (value: TValue) => {
    await Promise.resolve()
    await interaction.saveDraft(value)
    markChallengeInProgress(params.ownerChallengeSlug)
  }, [interaction, markChallengeInProgress, params.ownerChallengeSlug])

  const submit = useCallback(async (value: TValue) => {
    if (params.lifecycleMode === 'async_review') {
      await interaction.submit(value)
    } else {
      await interaction.complete(value)
    }
    setChallengeStatus(
      params.ownerChallengeSlug,
      params.lifecycleMode === 'async_review' ? 'pending_review' : 'completed',
    )
  }, [interaction, params.lifecycleMode, params.ownerChallengeSlug, setChallengeStatus])

  const reset = useCallback(async () => {
    await interaction.reset()
    syncAggregateChallengeStatusFromTrackedInteractions({
      excludedRecordKey: currentRecordKey,
    })
  }, [currentRecordKey, interaction, syncAggregateChallengeStatusFromTrackedInteractions])

  const reviewStatus = interaction.lifecycle.reviewStatus
  const reviewFeedbackText = interaction.lifecycle.feedbackText
  const isSubmitted = interaction.lifecycle.isSubmitted
  const submittedVariant: SubmittedVariant =
    params.lifecycleMode === 'async_review'
      ? interaction.lifecycle.isSuccessful
        ? 'completed'
        : interaction.lifecycle.isFailure
          ? 'rejected'
          : 'pending_review'
      : 'completed'
  const challengeStatus =
    campaignProgress.challenges[params.ownerChallengeSlug]?.status
    ?? 'not_started'
  const isCompleted =
    params.lifecycleMode === 'async_review'
      ? interaction.lifecycle.isSuccessful
      : interaction.isCompleted

  useRegisterLessonChallenge({
    id: params.interactionId,
    isCompleted,
  })

  useEffect(() => {
    if (params.lifecycleMode !== 'async_review') {
      return
    }

    if (reviewStatus !== 'approved' && reviewStatus !== 'rejected') {
      return
    }

    syncAggregateChallengeStatusFromTrackedInteractions()
  }, [
    params.lifecycleMode,
    reviewStatus,
    syncAggregateChallengeStatusFromTrackedInteractions,
  ])

  useEffect(() => {
    if (params.lifecycleMode !== 'immediate') {
      return
    }

    if (interaction.phase !== 'pending' || !interaction.savedValue) {
      return
    }

    void submit(interaction.savedValue as TValue)
  }, [
    interaction.phase,
    interaction.savedValue,
    params.lifecycleMode,
    submit,
  ])

  return useMemo(() => ({
    record: interaction.record,
    savedValue: interaction.savedValue,
    phase: interaction.phase,
    isSubmitted,
    isCompleted,
    challengeStatus,
    reviewStatus,
    reviewFeedbackText,
    submittedVariant,
    entityCui: params.entityCui,
    saveDraft,
    submit,
    reset,
  }), [
    interaction.record,
    interaction.savedValue,
    interaction.phase,
    isSubmitted,
    isCompleted,
    challengeStatus,
    reviewStatus,
    reviewFeedbackText,
    submittedVariant,
    params.entityCui,
    saveDraft,
    submit,
    reset,
  ])
}
