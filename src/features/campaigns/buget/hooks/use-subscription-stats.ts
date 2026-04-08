import { useQuery } from '@tanstack/react-query'
import { getSubscriptionStats } from '../api/subscription-stats'

type UseSubscriptionStatsOptions = {
  readonly enabled?: boolean
}

export function useSubscriptionStats(
  campaignId: string | null | undefined,
  options: UseSubscriptionStatsOptions = {},
) {
  const query = useQuery({
    queryKey: ['campaign-subscription-stats', campaignId],
    queryFn: () => getSubscriptionStats(campaignId ?? ''),
    enabled: Boolean(campaignId) && (options.enabled ?? true),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  return {
    total: query.data?.total ?? 0,
    perUat: query.data?.perUat ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
