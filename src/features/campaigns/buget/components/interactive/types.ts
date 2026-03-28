import type { CivicOwnerChallengeSlug } from '../../civic-interaction-definitions'

export type DebateRequestFormValue = {
  readonly primariaEmail: string
  readonly isNgo: boolean
  readonly organizationName: string | null
  readonly ngoSenderEmail: string | null
  readonly threadKey: string | null
  readonly submissionPath: 'send_yourself' | 'request_platform' | null
  readonly submittedAt: string | null
}

export type ParticipationReportValue = {
  readonly debateTookPlace: 'yes' | 'no' | 'dont_know' | null
  readonly approximateAttendees: number | null
  readonly citizensAllowedToSpeak: 'yes' | 'no' | 'partially' | null
  readonly citizenInputsRecorded: 'yes' | 'no' | 'dont_know' | null
  readonly observations: string | null
  readonly submittedAt: string | null
}

export type BudgetStatusReportValue = {
  readonly isPublished: 'yes' | 'no' | 'dont_know' | null
  readonly budgetStage: 'draft' | 'approved' | null
  readonly submittedAt: string | null
}

export type ContestationBuilderValue = {
  readonly contestedItem: string
  readonly reasoning: string
  readonly impact: string
  readonly proposedChange: string
  readonly senderName: string | null
  readonly submissionPath: 'send_email' | 'download_text' | null
  readonly primariaEmail: string | null
  readonly submittedAt: string | null
}

export type BudgetPublicationDateSourceType = 'website' | 'press' | 'social_media' | 'other'

export type BudgetPublicationDateSourceEntry = {
  readonly type: BudgetPublicationDateSourceType
  readonly url: string | null
}

export type BudgetPublicationDateValue = {
  readonly publicationDate: string | null
  readonly sources: readonly BudgetPublicationDateSourceEntry[]
  readonly submittedAt: string | null
}

export type PrimarieWebsiteLinkValue = {
  readonly websiteUrl: string
  readonly submittedAt: string | null
}

export type BudgetDocumentLinkValue = {
  readonly documentUrl: string
  readonly documentType: 'pdf' | 'word' | 'excel' | 'webpage' | 'graphics' | 'other' | null
  readonly submittedAt: string | null
}

export type PrimarieContactInfoValue = {
  readonly email: string | null
  readonly phone: string | null
  readonly submittedAt: string | null
}

export type CampaignInteractiveElementProps = {
  readonly ownerChallengeSlug: CivicOwnerChallengeSlug
  // Route entity context is authoritative for entity-scoped interaction keys.
  // Shared selectedEntityCui state is selector UX only and must not drive record identity.
  readonly entityCui: string
}
