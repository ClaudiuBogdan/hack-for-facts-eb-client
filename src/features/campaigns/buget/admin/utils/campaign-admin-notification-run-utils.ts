import { t } from "@lingui/core/macro";
import { formatCampaignAdminUserIdPreview } from "@/features/campaigns/buget/admin/utils/format-user-id-preview";
import { toUtcRangeBoundary } from "@/features/campaigns/buget/admin/utils/date-inputs";
import type {
  CampaignAdminNotificationPlanRow,
  CampaignAdminNotificationPlanRowStatus,
  CampaignAdminNotificationPlanSummary,
  CampaignAdminRunnableTemplateDescriptor,
  CampaignAdminRunnableTemplateDryRunBody,
} from "@/features/campaigns/buget/admin/types";

export type CampaignAdminNotificationConditionOperator =
  | "is"
  | "on_or_after"
  | "on_or_before";

export type CampaignAdminNotificationConditionInputKind =
  | "text"
  | "date"
  | "review-status";

export type CampaignAdminNotificationConditionDefinition = {
  readonly fieldKey: string;
  readonly label: string;
  readonly inputKind: CampaignAdminNotificationConditionInputKind;
  readonly operators: readonly CampaignAdminNotificationConditionOperator[];
  readonly mapOperatorToRequest: (
    operator: CampaignAdminNotificationConditionOperator,
  ) =>
    | {
        readonly bucket: "selectors" | "filters";
        readonly fieldName: string;
      }
    | null;
};

export type CampaignAdminNotificationCondition = {
  readonly id: string;
  readonly fieldKey: string;
  readonly operator: CampaignAdminNotificationConditionOperator;
  readonly value: string;
};

export type CampaignAdminNotificationTypeOption = {
  readonly notificationTypeId: string;
  readonly label: string;
  readonly description: string;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly defaultPageSize: number;
  readonly maxPageSize: number;
  readonly backend: CampaignAdminRunnableTemplateDescriptor;
  readonly conditionDefinitions: readonly CampaignAdminNotificationConditionDefinition[];
};

export type CampaignAdminNotificationPreviewRowFilter =
  | "all"
  | "ready"
  | "already_sent"
  | "not_ready";

export type CampaignAdminNotificationPlanPaginationState = {
  readonly currentCursor: string | null;
  readonly previousCursors: readonly (string | null)[];
  readonly pageIndex: number;
};

export type CampaignAdminNotificationRunRequestKind =
  | "notificationTypes"
  | "preview"
  | "previewPage"
  | "sendNotifications";

export type CampaignAdminNotificationRunErrorState = {
  readonly title: string;
  readonly description: string;
  readonly shouldClearPreview: boolean;
};

type ErrorLike = {
  readonly message?: string;
  readonly status?: number;
};

const PREFERRED_FIELD_ORDER = [
  "userId",
  "entityCui",
  "recordKey",
  "reviewStatus",
  "interactionId",
  "updatedAt",
  "submittedAt",
] as const;

function formatCampaignAdminNotificationFieldLabel(fieldKey: string): string {
  switch (fieldKey) {
    case "userId":
      return t`User`;
    case "entityCui":
      return t`Entity CUI`;
    case "recordKey":
      return t`Record key`;
    case "reviewStatus":
      return t`Review result`;
    case "interactionId":
      return t`Interaction`;
    case "updatedAt":
      return t`Updated at`;
    case "submittedAt":
      return t`Submitted at`;
    default:
      return fieldKey
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/^./, (value) => value.toUpperCase())
        .replace(/\bId\b/g, "ID")
        .replace(/\bIds\b/g, "IDs")
        .replace(/\bCui\b/g, "CUI");
  }
}

function getNotificationTypeLabel(
  runnable: CampaignAdminRunnableTemplateDescriptor,
): string {
  switch (runnable.runnableId) {
    case "admin_reviewed_user_interaction":
      return t`Reviewed interaction`;
    case "bucharest_budget_analysis":
      return t`Bucharest budget analysis`;
    default:
      return formatCampaignAdminNotificationFieldLabel(runnable.templateId);
  }
}

function getNotificationTypeDescription(
  runnable: CampaignAdminRunnableTemplateDescriptor,
): string {
  switch (runnable.runnableId) {
    case "admin_reviewed_user_interaction":
      return t`Notify people after an admin reviews one of their interactions.`;
    case "bucharest_budget_analysis":
      return t`Notify Bucharest subscribers about the budget analysis.`;
    default:
      return runnable.description;
  }
}

