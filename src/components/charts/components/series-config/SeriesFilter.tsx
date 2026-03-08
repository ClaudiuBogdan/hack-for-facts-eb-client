import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  XCircle,
  MapPin,
  EuroIcon,
  ChartBar,
  SlidersHorizontal,
  ArrowUpDown,
  Calendar,
  MapPinned,
  Globe,
  Tags,
  MinusCircle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../../ui/accordion";
import { Badge } from "../../../ui/badge";
import { FilterListContainer } from "../../../filters/base-filter/FilterListContainer";
import { FilterPrefixContainer, PrefixFilter } from "../../../filters/prefix-filter";
import { FilterRangeContainer } from "../../../filters/base-filter/FilterRangeContainer";
import { FilterRadioContainer } from "../../../filters/base-filter/FilterRadioContainer";
import { ReportTypeFilter } from "../../../filters/report-type-filter";
import { FilterContainer } from "../../../filters/base-filter/FilterContainer";
import { IsUatFilter } from "../../../filters/flags-filter";
import { EconomicClassificationList } from "../../../filters/economic-classification-filter";
import { UatList } from "../../../filters/uat-filter";
import { CountyList } from "../../../filters/county-filter/CountyList";
import { EntityTypeList } from "../../../filters/entity-type-filter/EntityTypeList";
import { AmountRangeFilter } from "../../../filters/amount-range-filter";
import { EntityList } from "../../../filters/entity-filter";
import { useChartStore } from "../../hooks/useChartStore";
import { OptionItem } from "../../../filters/base-filter/interfaces";
import { FunctionalClassificationList } from "../../../filters/functional-classification-filter";
import { AccountCategoryRadio } from "../../../filters/account-type-filter/AccountCategoryRadio";
import { cn, getNormalizationUnit } from "@/lib/utils";
import { BudgetSectorList } from "@/components/filters/budget-sector-filter";
import { FundingSourceList } from "@/components/filters/funding-source-filter";
import {
  useBudgetSectorLabel,
  useEconomicClassificationLabel,
  useEntityLabel,
  useFundingSourceLabel,
  useFunctionalClassificationLabel,
  useUatLabel,
  useEntityTypeLabel,
  useAccountCategoryLabel,
} from "@/hooks/filters/useFilterLabels";
import { LabelStore } from "@/hooks/filters/interfaces";
import type {
  CommitmentsMetric,
  CommitmentsReportType,
  CommitmentsSeriesConfiguration,
  ReportType,
  SeriesConfiguration,
} from "@/schemas/charts";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { NormalizationFilter } from "@/components/filters/normalization-filter/NormalizationFilter";
import { PeriodFilter } from "@/components/filters/period-filter/PeriodFilter";
import type { ReportPeriodInput } from "@/schemas/reporting";
import { getPeriodTags } from "@/lib/period-utils";
import { produce } from "immer";
import { getEconomicPrefixLabel, getFunctionalPrefixLabel } from "@/lib/chart-filter-utils";
import { RadioGroupButtons } from "@/components/ui/radio-group-buttons";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useUserCurrency } from "@/lib/hooks/useUserCurrency";
import { useUserInflationAdjusted } from "@/lib/hooks/useUserInflationAdjusted";
import { isMetricAvailableForPeriod } from "@/schemas/commitments";
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES } from "@/lib/analytics-defaults";
import { getCommitmentsMetricOptions } from "@/lib/commitments-metrics";

type FilterSeries = SeriesConfiguration | CommitmentsSeriesConfiguration;
type FilterSeriesType = FilterSeries["type"];

export type SeriesFilterMutator = (draft: FilterSeries) => void;

export interface SeriesFilterAdapter {
  series: FilterSeries | undefined;
  applyChanges: (mutator: SeriesFilterMutator) => void;
}

interface SeriesFilterProps {
  seriesId?: string;
  className?: string;
  adapter?: SeriesFilterAdapter;
}

interface SeriesFilterInternalProps {
  adapter: SeriesFilterAdapter;
  className?: string;
}

type FilterValue = string | number | boolean | undefined;

type CurrencyCode = "RON" | "EUR" | "USD";

const COMMITMENTS_REPORT_TYPE_OPTIONS: ReadonlyArray<{ value: CommitmentsReportType; label: string }> = [
  { value: "PRINCIPAL_AGGREGATED", label: t`Main aggregated` },
  { value: "SECONDARY_AGGREGATED", label: t`Secondary aggregated` },
  { value: "DETAILED", label: t`Detailed` },
];

function getAllowedPeriodTypesForMetric(metric: CommitmentsMetric): Array<"YEAR" | "QUARTER" | "MONTH"> {
  const allowed: Array<"YEAR" | "QUARTER" | "MONTH"> = [];
  if (isMetricAvailableForPeriod(metric, "YEAR")) allowed.push("YEAR");
  if (isMetricAvailableForPeriod(metric, "QUARTER")) allowed.push("QUARTER");
  if (isMetricAvailableForPeriod(metric, "MONTH")) allowed.push("MONTH");
  return allowed.length > 0 ? allowed : ["YEAR"];
}

function buildSeriesFilterInitializationPatch(
  seriesType: FilterSeriesType,
  filter: FilterSeries["filter"],
  defaults: { currency: CurrencyCode; inflationAdjusted: boolean }
): Partial<FilterSeries["filter"]> | null {
  const patch: Record<string, unknown> = {};

  const normalizationRaw = filter.normalization;

  if (normalizationRaw === "total_euro") {
    patch.normalization = "total";
    patch.currency = "EUR";
  } else if (normalizationRaw === "per_capita_euro") {
    patch.normalization = "per_capita";
    patch.currency = "EUR";
  }

  const normalizationEffective = (patch.normalization ?? normalizationRaw) as string | undefined;

  if (filter.currency == null && patch.currency == null) {
    patch.currency = defaults.currency;
  }

  if (filter.inflation_adjusted === undefined) {
    patch.inflation_adjusted = normalizationEffective === "percent_gdp" ? false : defaults.inflationAdjusted;
  }

  if (seriesType === "commitments-analytics") {
    if (!("report_type" in filter) || !filter.report_type) {
      patch.report_type = "PRINCIPAL_AGGREGATED" as CommitmentsReportType;
    }

    const currentExclude = filter.exclude ?? {};
    if (!currentExclude.economic_prefixes?.length) {
      patch.exclude = {
        ...currentExclude,
        economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
      };
    }
  }

  return Object.keys(patch).length > 0 ? (patch as Partial<FilterSeries["filter"]>) : null;
}

