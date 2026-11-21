import type {
  CampaignAdminInstitutionThreadResponseStatus,
  CampaignAdminInstitutionThreadState,
  CampaignAdminNotificationStatus,
  CampaignAdminRiskFlag,
  CampaignAdminThreadPhase,
} from "@/features/campaigns/buget/admin/types";

/** Whole class strings (never built at runtime) for one status meaning each. */
export const campaignAdminStatusClassNames = {
  live: "border-status-live-fg/30 bg-status-live-bg text-status-live-fg",
  partial: "border-status-partial-fg/30 bg-status-partial-bg text-status-partial-fg",
  blocked: "border-status-blocked-fg/30 bg-status-blocked-bg text-status-blocked-fg",
  /** In progress or informational: not a judgement. */
  info: "border-primary/30 bg-primary/10 text-foreground",
  neutral: "border-border bg-muted text-foreground",
} as const;

/**
 * An error alert: the blocked pair, icon included. The shared Alert's
 * `destructive` variant draws red text on the page (3.5:1 light, 1.9:1 dark).
 */
export const campaignAdminBlockedAlertClassName = `${campaignAdminStatusClassNames.blocked} [&>svg]:text-status-blocked-fg`;

/**
 * One meaning per thread phase, used wherever a phase badge is drawn; the word
 * from getCampaignAdminThreadPhaseLabel always accompanies it.
 */
export function getCampaignAdminThreadPhaseClassName(
  phase: CampaignAdminThreadPhase | null,
): string {
  switch (phase) {
    case "resolved_positive":
      return campaignAdminStatusClassNames.live;
    case "resolved_negative":
    case "failed":
      return campaignAdminStatusClassNames.blocked;
    case "awaiting_reply":
    case "reply_received_unreviewed":
    case "manual_follow_up_needed":
      return campaignAdminStatusClassNames.partial;
    case "sending":
      return campaignAdminStatusClassNames.info;
    case "closed_no_response":
    case null:
    default:
      return campaignAdminStatusClassNames.neutral;
  }
}

/**
 * One meaning per notification state: delivered or sent = live; queued, pending,
 * composing and sending = in progress (info); failures = blocked; suppressed or
 * skipped = neutral. The run-preview rows use the same four meanings.
 */
export function getCampaignAdminNotificationStatusClassName(
  status: CampaignAdminNotificationStatus,
): string {
  switch (status) {
    case "delivered":
    case "sent":
      return campaignAdminStatusClassNames.live;
    case "failed_transient":
    case "failed_permanent":
    case "webhook_timeout":
      return campaignAdminStatusClassNames.blocked;
    case "suppressed":
    case "skipped_unsubscribed":
    case "skipped_no_email":
      return campaignAdminStatusClassNames.neutral;
    case "pending":
    case "composing":
    case "sending":
    default:
      return campaignAdminStatusClassNames.info;
  }
}

/**
 * One meaning per institution thread state, for the threads table and the thread
 * detail alike: started = in progress, pending = waiting on someone, resolved = done.
 */
export function getCampaignAdminInstitutionThreadStateClassName(
  threadState: CampaignAdminInstitutionThreadState,
): string {
  switch (threadState) {
    case "started":
      return campaignAdminStatusClassNames.info;
    case "pending":
      return campaignAdminStatusClassNames.partial;
    case "resolved":
      return campaignAdminStatusClassNames.live;
    default:
      return "";
  }
}

/**
 * One meaning per institution response, for the threads table and the thread
 * detail alike: a registration number is progress, a confirmation is the goal, a
 * denial is a refusal; no response yet is neutral.
 */
export function getCampaignAdminInstitutionResponseStatusClassName(
  responseStatus: CampaignAdminInstitutionThreadResponseStatus | null,
): string {
  switch (responseStatus) {
    case "registration_number_received":
      return campaignAdminStatusClassNames.info;
    case "request_confirmed":
      return campaignAdminStatusClassNames.live;
    case "request_denied":
      return campaignAdminStatusClassNames.blocked;
    case null:
      return campaignAdminStatusClassNames.neutral;
    default:
      return "";
  }
}

export type CampaignAdminRiskSeverity = "blocked" | "partial";

/**
 * What each risk flag means, once: a flag that stops the request from reaching
 * the institution (no valid address to send to, a thread that failed) is
 * blocked; one an operator can confirm past (a mismatched or missing official
 * address) is partial, a caution.
 */
export function getCampaignAdminRiskFlagSeverity(
  flag: CampaignAdminRiskFlag,
): CampaignAdminRiskSeverity {
  switch (flag) {
    case "invalid_institution_email":
    case "institution_thread_failed":
      return "blocked";
    case "institution_email_mismatch":
    case "missing_official_email":
    default:
      return "partial";
  }
}

/** The most severe meaning among the flags present: an alert around them takes it. */
export function getCampaignAdminRiskFlagsSeverity(
  flags: readonly CampaignAdminRiskFlag[],
): CampaignAdminRiskSeverity {
  return flags.some((flag) => getCampaignAdminRiskFlagSeverity(flag) === "blocked")
    ? "blocked"
    : "partial";
}

export function getCampaignAdminRiskFlagClassName(
  flag: CampaignAdminRiskFlag,
): string {
  return campaignAdminStatusClassNames[getCampaignAdminRiskFlagSeverity(flag)];
}

/** The alert around a set of flags: its tint, text and icon follow the most severe flag. */
export function getCampaignAdminRiskFlagsAlertClassName(
  flags: readonly CampaignAdminRiskFlag[],
): string {
  return getCampaignAdminRiskFlagsSeverity(flags) === "blocked"
    ? campaignAdminBlockedAlertClassName
    : `${campaignAdminStatusClassNames.partial} [&>svg]:text-status-partial-fg`;
}

/**
 * A count of flagged items, where the flags themselves are not known (the hub's
 * and the interactions summary's totals): it says "needs a look", a caution,
 * since a flag ranges from partial to blocked.
 */
export const campaignAdminFlaggedCountClassName = "text-status-partial-fg";
