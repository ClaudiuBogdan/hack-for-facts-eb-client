import { describe, expect, it, vi } from "vitest";
import {
  campaignAdminUsersKeys,
  campaignAdminUsersMetaQueryOptions,
  campaignAdminUsersQueryOptions,
} from "./use-campaign-admin-users";

vi.mock("@/features/campaigns/buget/admin/api/campaign-admin-users", () => ({
  getCampaignAdminUsersMeta: vi.fn(),
  listCampaignAdminUsers: vi.fn(),
}));

describe("use-campaign-admin-users", () => {
  it("builds users list query options with the expected key and enabled flag", () => {
    const options = campaignAdminUsersQueryOptions({
      campaignKey: "funky",
      search: {
        query: "user-1",
        sortBy: "interactionCount",
        sortOrder: "asc",
        cursor: "cursor-1",
        limit: 25,
      },
      enabled: false,
    });

    expect(options.queryKey).toEqual(
      campaignAdminUsersKeys.list(
        "funky",
        {
          query: "user-1",
          sortBy: "interactionCount",
          sortOrder: "asc",
          cursor: "cursor-1",
          limit: 25,
        },
      ),
    );
    expect(options.enabled).toBe(false);
  });

  it("builds users meta query options with retries disabled", () => {
    const options = campaignAdminUsersMetaQueryOptions({
      campaignKey: "funky",
      enabled: false,
    });

    expect(options.queryKey).toEqual(campaignAdminUsersKeys.meta("funky"));
    expect(options.enabled).toBe(false);
    expect(options.retry).toBe(false);
  });
});
