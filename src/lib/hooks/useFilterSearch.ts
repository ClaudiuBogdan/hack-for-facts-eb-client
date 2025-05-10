import { useNavigate, useSearch, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { z } from "zod";

export interface OptionItem<TID = string | number> {
    id: TID;
    label: string;
}

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
});
export type InternalFiltersState = z.infer<typeof InternalFiltersObjectSchema>;

const defaultInternalFiltersState = InternalFiltersObjectSchema.parse({});

const UrlFiltersQuerySchema = z.object({
    filters: z.string().optional(),
});

export const useFilterSearch = () => {
    const navigate = useNavigate();
    const routerLocation = useRouterState({ select: (s) => s.location });
    const routePath = routerLocation.pathname;

    const defaultInternalFiltersJSON = useMemo(() => JSON.stringify(defaultInternalFiltersState), []);

    const initialFiltersFromUrl = useSearch({
        // @ts-expect-error - routePath is a string and we accept it here for TanStack Router.
        from: routePath,
        select: (searchFromUrl: Record<string, unknown>): InternalFiltersState => {
            try {
                const parsedUrlQuery = UrlFiltersQuerySchema.parse(searchFromUrl);
                if (parsedUrlQuery.filters) {
                    const jsonParsed = JSON.parse(parsedUrlQuery.filters);
                    return InternalFiltersObjectSchema.parse(jsonParsed);
                }
            } catch (error) {
                console.error("Failed to parse filters from URL, using defaults:", error);
            }
            return defaultInternalFiltersState;
        }
    });

    const [internalFilters, setInternalFilters] = useState<InternalFiltersState>(initialFiltersFromUrl);

    useEffect(() => {
        const filtersJson = JSON.stringify(internalFilters);
        const newSearchFiltersParam = filtersJson === defaultInternalFiltersJSON ? undefined : filtersJson;

        navigate({
            to: ".",
            search: (prev) => ({ ...prev, filters: newSearchFiltersParam }),
            replace: true,
        });
    }, [internalFilters, navigate, defaultInternalFiltersJSON]);


    // --- Updater functions for specific filter categories ---

    const setSelectedYears = useCallback((years: YearOptionItem[] | ((prev: YearOptionItem[]) => YearOptionItem[])) => {
        setInternalFilters(prev => ({
            ...prev,
            years: typeof years === 'function' ? years(prev.years) : years,
        }));
    }, []);

    const setSelectedEntities = useCallback((entities: GenericOptionItem[] | ((prev: GenericOptionItem[]) => GenericOptionItem[])) => {
        setInternalFilters(prev => ({
            ...prev,
            entities: typeof entities === 'function' ? entities(prev.entities) : entities,
        }));
    }, []);

    const setSelectedUats = useCallback((uats: GenericOptionItem[] | ((prev: GenericOptionItem[]) => GenericOptionItem[])) => {
        setInternalFilters(prev => ({
            ...prev,
            uats: typeof uats === 'function' ? uats(prev.uats) : uats,
        }));
    }, []);

    const setSelectedEconomicClassifications = useCallback((classifications: GenericOptionItem[] | ((prev: GenericOptionItem[]) => GenericOptionItem[])) => {
        setInternalFilters(prev => ({
            ...prev,
            economicClassifications: typeof classifications === 'function' ? classifications(prev.economicClassifications) : classifications,
        }));
    }, []);

    const setSelectedFunctionalClassifications = useCallback((classifications: GenericOptionItem[] | ((prev: GenericOptionItem[]) => GenericOptionItem[])) => {
        setInternalFilters(prev => ({
            ...prev,
            functionalClassifications: typeof classifications === 'function' ? classifications(prev.functionalClassifications) : classifications,
        }));
    }, []);

    const setMinAmount = useCallback((amount: string | ((prev: string) => string)) => {
        setInternalFilters(prev => ({
            ...prev,
            minAmount: typeof amount === 'function' ? amount(prev.minAmount) : amount,
        }));
    }, []);

    const setMaxAmount = useCallback((amount: string | ((prev: string) => string)) => {
        setInternalFilters(prev => ({
            ...prev,
            maxAmount: typeof amount === 'function' ? amount(prev.maxAmount) : amount,
        }));
    }, []);

    const setSelectedAccountTypes = useCallback((accountTypes: GenericOptionItem[] | ((prev: GenericOptionItem[]) => GenericOptionItem[])) => {
        setInternalFilters(prev => ({
            ...prev,
            accountTypes: typeof accountTypes === 'function' ? accountTypes(prev.accountTypes) : accountTypes,
        }));
    }, []);

    return {
        selectedYearOptions: internalFilters.years as OptionItem<number>[],
        setSelectedYearOptions: setSelectedYears as React.Dispatch<React.SetStateAction<OptionItem[]>>,

        selectedEntityOptions: internalFilters.entities as OptionItem<string>[],
        setSelectedEntityOptions: setSelectedEntities as React.Dispatch<React.SetStateAction<OptionItem[]>>,

        selectedUatOptions: internalFilters.uats as OptionItem<string>[],
        setSelectedUatOptions: setSelectedUats as React.Dispatch<React.SetStateAction<OptionItem[]>>,

        selectedEconomicClassificationOptions: internalFilters.economicClassifications as OptionItem[],
        setSelectedEconomicClassificationOptions: setSelectedEconomicClassifications as React.Dispatch<React.SetStateAction<OptionItem[]>>,

        selectedFunctionalClassificationOptions: internalFilters.functionalClassifications as OptionItem[],
        setSelectedFunctionalClassificationOptions: setSelectedFunctionalClassifications as React.Dispatch<React.SetStateAction<OptionItem[]>>,

        minAmount: internalFilters.minAmount,
        setMinAmount,

        maxAmount: internalFilters.maxAmount,
        setMaxAmount,

        selectedAccountTypeOptions: internalFilters.accountTypes as OptionItem[],
        setSelectedAccountTypeOptions: setSelectedAccountTypes as React.Dispatch<React.SetStateAction<OptionItem[]>>,

    };
};