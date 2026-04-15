import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test/test-utils";
import type {
  CampaignAdminNotificationPlanResponse,
  CampaignAdminNotificationPlanSendResponse,
} from "@/features/campaigns/buget/admin/types";
import {
  campaignAdminNotificationPlanPageQueryOptions,
  campaignAdminNotificationsKeys,
  campaignAdminRunnableTemplatesQueryOptions,
  useCreateCampaignAdminNotificationDryRunPlanMutation,
  useSendCampaignAdminNotificationPlanMutation,
} from "./use-campaign-admin-notifications";

const createCampaignAdminNotificationDryRunPlanMock = vi.fn();
const sendCampaignAdminNotificationPlanMock = vi.fn();

vi.mock(
  "@/features/campaigns/buget/admin/api/campaign-admin-notifications",
  () => ({
    createCampaignAdminNotificationDryRunPlan: (input: unknown) =>
      createCampaignAdminNotificationDryRunPlanMock(input),
    sendCampaignAdminNotificationPlan: (input: unknown) =>
      sendCampaignAdminNotificationPlanMock(input),
    executeCampaignAdminNotificationTrigger: vi.fn(),
    executeCampaignAdminNotificationTriggerBulk: vi.fn(),
    getCampaignAdminNotificationPlanPage: vi.fn(),
    getCampaignAdminNotificationTemplatePreview: vi.fn(),
    getCampaignAdminNotificationsMeta: vi.fn(),
    listCampaignAdminNotifications: vi.fn(),
    listCampaignAdminNotificationTemplates: vi.fn(),
    listCampaignAdminNotificationTriggers: vi.fn(),
    listCampaignAdminRunnableTemplates: vi.fn(),
  }),
);

function createWrapper(queryClient: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createPlanResponse(): CampaignAdminNotificationPlanResponse {
  return {
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
    rows: [],
    page: {
      hasMore: false,
      nextCursor: null,
    },
  };
}

function createSendResponse(): CampaignAdminNotificationPlanSendResponse {
  return {
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
  };
}

describe("use-campaign-admin-notifications", () => {
  beforeEach(() => {
    createCampaignAdminNotificationDryRunPlanMock.mockReset();
    sendCampaignAdminNotificationPlanMock.mockReset();
  });

  it("builds runnable-templates query options with the expected key", () => {
    const options = campaignAdminRunnableTemplatesQueryOptions({
      campaignKey: "funky",
      enabled: false,
    });

    expect(options.queryKey).toEqual(
      campaignAdminNotificationsKeys.runnableTemplates("funky"),
    );
    expect(options.enabled).toBe(false);
  });

  it("disables the plan page query when no plan id is selected", () => {
    const options = campaignAdminNotificationPlanPageQueryOptions({
      campaignKey: "funky",
      planId: null,
      cursor: null,
      limit: 25,
      enabled: true,
    });

    expect(options.enabled).toBe(false);
    expect(options.queryKey).toEqual(
      campaignAdminNotificationsKeys.planPage("funky", null, null, 25),
    );
  });

  it("invalidates the notifications subtree after creating a dry-run plan", async () => {
    const queryClient = createTestQueryClient();
    const invalidateQueriesSpy = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);

    createCampaignAdminNotificationDryRunPlanMock.mockResolvedValue(
      createPlanResponse(),
    );

    const { result } = renderHook(
      () => useCreateCampaignAdminNotificationDryRunPlanMutation("funky"),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    let mutationResult: CampaignAdminNotificationPlanResponse | undefined;

    await act(async () => {
      mutationResult = await result.current.mutateAsync({
        runnableId: "admin_reviewed_user_interaction",
        body: {
          selectors: {
            userId: "user-1",
          },
        },
      });
    });

    expect(mutationResult).toEqual(createPlanResponse());
    expect(createCampaignAdminNotificationDryRunPlanMock).toHaveBeenCalledWith({
      campaignKey: "funky",
      runnableId: "admin_reviewed_user_interaction",
      body: {
        selectors: {
          userId: "user-1",
        },
      },
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey:
        campaignAdminNotificationsKeys.notificationsForCampaign("funky"),
    });
  });

  it("invalidates notification and plan queries after sending a plan", async () => {
    const queryClient = createTestQueryClient();
    const invalidateQueriesSpy = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);

    sendCampaignAdminNotificationPlanMock.mockResolvedValue(createSendResponse());

    const { result } = renderHook(
      () => useSendCampaignAdminNotificationPlanMutation("funky"),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    let mutationResult: CampaignAdminNotificationPlanSendResponse | undefined;

    await act(async () => {
      mutationResult = await result.current.mutateAsync({
        planId: "plan-1",
      });
    });

    expect(mutationResult).toEqual(createSendResponse());
    expect(sendCampaignAdminNotificationPlanMock).toHaveBeenCalledWith({
      campaignKey: "funky",
      planId: "plan-1",
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey:
        campaignAdminNotificationsKeys.notificationsForCampaign("funky"),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [
        "campaign-admin",
        "funky",
        "notifications",
        "plans",
        "plan-1",
      ],
    });
  });
});
