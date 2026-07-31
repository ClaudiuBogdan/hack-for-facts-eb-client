// src/lib/chart-filter-utils.ts

import { useAccountCategoryLabel, useBudgetSectorLabel, useEconomicClassificationLabel, useEntityLabel, useEntityTagLabel, useEntityTypeLabel, useFunctionalClassificationLabel, useFundingSourceLabel, useUatLabel } from "@/hooks/filters/useFilterLabels";
import { AnalyticsFilterType, Chart, CommitmentsSeriesConfiguration, Series, SeriesConfiguration } from "@/schemas/charts";
import { ReportPeriodInput } from "@/schemas/reporting";
import { t } from "@lingui/core/macro";
import { getClassificationName } from "@/lib/classifications";
import { getEconomicChapterName, getEconomicSubchapterName } from "@/lib/economic-classifications";

// Public helpers to map functional/economic prefix codes to human-readable labels
export const getFunctionalPrefixLabel = (prefix: string): string => {
  const normalized = prefix.trim().replace(/\.$/, "");
  const name = getClassificationName(normalized);
  return name ? `${normalized} - ${name}` : prefix;
};

export const getEconomicPrefixLabel = (prefix: string): string => {
  const normalized = prefix.trim().replace(/\.$/, "");
  const parts = normalized.split(".");
  let name: string | undefined;
  if (parts.length === 1) {
    name = getEconomicChapterName(normalized);
  } else if (parts.length === 2) {
    name = getEconomicSubchapterName(`${parts[0]}.${parts[1]}`);
  }
  // TODO: add cofog3 when mapping is available
  return name ? `${normalized} - ${name}` : prefix;
};

export type FiltersWithLabels = Pick<AnalyticsFilterType, "entity_cuis" | "economic_codes" | "functional_codes" | "budget_sector_ids" | "funding_source_ids" | "uat_ids" | "functional_prefixes" | "economic_prefixes"> & {
  main_creditor_cui?: string;
};

export const useFilterKeyLabel = () => {
  // Display names for filter keys
  const FILTER_DISPLAY_NAME: Record<string, string> = {
    entity_cuis: t`Entity`,
    main_creditor_cui: t`Main creditor`,
    uat_ids: t`UAT`,
    economic_codes: t`Economic classification`,
    functional_codes: t`Functional classification`,
    budget_sector_ids: t`Budget sector`,
    funding_source_ids: t`Funding source`,
    account_category: t`Account category`,
    report_type: t`Report type`,
    is_uat: t`Is UAT`,
    functional_prefixes: t`Functional prefix`,
    economic_prefixes: t`Economic prefix`,
    entity_types: t`Entity type`,
    tags: t`Tags`,
    normalization: t`Normalization`,
    report_period: t`Period`,
  };

  return (key: string) => FILTER_DISPLAY_NAME[key] ?? key;
};

export const useMapFilterValue = (filter: FiltersWithLabels) => {
  const entityLabelsStore = useEntityLabel(filter.entity_cuis ?? []);
  const mainCreditorLabelsStore = useEntityLabel(filter.main_creditor_cui ? [filter.main_creditor_cui] : []);
  const economicCodesStore = useEconomicClassificationLabel(filter.economic_codes ?? []);
  const budgetSectorLabelsStore = useBudgetSectorLabel(filter.budget_sector_ids ?? []);
  const fundingSourceLabelsStore = useFundingSourceLabel(filter.funding_source_ids ?? []);
  const functionalCodesStore = useFunctionalClassificationLabel(filter.functional_codes ?? []);
  const uatLabelsStore = useUatLabel(filter.uat_ids ?? []);
  const entityTypesStore = useEntityTypeLabel();
  const entityTagLabelsStore = useEntityTagLabel();
  const accountCategoryLabelsStore = useAccountCategoryLabel();

  
  
  return {
    mapValueToLabel: (key: string, value: unknown) => {
      switch (key) {
        case "account_category":
          return accountCategoryLabelsStore.map(value as string);
        case "main_creditor_cui":
          return mainCreditorLabelsStore.map(value as string);
        case "economic_codes":
          return economicCodesStore.map(value as string);
        case "entity_cuis":
          return entityLabelsStore.map(value as string);
        case "budget_sector_ids":
          return budgetSectorLabelsStore.map(value as string);
        case "funding_source_ids":
          return fundingSourceLabelsStore.map(value as string);
        case "functional_codes":
          return functionalCodesStore.map(value as string);
        case "functional_prefixes": {
          if (Array.isArray(value)) return value.map(v => getFunctionalPrefixLabel(String(v))).join(", ");
          return getFunctionalPrefixLabel(String(value));
        }
        case "economic_prefixes": {
          if (Array.isArray(value)) return value.map(v => getEconomicPrefixLabel(String(v))).join(", ");
          return getEconomicPrefixLabel(String(value));
        }
        case "uat_ids":
          return uatLabelsStore.map(value as string);
        case "entity_types":
          return entityTypesStore.map(value as string);
        case "tags": {
          if (Array.isArray(value)) return value.map(v => entityTagLabelsStore.map(String(v))).join(", ");
          return entityTagLabelsStore.map(String(value));
        }
        case "report_period": {
            const period = value as ReportPeriodInput;
            if (period.selection.dates) return `${period.selection.dates.length} dates`;
            if (period.selection.interval) return `${period.selection.interval.start} - ${period.selection.interval.end}`;
            return ''
            }
        default:
          return String(value);
      }
    }
  }
};

