import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { Dataset, getDatasets } from "@/lib/api/datasets";
import { getUserLocale } from "@/lib/utils";

const getDatasetStorageKey = () => `datasets_${getUserLocale()}`;

const isBrowser = typeof window !== 'undefined';

const loadLocalData = (): Record<string, Dataset> => {
    if (!isBrowser) return {};

    try {
        const storage = localStorage.getItem(getDatasetStorageKey());
        return storage ? JSON.parse(storage) : {};
    } catch (error) {
        console.error("Failed to parse data from localStorage for key", getDatasetStorageKey(), error);
        return {};
    }
};

const saveLocalData = (data: Record<string, Dataset>) => {
    if (!isBrowser) return;
    localStorage.setItem(getDatasetStorageKey(), JSON.stringify(data));
};

const updateLocalData = (data: Record<string, Dataset>): Record<string, Dataset> => {
    const currentData = loadLocalData();
    // Deduplicate data
    data = Object.fromEntries(Object.entries(data).filter(([key]) => !currentData[key]));
    Object.assign(currentData, data);
    saveLocalData(currentData);
    return currentData;
};

// We need to track pending requests to avoid duplicate requests
const pendingDatasetRequests = new Set<string>();

export const useDatasetStore = (initialIds: (string | number)[]) => {
    const queryClient = useQueryClient();
    const locale = getUserLocale();

    const { data: dataMap } = useQuery<Record<string, Dataset>>({
        queryKey: [getDatasetStorageKey()],
        queryFn: () => loadLocalData(),
        staleTime: Infinity,
        initialData: loadLocalData(),
    });

    const fetchMissingDatasets = useCallback(async (ids: (string | number)[]) => {
        if (!ids || ids.length === 0) return;

        const dataMap = loadLocalData();
        const missingIds = ids.filter(id => !dataMap[String(id)] && !pendingDatasetRequests.has(String(id)));

        if (missingIds.length === 0) return;

        try {
            missingIds.forEach(id => pendingDatasetRequests.add(String(id)));
            const newDatasets = await getDatasets(missingIds, locale);

            newDatasets.forEach((dataset) => {
                dataMap[String(dataset.id)] = dataset;
            });

            updateLocalData(dataMap);

            await queryClient.invalidateQueries({ queryKey: [getDatasetStorageKey()] });
        } catch (error) {
            console.error("Failed to fetch datasets:", error);
        } finally {
            missingIds.forEach(id => pendingDatasetRequests.delete(String(id)));
        }
    }, [locale, queryClient]);

    const addKnownDatasets = useCallback((datasets: Dataset[]) => {
        const currentMap = loadLocalData();
        datasets.forEach((dataset) => {
            currentMap[String(dataset.id)] = dataset;
        });

        const updatedData = updateLocalData(currentMap);

        queryClient.setQueryData([getDatasetStorageKey()], updatedData);
    }, [queryClient]);

    useEffect(() => {
        if (initialIds) {
            fetchMissingDatasets(initialIds);
        }
    }, [fetchMissingDatasets, initialIds]);

    const getDataset = (id: string | number) => dataMap?.[String(id)];

    return {
        get: getDataset,
        add: addKnownDatasets,
        fetch: fetchMissingDatasets,
    };
};
