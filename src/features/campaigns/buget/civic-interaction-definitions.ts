export const CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG = 'civic-monitor-and-request'
export const CIVIC_PARTICIPATE_AND_ACT_CHALLENGE_SLUG = 'civic-participate-and-act'

export type CivicOwnerChallengeSlug =
  | typeof CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG
  | typeof CIVIC_PARTICIPATE_AND_ACT_CHALLENGE_SLUG

export type CampaignInteractiveDefinition = {
  readonly interactionId: string
  readonly ownerChallengeSlug: CivicOwnerChallengeSlug
}

function defineCampaignInteractiveDefinition(
  interactionId: string,
  ownerChallengeSlug: CivicOwnerChallengeSlug,
): CampaignInteractiveDefinition {
  return {
    interactionId,
    ownerChallengeSlug,
  }
}

export const PRIMARIE_WEBSITE_LINK_INTERACTION = defineCampaignInteractiveDefinition(
  'campaign:primarie-website-url',
  CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG,
)

export const BUDGET_DOCUMENT_LINK_INTERACTION = defineCampaignInteractiveDefinition(
  'campaign:budget-document-url',
  CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG,
)

export const BUDGET_PUBLICATION_DATE_INTERACTION = defineCampaignInteractiveDefinition(
  'campaign:budget-publication-date',
  CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG,
)

export const BUDGET_STATUS_REPORT_INTERACTION = defineCampaignInteractiveDefinition(
  'campaign:budget-2026-status',
  CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG,
)

export const PRIMARIE_CONTACT_INFO_INTERACTION = defineCampaignInteractiveDefinition(
  'campaign:primarie-contact-info',
  CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG,
)

export const DEBATE_REQUEST_INTERACTION = defineCampaignInteractiveDefinition(
  'campaign:debate-request',
  CIVIC_MONITOR_AND_REQUEST_CHALLENGE_SLUG,
)

export const PARTICIPATION_REPORT_INTERACTION = defineCampaignInteractiveDefinition(
  'campaign:participation-report',
  CIVIC_PARTICIPATE_AND_ACT_CHALLENGE_SLUG,
)

export const CONTESTATION_BUILDER_INTERACTION = defineCampaignInteractiveDefinition(
  'campaign:budget-contestation',
  CIVIC_PARTICIPATE_AND_ACT_CHALLENGE_SLUG,
)
