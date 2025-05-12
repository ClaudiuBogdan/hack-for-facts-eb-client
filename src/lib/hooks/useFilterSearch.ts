import { useMemo } from "react"; // useEffect and useMemo might still be useful for derived state or effects not directly tied to store updates.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { z } from 'zod';
import { LineItemsFilter, SortOrder } from "@/schemas/interfaces";
import { generateHash } from "../utils";

export interface OptionItem<TID = string | number> {
    id: TID;
    label: string;
}

export type OptionSetter = React.Dispatch<React.SetStateAction<OptionItem[]>>

const YearOptionItemSchema = z.object({
    id: z.number(),
    label: z.string(),
});
export type YearOptionItem = z.infer<typeof YearOptionItemSchema>;

const GenericOptionItemSchema = z.object({
    id: z.string(),
    label: z.string(),
});
export type GenericOptionItem = z.infer<typeof GenericOptionItemSchema>;

const InternalFiltersObjectSchema = z.object({
    years: z.array(YearOptionItemSchema).optional().default([]),
    entities: z.array(GenericOptionItemSchema).optional().default([]),
    uats: z.array(GenericOptionItemSchema).optional().default([]),
    economicClassifications: z.array(GenericOptionItemSchema).optional().default([]),
    functionalClassifications: z.array(GenericOptionItemSchema).optional().default([]),
    minAmount: z.string().optional().default(""),
    maxAmount: z.string().optional().default(""),
    accountTypes: z.array(GenericOptionItemSchema).optional().default([]),
    sort: z.object({
        by: z.enum(['line_item_id', 'report_id', 'entity_cui', 'funding_source_id', 'functional_code', 'economic_code', 'account_category', 'amount', 'program_code', 'year']).optional().nullable(),
        order: z.enum(["asc", "desc"]).optional().nullable(),
    }).optional().default({ by: null, order: null }),
});
export type InternalFiltersState = z.infer<typeof InternalFiltersObjectSchema>;

const defaultInternalFiltersState = InternalFiltersObjectSchema.parse({});
const defaultInternalFiltersJSON = JSON.stringify(defaultInternalFiltersState); // For comparison

// --- Zustand Store Definition ---

interface FilterStoreActions {
    setSelectedYears: (updater: YearOptionItem[] | ((prev: YearOptionItem[]) => YearOptionItem[])) => void;
    setSelectedEntities: (updater: GenericOptionItem[] | ((prev: GenericOptionItem[]) => GenericOptionItem[])) => void;
    setSelectedUats: (updater: GenericOptionItem[] | ((prev: GenericOptionItem[]) => GenericOptionItem[])) => void;
    setSelectedEconomicClassifications: (updater: GenericOptionItem[] | ((prev: GenericOptionItem[]) => GenericOptionItem[])) => void;
    setSelectedFunctionalClassifications: (updater: GenericOptionItem[] | ((prev: GenericOptionItem[]) => GenericOptionItem[])) => void;
    setMinAmount: (updater: string | ((prev: string) => string)) => void;
    setMaxAmount: (updater: string | ((prev: string) => string)) => void;
    setSelectedAccountTypes: (updater: GenericOptionItem[] | ((prev: GenericOptionItem[]) => GenericOptionItem[])) => void;
    setSort: (updater: SortOrder | ((prev: SortOrder) => SortOrder)) => void;
    resetFilters: () => void;
}

type FilterStore = InternalFiltersState & FilterStoreActions;

const urlQueryStorage = {
    getItem: (): string | null => {
        if (typeof window === 'undefined') {
            return null; // SSR safety
        }
        const urlParamKey = "line-item-filters"; // The actual query parameter name we use
        const searchParams = new URLSearchParams(window.location.search);
        const serializedFilters = searchParams.get(urlParamKey);

        if (!serializedFilters) {
            return null;
        }

        try {
            // Validate the content from URL
            const parsedState = JSON.parse(serializedFilters);
            InternalFiltersObjectSchema.parse(parsedState);

            return JSON.stringify({ state: parsedState, version: 0 });
        } catch (error) {
            console.error("Failed to parse or validate filters from URL for Zustand. Resetting to defaults.", error);
            // Clean up invalid parameter from URL to prevent loops
            const newSearchParams = new URLSearchParams(window.location.search);
            newSearchParams.delete(urlParamKey);
            const newSearch = newSearchParams.toString();
            window.history.replaceState(null, '', newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname);
            return null; // Causes persist to use default state
        }
    },
    setItem: (_: string, value: string): void => {
        if (typeof window === 'undefined') {
            return; // SSR safety
        }
        const urlParamKey = "line-item-filters";
        try {
            const { state } = JSON.parse(value);
            const filtersJson = JSON.stringify(state);

            const searchParams = new URLSearchParams(window.location.search);
            if (filtersJson === defaultInternalFiltersJSON) {
                searchParams.delete(urlParamKey);
            } else {
                searchParams.set(urlParamKey, filtersJson);
            }
            const newSearch = searchParams.toString();
            // Use replaceState to avoid adding to history and triggering page reloads
            window.history.replaceState(null, '', newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname);
        } catch (error) {
            console.error("Failed to set filters to URL for Zustand:", error);
        }
    },
    removeItem: (): void => {
        if (typeof window === 'undefined') {
            return; // SSR safety
        }
        const urlParamKey = "filters";
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.delete(urlParamKey);
        window.history.replaceState(null, '', `${window.location.pathname}?${searchParams.toString()}`);
    },
};

