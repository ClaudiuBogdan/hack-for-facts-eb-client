import { CAMPAIGN_BASE_PATH } from '@/features/campaigns/local-budget-2026/constants'
import type { ChallengeLocale } from './types'

export const CAMPAIGN_PROVOCARI_ROUTE = `${CAMPAIGN_BASE_PATH}/$cui/provocari`
export const CAMPAIGN_PROVOCARI_MODULE_ROUTE =
  `${CAMPAIGN_PROVOCARI_ROUTE}/$moduleSlug`
export const CAMPAIGN_PROVOCARI_STEP_ROUTE =
  `${CAMPAIGN_PROVOCARI_MODULE_ROUTE}/$challengeSlug/$stepSlug`
export const CAMPAIGN_PRIMARIE_ROUTE = `${CAMPAIGN_BASE_PATH}/$cui/primarie`
export const CHALLENGE_SELECTED_ENTITY_PICKER_PATH = `${CAMPAIGN_BASE_PATH}/cauta`
export const CHALLENGE_SELECTED_ENTITY_ANALYSIS_ROUTE = CAMPAIGN_PRIMARIE_ROUTE

export const CHALLENGES_DEFAULT_LOCALE: ChallengeLocale = 'ro'

function encodeRouteSegment(segment: string): string {
  return encodeURIComponent(segment.trim())
}

export function buildCampaignProvocariPath(cui: string): string {
  return `${CAMPAIGN_BASE_PATH}/${encodeRouteSegment(cui)}/provocari`
}

export function buildCampaignPrimariePath(cui: string): string {
  return `${CAMPAIGN_BASE_PATH}/${encodeRouteSegment(cui)}/primarie`
}

export function buildCampaignProvocariModulePath(
  cui: string,
  moduleSlug: string,
): string {
  return `${buildCampaignProvocariPath(cui)}/${encodeRouteSegment(moduleSlug)}`
}

export function buildCampaignProvocariStepPath(
  cui: string,
  moduleSlug: string,
  challengeSlug: string,
  stepSlug: string,
): string {
  return `${buildCampaignProvocariModulePath(cui, moduleSlug)}/${encodeRouteSegment(challengeSlug)}/${encodeRouteSegment(stepSlug)}`
}

export function resolveCampaignEntityCuiFromPathname(
  pathname: string,
): string | undefined {
  const parts = pathname.split('/').filter(Boolean)
  const campaignIndex = parts.indexOf('buget-primarie')
  const candidate = campaignIndex >= 0 ? parts[campaignIndex + 1] : undefined

  if (!candidate) {
    return undefined
  }

  const staticTopLevelRoutes = new Set([
    'calendar',
    'cauta',
    'forum',
  ])

  if (staticTopLevelRoutes.has(candidate)) {
    return undefined
  }

  return candidate
}
