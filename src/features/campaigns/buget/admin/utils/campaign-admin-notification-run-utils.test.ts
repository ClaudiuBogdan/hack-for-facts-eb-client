import { describe, expect, it } from "vitest";
import type { CampaignAdminRunnableTemplateDescriptor } from "@/features/campaigns/buget/admin/types";
import {
  buildCampaignAdminNotificationPreviewBody,
  canSendCampaignAdminNotificationPlan,
  classifyCampaignAdminNotificationRunError,
  createCampaignAdminNotificationCondition,
  createCampaignAdminNotificationPlanPaginationState,
  createCampaignAdminNotificationTypeOptions,
  getNextCampaignAdminNotificationPlanPaginationState,
  getPreviousCampaignAdminNotificationPlanPaginationState,
  parseCampaignAdminNotificationConditions,
  parseCampaignAdminNotificationPreviewTrail,
  serializeCampaignAdminNotificationPreviewTrail,
} from "./campaign-admin-notification-run-utils";

function createRunnableTemplate(
  overrides: Partial<CampaignAdminRunnableTemplateDescriptor> = {},
): CampaignAdminRunnableTemplateDescriptor {
  return {
    runnableId: "admin_reviewed_user_interaction",
    campaignKey: "funky",
    templateId: "admin_reviewed_user_interaction",
    templateVersion: "1",
    description: "Reviewed interaction admin email",
    targetKind: "user",
    selectors: [
      { name: "userId", type: "string", required: false },
      { name: "entityCui", type: "string", required: false },
      { name: "recordKey", type: "string", required: false },
    ],
    filters: [
      { name: "reviewStatus", type: "enum", required: false },
      { name: "interactionId", type: "string", required: false },
      { name: "updatedAtFrom", type: "datetime", required: false },
      { name: "updatedAtTo", type: "datetime", required: false },
    ],
    dryRunRequired: true,
    maxPlanRowCount: 500,
    defaultPageSize: 25,
    maxPageSize: 100,
    ...overrides,
  };
}

describe("campaign-admin-notification-run-utils", () => {
  it("maps conditions into the preview payload while omitting blanks", () => {
    const notificationType = createCampaignAdminNotificationTypeOptions([
      createRunnableTemplate(),
    ])[0]!;

    expect(
      buildCampaignAdminNotificationPreviewBody({
        notificationType,
        conditions: [
          {
            ...(createCampaignAdminNotificationCondition(notificationType, "userId") ?? {
              id: "user-condition",
              fieldKey: "userId",
              operator: "is",
              value: "",
            }),
            value: " user-1 ",
          },
          {
            id: "status-condition",
            fieldKey: "reviewStatus",
            operator: "is",
            value: "approved",
          },
          {
            id: "updated-at-from",
            fieldKey: "updatedAt",
            operator: "on_or_after",
            value: "2026-04-01",
          },
          {
            id: "updated-at-to",
            fieldKey: "updatedAt",
            operator: "on_or_before",
            value: "2026-04-30",
          },
        ],
      }),
    ).toEqual({
      selectors: {
        userId: "user-1",
      },
      filters: {
        reviewStatus: "approved",
        updatedAtFrom: "2026-04-01T00:00:00.000Z",
        updatedAtTo: "2026-04-30T23:59:59.999Z",
      },
    });
  });

  it("allows a no-condition preview by returning an empty payload", () => {
    const notificationType = createCampaignAdminNotificationTypeOptions([
      createRunnableTemplate(),
    ])[0]!;

    expect(
      buildCampaignAdminNotificationPreviewBody({
        notificationType,
        conditions: [],
      }),
    ).toEqual({});
  });

  it("labels Bucharest budget analysis runnable templates", () => {
    const notificationType = createCampaignAdminNotificationTypeOptions([
      createRunnableTemplate({
        runnableId: "bucharest_budget_analysis",
        templateId: "bucharest_budget_analysis_2026_04_23",
        description: "Fallback description",
        selectors: [],
        filters: [],
      }),
    ])[0]!;

    expect(notificationType.label).toBe("Bucharest budget analysis");
    expect(notificationType.description).toBe(
      "Notify Bucharest subscribers about the budget analysis.",
    );
  });

  it("ignores malformed condition query values instead of throwing", () => {
    expect(() =>
      parseCampaignAdminNotificationConditions("userId:is:%E0%A4%A"),
    ).not.toThrow();
    expect(
      parseCampaignAdminNotificationConditions("userId:is:%E0%A4%A"),
    ).toEqual([]);
  });

  it("round-trips preview cursor trails safely for opaque cursor values", () => {
    const trail = [null, "root", "cursor~with~tilde"];

    const serializedTrail =
      serializeCampaignAdminNotificationPreviewTrail(trail);

    expect(serializedTrail).toBeDefined();
    expect(parseCampaignAdminNotificationPreviewTrail(serializedTrail)).toEqual(
      trail,
    );
  });

  it("tracks plan pagination state transitions", () => {
    const initialState = createCampaignAdminNotificationPlanPaginationState();
    const secondPageState = getNextCampaignAdminNotificationPlanPaginationState(
      initialState,
      "cursor-2",
    );
    const thirdPageState = getNextCampaignAdminNotificationPlanPaginationState(
      secondPageState,
      "cursor-3",
    );

    expect(secondPageState).toEqual({
      currentCursor: "cursor-2",
      previousCursors: [null],
      pageIndex: 2,
    });
    expect(thirdPageState).toEqual({
      currentCursor: "cursor-3",
      previousCursors: [null, "cursor-2"],
      pageIndex: 3,
    });
    expect(
      getPreviousCampaignAdminNotificationPlanPaginationState(thirdPageState),
    ).toEqual({
      currentCursor: "cursor-2",
      previousCursors: [null],
      pageIndex: 2,
    });
    expect(
      getPreviousCampaignAdminNotificationPlanPaginationState(secondPageState),
    ).toEqual({
      currentCursor: null,
      previousCursors: [],
      pageIndex: 1,
    });
  });

  it("enables send only for a live plan with will-send rows", () => {
    expect(
      canSendCampaignAdminNotificationPlan({
        previewId: "plan-1",
        readyCount: 3,
        isPreviewPending: false,
        isSendPending: false,
        isConsumed: false,
      }),
    ).toBe(true);
    expect(
      canSendCampaignAdminNotificationPlan({
        previewId: "plan-1",
        readyCount: 0,
        isPreviewPending: false,
        isSendPending: false,
        isConsumed: false,
      }),
    ).toBe(false);
    expect(
      canSendCampaignAdminNotificationPlan({
        previewId: "plan-1",
        readyCount: 3,
        isPreviewPending: false,
        isSendPending: false,
        isConsumed: true,
      }),
    ).toBe(false);
  });

  it("classifies invalid preview errors as preview-clearing failures", () => {
    expect(
      classifyCampaignAdminNotificationRunError(
        {
          status: 400,
          message: "Preview expired for this actor",
        },
        "sendNotifications",
      ),
    ).toEqual({
      title: "Preview is no longer valid",
      description:
        "Preview expired for this actor Run preview again to refresh the matches.",
      shouldClearPreview: true,
    });

    expect(
      classifyCampaignAdminNotificationRunError(
        {
          status: 400,
          message: "Invalid date filter",
        },
        "preview",
      ),
    ).toEqual({
      title: "Preview failed",
      description: "Invalid date filter",
      shouldClearPreview: false,
    });
  });
});
