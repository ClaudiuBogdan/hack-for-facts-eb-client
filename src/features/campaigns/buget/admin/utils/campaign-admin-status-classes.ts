import type {
  CampaignAdminNotificationStatus,
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
