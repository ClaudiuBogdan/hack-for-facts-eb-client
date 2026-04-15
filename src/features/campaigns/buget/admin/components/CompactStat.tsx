import { Skeleton } from "@/components/ui/skeleton";

type CompactStatProps = {
  readonly label: string;
  readonly value: number;
  readonly isLoading?: boolean;
  readonly className?: string;
};

export function CompactStat({ label, value, isLoading, className }: CompactStatProps) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
        data-testid="compact-stat-label"
      >
        {label}
      </span>
      {isLoading ? (
        <Skeleton className="h-6 w-8" data-testid="compact-stat-skeleton" />
      ) : (
        <span
          className={`text-lg font-semibold tabular-nums ${className ?? "text-foreground"}`}
          data-testid="compact-stat-value"
        >
          {value}
        </span>
      )}
    </div>
  );
}
