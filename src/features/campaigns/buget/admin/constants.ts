import { t } from "@lingui/core/macro";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntityConfigSortKey,
  CampaignAdminInstitutionThreadNotificationExecutionReason,
  CampaignAdminInstitutionThreadNotificationExecutionStatus,
  CampaignAdminInstitutionThreadResponseStatus,
  CampaignAdminInstitutionThreadState,
  CampaignAdminInstitutionThreadStateGroup,
  CampaignAdminNotificationEventType,
  CampaignAdminNotificationProjectionKind,
  CampaignAdminNotificationsTab,
  CampaignAdminNotificationSafeErrorCategory,
  CampaignAdminNotificationSortKey,
  CampaignAdminNotificationSource,
  CampaignAdminNotificationStatus,
  CampaignAdminNotificationTriggerExecutionStatus,
  CampaignAdminPayloadKind,
  CampaignAdminPhase,
  CampaignAdminReviewStatus,
  CampaignAdminRiskFlag,
  CampaignAdminSortOrder,
  CampaignAdminThreadPhase,
  CampaignAdminEntitiesSortKey,
  CampaignAdminUsersSortKey,
  CampaignAdminUserInteractionsSortKey,
} from "./types";

export const FUNKY_CAMPAIGN_KEY = "funky" as const;

export const DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT = 50;

export const CAMPAIGN_ADMIN_PAGE_LIMIT_VALUES = [25, 50, 100] as const;
export const CAMPAIGN_ADMIN_ENTITY_CONFIG_PAGE_LIMIT_VALUES = [
  25,
  50,
  100,
  250,
  500,
] as const;

export const CAMPAIGN_ADMIN_COLUMN_IDS = [
  "reviewStatus",
  "interactionType",
  "riskFlags",
  "institutionEmail",
  "organizationName",
  "entityCui",
  "updatedAt",
  "reviewedByUserId",
  "threadPhase",
  "actions",
] as const;

export const APPROVAL_CONFIRMATION_RISK_FLAGS = [
  "institution_email_mismatch",
  "missing_official_email",
] as const;

export const CAMPAIGN_ADMIN_INTERACTION_TYPE_OPTIONS = [
  "funky:interaction:public_debate_request",
  "funky:interaction:city_hall_website",
  "funky:interaction:budget_document",
  "funky:interaction:budget_publication_date",
  "funky:interaction:budget_status",
  "funky:interaction:city_hall_contact",
  "funky:interaction:funky_participation",
  "funky:interaction:budget_contestation",
] as const;

export const CAMPAIGN_ADMIN_USER_INTERACTIONS_SORTABLE_COLUMNS: Record<
  CampaignAdminUserInteractionsSortKey,
  {
    readonly dataType: "string" | "date" | "number" | "enum";
    readonly defaultOrder: CampaignAdminSortOrder;
  }
> = {
  reviewStatus: {
    dataType: "enum",
    defaultOrder: "asc",
  },
  userId: {
    dataType: "string",
    defaultOrder: "asc",
  },
  organizationName: {
    dataType: "string",
    defaultOrder: "asc",
  },
  entity: {
    dataType: "string",
    defaultOrder: "asc",
  },
  updatedAt: {
    dataType: "date",
    defaultOrder: "desc",
  },
  riskFlagCount: {
    dataType: "number",
    defaultOrder: "desc",
  },
  threadPhase: {
    dataType: "enum",
    defaultOrder: "asc",
  },
  interactionType: {
    dataType: "string",
    defaultOrder: "asc",
  },
  value: {
    dataType: "string",
    defaultOrder: "asc",
  },
  reviewState: {
    dataType: "enum",
    defaultOrder: "asc",
  },
  reviewedByUserId: {
    dataType: "string",
    defaultOrder: "asc",
  },
};

export const CAMPAIGN_ADMIN_USER_INTERACTIONS_LOCAL_SORT_KEYS = [
  "value",
  "reviewState",
] as const;

