import { DataTable } from "./DataTable";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

const MAX_VISIBLE_PAGES = 3; // Max number of page buttons to show (excluding prev/next, first/last)

export function DataDisplay({
  budgetItems,
  isLoading,
  onPageChange,
  onPageSizeChange,
  sort,
  onSortColumn,
}: DataDisplayProps) {

  const renderPageNumbers = () => {
    const { currentPage, totalPages } = budgetItems;
    const pageNumbers = [];

    if (totalPages <= MAX_VISIBLE_PAGES + 2) { // Show all if few pages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(
          <Button
            key={i}
            variant={currentPage === i ? "default" : "outline"}
            size="sm"
            className="h-9 min-w-9 w-auto px-3 text-sm hidden sm:inline-flex" // Hidden on xs, visible sm+
            onClick={() => onPageChange(i)}
            aria-label={`Go to page ${i}`}
          >
            {i}
          </Button>
        );
      }
    } else {
      // Always show first page
      pageNumbers.push(
        <Button
          key={1}
          variant={currentPage === 1 ? "default" : "outline"}
          size="sm"
          className="h-9 min-w-9 w-auto px-3 text-sm hidden sm:inline-flex"
          onClick={() => onPageChange(1)}
          aria-label="Go to page 1"
        >
          1
        </Button>
      );

      let startPage = Math.max(2, currentPage - Math.floor((MAX_VISIBLE_PAGES -1) / 2));
      let endPage = Math.min(totalPages - 1, startPage + MAX_VISIBLE_PAGES - 2 );

      if (currentPage < MAX_VISIBLE_PAGES) {
        endPage = Math.min(totalPages -1, MAX_VISIBLE_PAGES);
      }

      if (currentPage > totalPages - (MAX_VISIBLE_PAGES-1)){
        startPage = Math.max(2, totalPages - MAX_VISIBLE_PAGES +1 );
      }

      if (startPage > 2) {
        pageNumbers.push(<span key="ellipsis-start" className="mx-1 hidden sm:inline">...</span>);
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(
          <Button
            key={i}
            variant={currentPage === i ? "default" : "outline"}
            size="sm"
            className="h-9 min-w-9 w-auto px-3 text-sm hidden sm:inline-flex"
            onClick={() => onPageChange(i)}
            aria-label={`Go to page ${i}`}
          >
            {i}
          </Button>
        );
      }

      if (endPage < totalPages - 1) {
        pageNumbers.push(<span key="ellipsis-end" className="mx-1 hidden sm:inline">...</span>);
      }

      // Always show last page
      pageNumbers.push(
        <Button
          key={totalPages}
          variant={currentPage === totalPages ? "default" : "outline"}
          size="sm"
          className="h-9 min-w-9 w-auto px-3 text-sm hidden sm:inline-flex"
          onClick={() => onPageChange(totalPages)}
          aria-label={`Go to last page (${totalPages})`}
        >
          {totalPages}
        </Button>
      );
    }
    return pageNumbers;
  };

  return (
    <div className="space-y-4">
      <DataTable
        data={budgetItems.data}
        isLoading={isLoading}
        sort={sort}
        onSortColumn={onSortColumn}
      />
      {!isLoading && budgetItems.totalCount > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-border bg-background p-3 shadow-sm md:flex-row md:gap-6 md:p-4">
          {/* Left Side: Entries Info & Page Size Selector */}
          <div className="flex w-full flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-4 md:w-auto">
            <span>
              Showing {budgetItems.data.length} of {budgetItems.totalCount} entries
            </span>
            <div className="flex items-center space-x-2">
              <span>Rows:</span>
              <Select
                value={budgetItems.pageSize.toString()}
                onValueChange={(value) => onPageSizeChange(parseInt(value))}
              >
                <SelectTrigger className="h-9 w-[75px] text-sm" aria-label="Select page size">
                  <SelectValue placeholder={budgetItems.pageSize.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Side: Pagination Controls */}
          <div className="flex w-full flex-wrap items-center justify-center gap-2 md:w-auto md:justify-end">
             <Button
                variant="outline"
                size="sm"
                className="h-9 px-2 sm:px-3" // More compact on xs
                onClick={() => onPageChange(1)}
                disabled={!budgetItems.hasPreviousPage || budgetItems.currentPage === 1}
                aria-label="Go to first page"
              >
                <ChevronsLeft className="h-4 w-4 sm:mr-1" /> 
                <span className="hidden sm:inline">First</span>
              </Button>
            <Button
              variant="outline"
              size="sm" 
              className="h-9 px-2 sm:px-3"
              onClick={() => onPageChange(budgetItems.currentPage - 1)}
              disabled={!budgetItems.hasPreviousPage}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <div className="items-center space-x-1 hidden sm:flex">{renderPageNumbers()}</div>
            {/* Mobile specific page info */}
            <div className="sm:hidden flex items-center justify-center px-2 text-sm font-medium">
                Page {budgetItems.currentPage} of {budgetItems.totalPages}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2 sm:px-3"
              onClick={() => onPageChange(budgetItems.currentPage + 1)}
              disabled={!budgetItems.hasNextPage}
              aria-label="Next page"
            >
               <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
            </Button>
             <Button
                variant="outline"
                size="sm"
                className="h-9 px-2 sm:px-3"
                onClick={() => onPageChange(budgetItems.totalPages)}
                disabled={!budgetItems.hasNextPage || budgetItems.currentPage === budgetItems.totalPages}
                aria-label={`Go to last page (${budgetItems.totalPages})`}
              >
                <span className="hidden sm:inline">Last</span>
                <ChevronsRight className="h-4 w-4 sm:ml-1" />
              </Button>
          </div>
        </div>
      )}
    </div>
  );
}
