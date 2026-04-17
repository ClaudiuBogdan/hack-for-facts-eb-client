import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendCampaignAdminInstitutionThreadResponse,
  getCampaignAdminInstitutionThreadDetail,
  listCampaignAdminInstitutionThreads,
} from "./campaign-admin-institution-threads";

const getAuthTokenMock = vi.fn<() => Promise<string | null>>();

vi.mock("@/config/env", async () => ({
  env: {
    VITE_APP_ENVIRONMENT: "test",
  },
  getApiBaseUrl: () => "http://localhost:3000",
}));

vi.mock("@/lib/auth", () => ({
  getAuthToken: () => getAuthTokenMock(),
}));

function createThreadListPayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          id: "thread-1",
          entityCui: "12345678",
          entityName: "Oras Test",
          campaignKey: "funky",
          submissionPath: "platform_send",
          ownerUserId: "user-1",
          institutionEmail: "contact@primarie.ro",
          subject: "Public debate request",
          threadState: "pending",
          currentResponseStatus: "registration_number_received",
          createdAt: "2026-04-10T10:00:00.000Z",
          updatedAt: "2026-04-12T10:00:00.000Z",
          latestResponseAt: "2026-04-12T09:00:00.000Z",
          responseEventCount: 2,
          notificationAudience: {
            requesterCount: 1,
            subscriberCount: 3,
            eligibleRequesterCount: 1,
            eligibleSubscriberCount: 2,
          },
        },
      ],
      page: {
        limit: 25,
        totalCount: 1,
        hasMore: true,
        nextCursor: "cursor-1",
        sortBy: "updatedAt",
        sortOrder: "desc",
      },
    },
  };
}

function createThreadDetailPayload() {
  return {
    ok: true,
    data: {
      id: "thread-1",
      entityCui: "12345678",
      entityName: "Oras Test",
      campaignKey: "funky",
      submissionPath: "platform_send",
      ownerUserId: "user-1",
      institutionEmail: "contact@primarie.ro",
      subject: "Public debate request",
      threadState: "pending",
      currentResponseStatus: "registration_number_received",
      createdAt: "2026-04-10T10:00:00.000Z",
      updatedAt: "2026-04-12T10:00:00.000Z",
      latestResponseAt: "2026-04-12T09:00:00.000Z",
      responseEventCount: 2,
      notificationAudience: {
        requesterCount: 1,
        subscriberCount: 3,
        eligibleRequesterCount: 1,
        eligibleSubscriberCount: 2,
      },
      requesterOrganizationName: "Asociatia Test",
      budgetPublicationDate: "2026-03-20",
      consentCapturedAt: "2026-04-10T08:00:00.000Z",
      contestationDeadlineAt: "2026-04-20T00:00:00.000Z",
      responseEvents: [
        {
          id: "event-1",
          responseDate: "2026-04-12T09:00:00.000Z",
          messageContent: "Received registration number",
          responseStatus: "registration_number_received",
          actorUserId: "admin-1",
          createdAt: "2026-04-12T09:05:00.000Z",
          source: "campaign_admin_api",
        },
      ],
      correspondence: [
        {
          id: "corr-1",
          direction: "inbound",
          source: "institution_reply",
          fromAddress: "contact@primarie.ro",
          subject: "Reply",
          textBody: "Body text",
          attachments: [],
          occurredAt: "2026-04-12T09:00:00.000Z",
        },
      ],
    },
  };
}

describe("campaign-admin-institution-threads api", () => {
  beforeEach(() => {
    getAuthTokenMock.mockReset();
    vi.restoreAllMocks();
  });

  it("serializes the list query and auth header correctly", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createThreadListPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listCampaignAdminInstitutionThreads({
      campaignKey: "funky",
      filters: {
        stateGroup: "open",
        threadState: "pending",
        responseStatus: "registration_number_received",
        query: "contact",
        entityCui: "12345678",
        updatedAtFrom: "2026-04-10T00:00:00.000Z",
        updatedAtTo: "2026-04-12T23:59:59.999Z",
        latestResponseAtFrom: "2026-04-11T00:00:00.000Z",
        latestResponseAtTo: "2026-04-12T23:59:59.999Z",
      },
      cursor: "cursor-0",
      limit: 25,
    });

    expect(result.page.totalCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/admin/campaigns/funky/institution-threads?stateGroup=open&threadState=pending&responseStatus=registration_number_received&query=contact&entityCui=12345678&updatedAtFrom=2026-04-10T00%3A00%3A00.000Z&updatedAtTo=2026-04-12T23%3A59%3A59.999Z&latestResponseAtFrom=2026-04-11T00%3A00%3A00.000Z&latestResponseAtTo=2026-04-12T23%3A59%3A59.999Z&cursor=cursor-0&limit=25",
      ),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("requests thread detail from the detail endpoint", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createThreadDetailPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getCampaignAdminInstitutionThreadDetail({
      campaignKey: "funky",
      threadId: "thread-1",
    });

    expect(result.id).toBe("thread-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/institution-threads/thread-1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("posts append-response with the expected JSON body", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ...createThreadDetailPayload(),
          data: {
            ...createThreadDetailPayload().data,
            createdResponseEventId: "event-2",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const body = {
      expectedUpdatedAt: "2026-04-12T10:00:00.000Z",
      responseDate: "2026-04-13T10:00:00.000Z",
      messageContent: "Confirmed request",
      responseStatus: "request_confirmed" as const,
    };

    const result = await appendCampaignAdminInstitutionThreadResponse({
      campaignKey: "funky",
      threadId: "thread-1",
      body,
    });

    expect(result.createdResponseEventId).toBe("event-2");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/institution-threads/thread-1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      }),
    );
  });

  it("fails with 401 before fetching when auth is missing", async () => {
    getAuthTokenMock.mockResolvedValue(null);

    await expect(
      listCampaignAdminInstitutionThreads({
        campaignKey: "funky",
        filters: {
          stateGroup: "open",
        },
        cursor: null,
        limit: 50,
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: "Sign in required for campaign admin institution threads.",
    });
  });

  it("maps error envelopes into CampaignAdminApiError", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: "conflict",
          message: "Thread already changed",
          retryable: false,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      appendCampaignAdminInstitutionThreadResponse({
        campaignKey: "funky",
        threadId: "thread-1",
        body: {
          expectedUpdatedAt: "2026-04-12T10:00:00.000Z",
          responseDate: "2026-04-13T10:00:00.000Z",
          messageContent: "Confirmed request",
          responseStatus: "request_confirmed",
        },
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: "Thread already changed",
      retryable: false,
    });
  });
});
