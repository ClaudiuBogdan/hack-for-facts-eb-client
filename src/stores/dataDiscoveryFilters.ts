import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NewDataDiscoveryFilter = {
  report_id?: number;
  report_ids?: number[];
  entity_cui?: string;
  funding_source_id?: number;
  functional_code?: string;
  economic_code?: string;
  account_category?: string;
  min_amount?: number;
  max_amount?: number;
  program_code?: string;
  reporting_year?: number;
  county_code?: string;
  uat_id?: number;
  year?: number;
  years?: number[];
  start_year?: number;
  end_year?: number;
  search?: string;
};

export type DataDiscoveryFilter = {
  counties: string[]; // County codes
  uats: number[]; // UAT IDs
  yearRange: {
    from: number | null;
    to: number | null;
  };
  searchQuery: string;
  functionalCategory: string[]; // Budget functional categories
  economicCategory: string[]; // Budget economic categories
  amountRange: {
    min: number | null;
    max: number | null;
  };
  displayMode: "table" | "chart" | "graph";
  sortBy: "amount" | "date" | "name";
  sortOrder: "asc" | "desc";
};

interface DataDiscoveryFiltersState {
  filters: DataDiscoveryFilter;
  setFilter: <K extends keyof DataDiscoveryFilter>(
    key: K,
    value: DataDiscoveryFilter[K]
  ) => void;
  resetFilters: () => void;
}

const defaultFilters: DataDiscoveryFilter = {
  counties: [],
  uats: [],
  yearRange: {
    from: new Date().getFullYear() - 1,
    to: new Date().getFullYear(),
  },
  searchQuery: "",
  functionalCategory: [],
  economicCategory: [],
  amountRange: {
    min: null,
    max: null,
  },
  displayMode: "table",
  sortBy: "amount",
  sortOrder: "desc",
};

export const useDataDiscoveryFilters = create<DataDiscoveryFiltersState>()(
  persist(
    (set) => ({
      // TODO: load initial filter values. Initialize filters with default values
      filters: { ...defaultFilters },
      setFilter: (key, value) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: value,
          },
        })),
      resetFilters: () => set({ filters: { ...defaultFilters } }),
    }),
    {
      name: "data-discovery-filters",
    }
  )
);
