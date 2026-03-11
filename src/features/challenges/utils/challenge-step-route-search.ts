import type { CampaignRouteSearch } from '@/features/campaigns/buget/types'

export type ChallengeStepRouteLoaderData = {
  readonly section?: CampaignRouteSearch['section']
  readonly view?: CampaignRouteSearch['view']
}

export function buildChallengeStepRouteLoaderData(
  search: Pick<CampaignRouteSearch, 'section' | 'view'>,
): ChallengeStepRouteLoaderData {
  return {
    section: search.section,
    view: search.view,
  }
}

export function resolveChallengeStepRouteSearch(params: {
  readonly search: Pick<CampaignRouteSearch, 'section' | 'view'>
  readonly loaderData: ChallengeStepRouteLoaderData
}): ChallengeStepRouteLoaderData {
  return {
    section: params.search.section ?? params.loaderData.section,
    view: params.search.view ?? params.loaderData.view,
  }
}
