import { t } from "@lingui/core/macro";
import { Card, CardContent } from "@/components/ui/card";
import type { CampaignAdminNotificationPlanSummary } from "@/features/campaigns/buget/admin/types";
import { getCampaignAdminNotificationPlanSummaryHighlights } from "@/features/campaigns/buget/admin/utils/campaign-admin-notification-run-utils";

type SummaryCardProps = {
  readonly label: string;
  readonly value: number;
  readonly description: string;
};

function SummaryCard({ label, value, description }: SummaryCardProps) {
  return (
    <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-none">
      <CardContent className="space-y-2 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-3xl font-semibold text-foreground tabular-nums">
          {value}
        </p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

type CampaignAdminNotificationPlanSummaryProps = {
  readonly summary: CampaignAdminNotificationPlanSummary;
};

export function CampaignAdminNotificationPlanSummary({
  summary,
}: CampaignAdminNotificationPlanSummaryProps) {
  const highlights = getCampaignAdminNotificationPlanSummaryHighlights(summary);

  return (
    <div
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      aria-label={t`Notification preview summary`}
    >
      <SummaryCard
        label={t`Total matches`}
        value={highlights.totalMatches}
        description={t`People or records that matched the current conditions.`}
      />
      <SummaryCard
        label={t`Ready to send`}
        value={highlights.readyToSend}
        description={t`Notifications the server says can be sent right now.`}
      />
      <SummaryCard
        label={t`Already sent`}
        value={highlights.alreadySent}
        description={t`Matches that already received this notification.`}
      />
      <SummaryCard
        label={t`Not ready to send`}
        value={highlights.notReadyToSend}
        description={t`Already queued, not eligible, or missing data for sending.`}
      />
    </div>
  );
}
