import type { InteractionLifecycleMode } from '@/features/learning/types'

export const CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG = 'civic-monitor-and-request'
export const CIVIC_PARTICIPATE_AND_ACT_CHALLENGE_SLUG = 'civic-participate-and-act'

export type CivicOwnerChallengeSlug =
  | typeof CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG
  | typeof CIVIC_PARTICIPATE_AND_ACT_CHALLENGE_SLUG

export type CampaignInteractiveDefinition = {
  readonly interactionId: string
  readonly ownerChallengeSlug: CivicOwnerChallengeSlug
  readonly lifecycleMode: InteractionLifecycleMode
}

function defineCampaignInteractiveDefinition(
  interactionId: string,
  ownerChallengeSlug: CivicOwnerChallengeSlug,
  lifecycleMode: InteractionLifecycleMode,
): CampaignInteractiveDefinition {
  return {
    interactionId,
    ownerChallengeSlug,
    lifecycleMode,
  }
}

export const PRIMARIE_WEBSITE_LINK_INTERACTION = defineCampaignInteractiveDefinition(
  'funky:interaction:city_hall_website',
  CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG,
  'async_review',
)

export const BUDGET_DOCUMENT_LINK_INTERACTION = defineCampaignInteractiveDefinition(
  'funky:interaction:budget_document',
  CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG,
  'async_review',
)

export const BUDGET_PUBLICATION_DATE_INTERACTION = defineCampaignInteractiveDefinition(
  'funky:interaction:budget_publication_date',
  CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG,
  'async_review',
)

export const BUDGET_STATUS_REPORT_INTERACTION = defineCampaignInteractiveDefinition(
  'funky:interaction:budget_status',
  CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG,
  'async_review',
)

export const PRIMARIE_CONTACT_INFO_INTERACTION = defineCampaignInteractiveDefinition(
  'funky:interaction:city_hall_contact',
  CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG,
  'async_review',
)

export const DEBATE_REQUEST_INTERACTION_ID = 'funky:interaction:public_debate_request' as const

export const DEBATE_REQUEST_INTERACTION = defineCampaignInteractiveDefinition(
  DEBATE_REQUEST_INTERACTION_ID,
  CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG,
  'async_review',
)

export const PARTICIPATION_REPORT_INTERACTION = defineCampaignInteractiveDefinition(
  'funky:interaction:funky_participation',
  CIVIC_PARTICIPATE_AND_ACT_CHALLENGE_SLUG,
  'immediate',
)

export const CONTESTATION_BUILDER_INTERACTION = defineCampaignInteractiveDefinition(
  'funky:interaction:budget_contestation',
  CIVIC_PARTICIPATE_AND_ACT_CHALLENGE_SLUG,
  'async_review',
)

export const CAMPAIGN_INTERACTIVE_DEFINITIONS = [
  PRIMARIE_WEBSITE_LINK_INTERACTION,
  BUDGET_DOCUMENT_LINK_INTERACTION,
  BUDGET_PUBLICATION_DATE_INTERACTION,
  BUDGET_STATUS_REPORT_INTERACTION,
  PRIMARIE_CONTACT_INFO_INTERACTION,
  DEBATE_REQUEST_INTERACTION,
  PARTICIPATION_REPORT_INTERACTION,
  CONTESTATION_BUILDER_INTERACTION,
] as const satisfies readonly CampaignInteractiveDefinition[]

const CAMPAIGN_INTERACTIVE_DEFINITION_BY_INTERACTION_ID = new Map(
  CAMPAIGN_INTERACTIVE_DEFINITIONS.map((definition) => [definition.interactionId, definition] as const),
)

const CAMPAIGN_INTERACTIVE_DEFINITIONS_BY_CHALLENGE = CAMPAIGN_INTERACTIVE_DEFINITIONS.reduce<
  Record<CivicOwnerChallengeSlug, readonly CampaignInteractiveDefinition[]>
>(
  (definitionsByChallenge, definition) => ({
    ...definitionsByChallenge,
    [definition.ownerChallengeSlug]: [
      ...(definitionsByChallenge[definition.ownerChallengeSlug] ?? []),
      definition,
    ],
  }),
  {
    [CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG]: [],
    [CIVIC_PARTICIPATE_AND_ACT_CHALLENGE_SLUG]: [],
  },
)

export function getCampaignInteractiveDefinitionByInteractionId(
  interactionId: string,
): CampaignInteractiveDefinition | null {
  return CAMPAIGN_INTERACTIVE_DEFINITION_BY_INTERACTION_ID.get(interactionId) ?? null
}

export function getCampaignInteractiveDefinitionsForChallenge(
  ownerChallengeSlug: CivicOwnerChallengeSlug | string,
): readonly CampaignInteractiveDefinition[] {
  return CAMPAIGN_INTERACTIVE_DEFINITIONS_BY_CHALLENGE[
    ownerChallengeSlug as CivicOwnerChallengeSlug
  ] ?? []
}
