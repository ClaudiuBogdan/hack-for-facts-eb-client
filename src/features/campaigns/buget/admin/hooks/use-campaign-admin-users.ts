import { queryOptions, useQuery } from "@tanstack/react-query";
import { listCampaignAdminUsers } from "@/features/campaigns/buget/admin/api/campaign-admin-users";
import { CampaignAdminApiError } from "@/features/campaigns/buget/admin/api/campaign-admin-user-interactions";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminUsersListResponse,
  CampaignAdminUsersSearch,
} from "@/features/campaigns/buget/admin/types";

export const campaignAdminUsersKeys = {
  allForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "users"] as const,
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

export function useCampaignAdminUsersQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: Omit<CampaignAdminUsersSearch, "pageIndex">;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminUsersQueryOptions(input));
}
