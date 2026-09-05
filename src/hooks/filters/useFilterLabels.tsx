import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { GetLabels, LabelStore } from "./interfaces";
import { OptionItem } from "@/components/filters/base-filter/interfaces";
import { getBudgetSectorLabels, getEconomicClassificationLabels, getEntityLabels, getFundingSourceLabels, getFunctionalClassificationLabels, getUatLabels } from "@/lib/api/labels";
import { t } from "@lingui/core/macro";
import { getUserLocale } from "@/lib/utils";

const EntityStorageKey = 'entity-labels';
const UatLabelStorageKey = 'uat-labels';
const EconomicClassificationLabelStorageKey = 'native-economic-classification-labels';
const FunctionalClassificationLabelStorageKey = 'native-functional-classification-labels';
const BudgetSectorLabelStorageKey = 'native-budget-sector-labels';
const FundingSourceLabelStorageKey = 'native-funding-source-labels';

const isBrowser = typeof window !== 'undefined';

const loadLocalData = (key: string): Record<string, string> => {
    if (!isBrowser) return {};

    try {
        const storage = localStorage.getItem(key);
        const parseJson = storage ? JSON.parse(storage) : {};
        const entitiesMap = Object.fromEntries(Object.entries(parseJson).map(([key, label]) => [String(key), String(label)]));
        return entitiesMap;
    } catch (error) {
        console.error("Failed to parse data from localStorage for key", key, error);
        return {};
    }
};

const saveLocalData = (key: string, data: Record<string, string>) => {
    if (!isBrowser) return;
    localStorage.setItem(key, JSON.stringify(data));
};

export const useDataLabelBuilder = (key: string, getLabels: GetLabels, initialIds: (string | number)[]): LabelStore => {
    const queryClient = useQueryClient();
    const previousIdsRef = useRef<string>('');

    const { data: dataMap } = useQuery<Record<string, string>>({
        queryKey: [key],
        queryFn: () => loadLocalData(key),
        staleTime: Infinity,
        // Must stay a thunk: passing the value would run this `localStorage`
        // read during every render, so SSR (`{}`) and the first client render
        // (the cached label map) would disagree and hydration would mismatch.
        initialData: () => loadLocalData(key),
    });

    /**
     * Fetches labels for any given ids that are not already in the local cache,
     * updates localStorage, and triggers a UI update.
     * @param {string[]} ids - An array of ids to check and fetch.
     */
    const fetchMissingLabels = useCallback(async (ids: (string | number)[], getLabels: GetLabels) => {
        if (!ids || ids.length === 0) return;

        const dataMap = loadLocalData(key);
        const missingIds = ids.filter(id => !dataMap[String(id)]);

        if (missingIds.length === 0) return;

        try {
            // Correctly await the asynchronous API call.
            const newLabels = await getLabels(missingIds);

            newLabels.forEach(({ id, label }) => {
                dataMap[String(id)] = String(label);
            });

            saveLocalData(key, dataMap);

            // Invalidate the query. This tells TanStack Query to refetch the data
            // (by running `loadEntities`) and update all subscribed components.
            await queryClient.invalidateQueries({ queryKey: [key] });
        } catch (error) {
            console.error("Failed to fetch labels:", error);
        }
    }, [key, queryClient]);

    /**
     * Manually adds or updates labels in the cache from a list of OptionItems.
     * @param {OptionItem[]} labels - An array of options with id and label.
     */
    const addKnownLabels = useCallback((labels: OptionItem[]) => {
        const currentMap = loadLocalData(key);
        labels.forEach(({ id, label }) => {
            currentMap[String(id)] = String(label);
        });

        saveLocalData(key, currentMap);

        // Optimistically update the query cache for an instant UI change.
        // This is faster than invalidating and re-reading from localStorage.
        queryClient.setQueryData([key], currentMap);
    }, [key, queryClient]);

    useEffect(() => {
        // Create a stable string representation of the IDs to compare
        // Sort numerically to handle both string and number IDs correctly
        const currentIdsString = [...initialIds]
            .sort((a, b) => {
                const numA = Number(a);
                const numB = Number(b);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                return String(a).localeCompare(String(b));
            })
            .join(',');

        // Only fetch if the IDs have actually changed
        if (currentIdsString !== previousIdsRef.current && initialIds.length > 0) {
            previousIdsRef.current = currentIdsString;
            void fetchMissingLabels(initialIds, getLabels);
        }
    }, [fetchMissingLabels, getLabels, initialIds]);

    const mapIdToLabel = (id: string | number) => dataMap?.[String(id)] ?? `id::${id}`;

    return {
        map: mapIdToLabel,
        add: addKnownLabels,
        fetch: fetchMissingLabels,
    };
};

export const useEntityLabel = (initialIds: string[]) => {
    return useDataLabelBuilder(EntityStorageKey, getEntityLabels, initialIds);
};

export const useUatLabel = (initialIds: string[]) => {
    return useDataLabelBuilder(UatLabelStorageKey, getUatLabels, initialIds);
};

