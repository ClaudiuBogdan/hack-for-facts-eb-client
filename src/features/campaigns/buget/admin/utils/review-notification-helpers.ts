import type {
  CampaignAdminCampaignKey,
  CampaignAdminUserInteractionListItem,
} from "@/features/campaigns/buget/admin/types";

export function buildCampaignAdminNotificationsTriggerHref(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly item: CampaignAdminUserInteractionListItem;
}): string {
  const searchParams = new URLSearchParams({
    tab: "triggers",
    triggerId: "admin_reviewed_user_interaction",
    triggerMode: "single",
    triggerUserId: input.item.userId,
    triggerRecordKey: input.item.recordKey,
    triggerLimit: "50",
  });

  if (input.item.entityCui) {
    searchParams.set("triggerEntityCui", input.item.entityCui);
  }

  searchParams.set("triggerInteractionId", input.item.interactionId);

  if (
    input.item.reviewStatus === "approved" ||
    input.item.reviewStatus === "rejected"
  ) {
    searchParams.set("triggerReviewStatus", input.item.reviewStatus);
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
