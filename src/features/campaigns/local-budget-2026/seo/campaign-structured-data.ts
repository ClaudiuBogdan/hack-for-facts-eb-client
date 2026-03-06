import type {
  CampaignChallengeDefinition,
  CampaignDefinition,
  CampaignLocale,
  CampaignSeoPageKind,
} from '../types'
import { getCampaignText } from '../hooks/use-campaign-content'
import { buildCampaignProvocariPath } from '@/features/challenges/constants'

function getLanguageTag(locale: CampaignLocale): string {
  return locale === 'en' ? 'en-US' : 'ro-RO'
}

function buildCampaignEntity(params: {
  readonly siteUrl: string
  readonly campaign: CampaignDefinition
  readonly locale: CampaignLocale
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${params.siteUrl}/buget#campaign`,
    additionalType: 'https://schema.org/Campaign',
    name: getCampaignText(params.campaign.title, params.locale),
    description: getCampaignText(params.campaign.description, params.locale),
    url: `${params.siteUrl}/buget`,
    inLanguage: getLanguageTag(params.locale),
    publisher: {
      '@type': 'Organization',
      '@id': `${params.siteUrl}#organization`,
      name: 'Transparenta.eu',
      url: params.siteUrl,
    },
    startDate: params.campaign.startDate,
    endDate: params.campaign.endDate,
  }
}

function buildChallengeEntity(params: {
  readonly siteUrl: string
  readonly locale: CampaignLocale
  readonly canonicalUrl: string
  readonly challenge: CampaignChallengeDefinition
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${params.canonicalUrl}#challenge`,
    isPartOf: {
      '@id': `${params.siteUrl}/buget#campaign`,
    },
    name: getCampaignText(params.challenge.title, params.locale),
    description: getCampaignText(params.challenge.summary, params.locale),
    educationalLevel: params.challenge.difficulty,
    learningResourceType: 'civic challenge',
    inLanguage: getLanguageTag(params.locale),
    url: params.canonicalUrl,
  }
}

function buildChallengeBreadcrumbList(params: {
  readonly siteUrl: string
  readonly locale: CampaignLocale
  readonly canonicalUrl: string
  readonly entityCui?: string
  readonly challenge: CampaignChallengeDefinition
}): Record<string, unknown> {
  const langSuffix = params.locale === 'en' ? '?lang=en' : ''
  const provocariUrl = params.entityCui
    ? `${params.siteUrl}${buildCampaignProvocariPath(params.entityCui)}${langSuffix}`
    : `${params.siteUrl}/buget/cauta${langSuffix}`

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: params.locale === 'en' ? 'Campaign' : 'Campanie',
        item: `${params.siteUrl}/buget${langSuffix}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: params.locale === 'en' ? 'Challenges' : 'Provocări',
        item: provocariUrl,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: getCampaignText(params.challenge.title, params.locale),
        item: params.canonicalUrl,
      },
    ],
  }
}

function buildWebPageEntity(params: {
  readonly siteUrl: string
  readonly locale: CampaignLocale
  readonly canonicalUrl: string
  readonly title: string
  readonly description: string
  readonly pageKind: CampaignSeoPageKind
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: params.title,
    description: params.description,
    inLanguage: getLanguageTag(params.locale),
    url: params.canonicalUrl,
    isPartOf: params.siteUrl,
    about: params.pageKind === 'challenge-detail' ? 'Challenge detail page' : 'Campaign page',
  }
}

export function buildCampaignStructuredData(params: {
  readonly siteUrl: string
  readonly locale: CampaignLocale
  readonly canonicalUrl: string
  readonly title: string
  readonly description: string
  readonly pageKind: CampaignSeoPageKind
  readonly entityCui?: string
  readonly campaign: CampaignDefinition
  readonly challenge: CampaignChallengeDefinition | null
}): readonly Record<string, unknown>[] {
  const webPageEntity = buildWebPageEntity({
    siteUrl: params.siteUrl,
    locale: params.locale,
    canonicalUrl: params.canonicalUrl,
    title: params.title,
    description: params.description,
    pageKind: params.pageKind,
  })

  const campaignEntity = buildCampaignEntity({
    siteUrl: params.siteUrl,
    campaign: params.campaign,
    locale: params.locale,
  })

  if (params.pageKind !== 'challenge-detail' || !params.challenge) {
    return [webPageEntity, campaignEntity]
  }

  const challengeEntity = buildChallengeEntity({
    siteUrl: params.siteUrl,
    locale: params.locale,
    canonicalUrl: params.canonicalUrl,
    challenge: params.challenge,
  })

  const breadcrumbList = buildChallengeBreadcrumbList({
    siteUrl: params.siteUrl,
    locale: params.locale,
    canonicalUrl: params.canonicalUrl,
    entityCui: params.entityCui,
    challenge: params.challenge,
  })

  return [webPageEntity, campaignEntity, challengeEntity, breadcrumbList]
}