export const useEconomicClassificationLabel = (initialIds: string[]) => {
    return useDataLabelBuilder(EconomicClassificationLabelStorageKey, getEconomicClassificationLabels, initialIds);
}

export const useFunctionalClassificationLabel = (initialIds: string[]) => {
    return useDataLabelBuilder(FunctionalClassificationLabelStorageKey, getFunctionalClassificationLabels, initialIds);
}

export const useBudgetSectorLabel = (initialIds: (string | number)[]) => {
    return useDataLabelBuilder(BudgetSectorLabelStorageKey, getBudgetSectorLabels, initialIds);
}

export const useFundingSourceLabel = (initialIds: (string | number)[]) => {
    return useDataLabelBuilder(FundingSourceLabelStorageKey, getFundingSourceLabels, initialIds);
}

type EntityCategoriesJson = { readonly categories: Record<string, string> };

const fetchEntityCategories = async (): Promise<Record<string, string>> => {
    const lang = getUserLocale();
    const mod = lang === 'ro' ?
        await import('@/assets/entity-categories-ro.json') :
        await import('@/assets/entity-categories-en.json');
    const json = (mod as { default: EntityCategoriesJson }).default;
    return json.categories;
};

export const useEntityTypeLabel = (): LabelStore => {
    const { data: categories } = useQuery<Record<string, string>>({
        queryKey: ["entity-categories"],
        queryFn: fetchEntityCategories,
        staleTime: Infinity,
    });

    const mapIdToLabel = useCallback((id: string | number) => (categories?.[String(id)] ?? `id::${id}`), [categories]);

    return {
        map: mapIdToLabel,
        add: () => { },
        fetch: async () => { },
    };
};

export const useEntityTypeOptions = () => {
    const { data: categories } = useQuery<Record<string, string>>({
        queryKey: ["entity-categories"],
        queryFn: fetchEntityCategories,
        staleTime: Infinity,
    });

    const options = useMemo<OptionItem<string>[]>(() => {
        if (!categories) return [];
        return Object.entries(categories).map(([key, value]) => ({ id: key, label: value }));
    }, [categories]);

    return { options };
};

// ---------------------------------------------------------------------------
// Faceted entity tags (entity-tags.json asset, generated in the scrapper repo
// from the closed tag vocabulary). One bilingual file; the label language is
// picked at render time. Semantics: OR within a facet, AND across facets.
// ---------------------------------------------------------------------------

export interface EntityTagVocabularyTag {
    tag: string;
    labelRo: string;
    labelEn: string;
    descriptionRo?: string;
    descriptionEn?: string;
    parent?: string;
}

export interface EntityTagVocabularyFacet {
    facet: string;
    labelRo: string;
    labelEn: string;
    multi: boolean;
    noteRo?: string;
    noteEn?: string;
    tags: EntityTagVocabularyTag[];
}

export interface EntityTagVocabulary {
    version: string;
    semantics: string;
    tagCount: number;
    facets: EntityTagVocabularyFacet[];
}

const fetchEntityTagVocabulary = async (): Promise<EntityTagVocabulary> => {
    const mod = await import('@/assets/entity-tags.json');
    return (mod as { default: EntityTagVocabulary }).default;
};

export const useEntityTagVocabulary = () => {
    const { data: vocabulary } = useQuery<EntityTagVocabulary>({
        queryKey: ["entity-tag-vocabulary"],
        queryFn: fetchEntityTagVocabulary,
        staleTime: Infinity,
    });
    return { vocabulary };
};

/**
 * Maps a tag id (e.g. `kind::hospital`) to a localized `Facet: Label` chip
 * label. The facet prefix is deliberate: bare labels collide across facets
 * (level "Local" vs coverage "Locală") and the prefix keeps the OR-within /
 * AND-across grouping visible on the selected chips.
 */
export const useEntityTagLabel = (): LabelStore => {
    const { vocabulary } = useEntityTagVocabulary();
    const locale = getUserLocale();

    const tagLabelMap = useMemo(() => {
        const map = new Map<string, string>();
        if (!vocabulary) return map;
        for (const facet of vocabulary.facets) {
            const facetLabel = locale === 'ro' ? facet.labelRo : facet.labelEn;
            for (const tag of facet.tags) {
                const label = locale === 'ro' ? tag.labelRo : tag.labelEn;
                map.set(tag.tag, `${facetLabel}: ${label}`);
            }
        }
        return map;
    }, [vocabulary, locale]);

    const mapIdToLabel = useCallback(
        (id: string | number) => tagLabelMap.get(String(id)) ?? String(id),
        [tagLabelMap]
    );

    return {
        map: mapIdToLabel,
        add: () => { },
        fetch: async () => { },
    };
};

export const useAccountCategoryLabel = () => {
    const accountCategoryOptions = useMemo(() => {
        return {
            "ch": t`Expenses`,
            "vn": t`Income`
        }
    }, []);

    return {
        map: (id: string) => accountCategoryOptions[id as keyof typeof accountCategoryOptions] ?? `id::${id}`,
        add: () => { },
        fetch: () => { },
    }
}