export function SeriesFilter({ seriesId, className, adapter }: Readonly<SeriesFilterProps>) {
  if (adapter) {
    return <SeriesFilterInternal adapter={adapter} className={className} />;
  }

  if (!seriesId) {
    return null;
  }

  return <SeriesFilterWithChart seriesId={seriesId} className={className} />;
}

function SeriesFilterWithChart({ seriesId, className }: Readonly<{ seriesId: string; className?: string }>) {
  const { chart, updateSeries } = useChartStore();

  const chartSeries = chart.series.find(
    (candidate) =>
      candidate.id === seriesId &&
      (candidate.type === "line-items-aggregated-yearly" || candidate.type === "commitments-analytics")
  ) as FilterSeries | undefined;

  const adapter = useMemo<SeriesFilterAdapter>(
    () => ({
      series: chartSeries,
      applyChanges: (mutator: SeriesFilterMutator) => {
        updateSeries(seriesId, (prevSeries) => {
          if (prevSeries.type !== "line-items-aggregated-yearly" && prevSeries.type !== "commitments-analytics") {
            return prevSeries;
          }
          return produce(prevSeries, (draft) => {
            mutator(draft as FilterSeries);
          });
        });
      },
    }),
    [chartSeries, seriesId, updateSeries]
  );

  if (!adapter.series) {
    return null;
  }

  return <SeriesFilterInternal adapter={adapter} className={className} />;
}

