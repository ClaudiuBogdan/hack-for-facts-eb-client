import { t } from "@lingui/core/macro";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminPayloadKind,
  CampaignAdminPhase,
  CampaignAdminSortOrder,
  CampaignAdminReviewStatus,
  CampaignAdminRiskFlag,
  CampaignAdminThreadPhase,
  CampaignAdminUserInteractionsSortKey,
} from "./types";

export const FUNKY_CAMPAIGN_KEY = "funky" as const;

export const DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT = 50;

export const CAMPAIGN_ADMIN_PAGE_LIMIT_VALUES = [25, 50, 100] as const;

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
  reviewedByUserId: {
    dataType: "string",
    defaultOrder: "asc",
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
    case "reviewedByUserId":
      return t`Reviewed by`;
    default:
      return sortKey;
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
