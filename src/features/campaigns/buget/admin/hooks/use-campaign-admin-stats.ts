import { queryOptions, useQuery } from "@tanstack/react-query";
import { CampaignAdminApiError } from "@/features/campaigns/buget/admin/api/campaign-admin-user-interactions";
import {
  getCampaignAdminStatsInteractionsByType,
  getCampaignAdminStatsOverview,
  getCampaignAdminStatsTopEntities,
} from "@/features/campaigns/buget/admin/api/campaign-admin-stats";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminStatsInteractionsByTypeResponse,
  CampaignAdminStatsOverview,
  CampaignAdminStatsTopEntitiesResponse,
  CampaignAdminStatsTopEntitiesSortBy,
} from "@/features/campaigns/buget/admin/types";

export const campaignAdminStatsKeys = {
  allForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "stats"] as const,
  overview: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "stats", "overview"] as const,
  interactionsByType: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "stats", "interactions-by-type"] as const,
  topEntities: (
    campaignKey: CampaignAdminCampaignKey,
    sortBy: CampaignAdminStatsTopEntitiesSortBy,
    limit: number,
  ) =>
    [
      "campaign-admin",
      campaignKey,
      "stats",
      "entities",
      "top",
      sortBy,
      limit,
    ] as const,
};

export function campaignAdminStatsOverviewQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return queryOptions<CampaignAdminStatsOverview, CampaignAdminApiError>({
    queryKey: campaignAdminStatsKeys.overview(input.campaignKey),
    queryFn: async () =>
      getCampaignAdminStatsOverview({
        campaignKey: input.campaignKey,
      }),
    enabled: input.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useCampaignAdminStatsOverviewQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminStatsOverviewQueryOptions(input));
}

export function campaignAdminStatsInteractionsByTypeQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return queryOptions<
    CampaignAdminStatsInteractionsByTypeResponse,
    CampaignAdminApiError
  >({
    queryKey: campaignAdminStatsKeys.interactionsByType(input.campaignKey),
    queryFn: async () =>
      getCampaignAdminStatsInteractionsByType({
        campaignKey: input.campaignKey,
      }),
    enabled: input.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useCampaignAdminStatsInteractionsByTypeQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminStatsInteractionsByTypeQueryOptions(input));
}

export function campaignAdminStatsTopEntitiesQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly sortBy: CampaignAdminStatsTopEntitiesSortBy;
  readonly limit?: number;
  readonly enabled?: boolean;
}) {
  const limit = input.limit ?? 10;

  return queryOptions<
    CampaignAdminStatsTopEntitiesResponse,
    CampaignAdminApiError
  >({
    queryKey: campaignAdminStatsKeys.topEntities(
      input.campaignKey,
      input.sortBy,
      limit,
    ),
    queryFn: async () =>
      getCampaignAdminStatsTopEntities({
        campaignKey: input.campaignKey,
        sortBy: input.sortBy,
        limit,
      }),
    enabled: input.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useCampaignAdminStatsTopEntitiesQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly sortBy: CampaignAdminStatsTopEntitiesSortBy;
  readonly limit?: number;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminStatsTopEntitiesQueryOptions(input));
}
