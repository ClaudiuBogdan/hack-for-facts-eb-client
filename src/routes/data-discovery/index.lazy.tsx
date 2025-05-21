import { createLazyFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataDisplay } from "@/components/dataDiscovery/DataDisplay";
import { DataDiscoveryLayout } from "@/components/dataDiscovery/DataDiscoveryLayout";
import { useEffect, useMemo } from "react";
import { getBudgetLineItems } from "@/lib/api/dataDiscovery";
import { useFilterSearch } from "@/lib/hooks/useLineItemsFilter";
import { SortOrder } from "@/schemas/interfaces";

export const Route = createLazyFileRoute("/data-discovery/")({
  component: DataDiscoveryPage,
});

function DataDiscoveryPage() {
  const {
    filter,
    filterHash,
    sort,
    setSort,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useFilterSearch();

  const {
    data: budgetItemsData,
    isLoading: isLoadingItems,
    error: itemsError,
  } = useQuery({
    queryKey: [
      "budgetLineItems",
      filterHash,
      sort,
      page,
      pageSize,
    ],
    queryFn: () =>
      getBudgetLineItems({
        filters: filter,
        sort,
        page,
        pageSize,
      }),
  });

  // Reset page to 1 if the total number of pages is less than the current page
  useEffect(() => {
    if (budgetItemsData && budgetItemsData.totalPages < page) {
      setPage(1);
    }
  }, [budgetItemsData, page, setPage]);

  const isLoading = isLoadingItems;
  const hasError = !!itemsError;

  const paginatedBudgetItems = useMemo(() => {
    if (!budgetItemsData) {
      return {
        data: [],
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        currentPage: page,
        pageSize: pageSize,
        totalPages: 0,
      };
    }
    const totalCount = budgetItemsData.totalCount || 0;
    return {
      data: budgetItemsData.data || [],
      totalCount: totalCount,
      hasNextPage: budgetItemsData.hasNextPage || false,
      hasPreviousPage: budgetItemsData.hasPreviousPage || false,
      currentPage: page,
      pageSize: pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }, [budgetItemsData, page, pageSize]);

  const errorMessage = (() => {
    if (itemsError instanceof Error) return itemsError.message;
    if (hasError) return "An error occurred while loading data.";
    return "";
  })();

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const handleSortColumn = (columnId: string) => {
    const sortBy = mapColumnIdToSortBy(columnId);
    if (sort.by !== sortBy) {
      setSort({ by: sortBy, order: 'asc' });
    } else if (sort.order === 'asc') {
      setSort({ by: sortBy, order: 'desc' });
    } else {
      setSort({ by: null, order: null });
    }
  };

  return (
    <div className="container mx-auto py-4 px-2 md:px-6 space-y-6 max-w-full">
      <div className="px-1 md:px-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Data Discovery</h1>
        <p className="text-muted-foreground text-sm md:text-base">
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
            sort={sort}
            onSortColumn={handleSortColumn}
          />
        )}
      </DataDiscoveryLayout>
    </div>
  );
}

const mapColumnIdToSortBy = (columnId: string): SortOrder['by'] => {
  switch (columnId) {
    case "entity_name":
      return "entity_cui";
    case "year":
      return "year";
    case "amount":
      return "amount";
    case "account_category":
      return "account_category";
    case "functional_name":
      return "functional_code";
    case "economic_name":
      return "economic_code";
    default:
      return null;
  }
};
