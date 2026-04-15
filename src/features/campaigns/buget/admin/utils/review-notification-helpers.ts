import type {
  CampaignAdminCampaignKey,
  CampaignAdminUserInteractionListItem,
} from "@/features/campaigns/buget/admin/types";
import { serializeCampaignAdminNotificationConditions } from "@/features/campaigns/buget/admin/utils/campaign-admin-notification-run-utils";

export function buildCampaignAdminNotificationsTriggerHref(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly item: CampaignAdminUserInteractionListItem;
}): string {
  const runConditions = serializeCampaignAdminNotificationConditions([
    {
      id: "userId",
      fieldKey: "userId",
      operator: "is",
      value: input.item.userId,
    },
    {
      id: "recordKey",
      fieldKey: "recordKey",
      operator: "is",
      value: input.item.recordKey,
    },
    {
      id: "interactionId",
      fieldKey: "interactionId",
      operator: "is",
      value: input.item.interactionId,
    },
    ...(input.item.entityCui
      ? [
          {
            id: "entityCui",
            fieldKey: "entityCui",
            operator: "is" as const,
            value: input.item.entityCui,
          },
        ]
      : []),
    ...(input.item.reviewStatus === "approved" ||
    input.item.reviewStatus === "rejected"
      ? [
          {
            id: "reviewStatus",
            fieldKey: "reviewStatus",
            operator: "is" as const,
            value: input.item.reviewStatus,
          },
        ]
      : []),
  ]);
  const searchParams = new URLSearchParams({
    tab: "run",
    runNotificationType: "admin_reviewed_user_interaction",
  });

  if (runConditions !== undefined) {
    searchParams.set("runConditions", runConditions);
  }

  return `/admin/campaigns/${input.campaignKey}/notifications?${searchParams.toString()}`;
}

export function wasCampaignAdminReviewSavedDespiteError(
  error: unknown,
): boolean {
  return (
    error instanceof Error &&
    typeof error === "object" &&
    "status" in error &&
    error.status === 502 &&
    /reviews?\s+(?:were|was)\s+saved/i.test(error.message)
  );
}
