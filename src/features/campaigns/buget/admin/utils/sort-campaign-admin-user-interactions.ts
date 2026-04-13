import {
  buildCampaignAdminSelectionKey,
  getCampaignAdminInteractionTypeLabel,
  getCampaignAdminReviewStatusLabel,
  getCampaignAdminThreadPhaseLabel,
} from "@/features/campaigns/buget/admin/constants";
import { getCampaignAdminPrimaryValue } from "@/features/campaigns/buget/admin/utils/payload-summary";
import type {
  CampaignAdminSortOrder,
  CampaignAdminStagedReviewDraft,
  CampaignAdminUserInteractionListItem,
  CampaignAdminUserInteractionsSortKey,
} from "@/features/campaigns/buget/admin/types";

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function compareNullableValues<T>(
  left: T | null | undefined,
  right: T | null | undefined,
  compareValues: (leftValue: T, rightValue: T) => number,
  sortOrder: CampaignAdminSortOrder,
): number {
  if (left == null && right == null) {
    return 0;
  }

  if (left == null) {
    return 1;
  }

  if (right == null) {
    return -1;
  }

  const baseComparison = compareValues(left, right);
  return sortOrder === "asc" ? baseComparison : -baseComparison;
}

function getEntitySortValue(
  item: CampaignAdminUserInteractionListItem,
): string | null {
  return item.entityName?.trim() || item.entityCui;
}

function getReviewStateSortValue(
  item: CampaignAdminUserInteractionListItem,
  stagedDraftsByKey?: Readonly<Record<string, CampaignAdminStagedReviewDraft>>,
): number {
  const stagedDraft =
    stagedDraftsByKey?.[
      buildCampaignAdminSelectionKey(item.userId, item.recordKey)
    ] ?? null;

  switch (stagedDraft?.status) {
    case "approved":
      return 0;
    case "rejected":
      return 2;
    default:
      return 1;
  }
}

function getSortValue(
  item: CampaignAdminUserInteractionListItem,
  sortBy: CampaignAdminUserInteractionsSortKey,
  stagedDraftsByKey?: Readonly<Record<string, CampaignAdminStagedReviewDraft>>,
): string | number | null {
  switch (sortBy) {
    case "reviewStatus":
      return getCampaignAdminReviewStatusLabel(item.reviewStatus);
    case "userId":
      return item.userId;
    case "organizationName":
      return item.organizationName;
    case "entity":
      return getEntitySortValue(item);
    case "updatedAt": {
      const parsedTimestamp = Date.parse(item.updatedAt);
      return Number.isFinite(parsedTimestamp) ? parsedTimestamp : null;
    }
    case "riskFlagCount":
      return item.riskFlags.length;
    case "threadPhase":
      return getCampaignAdminThreadPhaseLabel(item.threadPhase);
    case "interactionType":
      return getCampaignAdminInteractionTypeLabel(item.interactionId);
    case "value":
      return getCampaignAdminPrimaryValue(item);
    case "reviewState":
      return getReviewStateSortValue(item, stagedDraftsByKey);
    case "reviewedByUserId":
      return item.reviewedByUserId;
    default:
      return null;
  }
}

function compareItems(
  left: CampaignAdminUserInteractionListItem,
  right: CampaignAdminUserInteractionListItem,
  sortBy: CampaignAdminUserInteractionsSortKey,
  sortOrder: CampaignAdminSortOrder,
  stagedDraftsByKey?: Readonly<Record<string, CampaignAdminStagedReviewDraft>>,
): number {
  const leftValue = getSortValue(left, sortBy, stagedDraftsByKey);
  const rightValue = getSortValue(right, sortBy, stagedDraftsByKey);

  const valueComparison =
    typeof leftValue === "number" || typeof rightValue === "number"
      ? compareNullableValues(
          typeof leftValue === "number" ? leftValue : null,
          typeof rightValue === "number" ? rightValue : null,
          (resolvedLeftValue, resolvedRightValue) =>
            resolvedLeftValue - resolvedRightValue,
          sortOrder,
        )
      : compareNullableValues(
          typeof leftValue === "string" ? leftValue : null,
          typeof rightValue === "string" ? rightValue : null,
          (resolvedLeftValue, resolvedRightValue) =>
            collator.compare(resolvedLeftValue, resolvedRightValue),
          sortOrder,
        );

  if (valueComparison !== 0) {
    return valueComparison;
  }

  return collator.compare(
    `${left.updatedAt}:${left.userId}:${left.recordKey}`,
    `${right.updatedAt}:${right.userId}:${right.recordKey}`,
  );
}

export function sortCampaignAdminUserInteractionItems(input: {
  readonly items: readonly CampaignAdminUserInteractionListItem[];
  readonly sortBy?: CampaignAdminUserInteractionsSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly stagedDraftsByKey?: Readonly<
    Record<string, CampaignAdminStagedReviewDraft>
  >;
}): readonly CampaignAdminUserInteractionListItem[] {
  const { items, sortBy, sortOrder, stagedDraftsByKey } = input;

  if (sortBy === undefined || sortOrder === undefined) {
    return input.items;
  }

  return [...items].sort((left, right) =>
    compareItems(left, right, sortBy, sortOrder, stagedDraftsByKey),
  );
}
