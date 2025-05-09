import { createLazyFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBudgetLineItems } from "@/lib/api/dataDiscovery";
import { useDataDiscoveryFilters } from "@/stores/dataDiscoveryFilters";
import { DataDisplay } from "@/components/dataDiscovery/DataDisplay";
import { useDebouncedValue } from "@/lib/hooks";
import { DataDiscoveryLayout } from "@/components/dataDiscovery/DataDiscoveryLayout";
import { useState, useEffect } from "react";

export const Route = createLazyFileRoute("/data-discovery/")({
  component: DataDiscoveryPage,
});

function DataDiscoveryPage() {
  const { filters } = useDataDiscoveryFilters();
  // Debounce filters with 500ms delay to prevent excessive API calls
  const debouncedFilters = useDebouncedValue(filters, 500);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [JSON.stringify(debouncedFilters)]);

  // Query for budget line items with pagination
  const {
    data: budgetItems,
    isLoading: isLoadingItems,
    error: itemsError,
  } = useQuery({
    queryKey: [
      "budgetLineItems",
      JSON.stringify(debouncedFilters),
      page,
      pageSize,
    ],
    queryFn: () =>
      getBudgetLineItems({
        filters: debouncedFilters,
        page,
        pageSize,
      }),
  });

  const isLoading = isLoadingItems;
  const hasError = itemsError;

  // Provide default empty pagination result when loading or error
  const paginatedBudgetItems = budgetItems || {
    data: [],
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    currentPage: page,
    pageSize,
    totalPages: 0,
  };

  const errorMessage = (() => {
    if (itemsError instanceof Error) return itemsError.message;
    if (hasError) return "An error occurred while loading data.";
    return "";
  })();

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top of the table when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    // Reset to page 1 when changing page size
    setPage(1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Discovery</h1>
        <p className="text-muted-foreground">
          Explore, analyze, and visualize public spending data.
        </p>
      </div>

      <DataDiscoveryLayout>
        {hasError ? (
          <div className="p-6 flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="font-medium text-red-500">Error loading data</h3>
              <p className="text-muted-foreground mt-2">{errorMessage}</p>
              <p className="text-muted-foreground mt-1">
                Please try again later or contact support.
              </p>
            </div>
          </div>
        ) : (
          <DataDisplay
            budgetItems={paginatedBudgetItems}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </DataDiscoveryLayout>
    </div>
  );
}
