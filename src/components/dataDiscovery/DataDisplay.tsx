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
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Showing {budgetItems.data.length} of{" "}
              {budgetItems.totalCount} entries
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select
                value={budgetItems.pageSize.toString()}
                onValueChange={(value) =>
                  onPageSizeChange(parseInt(value))
                }
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue
                    placeholder={budgetItems.pageSize.toString()}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                entries
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(budgetItems.currentPage - 1)}
              disabled={!budgetItems.hasPreviousPage}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex items-center space-x-1">
              {Array.from(
                { length: Math.min(5, budgetItems.totalPages) },
                (_, i) => {
                  // Show 5 pages centered around current page
                  let pageToShow = i + 1;
                  if (budgetItems.totalPages > 5) {
                    const start = Math.max(
                      1,
                      budgetItems.currentPage - 2
                    );
                    const end = Math.min(
                      budgetItems.totalPages,
                      start + 4
                    );
                    pageToShow = start + i;
                    if (pageToShow > end) return null;
                  }

                  return (
                    <Button
                      key={pageToShow}
                      variant={
                        budgetItems.currentPage === pageToShow
                          ? "default"
                          : "outline"
                      }
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onPageChange(pageToShow)}
                    >
                      {pageToShow}
                    </Button>
                  );
                }
              )}

              {budgetItems.totalPages > 5 &&
                budgetItems.currentPage < budgetItems.totalPages - 2 && (
                  <>
                    <span className="mx-1">...</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onPageChange(budgetItems.totalPages)}
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
