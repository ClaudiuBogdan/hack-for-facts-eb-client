import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test/test-utils";
import {
  campaignAdminEntityConfigDetailQueryOptions,
  campaignAdminEntityConfigKeys,
  campaignAdminEntityConfigListQueryOptions,
  useCampaignAdminEntityConfigDetailQuery,
  useCampaignAdminEntityConfigListQuery,
  useUpdateCampaignAdminEntityConfigMutation,
} from "./use-campaign-admin-entity-config";
import type {
  CampaignAdminEntityConfigDetail,
  CampaignAdminEntityConfigListResponse,
  CampaignAdminUpdateEntityConfigBody,
} from "@/features/campaigns/buget/admin/types";

const getCampaignAdminEntityConfigMock = vi.fn();
const listCampaignAdminEntityConfigMock = vi.fn();
const updateCampaignAdminEntityConfigMock = vi.fn();

vi.mock("@/features/campaigns/buget/admin/api/campaign-admin-entity-config", () => ({
  getCampaignAdminEntityConfig: (...args: unknown[]) =>
    getCampaignAdminEntityConfigMock(...args),
  listCampaignAdminEntityConfig: (...args: unknown[]) =>
    listCampaignAdminEntityConfigMock(...args),
  updateCampaignAdminEntityConfig: (...args: unknown[]) =>
    updateCampaignAdminEntityConfigMock(...args),
}));

function createWrapper(queryClient: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createEntityConfig(): CampaignAdminEntityConfigDetail {
  return {
    campaignKey: "funky",
    entityCui: "12345678",
    entityName: "Oras Test",
    configured: true,
    isConfigured: true,
    values: {
      budgetPublicationDate: "2026-03-20",
      officialBudgetUrl: "https://primarie.ro/buget.pdf",
    },
    updatedAt: "2026-04-12T10:00:00.000Z",
    updatedByUserId: "admin-1",
  };
}

function createListResponse(): CampaignAdminEntityConfigListResponse {
  return {
    items: [createEntityConfig()],
    page: {
      limit: 50,
      totalCount: 1,
      hasMore: false,
      nextCursor: null,
      sortBy: "updatedAt",
      sortOrder: "desc",
    },
  };
}

describe("use-campaign-admin-entity-config", () => {
  beforeEach(() => {
    getCampaignAdminEntityConfigMock.mockReset();
    listCampaignAdminEntityConfigMock.mockReset();
    updateCampaignAdminEntityConfigMock.mockReset();
  });

  it("builds list query options with the expected key", () => {
    const options = campaignAdminEntityConfigListQueryOptions({
      campaignKey: "funky",
      filters: {
        entityCui: "12345678",
        sortBy: "updatedAt",
        sortOrder: "desc",
      },
      cursor: "cursor-1",
      limit: 25,
      enabled: false,
    });

    expect(options.queryKey).toEqual(
      campaignAdminEntityConfigKeys.list(
        "funky",
        {
          entityCui: "12345678",
          sortBy: "updatedAt",
          sortOrder: "desc",
        },
        "cursor-1",
        25,
      ),
    );
    expect(options.enabled).toBe(false);
  });

  it("builds detail query options with the expected key", () => {
    const options = campaignAdminEntityConfigDetailQueryOptions({
      campaignKey: "funky",
      entityCui: "12345678",
      enabled: false,
    });

    expect(options.queryKey).toEqual(
      campaignAdminEntityConfigKeys.detail("funky", "12345678"),
    );
    expect(options.enabled).toBe(false);
  });

  it("loads the list query successfully", async () => {
    listCampaignAdminEntityConfigMock.mockResolvedValue(createListResponse());
    const queryClient = createTestQueryClient();

    const { result } = renderHook(
      () =>
        useCampaignAdminEntityConfigListQuery({
          campaignKey: "funky",
          filters: {
            sortBy: "updatedAt",
            sortOrder: "desc",
          },
          cursor: null,
          limit: 50,
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });

  it("loads the detail query successfully", async () => {
    getCampaignAdminEntityConfigMock.mockResolvedValue(createEntityConfig());
    const queryClient = createTestQueryClient();

    const { result } = renderHook(
      () =>
        useCampaignAdminEntityConfigDetailQuery({
          campaignKey: "funky",
          entityCui: "12345678",
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.entityCui).toBe("12345678");
  });

  it("invalidates list and detail queries after a successful update mutation", async () => {
    const queryClient = createTestQueryClient();
    const invalidateQueriesSpy = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const body: CampaignAdminUpdateEntityConfigBody = {
      expectedUpdatedAt: "2026-04-11T09:00:00.000Z",
      values: {
        budgetPublicationDate: "2026-03-20",
        officialBudgetUrl: "https://primarie.ro/buget.pdf",
      },
    };
    const updatedConfig = createEntityConfig();

    updateCampaignAdminEntityConfigMock.mockResolvedValue(updatedConfig);

    const { result } = renderHook(
      () => useUpdateCampaignAdminEntityConfigMutation("funky", "12345678"),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await result.current.mutateAsync(body);
    });

    expect(updateCampaignAdminEntityConfigMock).toHaveBeenCalledWith({
      campaignKey: "funky",
      entityCui: "12345678",
      body,
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: campaignAdminEntityConfigKeys.listsForCampaign("funky"),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: campaignAdminEntityConfigKeys.detail("funky", "12345678"),
    });
  });
});
