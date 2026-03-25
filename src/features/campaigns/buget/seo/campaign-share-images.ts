import type { CampaignLocale, CampaignSeoImage, CampaignSeoPageKind } from '../types'

const DEFAULT_IMAGE_WIDTH = 1200
const DEFAULT_IMAGE_HEIGHT = 630
const CAMPAIGN_SHARE_IMAGE_BASE_PATH = '/assets/images/campaigns/buget/share'

const CAMPAIGN_SHARE_IMAGES = {
  landing: 'landing.png',
  hub: 'hub-1200x630.png',
  challenges: 'challenges-1200x630.png',
} as const

function toAbsoluteImageUrl(siteUrl: string, imagePathOrUrl: string): string {
  if (/^https?:\/\//.test(imagePathOrUrl)) {
    return imagePathOrUrl
  }

  const normalizedPath = imagePathOrUrl.startsWith('/') ? imagePathOrUrl : `/${imagePathOrUrl}`
  return `${siteUrl}${normalizedPath}`
}

function getShareAlt(params: {
  readonly locale: CampaignLocale
}): string {
  return params.locale === 'en'
    ? 'Eyes on Local Budgets campaign preview'
    : 'Previzualizare campanie Cu ochii pe bugetele locale'
}

export function buildCampaignShareImage(params: {
  readonly siteUrl: string
  readonly locale: CampaignLocale
  readonly pageKind: CampaignSeoPageKind
}): CampaignSeoImage {
  const pageImagePath = (() => {
    if (params.pageKind === 'landing') {
      return `${CAMPAIGN_SHARE_IMAGE_BASE_PATH}/${CAMPAIGN_SHARE_IMAGES.landing}`
    }

    if (params.pageKind === 'hub') {
      return `${CAMPAIGN_SHARE_IMAGE_BASE_PATH}/${CAMPAIGN_SHARE_IMAGES.hub}`
    }

    if (params.pageKind === 'principal-selector') {
      return `${CAMPAIGN_SHARE_IMAGE_BASE_PATH}/${CAMPAIGN_SHARE_IMAGES.hub}`
    }

    if (params.pageKind === 'principal-map') {
      return `${CAMPAIGN_SHARE_IMAGE_BASE_PATH}/${CAMPAIGN_SHARE_IMAGES.hub}`
    }

    if (params.pageKind === 'calendar') {
      return `${CAMPAIGN_SHARE_IMAGE_BASE_PATH}/${CAMPAIGN_SHARE_IMAGES.landing}`
    }

    return `${CAMPAIGN_SHARE_IMAGE_BASE_PATH}/${CAMPAIGN_SHARE_IMAGES.challenges}`
  })()

  return {
    url: toAbsoluteImageUrl(params.siteUrl, pageImagePath),
    alt: getShareAlt({ locale: params.locale }),
    width: DEFAULT_IMAGE_WIDTH,
    height: DEFAULT_IMAGE_HEIGHT,
  }
}
