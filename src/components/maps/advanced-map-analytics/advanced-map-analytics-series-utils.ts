import { BarChart3, Database, FileText, Sigma, Shapes } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Calculation, Operand } from '@/schemas/charts';
import { CopiedSeriesSchema } from '@/schemas/charts';
import type {
  CopiedAdvancedMapSeries,
  AdvancedMapAnalyticsUrlState,
  MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import {
  CopiedAdvancedMapSeriesSchema,
  createDefaultAdvancedMapAnalyticsSeries,
  createUniqueAdvancedMapAnalyticsId,
  getGeoJsonDatasetUnit,
  MapSupportedSeriesSchema,
} from '@/schemas/advanced-map-analytics';
import { t } from '@lingui/core/macro';

export const SERIES_TYPE_LABELS: Record<MapSupportedSeries['type'], string> = {
  'line-items-aggregated-yearly': t`Execution analytics`,
  'commitments-analytics': t`Commitments analytics`,
  'ins-series': t`INS series`,
  'geojson-dataset-series': t`GeoJSON dataset`,
  'aggregated-series-calculation': t`Calculated series`,
};

export const SERIES_TYPE_ICONS: Record<MapSupportedSeries['type'], LucideIcon> = {
  'line-items-aggregated-yearly': BarChart3,
  'commitments-analytics': FileText,
  'ins-series': Database,
  'geojson-dataset-series': Shapes,
  'aggregated-series-calculation': Sigma,
};

const MAP_SUPPORTED_SERIES_TYPES = new Set<MapSupportedSeries['type']>([
  'line-items-aggregated-yearly',
  'commitments-analytics',
  'ins-series',
  'geojson-dataset-series',
  'aggregated-series-calculation',
]);

interface ClipboardSeriesParseResult {
  sourceType: 'advanced-map-series-copy' | 'chart-series-copy';
  sourceSeries: MapSupportedSeries[];
  skippedUnsupportedCount: number;
}

export interface NormalizedPastedMapSeriesResult {
  sourceType: 'advanced-map-series-copy' | 'chart-series-copy';
  seriesToInsert: MapSupportedSeries[];
  skippedUnsupportedCount: number;
}

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
  const ensuredSelection = ensureActiveSeriesSelection(nextSeries, state.activeSeriesId);

  return {
    ...state,
    series: ensuredSelection.series,
    activeSeriesId: ensuredSelection.activeSeriesId,
  };
}

