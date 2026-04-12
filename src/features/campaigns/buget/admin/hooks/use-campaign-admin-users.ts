import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  getCampaignAdminUsersMeta,
  listCampaignAdminUsers,
} from "@/features/campaigns/buget/admin/api/campaign-admin-users";
import { CampaignAdminApiError } from "@/features/campaigns/buget/admin/api/campaign-admin-user-interactions";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminUsersListResponse,
  CampaignAdminUsersMetaResponse,
  CampaignAdminUsersSearch,
} from "@/features/campaigns/buget/admin/types";

export const campaignAdminUsersKeys = {
  allForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "users"] as const,
  meta: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "users", "meta"] as const,
  list: (
    campaignKey: CampaignAdminCampaignKey,
    search: Omit<CampaignAdminUsersSearch, "pageIndex">,
  ) =>
    [
      "campaign-admin",
      campaignKey,
      "users",
      search.query ?? null,
      search.entityCui ?? null,
      search.sortBy ?? null,
      search.sortOrder ?? null,
      search.cursor ?? null,
      search.limit,
    ] as const,
};

export function campaignAdminUsersQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: Omit<CampaignAdminUsersSearch, "pageIndex">;
  readonly enabled?: boolean;
}) {
  return queryOptions<CampaignAdminUsersListResponse, CampaignAdminApiError>({
    queryKey: campaignAdminUsersKeys.list(input.campaignKey, input.search),
    queryFn: async () =>
      listCampaignAdminUsers({
        campaignKey: input.campaignKey,
        search: input.search,
      }),
    enabled: input.enabled ?? true,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function campaignAdminUsersMetaQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return queryOptions<CampaignAdminUsersMetaResponse, CampaignAdminApiError>({
    queryKey: campaignAdminUsersKeys.meta(input.campaignKey),
    queryFn: async () =>
      getCampaignAdminUsersMeta({
        campaignKey: input.campaignKey,
      }),
    enabled: input.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useCampaignAdminUsersQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: Omit<CampaignAdminUsersSearch, "pageIndex">;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminUsersQueryOptions(input));
}

export function useCampaignAdminUsersMetaQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminUsersMetaQueryOptions(input));
}