export function isCampaignAdminUserInteractionsLocalSortKey(
  sortKey: CampaignAdminUserInteractionsSortKey,
): sortKey is (typeof CAMPAIGN_ADMIN_USER_INTERACTIONS_LOCAL_SORT_KEYS)[number] {
  return CAMPAIGN_ADMIN_USER_INTERACTIONS_LOCAL_SORT_KEYS.includes(
    sortKey as (typeof CAMPAIGN_ADMIN_USER_INTERACTIONS_LOCAL_SORT_KEYS)[number],
  );
}

export const CAMPAIGN_ADMIN_USERS_SORTABLE_COLUMNS: Record<
  CampaignAdminUsersSortKey,
  {
    readonly dataType: "string" | "date" | "number";
    readonly defaultOrder: CampaignAdminSortOrder;
  }
> = {
  userId: {
    dataType: "string",
    defaultOrder: "asc",
  },
  latestUpdatedAt: {
    dataType: "date",
    defaultOrder: "desc",
  },
  interactionCount: {
    dataType: "number",
    defaultOrder: "desc",
  },
  pendingReviewCount: {
    dataType: "number",
    defaultOrder: "desc",
  },
};

export const CAMPAIGN_ADMIN_ENTITIES_SORTABLE_COLUMNS: Record<
  CampaignAdminEntitiesSortKey,
  {
    readonly dataType: "string" | "date" | "number";
    readonly defaultOrder: CampaignAdminSortOrder;
  }
> = {
  entityCui: {
    dataType: "string",
    defaultOrder: "asc",
  },
  userCount: {
    dataType: "number",
    defaultOrder: "desc",
  },
  interactionCount: {
    dataType: "number",
    defaultOrder: "desc",
  },
  pendingReviewCount: {
    dataType: "number",
    defaultOrder: "desc",
  },
  notificationSubscriberCount: {
    dataType: "number",
    defaultOrder: "desc",
  },
  notificationOutboxCount: {
    dataType: "number",
    defaultOrder: "desc",
  },
  latestInteractionAt: {
    dataType: "date",
    defaultOrder: "desc",
  },
  latestNotificationAt: {
    dataType: "date",
    defaultOrder: "desc",
  },
};

export const CAMPAIGN_ADMIN_ENTITY_CONFIG_SORTABLE_COLUMNS: Record<
  CampaignAdminEntityConfigSortKey,
  {
    readonly dataType: "string" | "date" | "number";
    readonly defaultOrder: CampaignAdminSortOrder;
  }
> = {
  updatedAt: {
    dataType: "date",
    defaultOrder: "desc",
  },
  entityCui: {
    dataType: "string",
    defaultOrder: "asc",
  },
  budgetPublicationDate: {
    dataType: "date",
    defaultOrder: "desc",
  },
  officialBudgetUrl: {
    dataType: "string",
    defaultOrder: "asc",
  },
  usersCount: {
    dataType: "number",
    defaultOrder: "desc",
  },
};

export const CAMPAIGN_ADMIN_NOTIFICATION_SORTABLE_COLUMNS: Record<
  CampaignAdminNotificationSortKey,
  {
    readonly dataType: "date" | "number" | "enum";
    readonly defaultOrder: CampaignAdminSortOrder;
  }
> = {
  createdAt: {
    dataType: "date",
    defaultOrder: "desc",
  },
  sentAt: {
    dataType: "date",
    defaultOrder: "desc",
  },
  status: {
    dataType: "enum",
    defaultOrder: "asc",
  },
  attemptCount: {
    dataType: "number",
    defaultOrder: "desc",
  },
};

export function getCampaignAdminUserInteractionsSortLabel(
  sortKey: CampaignAdminUserInteractionsSortKey,
): string {
  switch (sortKey) {
    case "reviewStatus":
      return t`Review status`;
    case "userId":
      return t`User ID`;
    case "organizationName":
      return t`Association`;
    case "entity":
      return t`Entity`;
    case "updatedAt":
      return t`Updated`;
    case "riskFlagCount":
      return t`Risk flags`;
    case "threadPhase":
      return t`Message`;
    case "interactionType":
      return t`Interaction`;
    case "value":
      return t`Value`;
    case "reviewState":
      return t`Review state`;
    case "reviewedByUserId":
      return t`Reviewed by`;
    default:
      return sortKey;
  }
}