export function ensureActiveSeriesSelection(
  seriesList: MapSupportedSeries[],
  activeSeriesId: string | undefined
): { series: MapSupportedSeries[]; activeSeriesId: string | undefined } {
  if (seriesList.length === 0) {
    return {
      series: seriesList,
      activeSeriesId: undefined,
    };
  }

  if (
    typeof activeSeriesId === 'string' &&
    seriesList.some((series) => series.id === activeSeriesId && series.enabled)
  ) {
    return {
      series: seriesList,
      activeSeriesId,
    };
  }

  const firstEnabledSeries = seriesList.find((series) => series.enabled);
  if (firstEnabledSeries) {
    return {
      series: seriesList,
      activeSeriesId: firstEnabledSeries.id,
    };
  }

  const [firstSeries, ...remainingSeries] = seriesList;
  if (!firstSeries) {
    return {
      series: seriesList,
      activeSeriesId: undefined,
    };
  }

  const nextSeriesList = [
    {
      ...firstSeries,
      enabled: true,
      updatedAt: new Date().toISOString(),
    },
    ...remainingSeries,
  ];

  return {
    series: nextSeriesList,
    activeSeriesId: nextSeriesList[0]?.id,
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

export function duplicateSeriesAfterSource(
  seriesList: MapSupportedSeries[],
  sourceSeriesId: string,
  preferredDuplicatedSeriesId?: string
): { series: MapSupportedSeries[]; duplicatedSeries?: MapSupportedSeries } {
  const sourceIndex = seriesList.findIndex((series) => series.id === sourceSeriesId);
  if (sourceIndex === -1) {
    return { series: seriesList };
  }

  const sourceSeries = seriesList[sourceIndex];
  if (!sourceSeries) {
    return { series: seriesList };
  }

  const duplicatedSeries = MapSupportedSeriesSchema.parse(sourceSeries);
  const usedIds = new Set(seriesList.map((series) => series.id));
  const nextTimestamp = new Date().toISOString();
  const sourceLabel = sourceSeries.label.trim().length > 0
    ? sourceSeries.label
    : SERIES_TYPE_LABELS[sourceSeries.type];

  duplicatedSeries.id =
    preferredDuplicatedSeriesId && !usedIds.has(preferredDuplicatedSeriesId)
      ? preferredDuplicatedSeriesId
      : createUniqueAdvancedMapAnalyticsId(usedIds);
  duplicatedSeries.label = `${sourceLabel} (copy)`;
  duplicatedSeries.createdAt = nextTimestamp;
  duplicatedSeries.updatedAt = nextTimestamp;

  const nextSeriesList = [...seriesList];
  nextSeriesList.splice(sourceIndex + 1, 0, duplicatedSeries);

  return {
    series: nextSeriesList,
    duplicatedSeries,
  };
}

export function createCopiedMapSeriesPayload(
  seriesList: MapSupportedSeries[],
  sourceSeriesId: string
): CopiedAdvancedMapSeries | null {
  const sourceSeries = seriesList.find((series) => series.id === sourceSeriesId);
  if (!sourceSeries) {
    return null;
  }

  const seriesById = new Map(seriesList.map((series) => [series.id, series]));
  const copiedSeries: MapSupportedSeries[] = [sourceSeries];
  const visitedSeriesIds = new Set<string>([sourceSeries.id]);

  const dependencyQueue = sourceSeries.type === 'aggregated-series-calculation'
    ? [...collectReferencedSeriesIds(sourceSeries.calculation)]
    : [];

  while (dependencyQueue.length > 0) {
    const dependencySeriesId = dependencyQueue.shift();
    if (!dependencySeriesId || visitedSeriesIds.has(dependencySeriesId)) {
      continue;
    }

    const dependencySeries = seriesById.get(dependencySeriesId);
    if (!dependencySeries) {
      continue;
    }

    copiedSeries.push(dependencySeries);
    visitedSeriesIds.add(dependencySeriesId);

    if (dependencySeries.type === 'aggregated-series-calculation') {
      dependencyQueue.push(...collectReferencedSeriesIds(dependencySeries.calculation));
    }
  }

  return CopiedAdvancedMapSeriesSchema.parse({
    type: 'advanced-map-series-copy',
    payload: copiedSeries,
  });
}

export function normalizePastedMapSeries(
  rawClipboardText: string,
  existingSeries: MapSupportedSeries[]
): NormalizedPastedMapSeriesResult | null {
  const parsedClipboard = parseClipboardSeries(rawClipboardText);
  if (!parsedClipboard) {
    return null;
  }

  const seriesToInsert = remapSeriesForPaste(parsedClipboard.sourceSeries, existingSeries);

  return {
    sourceType: parsedClipboard.sourceType,
    seriesToInsert,
    skippedUnsupportedCount: parsedClipboard.skippedUnsupportedCount,
  };
}

function parseClipboardSeries(rawClipboardText: string): ClipboardSeriesParseResult | null {
  if (rawClipboardText.trim().length === 0) {
    return null;
  }

  let parsedClipboardValue: unknown;
  try {
    parsedClipboardValue = JSON.parse(rawClipboardText);
  } catch {
    return null;
  }

  const parsedMapPayload = CopiedAdvancedMapSeriesSchema.safeParse(parsedClipboardValue);
  if (parsedMapPayload.success) {
    return {
      sourceType: 'advanced-map-series-copy',
      sourceSeries: dedupeSeriesById(parsedMapPayload.data.payload),
      skippedUnsupportedCount: 0,
    };
  }

  const parsedChartPayload = CopiedSeriesSchema.safeParse(parsedClipboardValue);
  if (!parsedChartPayload.success) {
    return null;
  }

  let skippedUnsupportedCount = 0;
  const compatibleSeries: MapSupportedSeries[] = [];
  for (const chartSeries of parsedChartPayload.data.payload) {
    if (!isMapSupportedSeriesType(chartSeries.type)) {
      skippedUnsupportedCount += 1;
      continue;
    }

    const parsedSeries = MapSupportedSeriesSchema.safeParse(chartSeries);
    if (!parsedSeries.success) {
      skippedUnsupportedCount += 1;
      continue;
    }

    compatibleSeries.push(parsedSeries.data);
  }

  const normalizedCompatibilityResult = normalizeCompatibleSeriesDependencies(
    dedupeSeriesById(compatibleSeries)
  );

  return {
    sourceType: 'chart-series-copy',
    sourceSeries: normalizedCompatibilityResult.series,
    skippedUnsupportedCount: skippedUnsupportedCount + normalizedCompatibilityResult.skippedCount,
  };
}

function remapSeriesForPaste(
  sourceSeriesList: MapSupportedSeries[],
  existingSeries: MapSupportedSeries[]
): MapSupportedSeries[] {
  if (sourceSeriesList.length === 0) {
    return [];
  }

  const usedSeriesIds = new Set(existingSeries.map((series) => series.id));
  const remappedSeriesIds = new Map<string, string>();
  for (const sourceSeries of sourceSeriesList) {
    const nextId = createUniqueAdvancedMapAnalyticsId(usedSeriesIds);
    usedSeriesIds.add(nextId);
    remappedSeriesIds.set(sourceSeries.id, nextId);
  }

  const timestamp = new Date().toISOString();
  return sourceSeriesList.map((sourceSeries) => {
    const clonedSeries = MapSupportedSeriesSchema.parse(sourceSeries);
    const remappedSeriesId = remappedSeriesIds.get(sourceSeries.id);
    clonedSeries.id = remappedSeriesId ?? sourceSeries.id;
    clonedSeries.createdAt = timestamp;
    clonedSeries.updatedAt = timestamp;

    if (clonedSeries.type === 'aggregated-series-calculation') {
      clonedSeries.calculation = remapCalculationOperandIds(
        clonedSeries.calculation,
        remappedSeriesIds
      ) as Calculation;
    }

    return clonedSeries;
  });
}

function remapCalculationOperandIds(operand: Operand, remappedSeriesIds: Map<string, string>): Operand {
  if (typeof operand === 'number') {
    return operand;
  }

  if (typeof operand === 'string') {
    return remappedSeriesIds.get(operand) ?? operand;
  }

  return {
    ...operand,
    args: operand.args.map((childOperand) => remapCalculationOperandIds(childOperand, remappedSeriesIds)),
  };
}

function dedupeSeriesById(seriesList: MapSupportedSeries[]): MapSupportedSeries[] {
  const firstSeriesById = new Map<string, MapSupportedSeries>();
  for (const series of seriesList) {
    if (!firstSeriesById.has(series.id)) {
      firstSeriesById.set(series.id, series);
    }
  }

  return Array.from(firstSeriesById.values());
}

function normalizeCompatibleSeriesDependencies(
  seriesList: MapSupportedSeries[]
): { series: MapSupportedSeries[]; skippedCount: number } {
  let skippedCount = 0;
  let normalizedSeries = [...seriesList];

  while (true) {
    const keptSeriesIds = new Set(normalizedSeries.map((series) => series.id));
    const nextNormalizedSeries = normalizedSeries.filter((series) => {
      if (series.type !== 'aggregated-series-calculation') {
        return true;
      }

      return collectReferencedSeriesIds(series.calculation).every((dependencySeriesId) =>
        keptSeriesIds.has(dependencySeriesId)
      );
    });

    const removedCount = normalizedSeries.length - nextNormalizedSeries.length;
    if (removedCount === 0) {
      return {
        series: normalizedSeries,
        skippedCount,
      };
    }

    skippedCount += removedCount;
    normalizedSeries = nextNormalizedSeries;
  }
}

function collectReferencedSeriesIds(calculation: Calculation): string[] {
  const referencedSeriesIds = new Set<string>();

  const visitOperand = (operand: Operand) => {
    if (typeof operand === 'string') {
      referencedSeriesIds.add(operand);
      return;
    }

    if (typeof operand === 'number') {
      return;
    }

    for (const childOperand of operand.args) {
      visitOperand(childOperand);
    }
  };

  visitOperand(calculation);
  return Array.from(referencedSeriesIds);
}

function isMapSupportedSeriesType(value: unknown): value is MapSupportedSeries['type'] {
  return typeof value === 'string' && MAP_SUPPORTED_SERIES_TYPES.has(value as MapSupportedSeries['type']);
}
