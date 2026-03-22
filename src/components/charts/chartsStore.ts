import { Chart, ChartSchema } from "@/schemas/charts";
import { z } from "zod";
import { Analytics } from "@/lib/analytics";

const isBrowser = typeof window !== 'undefined';

const chartsKey = 'saved-charts';
const categoriesKey = 'chart-categories';

const isQuotaExceededError = (error: unknown): boolean => {
    if (error instanceof DOMException) {
        return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
    }
    return false;
};

const safeSetItem = (key: string, value: string): boolean => {
    if (!isBrowser) return false;
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        if (isQuotaExceededError(error)) {
            console.warn(`localStorage quota exceeded for key ${key}. Data not persisted.`);
        } else {
            console.error(`Failed to save to localStorage for key ${key}:`, error);
        }
        return false;
    }
};

const restoreStoredItem = (key: string, previousValue: string | null): void => {
    if (!isBrowser) return;

    try {
        if (previousValue === null) {
            localStorage.removeItem(key);
            return;
        }

        localStorage.setItem(key, previousValue);
    } catch (error) {
        console.error(`Failed to restore localStorage for key ${key}:`, error);
    }
};

const storedChartSchema = ChartSchema.and(z.object({
    favorite: z.boolean().optional().default(false),
    deleted: z.boolean().optional().default(false),
    // List of category IDs the chart belongs to
    categories: z.array(z.string()).optional().default([]),
}));

export type StoredChart = z.infer<typeof storedChartSchema>;

// Categories
const categorySchema = z.object({
    id: z.string().default(() => crypto.randomUUID()),
    name: z.string(),
    createdAt: z.string().default(() => new Date().toISOString()),
    updatedAt: z.string().default(() => new Date().toISOString()),
});
export type ChartCategory = z.infer<typeof categorySchema>;

// Backup file schema
const chartsBackupSchema = z.object({
    type: z.literal('charts-backup').default('charts-backup'),
    version: z.literal(1).default(1),
    exportedAt: z.string().optional(),
    charts: z.array(storedChartSchema).default([]),
    categories: z.array(categorySchema).default([]),
}).passthrough();

export type ChartsBackupFile = z.infer<typeof chartsBackupSchema>;

export type ImportConflict = {
    readonly id: string;
    readonly currentTitle: string;
    readonly importedTitle: string;
};

export type ImportPreview = {
    readonly totalCharts: number;
    readonly unique: number;
    readonly conflicts: readonly ImportConflict[];
    readonly totalCategories: number;
    readonly categoriesNew: number;
    readonly categoriesMatchedByName: number;
};

export type ConflictStrategy = 'skip' | 'replace' | 'keep-both';

export type ImportResult = {
    readonly added: number;
    readonly replaced: number;
    readonly duplicated: number;
    readonly skipped: number;
};


