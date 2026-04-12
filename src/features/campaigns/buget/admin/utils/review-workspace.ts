import { t } from "@lingui/core/macro";
import { requiresApprovalConfirmation } from "@/features/campaigns/buget/admin/constants";
import { getCampaignAdminPrimaryValue } from "@/features/campaigns/buget/admin/utils/payload-summary";
import type {
  CampaignAdminReviewDecision,
  CampaignAdminStagedReviewDraft,
  CampaignAdminSubmitReviewItem,
  CampaignAdminUserInteractionListItem,
} from "@/features/campaigns/buget/admin/types";

export type CampaignAdminSendValidationIssueData = {
  readonly selectionKey: string;
  readonly primaryValue: string;
  readonly recordKey: string;
  readonly message: string;
};

export function isCampaignAdminPendingReview(
  item: CampaignAdminUserInteractionListItem,
): boolean {
  return item.reviewStatus === "pending";
}

export function isCampaignAdminEditablePasteTarget(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"]',
    ) !== null
  );
}

export function buildCampaignAdminSubmitReviewItem(input: {
  readonly item: CampaignAdminUserInteractionListItem;
  readonly draft: CampaignAdminStagedReviewDraft;
}): CampaignAdminSubmitReviewItem {
  const trimmedFeedbackText = input.draft.feedbackText.trim();

  return input.draft.status === "approved"
    ? {
        userId: input.item.userId,
        recordKey: input.item.recordKey,
        expectedUpdatedAt: input.item.updatedAt,
        status: "approved",
        ...(trimmedFeedbackText ? { feedbackText: trimmedFeedbackText } : {}),
        ...(input.draft.approvalRiskAcknowledged === true
          ? { approvalRiskAcknowledged: true }
          : {}),
      }
    : {
        userId: input.item.userId,
        recordKey: input.item.recordKey,
        expectedUpdatedAt: input.item.updatedAt,
        status: "rejected",
        feedbackText: trimmedFeedbackText,
      };
}

export function getCampaignAdminSendValidationMessage(input: {
  readonly item: CampaignAdminUserInteractionListItem;
  readonly stagedDraft: CampaignAdminStagedReviewDraft | null | undefined;
}): string | null {
  const { item, stagedDraft } = input;

  if (item.reviewStatus !== "pending") {
    return t`This row is no longer pending. Refresh the queue before sending.`;
  }

  if (stagedDraft === undefined || stagedDraft === null) {
    return t`Missing staged review values. Paste spreadsheet rows with matching ids first.`;
  }

  if (stagedDraft.status !== "approved" && stagedDraft.status !== "rejected") {
    return t`Missing staged review decision. Set approved or rejected before sending.`;
  }

  if (
    stagedDraft.status === "rejected" &&
    stagedDraft.feedbackText.trim().length === 0
  ) {
    return t`Rejected rows need a review note before sending.`;
  }

  if (
    stagedDraft.status === "approved" &&
    requiresApprovalConfirmation(item.riskFlags) &&
    stagedDraft.approvalRiskAcknowledged !== true
  ) {
    return t`Approved rows with institution-email risk flags need explicit confirmation before sending.`;
  }

  return null;
}

export function getCampaignAdminSelectedSendValidationIssues(input: {
  readonly items: readonly CampaignAdminUserInteractionListItem[];
  readonly stagedReviewDraftsByKey: Readonly<
    Record<string, CampaignAdminStagedReviewDraft>
  >;
  readonly buildSelectionKey: (
    userId: string,
    recordKey: string,
  ) => string;
}): readonly CampaignAdminSendValidationIssueData[] {
  return input.items.flatMap((item) => {
    const selectionKey = input.buildSelectionKey(item.userId, item.recordKey);
    const stagedDraft = input.stagedReviewDraftsByKey[selectionKey];
    const message = getCampaignAdminSendValidationMessage({
      item,
      stagedDraft,
    });

    if (message === null) {
      return [];
    }

    return [
      {
        selectionKey,
        primaryValue: getCampaignAdminPrimaryValue(item) ?? item.recordKey,
        recordKey: item.recordKey,
        message,
      },
    ];
  });
}

export function createCampaignAdminStageReviewDraft(input: {
  readonly item: CampaignAdminUserInteractionListItem;
  readonly currentDraft: CampaignAdminStagedReviewDraft | undefined;
  readonly status: CampaignAdminReviewDecision;
}): CampaignAdminStagedReviewDraft {
  return {
    userId: input.item.userId,
    recordKey: input.item.recordKey,
    status: input.status,
    feedbackText: input.currentDraft?.feedbackText ?? "",
    approvalRiskAcknowledged:
      input.status === "approved" &&
      input.currentDraft?.status === "approved" &&
      input.currentDraft.approvalRiskAcknowledged === true,
  };
}
