import type { CampaignLocale, CampaignSeoImage, CampaignSeoPageKind } from '../types'

const DEFAULT_IMAGE_WIDTH = 1200
const DEFAULT_IMAGE_HEIGHT = 630
const CAMPAIGN_SHARE_IMAGE_BASE_PATH = '/assets/images/campaigns/bugete-locale-2026/share'

const CAMPAIGN_SHARE_IMAGES = {
  landing: 'landing.png',
  hub: 'hub-1200x630.png',
  challenges: 'challenges-1200x630.png',
  challengeDetailFallback: 'challenge-default-1200x630.png',
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
  readonly pageKind: CampaignSeoPageKind
  readonly challengeTitle?: string
}): string {
  if (params.pageKind === 'challenge-detail') {
    if (params.challengeTitle) {
      return params.locale === 'en'
        ? `Challenge preview: ${params.challengeTitle}`
        : `Previzualizare provocare: ${params.challengeTitle}`
    }

    return params.locale === 'en'
      ? 'Challenge preview for Local Budgets 2026'
      : 'Previzualizare provocare pentru Bugete Locale 2026'
  }

  return params.locale === 'en'
    ? 'Local Budgets 2026 campaign preview'
    : 'Previzualizare campanie Bugete Locale 2026'
}

export function buildCampaignShareImage(params: {
  readonly siteUrl: string
  readonly locale: CampaignLocale
  readonly pageKind: CampaignSeoPageKind
  readonly challengeTitle?: string
  readonly challengeShareImage?: string
}): CampaignSeoImage {
  const fallbackImagePath = `${CAMPAIGN_SHARE_IMAGE_BASE_PATH}/${CAMPAIGN_SHARE_IMAGES.challengeDetailFallback}`

  const pageImagePath = (() => {
    if (params.pageKind === 'challenge-detail') {
      return params.challengeShareImage ?? fallbackImagePath
    }

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

    if (params.pageKind === 'onboarding') {
      return `${CAMPAIGN_SHARE_IMAGE_BASE_PATH}/${CAMPAIGN_SHARE_IMAGES.hub}`
    }

    if (params.pageKind === 'calendar') {
      return `${CAMPAIGN_SHARE_IMAGE_BASE_PATH}/${CAMPAIGN_SHARE_IMAGES.landing}`
    }

    return `${CAMPAIGN_SHARE_IMAGE_BASE_PATH}/${CAMPAIGN_SHARE_IMAGES.challenges}`
  })()

  return {
    url: toAbsoluteImageUrl(params.siteUrl, pageImagePath),
    alt: getShareAlt(params),
    width: DEFAULT_IMAGE_WIDTH,
    height: DEFAULT_IMAGE_HEIGHT,
  }
}
