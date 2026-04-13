import { z } from "zod";
import {
  DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  isCampaignAdminUserInteractionsLocalSortKey,
} from "@/features/campaigns/buget/admin/constants";
import {
  toDateInputValue,
  toUtcRangeBoundary,
} from "@/features/campaigns/buget/admin/utils/date-inputs";
import {
  campaignAdminEntityNotificationTypeValues,
  campaignAdminEntitiesSortKeyValues,
  campaignAdminNotificationEventTypeValues,
  campaignAdminNotificationsTabValues,
  campaignAdminNotificationSortKeyValues,
  campaignAdminNotificationSourceValues,
  campaignAdminNotificationStatusValues,
  campaignAdminPayloadKindValues,
  campaignAdminPhaseValues,
  campaignAdminReviewStatusValues,
  campaignAdminScopeTypeValues,
  campaignAdminSubmissionPathValues,
  campaignAdminThreadPhaseValues,
  type CampaignAdminNotificationsAuditFilters,
  type CampaignAdminNotificationsSearch,
  type CampaignAdminNotificationsTab,
  type CampaignAdminNotificationSortKey,
  campaignAdminUsersSortKeyValues,
  campaignAdminUserInteractionsSortKeyValues,
  type CampaignAdminEntitiesFilters,
  type CampaignAdminEntitiesSearch,
  type CampaignAdminEntitiesSortKey,
  type CampaignAdminUserInteractionsSortKey,
  type CampaignAdminUsersSortKey,
  type CampaignAdminFilterDraft,
  type CampaignAdminQueueFilters,
  type CampaignAdminQueueSearch,
  type CampaignAdminUsersSearch,
  type CampaignAdminUserPageSearch,
} from "@/features/campaigns/buget/admin/types";

const campaignAdminUserInteractionsSortKeySet = new Set<string>(
  campaignAdminUserInteractionsSortKeyValues,
);

const campaignAdminUsersSortKeySet = new Set<string>(
  campaignAdminUsersSortKeyValues,
);

const campaignAdminEntitiesSortKeySet = new Set<string>(
  campaignAdminEntitiesSortKeyValues,
);

const campaignAdminEntityNotificationTypeSet = new Set<string>(
  campaignAdminEntityNotificationTypeValues,
);

const campaignAdminNotificationSortKeySet = new Set<string>(
  campaignAdminNotificationSortKeyValues,
);

function toTrimmedOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function toOptionalEntityCui(value: unknown): string | undefined {
  const trimmedValue = toTrimmedOptionalString(value);
  if (trimmedValue === undefined) {
    return undefined;
  }

  const maybeUnquoted =
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
      ? trimmedValue.slice(1, -1).trim()
      : trimmedValue;

  return maybeUnquoted.length > 0 ? maybeUnquoted : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function toOptionalLimit(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return undefined;
}

function toOptionalPositiveInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return undefined;
}

function toOptionalIsoDateTime(value: unknown): string | undefined {
  const nextValue = toTrimmedOptionalString(value);
  if (nextValue === undefined) {
    return undefined;
  }

  return nextValue;
}

function toOptionalCampaignAdminUserInteractionsSortKey(
  value: unknown,
): CampaignAdminUserInteractionsSortKey | undefined {
  const nextValue = toTrimmedOptionalString(value);
  if (nextValue === undefined) {
    return undefined;
  }

  if (nextValue === "latestUpdatedAt") {
    return "updatedAt";
  }

  return campaignAdminUserInteractionsSortKeySet.has(nextValue)
    ? (nextValue as CampaignAdminUserInteractionsSortKey)
    : undefined;
}

function toOptionalCampaignAdminUsersSortKey(
  value: unknown,
): CampaignAdminUsersSortKey | undefined {
  const nextValue = toTrimmedOptionalString(value);
  if (nextValue === undefined) {
    return undefined;
  }

  if (nextValue === "updatedAt") {
    return "latestUpdatedAt";
  }

  return campaignAdminUsersSortKeySet.has(nextValue)
    ? (nextValue as CampaignAdminUsersSortKey)
    : undefined;
}

