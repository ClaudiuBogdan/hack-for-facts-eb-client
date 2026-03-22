import { useCallback, useMemo } from 'react'
import { useCustomInteraction } from '@/features/learning/hooks/interactions/use-custom-interaction'
import { useChallengeInteractionAdapter } from '../../adapters/learning/challenge-interaction-adapter'
import { useCampaignProgress } from '../../hooks/use-campaign-progress'

type UseCampaignChallengeFormInput = {
  readonly challengeSlug: string
  readonly interactionId: string
  readonly completionAction: 'complete' | 'pending_review'
}

export function useCampaignChallengeForm<TValue extends Record<string, unknown>>(
  params: UseCampaignChallengeFormInput,
) {
  const { progress } = useCampaignProgress()
  const entityCui = progress.selectedEntityCui ?? undefined

  const interaction = useCustomInteraction<TValue>({
    lessonId: params.challengeSlug,
    interactionId: params.interactionId,
    scopePolicy: 'entity',
    entityCui,
    kind: 'custom',
    completionRule: { type: 'resolved' },
  })

  const adapter = useChallengeInteractionAdapter(params.challengeSlug)

  const saveDraft = useCallback(async (value: TValue) => {
    adapter.markInteractionStarted()
    await interaction.saveDraft(value)
  }, [adapter, interaction])

  const submit = useCallback(async (value: TValue) => {
    await interaction.complete(value)
    if (params.completionAction === 'pending_review') {
      adapter.markInteractionPendingReview()
    } else {
      adapter.markInteractionCompleted()
    }
  }, [adapter, interaction, params.completionAction])

  const reset = useCallback(async () => {
    await interaction.reset()
  }, [interaction])

  return useMemo(() => ({
    savedValue: interaction.savedValue,
    phase: interaction.phase,
    isSubmitted: interaction.phase === 'resolved',
    isCompleted: interaction.isCompleted,
    challengeStatus: adapter.status,
    entityCui,
    saveDraft,
    submit,
    reset,
  }), [
    interaction.savedValue,
    interaction.phase,
    interaction.isCompleted,
    adapter.status,
    entityCui,
    saveDraft,
    submit,
    reset,
  ])
}
