import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  appendCampaignAdminInstitutionThreadResponse,
  getCampaignAdminInstitutionThreadDetail,
  listCampaignAdminInstitutionThreads,
  type CampaignAdminApiError,
} from "@/features/campaigns/buget/admin/api/campaign-admin-institution-threads";
import type {
  CampaignAdminAppendInstitutionThreadResponseBody,
  CampaignAdminAppendInstitutionThreadResponseResult,
  CampaignAdminCampaignKey,
  CampaignAdminInstitutionThreadDetail,
  CampaignAdminInstitutionThreadsFilters,
  CampaignAdminInstitutionThreadsListResponse,
} from "@/features/campaigns/buget/admin/types";

export const campaignAdminInstitutionThreadsKeys = {
  all: ["campaign-admin", "institution-threads"] as const,
  allForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "institution-threads"] as const,
  threadsForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "institution-threads", "list"] as const,
  list: (
    campaignKey: CampaignAdminCampaignKey,
    filters: CampaignAdminInstitutionThreadsFilters,
    cursor: string | null,
    limit: number,
  ) =>
    [
      "campaign-admin",
      campaignKey,
      "institution-threads",
      "list",
      filters,
      cursor ?? null,
      limit,
    ] as const,
  detail: (campaignKey: CampaignAdminCampaignKey, threadId: string) =>
    [
      "campaign-admin",
      campaignKey,
      "institution-threads",
      "detail",
      threadId,
    ] as const,
};

export function campaignAdminInstitutionThreadsListQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminInstitutionThreadsFilters;
  readonly cursor: string | null;
  readonly limit: number;
  readonly enabled?: boolean;
}) {
  return queryOptions<
    CampaignAdminInstitutionThreadsListResponse,
    CampaignAdminApiError
  >({
    queryKey: campaignAdminInstitutionThreadsKeys.list(
      input.campaignKey,
      input.filters,
      input.cursor,
      input.limit,
    ),
    queryFn: async () =>
      listCampaignAdminInstitutionThreads({
        campaignKey: input.campaignKey,
        filters: input.filters,
        cursor: input.cursor,
        limit: input.limit,
      }),
    enabled: input.enabled ?? true,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function campaignAdminInstitutionThreadDetailQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly threadId: string;
  readonly enabled?: boolean;
}) {
  return queryOptions<CampaignAdminInstitutionThreadDetail, CampaignAdminApiError>(
    {
      queryKey: campaignAdminInstitutionThreadsKeys.detail(
        input.campaignKey,
        input.threadId,
      ),
      queryFn: async () =>
        getCampaignAdminInstitutionThreadDetail({
          campaignKey: input.campaignKey,
          threadId: input.threadId,
        }),
      enabled: input.enabled ?? true,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
    },
  );
}

export function useCampaignAdminInstitutionThreadsListQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminInstitutionThreadsFilters;
  readonly cursor: string | null;
  readonly limit: number;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminInstitutionThreadsListQueryOptions(input));
}

export function useCampaignAdminInstitutionThreadDetailQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly threadId: string;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminInstitutionThreadDetailQueryOptions(input));
}

export function useAppendCampaignAdminInstitutionThreadResponseMutation(
  campaignKey: CampaignAdminCampaignKey,
  threadId: string,
) {
  const queryClient = useQueryClient();

  return useMutation<
    CampaignAdminAppendInstitutionThreadResponseResult,
    CampaignAdminApiError,
    CampaignAdminAppendInstitutionThreadResponseBody
  >({
    mutationFn: async (body) =>
      appendCampaignAdminInstitutionThreadResponse({
        campaignKey,
        threadId,
        body,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: campaignAdminInstitutionThreadsKeys.threadsForCampaign(
            campaignKey,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: campaignAdminInstitutionThreadsKeys.detail(
            campaignKey,
            threadId,
          ),
        }),
      ]);
    },
    onError: async (error) => {
      if (error.status === 404 || error.status === 409 || error.status === 502) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: campaignAdminInstitutionThreadsKeys.threadsForCampaign(
              campaignKey,
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: campaignAdminInstitutionThreadsKeys.detail(
              campaignKey,
              threadId,
            ),
          }),
        ]);
      }
    },
  });
}