function toOptionalCampaignAdminEntitiesSortKey(
  value: unknown,
): CampaignAdminEntitiesSortKey | undefined {
  const nextValue = toTrimmedOptionalString(value);
  if (nextValue === undefined) {
    return undefined;
  }

  return campaignAdminEntitiesSortKeySet.has(nextValue)
    ? (nextValue as CampaignAdminEntitiesSortKey)
    : undefined;
}

function toOptionalCampaignAdminEntityNotificationType(
  value: unknown,
) {
  const nextValue = toTrimmedOptionalString(value);
  if (nextValue === undefined) {
    return undefined;
  }

  return campaignAdminEntityNotificationTypeSet.has(nextValue)
    ? nextValue
    : undefined;
}

function getDefaultCampaignAdminEntitiesSortOrder(
  sortBy: CampaignAdminEntitiesSortKey,
) {
  return sortBy === "entityCui" ? "asc" : "desc";
}

function toOptionalCampaignAdminNotificationsTab(
  value: unknown,
): CampaignAdminNotificationsTab | undefined {
  const nextValue = toTrimmedOptionalString(value);
  if (nextValue === undefined) {
    return undefined;
  }

  return campaignAdminNotificationsTabValues.includes(
    nextValue as CampaignAdminNotificationsTab,
  )
    ? (nextValue as CampaignAdminNotificationsTab)
    : undefined;
}

function toOptionalCampaignAdminNotificationSortKey(
  value: unknown,
): CampaignAdminNotificationSortKey | undefined {
  const nextValue = toTrimmedOptionalString(value);
  if (nextValue === undefined) {
    return undefined;
  }

  return campaignAdminNotificationSortKeySet.has(nextValue)
    ? (nextValue as CampaignAdminNotificationSortKey)
    : undefined;
}

