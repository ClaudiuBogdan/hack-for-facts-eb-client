import { ChevronDown } from "lucide-react";
import { t } from "@lingui/core/macro";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { CampaignAdminInteractionMetaStats } from "@/features/campaigns/buget/admin/types";
import {
  getCampaignAdminPhaseLabel,
  getCampaignAdminThreadPhaseLabel,
} from "@/features/campaigns/buget/admin/constants";
import { CompactStat } from "@/features/campaigns/buget/admin/components/CompactStat";

function SummaryCard({
  label,
  value,
  description,
}: {
  readonly label: string;
  readonly value: number;
  readonly description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function formatSummaryCountCopy(
  items: ReadonlyArray<{
    readonly label: string;
    readonly value: number;
  }>,
): string {
  return items.map((item) => `${item.value} ${item.label}`).join(", ");
}

type InteractionsSummaryPanelProps = {
  readonly stats: CampaignAdminInteractionMetaStats;
  readonly isExpanded: boolean;
  readonly onExpandedChange: (expanded: boolean) => void;
};

export function InteractionsSummaryPanel({
  stats,
  isExpanded,
  onExpandedChange,
}: InteractionsSummaryPanelProps) {
  const threadInProgressCount =
    stats.threadPhaseCounts.sending + stats.threadPhaseCounts.awaiting_reply;
  const threadResolvedCount =
    stats.threadPhaseCounts.resolved_positive +
    stats.threadPhaseCounts.resolved_negative +
    stats.threadPhaseCounts.closed_no_response;
  const threadSummaryItems = [
    {
      label: t`In progress`,
      value: threadInProgressCount,
    },
    {
      label: getCampaignAdminThreadPhaseLabel("reply_received_unreviewed"),
      value: stats.threadPhaseCounts.reply_received_unreviewed,
    },
    {
      label: getCampaignAdminThreadPhaseLabel("manual_follow_up_needed"),
      value: stats.threadPhaseCounts.manual_follow_up_needed,
    },
    {
      label: t`Resolved`,
      value: threadResolvedCount,
    },
    ...(stats.threadPhaseCounts.failed > 0
      ? [
          {
            label: getCampaignAdminThreadPhaseLabel("failed"),
            value: stats.threadPhaseCounts.failed,
          },
        ]
      : []),
    ...(stats.threadPhaseCounts.none > 0
      ? [
          {
            label: getCampaignAdminThreadPhaseLabel(null),
            value: stats.threadPhaseCounts.none,
          },
        ]
      : []),
  ];

  return (
    <Collapsible open={isExpanded} onOpenChange={onExpandedChange}>
      {/* Compact stats bar - always visible */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <CompactStat label={t`Interactions`} value={stats.total} />
        <CompactStat label={t`Pending`} value={stats.reviewStatusCounts.pending} className="text-amber-600 dark:text-amber-400" />
        <CompactStat label={t`Approved`} value={stats.reviewStatusCounts.approved} className="text-emerald-600 dark:text-emerald-400" />
        <CompactStat label={t`Rejected`} value={stats.reviewStatusCounts.rejected} className="text-muted-foreground" />
        {stats.riskFlagged > 0 ? (
          <CompactStat label={t`Flagged`} value={stats.riskFlagged} className="text-rose-600 dark:text-rose-400" />
        ) : null}
        {threadInProgressCount > 0 ? (
          <CompactStat label={t`In progress`} value={threadInProgressCount} className="text-cyan-600 dark:text-cyan-400" />
        ) : null}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex items-baseline gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="font-medium uppercase tracking-[0.16em]">
              {isExpanded ? t`Show less` : t`Show more`}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>
      </div>

      {/* Expanded full cards */}
      <CollapsibleContent className="mt-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label={t`Review status`}
            value={stats.total}
            description={t`${stats.reviewStatusCounts.pending} pending, ${stats.reviewStatusCounts.approved} approved, ${stats.reviewStatusCounts.rejected} rejected, ${stats.reviewStatusCounts.notReviewed} not reviewed`}
          />
          <SummaryCard
            label={t`Phase`}
            value={stats.total}
            description={t`${stats.phaseCounts.idle} ${getCampaignAdminPhaseLabel("idle")}, ${stats.phaseCounts.draft} ${getCampaignAdminPhaseLabel("draft")}, ${stats.phaseCounts.pending} ${getCampaignAdminPhaseLabel("pending")}, ${stats.phaseCounts.resolved} ${getCampaignAdminPhaseLabel("resolved")}, ${stats.phaseCounts.failed} ${getCampaignAdminPhaseLabel("failed")}`}
          />
          <SummaryCard
            label={t`Threads`}
            value={stats.withInstitutionThread}
            description={formatSummaryCountCopy(threadSummaryItems)}
          />
          <SummaryCard
            label={t`Risk flags`}
            value={stats.riskFlagged}
            description={t`Items flagged for review attention`}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
