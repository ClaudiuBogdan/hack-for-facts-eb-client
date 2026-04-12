import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  executeCampaignAdminNotificationTrigger,
  getCampaignAdminNotificationsMeta,
  getCampaignAdminNotificationTemplatePreview,
  listCampaignAdminNotificationTriggers,
  listCampaignAdminNotifications,
} from "./campaign-admin-notifications";

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

function createNotificationsListPayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          outboxId: "outbox-1",
          campaignKey: "funky",
          notificationType: "funky:outbox:entity_update",
          templateId: "public_debate_entity_update",
          templateName: "Entity update",
          templateVersion: "3",
          status: "delivered",
          createdAt: "2026-04-12T08:00:00.000Z",
          sentAt: "2026-04-12T08:02:00.000Z",
          attemptCount: 1,
          safeError: {
            category: null,
            code: null,
          },
          projection: {
            kind: "public_debate_entity_update",
            userId: "user-1",
            entityCui: "12345678",
            entityName: "Oras Test",
            threadId: "thread-1",
            threadKey: "thread-key-1",
            eventType: "reply_received",
            phase: "awaiting_reply",
            replyEntryId: null,
            basedOnEntryId: null,
            resolutionCode: null,
            triggerSource: "campaign_admin",
          },
        },
      ],
      page: {
        hasMore: true,
        nextCursor: "cursor-1",
      },
    },
  };
}

function createNotificationsMetaPayload() {
  return {
    ok: true,
    data: {
      pendingDeliveryCount: 3,
      failedDeliveryCount: 2,
      replyReceivedCount: 6,
    },
  };
}

function createTriggerCatalogPayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          triggerId: "public_debate_entity_update.reply_received",
          campaignKey: "funky",
          templateId: "public_debate_entity_update",
          description: "Queue the reply received notification.",
          inputFields: [
            {
              name: "threadId",
              type: "string",
              required: true,
            },
          ],
          targetKind: "thread",
        },
      ],
    },
  };
}

function createTriggerExecutionPayload() {
  return {
    ok: true,
    data: {
      triggerId: "public_debate_entity_update.reply_received",
      campaignKey: "funky",
      templateId: "public_debate_entity_update",
      result: {
        status: "queued",
        createdOutboxIds: ["outbox-1"],
        reusedOutboxIds: [],
        queuedOutboxIds: ["outbox-1"],
        enqueueFailedOutboxIds: [],
      },
    },
  };
}

function createTemplatePreviewPayload() {
  return {
    ok: true,
    data: {
      templateId: "public_debate_entity_update",
      name: "Entity update",
      version: "3",
      description: "Entity update email",
      requiredFields: [
        {
          name: "threadId",
          type: "string",
          required: true,
        },
      ],
      exampleSubject: "Reply received for Oras Test",
      html: "<html><body><h1>Preview</h1></body></html>",
      text: "Preview",
    },
  };
}

describe("campaign-admin-notifications api", () => {
  beforeEach(() => {
    getAuthTokenMock.mockReset();
    vi.restoreAllMocks();
  });

  it("lists audit rows with auth and query parameters", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createNotificationsListPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listCampaignAdminNotifications({
      campaignKey: "funky",
      filters: {
        notificationType: "funky:outbox:entity_update",
        userId: "user-1",
        status: "delivered",
        eventType: "reply_received",
        entityCui: "12345678",
        threadId: "thread-1",
        source: "campaign_admin",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
      cursor: "cursor-0",
      limit: 25,
    });

    expect(result.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/admin/campaigns/funky/notifications?notificationType=funky%3Aoutbox%3Aentity_update&userId=user-1&status=delivered&eventType=reply_received&entityCui=12345678&threadId=thread-1&source=campaign_admin&sortBy=createdAt&sortOrder=desc&cursor=cursor-0&limit=25",
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
      listCampaignAdminNotifications({
        campaignKey: "funky",
        filters: {},
        cursor: null,
        limit: 50,
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: "Sign in required for this campaign notifications admin.",
    });
  });

  it("loads notification metadata from the dedicated meta endpoint", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createNotificationsMetaPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getCampaignAdminNotificationsMeta({
      campaignKey: "funky",
    });

    expect(result).toEqual(createNotificationsMetaPayload().data);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/notifications/meta",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("posts trigger execution bodies with JSON headers", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createTriggerExecutionPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await executeCampaignAdminNotificationTrigger({
      campaignKey: "funky",
      triggerId: "public_debate_entity_update.reply_received",
      body: {
        threadId: "thread-1",
      },
    });

    expect(result.result.status).toBe("queued");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/admin/campaigns/funky/notifications/triggers/public_debate_entity_update.reply_received",
      ),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          threadId: "thread-1",
        }),
      }),
    );
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
      listCampaignAdminNotificationTriggers({
        campaignKey: "funky",
      }),
    ).rejects.toMatchObject({
      status: 502,
      code: "invalid_json_response",
    });
  });

  it("maps error envelopes for template preview failures", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: "NotFoundError",
          message: "Template preview not found",
          retryable: false,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      getCampaignAdminNotificationTemplatePreview({
        campaignKey: "funky",
        templateId: "missing-template",
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: "Template preview not found",
      retryable: false,
    });
  });

  it("loads the trigger catalog and template preview shapes", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(createTriggerCatalogPayload()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(createTemplatePreviewPayload()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const triggers = await listCampaignAdminNotificationTriggers({
      campaignKey: "funky",
    });
    const preview = await getCampaignAdminNotificationTemplatePreview({
      campaignKey: "funky",
      templateId: "public_debate_entity_update",
    });

    expect(triggers).toEqual(createTriggerCatalogPayload().data.items);
    expect(preview).toEqual(createTemplatePreviewPayload().data);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