function omitUndefinedValues<T extends Record<string, unknown>>(
  input: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function createSearchSignature(search: CampaignAdminQueueSearch): string {
  const {
    reviewSelectionKey,
    cursor,
    pageIndex,
    sortBy,
    sortOrder,
    ...searchWithoutSidebarState
  } = search;
  void reviewSelectionKey;
  void cursor;
  void pageIndex;
  void sortBy;
  void sortOrder;

  return JSON.stringify(searchWithoutSidebarState);
}

export const campaignAdminUserInteractionsRouteSearchSchema = z.object({
  phase: z.preprocess(
    toTrimmedOptionalString,
    z.enum(campaignAdminPhaseValues).optional(),
  ),
  reviewStatusMode: z.preprocess(
    toTrimmedOptionalString,
    z.enum(["all"]).optional(),
  ),
  reviewStatus: z.preprocess(
    toTrimmedOptionalString,
    z.enum(campaignAdminReviewStatusValues).optional(),
  ),
  interactionId: z.preprocess(
    toTrimmedOptionalString,
    z.string().min(1).optional(),
  ),
  lessonId: z.preprocess(toTrimmedOptionalString, z.string().min(1).optional()),
  entityCui: z.preprocess(
    toOptionalEntityCui,
    z.string().min(1).optional(),
  ),
  scopeType: z.preprocess(
    toTrimmedOptionalString,
    z.enum(campaignAdminScopeTypeValues).optional(),
  ),
  payloadKind: z.preprocess(
    toTrimmedOptionalString,
    z.enum(campaignAdminPayloadKindValues).optional(),
  ),
  submissionPath: z.preprocess(
    toTrimmedOptionalString,
    z.enum(campaignAdminSubmissionPathValues).optional(),
  ),
  userId: z.preprocess(toTrimmedOptionalString, z.string().min(1).optional()),
  recordKey: z.preprocess(
    toTrimmedOptionalString,
    z.string().min(1).optional(),
  ),
  recordKeyPrefix: z.preprocess((value) => {
    const nextValue = toTrimmedOptionalString(value);
    if (nextValue === undefined || nextValue.length < 16) {
      return undefined;
    }

    return nextValue;
  }, z.string().min(16).optional()),
  submittedAtFrom: z.preprocess(
    toOptionalIsoDateTime,
    z.string().datetime().optional(),
  ),
  submittedAtTo: z.preprocess(
    toOptionalIsoDateTime,
    z.string().datetime().optional(),
  ),
  updatedAtFrom: z.preprocess(
    toOptionalIsoDateTime,
    z.string().datetime().optional(),
  ),
  updatedAtTo: z.preprocess(
    toOptionalIsoDateTime,
    z.string().datetime().optional(),
  ),
  hasInstitutionThread: z.preprocess(toOptionalBoolean, z.boolean().optional()),
  threadPhase: z.preprocess(
    toTrimmedOptionalString,
    z.enum(campaignAdminThreadPhaseValues).optional(),
  ),
  sortBy: z.preprocess(
    toOptionalCampaignAdminUserInteractionsSortKey,
    z.enum(campaignAdminUserInteractionsSortKeyValues).optional(),
  ),
  sortOrder: z.preprocess(
    toTrimmedOptionalString,
    z.enum(["asc", "desc"]).optional(),
  ),
  reviewSelectionKey: z.preprocess(
    toTrimmedOptionalString,
    z.string().min(1).optional(),
  ),
  cursor: z.preprocess(toTrimmedOptionalString, z.string().min(1).optional()),
  pageIndex: z.preprocess(
    toOptionalPositiveInt,
    z.number().int().min(1).optional(),
  ),
  limit: z
    .preprocess(toOptionalLimit, z.number().int().min(1).max(100).optional())
    .transform((value) => value ?? DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT),
});

export const campaignAdminUserPageRouteSearchSchema =
  campaignAdminUserInteractionsRouteSearchSchema.omit({
    phase: true,
    reviewStatusMode: true,
    userId: true,
    cursor: true,
    pageIndex: true,
    limit: true,
  });

export const campaignAdminUsersRouteSearchSchema = z.object({
  query: z.preprocess(toTrimmedOptionalString, z.string().min(1).optional()),
  entityCui: z.preprocess(
    toOptionalEntityCui,
    z.string().min(1).optional(),
  ),
  sortBy: z.preprocess(
    toOptionalCampaignAdminUsersSortKey,
    z.enum(campaignAdminUsersSortKeyValues).optional(),
  ),
  sortOrder: z.preprocess(
    toTrimmedOptionalString,
    z.enum(["asc", "desc"]).optional(),
  ),
  cursor: z.preprocess(toTrimmedOptionalString, z.string().min(1).optional()),
  pageIndex: z.preprocess(
    toOptionalPositiveInt,
    z.number().int().min(1).optional(),
  ),
  limit: z
    .preprocess(toOptionalLimit, z.number().int().min(1).max(100).optional())
    .transform((value) => value ?? DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT),
});

export const campaignAdminEntitiesRouteSearchSchema = z.object({
  query: z.preprocess(toTrimmedOptionalString, z.string().min(1).optional()),
  interactionId: z.preprocess(
    toTrimmedOptionalString,
    z.string().min(1).optional(),
  ),
  hasPendingReviews: z.preprocess(toOptionalBoolean, z.boolean().optional()),
  hasSubscribers: z.preprocess(toOptionalBoolean, z.boolean().optional()),
  hasNotificationActivity: z.preprocess(
    toOptionalBoolean,
    z.boolean().optional(),
  ),
  hasFailedNotifications: z.preprocess(
    toOptionalBoolean,
    z.boolean().optional(),
  ),
  latestNotificationType: z.preprocess(
    toOptionalCampaignAdminEntityNotificationType,
    z.enum(campaignAdminEntityNotificationTypeValues).optional(),
  ),
  latestNotificationStatus: z.preprocess(
    toTrimmedOptionalString,
    z.enum(campaignAdminNotificationStatusValues).optional(),
  ),
  sortBy: z.preprocess(
    toOptionalCampaignAdminEntitiesSortKey,
    z.enum(campaignAdminEntitiesSortKeyValues).optional(),
  ),
  sortOrder: z.preprocess(
    toTrimmedOptionalString,
    z.enum(["asc", "desc"]).optional(),
  ),
  cursor: z.preprocess(toTrimmedOptionalString, z.string().min(1).optional()),
  pageIndex: z.preprocess(
    toOptionalPositiveInt,
    z.number().int().min(1).optional(),
  ),
  limit: z
    .preprocess(toOptionalLimit, z.number().int().min(1).max(100).optional())
    .transform((value) => value ?? DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT),
});

export const campaignAdminNotificationsRouteSearchSchema = z.object({
  tab: z.preprocess(
    toOptionalCampaignAdminNotificationsTab,
    z.enum(campaignAdminNotificationsTabValues).optional(),
  ),
  notificationType: z.preprocess(
    toTrimmedOptionalString,
    z.string().min(1).optional(),
  ),
  templateId: z.preprocess(
    toTrimmedOptionalString,
    z.string().min(1).optional(),
  ),
  userId: z.preprocess(toTrimmedOptionalString, z.string().min(1).optional()),
  status: z.preprocess(
    toTrimmedOptionalString,
    z.enum(campaignAdminNotificationStatusValues).optional(),
  ),
  eventType: z.preprocess(
    toTrimmedOptionalString,
    z.enum(campaignAdminNotificationEventTypeValues).optional(),
  ),
  entityCui: z.preprocess(
    toOptionalEntityCui,
    z.string().min(1).optional(),
  ),
  threadId: z.preprocess(toTrimmedOptionalString, z.string().min(1).optional()),
  source: z.preprocess(
    toTrimmedOptionalString,
    z.enum(campaignAdminNotificationSourceValues).optional(),
  ),
  sortBy: z.preprocess(
    toOptionalCampaignAdminNotificationSortKey,
    z.enum(campaignAdminNotificationSortKeyValues).optional(),
  ),
  sortOrder: z.preprocess(
    toTrimmedOptionalString,
    z.enum(["asc", "desc"]).optional(),
  ),
  cursor: z.preprocess(toTrimmedOptionalString, z.string().min(1).optional()),
  pageIndex: z.preprocess(
    toOptionalPositiveInt,
    z.number().int().min(1).optional(),
  ),
  limit: z
    .preprocess(toOptionalLimit, z.number().int().min(1).max(100).optional())
    .transform((value) => value ?? DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT),
});

export type CampaignAdminRouteSearch = z.infer<
  typeof campaignAdminUserInteractionsRouteSearchSchema
>;

export type CampaignAdminUserPageRouteSearch = z.infer<
  typeof campaignAdminUserPageRouteSearchSchema
>;

export type CampaignAdminUsersRouteSearch = z.infer<
  typeof campaignAdminUsersRouteSearchSchema
>;

export type CampaignAdminEntitiesRouteSearch = z.infer<
  typeof campaignAdminEntitiesRouteSearchSchema
>;

export type CampaignAdminNotificationsRouteSearch = z.infer<
  typeof campaignAdminNotificationsRouteSearchSchema
>;

export function normalizeCampaignAdminQueueSearch(
  input: unknown,
): CampaignAdminQueueSearch {
  const parsedSearch =
    campaignAdminUserInteractionsRouteSearchSchema.parse(input);
  const inputRecord =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const hasExplicitReviewStatus =
    Object.prototype.hasOwnProperty.call(inputRecord, "reviewStatus") ||
    parsedSearch.reviewStatusMode === "all";
  const hasOtherFilters =
    parsedSearch.phase !== undefined ||
    parsedSearch.interactionId !== undefined ||
    parsedSearch.lessonId !== undefined ||
    parsedSearch.entityCui !== undefined ||
    parsedSearch.scopeType !== undefined ||
    parsedSearch.payloadKind !== undefined ||
    parsedSearch.submissionPath !== undefined ||
    parsedSearch.userId !== undefined ||
    parsedSearch.recordKey !== undefined ||
    parsedSearch.recordKeyPrefix !== undefined ||
    parsedSearch.submittedAtFrom !== undefined ||
    parsedSearch.submittedAtTo !== undefined ||
    parsedSearch.updatedAtFrom !== undefined ||
    parsedSearch.updatedAtTo !== undefined ||
    parsedSearch.hasInstitutionThread !== undefined ||
    parsedSearch.threadPhase !== undefined;

  if (!hasExplicitReviewStatus && !hasOtherFilters) {
    return {
      ...parsedSearch,
      reviewStatus: "pending",
    };
  }

  return parsedSearch;
}

export function normalizeCampaignAdminUserPageSearch(
  input: unknown,
): CampaignAdminUserPageSearch {
  const parsedSearch = campaignAdminUserPageRouteSearchSchema.parse(input);

  return {
    ...parsedSearch,
    sortBy: parsedSearch.sortBy ?? "updatedAt",
    sortOrder: parsedSearch.sortOrder ?? "desc",
  };
}

export function normalizeCampaignAdminUsersSearch(
  input: unknown,
): CampaignAdminUsersSearch {
  const parsedSearch = campaignAdminUsersRouteSearchSchema.parse(input);

  return {
    ...parsedSearch,
    sortBy: parsedSearch.sortBy ?? "latestUpdatedAt",
    sortOrder: parsedSearch.sortOrder ?? "desc",
  };
}

export function normalizeCampaignAdminEntitiesSearch(
  input: unknown,
): CampaignAdminEntitiesSearch {
  const parsedSearch = campaignAdminEntitiesRouteSearchSchema.parse(input);
  const sortBy = parsedSearch.sortBy ?? "latestInteractionAt";

  return {
    ...parsedSearch,
    sortBy,
    sortOrder:
      parsedSearch.sortOrder ?? getDefaultCampaignAdminEntitiesSortOrder(sortBy),
  };
}

export function normalizeCampaignAdminNotificationsSearch(
  input: unknown,
): CampaignAdminNotificationsSearch {
  const parsedSearch = campaignAdminNotificationsRouteSearchSchema.parse(input);

  return {
    ...parsedSearch,
    tab: parsedSearch.tab ?? "audit",
    sortBy: parsedSearch.sortBy ?? "createdAt",
    sortOrder: parsedSearch.sortOrder ?? "desc",
  };
}

export function getCampaignAdminQueueFilters(
  search: CampaignAdminQueueSearch,
): CampaignAdminQueueFilters {
  const {
    limit,
    reviewSelectionKey,
    cursor,
    pageIndex,
    sortBy,
    sortOrder,
    ...filters
  } = search;
  void limit;
  void reviewSelectionKey;
  void cursor;
  void pageIndex;

  if (sortBy === undefined || isCampaignAdminUserInteractionsLocalSortKey(sortBy)) {
    return filters;
  }

  return {
    ...filters,
    sortBy,
    sortOrder,
  };
}

export function getCampaignAdminEntitiesFilters(
  search: CampaignAdminEntitiesSearch,
): CampaignAdminEntitiesFilters {
  const { cursor, pageIndex, limit, ...filters } = search;
  void cursor;
  void pageIndex;
  void limit;

  return filters;
}

export function getCampaignAdminNotificationsAuditFilters(
  search: CampaignAdminNotificationsSearch,
): CampaignAdminNotificationsAuditFilters {
  const { tab, cursor, pageIndex, limit, ...filters } = search;
  void tab;
  void cursor;
  void pageIndex;
  void limit;

  return filters;
}

export function createCampaignAdminFilterDraft(
  search: CampaignAdminQueueSearch,
): CampaignAdminFilterDraft {
  return {
    phase: search.phase ?? "",
    reviewStatus:
      search.reviewStatusMode === "all" ? "" : (search.reviewStatus ?? ""),
    interactionId: search.interactionId ?? "",
    lessonId: search.lessonId ?? "",
    entityCui: search.entityCui ?? "",
    scopeType: search.scopeType ?? "",
    payloadKind: search.payloadKind ?? "",
    userId: search.userId ?? "",
    recordKey: search.recordKey ?? "",
    recordKeyPrefix: search.recordKeyPrefix ?? "",
    submittedAtFrom: toDateInputValue(search.submittedAtFrom),
    submittedAtTo: toDateInputValue(search.submittedAtTo),
    updatedAtFrom: toDateInputValue(search.updatedAtFrom),
    updatedAtTo: toDateInputValue(search.updatedAtTo),
    hasInstitutionThread:
      search.hasInstitutionThread === true
        ? "true"
        : search.hasInstitutionThread === false
          ? "false"
          : "",
    threadPhase: search.threadPhase ?? "",
    limit: search.limit,
  };
}

export function buildCampaignAdminQueueSearchFromDraft(
  draft: CampaignAdminFilterDraft,
  currentSearch?: CampaignAdminQueueSearch,
): CampaignAdminQueueSearch {
  return normalizeCampaignAdminQueueSearch(
    omitUndefinedValues({
      phase: draft.phase || undefined,
      reviewStatusMode: draft.reviewStatus === "" ? "all" : undefined,
      reviewStatus: draft.reviewStatus || undefined,
      interactionId: draft.interactionId || undefined,
      lessonId: draft.lessonId || undefined,
      entityCui: draft.entityCui || undefined,
      scopeType: draft.scopeType || undefined,
      payloadKind: draft.payloadKind || undefined,
      userId: draft.userId || undefined,
      recordKey: draft.recordKey || undefined,
      recordKeyPrefix:
        draft.recordKeyPrefix.trim().length >= 16
          ? draft.recordKeyPrefix.trim()
          : undefined,
      submittedAtFrom: toUtcRangeBoundary(draft.submittedAtFrom, "start"),
      submittedAtTo: toUtcRangeBoundary(draft.submittedAtTo, "end"),
      updatedAtFrom: toUtcRangeBoundary(draft.updatedAtFrom, "start"),
      updatedAtTo: toUtcRangeBoundary(draft.updatedAtTo, "end"),
      hasInstitutionThread:
        draft.hasInstitutionThread === ""
          ? undefined
          : draft.hasInstitutionThread === "true",
      threadPhase: draft.threadPhase || undefined,
      sortBy: currentSearch?.sortBy,
      sortOrder: currentSearch?.sortOrder,
      limit: draft.limit,
    }),
  );
}

export function isCampaignAdminFilterDraftEqual(
  left: CampaignAdminQueueSearch,
  right: CampaignAdminQueueSearch,
): boolean {
  return createSearchSignature(left) === createSearchSignature(right);
}

export function createEmptyCampaignAdminQueueSearch(
  limit = DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  currentSearch?: CampaignAdminQueueSearch,
): CampaignAdminQueueSearch {
  return normalizeCampaignAdminQueueSearch(
    omitUndefinedValues({
      reviewStatusMode: undefined,
      reviewStatus: "pending",
      sortBy: currentSearch?.sortBy,
      sortOrder: currentSearch?.sortOrder,
      limit,
    }),
  );
}

export function createCampaignAdminNotificationsPaginationSignature(
  search: CampaignAdminNotificationsSearch,
): string {
  const { cursor, pageIndex, ...searchWithoutPagination } = search;
  void cursor;
  void pageIndex;

  return JSON.stringify(searchWithoutPagination);
}

export function createCampaignAdminEntitiesPaginationSignature(
  search: CampaignAdminEntitiesSearch,
): string {
  const { cursor, pageIndex, ...searchWithoutPagination } = search;
  void cursor;
  void pageIndex;

  return JSON.stringify(searchWithoutPagination);
}

export function createEmptyCampaignAdminNotificationsSearch(input?: {
  readonly tab?: CampaignAdminNotificationsTab;
  readonly limit?: number;
  readonly currentSearch?: CampaignAdminNotificationsSearch;
}): CampaignAdminNotificationsSearch {
  return normalizeCampaignAdminNotificationsSearch(
    omitUndefinedValues({
      tab: input?.tab ?? input?.currentSearch?.tab ?? "audit",
      sortBy: input?.currentSearch?.sortBy,
      sortOrder: input?.currentSearch?.sortOrder,
      limit: input?.limit ?? input?.currentSearch?.limit,
    }),
  );
}

export function createEmptyCampaignAdminEntitiesSearch(input?: {
  readonly limit?: number;
  readonly currentSearch?: CampaignAdminEntitiesSearch;
}): CampaignAdminEntitiesSearch {
  return normalizeCampaignAdminEntitiesSearch(
    omitUndefinedValues({
      sortBy: input?.currentSearch?.sortBy,
      sortOrder: input?.currentSearch?.sortOrder,
      limit: input?.limit ?? input?.currentSearch?.limit,
    }),
  );
}
