import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCampaignAdminStatsInteractionsByType,
  getCampaignAdminStatsOverview,
  getCampaignAdminStatsTopEntities,
} from "./campaign-admin-stats";

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

function createStatsOverviewResponsePayload() {
  return {
    ok: true,
    data: {
      coverage: {
        hasClientTelemetry: false,
        hasNotificationAttribution: false,
      },
      users: {
        totalUsers: 14,
        usersWithPendingReviews: 4,
      },
      interactions: {
        totalInteractions: 20,
        interactionsWithInstitutionThread: 6,
        reviewStatusCounts: {
          pending: 5,
          approved: 8,
          rejected: 4,
          notReviewed: 3,
        },
        phaseCounts: {
          idle: 1,
          draft: 2,
          pending: 5,
          resolved: 10,
          failed: 2,
        },
        threadPhaseCounts: {
          sending: 1,
          awaitingReply: 2,
          replyReceivedUnreviewed: 1,
          manualFollowUpNeeded: 1,
          resolvedPositive: 2,
          resolvedNegative: 1,
          closedNoResponse: 1,
          failed: 1,
          none: 10,
        },
      },
      entities: {
        totalEntities: 12,
        entitiesWithPendingReviews: 4,
        entitiesWithSubscribers: 6,
        entitiesWithNotificationActivity: 7,
        entitiesWithFailedNotifications: 2,
      },
      notifications: {
        pendingDeliveryCount: 3,
        failedDeliveryCount: 2,
        deliveredCount: 18,
        openedCount: 11,
        clickedCount: 5,
        suppressedCount: 1,
      },
    },
  };
}

function createStatsInteractionsByTypeResponsePayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          interactionId: "funky:interaction:public_debate_request",
          label: "Public debate request",
          total: 12,
          pending: 3,
          approved: 5,
          rejected: 2,
          notReviewed: 2,
        },
        {
          interactionId: "funky:interaction:budget_document",
          label: null,
          total: 7,
          pending: 2,
          approved: 3,
          rejected: 1,
          notReviewed: 1,
        },
      ],
    },
  };
}

function createStatsTopEntitiesResponsePayload() {
  return {
    ok: true,
    data: {
      sortBy: "interactionCount",
      limit: 5,
      items: [
        {
          entityCui: "12345678",
          entityName: "Oras Test",
          interactionCount: 12,
          userCount: 6,
          pendingReviewCount: 3,
        },
        {
          entityCui: "87654321",
          entityName: null,
          interactionCount: 9,
          userCount: 5,
          pendingReviewCount: 2,
        },
      ],
    },
  };
}

describe("campaign-admin-stats api", () => {
  beforeEach(() => {
    getAuthTokenMock.mockReset();
    vi.restoreAllMocks();
  });

  it("loads the stats overview from the dedicated endpoint", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createStatsOverviewResponsePayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getCampaignAdminStatsOverview({
      campaignKey: "funky",
    });

    expect(result).toEqual(createStatsOverviewResponsePayload().data);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/stats/overview",
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
      getCampaignAdminStatsOverview({
        campaignKey: "funky",
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: "Sign in required for this campaign analytics view.",
    });
  });

  it("maps 403 responses into CampaignAdminApiError", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: "ForbiddenError",
          message: "Forbidden",
          retryable: false,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      getCampaignAdminStatsOverview({
        campaignKey: "funky",
      }),
    ).rejects.toMatchObject({
      status: 403,
      message: "Forbidden",
      retryable: false,
    });
  });

  it("maps 404 responses into CampaignAdminApiError", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: "NotFoundError",
          message: "Campaign admin stats not found",
          retryable: false,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      getCampaignAdminStatsOverview({
        campaignKey: "funky",
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: "Campaign admin stats not found",
      retryable: false,
    });
  });

  it("rejects invalid JSON from the overview endpoint", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{invalid-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      getCampaignAdminStatsOverview({
        campaignKey: "funky",
      }),
    ).rejects.toMatchObject({
      status: 502,
      code: "invalid_json_response",
      message: "Campaign admin server returned invalid JSON.",
    });
  });

  it("rejects responses that do not match the strict overview schema", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            coverage: {
              hasClientTelemetry: false,
              hasNotificationAttribution: false,
            },
            users: {
              totalUsers: 14,
              usersWithPendingReviews: 4,
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      getCampaignAdminStatsOverview({
        campaignKey: "funky",
      }),
    ).rejects.toMatchObject({
      status: 502,
      code: "invalid_response",
      message: "Campaign analytics response was invalid.",
    });
  });

  it("loads ranked interaction analytics from the dedicated endpoint", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createStatsInteractionsByTypeResponsePayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getCampaignAdminStatsInteractionsByType({
      campaignKey: "funky",
    });

    expect(result).toEqual(createStatsInteractionsByTypeResponsePayload().data);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/stats/interactions/by-type",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("loads top entities analytics with sortBy and limit query parameters", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createStatsTopEntitiesResponsePayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getCampaignAdminStatsTopEntities({
      campaignKey: "funky",
      sortBy: "interactionCount",
      limit: 5,
    });

    expect(result).toEqual(createStatsTopEntitiesResponsePayload().data);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/stats/entities/top?sortBy=interactionCount&limit=5",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("maps 400 top-entities validation errors into CampaignAdminApiError", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: "ValidationError",
          message: "Invalid stats top-entities query",
          retryable: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      getCampaignAdminStatsTopEntities({
        campaignKey: "funky",
        sortBy: "interactionCount",
        limit: 99,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid stats top-entities query",
      retryable: false,
    });
  });
});