export function getCampaignAdminUsersSortLabel(
  sortKey: CampaignAdminUsersSortKey,
): string {
  switch (sortKey) {
    case "userId":
      return t`User ID`;
    case "latestUpdatedAt":
      return t`Last Updated`;
    case "interactionCount":
      return t`Interactions`;
    case "pendingReviewCount":
      return t`Pending Reviews`;
    default:
      return sortKey;
  }
}

export function getCampaignAdminEntitiesSortLabel(
  sortKey: CampaignAdminEntitiesSortKey,
): string {
  switch (sortKey) {
    case "entityCui":
      return t`Entity`;
    case "userCount":
      return t`Users`;
    case "interactionCount":
      return t`Interactions`;
    case "pendingReviewCount":
      return t`Pending reviews`;
    case "notificationSubscriberCount":
      return t`Subscribers`;
    case "notificationOutboxCount":
      return t`Notifications`;
    case "latestInteractionAt":
      return t`Latest interaction`;
    case "latestNotificationAt":
      return t`Latest notification`;
    default:
      return sortKey;
  }
}

export function getCampaignAdminEntityConfigSortLabel(
  sortKey: CampaignAdminEntityConfigSortKey,
): string {
  switch (sortKey) {
    case "updatedAt":
      return t`Updated`;
    case "entityCui":
      return t`Entity CUI`;
    case "budgetPublicationDate":
      return t`Budget publication date`;
    case "officialBudgetUrl":
      return t`Official budget URL`;
    case "usersCount":
      return t`Users`;
    default:
      return sortKey;
  }
}

export function getCampaignAdminEntityNotificationTypeLabel(
  notificationType: string | null,
): string {
  switch (notificationType) {
    case "funky:outbox:welcome":
    case "public_debate_campaign_welcome":
      return t`Campaign welcome`;
    case "funky:outbox:entity_subscription":
    case "public_debate_entity_subscription":
      return t`Entity subscription`;
    case "funky:outbox:entity_update":
    case "public_debate_entity_update":
      return t`Entity update`;
    case null:
      return t`Unavailable`;
    default:
      return notificationType;
  }
}

export function getCampaignAdminNotificationTabLabel(
  tab: CampaignAdminNotificationsTab,
): string {
  switch (tab) {
    case "audit":
      return t`Audit`;
    case "run":
      return t`Run`;
    case "templates":
      return t`Templates`;
    default:
      return tab;
  }
}

export function getCampaignAdminNotificationStatusLabel(
  status: CampaignAdminNotificationStatus,
): string {
  switch (status) {
    case "pending":
      return t`Pending`;
    case "composing":
      return t`Composing`;
    case "sending":
      return t`Sending`;
    case "sent":
      return t`Sent`;
    case "delivered":
      return t`Delivered`;
    case "webhook_timeout":
      return t`Webhook timeout`;
    case "failed_transient":
      return t`Transient failure`;
    case "failed_permanent":
      return t`Permanent failure`;
    case "suppressed":
      return t`Suppressed`;
    case "skipped_unsubscribed":
      return t`Skipped: unsubscribed`;
    case "skipped_no_email":
      return t`Skipped: no email`;
    default:
      return status;
  }
}

export function getCampaignAdminNotificationEventTypeLabel(
  eventType: CampaignAdminNotificationEventType | null,
): string {
  switch (eventType) {
    case "thread_started":
      return t`Thread started`;
    case "thread_failed":
      return t`Thread failed`;
    case "reply_received":
      return t`Reply received`;
    case "reply_reviewed":
      return t`Reply reviewed`;
    case null:
      return t`Not applicable`;
    default:
      return t`Unknown`;
  }
}

export function getCampaignAdminNotificationSourceLabel(
  source: CampaignAdminNotificationSource | null,
): string {
  switch (source) {
    case "campaign_admin":
      return t`Campaign admin`;
    case "user_event_worker":
      return t`User event worker`;
    case "system":
      return t`System`;
    case "clerk_webhook":
      return t`Clerk webhook`;
    case null:
      return t`Unknown`;
    default:
      return t`Unknown`;
  }
}

