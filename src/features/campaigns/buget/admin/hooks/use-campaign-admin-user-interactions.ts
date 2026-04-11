import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import {
  getCampaignAdminUserInteractionsMeta,
  listCampaignAdminUserInteractions,
  submitCampaignAdminReviews,
  type CampaignAdminApiError,
} from '@/features/campaigns/buget/admin/api/campaign-admin-user-interactions'
import type {
  CampaignAdminCampaignKey,
  CampaignAdminListResponse,
  CampaignAdminMetaResponse,
  CampaignAdminQueueFilters,
  CampaignAdminSubmitReviewsBody,
  CampaignAdminUserInteractionListItem,
} from '@/features/campaigns/buget/admin/types'

export const campaignAdminKeys = {
  all: ['campaign-admin'] as const,
  allForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ['campaign-admin', campaignKey] as const,
  queuesForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ['campaign-admin', campaignKey, 'queue'] as const,
  meta: (campaignKey: CampaignAdminCampaignKey) =>
    ['campaign-admin', campaignKey, 'meta'] as const,
  queue: (
    campaignKey: CampaignAdminCampaignKey,
    filters: CampaignAdminQueueFilters,
    cursor: string | null,
    limit: number
  ) =>
    ['campaign-admin', campaignKey, 'queue', filters, cursor ?? null, limit] as const,
}

function patchCampaignAdminQueueData(
  queryClient: QueryClient,
  campaignKey: CampaignAdminCampaignKey,
  updatedItems: readonly CampaignAdminUserInteractionListItem[]
) {
  const updatedItemsByKey = new Map<string, CampaignAdminUserInteractionListItem>(
    updatedItems.map((item) => [`${item.userId}::${item.recordKey}`, item])
  )

  queryClient.setQueriesData<CampaignAdminListResponse>(
    { queryKey: campaignAdminKeys.queuesForCampaign(campaignKey) },
    (previousData) => {
      if (previousData === undefined) {
        return previousData
      }

      let didChange = false
      const nextItems = previousData.items.map((item) => {
        const nextItem = updatedItemsByKey.get(`${item.userId}::${item.recordKey}`)
        if (nextItem === undefined) {
          return item
        }

        didChange = true
        return nextItem
      })

      if (!didChange) {
        return previousData
      }

      return {
        ...previousData,
        items: nextItems,
      }
    }
  )
}

export function campaignAdminQueueQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey
  readonly filters: CampaignAdminQueueFilters
  readonly cursor: string | null
  readonly limit: number
  readonly enabled?: boolean
}) {
  return queryOptions<CampaignAdminListResponse, CampaignAdminApiError>({
    queryKey: campaignAdminKeys.queue(
      input.campaignKey,
      input.filters,
      input.cursor,
      input.limit
    ),
    queryFn: async () =>
      listCampaignAdminUserInteractions({
        campaignKey: input.campaignKey,
        filters: input.filters,
        cursor: input.cursor,
        limit: input.limit,
      }),
    enabled: input.enabled ?? true,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })
}

export function campaignAdminMetaQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey
  readonly enabled?: boolean
}) {
  return queryOptions<CampaignAdminMetaResponse, CampaignAdminApiError>({
    queryKey: campaignAdminKeys.meta(input.campaignKey),
    queryFn: async () =>
      getCampaignAdminUserInteractionsMeta({
        campaignKey: input.campaignKey,
      }),
    enabled: input.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useCampaignAdminQueueQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey
  readonly filters: CampaignAdminQueueFilters
  readonly cursor: string | null
  readonly limit: number
  readonly enabled?: boolean
}) {
  return useQuery(campaignAdminQueueQueryOptions(input))
}

export function useCampaignAdminInteractionMetaQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey
  readonly enabled?: boolean
}) {
  return useQuery(campaignAdminMetaQueryOptions(input))
}

export function useSubmitCampaignAdminReviewsMutation(
  campaignKey: CampaignAdminCampaignKey
) {
  const queryClient = useQueryClient()

  return useMutation<
    readonly CampaignAdminUserInteractionListItem[],
    CampaignAdminApiError,
    CampaignAdminSubmitReviewsBody
  >({
    mutationFn: async (body) =>
      submitCampaignAdminReviews({
        campaignKey,
        body,
      }),
    onSuccess: async (updatedItems) => {
      patchCampaignAdminQueueData(queryClient, campaignKey, updatedItems)
      await queryClient.invalidateQueries({
        queryKey: campaignAdminKeys.allForCampaign(campaignKey),
      })
    },
    onError: async (error) => {
      if (error.status === 404 || error.status === 409) {
        await queryClient.invalidateQueries({
          queryKey: campaignAdminKeys.allForCampaign(campaignKey),
        })
      }
    },
  })
}
