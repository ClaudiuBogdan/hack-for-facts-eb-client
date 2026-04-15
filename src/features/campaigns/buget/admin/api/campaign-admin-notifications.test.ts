import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCampaignAdminNotificationDryRunPlan,
  getCampaignAdminNotificationPlanPage,
  getCampaignAdminNotificationTemplatePreview,
  listCampaignAdminNotifications,
  listCampaignAdminNotificationTemplates,
  listCampaignAdminRunnableTemplates,
  sendCampaignAdminNotificationPlan,
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
      items: [],
      page: {
        hasMore: false,
        nextCursor: null,
      },
    },
  };
}

function createRunnableTemplatesPayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          runnableId: "admin_reviewed_user_interaction",
          campaignKey: "funky",
          templateId: "admin_reviewed_user_interaction",
          templateVersion: "1",
          description: "Reviewed interaction admin email",
          targetKind: "user",
          selectors: [
            {
              name: "userId",
              type: "string",
              required: false,
            },
          ],
          filters: [
            {
              name: "reviewStatus",
              type: "enum",
              required: false,
            },
          ],
          dryRunRequired: true,
          maxPlanRowCount: 500,
          defaultPageSize: 25,
          maxPageSize: 100,
        },
      ],
    },
  };
}

function createPlanPayload() {
  return {
    ok: true,
    data: {
      planId: "plan-1",
      runnableId: "admin_reviewed_user_interaction",
      templateId: "admin_reviewed_user_interaction",
      watermark: "2026-04-14T12:00:00.000Z",
      summary: {
        totalRowCount: 2,
        willSendCount: 1,
        alreadySentCount: 1,
        alreadyPendingCount: 0,
        ineligibleCount: 0,
        missingDataCount: 0,
      },
      rows: [
        {
          rowKey: "row-1",
          userId: "user-1",
          entityCui: "12345678",
          entityName: "Entity One",
          recordKey: "record-1",
          interactionId: "budget_document",
          interactionLabel: "Budget document",
          reviewStatus: "approved",
          reviewedAt: "2026-04-12T08:00:00.000Z",
          status: "will_send",
          reasonCode: "eligible",
          statusMessage: "Matches all conditions and is ready to send.",
          hasExistingDelivery: false,
          existingDeliveryStatus: null,
          sendMode: "create",
        },
      ],
      page: {
        hasMore: true,
        nextCursor: "cursor-2",
      },
    },
  };
}

function createSendPayload() {
  return {
    ok: true,
    data: {
      planId: "plan-1",
      runnableId: "admin_reviewed_user_interaction",
      templateId: "admin_reviewed_user_interaction",
      evaluatedCount: 2,
      queuedCount: 1,
      alreadySentCount: 1,
      alreadyPendingCount: 0,
      ineligibleCount: 0,
      missingDataCount: 0,
      enqueueFailedCount: 0,
    },
  };
}

function createTemplatePreviewPayload() {
  return {
    ok: true,
    data: {
      templateId: "admin_reviewed_user_interaction",
      name: "Admin reviewed interaction",
      version: "1",
      description: "Reviewed interaction admin email",
      requiredFields: [],
      exampleSubject: "Reviewed interaction",
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

    await listCampaignAdminNotifications({
      campaignKey: "funky",
      filters: {
        status: "delivered",
        entityCui: "12345678",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
      cursor: "cursor-0",
      limit: 25,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/admin/campaigns/funky/notifications?status=delivered&entityCui=12345678&sortBy=createdAt&sortOrder=desc&cursor=cursor-0&limit=25",
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

  it("loads runnable templates from the new runnable endpoint", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createRunnableTemplatesPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listCampaignAdminRunnableTemplates({
      campaignKey: "funky",
    });

    expect(result).toEqual(createRunnableTemplatesPayload().data.items);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/notifications/runnable-templates",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("posts dry-run payloads and parses the stored plan response", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createPlanPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await createCampaignAdminNotificationDryRunPlan({
      campaignKey: "funky",
      runnableId: "admin_reviewed_user_interaction",
      body: {
        selectors: {
          userId: "user-1",
        },
        filters: {
          reviewStatus: "approved",
        },
      },
    });

    expect(result.planId).toBe("plan-1");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/admin/campaigns/funky/notifications/runnable-templates/admin_reviewed_user_interaction/dry-run",
      ),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          selectors: {
            userId: "user-1",
          },
          filters: {
            reviewStatus: "approved",
          },
        }),
      }),
    );
  });

  it("loads stored plan pages with cursor and limit query parameters", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createPlanPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getCampaignAdminNotificationPlanPage({
      campaignKey: "funky",
      planId: "plan-1",
      cursor: "cursor-2",
      limit: 25,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/admin/campaigns/funky/notifications/plans/plan-1?cursor=cursor-2&limit=25",
      ),
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("posts plan sends without a request body and parses mixed send counts", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createSendPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await sendCampaignAdminNotificationPlan({
      campaignKey: "funky",
      planId: "plan-1",
    });

    expect(result.queuedCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/admin/campaigns/funky/notifications/plans/plan-1/send",
      ),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
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
      listCampaignAdminRunnableTemplates({
        campaignKey: "funky",
      }),
    ).rejects.toMatchObject({
      status: 502,
      code: "invalid_json_response",
    });
  });

  it("loads preview templates separately from runnable templates", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              items: [
                {
                  templateId: "admin_reviewed_user_interaction",
                  name: "Admin reviewed interaction",
                  version: "1",
                  description: "Reviewed interaction admin email",
                  requiredFields: [],
                },
              ],
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(createTemplatePreviewPayload()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const templates = await listCampaignAdminNotificationTemplates({
      campaignKey: "funky",
    });
    const preview = await getCampaignAdminNotificationTemplatePreview({
      campaignKey: "funky",
      templateId: "admin_reviewed_user_interaction",
    });

    expect(templates).toEqual([
      {
        templateId: "admin_reviewed_user_interaction",
        name: "Admin reviewed interaction",
        version: "1",
        description: "Reviewed interaction admin email",
        requiredFields: [],
      },
    ]);
    expect(preview).toEqual(createTemplatePreviewPayload().data);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps error envelopes for preview failures", async () => {
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
});
