import { DataTable } from "./DataTable";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BudgetLineItem,
  PaginatedResult,
} from "@/lib/api/dataDiscovery";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortOrder } from "@/schemas/interfaces";

interface DataDisplayProps {
  budgetItems: PaginatedResult<BudgetLineItem>;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  sort: SortOrder;
  onSortColumn: (columnId: string) => void;
}

export function DataDisplay({
  budgetItems,
  isLoading,
  onPageChange,
  onPageSizeChange,
  sort,
  onSortColumn,
}: DataDisplayProps) {
  return (
    <div className="space-y-4">
      <DataTable
        data={budgetItems.data}
        isLoading={isLoading}
        sort={sort}
        onSortColumn={onSortColumn}
      />
      {!isLoading && budgetItems.totalCount > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-4 p-4 rounded-lg shadow-sm bg-background border border-border">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
            <span className="text-sm text-muted-foreground">
              Showing {budgetItems.data.length} of {budgetItems.totalCount} entries
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select
                value={budgetItems.pageSize.toString()}
                onValueChange={(value) => onPageSizeChange(parseInt(value))}
              >
                <SelectTrigger className="h-9 w-[80px] text-sm" aria-label="Select page size">
                  <SelectValue placeholder={budgetItems.pageSize.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center space-x-2 w-full md:w-auto justify-center md:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(budgetItems.currentPage - 1)}
              disabled={!budgetItems.hasPreviousPage}
              aria-label="Previous page"
              className="min-w-[90px]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex items-center space-x-1">
              {budgetItems.currentPage > 5 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 min-w-9 w-auto px-2 text-sm"
                    onClick={() => onPageChange(1)}
                    aria-label="Go to first page"
                  >
                    1
                  </Button>
                  <span className="mx-1">...</span>
                </>
              )}
              {Array.from(
                { length: Math.min(5, budgetItems.totalPages) },
                (_, i) => {
                  let pageToShow = i + 1;
                  if (budgetItems.totalPages > 5) {
                    const start = Math.max(1, budgetItems.currentPage - 2);
                    const end = Math.min(budgetItems.totalPages, start + 4);
                    pageToShow = start + i;
                    if (pageToShow > end) return null;
                  }
                  return (
                    <Button
                      key={pageToShow}
                      variant={budgetItems.currentPage === pageToShow ? "default" : "outline"}
                      size="icon"
                      className="h-9 min-w-9 w-auto px-2 text-sm"
                      onClick={() => onPageChange(pageToShow)}
                      aria-label={`Go to page ${pageToShow}`}
                    >
                      {pageToShow}
                    </Button>
                  );
                }
              )}
              {budgetItems.totalPages > 5 && budgetItems.currentPage < budgetItems.totalPages - 2 && (
                <>
                  <span className="mx-1">...</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 min-w-9 w-auto px-2 text-sm"
                    onClick={() => onPageChange(budgetItems.totalPages)}
                    aria-label={`Go to last page (${budgetItems.totalPages})`}
                  >
                    {budgetItems.totalPages}
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(budgetItems.currentPage + 1)}
              disabled={!budgetItems.hasNextPage}
              aria-label="Next page"
              className="min-w-[90px]"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
