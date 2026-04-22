import { useMemo } from 'react'
import { useCustomInteraction } from '@/features/learning/hooks/interactions/use-custom-interaction'
import { CAMPAIGN_KEY } from '../constants'
import { BUDGET_PUBLICATION_DATE_INTERACTION } from '../civic-interaction-definitions'
import { getCampaignUatOverrideForCui } from './use-campaign-content'
import { useCampaignEntityPublicConfig } from './use-campaign-entity-public-config'
import { resolveCampaignTimelineOverride } from '../utils/campaign-timeline-override'
import type { BudgetPublicationDateValue } from '../components/interactive/types'

export function useCampaignCalendarOverride(entityCui?: string) {
  const baseOverride = useMemo(
    () => (entityCui ? getCampaignUatOverrideForCui(entityCui) : undefined),
    [entityCui],
  )

  const publicConfigQuery = useCampaignEntityPublicConfig(
    CAMPAIGN_KEY,
    entityCui,
    { enabled: Boolean(entityCui) },
  )

  const userPublicationDate = useCustomInteraction<BudgetPublicationDateValue>({
    lessonId: BUDGET_PUBLICATION_DATE_INTERACTION.ownerChallengeSlug,
    interactionId: BUDGET_PUBLICATION_DATE_INTERACTION.interactionId,
    scopePolicy: 'entity',
    entityCui,
    kind: 'custom',
    completionRule: { type: 'resolved' },
  })

  return useMemo(
    () =>
      resolveCampaignTimelineOverride({
        baseOverride,
        configBudgetPublicationDate:
          publicConfigQuery.data?.values.budgetPublicationDate ?? null,
        userBudgetPublicationDate:
          userPublicationDate.savedValue?.publicationDate ?? null,
      }),
    [
      baseOverride,
      publicConfigQuery.data?.values.budgetPublicationDate,
      userPublicationDate.savedValue?.publicationDate,
    ],
  )
}
