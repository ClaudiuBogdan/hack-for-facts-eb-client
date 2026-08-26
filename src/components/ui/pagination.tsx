import { useMemo } from "react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Input } from "@/components/ui/input";

export type PaginationProps = {
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange?: (size: number) => void;
  readonly pageSizeOptions?: readonly number[];
  readonly isLoading?: boolean;
  readonly className?: string;
  readonly maxVisiblePages?: number;
  readonly showPageJump?: boolean;
};

/**
 * Accessible, responsive pagination with page number buttons, first/prev/next/last controls,
 * page size selector, and an entries summary.
 */
export function Pagination({
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100] as const,
  isLoading = false,
  className,
  maxVisiblePages = 5,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / Math.max(1, pageSize)));
  const safeCurrent = Math.min(Math.max(1, currentPage || 1), totalPages);

  const from = totalCount === 0 ? 0 : (safeCurrent - 1) * pageSize + 1;
  const to = totalCount === 0 ? 0 : Math.min(safeCurrent * pageSize, totalCount);

  const pageItems = useMemo(() => buildPageItems(safeCurrent, totalPages, Math.max(3, maxVisiblePages)), [safeCurrent, totalPages, maxVisiblePages]);

  const canPrev = safeCurrent > 1 && !isLoading;
  const canNext = safeCurrent < totalPages && !isLoading;

  return (
    <div className={cn("flex flex-col items-center justify-between gap-4 rounded-lg border border-border bg-card p-3 shadow-sm md:flex-row md:gap-6 md:p-4", className)}>
      {/* Left: entries info + page size */}
      <div className="flex w-full flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-4 md:w-auto">
        <span aria-live="polite">
          <Trans>
            Se afișează {from}–{to} din {totalCount} rânduri
          </Trans>
        </span>
        {onPageSizeChange ? (
          <div className="flex items-center space-x-2">
            <span>
              <Trans>Rânduri:</Trans>
            </span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-9 w-[90px] text-sm" aria-label={t`Rânduri pe pagină`}>
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {/* Right: pagination controls */}
      <nav className="flex w-full flex-wrap items-center justify-center gap-2 md:w-auto md:justify-end" aria-label={t`Paginare`}>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-2 sm:px-3"
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
          aria-label={t`Prima pagină`}
        >
          <ChevronsLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline"><Trans>Prima</Trans></span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-2 sm:px-3"
          onClick={() => onPageChange(safeCurrent - 1)}
          disabled={!canPrev}
          aria-label={t`Pagina anterioară`}
        >
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline"><Trans>Precedenta</Trans></span>
        </Button>

        {/* Numeric page buttons for sm+ */}
        <div className="items-center space-x-1 hidden sm:flex">
          {pageItems.map((item, idx) => {
            if (item.type === 'ellipsis') {
              return (
                <span key={`ellipsis-${idx}`} className="mx-1 select-none text-muted-foreground">
                  …
                </span>
              );
            }
            const isActive = item.page === safeCurrent;
            return (
              <Button
                key={item.page}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="h-9 min-w-9 w-auto px-3 text-sm"
                onClick={() => onPageChange(item.page)}
                aria-label={t`Pagina ${item.page}`}
                aria-current={isActive ? "page" : undefined}
                disabled={isLoading}
              >
                {item.page}
              </Button>
            );
          })}
        </div>

        {/* Mobile page info and page jump */}
        <div className="sm:hidden flex items-center justify-center px-2 text-sm font-medium gap-2">
          <span><Trans>Pagina {safeCurrent} din {totalPages}</Trans></span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-9 px-2 sm:px-3"
          onClick={() => onPageChange(safeCurrent + 1)}
          disabled={!canNext}
          aria-label={t`Pagina următoare`}
        >
          <span className="hidden sm:inline"><Trans>Următoarea</Trans></span>
          <ChevronRight className="h-4 w-4 sm:ml-1" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-2 sm:px-3"
          onClick={() => onPageChange(totalPages)}
          disabled={!canNext}
          aria-label={t`Ultima pagină (${totalPages})`}
        >
          <span className="hidden sm:inline"><Trans>Ultima</Trans></span>
          <ChevronsRight className="h-4 w-4 sm:ml-1" />
        </Button>

        {/* Page jump (desktop) */}
        {totalPages > 1 ? (
          <div className="hidden sm:flex items-center gap-2 pl-2">
            <span className="text-sm text-muted-foreground">
              <Trans>Mergi la</Trans>
            </span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              defaultValue={safeCurrent}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                const value = Number((e.target as HTMLInputElement).value);
                if (!Number.isFinite(value)) return;
                const next = Math.min(Math.max(1, Math.floor(value)), totalPages);
                if (next !== safeCurrent) onPageChange(next);
              }}
              className="h-9 w-16 text-center"
              aria-label={t`Mergi la pagina`}
              disabled={isLoading}
            />
          </div>
        ) : null}
      </nav>
    </div>
  );
}

type PageItem = { type: 'page'; page: number } | { type: 'ellipsis' };

function buildPageItems(current: number, total: number, maxVisible: number): PageItem[] {
  // Show all if few pages
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => ({ type: 'page', page: i + 1 }));
  }

  const items: PageItem[] = [];
  const first = 1;
  const last = total;

  const innerCount = maxVisible - 2; // reserve for first & last
  let start = Math.max(2, current - Math.floor(innerCount / 2));
  let end = Math.min(total - 1, start + innerCount - 1);
  // Adjust when at the edges
  if (current < Math.ceil(maxVisible / 2)) {
    start = 2;
    end = start + innerCount - 1;
  }
  if (current > total - Math.ceil(maxVisible / 2)) {
    end = total - 1;
    start = end - innerCount + 1;
  }

  items.push({ type: 'page', page: first });
  if (start > 2) items.push({ type: 'ellipsis' });
  for (let p = start; p <= end; p++) {
    items.push({ type: 'page', page: p });
  }
  if (end < total - 1) items.push({ type: 'ellipsis' });
  items.push({ type: 'page', page: last });
  return items;
}


