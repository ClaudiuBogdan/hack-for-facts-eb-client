import type { CampaignLocale, CampaignSeoImage, CampaignSeoPageKind } from '../types'

const DEFAULT_IMAGE_WIDTH = 1200
const DEFAULT_IMAGE_HEIGHT = 630
const CAMPAIGN_SHARE_IMAGE_PATH = '/assets/images/campaigns/buget/share/funky-campaign.png'

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
  return {
    url: toAbsoluteImageUrl(params.siteUrl, CAMPAIGN_SHARE_IMAGE_PATH),
    alt: getShareAlt({ locale: params.locale }),
    width: DEFAULT_IMAGE_WIDTH,
    height: DEFAULT_IMAGE_HEIGHT,
  }
}
