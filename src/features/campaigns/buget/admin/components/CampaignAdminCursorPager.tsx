import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Button } from "@/components/ui/button";

type CampaignAdminCursorPagerProps = {
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly itemCount: number;
  readonly canPrevious: boolean;
  readonly canNext: boolean;
  readonly isLoading: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
};

export function CampaignAdminCursorPager({
  pageIndex,
  pageSize,
  itemCount,
  canPrevious,
  canNext,
  isLoading,
  onPrevious,
  onNext,
}: CampaignAdminCursorPagerProps) {
  const visibleRowCount = itemCount;

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1" aria-live="polite">
        <p className="text-sm font-medium text-foreground tabular-nums">
          {t`Page ${pageIndex}`}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {t`Rows per page`}: {pageSize}
          </span>
          <span aria-hidden="true">•</span>
          <span>{t`${visibleRowCount} visible`}</span>
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
