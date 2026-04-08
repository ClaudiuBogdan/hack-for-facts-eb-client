import { useQuery } from '@tanstack/react-query'
import { getCampaignUatDirectory } from '../api/subscription-stats'

type UseCampaignUatDirectoryOptions = {
  readonly enabled?: boolean
}

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000
const ONE_WEEK_IN_MS = 7 * ONE_DAY_IN_MS

export function useCampaignUatDirectory(
  options: UseCampaignUatDirectoryOptions = {},
) {
  return useQuery({
    queryKey: ['campaign-uat-directory'],
    queryFn: getCampaignUatDirectory,
    staleTime: ONE_DAY_IN_MS,
    gcTime: ONE_WEEK_IN_MS,
    refetchOnWindowFocus: false,
    enabled: options.enabled ?? true,
  })
}
