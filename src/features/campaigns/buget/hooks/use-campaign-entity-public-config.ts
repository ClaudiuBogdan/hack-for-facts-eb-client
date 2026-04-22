import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import {
  CampaignEntityPublicConfigApiError,
  getCampaignEntityPublicConfig,
} from '../api/campaign-entity-public-config'

type UseCampaignEntityPublicConfigOptions = {
  readonly enabled?: boolean
}

export function useCampaignEntityPublicConfig(
  campaignKey: string | null | undefined,
  entityCui: string | null | undefined,
  options: UseCampaignEntityPublicConfigOptions = {},
) {
  const { isEnabled, isLoaded, isSignedIn } = useAuth()

  return useQuery({
    queryKey: ['campaign-entity-public-config', campaignKey, entityCui],
    queryFn: () =>
      getCampaignEntityPublicConfig({
        campaignKey: campaignKey ?? '',
        entityCui: entityCui ?? '',
      }),
    enabled:
      Boolean(campaignKey)
      && Boolean(entityCui)
      && (options.enabled ?? true)
      && isEnabled
      && isLoaded
      && isSignedIn,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (
        error instanceof CampaignEntityPublicConfigApiError
        && [401, 403, 404].includes(error.status)
      ) {
        return false
      }

      return failureCount < 1
    },
  })
}
