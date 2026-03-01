import { BarChart3, Database, FileText, Sigma, Shapes } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  AdvancedMapAnalyticsUrlState,
  MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import { createDefaultAdvancedMapAnalyticsSeries, getGeoJsonDatasetUnit } from '@/schemas/advanced-map-analytics';

export const SERIES_TYPE_LABELS: Record<MapSupportedSeries['type'], string> = {
  'line-items-aggregated-yearly': 'Execution analytics',
  'commitments-analytics': 'Commitments analytics',
  'ins-series': 'INS series',
  'geojson-dataset-series': 'GeoJSON dataset',
  'aggregated-series-calculation': 'Calculated series',
};

export const SERIES_TYPE_ICONS: Record<MapSupportedSeries['type'], LucideIcon> = {
  'line-items-aggregated-yearly': BarChart3,
  'commitments-analytics': FileText,
  'ins-series': Database,
  'geojson-dataset-series': Shapes,
  'aggregated-series-calculation': Sigma,
};

export function reorderSeriesByIds(
  seriesList: MapSupportedSeries[],
  activeSeriesId: string,
  overSeriesId: string
): MapSupportedSeries[] {
  if (activeSeriesId === overSeriesId) {
    return seriesList;
  }

  const currentIndex = seriesList.findIndex((series) => series.id === activeSeriesId);
  const nextIndex = seriesList.findIndex((series) => series.id === overSeriesId);

  if (currentIndex === -1 || nextIndex === -1) {
    return seriesList;
  }

  const reordered = [...seriesList];
  const [movedSeries] = reordered.splice(currentIndex, 1);
  if (!movedSeries) {
    return seriesList;
  }
  reordered.splice(nextIndex, 0, movedSeries);

  return reordered;
}

export function applySetActiveSeries(
  state: AdvancedMapAnalyticsUrlState,
  seriesId: string
): AdvancedMapAnalyticsUrlState {
  const nextSeries = state.series.map((series) =>
    series.id === seriesId ? { ...series, enabled: true } : series
  );

  return {
    ...state,
    series: nextSeries,
    activeSeriesId: seriesId,
  };
}

export function applyToggleSeriesEnabled(
  state: AdvancedMapAnalyticsUrlState,
  seriesId: string,
  enabled: boolean
): AdvancedMapAnalyticsUrlState {
  const nextSeries = state.series.map((series) =>
    series.id === seriesId ? { ...series, enabled } : series
  );

  const nextActiveSeriesId =
    !enabled && state.activeSeriesId === seriesId ? undefined : state.activeSeriesId;

  return {
    ...state,
    series: nextSeries,
    activeSeriesId: nextActiveSeriesId,
  };
}

export function convertSeriesToType(
  currentSeries: MapSupportedSeries,
  nextType: MapSupportedSeries['type']
): MapSupportedSeries {
  if (currentSeries.type === nextType) {
    return currentSeries;
  }

  const replacementSeries = createDefaultAdvancedMapAnalyticsSeries(nextType);
  replacementSeries.id = currentSeries.id;
  replacementSeries.enabled = currentSeries.enabled;
  replacementSeries.label = currentSeries.label;
  replacementSeries.createdAt = currentSeries.createdAt;
  replacementSeries.updatedAt = new Date().toISOString();

  const normalizedUnit = (currentSeries.unit ?? '').trim();
  const shouldPreserveGeoJsonUnit =
    currentSeries.type !== 'geojson-dataset-series' ||
    normalizedUnit !== getGeoJsonDatasetUnit(currentSeries.datasetKey);

  if (normalizedUnit.length > 0 && shouldPreserveGeoJsonUnit) {
    replacementSeries.unit = currentSeries.unit;
  }

  return replacementSeries;
}
