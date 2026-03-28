import type { CAMPAIGN_PROGRESS_SCHEMA_VERSION } from './constants'

export type CampaignLocale = 'ro' | 'en'

export type CampaignRouteSearch = {
  readonly lang?: CampaignLocale
  readonly redirectUri?: string
  readonly section?: string
  readonly view?: 'section' | 'article'
}

export type CampaignCalendarRouteSearch = CampaignRouteSearch

export type CampaignTranslatedString = {
  readonly ro: string
  readonly en?: string
}

export type CampaignChallengeStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'completed'
  | 'locked'

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
  readonly relativeTo?: string
  readonly relativeDayOffset?: number
}

export type CampaignTimelineDefinition = {
  readonly anchorDate: string
  readonly anchorLabel: CampaignTranslatedString
  readonly entries: readonly CampaignTimelineEntryDefinition[]
}

export type CampaignTimelineEntry = CampaignTimelineEntryDefinition & {
  readonly computedDate: string
  readonly isClosed: boolean
  readonly isEstimated: boolean
}

/** Per-entry override for a specific UAT: maps entry ID → date string. */
export type CampaignUatCalendarOverride = Readonly<Record<string, string>>

/** Raw overrides file: maps entry ID → CUI → date string. */
export type CampaignUatCalendarOverridesFile = Readonly<
  Record<string, Readonly<Record<string, string>>>
>

export type CampaignResourceKind = 'guide' | 'tutorial' | 'template' | 'reference'

export type CampaignResourceDefinition = {
  readonly id: string
  readonly title: CampaignTranslatedString
  readonly description?: CampaignTranslatedString
  readonly url: string
  readonly kind: CampaignResourceKind
}

export type CampaignSeoPageKind =
  | 'landing'
  | 'hub'
  | 'principal-selector'
  | 'challenges'
  | 'primarie'
  | 'principal-map'
  | 'calendar'
  | 'resources'

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
  readonly acceptedTermsAt: string | null
  readonly selectedLocality: string | null
  // Shared selector/navigation hint only. Route pages must use the route cui
  // as the source of truth for entity-scoped interaction identity.
  readonly selectedEntityCui: string | null
  readonly activeChallengeModuleSlug: string | null
  readonly challenges: Readonly<Record<string, CampaignChallengeProgress>>
  readonly lastUpdated: string
}
