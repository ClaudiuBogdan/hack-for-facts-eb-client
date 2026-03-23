import { useCallback, useEffect, useMemo } from 'react'
import { useCustomInteraction } from '@/features/learning/hooks/interactions/use-custom-interaction'
import {
  getInteractionReviewFeedbackText,
  getInteractionReviewStatus,
} from '@/features/learning/utils/interactive-state'
import type { CivicOwnerChallengeSlug } from '../../civic-interaction-definitions'
import { useCampaignProgress } from '../../hooks/use-campaign-progress'
import type { SubmittedVariant } from './CampaignChallengeFormShell'

type UseCampaignChallengeFormInput = {
  readonly ownerChallengeSlug: CivicOwnerChallengeSlug
  readonly interactionId: string
  readonly completionAction: 'complete' | 'pending_review'
}

export function useCampaignChallengeForm<TValue extends Record<string, unknown>>(
  params: UseCampaignChallengeFormInput,
) {
  const {
    progress,
    getChallengeStatus,
    markChallengeInProgress,
    setChallengeStatus,
  } = useCampaignProgress()
  const entityCui = progress.selectedEntityCui ?? undefined

  const interaction = useCustomInteraction<TValue>({
    lessonId: params.ownerChallengeSlug,
    interactionId: params.interactionId,
    scopePolicy: 'entity',
    entityCui,
    kind: 'custom',
    completionRule: { type: 'resolved' },
  })

  const saveDraft = useCallback(async (value: TValue) => {
    await Promise.resolve()
    await interaction.saveDraft(value)
    markChallengeInProgress(params.ownerChallengeSlug)
  }, [interaction, markChallengeInProgress, params.ownerChallengeSlug])

  const submit = useCallback(async (value: TValue) => {
    await interaction.complete(value)
    setChallengeStatus(
      params.ownerChallengeSlug,
      params.completionAction === 'pending_review' ? 'pending_review' : 'completed',
    )
  }, [interaction, params.completionAction, params.ownerChallengeSlug, setChallengeStatus])

  const reset = useCallback(async () => {
    await interaction.reset()
  }, [interaction])

  const reviewStatus = getInteractionReviewStatus(interaction.record)
  const reviewFeedbackText = getInteractionReviewFeedbackText(interaction.record)
  // Review-required interactives are modeled as one shared record:
  // - client writes the submission payload
  // - server later attaches authoritative `record.review`
  // This keeps future review-required campaign interactives on the same
  // rendering/completion path instead of reimplementing ad hoc status logic.
  const submittedVariant: SubmittedVariant =
    params.completionAction === 'pending_review'
      ? reviewStatus === 'approved'
        ? 'completed'
        : reviewStatus === 'rejected'
          ? 'rejected'
          : 'pending_review'
      : 'completed'
  const challengeStatus =
    interaction.record === null
      ? 'not_started'
      : submittedVariant === 'completed'
        ? 'completed'
        : submittedVariant === 'rejected'
          ? 'in_progress'
        : interaction.phase === 'resolved'
          ? 'pending_review'
          : 'in_progress'
  const isCompleted =
    params.completionAction === 'pending_review'
      ? submittedVariant === 'completed'
      : interaction.isCompleted
  const persistedChallengeStatus = getChallengeStatus(params.ownerChallengeSlug)

  useEffect(() => {
    if (params.completionAction !== 'pending_review') {
      return
    }

    if (reviewStatus !== 'approved' && reviewStatus !== 'rejected') {
      return
    }

    const nextChallengeStatus = reviewStatus === 'approved' ? 'completed' : 'in_progress'
    if (persistedChallengeStatus === nextChallengeStatus) {
      return
    }

    setChallengeStatus(params.ownerChallengeSlug, nextChallengeStatus, {
      incrementAttempts: false,
      emitAuditEvent: false,
    })
  }, [
    params.completionAction,
    params.ownerChallengeSlug,
    persistedChallengeStatus,
    reviewStatus,
    setChallengeStatus,
  ])

  return useMemo(() => ({
    record: interaction.record,
    savedValue: interaction.savedValue,
    phase: interaction.phase,
    isSubmitted: interaction.phase === 'resolved',
    isCompleted,
    challengeStatus,
    reviewStatus,
    reviewFeedbackText,
    submittedVariant,
    entityCui,
    saveDraft,
    submit,
    reset,
  }), [
    interaction.record,
    interaction.savedValue,
    interaction.phase,
    isCompleted,
    challengeStatus,
    reviewStatus,
    reviewFeedbackText,
    submittedVariant,
    entityCui,
    saveDraft,
    submit,
    reset,
  ])
}
