import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Currency } from '@/schemas/charts';
import type { MapBaseSeries, MapSupportedSeries } from '@/schemas/experimental-map';
import { fetchGroupedSeriesData } from '@/lib/api/map-series';
import { calculateMapSeriesValues } from '@/lib/map-series/calculation';
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

  const baseSeriesHash = useMemo(
    () =>
      generateHash(
        stableSerialize(
          normalizedBaseSeries.map((series) => ({
            id: series.id,
            type: series.type,
            payload: normalizeSeriesForFetch(series),
          }))
        )
      ),
    [normalizedBaseSeries]
  );

  const groupedDataQuery = useQuery<GroupedSeriesDataResponse, Error>({
    queryKey: ['experimental-map-series-data', baseSeriesHash],
    queryFn: async () => {
      if (normalizedBaseSeries.length === 0) {
        return {
          manifest: {
            generated_at: new Date().toISOString(),
            format: 'long_rows_v1',
            granularity: 'UAT',
            series: [],
          },
          rows: [],
          warnings: [],
        };
      }

      return fetchGroupedSeriesData({
        granularity: 'UAT',
        series: normalizedBaseSeries,
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
    const response = groupedDataQuery.data;
    const baseVectors: MapSeriesVectorCache = new Map();
    const baseUnits = new Map<string, string | undefined>();
    const warnings: MapSeriesWarning[] = [];

    if (response) {
      for (const manifestSeries of response.manifest.series) {
        if (!baseVectors.has(manifestSeries.series_id)) {
          baseVectors.set(manifestSeries.series_id, new Map());
        }
        baseUnits.set(manifestSeries.series_id, manifestSeries.unit);
      }

      for (const row of response.rows) {
        if (!baseVectors.has(row.series_id)) {
          baseVectors.set(row.series_id, new Map());
        }
        baseVectors.get(row.series_id)?.set(row.siruta_code, row.value);
      }

      if (response.warnings?.length) {
        warnings.push(...response.warnings);
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
  }, [groupedDataQuery.data, normalizedEnabledSeries, params.urlSearchLength]);

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

function normalizeSeriesForFetch(series: MapBaseSeries): unknown {
  if (series.type === 'line-items-aggregated-yearly') {
    return {
      type: series.type,
      unit: series.unit,
      filter: series.filter,
    };
  }

  if (series.type === 'commitments-analytics') {
    return {
      type: series.type,
      metric: series.metric,
      unit: series.unit,
      filter: series.filter,
    };
  }

  return {
    type: series.type,
    unit: series.unit,
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
