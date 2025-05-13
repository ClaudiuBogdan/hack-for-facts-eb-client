import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { z } from 'zod';
import { HeatmapFilterInput } from "@/lib/api/dataDiscovery";

// --- Schemas for individual option items ---
const AccountCategoryOptionItemSchema = z.object({
    id: z.enum(["ch", "vn"]),
    label: z.string(),
});
export type AccountCategoryOptionItem = z.infer<typeof AccountCategoryOptionItemSchema>;

const YearOptionItemSchema = z.object({
    id: z.number(),
    label: z.string(),
});
export type YearOptionItem = z.infer<typeof YearOptionItemSchema>;

const GenericOptionItemSchema = z.object({ // For functional classifications
    id: z.string(),
    label: z.string(),
});
export type GenericOptionItem = z.infer<typeof GenericOptionItemSchema>;


// --- Schema for the internal state of the store ---
const InternalMapFiltersObjectSchema = z.object({
    accountCategory: AccountCategoryOptionItemSchema,
    years: z.array(YearOptionItemSchema).min(1, "At least one year must be selected"),
    functionalClassifications: z.array(GenericOptionItemSchema),
});
export type InternalMapFiltersState = z.infer<typeof InternalMapFiltersObjectSchema>;

// --- Default state ---
const defaultAccountCategory: AccountCategoryOptionItem = { id: "ch", label: "Cheltuieli" };
const defaultYears: YearOptionItem[] = [{ id: new Date().getFullYear() - 1, label: String(new Date().getFullYear() - 1) }];

const defaultInternalMapFiltersState: InternalMapFiltersState = {
    accountCategory: defaultAccountCategory,
    years: defaultYears,
    functionalClassifications: [],
};

const defaultInternalFiltersJSON = JSON.stringify(defaultInternalMapFiltersState); // For comparison in URL storage

// --- Zustand Store Definition ---

interface MapFilterStoreActions {
    setAccountCategory: (updater: AccountCategoryOptionItem | ((prev: AccountCategoryOptionItem) => AccountCategoryOptionItem)) => void;
    setSelectedYears: (updater: YearOptionItem[] | ((prev: YearOptionItem[]) => YearOptionItem[])) => void;
    setSelectedFunctionalClassifications: (updater: GenericOptionItem[] | ((prev: GenericOptionItem[]) => GenericOptionItem[])) => void;
    resetMapFilters: () => void;
}

type MapFilterStore = InternalMapFiltersState & MapFilterStoreActions;

// --- URL Storage (similar to useLineItemsFilter) ---
const urlQueryStorageMap = {
    getItem: (): string | null => {
        if (typeof window === 'undefined') return null;
        const urlParamKey = "map-filters";
        const searchParams = new URLSearchParams(window.location.search);
        const serializedFilters = searchParams.get(urlParamKey);

        if (!serializedFilters) return null;

        try {
            const parsedState = JSON.parse(serializedFilters);
            InternalMapFiltersObjectSchema.parse(parsedState); // Validate
            return JSON.stringify({ state: parsedState, version: 0 }); // Zustand persist expects this format
        } catch (error) {
            console.error("Failed to parse or validate map filters from URL. Resetting.", error);
            const newSearchParams = new URLSearchParams(window.location.search);
            newSearchParams.delete(urlParamKey);
            const newSearch = newSearchParams.toString();
            window.history.replaceState(null, '', newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname);
            return null;
        }
    },
    setItem: (_: string, value: string): void => {
        if (typeof window === 'undefined') return;
        const urlParamKey = "map-filters";
        try {
            const { state } = JSON.parse(value); // Extract state from Zustand persist format
            const filtersJson = JSON.stringify(state);

            const searchParams = new URLSearchParams(window.location.search);
            if (filtersJson === defaultInternalFiltersJSON) {
                searchParams.delete(urlParamKey);
            } else {
                searchParams.set(urlParamKey, filtersJson);
            }
            const newSearch = searchParams.toString();
            window.history.replaceState(null, '', newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname);
        } catch (error) {
            console.error("Failed to set map filters to URL:", error);
        }
    },
    removeItem: (): void => {
        if (typeof window === 'undefined') return;
        const urlParamKey = "map-filters";
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.delete(urlParamKey);
        const newSearch = searchParams.toString();
        window.history.replaceState(null, '', newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname);
    },
};

// --- Store Hook ---
export const useMapFilterStore = create<MapFilterStore>()(
    persist(
        (set) => ({
            ...defaultInternalMapFiltersState,
            // Actions
            setAccountCategory: (updater) => set(state => ({
                accountCategory: typeof updater === 'function' ? updater(state.accountCategory) : updater,
            })),
            setSelectedYears: (updater) => set(state => {
                const currentYears = state.years;
                const newYearsCandidate = typeof updater === 'function' ? updater(currentYears) : updater;
                // Ensure at least one year is always selected by reverting to defaultYears if the candidate is empty.
                return { years: newYearsCandidate.length > 0 ? newYearsCandidate : defaultYears };
            }),
            setSelectedFunctionalClassifications: (updater) => set(state => ({
                functionalClassifications: typeof updater === 'function' ? updater(state.functionalClassifications) : updater,
            })),
            resetMapFilters: () => set(defaultInternalMapFiltersState),
        }),
        {
            name: 'map-url-filter-storage', // Unique name for localStorage if URL storage fails or for migration
            storage: createJSONStorage(() => urlQueryStorageMap),
        }
    )
);

// --- Selector Hook (similar to useFilterSearch) ---
export const useMapFilter = () => {
    const {
        accountCategory,
        years,
        functionalClassifications,
        setAccountCategory,
        setSelectedYears,
        setSelectedFunctionalClassifications,
        resetMapFilters,
    } = useMapFilterStore();

    const heatmapFilterInput = React.useMemo((): HeatmapFilterInput => ({
        account_categories: [accountCategory.id], // API expects an array
        years: years.map(year => year.id),
        functional_codes: functionalClassifications.length > 0 ? functionalClassifications.map(fc => fc.id) : undefined,
        // Add other fields like economic_codes, min_amount, max_amount if they become part of the store
    }), [accountCategory, years, functionalClassifications]);

    return {
        // State values (as OptionItem for UI components)
        selectedAccountCategory: accountCategory,
        selectedYears: years,
        selectedFunctionalClassifications: functionalClassifications,

        // Setters
        setAccountCategory,
        setSelectedYears,
        setSelectedFunctionalClassifications,
        resetMapFilters,

        // Derived filter for API
        heatmapFilterInput,
    };
}; 