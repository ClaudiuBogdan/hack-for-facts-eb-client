import { describe, expect, it } from "vitest";
import type { CampaignAdminUserInteractionListItem } from "@/features/campaigns/buget/admin/types";
import { parseCampaignAdminNotificationConditions } from "@/features/campaigns/buget/admin/utils/campaign-admin-notification-run-utils";
import { buildCampaignAdminNotificationsTriggerHref } from "./review-notification-helpers";

function createInteractionItem(
  overrides: Partial<CampaignAdminUserInteractionListItem> = {},
): CampaignAdminUserInteractionListItem {
  return {
    userId: "user-1",
    recordKey: "record-1",
    campaignKey: "funky",
    interactionId: "interaction-1",
    entityCui: "12345678",
    reviewStatus: "approved",
    ...overrides,
  } as CampaignAdminUserInteractionListItem;
}

describe("review-notification-helpers", () => {
  it("builds a run-tab link scoped to the reviewed interaction", () => {
    const href = buildCampaignAdminNotificationsTriggerHref({
      campaignKey: "funky",
      item: createInteractionItem(),
    });
    const url = new URL(href, "https://example.test");

    expect(url.searchParams.get("tab")).toBe("run");
    expect(url.searchParams.get("runNotificationType")).toBe(
      "admin_reviewed_user_interaction",
    );
    expect(
      parseCampaignAdminNotificationConditions(
        url.searchParams.get("runConditions") ?? undefined,
      ).map(({ fieldKey, operator, value }) => ({
        fieldKey,
        operator,
        value,
      })),
    ).toEqual([
      {
        fieldKey: "userId",
        operator: "is",
        value: "user-1",
      },
      {
        fieldKey: "recordKey",
        operator: "is",
        value: "record-1",
      },
      {
        fieldKey: "interactionId",
        operator: "is",
        value: "interaction-1",
      },
      {
        fieldKey: "entityCui",
        operator: "is",
        value: "12345678",
      },
      {
        fieldKey: "reviewStatus",
        operator: "is",
        value: "approved",
      },
    ]);
  });

  it("omits optional run conditions when the review item does not provide them", () => {
    const href = buildCampaignAdminNotificationsTriggerHref({
      campaignKey: "funky",
      item: createInteractionItem({
        entityCui: null,
        reviewStatus: "pending",
      }),
    });
    const url = new URL(href, "https://example.test");

    expect(
      parseCampaignAdminNotificationConditions(
        url.searchParams.get("runConditions") ?? undefined,
      ).map(({ fieldKey, operator, value }) => ({
        fieldKey,
        operator,
        value,
      })),
    ).toEqual([
      {
        fieldKey: "userId",
        operator: "is",
        value: "user-1",
      },
      {
        fieldKey: "recordKey",
        operator: "is",
        value: "record-1",
      },
      {
        fieldKey: "interactionId",
        operator: "is",
        value: "interaction-1",
      },
    ]);
  });
});
