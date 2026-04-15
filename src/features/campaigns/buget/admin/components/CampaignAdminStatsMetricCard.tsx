import { cn } from "@/lib/utils";

type CampaignAdminStatsMetricCardProps = {
  readonly label: string;
  readonly value: number | string;
  readonly description?: string;
  readonly compact?: boolean;
};

export function CampaignAdminStatsMetricCard({
  label,
  value,
  description,
  compact = false,
}: CampaignAdminStatsMetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80",
        compact ? "p-3" : "p-4",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-semibold tracking-tight text-foreground",
          compact ? "text-lg" : "text-2xl",
          typeof value === "number" ? "tabular-nums" : undefined,
        )}
      >
        {value}
      </p>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
