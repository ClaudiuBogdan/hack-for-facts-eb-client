import React from "react";
import { DataDiscoveryFilters } from "./DataDiscoveryFilters";
import {
  ActiveFiltersBar,
  FilterItem,
} from "@/components/ui/active-filters-bar";
import { useDataDiscoveryFilters } from "@/stores/dataDiscoveryFilters";
import { useQuery } from "@tanstack/react-query";
import {
  getUniqueCounties,
  getUniqueEconomicCategories,
  getUniqueFunctionalCategories,
} from "@/lib/api/dataDiscovery";

interface DataDiscoveryLayoutProps {
  children: React.ReactNode;
}

export function DataDiscoveryLayout({ children }: DataDiscoveryLayoutProps) {
  const { filters, setFilter, resetFilters } = useDataDiscoveryFilters();

  // Fetch data for entity mappings
  const { data: counties = [] } = useQuery({
    queryKey: ["counties"],
    queryFn: getUniqueCounties,
  });

  const { data: functionalCategories = [] } = useQuery({
    queryKey: ["functionalCategories"],
    queryFn: getUniqueFunctionalCategories,
  });

  const { data: economicCategories = [] } = useQuery({
    queryKey: ["economicCategories"],
    queryFn: getUniqueEconomicCategories,
  });

  // Find county name by code
  const getCountyName = (code: string) => {
    const county = counties.find((c) => c.code === code);
    return county?.name || code;
  };

  // Find category name by code
  const getFunctionalCategoryName = (code: string) => {
    const category = functionalCategories.find((c) => c.code === code);
    return category ? `${category.code} - ${category.name}` : code;
  };

  const getEconomicCategoryName = (code: string) => {
    const category = economicCategories.find((c) => c.code === code);
    return category ? `${category.code} - ${category.name}` : code;
  };

  // Remove specific filter
  const removeFilter = (key: string, id?: string) => {
    if (key === "searchQuery") {
      setFilter("searchQuery", "");
    } else if (key === "yearRange") {
      setFilter("yearRange", {
        from: new Date().getFullYear() - 1,
        to: new Date().getFullYear(),
      });
    } else if (key === "amountRange") {
      setFilter("amountRange", { min: null, max: null });
    } else if (
      key === "counties" ||
      key === "uats" ||
      key === "functionalCategory" ||
      key === "economicCategory"
    ) {
      if (id) {
        // These keys all have string[] arrays as values
        const arrayKey = key as
          | "counties"
          | "uats"
          | "functionalCategory"
          | "economicCategory";
        const newValues = filters[arrayKey].filter((v: string | number) => v !== id);
        setFilter(arrayKey, newValues as string[] | number[]);
      }
    }
  };

  // Generate active filter items
  const activeFilters: FilterItem[] = [
    // Search query filter
    ...(filters.searchQuery
      ? [
          {
            key: "searchQuery",
            label: "Search",
            value: filters.searchQuery,
          },
        ]
      : []),

    // Year range filter
    ...(filters.yearRange.from !== new Date().getFullYear() - 1 ||
    filters.yearRange.to !== new Date().getFullYear()
      ? [
          {
            key: "yearRange",
            label: "Years",
            value: `${filters.yearRange.from} - ${filters.yearRange.to}`,
          },
        ]
      : []),

    // Amount range filter
    ...(filters.amountRange.min !== null || filters.amountRange.max !== null
      ? [
          {
            key: "amountRange",
            label: "Amount",
            value: `${filters.amountRange.min || 0} - ${
              filters.amountRange.max ? filters.amountRange.max : "∞"
            }`,
          },
        ]
      : []),

    // County filters
    ...filters.counties.map((code) => ({
      key: "county",
      label: "County",
      value: getCountyName(code),
      id: code,
    })),

    // Functional category filters
    ...filters.functionalCategory.map((code) => ({
      key: "functionalCategory",
      label: "Function",
      value: getFunctionalCategoryName(code),
      id: code,
    })),

    // Economic category filters
    ...filters.economicCategory.map((code) => ({
      key: "economicCategory",
      label: "Economic",
      value: getEconomicCategoryName(code),
      id: code,
    })),
  ];

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 flex-col md:flex-row">
        <div className="md:w-72 w-full shrink-0">
          <DataDiscoveryFilters />
        </div>
        <div className="flex-1">
          {hasActiveFilters && (
            <ActiveFiltersBar
              filters={activeFilters}
              onRemoveFilter={removeFilter}
              onClearFilters={resetFilters}
              className="mb-4"
            />
          )}
          <div className="rounded-lg border border-border bg-card">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