export function getCampaignAdminNotificationProjectionLabel(
  projectionKind: CampaignAdminNotificationProjectionKind,
): string {
  switch (projectionKind) {
    case "public_debate_campaign_welcome":
      return t`Campaign welcome`;
    case "public_debate_entity_subscription":
      return t`Entity subscription`;
    case "public_debate_entity_update":
      return t`Entity update`;
    case "public_debate_admin_response":
      return t`Admin response`;
    case "public_debate_admin_failure":
      return t`Admin failure`;
    case "admin_reviewed_interaction":
      return t`Reviewed interaction`;
    default:
      return projectionKind;
  }
}

export function getCampaignAdminNotificationSortLabel(
  sortKey: CampaignAdminNotificationSortKey,
): string {
  switch (sortKey) {
    case "createdAt":
      return t`Created`;
    case "sentAt":
      return t`Sent`;
    case "status":
      return t`Status`;
    case "attemptCount":
      return t`Attempts`;
    default:
      return sortKey;
  }
}

export function getCampaignAdminNotificationSafeErrorCategoryLabel(
  category: CampaignAdminNotificationSafeErrorCategory | null,
): string {
  switch (category) {
    case "skipped_unsubscribed":
      return t`Skipped: unsubscribed`;
    case "skipped_no_email":
      return t`Skipped: no email`;
    case "suppressed":
      return t`Suppressed`;
    case "webhook_timeout":
      return t`Webhook timeout`;
    case "compose_validation":
      return t`Compose validation`;
    case "render_error":
      return t`Render error`;
    case "email_lookup":
      return t`Email lookup`;
    case "send_retryable":
      return t`Retryable send failure`;
    case "send_permanent":
      return t`Permanent send failure`;
    case "provider_bounce":
      return t`Provider bounce`;
    case "provider_suppressed":
      return t`Provider suppressed`;
    case "unknown":
      return t`Unknown`;
    case null:
      return t`None`;
    default:
      return t`Unknown`;
  }
}

export function getCampaignAdminNotificationTriggerExecutionStatusLabel(
  status: CampaignAdminNotificationTriggerExecutionStatus,
): string {
  switch (status) {
    case "queued":
      return t`Queued`;
    case "skipped":
      return t`Skipped`;
    case "partial":
      return t`Partial`;
    case "delegated":
      return t`Delegated`;
    default:
      return status;
  }
}

export function getCampaignAdminInstitutionThreadNotificationExecutionStatusLabel(
  status: CampaignAdminInstitutionThreadNotificationExecutionStatus,
): string {
  switch (status) {
    case "queued":
      return t`Queued`;
    case "skipped":
      return t`Skipped`;
    case "partial":
      return t`Partial`;
    default:
      return status;
  }
}

export function getCampaignAdminInstitutionThreadNotificationExecutionReasonLabel(
  reason: CampaignAdminInstitutionThreadNotificationExecutionReason | undefined,
): string | null {
  switch (reason) {
    case "no_subscribers":
      return t`Nobody is subscribed to receive admin-response updates for this thread yet.`;
    case "no_eligible_recipients":
      return t`Subscriptions exist, but nobody is currently eligible to receive this notification.`;
    case "already_processed":
      return t`This admin response was already processed for notification delivery, so existing outbox rows were reused.`;
    case "enqueue_failed":
      return t`The response was saved, but the notification jobs could not be queued cleanly.`;
    case "admin_response_not_found":
      return t`The response was saved, but the server could not resolve the admin response for notification delivery.`;
    case undefined:
      return null;
    default:
      return reason;
  }
}

export function buildCampaignAdminSelectionKey(
  userId: string,
  recordKey: string,
): string {
  return `${userId}::${recordKey}`;
}

export function getCampaignAdminCampaignLabel(
  campaignKey: CampaignAdminCampaignKey,
): string {
  switch (campaignKey) {
    case FUNKY_CAMPAIGN_KEY:
      return t`Funky Citizens`;
    default:
      return campaignKey;
  }
}

export function getCampaignAdminPhaseLabel(phase: CampaignAdminPhase): string {
  switch (phase) {
    case "idle":
      return t`Idle`;
    case "draft":
      return t`Draft`;
    case "pending":
      return t`Pending`;
    case "resolved":
      return t`Resolved`;
    case "failed":
      return t`Failed`;
    default:
      return phase;
  }
}

