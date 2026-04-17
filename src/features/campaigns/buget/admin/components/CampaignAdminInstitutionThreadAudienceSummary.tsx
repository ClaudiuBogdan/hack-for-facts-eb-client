import { t } from "@lingui/core/macro";
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
    return (
      <div className={className}>
        <p className="text-sm font-medium text-foreground">
          {formatRequesterCount(audience.requesterCount)}
          {" · "}
          {formatSubscriberCount(audience.subscriberCount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {t`Eligible now:`}{" "}
          {formatRequesterCount(audience.eligibleRequesterCount)}
          {" · "}
          {formatSubscriberCount(audience.eligibleSubscriberCount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {t`${eligibleRecipientCount} of ${rawRecipientCount} can receive notifications now.`}
        </p>
      </div>
    );
  }

  return (
    <section
      className={`space-y-3 rounded-xl border border-border/60 bg-background/60 p-4 ${className ?? ""}`.trim()}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          {title ?? t`Notification audience`}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t`${eligibleRecipientCount} of ${rawRecipientCount} users are eligible to receive an admin-response notification right now.`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t`Requester`}
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">
            {audience.requesterCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {t`${audience.eligibleRequesterCount} eligible now`}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t`Subscribers`}
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">
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
    </section>
  );
}
