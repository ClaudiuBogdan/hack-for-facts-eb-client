import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Button } from "@/components/ui/button";

export function formatCampaignAdminFilteredCountCopy(
  itemCount: number,
  totalCount: number,
): string {
  if (itemCount === totalCount) {
    return t`${totalCount} total`;
  }

  return t`Showing ${itemCount} of ${totalCount}`;
}

type CampaignAdminCursorPagerProps = {
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly itemCount: number;
  readonly totalCount?: number;
  readonly canPrevious: boolean;
  readonly canNext: boolean;
  readonly isLoading: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly variant?: "default" | "connected";
};

export function CampaignAdminCursorPager({
  pageIndex,
  pageSize,
  itemCount,
  totalCount,
  canPrevious,
  canNext,
  isLoading,
  onPrevious,
  onNext,
  variant = "default",
}: CampaignAdminCursorPagerProps) {
  const visibleRowCount = itemCount;

  const containerClasses =
    variant === "connected"
      ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      : "flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between";

  return (
    <div className={containerClasses}>
      <div className="space-y-1" aria-live="polite">
        <p className="text-sm font-medium text-foreground tabular-nums">
          {t`Page ${pageIndex}`}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {t`Rows per page`}: {pageSize}
          </span>
          <span aria-hidden="true">•</span>
          <span>
            {totalCount === undefined
              ? t`${visibleRowCount} visible`
              : formatCampaignAdminFilteredCountCopy(
                  visibleRowCount,
                  totalCount,
                )}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={!canPrevious || isLoading}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t`Previous`}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onNext}
          disabled={!canNext || isLoading}
          className="gap-2"
        >
          {t`Next`}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