export function getCampaignAdminReviewStatusLabel(
  status: CampaignAdminReviewStatus | null,
): string {
  switch (status) {
    case "pending":
      return t`Pending`;
    case "approved":
      return t`Approved`;
    case "rejected":
      return t`Rejected`;
    case null:
      return t`Not reviewed`;
    default:
      return t`Unknown`;
  }
}

export function getCampaignAdminInteractionTypeLabel(
  interactionId: string,
): string {
  switch (interactionId) {
    case "funky:interaction:public_debate_request":
      return t`Public debate request`;
    case "funky:interaction:city_hall_website":
      return t`City hall website`;
    case "funky:interaction:budget_document":
      return t`Budget document`;
    case "funky:interaction:budget_publication_date":
      return t`Budget publication date`;
    case "funky:interaction:budget_status":
      return t`Budget status`;
    case "funky:interaction:city_hall_contact":
      return t`City hall contact`;
    case "funky:interaction:funky_participation":
      return t`Participation report`;
    case "funky:interaction:budget_contestation":
      return t`Budget contestation`;
    default:
      return interactionId;
  }
}

export function getCampaignAdminPayloadKindLabel(
  value: CampaignAdminPayloadKind | null,
): string {
  switch (value) {
    case "choice":
      return t`Choice`;
    case "text":
      return t`Text`;
    case "url":
      return t`Link`;
    case "number":
      return t`Number`;
    case "json":
      return t`Structured`;
    case null:
      return t`Unknown`;
    default:
      return t`Unknown`;
  }
}

export function getCampaignAdminThreadPhaseLabel(
  value: CampaignAdminThreadPhase | null,
): string {
  switch (value) {
    case "sending":
      return t`Sending`;
    case "awaiting_reply":
      return t`Awaiting reply`;
    case "reply_received_unreviewed":
      return t`Reply received`;
    case "manual_follow_up_needed":
      return t`Manual follow-up`;
    case "resolved_positive":
      return t`Resolved positive`;
    case "resolved_negative":
      return t`Resolved negative`;
    case "closed_no_response":
      return t`Closed without reply`;
    case "failed":
      return t`Thread failed`;
    case null:
      return t`No thread`;
    default:
      return t`Unknown`;
  }
}

export function getCampaignAdminInstitutionThreadStateLabel(
  value: CampaignAdminInstitutionThreadState,
): string {
  switch (value) {
    case "started":
      return t`Started`;
    case "pending":
      return t`Pending`;
    case "resolved":
      return t`Resolved`;
    default:
      return value;
  }
}

export function getCampaignAdminInstitutionThreadStateGroupLabel(
  value: CampaignAdminInstitutionThreadStateGroup,
): string {
  switch (value) {
    case "open":
      return t`Open`;
    case "closed":
      return t`Closed`;
    default:
      return value;
  }
}

export function getCampaignAdminInstitutionThreadResponseStatusLabel(
  value: CampaignAdminInstitutionThreadResponseStatus | null,
): string {
  switch (value) {
    case "registration_number_received":
      return t`Registration number received`;
    case "request_confirmed":
      return t`Request confirmed`;
    case "request_denied":
      return t`Request denied`;
    case null:
      return t`No response status`;
    default:
      return value;
  }
}

export function getCampaignAdminRiskFlagLabel(
  flag: CampaignAdminRiskFlag,
): string {
  switch (flag) {
    case "invalid_institution_email":
      return t`Invalid institution email`;
    case "institution_email_mismatch":
      return t`Institution email mismatch`;
    case "missing_official_email":
      return t`Missing official email`;
    case "institution_thread_failed":
      return t`Institution thread failed`;
    default:
      return flag;
  }
}

export function requiresApprovalConfirmation(
  riskFlags: readonly CampaignAdminRiskFlag[],
): boolean {
  return riskFlags.some((riskFlag) =>
    APPROVAL_CONFIRMATION_RISK_FLAGS.includes(
      riskFlag as (typeof APPROVAL_CONFIRMATION_RISK_FLAGS)[number],
    ),
  );
}
