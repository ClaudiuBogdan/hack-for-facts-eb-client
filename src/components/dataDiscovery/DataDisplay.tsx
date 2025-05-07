import { DataTable } from "./DataTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useDataDiscoveryFilters } from "@/stores/dataDiscoveryFilters";
import {
  ChartBar,
  Table2,
  Network,
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

interface DataDisplayProps {
  budgetItems: PaginatedResult<BudgetLineItem>;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function DataDisplay({
  budgetItems,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: DataDisplayProps) {
  const { filters, setFilter } = useDataDiscoveryFilters();
  const [activeView, setActiveView] = useState(filters.displayMode);

  // Update the filter when the tab changes
  const handleViewChange = (value: string) => {
    setActiveView(value as "table" | "chart" | "graph");
    setFilter("displayMode", value as "table" | "chart" | "graph");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Data Explorer</h2>
        <div className="flex items-center gap-2">
          <Tabs
            value={activeView}
            onValueChange={handleViewChange}
            className="w-[400px]"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Table2 className="h-4 w-4" />
                Table View
              </TabsTrigger>
              <TabsTrigger value="chart" className="flex items-center gap-2">
                <ChartBar className="h-4 w-4" />
                Chart View
              </TabsTrigger>
              <TabsTrigger value="graph" className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                Graph View
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div>
        {activeView === "table" && (
          <>
            <DataTable data={budgetItems.data} isLoading={isLoading} />
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
          </>
        )}
        {activeView === "graph" && (
          <Card>
            <CardHeader>
              <CardTitle>Graph View</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[400px] flex items-center justify-center text-muted-foreground">
              {isLoading ? (
                <div className="animate-pulse">
                  Loading graph visualization...
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-4">
                    <Network className="h-16 w-16 mx-auto text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">
                    Graph visualization coming soon
                  </h3>
                  <p className="mb-4">
                    We're working on an advanced graph visualization for budget
                    data.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handleViewChange("chart")}
                  >
                    View as Chart Instead
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
