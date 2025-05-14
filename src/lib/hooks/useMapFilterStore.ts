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

const NormalizationOptionItemSchema = z.object({
    id: z.enum(["total", "per-capita"]),
    label: z.string(),
});
export type NormalizationOptionItem = z.infer<typeof NormalizationOptionItemSchema>;

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

// Schema for Economic Classification option items
const EconomicClassificationOptionItemSchema = z.object({
    id: z.string(), // Assuming economic classification IDs are strings
    label: z.string(),
});
export type EconomicClassificationOptionItem = z.infer<typeof EconomicClassificationOptionItemSchema>;


// --- Schema for the internal state of the store ---
const InternalMapFiltersObjectSchema = z.object({
    accountCategory: AccountCategoryOptionItemSchema,
    normalization: NormalizationOptionItemSchema,
    years: z.array(YearOptionItemSchema).min(1, "At least one year must be selected"),
    functionalClassifications: z.array(GenericOptionItemSchema),
    economicClassifications: z.array(EconomicClassificationOptionItemSchema), // Added economic classifications
    minAmount: z.string().optional(),
    maxAmount: z.string().optional(),
    minPopulation: z.string().optional(),
    maxPopulation: z.string().optional(),
});
export type InternalMapFiltersState = z.infer<typeof InternalMapFiltersObjectSchema>;

// --- Default state ---
const defaultNormalization: NormalizationOptionItem = { id: "total", label: "Total" };
const defaultAccountCategory: AccountCategoryOptionItem = { id: "ch", label: "Cheltuieli" };
const defaultYears: YearOptionItem[] = [{ id: new Date().getFullYear() - 1, label: String(new Date().getFullYear() - 1) }];

const defaultInternalMapFiltersState: InternalMapFiltersState = {
    normalization: defaultNormalization,
    accountCategory: defaultAccountCategory,
    years: defaultYears,
    functionalClassifications: [],
    economicClassifications: [], // Added default for economic classifications
    minAmount: undefined,
    maxAmount: undefined,
    minPopulation: undefined,
    maxPopulation: undefined,
};

const defaultInternalFiltersJSON = JSON.stringify(defaultInternalMapFiltersState); // For comparison in URL storage

// --- Zustand Store Definition ---

interface MapFilterStoreActions {
    setNormalization: (updater: NormalizationOptionItem | ((prev: NormalizationOptionItem) => NormalizationOptionItem)) => void;
    setAccountCategory: (updater: AccountCategoryOptionItem | ((prev: AccountCategoryOptionItem) => AccountCategoryOptionItem)) => void;
    setSelectedYears: (updater: YearOptionItem[] | ((prev: YearOptionItem[]) => YearOptionItem[])) => void;
    setSelectedFunctionalClassifications: (updater: GenericOptionItem[] | ((prev: GenericOptionItem[]) => GenericOptionItem[])) => void;
    setSelectedEconomicClassifications: (updater: EconomicClassificationOptionItem[] | ((prev: EconomicClassificationOptionItem[]) => EconomicClassificationOptionItem[])) => void; // Added setter for economic classifications
    setMinAmount: (updater: string | undefined | ((prev: string | undefined) => string | undefined)) => void;
    setMaxAmount: (updater: string | undefined | ((prev: string | undefined) => string | undefined)) => void;
    setMinPopulation: (updater: string | undefined | ((prev: string | undefined) => string | undefined)) => void;
    setMaxPopulation: (updater: string | undefined | ((prev: string | undefined) => string | undefined)) => void;
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
            setNormalization: (updater) => set(state => ({
                normalization: typeof updater === 'function' ? updater(state.normalization) : updater,
            })),
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
            setSelectedEconomicClassifications: (updater) => set(state => ({ // Added implementation for economic classifications setter
                economicClassifications: typeof updater === 'function' ? updater(state.economicClassifications) : updater,
            })),
            setMinAmount: (updater) => set(state => ({
                minAmount: typeof updater === 'function' ? updater(state.minAmount) : updater,
            })),
            setMaxAmount: (updater) => set(state => ({
                maxAmount: typeof updater === 'function' ? updater(state.maxAmount) : updater,
            })),
            setMinPopulation: (updater) => set(state => ({
                minPopulation: typeof updater === 'function' ? updater(state.minPopulation) : updater,
            })),
            setMaxPopulation: (updater) => set(state => ({
                maxPopulation: typeof updater === 'function' ? updater(state.maxPopulation) : updater,
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
        normalization,
        accountCategory,
        years,
        functionalClassifications,
        economicClassifications, // Destructure economicClassifications
        minAmount,
        maxAmount,
        minPopulation,
        maxPopulation,
        setNormalization,
        setAccountCategory,
        setSelectedYears,
        setSelectedFunctionalClassifications,
        setSelectedEconomicClassifications, // Destructure setSelectedEconomicClassifications
        setMinAmount,
        setMaxAmount,
        setMinPopulation,
        setMaxPopulation,
        resetMapFilters,
    } = useMapFilterStore();

    const heatmapFilterInput = React.useMemo((): HeatmapFilterInput => ({
        account_categories: [accountCategory.id],
        normalization: normalization.id as 'total' | 'per_capita',
        years: years.map(year => year.id),
        functional_codes: functionalClassifications.length > 0 ? functionalClassifications.map(fc => fc.id) : undefined,
        economic_codes: economicClassifications.length > 0 ? economicClassifications.map(ec => ec.id) : undefined, // Add economic_codes
        min_amount: minAmount,
        max_amount: maxAmount,
        min_population: minPopulation,
        max_population: maxPopulation,
        // TODO: Add normalization to the API input if/when the API supports it
    }), [accountCategory, normalization, years, functionalClassifications, economicClassifications, minAmount, maxAmount, minPopulation, maxPopulation]); // Add economicClassifications to dependency array

    return {
        // State values (as OptionItem for UI components)
        selectedAccountCategory: accountCategory,
        selectedYears: years,
        selectedFunctionalClassifications: functionalClassifications,
        selectedEconomicClassifications: economicClassifications, // Expose selectedEconomicClassifications
        selectedMinAmount: minAmount,
        selectedMaxAmount: maxAmount,
        selectedMinPopulation: minPopulation,
        selectedMaxPopulation: maxPopulation,

        // Setters
        selectedNormalization: normalization,
        setNormalization,
        setAccountCategory,
        setSelectedYears,
        setSelectedFunctionalClassifications,
        setSelectedEconomicClassifications, // Expose setSelectedEconomicClassifications
        setMinAmount,
        setMaxAmount,
        setMinPopulation,
        setMaxPopulation,
        resetMapFilters,

        // Derived filter for API
        heatmapFilterInput,
    };
}; 