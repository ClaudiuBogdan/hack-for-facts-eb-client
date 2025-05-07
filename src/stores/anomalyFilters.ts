import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AnomalyFilter = {
  status: "all" | "new" | "resolved" | "investigating";
  severity: "all" | "low" | "medium" | "high" | "critical";
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  searchQuery: string;
  category: string[];
};

interface AnomalyFiltersState {
  filters: AnomalyFilter;
  setFilter: <K extends keyof AnomalyFilter>(
    key: K,
    value: AnomalyFilter[K]
  ) => void;
  resetFilters: () => void;
}

const defaultFilters: AnomalyFilter = {
  status: "all",
  severity: "all",
  dateRange: {
    from: null,
    to: null,
  },
  searchQuery: "",
  category: [],
};

export const useAnomalyFilters = create<AnomalyFiltersState>()(
  persist(
    (set) => ({
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
      name: "anomaly-filters",
    }
  )
);
