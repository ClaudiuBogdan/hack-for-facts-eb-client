import type { CAMPAIGN_PROGRESS_SCHEMA_VERSION } from './constants'

export type CampaignLocale = 'ro' | 'en'

export type CampaignRouteSearch = {
  readonly lang?: CampaignLocale
}

export type CampaignPrincipalRouteSearch = CampaignRouteSearch & {
  readonly entityCui?: string
}

export type CampaignTranslatedString = {
  readonly ro: string
  readonly en?: string
}

export type CampaignChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced'

export type CampaignChallengeVerificationMode = 'automatic' | 'manual'

export type CampaignChallengeStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'completed'
  | 'locked'

export type CampaignDeadlineRule =
  | {
      readonly type: 'none'
    }
  | {
      readonly type: 'fixed_date'
      readonly date: string
    }
  | {
      readonly type: 'relative_to_timeline'
      readonly timelineEntryId: string
      readonly lockAfterDays: number
    }

export type CampaignDefinition = {
  readonly id: string
  readonly slug: string
  readonly title: CampaignTranslatedString
  readonly description: CampaignTranslatedString
  readonly seo?: {
    readonly title?: CampaignTranslatedString
    readonly description?: CampaignTranslatedString
  }
  readonly forumUrl: string
  readonly isActive: boolean
  readonly startDate: string
  readonly endDate: string
}

export type CampaignTimelineEntryDefinition = {
  readonly id: string
  readonly title: CampaignTranslatedString
  readonly description: CampaignTranslatedString
  readonly dayOffset: number
  readonly isActionable: boolean
}

export type CampaignTimelineDefinition = {
  readonly anchorDate: string
  readonly anchorLabel: CampaignTranslatedString
  readonly entries: readonly CampaignTimelineEntryDefinition[]
}

export type CampaignTimelineEntry = CampaignTimelineEntryDefinition & {
  readonly computedDate: string
  readonly isClosed: boolean
}

export type CampaignResourceKind = 'guide' | 'tutorial' | 'template' | 'reference'

export type CampaignResourceDefinition = {
  readonly id: string
  readonly title: CampaignTranslatedString
  readonly url: string
  readonly kind: CampaignResourceKind
}

export type CampaignChallengeDefinition = {
  readonly slug: string
  readonly title: CampaignTranslatedString
  readonly summary: CampaignTranslatedString
  readonly seoTitle?: CampaignTranslatedString
  readonly seoDescription?: CampaignTranslatedString
  readonly shareImage?: string
  readonly difficulty: CampaignChallengeDifficulty
  readonly verificationMode: CampaignChallengeVerificationMode
  readonly contentDir: string
  readonly resourceRefs: readonly string[]
  readonly deadlineRule: CampaignDeadlineRule
  readonly lockReasonTemplate: CampaignTranslatedString
}

export type CampaignSeoPageKind =
  | 'landing'
  | 'hub'
  | 'principal-selector'
  | 'challenges'
  | 'challenge-detail'
  | 'onboarding'
  | 'principal-map'

export type CampaignSeoImage = {
  readonly url: string
  readonly alt: string
  readonly width: number
  readonly height: number
}

export type CampaignSeoMetadata = {
  readonly title: string
  readonly description: string
  readonly canonicalUrl: string
  readonly robots: 'index,follow' | 'noindex,follow'
  readonly alternateUrls: {
    readonly ro: string
    readonly en: string
    readonly xDefault: string
  }
  readonly image: CampaignSeoImage
  readonly jsonLd: readonly Record<string, unknown>[]
}

export type CampaignChallengeProgress = {
  readonly status: CampaignChallengeStatus
  readonly updatedAt: string
  readonly attempts: number
}

export type UatCuiMapRow = {
  readonly cui: string
  readonly natcode: string
}

export type CampaignProgressSnapshot = {
  readonly version: typeof CAMPAIGN_PROGRESS_SCHEMA_VERSION
  readonly campaignId: string
  readonly onboardingCompletedAt: string | null
  readonly selectedLocality: string | null
  readonly selectedEntityCui: string | null
  readonly challenges: Readonly<Record<string, CampaignChallengeProgress>>
  readonly lastUpdated: string
}

export type CampaignAuthIntent = {
  readonly actionId: string
  readonly challengeSlug?: string
  readonly redirectTo: string
  readonly createdAt: string
}
