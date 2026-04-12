import { describe, expect, it, vi } from "vitest";
import {
  campaignAdminEntitiesKeys,
  campaignAdminEntitiesMetaQueryOptions,
  campaignAdminEntitiesQueryOptions,
} from "./use-campaign-admin-entities";

vi.mock("@/features/campaigns/buget/admin/api/campaign-admin-entities", () => ({
  getCampaignAdminEntitiesMeta: vi.fn(),
  listCampaignAdminEntities: vi.fn(),
}));

describe("use-campaign-admin-entities", () => {
  it("builds entities list query options with the expected key and enabled flag", () => {
    const options = campaignAdminEntitiesQueryOptions({
      campaignKey: "funky",
      filters: {
        hasPendingReviews: true,
        sortBy: "userCount",
        sortOrder: "asc",
      },
      cursor: "cursor-1",
      limit: 25,
      enabled: false,
    });

    expect(options.queryKey).toEqual(
      campaignAdminEntitiesKeys.list(
        "funky",
        {
          hasPendingReviews: true,
          sortBy: "userCount",
          sortOrder: "asc",
        },
        "cursor-1",
        25,
      ),
    );
    expect(options.enabled).toBe(false);
  });

  it("builds entities meta query options with the expected key and enabled flag", () => {
    const options = campaignAdminEntitiesMetaQueryOptions({
      campaignKey: "funky",
      enabled: false,
    });

    expect(options.queryKey).toEqual(campaignAdminEntitiesKeys.meta("funky"));
    expect(options.enabled).toBe(false);
  });
});
