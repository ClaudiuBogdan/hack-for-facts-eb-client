import { describe, expect, it, vi } from "vitest";
import {
  campaignAdminStatsInteractionsByTypeQueryOptions,
  campaignAdminStatsKeys,
  campaignAdminStatsOverviewQueryOptions,
  campaignAdminStatsTopEntitiesQueryOptions,
} from "./use-campaign-admin-stats";

vi.mock("@/features/campaigns/buget/admin/api/campaign-admin-stats", () => ({
  getCampaignAdminStatsInteractionsByType: vi.fn(),
  getCampaignAdminStatsOverview: vi.fn(),
  getCampaignAdminStatsTopEntities: vi.fn(),
}));

describe("use-campaign-admin-stats", () => {
  it("builds the overview query with the expected key and disabled flag", () => {
    const options = campaignAdminStatsOverviewQueryOptions({
      campaignKey: "funky",
      enabled: false,
    });

    expect(options.queryKey).toEqual(
      campaignAdminStatsKeys.overview("funky"),
    );
    expect(options.enabled).toBe(false);
  });

  it("configures staleTime, window-focus refetching, and retry policy", () => {
    const options = campaignAdminStatsOverviewQueryOptions({
      campaignKey: "funky",
    });

    expect(options.staleTime).toBe(60_000);
    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.retry).toBe(false);
  });

  it("builds the interactions-by-type query with the expected key", () => {
    const options = campaignAdminStatsInteractionsByTypeQueryOptions({
      campaignKey: "funky",
      enabled: false,
    });

    expect(options.queryKey).toEqual(
      campaignAdminStatsKeys.interactionsByType("funky"),
    );
    expect(options.enabled).toBe(false);
    expect(options.retry).toBe(false);
  });

  it("builds the top-entities query with sortBy and limit in the key", () => {
    const options = campaignAdminStatsTopEntitiesQueryOptions({
      campaignKey: "funky",
      sortBy: "userCount",
      limit: 5,
      enabled: false,
    });

    expect(options.queryKey).toEqual(
      campaignAdminStatsKeys.topEntities("funky", "userCount", 5),
    );
    expect(options.enabled).toBe(false);
    expect(options.staleTime).toBe(60_000);
    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.retry).toBe(false);
  });
});
