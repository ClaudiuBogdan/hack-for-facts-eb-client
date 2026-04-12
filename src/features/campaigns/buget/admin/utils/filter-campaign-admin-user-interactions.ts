import {
  sortCampaignAdminUserInteractionItems,
} from "@/features/campaigns/buget/admin/utils/sort-campaign-admin-user-interactions";
import type {
  CampaignAdminUserInteractionListItem,
  CampaignAdminUserPageSearch,
} from "@/features/campaigns/buget/admin/types";

function isWithinDateRange(
  value: string | null,
  from: string | undefined,
  to: string | undefined,
): boolean {
  if (value === null) {
    return from === undefined && to === undefined;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const fromTimestamp =
    from === undefined ? null : Number.isFinite(Date.parse(from)) ? Date.parse(from) : null;
  const toTimestamp =
    to === undefined ? null : Number.isFinite(Date.parse(to)) ? Date.parse(to) : null;

  if (fromTimestamp !== null && timestamp < fromTimestamp) {
    return false;
  }

  if (toTimestamp !== null && timestamp > toTimestamp) {
    return false;
  }

  return true;
}

function hasInstitutionThread(item: CampaignAdminUserInteractionListItem): boolean {
  return item.threadId !== null;
}

export function filterCampaignAdminUserInteractionItems(input: {
  readonly items: readonly CampaignAdminUserInteractionListItem[];
  readonly search: CampaignAdminUserPageSearch;
}): readonly CampaignAdminUserInteractionListItem[] {
  const { items, search } = input;

  return items.filter((item) => {
    if (search.reviewStatus !== undefined && item.reviewStatus !== search.reviewStatus) {
      return false;
    }

    if (search.interactionId !== undefined && item.interactionId !== search.interactionId) {
      return false;
    }

    if (search.lessonId !== undefined && item.lessonId !== search.lessonId) {
      return false;
    }

    if (search.entityCui !== undefined && item.entityCui !== search.entityCui) {
      return false;
    }

    if (search.scopeType !== undefined && item.scopeType !== search.scopeType) {
      return false;
    }

    if (search.payloadKind !== undefined && item.payloadKind !== search.payloadKind) {
      return false;
    }

    if (
      search.submissionPath !== undefined &&
      item.submissionPath !== search.submissionPath
    ) {
      return false;
    }

    if (search.recordKey !== undefined && item.recordKey !== search.recordKey) {
      return false;
    }

    if (
      search.recordKeyPrefix !== undefined &&
      !item.recordKey.startsWith(search.recordKeyPrefix)
    ) {
      return false;
    }

    if (
      search.hasInstitutionThread !== undefined &&
      hasInstitutionThread(item) !== search.hasInstitutionThread
    ) {
      return false;
    }

    if (search.threadPhase !== undefined && item.threadPhase !== search.threadPhase) {
      return false;
    }

    if (
      !isWithinDateRange(item.submittedAt, search.submittedAtFrom, search.submittedAtTo)
    ) {
      return false;
    }

    if (!isWithinDateRange(item.updatedAt, search.updatedAtFrom, search.updatedAtTo)) {
      return false;
    }

    return true;
  });
}

export function filterAndSortCampaignAdminUserInteractionItems(input: {
  readonly items: readonly CampaignAdminUserInteractionListItem[];
  readonly search: CampaignAdminUserPageSearch;
}): readonly CampaignAdminUserInteractionListItem[] {
  const filteredItems = filterCampaignAdminUserInteractionItems(input);

  return sortCampaignAdminUserInteractionItems({
    items: filteredItems,
    sortBy: input.search.sortBy,
    sortOrder: input.search.sortOrder,
  });
}
