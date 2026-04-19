import { t } from "@lingui/core/macro";
import { cn } from "@/lib/utils";
import type { CampaignAdminInstitutionThreadNotificationAudience } from "@/features/campaigns/buget/admin/types";

type CampaignAdminInstitutionThreadAudienceSummaryProps = {
  readonly audience: CampaignAdminInstitutionThreadNotificationAudience;
  readonly variant?: "compact" | "detailed";
  readonly title?: string;
  readonly showDefinitions?: boolean;
  readonly className?: string;
};

function formatRequesterCount(count: number): string {
  return count === 1 ? t`${count} requester` : t`${count} requesters`;
}

function formatSubscriberCount(count: number): string {
  return count === 1 ? t`${count} subscriber` : t`${count} subscribers`;
}

export function CampaignAdminInstitutionThreadAudienceSummary({
  audience,
  variant = "detailed",
  title,
  showDefinitions = false,
  className,
}: CampaignAdminInstitutionThreadAudienceSummaryProps) {
  const rawRecipientCount = audience.requesterCount + audience.subscriberCount;
  const eligibleRecipientCount =
    audience.eligibleRequesterCount + audience.eligibleSubscriberCount;

  if (variant === "compact") {
    const requesterBucketsMatch =
      audience.eligibleRequesterCount === audience.requesterCount;
    const subscriberBucketsMatch =
      audience.eligibleSubscriberCount === audience.subscriberCount;

    let secondaryLine: string;
    if (rawRecipientCount === 0) {
      secondaryLine = t`No recipients are configured for this thread.`;
    } else if (requesterBucketsMatch && subscriberBucketsMatch) {
      secondaryLine =
        eligibleRecipientCount === rawRecipientCount
          ? t`All listed recipients can receive a notification when you send.`
          : t`${eligibleRecipientCount} of ${rawRecipientCount} recipients are eligible for notification now.`;
    } else {
      secondaryLine = t`Eligible now: ${formatRequesterCount(audience.eligibleRequesterCount)} · ${formatSubscriberCount(audience.eligibleSubscriberCount)}`;
    }

    return (
      <div className={cn("space-y-1", className)}>
        <p className="text-sm font-medium text-foreground">
          {formatRequesterCount(audience.requesterCount)}
          {" · "}
          {formatSubscriberCount(audience.subscriberCount)}
        </p>
        <p className="text-xs text-muted-foreground">{secondaryLine}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          {title ?? t`Notification audience`}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t`${eligibleRecipientCount} of ${rawRecipientCount} users are eligible to receive an admin-response notification right now.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <div className="space-y-1 sm:border-r sm:border-border/50 sm:pr-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t`Requester`}
          </p>
          <p className="text-lg font-semibold tabular-nums text-foreground">
            {audience.requesterCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {t`${audience.eligibleRequesterCount} eligible now`}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t`Subscribers`}
          </p>
          <p className="text-lg font-semibold tabular-nums text-foreground">
            {audience.subscriberCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {t`${audience.eligibleSubscriberCount} eligible now`}
          </p>
        </div>
      </div>

      {showDefinitions ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {t`Requester means the user who opened this thread. Subscribers are other users following the same entity for campaign updates.`}
        </p>
      ) : null}
    </div>
  );
}
