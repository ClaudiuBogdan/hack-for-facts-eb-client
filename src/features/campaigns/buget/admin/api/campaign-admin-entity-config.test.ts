import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadCampaignAdminEntityConfigCsv,
  getCampaignAdminEntityConfig,
  listCampaignAdminEntityConfig,
  updateCampaignAdminEntityConfig,
} from "./campaign-admin-entity-config";

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

function createEntityConfigPayload() {
  return {
    ok: true,
    data: {
      campaignKey: "funky",
      entityCui: "12345678",
      entityName: "Oras Test",
      isConfigured: true,
      values: {
        budgetPublicationDate: "2026-03-20",
        officialBudgetUrl: "https://primarie.ro/buget.pdf",
      },
      updatedAt: "2026-04-12T10:00:00.000Z",
      updatedByUserId: "admin-1",
    },
  };
}

function createExpectedEntityConfig() {
  return {
    ...createEntityConfigPayload().data,
    configured: true,
  };
}

function createEntityConfigListPayload() {
  return {
    ok: true,
    data: {
      items: [createEntityConfigPayload().data],
      page: {
        limit: 250,
        totalCount: 1,
        hasMore: true,
        nextCursor: "cursor-1",
        sortBy: "updatedAt",
        sortOrder: "desc",
      },
    },
  };
}

describe("campaign-admin-entity-config api", () => {
  beforeEach(() => {
    getAuthTokenMock.mockReset();
    vi.restoreAllMocks();
  });

  it("lists entity config rows with auth and query parameters", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createEntityConfigListPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listCampaignAdminEntityConfig({
      campaignKey: "funky",
      filters: {
        entityCui: "12345678",
        budgetPublicationDate: "2026-03-20",
        hasBudgetPublicationDate: true,
        officialBudgetUrl: "buget.pdf",
        hasOfficialBudgetUrl: true,
        updatedAtFrom: "2026-04-10T00:00:00.000Z",
        updatedAtTo: "2026-04-12T23:59:59.999Z",
        sortBy: "updatedAt",
        sortOrder: "desc",
      },
      cursor: "cursor-0",
      limit: 250,
    });

    expect(result.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/entity-config?entityCui=12345678&budgetPublicationDate=2026-03-20&hasBudgetPublicationDate=true&officialBudgetUrl=buget.pdf&hasOfficialBudgetUrl=true&updatedAtFrom=2026-04-10T00%3A00%3A00.000Z&updatedAtTo=2026-04-12T23%3A59%3A59.999Z&sortBy=updatedAt&sortOrder=desc&cursor=cursor-0&limit=250",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("loads a single entity config by entity CUI", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createEntityConfigPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getCampaignAdminEntityConfig({
      campaignKey: "funky",
      entityCui: "12345678",
    });

    expect(result).toEqual(createExpectedEntityConfig());
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/entities/12345678/config",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("updates an entity config with the expected request body", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createEntityConfigPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const body = {
      expectedUpdatedAt: "2026-04-11T09:00:00.000Z",
      values: {
        budgetPublicationDate: "2026-03-20",
        officialBudgetUrl: "https://primarie.ro/buget.pdf",
      },
    } as const;

    const result = await updateCampaignAdminEntityConfig({
      campaignKey: "funky",
      entityCui: "12345678",
      body,
    });

    expect(result).toEqual(createExpectedEntityConfig());
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/entities/12345678/config",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      }),
    );
  });

  it("downloads the entity config csv with export filters", async () => {
    getAuthTokenMock.mockResolvedValue("token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("csv", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="entity-config.csv"',
        },
      }),
    );

    const result = await downloadCampaignAdminEntityConfigCsv({
      campaignKey: "funky",
      filters: {
        query: "Oras Test",
        entityCui: "12345678",
        budgetPublicationDate: "2026-03-20",
        hasBudgetPublicationDate: false,
        officialBudgetUrl: "buget.pdf",
        hasOfficialBudgetUrl: true,
        updatedAtFrom: "2026-04-10T00:00:00.000Z",
        updatedAtTo: "2026-04-12T23:59:59.999Z",
      },
    });

    expect(result.filename).toBe("entity-config.csv");
    expect(await result.blob.text()).toBe("csv");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/campaigns/funky/entity-config/export?query=Oras+Test&entityCui=12345678&budgetPublicationDate=2026-03-20&hasBudgetPublicationDate=false&officialBudgetUrl=buget.pdf&hasOfficialBudgetUrl=true&updatedAtFrom=2026-04-10T00%3A00%3A00.000Z&updatedAtTo=2026-04-12T23%3A59%3A59.999Z",
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
      getCampaignAdminEntityConfig({
        campaignKey: "funky",
        entityCui: "12345678",
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: "Sign in required for campaign entity config admin.",
    });
  });
});
