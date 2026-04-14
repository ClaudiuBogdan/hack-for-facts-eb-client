import { t } from "@lingui/core/macro";
import { requiresApprovalConfirmation } from "@/features/campaigns/buget/admin/constants";
import { getCampaignAdminPrimaryValue } from "@/features/campaigns/buget/admin/utils/payload-summary";
import type {
  CampaignAdminReviewDecision,
  CampaignAdminStagedReviewDraft,
  CampaignAdminSubmitReviewsBody,
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
    return t`Missing staged review decision. Set approved or rejected before submitting.`;
  }

  if (
    stagedDraft.status === "rejected" &&
    stagedDraft.feedbackText.trim().length === 0
  ) {
    return t`Rejected rows need a review note before saving.`;
  }

  if (
    stagedDraft.status === "approved" &&
    requiresApprovalConfirmation(item.riskFlags) &&
    stagedDraft.approvalRiskAcknowledged !== true
  ) {
    return t`Approved rows with institution-email risk flags need explicit confirmation before saving.`;
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
    sendNotification: input.currentDraft?.sendNotification === true,
  };
}

export function toggleCampaignAdminStageReviewDraftNotification(input: {
  readonly item: CampaignAdminUserInteractionListItem;
  readonly currentDraft: CampaignAdminStagedReviewDraft | undefined;
  readonly sendNotification: boolean;
}): CampaignAdminStagedReviewDraft | null {
  if (input.currentDraft === undefined) {
    return null;
  }

  return {
    ...input.currentDraft,
    sendNotification: input.sendNotification,
  };
}

export function countCampaignAdminNotifyingDrafts(
  drafts: readonly CampaignAdminStagedReviewDraft[],
): number {
  return drafts.filter((draft) => draft.sendNotification === true).length;
}

export function buildCampaignAdminSubmitReviewBatches(input: {
  readonly items: readonly CampaignAdminUserInteractionListItem[];
  readonly stagedReviewDraftsByKey: Readonly<
    Record<string, CampaignAdminStagedReviewDraft>
  >;
  readonly buildSelectionKey: (userId: string, recordKey: string) => string;
}): ReadonlyArray<{
  readonly selectionKeys: readonly string[];
  readonly body: CampaignAdminSubmitReviewsBody;
}> {
  const grouped = new Map<
    boolean,
    {
      selectionKeys: string[];
      items: CampaignAdminSubmitReviewItem[];
    }
  >();

  for (const item of input.items) {
    const selectionKey = input.buildSelectionKey(item.userId, item.recordKey);
    const stagedDraft = input.stagedReviewDraftsByKey[selectionKey];
    if (stagedDraft === undefined) {
      continue;
    }

    const sendNotification = stagedDraft.sendNotification === true;
    const group = grouped.get(sendNotification) ?? {
      selectionKeys: [],
      items: [],
    };

    group.selectionKeys.push(selectionKey);
    group.items.push(
      buildCampaignAdminSubmitReviewItem({
        item,
        draft: stagedDraft,
      }),
    );
    grouped.set(sendNotification, group);
  }

  return [false, true]
    .flatMap((sendNotification) => {
      const group = grouped.get(sendNotification);
      if (group === undefined || group.items.length === 0) {
        return [];
      }

      return [{
        selectionKeys: group.selectionKeys,
        body: {
          items: group.items,
          send_notification: sendNotification,
        },
      }];
    });
}
