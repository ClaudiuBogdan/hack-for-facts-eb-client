import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test/test-utils";
import type { CampaignAdminNotificationTriggerExecutionResponse } from "@/features/campaigns/buget/admin/types";
import {
  campaignAdminNotificationTemplatePreviewQueryOptions,
  campaignAdminNotificationsAuditQueryOptions,
  campaignAdminNotificationsKeys,
  useExecuteCampaignAdminNotificationTriggerMutation,
} from "./use-campaign-admin-notifications";

const executeCampaignAdminNotificationTriggerMock = vi.fn();

vi.mock(
  "@/features/campaigns/buget/admin/api/campaign-admin-notifications",
  () => ({
    executeCampaignAdminNotificationTrigger: (input: unknown) =>
      executeCampaignAdminNotificationTriggerMock(input),
    getCampaignAdminNotificationTemplatePreview: vi.fn(),
    listCampaignAdminNotificationTemplates: vi.fn(),
    listCampaignAdminNotificationTriggers: vi.fn(),
    listCampaignAdminNotifications: vi.fn(),
  }),
);

function createWrapper(queryClient: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createTriggerExecutionResponse(): CampaignAdminNotificationTriggerExecutionResponse {
  return {
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
  };
}

describe("use-campaign-admin-notifications", () => {
  beforeEach(() => {
    executeCampaignAdminNotificationTriggerMock.mockReset();
  });

  it("builds audit query options with the expected key and enabled flag", () => {
    const options = campaignAdminNotificationsAuditQueryOptions({
      campaignKey: "funky",
      filters: {
        status: "pending",
      },
      cursor: "cursor-1",
      limit: 25,
      enabled: false,
    });

    expect(options.queryKey).toEqual(
      campaignAdminNotificationsKeys.audit(
        "funky",
        { status: "pending" },
        "cursor-1",
        25,
      ),
    );
    expect(options.enabled).toBe(false);
  });

  it("disables the template preview query when no template id is selected", () => {
    const options = campaignAdminNotificationTemplatePreviewQueryOptions({
      campaignKey: "funky",
      templateId: null,
      enabled: true,
    });

    expect(options.enabled).toBe(false);
    expect(options.queryKey).toEqual(
      campaignAdminNotificationsKeys.templatePreview("funky", null),
    );
  });

  it("invalidates the notifications subtree after executing a trigger", async () => {
    const queryClient = createTestQueryClient();
    const invalidateQueriesSpy = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);

    executeCampaignAdminNotificationTriggerMock.mockResolvedValue(
      createTriggerExecutionResponse(),
    );

    const { result } = renderHook(
      () => useExecuteCampaignAdminNotificationTriggerMutation("funky"),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    let mutationResult:
      | CampaignAdminNotificationTriggerExecutionResponse
      | undefined;

    await act(async () => {
      mutationResult = await result.current.mutateAsync({
        triggerId: "public_debate_entity_update.reply_received",
        body: {
          threadId: "thread-1",
        },
      });
    });

    expect(mutationResult).toEqual(createTriggerExecutionResponse());
    expect(executeCampaignAdminNotificationTriggerMock).toHaveBeenCalledWith({
      campaignKey: "funky",
      triggerId: "public_debate_entity_update.reply_received",
      body: {
        threadId: "thread-1",
      },
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey:
        campaignAdminNotificationsKeys.notificationsForCampaign("funky"),
    });
  });
});
