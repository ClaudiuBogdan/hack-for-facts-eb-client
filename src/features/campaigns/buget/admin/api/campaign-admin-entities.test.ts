import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadCampaignAdminEntitiesCsv,
  getCampaignAdminEntitiesMeta,
  listCampaignAdminEntities,
} from "./campaign-admin-entities";

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

function createEntitiesListPayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          entityCui: "12345678",
          entityName: "Oras Test",
          userCount: 4,
          interactionCount: 11,
          pendingReviewCount: 2,
          notificationSubscriberCount: 3,
          notificationOutboxCount: 5,
          failedNotificationCount: 1,
          latestInteractionAt: "2026-04-12T10:00:00.000Z",
          latestInteractionId: "funky:interaction:public_debate_request",
          latestNotificationAt: "2026-04-12T10:30:00.000Z",
          latestNotificationType: "funky:outbox:entity_update",
          latestNotificationStatus: "failed_permanent",
          hasPendingReviews: true,
          hasSubscribers: true,
          hasNotificationActivity: true,
          hasFailedNotifications: true,
        },
      ],
      page: {
        totalCount: 1,
        hasMore: true,
        nextCursor: "cursor-1",
        sortBy: "latestInteractionAt",
        sortOrder: "desc",
      },
    },
  };
}

function createEntitiesMetaPayload() {
  return {
    ok: true,
    data: {
      totalEntities: 18,
      entitiesWithPendingReviews: 5,
      entitiesWithSubscribers: 7,
      entitiesWithNotificationActivity: 9,
      entitiesWithFailedNotifications: 2,
      availableInteractionTypes: [
        {
          interactionId: "funky:interaction:public_debate_request",
          label: "Public debate request",
          reviewable: true,
        },
      ],
    },
  };
}

describe("campaign-admin-entities api", () => {
  beforeEach(() => {
    getAuthTokenMock.mockReset();
    vi.restoreAllMocks();
  });

  it("lists entities with auth and query parameters", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createEntitiesListPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listCampaignAdminEntities({
      campaignKey: "funky",
      filters: {
        query: "12345678",
        interactionId: "funky:interaction:public_debate_request",
        hasPendingReviews: true,
        hasSubscribers: true,
        hasNotificationActivity: true,
        hasFailedNotifications: false,
        latestNotificationType: "funky:outbox:entity_update",
        latestNotificationStatus: "failed_permanent",
        sortBy: "userCount",
        sortOrder: "asc",
      },
      cursor: "cursor-0",
      limit: 25,
    });

    expect(result.items).toHaveLength(1);
    expect(result.page.totalCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/admin/campaigns/funky/entities?query=12345678&interactionId=funky%3Ainteraction%3Apublic_debate_request&hasPendingReviews=true&hasSubscribers=true&hasNotificationActivity=true&hasFailedNotifications=false&latestNotificationType=funky%3Aoutbox%3Aentity_update&latestNotificationStatus=failed_permanent&sortBy=userCount&sortOrder=asc&cursor=cursor-0&limit=25",
      ),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("downloads the entities csv with auth and export filters", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("csv", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="entities.csv"',
        },
      }),
    );

    const result = await downloadCampaignAdminEntitiesCsv({
      campaignKey: "funky",
      filters: {
        query: "12345678",
        hasPendingReviews: true,
        sortBy: "userCount",
        sortOrder: "asc",
      },
    });

    expect(result.filename).toBe("entities.csv");
    expect(await result.blob.text()).toBe("csv");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/entities/export?query=12345678&hasPendingReviews=true&sortBy=userCount&sortOrder=asc",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("accepts unquoted filenames for entity csv downloads", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("csv", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=entities.csv",
        },
      }),
    );

    const result = await downloadCampaignAdminEntitiesCsv({
      campaignKey: "funky",
      filters: {},
    });

    expect(result.filename).toBe("entities.csv");
  });

  it("prefers RFC 5987 filenames for entity csv downloads", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("csv", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            "attachment; filename*=UTF-8''entities%20export.csv",
        },
      }),
    );

    const result = await downloadCampaignAdminEntitiesCsv({
      campaignKey: "funky",
      filters: {},
    });

    expect(result.filename).toBe("entities export.csv");
  });

  it("loads entities metadata from the dedicated meta endpoint", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createEntitiesMetaPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getCampaignAdminEntitiesMeta({
      campaignKey: "funky",
    });

    expect(result).toEqual(createEntitiesMetaPayload().data);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/entities/meta",
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
      listCampaignAdminEntities({
        campaignKey: "funky",
        filters: {},
        cursor: null,
        limit: 50,
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: "Sign in required for this campaign entities admin.",
    });
  });

  it("maps invalid JSON responses into CampaignAdminApiError", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>broken</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    await expect(
      getCampaignAdminEntitiesMeta({
        campaignKey: "funky",
      }),
    ).rejects.toMatchObject({
      status: 502,
      code: "invalid_json_response",
    });
  });
});
