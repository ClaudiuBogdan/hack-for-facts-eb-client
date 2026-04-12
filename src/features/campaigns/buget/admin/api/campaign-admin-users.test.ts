import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCampaignAdminUsers } from "./campaign-admin-users";

const getAuthTokenMock = vi.fn<() => Promise<string | null>>();

vi.mock("@/config/env", async () => {
  return {
    env: {
      VITE_APP_ENVIRONMENT: "test",
    },
    getApiBaseUrl: () => "http://localhost:3000",
  };
});

vi.mock("@/lib/auth", () => ({
  getAuthToken: () => getAuthTokenMock(),
}));

function createUsersListResponsePayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          userId: "user-1",
          interactionCount: 3,
          pendingReviewCount: 1,
          latestUpdatedAt: "2026-04-10T10:00:00.000Z",
          latestInteractionId: "funky:interaction:public_debate_request",
          latestEntityCui: "12345678",
          latestEntityName: "Oras Test",
        },
      ],
      page: {
        hasMore: true,
        nextCursor: "cursor-1",
        sortBy: "latestUpdatedAt",
        sortOrder: "desc",
      },
    },
  };
}

describe("campaign-admin-users api", () => {
  beforeEach(() => {
    getAuthTokenMock.mockReset();
    vi.restoreAllMocks();
  });

  it("lists users with auth and query parameters", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createUsersListResponsePayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listCampaignAdminUsers({
      campaignKey: "funky",
      search: {
        query: "user-1",
        sortBy: "interactionCount",
        sortOrder: "asc",
        cursor: "cursor-0",
        limit: 25,
      },
    });

    expect(result.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/admin/campaigns/funky/users?query=user-1&sortBy=interactionCount&sortOrder=asc&cursor=cursor-0&limit=25",
      ),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("fails with 401 before fetching when auth is missing", async () => {
    getAuthTokenMock.mockResolvedValue(null);

    await expect(
      listCampaignAdminUsers({
        campaignKey: "funky",
        search: {
          sortBy: "latestUpdatedAt",
          sortOrder: "desc",
          limit: 50,
        },
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: "Sign in required for this campaign users directory.",
    });
  });

  it("maps invalid cursors into CampaignAdminApiError", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: "ValidationError",
          message: "Invalid campaign user cursor",
          retryable: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      listCampaignAdminUsers({
        campaignKey: "funky",
        search: {
          cursor: "bad-cursor",
          sortBy: "latestUpdatedAt",
          sortOrder: "desc",
          limit: 50,
        },
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid campaign user cursor",
      retryable: false,
    });
  });
});
