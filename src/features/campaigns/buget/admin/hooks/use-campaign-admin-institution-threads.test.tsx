import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test/test-utils";
import {
  campaignAdminInstitutionThreadDetailQueryOptions,
  campaignAdminInstitutionThreadsKeys,
  campaignAdminInstitutionThreadsListQueryOptions,
  useAppendCampaignAdminInstitutionThreadResponseMutation,
  useCampaignAdminInstitutionThreadDetailQuery,
  useCampaignAdminInstitutionThreadsListQuery,
} from "./use-campaign-admin-institution-threads";
import type {
  CampaignAdminAppendInstitutionThreadResponseBody,
  CampaignAdminInstitutionThreadDetail,
  CampaignAdminInstitutionThreadsListResponse,
} from "@/features/campaigns/buget/admin/types";

const listCampaignAdminInstitutionThreadsMock = vi.fn();
const getCampaignAdminInstitutionThreadDetailMock = vi.fn();
const appendCampaignAdminInstitutionThreadResponseMock = vi.fn();

vi.mock("@/features/campaigns/buget/admin/api/campaign-admin-institution-threads", () => ({
  CampaignAdminApiError: class CampaignAdminApiError extends Error {
    status = 500;
  },
  listCampaignAdminInstitutionThreads: (...args: unknown[]) =>
    listCampaignAdminInstitutionThreadsMock(...args),
  getCampaignAdminInstitutionThreadDetail: (...args: unknown[]) =>
    getCampaignAdminInstitutionThreadDetailMock(...args),
  appendCampaignAdminInstitutionThreadResponse: (...args: unknown[]) =>
    appendCampaignAdminInstitutionThreadResponseMock(...args),
}));

function createWrapper(queryClient: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createThreadDetail(): CampaignAdminInstitutionThreadDetail {
  return {
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
    responseEventCount: 1,
    notificationAudience: {
      requesterCount: 1,
      subscriberCount: 2,
      eligibleRequesterCount: 1,
      eligibleSubscriberCount: 1,
    },
    requesterOrganizationName: "Asociatia Test",
    budgetPublicationDate: "2026-03-20",
    consentCapturedAt: "2026-04-10T08:00:00.000Z",
    contestationDeadlineAt: "2026-04-20T00:00:00.000Z",
    responseEvents: [],
    correspondence: [],
  };
}

function createListResponse(): CampaignAdminInstitutionThreadsListResponse {
  return {
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
        responseEventCount: 1,
        notificationAudience: {
          requesterCount: 1,
          subscriberCount: 2,
          eligibleRequesterCount: 1,
          eligibleSubscriberCount: 1,
        },
      },
    ],
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

describe("use-campaign-admin-institution-threads", () => {
  beforeEach(() => {
    listCampaignAdminInstitutionThreadsMock.mockReset();
    getCampaignAdminInstitutionThreadDetailMock.mockReset();
    appendCampaignAdminInstitutionThreadResponseMock.mockReset();
  });

  it("builds list query options with the expected key", () => {
    const options = campaignAdminInstitutionThreadsListQueryOptions({
      campaignKey: "funky",
      filters: {
        stateGroup: "open",
      },
      cursor: "cursor-1",
      limit: 25,
      enabled: false,
    });

    expect(options.queryKey).toEqual(
      campaignAdminInstitutionThreadsKeys.list(
        "funky",
        { stateGroup: "open" },
        "cursor-1",
        25,
      ),
    );
    expect(options.enabled).toBe(false);
  });

  it("builds detail query options with the expected key", () => {
    const options = campaignAdminInstitutionThreadDetailQueryOptions({
      campaignKey: "funky",
      threadId: "thread-1",
      enabled: false,
    });

    expect(options.queryKey).toEqual(
      campaignAdminInstitutionThreadsKeys.detail("funky", "thread-1"),
    );
    expect(options.enabled).toBe(false);
  });

  it("loads the list query successfully", async () => {
    listCampaignAdminInstitutionThreadsMock.mockResolvedValue(createListResponse());
    const queryClient = createTestQueryClient();

    const { result } = renderHook(
      () =>
        useCampaignAdminInstitutionThreadsListQuery({
          campaignKey: "funky",
          filters: { stateGroup: "open" },
          cursor: null,
          limit: 50,
        }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });

  it("loads the detail query successfully", async () => {
    getCampaignAdminInstitutionThreadDetailMock.mockResolvedValue(
      createThreadDetail(),
    );
    const queryClient = createTestQueryClient();

    const { result } = renderHook(
      () =>
        useCampaignAdminInstitutionThreadDetailQuery({
          campaignKey: "funky",
          threadId: "thread-1",
        }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("thread-1");
  });

  it("invalidates list and detail queries after a successful append mutation", async () => {
    const queryClient = createTestQueryClient();
    const invalidateQueriesSpy = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const detail = createThreadDetail();
    const body: CampaignAdminAppendInstitutionThreadResponseBody = {
      expectedUpdatedAt: detail.updatedAt,
      responseDate: "2026-04-13T10:00:00.000Z",
      messageContent: "Confirmed request",
      responseStatus: "request_confirmed",
    };

    appendCampaignAdminInstitutionThreadResponseMock.mockResolvedValue({
      ...detail,
      createdResponseEventId: "event-2",
    });

    const { result } = renderHook(
      () =>
        useAppendCampaignAdminInstitutionThreadResponseMutation(
          "funky",
          "thread-1",
        ),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await act(async () => {
      await result.current.mutateAsync(body);
    });

    expect(appendCampaignAdminInstitutionThreadResponseMock).toHaveBeenCalledWith({
      campaignKey: "funky",
      threadId: "thread-1",
      body,
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: campaignAdminInstitutionThreadsKeys.threadsForCampaign("funky"),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: campaignAdminInstitutionThreadsKeys.detail("funky", "thread-1"),
    });
  });
});
