import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Currency } from '@/schemas/charts';
import type { MapBaseSeries, MapSupportedSeries } from '@/schemas/experimental-map';
import { fetchGroupedSeriesData } from '@/lib/api/map-series';
import { calculateMapSeriesValues } from '@/lib/map-series/calculation';
import { parseGroupedSeriesWideCsv } from '@/lib/map-series/csv';
import type {
  GroupedSeriesDataResponse,
  MapSeriesVectorCache,
  MapSeriesWarning,
} from '@/lib/map-series/interfaces';
import { convertDaysToMs, generateHash } from '@/lib/utils';

const URL_SEARCH_WARNING_THRESHOLD = 1800;
const isBrowser = typeof window !== 'undefined';

interface UseExperimentalMapSeriesDataParams {
  series: MapSupportedSeries[];
  activeSeriesId?: string;
  defaultCurrency: Currency;
  defaultInflationAdjusted: boolean;
  urlSearchLength?: number;
  enabled?: boolean;
  localValuesBySeriesId?: MapSeriesVectorCache;
  localUnitsBySeriesId?: Map<string, string | undefined>;
}

interface ExperimentalMapSeriesDataResult {
  valuesBySeriesId: MapSeriesVectorCache;
  unitsBySeriesId: Map<string, string | undefined>;
  warnings: MapSeriesWarning[];
  activeSeriesId?: string;
  activeValues?: Map<string, number | undefined>;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

export function useExperimentalMapSeriesData(
  params: UseExperimentalMapSeriesDataParams
): ExperimentalMapSeriesDataResult {
  const normalizedEnabledSeries = useMemo(
    () =>
      params.series
        .filter((series) => series.enabled)
        .map((series) =>
          normalizeSeriesDefaults(series, params.defaultCurrency, params.defaultInflationAdjusted)
        ),
    [params.defaultCurrency, params.defaultInflationAdjusted, params.series]
  );

  const normalizedBaseSeries = useMemo(
    () =>
      normalizedEnabledSeries
        .filter((series): series is MapBaseSeries => series.type !== 'aggregated-series-calculation')
        .sort((left, right) => left.id.localeCompare(right.id)),
    [normalizedEnabledSeries]
  );

  const normalizedRemoteBaseSeries = useMemo(
    () => normalizedBaseSeries.filter(isRemoteFetchSeries),
    [normalizedBaseSeries]
  );

  const baseSeriesHash = useMemo(
    () =>
      generateHash(
        stableSerialize(
          normalizedRemoteBaseSeries.map((series) => ({
            id: series.id,
            type: series.type,
            payload: normalizeSeriesForFetch(series),
          }))
        )
      ),
    [normalizedRemoteBaseSeries]
  );

  const groupedDataQuery = useQuery<GroupedSeriesDataResponse, Error>({
    queryKey: ['experimental-map-series-data', baseSeriesHash],
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

      const parsedPayload = parseGroupedSeriesWideCsv(groupedResponse.payload.data);
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
      series: normalizedEnabledSeries,
      baseValuesBySeriesId: baseVectors,
      unitsBySeriesId: baseUnits,
    });

    warnings.push(...calculationResult.warnings);

    if ((params.urlSearchLength ?? 0) > URL_SEARCH_WARNING_THRESHOLD) {
      warnings.push({
        type: 'url_budget',
        message: `URL search payload is large (${params.urlSearchLength} characters).` +
          ' Consider reducing the number of series/filters.',
      });
    }

    return {
      valuesBySeriesId: calculationResult.valuesBySeriesId,
      unitsBySeriesId: calculationResult.unitsBySeriesId,
      warnings,
    };
  }, [
    groupedDataQuery.data,
    params.localUnitsBySeriesId,
    params.localValuesBySeriesId,
    normalizedEnabledSeries,
    normalizedBaseSeries,
    params.urlSearchLength,
  ]);

  const resolvedActiveSeriesId = useMemo(() => {
    if (!params.activeSeriesId) {
      return undefined;
    }

    return normalizedEnabledSeries.some((series) => series.id === params.activeSeriesId)
      ? params.activeSeriesId
      : undefined;
  }, [normalizedEnabledSeries, params.activeSeriesId]);

  return {
    valuesBySeriesId: calculated.valuesBySeriesId,
    unitsBySeriesId: calculated.unitsBySeriesId,
    warnings: calculated.warnings,
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
  series: MapSupportedSeries,
  defaultCurrency: Currency,
  defaultInflationAdjusted: boolean
): MapSupportedSeries {
  if (series.type !== 'line-items-aggregated-yearly' && series.type !== 'commitments-analytics') {
    return series;
  }

  const normalizationRaw = series.filter.normalization ?? 'total';
  const normalization =
    normalizationRaw === 'total_euro'
      ? 'total'
      : normalizationRaw === 'per_capita_euro'
        ? 'per_capita'
        : normalizationRaw;

  const currency =
    normalizationRaw === 'total_euro' || normalizationRaw === 'per_capita_euro'
      ? 'EUR'
      : (series.filter.currency ?? defaultCurrency);

  const inflationAdjusted =
    normalization === 'percent_gdp'
      ? false
      : (series.filter.inflation_adjusted ?? defaultInflationAdjusted);

  return {
    ...series,
    filter: {
      ...series.filter,
      normalization,
      currency,
      inflation_adjusted: inflationAdjusted,
    },
  } as MapSupportedSeries;
}

function normalizeSeriesForFetch(
  series: Exclude<MapBaseSeries, { type: 'geojson-dataset-series' }>
): unknown {
  const unit = resolveSeriesUnitOverride(series);

  if (series.type === 'line-items-aggregated-yearly') {
    return {
      type: series.type,
      unit,
      filter: series.filter,
    };
  }

  if (series.type === 'commitments-analytics') {
    return {
      type: series.type,
      metric: series.metric,
      unit,
      filter: series.filter,
    };
  }

  return {
    type: series.type,
    unit,
    datasetCode: series.datasetCode,
    period: series.period,
    aggregation: series.aggregation,
    territoryCodes: series.territoryCodes,
    sirutaCodes: series.sirutaCodes,
    unitCodes: series.unitCodes,
    classificationSelections: series.classificationSelections,
    hasValue: series.hasValue,
  };
}

function isRemoteFetchSeries(
  series: MapBaseSeries
): series is Exclude<MapBaseSeries, { type: 'geojson-dataset-series' }> {
  return (
    series.type === 'line-items-aggregated-yearly' ||
    series.type === 'commitments-analytics' ||
    series.type === 'ins-series'
  );
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const serializedItems = value.map((item) => stableSerialize(item));
    const sortedItems = [...serializedItems].sort((left, right) => left.localeCompare(right));
    return `[${sortedItems.join(',')}]`;
  }

  const objectEntries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  return `{${objectEntries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`)
    .join(',')}}`;
}

function normalizeUnit(unit: string | undefined): string | undefined {
  if (typeof unit !== 'string') {
    return undefined;
  }

  const trimmed = unit.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveSeriesUnitOverride(series: MapBaseSeries): string | undefined {
  const normalizedUnit = normalizeUnit(series.unit);
  if (normalizedUnit === undefined) {
    return undefined;
  }

  if (series.type === 'ins-series' && normalizedUnit.toUpperCase() === 'RON') {
    // INS series should never inherit currency defaults when no dataset unit is available.
    return undefined;
  }

  return normalizedUnit;
}
