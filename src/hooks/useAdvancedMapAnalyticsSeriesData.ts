import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Currency } from '@/schemas/charts';
import type {
  AdvancedMapAnalyticsValueFilterRule,
  MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import { fetchGroupedSeriesData } from '@/lib/api/map-series';
import { calculateMapSeriesValues } from '@/lib/map-series/calculation';
import { parseGroupedSeriesWideCsv } from '@/lib/map-series/csv';
import {
  buildRemoteGroupedSeriesState,
  resolveSeriesUnitOverride,
} from '@/lib/map-series/grouped-series-request';
import { applyAdvancedMapAnalyticsValueFilters } from '@/lib/map-series/value-filters';
import type {
  GroupedSeriesDataResponse,
  MapSeriesVectorCache,
  MapSeriesWarning,
} from '@/lib/map-series/interfaces';
import { convertDaysToMs } from '@/lib/utils';

const URL_SEARCH_WARNING_THRESHOLD = 1800;
const isBrowser = typeof window !== 'undefined';

interface UseAdvancedMapAnalyticsSeriesDataParams {
  series: MapSupportedSeries[];
  activeSeriesId?: string;
  defaultCurrency: Currency;
  defaultInflationAdjusted: boolean;
  urlSearchLength?: number;
  enabled?: boolean;
  valueFilterRules?: AdvancedMapAnalyticsValueFilterRule[];
  localValuesBySeriesId?: MapSeriesVectorCache;
  localUnitsBySeriesId?: Map<string, string | undefined>;
  bundledGroupedSeriesData?: GroupedSeriesDataResponse;
  bundledRemoteBaseSeriesHash?: string;
}

interface AdvancedMapAnalyticsSeriesDataResult {
  valuesBySeriesId: MapSeriesVectorCache;
  unitsBySeriesId: Map<string, string | undefined>;
  warnings: MapSeriesWarning[];
  matchedSirutaCodes?: Set<string>;
  activeSeriesId?: string;
  activeValues?: Map<string, number | undefined>;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

export function useAdvancedMapAnalyticsSeriesData(
  params: UseAdvancedMapAnalyticsSeriesDataParams
): AdvancedMapAnalyticsSeriesDataResult {
  const normalizedSeries = useMemo(
    () => params.series.map((series) => normalizeSeriesDefaults(series)),
    [params.series]
  );

  const normalizedEnabledSeries = useMemo(
    () => normalizedSeries.filter((series) => series.enabled),
    [normalizedSeries]
  );

  const resolvedActiveSeriesId = useMemo(() => {
    if (!params.activeSeriesId) {
      return undefined;
    }

    return normalizedEnabledSeries.some((series) => series.id === params.activeSeriesId)
      ? params.activeSeriesId
      : undefined;
  }, [normalizedEnabledSeries, params.activeSeriesId]);

  const relevantWarningSeriesIds = useMemo(() => {
    const scopedSeriesIds = new Set(normalizedEnabledSeries.map((series) => series.id));

    for (const rule of params.valueFilterRules ?? []) {
      if (!rule.enabled) {
        continue;
      }

      if (rule.seriesRef.mode === 'series') {
        scopedSeriesIds.add(rule.seriesRef.seriesId);
        continue;
      }

      if (resolvedActiveSeriesId) {
        scopedSeriesIds.add(resolvedActiveSeriesId);
      }
    }

    return scopedSeriesIds;
  }, [normalizedEnabledSeries, params.valueFilterRules, resolvedActiveSeriesId]);

  const remoteGroupedSeriesState = useMemo(
    () => buildRemoteGroupedSeriesState(normalizedSeries),
    [normalizedSeries]
  );
  const normalizedBaseSeries = remoteGroupedSeriesState.baseSeries;
  const normalizedRemoteBaseSeries = remoteGroupedSeriesState.remoteBaseSeries;
  const baseSeriesHash = remoteGroupedSeriesState.remoteBaseSeriesHash;
  const useBundledGroupedSeriesData =
    params.bundledGroupedSeriesData !== undefined &&
    params.bundledRemoteBaseSeriesHash === baseSeriesHash;

  const groupedDataQuery = useQuery<GroupedSeriesDataResponse, Error>({
    queryKey: ['advanced-map-analytics-series-data', baseSeriesHash],
    initialData: useBundledGroupedSeriesData ? params.bundledGroupedSeriesData : undefined,
    initialDataUpdatedAt: useBundledGroupedSeriesData ? Date.now() : undefined,
    queryFn: async () => {
      if (normalizedRemoteBaseSeries.length === 0) {
        return {
          manifest: {
            generated_at: new Date().toISOString(),
            format: 'wide_matrix_v1',
            granularity: 'UAT',
            series: [],
          },
          payload: {
            mime: 'text/csv',
            compression: 'none',
            data: 'siruta_code',
          },
          warnings: [],
        };
      }

      return fetchGroupedSeriesData({
        granularity: 'UAT',
        series: normalizedRemoteBaseSeries,
      });
    },
    staleTime: convertDaysToMs(1),
    gcTime: convertDaysToMs(3),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    enabled: isBrowser && (params.enabled ?? true),
  });

  const calculated = useMemo(() => {
    const groupedResponse = groupedDataQuery.data;
    const baseVectors: MapSeriesVectorCache = new Map();
    const baseUnits = new Map<string, string | undefined>();
    const warnings: MapSeriesWarning[] = [];

    for (const baseSeries of normalizedBaseSeries) {
      baseVectors.set(baseSeries.id, new Map());
      baseUnits.set(baseSeries.id, resolveSeriesUnitOverride(baseSeries));
    }

    if (groupedResponse) {
      for (const manifestSeries of groupedResponse.manifest.series) {
        if (!baseVectors.has(manifestSeries.series_id)) {
          baseVectors.set(manifestSeries.series_id, new Map());
        }

        const manifestUnit = normalizeUnit(manifestSeries.unit);
        if (manifestUnit !== undefined || !baseUnits.has(manifestSeries.series_id)) {
          baseUnits.set(manifestSeries.series_id, manifestUnit);
        }
      }

      const manifestSeriesIds = groupedResponse.manifest.series.map((entry) => entry.series_id);
      const parsedPayload = parseGroupedSeriesWideCsv(
        groupedResponse.payload.data,
        manifestSeriesIds
      );
      for (const [seriesId, vector] of parsedPayload.valuesBySeriesId.entries()) {
        if (!baseVectors.has(seriesId)) {
          baseVectors.set(seriesId, new Map());
        }

        const targetVector = baseVectors.get(seriesId);
        if (targetVector === undefined) {
          continue;
        }

        for (const [sirutaCode, value] of vector.entries()) {
          targetVector.set(sirutaCode, value);
        }
      }

      if (parsedPayload.warnings.length > 0) {
        warnings.push(...parsedPayload.warnings);
      }

      if (groupedResponse.warnings?.length) {
        warnings.push(...groupedResponse.warnings);
      }
    }

    if (params.localValuesBySeriesId?.size) {
      for (const [seriesId, localVector] of params.localValuesBySeriesId.entries()) {
        if (!baseVectors.has(seriesId)) {
          baseVectors.set(seriesId, new Map());
        }

        const targetVector = baseVectors.get(seriesId);
        if (targetVector === undefined) {
          continue;
        }

        targetVector.clear();
        for (const [sirutaCode, value] of localVector.entries()) {
          targetVector.set(sirutaCode, value);
        }
      }
    }

    if (params.localUnitsBySeriesId?.size) {
      for (const [seriesId, localUnit] of params.localUnitsBySeriesId.entries()) {
        const normalizedLocalUnit = normalizeUnit(localUnit);
        if (normalizedLocalUnit !== undefined || !baseUnits.has(seriesId)) {
          baseUnits.set(seriesId, normalizedLocalUnit);
        }
      }
    }

    const calculationResult = calculateMapSeriesValues({
      series: normalizedSeries,
      baseValuesBySeriesId: baseVectors,
      unitsBySeriesId: baseUnits,
    });

    const displayValuesBySeriesId: MapSeriesVectorCache = new Map();
    for (const series of normalizedEnabledSeries) {
      displayValuesBySeriesId.set(
        series.id,
        new Map(calculationResult.valuesBySeriesId.get(series.id) ?? [])
      );
    }

    const valueFilterResult = applyAdvancedMapAnalyticsValueFilters({
      allValuesBySeriesId: calculationResult.valuesBySeriesId,
      displayValuesBySeriesId,
      activeSeriesId: resolvedActiveSeriesId,
      rules: params.valueFilterRules ?? [],
    });

    const scopedCalculationWarnings = calculationResult.warnings.filter((warning) =>
      isWarningRelevantToSeriesScope(warning, relevantWarningSeriesIds)
    );

    warnings.push(...scopedCalculationWarnings);
    warnings.push(...valueFilterResult.warnings);

    if ((params.urlSearchLength ?? 0) > URL_SEARCH_WARNING_THRESHOLD) {
      warnings.push({
        type: 'url_budget',
        message: `URL search payload is large (${params.urlSearchLength} characters).` +
          ' Consider reducing the number of series/filters.',
      });
    }

    return {
      valuesBySeriesId: valueFilterResult.valuesBySeriesId,
      unitsBySeriesId: calculationResult.unitsBySeriesId,
      matchedSirutaCodes: valueFilterResult.matchedSirutaCodes,
      warnings,
    };
  }, [
    groupedDataQuery.data,
    params.localUnitsBySeriesId,
    params.localValuesBySeriesId,
    normalizedEnabledSeries,
    normalizedSeries,
    normalizedBaseSeries,
    params.valueFilterRules,
    relevantWarningSeriesIds,
    resolvedActiveSeriesId,
    params.urlSearchLength,
  ]);

  return {
    valuesBySeriesId: calculated.valuesBySeriesId,
    unitsBySeriesId: calculated.unitsBySeriesId,
    warnings: calculated.warnings,
    matchedSirutaCodes: calculated.matchedSirutaCodes,
    activeSeriesId: resolvedActiveSeriesId,
    activeValues: resolvedActiveSeriesId
      ? calculated.valuesBySeriesId.get(resolvedActiveSeriesId)
      : undefined,
    isLoading: groupedDataQuery.isLoading,
    isFetching: groupedDataQuery.isFetching,
    error: groupedDataQuery.error ?? null,
  };
}

function normalizeSeriesDefaults(
  series: MapSupportedSeries
): MapSupportedSeries {
  if (series.type !== 'line-items-aggregated-yearly' && series.type !== 'commitments-analytics') {
    return series;
  }

  const normalizationRaw = series.filter.normalization;
  const normalization =
    normalizationRaw === 'total_euro'
      ? 'total'
      : normalizationRaw === 'per_capita_euro'
        ? 'per_capita'
        : normalizationRaw;
  const useLegacyEuroCurrency =
    normalizationRaw === 'total_euro' || normalizationRaw === 'per_capita_euro';
  const forceInflationDisabled = normalization === 'percent_gdp';

  if (!useLegacyEuroCurrency && !forceInflationDisabled) {
    return series;
  }

  return {
    ...series,
    filter: {
      ...series.filter,
      ...(normalization !== undefined ? { normalization } : {}),
      ...(useLegacyEuroCurrency ? { currency: 'EUR' as const } : {}),
      ...(forceInflationDisabled ? { inflation_adjusted: false } : {}),
    },
  } as MapSupportedSeries;
}

function normalizeUnit(unit: string | undefined): string | undefined {
  if (typeof unit !== 'string') {
    return undefined;
  }

  const trimmed = unit.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isWarningRelevantToSeriesScope(
  warning: MapSeriesWarning,
  relevantSeriesIds: Set<string>
): boolean {
  if (warning.seriesId && relevantSeriesIds.has(warning.seriesId)) {
    return true;
  }

  if (warning.dependencySeriesId && relevantSeriesIds.has(warning.dependencySeriesId)) {
    return true;
  }

  return warning.seriesId === undefined && warning.dependencySeriesId === undefined;
}
