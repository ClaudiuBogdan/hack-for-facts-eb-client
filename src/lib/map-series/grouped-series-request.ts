import type { MapBaseSeries, MapSupportedSeries } from '@/schemas/advanced-map-analytics';
import { generateHash } from '@/lib/utils';

export type RemoteFetchSeries = Exclude<MapBaseSeries, { type: 'geojson-dataset-series' }>;

interface RemoteGroupedSeriesBuildResult {
  baseSeries: MapBaseSeries[];
  remoteBaseSeries: RemoteFetchSeries[];
  remoteBaseSeriesHash: string;
}

export function buildRemoteGroupedSeriesState(series: MapSupportedSeries[]): RemoteGroupedSeriesBuildResult {
  const baseSeries = series
    .filter((entry): entry is MapBaseSeries =>
      entry.type !== 'aggregated-series-calculation' &&
      entry.type !== 'map-grouped-value-series'
    )
    .sort((left, right) => left.id.localeCompare(right.id));

  const remoteBaseSeries = baseSeries
    .filter((entry): entry is RemoteFetchSeries => isRemoteFetchSeries(entry))
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    baseSeries,
    remoteBaseSeries,
    remoteBaseSeriesHash: generateHash(
      stableSerialize(
        remoteBaseSeries.map((entry) => ({
          id: entry.id,
          type: entry.type,
          payload: normalizeSeriesForFetch(entry),
        }))
      )
    ),
  };
}

export function serializeRemoteFetchSeriesForRequest(series: RemoteFetchSeries): unknown {
  const normalizedPayload = normalizeSeriesForFetch(series) as Record<string, unknown>;

  return {
    id: series.id,
    ...normalizedPayload,
  };
}

export function getRemoteGroupedSeriesHash(series: MapSupportedSeries[]): string {
  return buildRemoteGroupedSeriesState(series).remoteBaseSeriesHash;
}

export function resolveSeriesUnitOverride(series: MapBaseSeries): string | undefined {
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

function normalizeSeriesForFetch(series: RemoteFetchSeries): unknown {
  const unit = resolveSeriesUnitOverride(series);

  if (series.type === 'uploaded-map-dataset') {
    return {
      type: series.type,
      unit,
      ...(typeof series.datasetId === 'string' && series.datasetId.trim().length > 0
        ? { datasetId: series.datasetId.trim() }
        : {}),
      ...(typeof series.datasetPublicId === 'string' && series.datasetPublicId.trim().length > 0
        ? { datasetPublicId: series.datasetPublicId.trim() }
        : {}),
    };
  }

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
    intervalOperation: series.intervalOperation,
    periodicity: series.periodicity,
    territoryCodes: series.territoryCodes,
    sirutaCodes: series.sirutaCodes,
    unitCodes: series.unitCodes,
    classificationSelections: series.classificationSelections,
    hasValue: series.hasValue,
  };
}

function isRemoteFetchSeries(series: MapBaseSeries): series is RemoteFetchSeries {
  return (
    series.type === 'line-items-aggregated-yearly' ||
    series.type === 'commitments-analytics' ||
    series.type === 'ins-series' ||
    series.type === 'uploaded-map-dataset'
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