export const createDataDiscoveryUrl = (key: string, value: unknown): string => {
  return `/data-discovery?${key}=${value}`;
};
export const createEntityUrl = (cui: string): string => {
  return `/entities/${cui}`;
};
export const isEntityCui = (key: string): boolean => {
  return key === "cui";
};
export const isInteractiveFilter = (key: string): boolean => {
  const interactiveKeys = [
    'cui', // TODO: add other interactive keys
    // "economic_codes",
    // "functional_codes",
    // "uat_ids",
    // "entity_types",
    // "budget_sector_ids",
    // "funding_source_ids",
    // "economic_prefixes",
    // "functional_prefixes",
  ];
  return interactiveKeys.includes(key);
};

export function getSortOrder(keyA: keyof AnalyticsFilterType, keyB: keyof AnalyticsFilterType) {
  const ORDER: ReadonlyArray<keyof AnalyticsFilterType> = [
    "account_category",
    "report_period",
    "entity_cuis",
    "main_creditor_cui",
    "entity_types",
    "uat_ids",
    "functional_prefixes",
    "economic_prefixes",
    "functional_codes",
    "economic_codes",
    "budget_sector_ids",
    "funding_source_ids",
    "is_uat",
    "aggregate_min_amount",
    "aggregate_max_amount",
    "report_type",
    "report_period",
  ];
  const indexA = ORDER.indexOf(keyA);
  const indexB = ORDER.indexOf(keyB);
  if (indexA === -1 && indexB === -1) return 0;
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
}

// ============================================================================
// Bulk filter edit helpers
// ============================================================================

export type ReplaceableFilterKey =
  | "entity_cuis"
  | "uat_ids"
  | "economic_codes"
  | "functional_codes"
  | "budget_sector_ids"
  | "funding_source_ids"
  | "entity_types"
  | "account_category"
  | "report_type"
  | "functional_prefixes"
  | "economic_prefixes"
  | "is_uat"
  | "report_period";

// Convenience: list of replaceable keys for UIs
export const REPLACEABLE_FILTER_KEYS: ReadonlyArray<ReplaceableFilterKey> = [
  "entity_cuis",
  "entity_types",
  "uat_ids",
  "functional_codes",
  "economic_codes",
  "budget_sector_ids",
  "funding_source_ids",
  "functional_prefixes",
  "economic_prefixes",
  "account_category",
  "report_type",
  "is_uat",
  "report_period",
];

type FilterableSeries = SeriesConfiguration | CommitmentsSeriesConfiguration;

const isFilterableSeries = (series: Series): series is FilterableSeries =>
  series.type === "line-items-aggregated-yearly" || series.type === "commitments-analytics";

// Coerce filter values to the correct type. Some keys are booleans, and need to be parsed from strings.
const parseFilterValueForKey = (key: ReplaceableFilterKey, value: string): unknown => {
  if (key === "is_uat") {
    const lower = value.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
    return undefined;
  }
  return value;
};

export function collectUniqueFilterValues(chart: Chart, key: ReplaceableFilterKey): string[] {
  const values = new Set<string>();
  for (const s of chart.series) {
    if (!isFilterableSeries(s)) continue;
    const v = (s.filter as Record<string, unknown>)[key];
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const item of v) if (item != null) values.add(String(item));
    } else {
      values.add(String(v));
    }
  }
  return Array.from(values);
}

export function countPotentialReplacements(chart: Chart, key: ReplaceableFilterKey, fromValue: string): number {
  let count = 0;
  for (const s of chart.series) {
    if (!isFilterableSeries(s)) continue;
    const v = (s.filter as Record<string, unknown>)[key];
    if (v == null) continue;
    if (Array.isArray(v)) {
      count += v.filter((x) => String(x) === fromValue).length;
    } else if (String(v) === fromValue) {
      count += 1;
    }
  }
  return count;
}

export function replaceFilterValue(chart: Chart, key: ReplaceableFilterKey, fromValue: string, toValue: string): Chart {
  const replacementValue = parseFilterValueForKey(key, toValue);
  const nextSeries = chart.series.map((s): Series => {
    if (!isFilterableSeries(s)) return s;
    const f = { ...(s.filter as Record<string, unknown>) };
    const v = f[key];
    if (v == null) return s;

    if (Array.isArray(v)) {
      const replaced = (v as unknown[])
        .map((x) => (String(x) === fromValue ? (replacementValue as never) : x))
        .filter((x) => x !== undefined);
      return { ...s, filter: { ...f, [key]: replaced } as typeof s.filter } as Series;
    }

    if (String(v) === fromValue) {
      return { ...s, filter: { ...f, [key]: replacementValue } as typeof s.filter } as Series;
    }

    return s;
  });

  return {
    ...chart,
    series: nextSeries,
    updatedAt: new Date().toISOString(),
  };
}
