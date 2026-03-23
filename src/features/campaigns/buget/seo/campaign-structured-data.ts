import type {
  CampaignDefinition,
  CampaignLocale,
} from '../types'
import { getCampaignText } from '../hooks/use-campaign-content'
import { CAMPAIGN_LANDING_PATH } from '../constants'

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
    '@id': `${params.siteUrl}${CAMPAIGN_LANDING_PATH}#campaign`,
    additionalType: 'https://schema.org/Campaign',
    name: getCampaignText(params.campaign.title, params.locale),
    description: getCampaignText(params.campaign.description, params.locale),
    url: `${params.siteUrl}${CAMPAIGN_LANDING_PATH}`,
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

function buildWebPageEntity(params: {
  readonly siteUrl: string
  readonly locale: CampaignLocale
  readonly canonicalUrl: string
  readonly title: string
  readonly description: string
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: params.title,
    description: params.description,
    inLanguage: getLanguageTag(params.locale),
    url: params.canonicalUrl,
    isPartOf: params.siteUrl,
    about: 'Campaign page',
  }
}

export function buildCampaignStructuredData(params: {
  readonly siteUrl: string
  readonly locale: CampaignLocale
  readonly canonicalUrl: string
  readonly title: string
  readonly description: string
  readonly campaign: CampaignDefinition
}): readonly Record<string, unknown>[] {
  const webPageEntity = buildWebPageEntity({
    siteUrl: params.siteUrl,
    locale: params.locale,
    canonicalUrl: params.canonicalUrl,
    title: params.title,
    description: params.description,
  })

  const campaignEntity = buildCampaignEntity({
    siteUrl: params.siteUrl,
    campaign: params.campaign,
    locale: params.locale,
  })

  return [webPageEntity, campaignEntity]
}