export const useFilterStore = create<FilterStore>()(
    persist(
        (set) => ({
            ...defaultInternalFiltersState,
            // Actions
            setSelectedYears: (updater) => set(state => ({
                years: typeof updater === 'function' ? updater(state.years) : updater,
            })),
            setSelectedEntities: (updater) => set(state => ({
                entities: typeof updater === 'function' ? updater(state.entities) : updater,
            })),
            setSelectedUats: (updater) => set(state => ({
                uats: typeof updater === 'function' ? updater(state.uats) : updater,
            })),
            setSelectedEconomicClassifications: (updater) => set(state => ({
                economicClassifications: typeof updater === 'function' ? updater(state.economicClassifications) : updater,
            })),
            setSelectedFunctionalClassifications: (updater) => set(state => ({
                functionalClassifications: typeof updater === 'function' ? updater(state.functionalClassifications) : updater,
            })),
            setMinAmount: (updater) => set(state => ({
                minAmount: typeof updater === 'function' ? updater(state.minAmount) : updater,
            })),
            setMaxAmount: (updater) => set(state => ({
                maxAmount: typeof updater === 'function' ? updater(state.maxAmount) : updater,
            })),
            setSelectedAccountTypes: (updater) => set(state => ({
                accountTypes: typeof updater === 'function' ? updater(state.accountTypes) : updater,
            })),
            setSort: (updater) => set(state => ({
                sort: typeof updater === 'function' ? updater(state.sort) : updater,
            })),
            resetFilters: () => set(defaultInternalFiltersState),
        }),
        {
            name: 'url-filter-storage',
            storage: createJSONStorage(() => urlQueryStorage),
        }
    )
);

export const useFilterSearch = () => {
    const {
        years,
        entities,
        uats,
        economicClassifications,
        functionalClassifications,
        minAmount,
        maxAmount,
        accountTypes,
        sort,
        setSort,
        setSelectedYears,
        setSelectedEntities,
        setSelectedUats,
        setSelectedEconomicClassifications,
        setSelectedFunctionalClassifications,
        setMinAmount,
        setMaxAmount,
        setSelectedAccountTypes,
    } = useFilterStore();

    const filter = useMemo((): LineItemsFilter => ({
        entity_cuis: entities.map(entity => entity.id),
        functional_codes: functionalClassifications.map(classification => classification.id),
        economic_codes: economicClassifications.map(classification => classification.id),
        account_categories: accountTypes.map(type => type.id as "vn" | "ch"),
        uat_ids: uats.map(uat => parseInt(uat.id, 10)),
        years: years.map(year => year.id),
        min_amount: minAmount ? Number(minAmount) : undefined,
        max_amount: maxAmount ? Number(maxAmount) : undefined,
    }), [entities, functionalClassifications, economicClassifications, accountTypes, uats, years, minAmount, maxAmount]);

    const filterHash = useMemo(() => {
        return generateHash(JSON.stringify(filter));
    }, [filter]);

    return {
        // State values (selected options)
        selectedYearOptions: years as OptionItem<number>[],
        selectedEntityOptions: entities as OptionItem<string>[],
        selectedUatOptions: uats as OptionItem<string>[],
        selectedEconomicClassificationOptions: economicClassifications as OptionItem[],
        selectedFunctionalClassificationOptions: functionalClassifications as OptionItem[],
        minAmount: minAmount,
        maxAmount: maxAmount,
        selectedAccountTypeOptions: accountTypes as OptionItem[],
        sort,

        // Setters (actions)
        setSelectedYearOptions: setSelectedYears as OptionSetter,
        setSelectedEntityOptions: setSelectedEntities as OptionSetter,
        setSelectedUatOptions: setSelectedUats as OptionSetter,
        setSelectedEconomicClassificationOptions: setSelectedEconomicClassifications as OptionSetter,
        setSelectedFunctionalClassificationOptions: setSelectedFunctionalClassifications as OptionSetter,
        setMinAmount,
        setMaxAmount,
        setSelectedAccountTypeOptions: setSelectedAccountTypes as OptionSetter,
        setSort,

        filter,
        filterHash,
    };
};