function getConditionInputKind(
  fieldKey: string,
): CampaignAdminNotificationConditionInputKind {
  if (fieldKey === "reviewStatus") {
    return "review-status";
  }

  if (fieldKey.endsWith("At")) {
    return "date";
  }

  return "text";
}

function createConditionId(fieldKey: string): string {
  return `${fieldKey}-${Math.random().toString(36).slice(2, 10)}`;
}

function getPreferredFieldIndex(fieldKey: string): number {
  const index = PREFERRED_FIELD_ORDER.indexOf(
    fieldKey as (typeof PREFERRED_FIELD_ORDER)[number],
  );
  return index === -1 ? PREFERRED_FIELD_ORDER.length : index;
}

function humanizeReasonCode(reasonCode: string): string {
  return reasonCode
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeConditionValue(
  inputKind: CampaignAdminNotificationConditionInputKind,
  operator: CampaignAdminNotificationConditionOperator,
  rawValue: string,
): string | undefined {
  const trimmedValue = rawValue.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  if (inputKind !== "date") {
    return trimmedValue;
  }

  return operator === "on_or_after"
    ? toUtcRangeBoundary(trimmedValue, "start")
    : toUtcRangeBoundary(trimmedValue, "end");
}

export function createCampaignAdminNotificationTypeOptions(
  runnables: readonly CampaignAdminRunnableTemplateDescriptor[],
): readonly CampaignAdminNotificationTypeOption[] {
  return runnables.map((runnable) => {
    const directFields = [
      ...runnable.selectors.map((field) => ({
        bucket: "selectors" as const,
        fieldName: field.name,
      })),
      ...runnable.filters.map((field) => ({
        bucket: "filters" as const,
        fieldName: field.name,
      })),
    ];

    const rangeGroups = new Map<
      string,
      Partial<Record<CampaignAdminNotificationConditionOperator, {
        readonly bucket: "selectors" | "filters";
        readonly fieldName: string;
      }>>
    >();
    const conditionDefinitions: CampaignAdminNotificationConditionDefinition[] =
      [];

    for (const field of directFields) {
      if (field.fieldName.endsWith("From")) {
        const baseKey = field.fieldName.slice(0, -4);
        rangeGroups.set(baseKey, {
          ...(rangeGroups.get(baseKey) ?? {}),
          on_or_after: field,
        });
        continue;
      }

      if (field.fieldName.endsWith("To")) {
        const baseKey = field.fieldName.slice(0, -2);
        rangeGroups.set(baseKey, {
          ...(rangeGroups.get(baseKey) ?? {}),
          on_or_before: field,
        });
        continue;
      }

      conditionDefinitions.push({
        fieldKey: field.fieldName,
        label: formatCampaignAdminNotificationFieldLabel(field.fieldName),
        inputKind: getConditionInputKind(field.fieldName),
        operators: ["is"],
        mapOperatorToRequest: () => field,
      });
    }

    for (const [fieldKey, operators] of rangeGroups.entries()) {
      const supportedOperators = (
        ["on_or_after", "on_or_before"] as const
      ).filter((operator) => operators[operator] !== undefined);

      conditionDefinitions.push({
        fieldKey,
        label: formatCampaignAdminNotificationFieldLabel(fieldKey),
        inputKind: "date",
        operators: supportedOperators,
        mapOperatorToRequest: (operator) => operators[operator] ?? null,
      });
    }

    conditionDefinitions.sort((left, right) => {
      const preferredOrderDifference =
        getPreferredFieldIndex(left.fieldKey) -
        getPreferredFieldIndex(right.fieldKey);

      if (preferredOrderDifference !== 0) {
        return preferredOrderDifference;
      }

      return left.label.localeCompare(right.label);
    });

    return {
      notificationTypeId: runnable.runnableId,
      label: getNotificationTypeLabel(runnable),
      description: getNotificationTypeDescription(runnable),
      templateId: runnable.templateId,
      templateVersion: runnable.templateVersion,
      defaultPageSize: runnable.defaultPageSize,
      maxPageSize: runnable.maxPageSize,
      backend: runnable,
      conditionDefinitions,
    };
  });
}

export function createCampaignAdminNotificationCondition(
  notificationType: CampaignAdminNotificationTypeOption | null,
  preferredFieldKey?: string,
): CampaignAdminNotificationCondition | null {
  const fieldDefinition =
    notificationType?.conditionDefinitions.find(
      (candidate) => candidate.fieldKey === preferredFieldKey,
    ) ?? notificationType?.conditionDefinitions[0];

  if (!fieldDefinition) {
    return null;
  }

  return {
    id: createConditionId(fieldDefinition.fieldKey),
    fieldKey: fieldDefinition.fieldKey,
    operator: fieldDefinition.operators[0] ?? "is",
    value: "",
  };
}

export function getCampaignAdminConditionDefinition(
  notificationType: CampaignAdminNotificationTypeOption | null,
  fieldKey: string,
): CampaignAdminNotificationConditionDefinition | null {
  return (
    notificationType?.conditionDefinitions.find(
      (candidate) => candidate.fieldKey === fieldKey,
    ) ?? null
  );
}

export function parseCampaignAdminNotificationConditions(
  serializedConditions: string | undefined,
): readonly CampaignAdminNotificationCondition[] {
  if (!serializedConditions || serializedConditions.trim().length === 0) {
    return [];
  }

  return serializedConditions
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .flatMap((entry) => {
      const firstSeparatorIndex = entry.indexOf(":");
      const secondSeparatorIndex = entry.indexOf(":", firstSeparatorIndex + 1);

      if (firstSeparatorIndex <= 0 || secondSeparatorIndex <= firstSeparatorIndex) {
        return [];
      }

      const fieldKey = entry.slice(0, firstSeparatorIndex);
      const operator = entry.slice(
        firstSeparatorIndex + 1,
        secondSeparatorIndex,
      ) as CampaignAdminNotificationConditionOperator;
      const rawValue = entry.slice(secondSeparatorIndex + 1);
      const value = (() => {
        try {
          return decodeURIComponent(rawValue);
        } catch {
          return null;
        }
      })();

      if (value === null) {
        return [];
      }

      if (
        fieldKey.length === 0 ||
        !["is", "on_or_after", "on_or_before"].includes(operator)
      ) {
        return [];
      }

      return [
        {
          id: createConditionId(fieldKey),
          fieldKey,
          operator,
          value,
        },
      ];
    });
}

export function serializeCampaignAdminNotificationConditions(
  conditions: readonly CampaignAdminNotificationCondition[],
): string | undefined {
  const serializedConditions = conditions
    .map(
      (condition) =>
        `${condition.fieldKey}:${condition.operator}:${encodeURIComponent(
          condition.value,
        )}`,
    )
    .join(";");

  return serializedConditions.length > 0 ? serializedConditions : undefined;
}

export function normalizeCampaignAdminNotificationConditions(input: {
  readonly notificationType: CampaignAdminNotificationTypeOption | null;
  readonly conditions: readonly CampaignAdminNotificationCondition[];
}): readonly CampaignAdminNotificationCondition[] {
  if (input.notificationType === null) {
    return [];
  }

  return input.conditions.flatMap((condition) => {
    const conditionDefinition = getCampaignAdminConditionDefinition(
      input.notificationType,
      condition.fieldKey,
    );

    if (!conditionDefinition) {
      return [];
    }

    const operator = conditionDefinition.operators.includes(condition.operator)
      ? condition.operator
      : (conditionDefinition.operators[0] ?? "is");

    return [
      {
        ...condition,
        operator,
      },
    ];
  });
}

export function buildCampaignAdminNotificationPreviewBody(input: {
  readonly notificationType: CampaignAdminNotificationTypeOption | null;
  readonly conditions: readonly CampaignAdminNotificationCondition[];
}): CampaignAdminRunnableTemplateDryRunBody {
  if (input.notificationType === null) {
    return {};
  }

  const selectors: Record<string, string> = {};
  const filters: Record<string, string> = {};

  for (const condition of input.conditions) {
    const conditionDefinition = getCampaignAdminConditionDefinition(
      input.notificationType,
      condition.fieldKey,
    );

    if (!conditionDefinition) {
      continue;
    }

    const requestField = conditionDefinition.mapOperatorToRequest(
      condition.operator,
    );

    if (!requestField) {
      continue;
    }

    const value = normalizeConditionValue(
      conditionDefinition.inputKind,
      condition.operator,
      condition.value,
    );

    if (value === undefined) {
      continue;
    }

    if (requestField.bucket === "selectors") {
      selectors[requestField.fieldName] = value;
      continue;
    }

    filters[requestField.fieldName] = value;
  }

  return {
    ...(Object.keys(selectors).length > 0 ? { selectors } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
  };
}

export function getCampaignAdminNotificationConditionOperatorLabel(
  operator: CampaignAdminNotificationConditionOperator,
): string {
  switch (operator) {
    case "is":
      return t`is`;
    case "on_or_after":
      return t`is on or after`;
    case "on_or_before":
      return t`is on or before`;
    default:
      return operator;
  }
}

export function getCampaignAdminNotificationPlanSummaryHighlights(
  summary: CampaignAdminNotificationPlanSummary,
) {
  return {
    totalMatches: summary.totalRowCount,
    readyToSend: summary.willSendCount,
    alreadySent: summary.alreadySentCount,
    notReadyToSend:
      summary.alreadyPendingCount +
      summary.ineligibleCount +
      summary.missingDataCount,
  };
}

export function getCampaignAdminNotificationResultLabel(
  status: CampaignAdminNotificationPlanRowStatus,
): string {
  switch (status) {
    case "will_send":
      return t`Ready to send`;
    case "already_sent":
      return t`Already sent`;
    case "already_pending":
      return t`Already queued`;
    case "ineligible":
      return t`Not eligible`;
    case "missing_data":
      return t`Missing data`;
    default:
      return status;
  }
}

export function getCampaignAdminNotificationResultClassName(
  status: CampaignAdminNotificationPlanRowStatus,
): string {
  switch (status) {
    case "will_send":
      return "border-emerald-300 bg-emerald-100 text-emerald-950";
    case "already_sent":
      return "border-sky-300 bg-sky-100 text-sky-950";
    case "already_pending":
      return "border-amber-300 bg-amber-100 text-amber-950";
    case "ineligible":
    case "missing_data":
      return "border-slate-300 bg-slate-100 text-slate-900";
    default:
      return "border-slate-300 bg-slate-100 text-slate-900";
  }
}

export function getCampaignAdminNotificationWhyLabel(
  row: CampaignAdminNotificationPlanRow,
): string {
  return row.statusMessage.trim().length > 0
    ? row.statusMessage
    : humanizeReasonCode(row.reasonCode);
}

export function getCampaignAdminNotificationPreviewRowFilterLabel(
  filter: CampaignAdminNotificationPreviewRowFilter,
): string {
  switch (filter) {
    case "all":
      return t`All`;
    case "ready":
      return t`Ready`;
    case "already_sent":
      return t`Already sent`;
    case "not_ready":
      return t`Not ready`;
    default:
      return filter;
  }
}

export function matchesCampaignAdminNotificationPreviewRowFilter(
  row: CampaignAdminNotificationPlanRow,
  filter: CampaignAdminNotificationPreviewRowFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "ready":
      return row.status === "will_send";
    case "already_sent":
      return row.status === "already_sent";
    case "not_ready":
      return row.status !== "will_send" && row.status !== "already_sent";
    default:
      return true;
  }
}

export function formatCampaignAdminNotificationUserLabel(userId: string): string {
  return formatCampaignAdminUserIdPreview(userId);
}

export function formatCampaignAdminNotificationTechnicalValue(
  value: string | null,
): string {
  return value?.trim() || t`Unavailable`;
}

export function createCampaignAdminNotificationPlanPaginationState(): CampaignAdminNotificationPlanPaginationState {
  return {
    currentCursor: null,
    previousCursors: [],
    pageIndex: 1,
  };
}

export function parseCampaignAdminNotificationPreviewTrail(
  serializedTrail: string | undefined,
): readonly (string | null)[] {
  if (!serializedTrail || serializedTrail.trim().length === 0) {
    return [];
  }

  try {
    const decodedTrail = JSON.parse(
      decodeURIComponent(serializedTrail),
    ) as unknown;

    if (!Array.isArray(decodedTrail)) {
      return [];
    }

    return decodedTrail.flatMap((entry) => {
      if (entry === null) {
        return [null];
      }

      return typeof entry === "string" ? [entry] : [];
    });
  } catch {
    return [];
  }
}

export function serializeCampaignAdminNotificationPreviewTrail(
  trail: readonly (string | null)[],
): string | undefined {
  if (trail.length === 0) {
    return undefined;
  }

  return encodeURIComponent(JSON.stringify(trail));
}

export function getNextCampaignAdminNotificationPlanPaginationState(
  state: CampaignAdminNotificationPlanPaginationState,
  nextCursor: string,
): CampaignAdminNotificationPlanPaginationState {
  return {
    currentCursor: nextCursor,
    previousCursors: [...state.previousCursors, state.currentCursor],
    pageIndex: state.pageIndex + 1,
  };
}

export function getPreviousCampaignAdminNotificationPlanPaginationState(
  state: CampaignAdminNotificationPlanPaginationState,
): CampaignAdminNotificationPlanPaginationState | null {
  if (state.pageIndex <= 1) {
    return null;
  }

  if (state.previousCursors.length === 0) {
    return {
      currentCursor: null,
      previousCursors: [],
      pageIndex: 1,
    };
  }

  const nextPreviousCursors = [...state.previousCursors];
  const currentCursor = nextPreviousCursors.pop() ?? null;

  return {
    currentCursor,
    previousCursors: nextPreviousCursors,
    pageIndex: Math.max(1, state.pageIndex - 1),
  };
}

export function canSendCampaignAdminNotificationPlan(input: {
  readonly previewId: string | null;
  readonly readyCount: number;
  readonly isPreviewPending: boolean;
  readonly isSendPending: boolean;
  readonly isConsumed: boolean;
}): boolean {
  return (
    input.previewId !== null &&
    input.readyCount > 0 &&
    !input.isPreviewPending &&
    !input.isSendPending &&
    !input.isConsumed
  );
}

function formatPreviewRerunDescription(message: string | undefined): string {
  if (message && message.trim().length > 0) {
    return t`${message} Run preview again to refresh the matches.`;
  }

  return t`Run preview again to refresh the matches.`;
}

export function classifyCampaignAdminNotificationRunError(
  error: unknown,
  requestKind: CampaignAdminNotificationRunRequestKind,
): CampaignAdminNotificationRunErrorState {
  const errorLike = (error ?? {}) as ErrorLike;
  const message = errorLike.message;
  const status = errorLike.status;

  if (status === 401) {
    return {
      title: t`Session expired`,
      description: t`Refresh your authentication session and try again.`,
      shouldClearPreview:
        requestKind === "previewPage" || requestKind === "sendNotifications",
    };
  }

  if (status === 403) {
    return {
      title:
        requestKind === "notificationTypes"
          ? t`You do not have access to notifications`
          : t`You do not have access to this notification action`,
      description:
        message?.trim() && message.trim().length > 0
          ? message
          : t`The server denied access to this notification action.`,
      shouldClearPreview:
        requestKind === "previewPage" || requestKind === "sendNotifications",
    };
  }

  if (status === 404) {
    return {
      title:
        requestKind === "notificationTypes"
          ? t`Notification types unavailable`
          : requestKind === "preview"
            ? t`Notification type unavailable`
            : t`Preview unavailable`,
      description:
        requestKind === "previewPage" || requestKind === "sendNotifications"
          ? t`This preview is no longer available. Run preview again to create a fresh result set.`
          : message?.trim() && message.trim().length > 0
            ? message
            : t`This notification flow is unavailable on the current server.`,
      shouldClearPreview:
        requestKind === "previewPage" || requestKind === "sendNotifications",
    };
  }

  if (status === 400) {
    if (requestKind === "preview") {
      return {
        title: t`Preview failed`,
        description:
          message?.trim() && message.trim().length > 0
            ? message
            : t`The server rejected these conditions.`,
        shouldClearPreview: false,
      };
    }

    return {
      title: t`Preview is no longer valid`,
      description: formatPreviewRerunDescription(message),
      shouldClearPreview: true,
    };
  }

  if (typeof status === "number" && status >= 500) {
    return {
      title: t`Server error`,
      description:
        message?.trim() && message.trim().length > 0
          ? message
          : t`The server could not complete this notification request right now.`,
      shouldClearPreview: false,
    };
  }

  return {
    title: t`Notification request failed`,
    description:
      message?.trim() && message.trim().length > 0
        ? message
        : t`The server could not complete this notification request right now.`,
    shouldClearPreview: false,
  };
}
