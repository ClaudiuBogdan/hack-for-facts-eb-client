import type {
  CampaignChallengeDefinition,
  CampaignDefinition,
  CampaignLocale,
  CampaignSeoPageKind,
} from '../types'
import { getCampaignText } from '../hooks/use-campaign-content'

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
    '@id': `${params.siteUrl}/bugete-locale-2026#campaign`,
    additionalType: 'https://schema.org/Campaign',
    name: getCampaignText(params.campaign.title, params.locale),
    description: getCampaignText(params.campaign.description, params.locale),
    url: `${params.siteUrl}/bugete-locale-2026`,
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
      '@id': `${params.siteUrl}/bugete-locale-2026#campaign`,
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
  readonly challenge: CampaignChallengeDefinition
}): Record<string, unknown> {
  const langSuffix = params.locale === 'en' ? '?lang=en' : ''

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: params.locale === 'en' ? 'Campaign' : 'Campanie',
        item: `${params.siteUrl}/bugete-locale-2026${langSuffix}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: params.locale === 'en' ? 'Challenges' : 'Provocări',
        item: `${params.siteUrl}/bugete-locale-2026/challenges${langSuffix}`,
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
    challenge: params.challenge,
  })

  return [webPageEntity, campaignEntity, challengeEntity, breadcrumbList]
}
