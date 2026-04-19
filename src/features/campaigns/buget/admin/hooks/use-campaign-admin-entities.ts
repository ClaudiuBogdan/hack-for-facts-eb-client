import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  getCampaignAdminEntitiesMeta,
  listCampaignAdminEntities,
} from "@/features/campaigns/buget/admin/api/campaign-admin-entities";
import { CampaignAdminApiError } from "@/features/campaigns/buget/admin/api/campaign-admin-user-interactions";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntitiesFilters,
  CampaignAdminEntitiesListResponse,
  CampaignAdminEntitiesMetaResponse,
} from "@/features/campaigns/buget/admin/types";

export const campaignAdminEntitiesKeys = {
  all: ["campaign-admin"] as const,
  allForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey] as const,
  entitiesForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "entities"] as const,
  listsForCampaign: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "entities", "list"] as const,
  list: (
    campaignKey: CampaignAdminCampaignKey,
    filters: CampaignAdminEntitiesFilters,
    cursor: string | null,
    limit: number,
  ) =>
    [
      "campaign-admin",
      campaignKey,
      "entities",
      "list",
      filters,
      cursor ?? null,
      limit,
    ] as const,
  meta: (campaignKey: CampaignAdminCampaignKey) =>
    ["campaign-admin", campaignKey, "entities", "meta"] as const,
};

export function campaignAdminEntitiesQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminEntitiesFilters;
  readonly cursor: string | null;
  readonly limit: number;
  readonly enabled?: boolean;
}) {
  return queryOptions<
    CampaignAdminEntitiesListResponse,
    CampaignAdminApiError
  >({
    queryKey: campaignAdminEntitiesKeys.list(
      input.campaignKey,
      input.filters,
      input.cursor,
      input.limit,
    ),
    queryFn: async () =>
      listCampaignAdminEntities({
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

export function campaignAdminEntitiesMetaQueryOptions(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return queryOptions<
    CampaignAdminEntitiesMetaResponse,
    CampaignAdminApiError
  >({
    queryKey: campaignAdminEntitiesKeys.meta(input.campaignKey),
    queryFn: async () =>
      getCampaignAdminEntitiesMeta({
        campaignKey: input.campaignKey,
      }),
    enabled: input.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCampaignAdminEntitiesQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminEntitiesFilters;
  readonly cursor: string | null;
  readonly limit: number;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminEntitiesQueryOptions(input));
}

export function useCampaignAdminEntitiesMetaQuery(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly enabled?: boolean;
}) {
  return useQuery(campaignAdminEntitiesMetaQueryOptions(input));
}
