import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  getCampaignAdminEntityConfig,
  listCampaignAdminEntityConfig,
  updateCampaignAdminEntityConfig,
} from "@/features/campaigns/buget/admin/api/campaign-admin-entity-config";
import { CampaignAdminApiError } from "@/features/campaigns/buget/admin/api/campaign-admin-user-interactions";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntityConfigDetail,
  CampaignAdminEntityConfigFilters,
  CampaignAdminEntityConfigListResponse,
  CampaignAdminUpdateEntityConfigBody,
} from "@/features/campaigns/buget/admin/types";

export const campaignAdminEntityConfigKeys = {
  all: ["campaign-admin", "entity-config"] as const,
  allForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "entity-config"] as const,
  listsForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "entity-config", "list"] as const,
  detailsForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "entity-config", "detail"] as const,
  list: (
    campaignKey: CampaignAdminCampaignKey,
    filters: CampaignAdminEntityConfigFilters,
    cursor: string | null,
    limit: number,
  ) =>
    [
      "campaign-admin",
      campaignKey,
      "entity-config",
      "list",
      filters,
      cursor ?? null,
      limit,
    ] as const,
  detail: (campaignKey: CampaignAdminCampaignKey, entityCui: string) =>
    ["campaign-admin", campaignKey, "entity-config", "detail", entityCui] as const,
};

export function campaignAdminEntityConfigListQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminEntityConfigFilters;
  readonly cursor: string | null;
  readonly limit: number;
  readonly enabled?: boolean;
}) {
  return queryOptions<
    CampaignAdminEntityConfigListResponse,
    CampaignAdminApiError
  >({
    queryKey: campaignAdminEntityConfigKeys.list(
      input.campaignKey,
      input.filters,
      input.cursor,
      input.limit,
    ),
    queryFn: async () =>
      listCampaignAdminEntityConfig({
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

export function campaignAdminEntityConfigDetailQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly entityCui: string;
  readonly enabled?: boolean;
}) {
  return queryOptions<CampaignAdminEntityConfigDetail, CampaignAdminApiError>({
    queryKey: campaignAdminEntityConfigKeys.detail(
      input.campaignKey,
      input.entityCui,
    ),
    queryFn: async () =>
      getCampaignAdminEntityConfig({
        campaignKey: input.campaignKey,
        entityCui: input.entityCui,
      }),
    enabled: input.enabled ?? true,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useCampaignAdminEntityConfigListQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminEntityConfigFilters;
  readonly cursor: string | null;
  readonly limit: number;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminEntityConfigListQueryOptions(input));
}

export function useCampaignAdminEntityConfigDetailQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly entityCui: string;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminEntityConfigDetailQueryOptions(input));
}

export function useUpdateCampaignAdminEntityConfigMutation(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly entityCui: string;
}): UseMutationResult<
  CampaignAdminEntityConfigDetail,
  CampaignAdminApiError,
  CampaignAdminUpdateEntityConfigBody
>;
export function useUpdateCampaignAdminEntityConfigMutation(
  campaignKey: CampaignAdminCampaignKey,
  entityCui: string,
): UseMutationResult<
  CampaignAdminEntityConfigDetail,
  CampaignAdminApiError,
  CampaignAdminUpdateEntityConfigBody
>;
export function useUpdateCampaignAdminEntityConfigMutation(
  campaignKeyOrInput:
    | CampaignAdminCampaignKey
    | {
        readonly campaignKey: CampaignAdminCampaignKey;
        readonly entityCui: string;
      },
  maybeEntityCui?: string,
): UseMutationResult<
  CampaignAdminEntityConfigDetail,
  CampaignAdminApiError,
  CampaignAdminUpdateEntityConfigBody
> {
  const campaignKey =
    typeof campaignKeyOrInput === "string"
      ? campaignKeyOrInput
      : campaignKeyOrInput.campaignKey;
  const entityCui =
    typeof campaignKeyOrInput === "string"
      ? (maybeEntityCui ?? "")
      : campaignKeyOrInput.entityCui;
  const queryClient = useQueryClient();

  return useMutation<
    CampaignAdminEntityConfigDetail,
    CampaignAdminApiError,
    CampaignAdminUpdateEntityConfigBody
  >({
    mutationFn: async (body) =>
      updateCampaignAdminEntityConfig({
        campaignKey,
        entityCui,
        body,
      }),
    onSuccess: async (updatedConfig) => {
      queryClient.setQueryData(
        campaignAdminEntityConfigKeys.detail(campaignKey, entityCui),
        updatedConfig,
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: campaignAdminEntityConfigKeys.listsForCampaign(campaignKey),
        }),
        queryClient.invalidateQueries({
          queryKey: campaignAdminEntityConfigKeys.detail(campaignKey, entityCui),
        }),
      ]);
    },
    onError: async (error) => {
      if (error.status === 404 || error.status === 409 || error.status === 502) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: campaignAdminEntityConfigKeys.listsForCampaign(campaignKey),
          }),
          queryClient.invalidateQueries({
            queryKey: campaignAdminEntityConfigKeys.detail(
              campaignKey,
              entityCui,
            ),
          }),
        ]);
      }
    },
  });
}
