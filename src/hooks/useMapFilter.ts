import { useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { defaultMapFilters, MapStateSchema, MapUrlState } from '@/schemas/map-filters';
import { useEconomicClassificationLabel, useFunctionalClassificationLabel, useAccountCategoryLabel, useUatLabel, useEntityLabel } from '@/hooks/filters/useFilterLabels';
import { OptionItem } from '@/components/filters/base-filter/interfaces';
import { AnalyticsFilterType } from '@/schemas/charts';
import { LabelStore } from '@/hooks/filters/interfaces';
import { Analytics } from '@/lib/analytics';
import { generateHash } from '@/lib/utils';

export function useMapFilter() {
    const navigate = useNavigate({ from: '/map' });
    const search = useSearch({ from: '/map' });
    const mapState = MapStateSchema.parse(search);

    const economicClassificationLabelsStore = useEconomicClassificationLabel(mapState.filters.economic_codes ?? []);
    const functionalClassificationLabelsStore = useFunctionalClassificationLabel(mapState.filters.functional_codes ?? []);
    const accountCategoryLabelsStore = useAccountCategoryLabel();
    const uatLabelsStore = useUatLabel((mapState.filters.uat_ids ?? []).map(String));
    const entityLabelsStore = useEntityLabel((mapState.filters.entity_cuis ?? []) as string[]);

    const setFilters = (filters: Partial<AnalyticsFilterType>) => {
        navigate({
            search: (prev) => {
                const prevState = (prev as unknown as MapUrlState);
                const prevFilter = prevState?.filters || defaultMapFilters;
                const newFilters = { ...prevState, filters: { ...prevFilter, ...filters } };
                // Emit a summarized change to avoid sending sensitive data
                const filterHash = generateHash(JSON.stringify(newFilters.filters));
                Analytics.capture(Analytics.EVENTS.MapFilterChanged, {
                    filter_hash: filterHash,
                    ...Analytics.summarizeFilter(newFilters.filters),
                });
                return newFilters;
            },
            replace: true,
            resetScroll: false,
        });
    };

    const createListUpdater = <K extends keyof AnalyticsFilterType>(filterKey: K, labelStore?: LabelStore) =>
        (action: React.SetStateAction<OptionItem<string | number>[]>) => {
            const currentOptions = (mapState.filters[filterKey] as (string | number)[])?.map(id => ({ id, label: labelStore?.map(id) ?? String(id) })) ?? [];
            const newState = typeof action === 'function' ? action(currentOptions) : action;
            if (labelStore) {
                labelStore.add(newState);
            }
            setFilters({ [filterKey]: newState.map(o => o.id) } as Partial<AnalyticsFilterType>);
        };

    const createValueUpdater = <K extends keyof AnalyticsFilterType>(filterKey: K) =>
        (value: AnalyticsFilterType[K]) => {
            setFilters({ [filterKey]: value } as Partial<AnalyticsFilterType>);
        };

    const setSelectedFunctionalClassificationOptions = createListUpdater('functional_codes', functionalClassificationLabelsStore);
    const setSelectedEconomicClassificationOptions = createListUpdater('economic_codes', economicClassificationLabelsStore);
    const setSelectedUatOptions = createListUpdater('uat_ids', uatLabelsStore);
    const setSelectedEntityOptions = createListUpdater('entity_cuis', entityLabelsStore);
    const setSelectedCountyOptions = createListUpdater('county_codes');
    const setSelectedEntityTypeOptions = createListUpdater('entity_types');
    const setSelectedBudgetSectorOptions = createListUpdater('budget_sector_ids');
    const setSelectedFundingSourceOptions = createListUpdater('funding_source_ids');
    const setAccountCategory = createValueUpdater('account_category');
    const setNormalization = createValueUpdater('normalization');
    const setFunctionalPrefixes = createValueUpdater('functional_prefixes');
    const setEconomicPrefixes = createValueUpdater('economic_prefixes');
    const setMinPopulation = createValueUpdater('min_population');
    const setMaxPopulation = createValueUpdater('max_population');
    const setAggregateMinAmount = createValueUpdater('aggregate_min_amount');
    const setAggregateMaxAmount = createValueUpdater('aggregate_max_amount');
    const setCurrency = createValueUpdater('currency');
    const setInflationAdjusted = createValueUpdater('inflation_adjusted');
    const setShowPeriodGrowth = createValueUpdater('show_period_growth');
    const setReportType = createValueUpdater('report_type');
    const setIsUat = createValueUpdater('is_uat');
    const setMainCreditorCui = createValueUpdater('main_creditor_cui');
    const setReportPeriod = createValueUpdater('report_period');

    const selectedEconomicClassificationOptions: OptionItem[] = useMemo(() =>
        mapState.filters.economic_codes?.map(id => ({ id, label: economicClassificationLabelsStore.map(id) })) ?? [],
        [mapState.filters.economic_codes, economicClassificationLabelsStore]
    );

    const selectedFunctionalClassificationOptions: OptionItem[] = useMemo(() =>
        mapState.filters.functional_codes?.map(id => ({ id, label: functionalClassificationLabelsStore.map(id) })) ?? [],
        [mapState.filters.functional_codes, functionalClassificationLabelsStore]
    );

    const selectedAccountCategoryOption: OptionItem = useMemo(() =>
        ({ id: mapState.filters.account_category, label: accountCategoryLabelsStore.map(mapState.filters.account_category) }),
        [mapState.filters.account_category, accountCategoryLabelsStore]
    );

    const selectedUatOptions: OptionItem<string | number>[] = useMemo(() =>
        (mapState.filters.uat_ids ?? []).map((id) => ({ id, label: uatLabelsStore.map(String(id)) })),
        [mapState.filters.uat_ids, uatLabelsStore],
    );

    const selectedEntityOptions: OptionItem<string | number>[] = useMemo(() =>
        (mapState.filters.entity_cuis ?? []).map((cui) => ({ id: cui, label: entityLabelsStore.map(String(cui)) })),
        [mapState.filters.entity_cuis, entityLabelsStore],
    );

    // ============================================================================
    // EXCLUDE FILTERS STATE MANAGEMENT
    // ============================================================================

    const exclude = mapState.filters.exclude ?? {};

    // Label stores for exclude filters
    const excludeEntityLabelsStore = useEntityLabel((exclude.entity_cuis ?? []) as string[]);
    const excludeUatLabelsStore = useUatLabel((exclude.uat_ids ?? []).map(String));
    const excludeEconomicClassificationLabelsStore = useEconomicClassificationLabel(exclude.economic_codes ?? []);
    const excludeFunctionalClassificationLabelsStore = useFunctionalClassificationLabel(exclude.functional_codes ?? []);

    // Helper to create exclude list updaters
    const createExcludeListUpdater = <K extends keyof typeof exclude>(filterKey: K, labelStore?: LabelStore) =>
        (action: React.SetStateAction<OptionItem<string | number>[]>) => {
            const currentOptions = (exclude[filterKey] as (string | number)[])?.map(id => ({ id, label: labelStore?.map(id) ?? String(id) })) ?? [];
            const newState = typeof action === 'function' ? action(currentOptions) : action;
            if (labelStore) {
                labelStore.add(newState);
            }
            const newExclude = { ...exclude, [filterKey]: newState.map(o => o.id) };
            setFilters({ exclude: newExclude } as Partial<AnalyticsFilterType>);
        };

    const createExcludeValueUpdater = <K extends keyof typeof exclude>(filterKey: K) =>
        (value: (typeof exclude)[K]) => {
            const newExclude = { ...exclude, [filterKey]: value };
            setFilters({ exclude: newExclude } as Partial<AnalyticsFilterType>);
        };

    // Exclude filter setters
    const setExcludeSelectedEntityOptions = createExcludeListUpdater('entity_cuis', excludeEntityLabelsStore);
    const setExcludeMainCreditorCui = createExcludeValueUpdater('main_creditor_cui');
    const setExcludeSelectedUatOptions = createExcludeListUpdater('uat_ids', excludeUatLabelsStore);
    const setExcludeSelectedCountyOptions = createExcludeListUpdater('county_codes');
    const setExcludeSelectedEntityTypeOptions = createExcludeListUpdater('entity_types');
    const setExcludeSelectedFunctionalClassificationOptions = createExcludeListUpdater('functional_codes', excludeFunctionalClassificationLabelsStore);
    const setExcludeSelectedEconomicClassificationOptions = createExcludeListUpdater('economic_codes', excludeEconomicClassificationLabelsStore);
    const setExcludeSelectedBudgetSectorOptions = createExcludeListUpdater('budget_sector_ids');
    const setExcludeSelectedFundingSourceOptions = createExcludeListUpdater('funding_source_ids');
    const setExcludeFunctionalPrefixes = createExcludeValueUpdater('functional_prefixes');
    const setExcludeEconomicPrefixes = createExcludeValueUpdater('economic_prefixes');

    // Exclude filter selected options
    const excludeSelectedEntityOptions: OptionItem<string | number>[] = useMemo(() =>
        (exclude.entity_cuis ?? []).map((cui) => ({ id: cui, label: excludeEntityLabelsStore.map(String(cui)) })),
        [exclude.entity_cuis, excludeEntityLabelsStore],
    );

    const excludeSelectedMainCreditorOption: OptionItem[] = useMemo(() =>
        exclude.main_creditor_cui ? [{ id: exclude.main_creditor_cui, label: excludeEntityLabelsStore.map(exclude.main_creditor_cui) }] : [],
        [exclude.main_creditor_cui, excludeEntityLabelsStore],
    );

    const excludeSelectedUatOptions: OptionItem<string | number>[] = useMemo(() =>
        (exclude.uat_ids ?? []).map((id) => ({ id, label: excludeUatLabelsStore.map(String(id)) })),
        [exclude.uat_ids, excludeUatLabelsStore],
    );

    const excludeSelectedCountyOptions: OptionItem<string>[] = useMemo(() =>
        (exclude.county_codes ?? []).map((code) => ({ id: code, label: String(code) })),
        [exclude.county_codes],
    );

    const excludeSelectedEntityTypeOptions: OptionItem<string>[] = useMemo(() =>
        (exclude.entity_types ?? []).map((id) => ({ id, label: String(id) })),
        [exclude.entity_types],
    );

    const excludeSelectedFunctionalClassificationOptions: OptionItem[] = useMemo(() =>
        (exclude.functional_codes ?? []).map(id => ({ id, label: excludeFunctionalClassificationLabelsStore.map(id) })),
        [exclude.functional_codes, excludeFunctionalClassificationLabelsStore],
    );

    const excludeSelectedEconomicClassificationOptions: OptionItem[] = useMemo(() =>
        (exclude.economic_codes ?? []).map(id => ({ id, label: excludeEconomicClassificationLabelsStore.map(id) })),
        [exclude.economic_codes, excludeEconomicClassificationLabelsStore],
    );

    const excludeSelectedBudgetSectorOptions: OptionItem<string | number>[] = useMemo(() =>
        (exclude.budget_sector_ids ?? []).map((id) => ({ id, label: String(id) })),
        [exclude.budget_sector_ids],
    );

    const excludeSelectedFundingSourceOptions: OptionItem<string | number>[] = useMemo(() =>
        (exclude.funding_source_ids ?? []).map((id) => ({ id, label: String(id) })),
        [exclude.funding_source_ids],
    );

    const clearAllExcludeFilters = () => {
        setFilters({ exclude: undefined } as Partial<AnalyticsFilterType>);
    };

    const clearAllFilters = () => {
        setFilters(defaultMapFilters);
    };

    const setActiveView = (view: "map" | "table" | "chart") => {
        Analytics.capture(Analytics.EVENTS.MapActiveViewChanged, { view });
        navigate({ search: (prev) => ({ ...prev, activeView: view }), replace: true, resetScroll: false });
    };

    const setMapViewType = (viewType: "UAT" | "County") => {
        Analytics.capture(Analytics.EVENTS.MapViewTypeChanged, { view_type: viewType });
        navigate({ search: (prev) => ({ ...prev, mapViewType: viewType }), replace: true, resetScroll: false });
    };

    return {
        mapState,
        setFilters,
        clearAllFilters,
        setActiveView,
        setMapViewType,
        selectedEconomicClassificationOptions,
        setSelectedEconomicClassificationOptions,
        selectedFunctionalClassificationOptions,
        setSelectedFunctionalClassificationOptions,
        selectedAccountCategoryOption,
        setAccountCategory,
        setNormalization,
        setReportPeriod,
        selectedUatOptions,
        setSelectedUatOptions,
        selectedEntityOptions,
        setSelectedEntityOptions,
        setSelectedCountyOptions,
        setSelectedEntityTypeOptions,
        setSelectedBudgetSectorOptions,
        setSelectedFundingSourceOptions,
        setFunctionalPrefixes,
        setEconomicPrefixes,
        setMinPopulation,
        setMaxPopulation,
        setAggregateMinAmount,
        setAggregateMaxAmount,
        setCurrency,
        setInflationAdjusted,
        setShowPeriodGrowth,
        setReportType,
        setIsUat,
        setMainCreditorCui,
        // Exclude filters
        excludeSelectedEntityOptions,
        setExcludeSelectedEntityOptions,
        excludeSelectedMainCreditorOption,
        setExcludeMainCreditorCui,
        excludeSelectedUatOptions,
        setExcludeSelectedUatOptions,
        excludeSelectedCountyOptions,
        setExcludeSelectedCountyOptions,
        excludeSelectedEntityTypeOptions,
        setExcludeSelectedEntityTypeOptions,
        excludeSelectedFunctionalClassificationOptions,
        setExcludeSelectedFunctionalClassificationOptions,
        excludeSelectedEconomicClassificationOptions,
        setExcludeSelectedEconomicClassificationOptions,
        excludeSelectedBudgetSectorOptions,
        setExcludeSelectedBudgetSectorOptions,
        excludeSelectedFundingSourceOptions,
        setExcludeSelectedFundingSourceOptions,
        setExcludeFunctionalPrefixes,
        setExcludeEconomicPrefixes,
        clearAllExcludeFilters,
    };
}