export const getChartsStore = () => {

    const loadSavedCharts = ({ filterDeleted = false, sort = false }: { filterDeleted?: boolean, sort?: boolean } = {}): StoredChart[] => {
        if (!isBrowser) return [];

        const getRawCharts = () => {
            const chartsRaw = localStorage.getItem(chartsKey);
            if (!chartsRaw) {
                return [];
            }

            let chartsRawParsed: StoredChart[] = [];
            try {
                const parsed = JSON.parse(chartsRaw);
                if (Array.isArray(parsed)) {
                    chartsRawParsed = parsed;
                }
            } catch (error) {
                console.error("Failed to parse charts from localStorage", error);
            }
            return chartsRawParsed;
        }

        const chartsRawParsed = getRawCharts();
        const validCharts = chartsRawParsed
            .map(chart => {
                const result = storedChartSchema.safeParse(chart);
                if (result.success) {
                    return result.data;
                } else {
                    console.warn('An invalid chart object was found in localStorage and has been discarded:', result.error.flatten());
                    return null;
                }
            })
            .filter((chart): chart is StoredChart => chart !== null);

        if (sort) {
            validCharts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        }

        if (!filterDeleted) {
            return validCharts;
        }
        return validCharts.filter((c: StoredChart) => !c.deleted);
    }

    const loadCategories = (): ChartCategory[] => {
        if (!isBrowser) return [];

        const raw = localStorage.getItem(categoriesKey);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed
                    .map((c) => {
                        const r = categorySchema.safeParse(c);
                        return r.success ? r.data : null;
                    })
                    .filter((c): c is ChartCategory => c !== null)
                    .sort((a, b) => a.name.localeCompare(b.name));
            }
        } catch (err) {
            console.error('Failed to parse chart categories from localStorage', err);
        }
        return [];
    };

    const saveCategories = (categories: readonly ChartCategory[]): boolean => {
        if (!isBrowser) return false;
        return safeSetItem(categoriesKey, JSON.stringify(categories));
    };

    const createCategory = (name: string): ChartCategory => {
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            throw new Error('Category name cannot be empty');
        }
        const categories = loadCategories();
        // Avoid duplicates by name (case-insensitive)
        const exists = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            throw new Error('A category with this name already exists');
        }
        const newCategory: ChartCategory = {
            id: crypto.randomUUID(),
            name: trimmed,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        saveCategories([newCategory, ...categories]);
        return newCategory;
    };

    const renameCategory = (id: string, newName: string) => {
        const categories = loadCategories();
        const index = categories.findIndex((c) => c.id === id);
        if (index === -1) return;
        categories[index] = { ...categories[index], name: newName.trim(), updatedAt: new Date().toISOString() };
        saveCategories(categories);
    };

    const deleteCategory = (id: string) => {
        if (!isBrowser) return;

        const categories = loadCategories();
        const filtered = categories.filter((c) => c.id !== id);
        saveCategories(filtered);
        // Remove the category from all charts
        const savedCharts = loadSavedCharts();
        const updatedCharts = savedCharts.map((c) => ({
            ...c,
            categories: (c.categories ?? []).filter((catId) => catId !== id),
        }));
        safeSetItem(chartsKey, JSON.stringify(updatedCharts));
    };

    const deleteChart = (chartId: string) => {
        if (!isBrowser) return;

        const savedCharts = loadSavedCharts();
        const newCharts = savedCharts.map((c: Chart) => {
            if (c.id === chartId) {
                return { ...c, deleted: true };
            }
            return c;
        });
        safeSetItem(chartsKey, JSON.stringify(newCharts));
        Analytics.capture(Analytics.EVENTS.ChartDeleted, { chart_id: chartId });
    }

    const saveChartToLocalStorage = (chart: Chart) => {
        if (!isBrowser) return;

        const savedCharts = loadSavedCharts();
        const hasChart = savedCharts.some((c) => c.id === chart.id);
        if (hasChart) {
            return;
        }

        if (!ChartSchema.safeParse(chart).success) {
            console.error('Invalid chart', chart);
            return;
        }

        safeSetItem(chartsKey, JSON.stringify([
            chart,
            ...savedCharts,
        ]));
        Analytics.capture(Analytics.EVENTS.ChartOpened, { chart_id: chart.id, action: 'saved_to_local_storage' });
    }

    const updateChartInLocalStorage = (chart: Chart) => {
        if (!isBrowser) return;

        const savedCharts = loadSavedCharts();
        const chartIndex = savedCharts.findIndex((c: Chart) => c.id === chart.id);
        if (chartIndex === -1) return;
        const oldChart = savedCharts[chartIndex];
        const newChart = { ...oldChart, ...chart };
        safeSetItem(chartsKey, JSON.stringify([
            newChart,
            ...savedCharts.filter((c: Chart) => c.id !== chart.id),
        ]));
    }

    const toggleChartFavorite = (chartId: string) => {
        const savedCharts = loadSavedCharts();
        const chart = savedCharts.find((c: StoredChart) => c.id === chartId);
        if (!chart) {
            return;
        }
        const newChart = { ...chart, favorite: !chart.favorite };
        updateChartInLocalStorage(newChart);
    }

    const toggleChartCategory = (chartId: string, categoryId: string) => {
        const savedCharts = loadSavedCharts();
        const chart = savedCharts.find((c) => c.id === chartId);
        if (!chart) return;
        const current = chart.categories ?? [];
        const has = current.includes(categoryId);
        const updated: StoredChart = {
            ...chart,
            categories: has ? current.filter((c) => c !== categoryId) : [...current, categoryId],
            updatedAt: new Date().toISOString(),
        };
        updateChartInLocalStorage(updated);
    };

    // ==========================
    // Backup & Restore utilities
    // ==========================

    const createBackup = (): ChartsBackupFile => {
        const charts = loadSavedCharts({ filterDeleted: false, sort: false });
        const categories = loadCategories();
        return {
            type: 'charts-backup',
            version: 1,
            exportedAt: new Date().toISOString(),
            charts,
            categories,
        };
    };

    const previewImport = (input: unknown): { ok: true; preview: ImportPreview; backup: ChartsBackupFile } | { ok: false; error: string } => {
        const parsed = chartsBackupSchema.safeParse(input);
        if (!parsed.success) {
            return { ok: false, error: parsed.error.flatten().formErrors.join('\n') };
        }
        const backup = parsed.data;

        const currentCharts = loadSavedCharts({ filterDeleted: false, sort: false });
        const currentIds = new Set(currentCharts.map((c) => c.id));
        const conflicts: ImportConflict[] = [];
        let unique = 0;
        for (const imported of backup.charts) {
            if (currentIds.has(imported.id)) {
                const existing = currentCharts.find((c) => c.id === imported.id)!;
                conflicts.push({ id: imported.id, currentTitle: existing.title, importedTitle: imported.title });
            } else {
                unique += 1;
            }
        }

        // Categories: estimate how many will be matched by name and how many are new
        const currentCategories = loadCategories();
        const currentByName = new Map(currentCategories.map((c) => [c.name.toLowerCase(), c]));
        let categoriesMatchedByName = 0;
        let categoriesNew = 0;
        for (const cat of backup.categories) {
            if (currentByName.has(cat.name.toLowerCase())) categoriesMatchedByName += 1; else categoriesNew += 1;
        }

        const preview: ImportPreview = {
            totalCharts: backup.charts.length,
            unique,
            conflicts,
            totalCategories: backup.categories.length,
            categoriesNew,
            categoriesMatchedByName,
        };
        return { ok: true, preview, backup };
    };

    const importBackup = (input: unknown, strategy: ConflictStrategy): { ok: true; result: ImportResult } | { ok: false; error: string } => {
        if (!isBrowser) {
            return { ok: false, error: 'Cannot import on server' };
        }

        const parsed = chartsBackupSchema.safeParse(input);
        if (!parsed.success) {
            return { ok: false, error: parsed.error.flatten().formErrors.join('\n') };
        }
        const backup = parsed.data;

        const currentCharts = loadSavedCharts({ filterDeleted: false, sort: false });
        const currentById = new Map(currentCharts.map((c) => [c.id, c]));

        // Categories merge: prefer existing categories by name; create those that don't exist
        const currentCategories = loadCategories();
        const currentCategoriesById = new Map(currentCategories.map((c) => [c.id, c]));
        const currentCategoriesByName = new Map(currentCategories.map((c) => [c.name.toLowerCase(), c]));

        const categoryIdMap = new Map<string, string>(); // importedId -> effectiveId
        const categoriesToAdd: ChartCategory[] = [];

        for (const importedCat of backup.categories) {
            const existingById = currentCategoriesById.get(importedCat.id);
            if (existingById) {
                categoryIdMap.set(importedCat.id, existingById.id);
                continue;
            }
            const existingByName = currentCategoriesByName.get(importedCat.name.toLowerCase());
            if (existingByName) {
                categoryIdMap.set(importedCat.id, existingByName.id);
                continue;
            }
            // Add as new category (preserve id)
            categoriesToAdd.push(importedCat);
            categoryIdMap.set(importedCat.id, importedCat.id);
        }

        const nextCategories = [...currentCategories, ...categoriesToAdd]
            .sort((a, b) => a.name.localeCompare(b.name));
        const previousCategoriesRaw = localStorage.getItem(categoriesKey);
        if (categoriesToAdd.length > 0) {
            const categoriesPersisted = saveCategories(nextCategories);
            if (!categoriesPersisted) {
                return { ok: false, error: 'Failed to persist imported categories' };
            }
        }

        // Prepare charts
        const normalizeChartCategories = (chart: StoredChart): StoredChart => {
            const nextIds = (chart.categories ?? []).map((id) => categoryIdMap.get(id) ?? id);
            const dedup = Array.from(new Set(nextIds));
            return { ...chart, categories: dedup };
        };

        const importedCharts = backup.charts.map(normalizeChartCategories);
        const uniqueToAdd: StoredChart[] = [];
        const conflicts: StoredChart[] = [];
        for (const c of importedCharts) {
            if (currentById.has(c.id)) conflicts.push(c); else uniqueToAdd.push(c);
        }

        let added = 0;
        let replaced = 0;
        let duplicated = 0;
        let skipped = 0;

        let nextCharts = [...currentCharts];

        // Unique additions
        if (uniqueToAdd.length > 0) {
            added += uniqueToAdd.length;
            nextCharts = [...uniqueToAdd, ...nextCharts];
        }

        // Handle conflicts based on strategy
        if (conflicts.length > 0) {
            if (strategy === 'skip') {
                skipped += conflicts.length;
                // do nothing
            } else if (strategy === 'replace') {
                const replacements = new Map(conflicts.map((c) => [c.id, c]));
                nextCharts = nextCharts.map((existing) => {
                    const incoming = replacements.get(existing.id);
                    if (!incoming) return existing;
                    // Preserve favorite and deleted flags from existing
                    const preserved = {
                        favorite: (existing as StoredChart).favorite ?? false,
                        deleted: (existing as StoredChart).deleted ?? false,
                    } as Pick<StoredChart, 'favorite' | 'deleted'>;
                    replaced += 1;
                    return {
                        ...incoming,
                        ...preserved,
                        updatedAt: new Date().toISOString(),
                    } as StoredChart;
                });
            } else if (strategy === 'keep-both') {
                // Duplicate imported charts with new ids
                const duplicatedCharts = conflicts.map((c) => ({
                    ...c,
                    id: crypto.randomUUID(),
                    title: c.title ? `${c.title} (Imported)` : 'Imported Chart',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }));
                duplicated += duplicatedCharts.length;
                nextCharts = [...duplicatedCharts, ...nextCharts];
            }
        }

        // Persist
        const chartsPersisted = safeSetItem(chartsKey, JSON.stringify(nextCharts));
        if (!chartsPersisted) {
            if (categoriesToAdd.length > 0) {
                restoreStoredItem(categoriesKey, previousCategoriesRaw);
            }
            return { ok: false, error: 'Failed to persist imported charts' };
        }

        return { ok: true, result: { added, replaced, duplicated, skipped } };
    };

    return {
        loadSavedCharts,
        loadCategories,
        createCategory,
        renameCategory,
        deleteCategory,
        deleteChart,
        saveChartToLocalStorage,
        updateChartInLocalStorage,
        toggleChartFavorite,
        toggleChartCategory,
        createBackup,
        previewImport,
        importBackup,
    }
}
