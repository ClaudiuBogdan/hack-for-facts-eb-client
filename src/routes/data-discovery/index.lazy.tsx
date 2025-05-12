import { createLazyFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataDisplay } from "@/components/dataDiscovery/DataDisplay";
import { DataDiscoveryLayout } from "@/components/dataDiscovery/DataDiscoveryLayout";
import { useState, useEffect, useMemo } from "react";
import { getBudgetLineItems } from "@/lib/api/dataDiscovery";
import { useFilterSearch } from "@/lib/hooks/useFilterSearch";

export const Route = createLazyFileRoute("/data-discovery/")({
  component: DataDiscoveryPage,
});

function DataDiscoveryPage() {
  const { filter, filterHash } = useFilterSearch();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  console.log("hash",filterHash);
  
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const {
    data: budgetItemsData,
    isLoading: isLoadingItems,
    error: itemsError,
  } = useQuery({
    queryKey: [
      "budgetLineItems",
      filter,
      page,
      pageSize,
    ],
    queryFn: () =>
      getBudgetLineItems({
        filters: filter,
        page,
        pageSize,
      }),
  });

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