function SeriesFilterInternal({ adapter, className }: Readonly<SeriesFilterInternalProps>) {
  const applyChanges = adapter.applyChanges;
  const series = adapter.series;
  const [userCurrency] = useUserCurrency();
  const [userInflationAdjusted] = useUserInflationAdjusted();

  const initializedRef = useRef<string | null>(null);

  const entityLabelsStore = useEntityLabel(series?.filter.entity_cuis ?? []);
  const uatLabelsStore = useUatLabel(series?.filter.uat_ids ?? []);
  const economicClassificationLabelsStore = useEconomicClassificationLabel(series?.filter.economic_codes ?? []);
  const functionalClassificationLabelsStore = useFunctionalClassificationLabel(series?.filter.functional_codes ?? []);
  const budgetSectorLabelsStore = useBudgetSectorLabel(series?.filter.budget_sector_ids ?? []);
  const fundingSourceLabelsStore = useFundingSourceLabel(series?.filter.funding_source_ids ?? []);
  const entityTypeLabelsStore = useEntityTypeLabel();
  const accountCategoryLabelsStore = useAccountCategoryLabel();

  const exclude = (series?.filter as any)?.exclude ?? {};
  const excludeEntityLabelsStore = useEntityLabel(exclude.entity_cuis ?? []);
  const excludeUatLabelsStore = useUatLabel(exclude.uat_ids ?? []);
  const excludeEconomicClassificationLabelsStore = useEconomicClassificationLabel(exclude.economic_codes ?? []);
  const excludeFunctionalClassificationLabelsStore = useFunctionalClassificationLabel(exclude.functional_codes ?? []);
  const excludeBudgetSectorLabelsStore = useBudgetSectorLabel(exclude.budget_sector_ids ?? []);
  const excludeFundingSourceLabelsStore = useFundingSourceLabel(exclude.funding_source_ids ?? []);

  // Accordion open state - auto-open when there are active exclude filters
  const [excludeValue, setExcludeValue] = useState<string>("");

  // Series filters should not auto-sync with global preferences after creation.
  // Use globals only as defaults when fields are missing, and migrate legacy values once.
  useEffect(() => {
    if (!series) return;
    if (initializedRef.current === series.id) return;

    const patch = buildSeriesFilterInitializationPatch(series.type, series.filter, {
      currency: userCurrency,
      inflationAdjusted: userInflationAdjusted,
    });
    if (!patch) {
      initializedRef.current = series.id;
      return;
    }

    applyChanges((draft) => {
      Object.assign(draft.filter, patch);
    });
    initializedRef.current = series.id;
  }, [applyChanges, series, userCurrency, userInflationAdjusted]);

  if (!series) {
    return null;
  }

  const isCommitmentsSeries = series.type === "commitments-analytics";
  const filter = series.filter as any;

  const createListUpdater =
    (filterKey: string, labelStore?: LabelStore) =>
      (action: React.SetStateAction<OptionItem<string | number>[]>) => {
        const currentOptions =
          (filter[filterKey] as (string | number)[] | undefined)?.map((id) => ({
            id,
            label: labelStore?.map(id) ?? String(id),
          })) || [];

        const newState = typeof action === "function" ? action(currentOptions) : action;
        if (labelStore) {
          labelStore.add(newState);
        }

        applyChanges((draft) => {
          (draft.filter as any)[filterKey] = newState.map((option) => option.id);
        });

        return newState;
      };

  const createValueUpdater =
    (filterKey: string, transform?: (value: FilterValue) => FilterValue) =>
      (value: FilterValue) => {
        const newValue = typeof transform === "function" ? transform(value) : value;
        applyChanges((draft) => {
          (draft.filter as any)[filterKey] = newValue;
        });
      };

  const createPrefixListUpdater = (filterKey: "functional_prefixes" | "economic_prefixes") => (value: string[] | undefined) => {
    applyChanges((draft) => {
      draft.filter[filterKey] = value && value.length > 0 ? value : undefined;
    });
  };

  const selectedEntityOptions: OptionItem[] =
    filter.entity_cuis?.map((cui: string) => ({ id: cui, label: entityLabelsStore.map(cui) })) ?? [];
  const setSelectedEntityOptions = createListUpdater("entity_cuis", entityLabelsStore);

  const selectedMainCreditorOption: OptionItem[] =
    filter.main_creditor_cui ? [{ id: filter.main_creditor_cui, label: entityLabelsStore.map(filter.main_creditor_cui) }] : [];
  const setMainCreditorCui = createValueUpdater("main_creditor_cui", (value) => (value ? String(value) : undefined));

  const selectedUatOptions: OptionItem<string>[] =
    filter.uat_ids?.map((id: string) => ({ id, label: uatLabelsStore.map(id) })) ?? [];
  const setSelectedUatOptions = createListUpdater("uat_ids", uatLabelsStore);

  const selectedEconomicClassificationOptions: OptionItem[] =
    filter.economic_codes?.map((id: string) => ({ id, label: economicClassificationLabelsStore.map(id) })) ?? [];
  const setSelectedEconomicClassificationOptions = createListUpdater("economic_codes", economicClassificationLabelsStore);

  const selectedFunctionalClassificationOptions: OptionItem[] =
    filter.functional_codes?.map((id: string) => ({ id, label: functionalClassificationLabelsStore.map(id) })) ?? [];
  const setSelectedFunctionalClassificationOptions = createListUpdater("functional_codes", functionalClassificationLabelsStore);

  const selectedAccountTypeOption: OptionItem = !isCommitmentsSeries && filter.account_category
    ? { id: filter.account_category, label: accountCategoryLabelsStore.map(filter.account_category) }
    : { id: "ch", label: accountCategoryLabelsStore.map("ch") };
  const setSelectedAccountTypeOption = createValueUpdater("account_category", (value) => (value ? value : undefined));

  const selectedEntityTypeOptions: OptionItem[] =
    filter.entity_types?.map((id: string) => ({ id, label: entityTypeLabelsStore.map(id) })) ?? [];
  const setSelectedEntityTypeOptions = createListUpdater("entity_types", entityTypeLabelsStore);

  const selectedCountyOptions: OptionItem<string>[] =
    filter.county_codes?.map((code: string) => ({ id: code, label: String(code) })) ?? [];
  const setSelectedCountyOptions = createListUpdater("county_codes");

  const selectedBudgetSectorOptions: OptionItem[] =
    filter.budget_sector_ids?.map((id: string) => ({ id, label: budgetSectorLabelsStore.map(id) })) ?? [];
  const setSelectedBudgetSectorOptions = createListUpdater("budget_sector_ids", budgetSectorLabelsStore);

  const selectedFundingSourceOptions: OptionItem[] =
    filter.funding_source_ids?.map((id: string) => ({ id, label: fundingSourceLabelsStore.map(id) })) ?? [];
  const setSelectedFundingSourceOptions = createListUpdater("funding_source_ids", fundingSourceLabelsStore);

  const selectedEconomicPrefixesOptions = filter.economic_prefixes ?? [];
  const setSelectedEconomicPrefixesOptions = createPrefixListUpdater("economic_prefixes");

  const selectedFunctionalPrefixesOptions = filter.functional_prefixes ?? [];
  const setSelectedFunctionalPrefixesOptions = createPrefixListUpdater("functional_prefixes");

  const minAmount = String(filter.aggregate_min_amount ?? "");
  const maxAmount = String(filter.aggregate_max_amount ?? "");
  const setMinAmount = createValueUpdater("aggregate_min_amount", (value) => (value ? Number(value) : undefined));
  const setMaxAmount = createValueUpdater("aggregate_max_amount", (value) => (value ? Number(value) : undefined));

  const minItemAmount = String(filter.item_min_amount ?? "");
  const maxItemAmount = String(filter.item_max_amount ?? "");
  const setMinItemAmount = createValueUpdater("item_min_amount", (value) => (value ? Number(value) : undefined));
  const setMaxItemAmount = createValueUpdater("item_max_amount", (value) => (value ? Number(value) : undefined));

  const setPeriod = (period: ReportPeriodInput | undefined) => {
    applyChanges((draft) => {
      draft.filter.report_period = period as any;
    });
  };

  const reportType = filter.report_type;
  const setReportType = (value: FilterValue) => {
    applyChanges((draft) => {
      draft.filter.report_type = value
        ? (isCommitmentsSeries ? (String(value) as CommitmentsReportType) : (String(value) as ReportType))
        : undefined;
    });
  };

  const commitmentsMetric: CommitmentsMetric = isCommitmentsSeries
    ? (series.metric ?? "CREDITE_ANGAJAMENT")
    : "CREDITE_ANGAJAMENT";
  const commitmentsMetricOptions = useMemo(
    () => getCommitmentsMetricOptions(),
    [],
  );
  const setCommitmentsMetric = (value: FilterValue) => {
    if (!isCommitmentsSeries || !value) return;
    const metric = String(value) as CommitmentsMetric;
    applyChanges((draft) => {
      if (draft.type !== "commitments-analytics") return;
      draft.metric = metric;
    });
  };
  const commitmentsMetricOption: OptionItem | null = isCommitmentsSeries
    ? {
        id: commitmentsMetric,
        label:
          commitmentsMetricOptions.find((option) => option.value === commitmentsMetric)?.label ??
          commitmentsMetric,
      }
    : null;

  let normalization: "total" | "per_capita" | "percent_gdp" | undefined;
  if (filter.normalization === "total_euro") {
    normalization = "total";
  } else if (filter.normalization === "per_capita_euro") {
    normalization = "per_capita";
  } else if (filter.normalization === "total" || filter.normalization === "per_capita" || filter.normalization === "percent_gdp") {
    normalization = filter.normalization;
  } else {
    normalization = undefined;
  }
  const setNormalization = createValueUpdater("normalization", (value) => (value ? value : undefined));
  let normalizationLabel;
  if (normalization === "per_capita") {
    normalizationLabel = t`Per capita`;
  } else if (normalization === "percent_gdp") {
    normalizationLabel = t`% of GDP`;
  } else {
    normalizationLabel = t`Total`;
  }
  const normalizationOption: OptionItem | null = normalization ? { id: normalization, label: normalizationLabel } : null;

  const currency = filter.currency;
  const setCurrency = createValueUpdater("currency", (value) => (value ? String(value) : undefined));
  const effectiveCurrency = currency ?? userCurrency;
  const currencyOption: OptionItem | null = effectiveCurrency ? { id: effectiveCurrency, label: effectiveCurrency } : null;

  const inflationAdjusted = filter.inflation_adjusted;
  const setInflationAdjusted = createValueUpdater("inflation_adjusted", (value) => {
    if (value === undefined) return undefined;
    return Boolean(value);
  });
  const inflationOption: OptionItem | null =
    typeof inflationAdjusted === "boolean"
      ? { id: inflationAdjusted ? "real" : "nominal", label: inflationAdjusted ? t`Real (2024 prices)` : t`Nominal` }
      : null;

  const showPeriodGrowth = Boolean(filter.show_period_growth);
  const setShowPeriodGrowth = createValueUpdater("show_period_growth", (value) => {
    if (value === undefined) return undefined;
    return Boolean(value);
  });
  const growthOptions: OptionItem[] = showPeriodGrowth ? [{ id: "growth", label: t`Show growth (%)` }] : [];

  const reportTypeOption: OptionItem | null = reportType
    ? {
      id: reportType,
      label: isCommitmentsSeries
        ? COMMITMENTS_REPORT_TYPE_OPTIONS.find((option) => option.value === reportType)?.label ?? reportType
        : reportType,
    }
    : null;

  const minPopulation = filter.min_population;
  const maxPopulation = filter.max_population;
  const setMinPopulation = createValueUpdater("min_population", (value) => (value ? Number(value) : undefined));
  const setMaxPopulation = createValueUpdater("max_population", (value) => (value ? Number(value) : undefined));

  const flagsOptions: OptionItem[] = [];
  if (filter.is_uat === true) flagsOptions.push({ id: "isUat", label: t`UAT: Yes` });
  if (filter.is_uat === false) flagsOptions.push({ id: "isUat", label: t`UAT: No` });
  const setIsUat = createValueUpdater("is_uat", (value) => (value !== undefined ? value : undefined));

  const periodTags = getPeriodTags(filter.report_period as ReportPeriodInput).map((tag) => ({
    id: String(tag.value),
    label: String(tag.value),
  }));
  const allowedPeriodTypes = isCommitmentsSeries ? getAllowedPeriodTypesForMetric(commitmentsMetric) : undefined;

  // ============================================================================
  // EXCLUDE FILTERS STATE MANAGEMENT
  // ============================================================================

  // Helper to create exclude list updaters
  const createExcludeListUpdater =
    (filterKey: string, labelStore?: LabelStore) =>
      (action: React.SetStateAction<OptionItem<string | number>[]>) => {
        const currentOptions =
          (exclude[filterKey] as (string | number)[] | undefined)?.map((id) => ({
            id,
            label: labelStore?.map(id) ?? String(id),
          })) || [];

        const newState = typeof action === "function" ? action(currentOptions) : action;
        if (labelStore) {
          labelStore.add(newState);
        }

        applyChanges((draft) => {
          if (!draft.filter.exclude) {
            draft.filter.exclude = {};
          }
          (draft.filter.exclude as any)[filterKey] = newState.map((option) => option.id);
        });

        return newState;
      };

  const createExcludeValueUpdater =
    (filterKey: string) =>
      (value: FilterValue) => {
        applyChanges((draft) => {
          if (!draft.filter.exclude) {
            draft.filter.exclude = {};
          }
          (draft.filter.exclude as any)[filterKey] = value;
        });
      };

  const createExcludePrefixListUpdater = (filterKey: "functional_prefixes" | "economic_prefixes") => (value: string[] | undefined) => {
    applyChanges((draft) => {
      if (!draft.filter.exclude) {
        draft.filter.exclude = {};
      }
      draft.filter.exclude[filterKey] = value && value.length > 0 ? value : undefined;
    });
  };

  // Exclude filter state variables
  const excludeSelectedEntityOptions: OptionItem[] =
    exclude.entity_cuis?.map((cui: string) => ({ id: cui, label: excludeEntityLabelsStore.map(cui) })) ?? [];
  const setExcludeSelectedEntityOptions = createExcludeListUpdater("entity_cuis", excludeEntityLabelsStore);

  const excludeSelectedMainCreditorOption: OptionItem[] =
    exclude.main_creditor_cui ? [{ id: exclude.main_creditor_cui, label: excludeEntityLabelsStore.map(exclude.main_creditor_cui) }] : [];
  const setExcludeMainCreditorCui = createExcludeValueUpdater("main_creditor_cui");

  const excludeSelectedUatOptions: OptionItem<string>[] =
    exclude.uat_ids?.map((id: string) => ({ id: String(id), label: excludeUatLabelsStore.map(String(id)) })) ?? [];
  const setExcludeSelectedUatOptions = createExcludeListUpdater("uat_ids", excludeUatLabelsStore);

  const excludeSelectedEconomicClassificationOptions: OptionItem[] =
    exclude.economic_codes?.map((id: string) => ({ id, label: excludeEconomicClassificationLabelsStore.map(id) })) ?? [];
  const setExcludeSelectedEconomicClassificationOptions = createExcludeListUpdater("economic_codes", excludeEconomicClassificationLabelsStore);

  const excludeSelectedFunctionalClassificationOptions: OptionItem[] =
    exclude.functional_codes?.map((id: string) => ({ id, label: excludeFunctionalClassificationLabelsStore.map(id) })) ?? [];
  const setExcludeSelectedFunctionalClassificationOptions = createExcludeListUpdater("functional_codes", excludeFunctionalClassificationLabelsStore);

  const excludeSelectedEntityTypeOptions: OptionItem[] =
    exclude.entity_types?.map((id: string) => ({ id, label: entityTypeLabelsStore.map(id) })) ?? [];
  const setExcludeSelectedEntityTypeOptions = createExcludeListUpdater("entity_types", entityTypeLabelsStore);

  const excludeSelectedCountyOptions: OptionItem<string>[] =
    exclude.county_codes?.map((code: string) => ({ id: code, label: String(code) })) ?? [];
  const setExcludeSelectedCountyOptions = createExcludeListUpdater("county_codes");

  const excludeSelectedBudgetSectorOptions: OptionItem[] =
    exclude.budget_sector_ids?.map((id: string) => ({ id, label: excludeBudgetSectorLabelsStore.map(id) })) ?? [];
  const setExcludeSelectedBudgetSectorOptions = createExcludeListUpdater("budget_sector_ids", excludeBudgetSectorLabelsStore);

  const excludeSelectedFundingSourceOptions: OptionItem[] =
    exclude.funding_source_ids?.map((id: string) => ({ id, label: excludeFundingSourceLabelsStore.map(id) })) ?? [];
  const setExcludeSelectedFundingSourceOptions = createExcludeListUpdater("funding_source_ids", excludeFundingSourceLabelsStore);

  const excludeSelectedEconomicPrefixesOptions = exclude.economic_prefixes ?? [];
  const setExcludeSelectedEconomicPrefixesOptions = createExcludePrefixListUpdater("economic_prefixes");

  const excludeSelectedFunctionalPrefixesOptions = exclude.functional_prefixes ?? [];
  const setExcludeSelectedFunctionalPrefixesOptions = createExcludePrefixListUpdater("functional_prefixes");

  const clearAllFilters = () => {
    applyChanges((draft) => {
      if (draft.type === "commitments-analytics") {
        draft.filter = {
          normalization: "total",
          currency: userCurrency,
          inflation_adjusted: userInflationAdjusted,
          report_type: "PRINCIPAL_AGGREGATED",
          exclude: {
            economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
          },
        } as CommitmentsSeriesConfiguration["filter"];
        draft.metric = "CREDITE_ANGAJAMENT";
        return;
      }
      draft.filter = {
        account_category: "ch",
        normalization: "total",
        currency: userCurrency,
        inflation_adjusted: userInflationAdjusted,
        report_type: "Executie bugetara agregata la nivel de ordonator principal",
        exclude: undefined,
      } as SeriesConfiguration["filter"];
    });
  };

  const clearAllExcludeFilters = () => {
    applyChanges((draft) => {
      draft.filter.exclude = undefined;
    });
  };

  const totalSelectedFilters =
    (filter.report_period ? 1 : 0) +
    (filter.entity_cuis?.length ?? 0) +
    (filter.main_creditor_cui ? 1 : 0) +
    (filter.uat_ids?.length ?? 0) +
    (filter.county_codes?.length ?? 0) +
    (filter.economic_codes?.length ?? 0) +
    (filter.functional_codes?.length ?? 0) +
    (filter.budget_sector_ids?.length ?? 0) +
    (filter.funding_source_ids?.length ?? 0) +
    (!isCommitmentsSeries && filter.account_category ? 1 : 0) +
    (filter.entity_types?.length ?? 0) +
    (filter.aggregate_min_amount != null ? 1 : 0) +
    (filter.aggregate_max_amount != null ? 1 : 0) +
    (filter.item_min_amount != null ? 1 : 0) +
    (filter.item_max_amount != null ? 1 : 0) +
    (filter.min_population != null ? 1 : 0) +
    (filter.max_population != null ? 1 : 0) +
    (filter.report_type ? 1 : 0) +
    (filter.normalization ? 1 : 0) +
    (filter.is_uat !== undefined ? 1 : 0) +
    (filter.functional_prefixes?.length ?? 0) +
    (filter.economic_prefixes?.length ?? 0);

  const totalExcludeFilters =
    (exclude.entity_cuis?.length ?? 0) +
    (exclude.main_creditor_cui ? 1 : 0) +
    (exclude.uat_ids?.length ?? 0) +
    (exclude.county_codes?.length ?? 0) +
    (exclude.economic_codes?.length ?? 0) +
    (exclude.functional_codes?.length ?? 0) +
    (exclude.budget_sector_ids?.length ?? 0) +
    (exclude.funding_source_ids?.length ?? 0) +
    (exclude.entity_types?.length ?? 0) +
    (exclude.functional_prefixes?.length ?? 0) +
    (exclude.economic_prefixes?.length ?? 0);

  useEffect(() => {
    if (totalExcludeFilters > 0) {
      setExcludeValue((prev) => (prev === "" ? "exclude" : prev));
      return;
    }
    setExcludeValue("");
  }, [totalExcludeFilters]);

  const accordionValue = excludeValue;

  const handleClearReportType = () =>
    setReportType(isCommitmentsSeries ? "PRINCIPAL_AGGREGATED" : "Executie bugetara agregata la nivel de ordonator principal");
  const handleClearNormalization = () => setNormalization("total");
  const handleClearCurrency = () => setCurrency(userCurrency);
  const handleClearInflation = () => setInflationAdjusted(userInflationAdjusted);

  const handleClearFlag = (option: OptionItem) => {
    if (option.id === "isUat") {
      setIsUat(undefined);
    }
  };

  const handleClearAllFlags = () => {
    setIsUat(undefined);
  };

  const handleRemovePeriodTag = (tagToRemove: OptionItem) => {
    applyChanges((draft) => {
      const currentPeriod = draft.filter.report_period;
      if (!currentPeriod) {
        return;
      }

      const { selection, ...rest } = currentPeriod;

      if (selection.dates) {
        const newDates = selection.dates.filter((date) => date !== tagToRemove.id);
        draft.filter.report_period =
          newDates.length > 0 ? { ...rest, selection: { dates: newDates } } : undefined;
      } else if (selection.interval) {
        draft.filter.report_period = undefined;
      }
    });
  };

  const normalizationUnit = getNormalizationUnit({
    normalization: filter.normalization as any,
    currency: (filter.currency ?? userCurrency) as any,
    show_period_growth: filter.show_period_growth,
  });
  const isPercentGdp = filter.normalization === "percent_gdp";

  return (
    <Card className={cn("flex flex-col", className)} role="region" aria-labelledby="series-filters-title">
      <CardHeader className="py-4 px-6 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold" id="series-filters-title">
            <Trans>Filters</Trans>
          </CardTitle>
          {(totalSelectedFilters > 0 || totalExcludeFilters > 0) && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-sm">
              <XCircle className="w-4 h-4 mr-1" aria-hidden="true" />
              <Trans>Clear all</Trans> ({totalSelectedFilters + totalExcludeFilters})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col p-0 overflow-y-auto">
        {!isCommitmentsSeries && (
          <FilterRadioContainer
            title={t`Revenues/Expenses`}
            icon={<ArrowUpDown className="w-4 h-4" aria-hidden="true" />}
            selectedOption={selectedAccountTypeOption}
            onClear={() => setSelectedAccountTypeOption("ch")}
          >
            <AccountCategoryRadio
              accountCategory={filter.account_category}
              setAccountCategory={setSelectedAccountTypeOption}
            />
          </FilterRadioContainer>
        )}
        {isCommitmentsSeries && (
          <FilterRadioContainer
            title={t`Metric`}
            icon={<TrendingUp className="w-4 h-4" aria-hidden="true" />}
            selectedOption={commitmentsMetricOption}
            onClear={() => setCommitmentsMetric("CREDITE_ANGAJAMENT")}
          >
            <RadioGroupButtons
              value={commitmentsMetric}
              onChange={(value) => {
                if (value === undefined) return;
                setCommitmentsMetric(value as any);
              }}
              options={commitmentsMetricOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </FilterRadioContainer>
        )}
        <FilterRadioContainer
          title={t`Normalization`}
          icon={<ArrowUpDown className="w-4 h-4" aria-hidden="true" />}
          selectedOption={normalizationOption}
          onClear={handleClearNormalization}
        >
          <NormalizationFilter normalization={normalization} setNormalization={setNormalization} />
        </FilterRadioContainer>
        <FilterRadioContainer
          title={t`Currency`}
          icon={<EuroIcon className="w-4 h-4" aria-hidden="true" />}
          selectedOption={currencyOption}
          onClear={handleClearCurrency}
        >
          <div className={cn(isPercentGdp && "pointer-events-none opacity-50")}>
            <RadioGroupButtons
              value={effectiveCurrency}
              onChange={(value) => {
                if (value === undefined) return;
                setCurrency(value as any);
              }}
              options={[
                { value: "RON", label: t`RON` },
                { value: "EUR", label: t`EUR` },
                { value: "USD", label: t`USD` },
              ]}
            />
            {isPercentGdp && (
              <p className="mt-2 text-xs text-muted-foreground">
                <Trans>Currency is ignored for % of GDP.</Trans>
              </p>
            )}
          </div>
        </FilterRadioContainer>
        <FilterRadioContainer
          title={t`Inflation Adjustment`}
          icon={<SlidersHorizontal className="w-4 h-4" aria-hidden="true" />}
          selectedOption={inflationOption}
          onClear={handleClearInflation}
        >
          <div className={cn(isPercentGdp && "pointer-events-none opacity-50")}>
            <RadioGroupButtons
              value={typeof filter.inflation_adjusted === "boolean" ? filter.inflation_adjusted : userInflationAdjusted}
              onChange={(value) => {
                if (value === undefined) return;
                setInflationAdjusted(value as any);
              }}
              options={[
                { value: false, label: t`Nominal` },
                { value: true, label: t`Real (2024 prices)` },
              ]}
            />
            {isPercentGdp && (
              <p className="mt-2 text-xs text-muted-foreground">
                <Trans>Inflation adjustment is ignored for % of GDP.</Trans>
              </p>
            )}
          </div>
        </FilterRadioContainer>
        <FilterContainer
          title={t`Period Growth`}
          icon={<TrendingUp className="w-4 h-4" aria-hidden="true" />}
          selectedOptions={growthOptions}
          onClearOption={() => setShowPeriodGrowth(undefined)}
          onClearAll={() => setShowPeriodGrowth(undefined)}
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id={`series-growth-${series.id}`}
              checked={showPeriodGrowth}
              onCheckedChange={(checked) => setShowPeriodGrowth(Boolean(checked))}
            />
            <Label htmlFor={`series-growth-${series.id}`} className="text-sm cursor-pointer">
              <Trans>Show growth (%)</Trans>
            </Label>
          </div>
        </FilterContainer>
        <FilterContainer
          title={t`Period`}
          icon={<Calendar className="w-4 h-4" aria-hidden="true" />}
          selectedOptions={periodTags}
          onClearOption={handleRemovePeriodTag}
          onClearAll={() => setPeriod(undefined)}
        >
          <PeriodFilter
            value={filter.report_period as any}
            onChange={setPeriod}
            allowedPeriodTypes={allowedPeriodTypes}
          />
        </FilterContainer>
        <FilterListContainer
          title={t`Entities`}
          icon={<Building2 className="w-4 h-4" aria-hidden="true" />}
          listComponent={EntityList}
          selected={selectedEntityOptions}
          setSelected={setSelectedEntityOptions}
        />
        <FilterContainer
          title={t`Main Creditor`}
          icon={<Building2 className="w-4 h-4" aria-hidden="true" />}
          selectedOptions={selectedMainCreditorOption}
          onClearOption={() => setMainCreditorCui(undefined)}
          onClearAll={() => setMainCreditorCui(undefined)}
        >
          <EntityList
            selectedOptions={selectedMainCreditorOption}
            toggleSelect={(option) => setMainCreditorCui(String(option.id))}
            pageSize={100}
          />
        </FilterContainer>
        <FilterListContainer
          title={t`UAT`}
          icon={<MapPin className="w-4 h-4" aria-hidden="true" />}
          listComponent={UatList}
          selected={selectedUatOptions}
          setSelected={setSelectedUatOptions}
        />
        <FilterListContainer
          title={t`County`}
          icon={<MapPinned className="w-4 h-4" aria-hidden="true" />}
          listComponent={CountyList}
          selected={selectedCountyOptions}
          setSelected={setSelectedCountyOptions}
        />
        <FilterListContainer
          title={t`Entity Type`}
          icon={<Building2 className="w-4 h-4" aria-hidden="true" />}
          listComponent={EntityTypeList}
          selected={selectedEntityTypeOptions}
          setSelected={setSelectedEntityTypeOptions}
        />
        <FilterListContainer
          title={t`Functional Classification`}
          icon={<ChartBar className="w-4 h-4" aria-hidden="true" />}
          listComponent={FunctionalClassificationList}
          selected={selectedFunctionalClassificationOptions}
          setSelected={setSelectedFunctionalClassificationOptions}
        />
        <FilterPrefixContainer
          title={t`Functional Prefixes`}
          icon={<ChartBar className="w-4 h-4" aria-hidden="true" />}
          prefixComponent={PrefixFilter}
          value={selectedFunctionalPrefixesOptions}
          onValueChange={setSelectedFunctionalPrefixesOptions}
          mapPrefixToLabel={getFunctionalPrefixLabel}
        />
        <FilterListContainer
          title={t`Economic Classification`}
          icon={<Tags className="w-4 h-4" aria-hidden="true" />}
          listComponent={EconomicClassificationList}
          selected={selectedEconomicClassificationOptions}
          setSelected={setSelectedEconomicClassificationOptions}
        />
        <FilterPrefixContainer
          title={t`Economic Prefixes`}
          icon={<Tags className="w-4 h-4" aria-hidden="true" />}
          prefixComponent={PrefixFilter}
          value={selectedEconomicPrefixesOptions}
          onValueChange={setSelectedEconomicPrefixesOptions}
          mapPrefixToLabel={getEconomicPrefixLabel}
        />
        <FilterListContainer
          title={t`Budget Sector`}
          icon={<Building2 className="w-4 h-4" aria-hidden="true" />}
          listComponent={BudgetSectorList}
          selected={selectedBudgetSectorOptions}
          setSelected={setSelectedBudgetSectorOptions}
        />
        <FilterListContainer
          title={t`Funding Source`}
          icon={<EuroIcon className="w-4 h-4" aria-hidden="true" />}
          listComponent={FundingSourceList}
          selected={selectedFundingSourceOptions}
          setSelected={setSelectedFundingSourceOptions}
        />
        <FilterRadioContainer
          title={t`Report Type`}
          icon={<ArrowUpDown className="w-4 h-4" aria-hidden="true" />}
          selectedOption={reportTypeOption}
          onClear={handleClearReportType}
        >
          {isCommitmentsSeries ? (
            <RadioGroupButtons
              value={reportType}
              onChange={(value) => {
                if (value === undefined) return;
                setReportType(value as any);
              }}
              options={COMMITMENTS_REPORT_TYPE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          ) : (
            <ReportTypeFilter reportType={reportType} setReportType={setReportType} />
          )}
        </FilterRadioContainer>
        <FilterContainer
          title={t`Is UAT`}
          icon={<ArrowUpDown className="w-4 h-4" aria-hidden="true" />}
          selectedOptions={flagsOptions}
          onClearOption={handleClearFlag}
          onClearAll={handleClearAllFlags}
        >
          <IsUatFilter isUat={filter.is_uat} setIsUat={setIsUat} />
        </FilterContainer>
        <FilterRangeContainer
          title={t`Amount Range`}
          unit={normalizationUnit}
          icon={<SlidersHorizontal className="w-4 h-4" aria-hidden="true" />}
          rangeComponent={AmountRangeFilter}
          minValue={minAmount}
          onMinValueChange={setMinAmount}
          maxValue={maxAmount}
          onMaxValueChange={setMaxAmount}
          debounceMs={0}
        />
        <FilterRangeContainer
          title={t`Item Amount`}
          unit={normalizationUnit}
          icon={<SlidersHorizontal className="w-4 h-4" aria-hidden="true" />}
          rangeComponent={AmountRangeFilter}
          minValue={minItemAmount}
          onMinValueChange={setMinItemAmount}
          maxValue={maxItemAmount}
          onMaxValueChange={setMaxItemAmount}
          debounceMs={0}
        />
        <FilterRangeContainer
          title={t`Population Range`}
          unit={t`people`}
          icon={<Globe className="w-4 h-4" aria-hidden="true" />}
          rangeComponent={AmountRangeFilter}
          minValue={minPopulation}
          onMinValueChange={setMinPopulation}
          maxValue={maxPopulation}
          onMaxValueChange={setMaxPopulation}
          maxValueAllowed={100_000_000}
        />

        {/* Exclude Filters Section */}
        <div className="border-t mt-2">
          <Accordion type="single" collapsible value={accordionValue} onValueChange={setExcludeValue}>
            <AccordionItem value="exclude" className="border-none">
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <AccordionTrigger className="flex-1 text-sm font-medium hover:bg-muted/50 hover:no-underline px-0">
                  <div className="flex items-center gap-2">
                    <MinusCircle className="w-4 h-4 text-destructive" aria-hidden="true" />
                    <span>
                      <Trans>Exclude Filters</Trans>
                    </span>
                    {totalExcludeFilters > 0 && (
                      <Badge variant="destructive" className="rounded-full px-2 text-xs">
                        {totalExcludeFilters}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                {totalExcludeFilters > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllExcludeFilters();
                    }}
                    className="text-xs text-destructive hover:text-destructive h-auto py-1 px-2"
                  >
                    <XCircle className="w-3 h-3 mr-1" aria-hidden="true" />
                    <Trans>Clear all</Trans>
                  </Button>
                )}
              </div>
              <AccordionContent>
                <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-b">
                  <Trans>Filters marked as exclude will remove data matching these criteria from the results.</Trans>
                </div>

                {/* Exclude filter components - mirror the include filters */}
                <div className="bg-muted/10">
                  {/* Entities Exclude */}
                  <FilterListContainer
                    title={`${t`Exclude`} ${t`Entities`}`}
                    icon={<Building2 className="w-4 h-4 text-destructive" aria-hidden="true" />}
                    listComponent={EntityList}
                    selected={excludeSelectedEntityOptions}
                    setSelected={setExcludeSelectedEntityOptions}
                  />

                  {/* Main Creditor Exclude */}
                  <FilterContainer
                    title={`${t`Exclude`} ${t`Main Creditor`}`}
                    icon={<Building2 className="w-4 h-4 text-destructive" aria-hidden="true" />}
                    selectedOptions={excludeSelectedMainCreditorOption}
                    onClearOption={() => setExcludeMainCreditorCui(undefined)}
                    onClearAll={() => setExcludeMainCreditorCui(undefined)}
                  >
                    <EntityList
                      selectedOptions={excludeSelectedMainCreditorOption}
                      toggleSelect={(option) => setExcludeMainCreditorCui(String(option.id))}
                      pageSize={100}
                    />
                  </FilterContainer>

                  {/* UAT Exclude */}
                  <FilterListContainer
                    title={`${t`Exclude`} ${t`UAT`}`}
                    icon={<MapPin className="w-4 h-4 text-destructive" aria-hidden="true" />}
                    listComponent={UatList}
                    selected={excludeSelectedUatOptions}
                    setSelected={setExcludeSelectedUatOptions}
                  />

                  {/* County Exclude */}
                  <FilterListContainer
                    title={`${t`Exclude`} ${t`County`}`}
                    icon={<MapPinned className="w-4 h-4 text-destructive" aria-hidden="true" />}
                    listComponent={CountyList}
                    selected={excludeSelectedCountyOptions}
                    setSelected={setExcludeSelectedCountyOptions}
                  />

                  {/* Entity Type Exclude */}
                  <FilterListContainer
                    title={`${t`Exclude`} ${t`Entity Type`}`}
                    icon={<Building2 className="w-4 h-4 text-destructive" aria-hidden="true" />}
                    listComponent={EntityTypeList}
                    selected={excludeSelectedEntityTypeOptions}
                    setSelected={setExcludeSelectedEntityTypeOptions}
                  />

                  {/* Functional Classification Exclude */}
                  <FilterListContainer
                    title={`${t`Exclude`} ${t`Functional Classification`}`}
                    icon={<ChartBar className="w-4 h-4 text-destructive" aria-hidden="true" />}
                    listComponent={FunctionalClassificationList}
                    selected={excludeSelectedFunctionalClassificationOptions}
                    setSelected={setExcludeSelectedFunctionalClassificationOptions}
                  />

                  {/* Functional Prefixes Exclude */}
                  <FilterPrefixContainer
                    title={`${t`Exclude`} ${t`Functional Prefixes`}`}
                    icon={<ChartBar className="w-4 h-4 text-destructive" aria-hidden="true" />}
                    prefixComponent={PrefixFilter}
                    value={excludeSelectedFunctionalPrefixesOptions}
                    onValueChange={setExcludeSelectedFunctionalPrefixesOptions}
                    mapPrefixToLabel={getFunctionalPrefixLabel}
                  />

                  {/* Economic Classification Exclude */}
                  <FilterListContainer
                    title={`${t`Exclude`} ${t`Economic Classification`}`}
                    icon={<Tags className="w-4 h-4 text-destructive" aria-hidden="true" />}
                    listComponent={EconomicClassificationList}
                    selected={excludeSelectedEconomicClassificationOptions}
                    setSelected={setExcludeSelectedEconomicClassificationOptions}
                  />

                  {/* Economic Prefixes Exclude */}
                  <FilterPrefixContainer
                    title={`${t`Exclude`} ${t`Economic Prefixes`}`}
                    icon={<Tags className="w-4 h-4 text-destructive" aria-hidden="true" />}
                    prefixComponent={PrefixFilter}
                    value={excludeSelectedEconomicPrefixesOptions}
                    onValueChange={setExcludeSelectedEconomicPrefixesOptions}
                    mapPrefixToLabel={getEconomicPrefixLabel}
                  />

                  {/* Budget Sector Exclude */}
                  <FilterListContainer
                    title={`${t`Exclude`} ${t`Budget Sector`}`}
                    icon={<Building2 className="w-4 h-4 text-destructive" aria-hidden="true" />}
                    listComponent={BudgetSectorList}
                    selected={excludeSelectedBudgetSectorOptions}
                    setSelected={setExcludeSelectedBudgetSectorOptions}
                  />

                  {/* Funding Source Exclude */}
                  <FilterListContainer
                    title={`${t`Exclude`} ${t`Funding Source`}`}
                    icon={<EuroIcon className="w-4 h-4 text-destructive" aria-hidden="true" />}
                    listComponent={FundingSourceList}
                    selected={excludeSelectedFundingSourceOptions}
                    setSelected={setExcludeSelectedFundingSourceOptions}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
