import {
  getCampaignAdminInteractionTypeLabel,
  getCampaignAdminReviewStatusLabel,
  getCampaignAdminThreadPhaseLabel,
} from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminSortOrder,
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

function getSortValue(
  item: CampaignAdminUserInteractionListItem,
  sortBy: CampaignAdminUserInteractionsSortKey,
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
): number {
  const leftValue = getSortValue(left, sortBy);
  const rightValue = getSortValue(right, sortBy);

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
}): readonly CampaignAdminUserInteractionListItem[] {
  const { items, sortBy, sortOrder } = input;

  if (sortBy === undefined || sortOrder === undefined) {
    return input.items;
  }

  return [...items].sort((left, right) =>
    compareItems(left, right, sortBy, sortOrder),
  );
}
